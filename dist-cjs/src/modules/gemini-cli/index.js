import { EventEmitter } from 'events';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
let _getGeminiModule;
try {
    const core = await import('./src/core/index.js');
    _getGeminiModule = core.getGeminiModule;
} catch  {
    _getGeminiModule = null;
}
const DEFAULT_CONFIG = {
    enabled: false,
    authMethod: 'google-login',
    defaultModel: 'gemini-2.5-pro',
    contextLimit: 1000000,
    requestsPerMinute: 60,
    requestsPerDay: 1000,
    analysis: {
        defaultType: 'codebase',
        outputFormat: 'markdown',
        storeInMemory: true,
        excludePatterns: [
            'node_modules/**',
            'dist/**',
            '.git/**',
            '*.min.js',
            '*.map',
            'coverage/**',
            '.next/**',
            'build/**'
        ],
        maxFileSize: 10485760,
        timeout: 300000
    },
    cache: {
        enabled: true,
        ttl: 3600000,
        maxSize: 100,
        directory: '.claude-flow/cache/gemini'
    },
    rateLimit: {
        enabled: true,
        requestsPerMinute: 60,
        requestsPerDay: 1000,
        burstLimit: 10
    }
};
let SimpleCache = class SimpleCache {
    constructor(config){
        this.config = config;
        this.cache = new Map();
    }
    async initialize() {}
    generateKey(params) {
        return JSON.stringify(params);
    }
    async get(key) {
        const entry = this.cache.get(key);
        if (!entry) return null;
        if (Date.now() - entry.createdAt > this.config.ttl) {
            this.cache.delete(key);
            return null;
        }
        return entry.value;
    }
    async set(key, value) {
        this.cache.set(key, {
            value,
            createdAt: Date.now()
        });
    }
    async clear() {
        this.cache.clear();
    }
    getStats() {
        return {
            entries: this.cache.size,
            size: 0,
            hitRate: 0
        };
    }
};
let SimpleRateLimiter = class SimpleRateLimiter {
    constructor(config){
        this.config = config;
        this.minuteTokens = config.requestsPerMinute;
        this.dayTokens = config.requestsPerDay;
        this.lastMinuteRefill = Date.now();
        this.lastDayRefill = Date.now();
    }
    canMakeRequest() {
        if (!this.config.enabled) return true;
        this.refill();
        return this.minuteTokens >= 1 && this.dayTokens >= 1;
    }
    consumeToken() {
        if (!this.config.enabled) return;
        this.refill();
        this.minuteTokens--;
        this.dayTokens--;
    }
    async waitForQuota() {
        while(!this.canMakeRequest()){
            await new Promise((resolve)=>setTimeout(resolve, 1000));
        }
    }
    getQuotaStatus() {
        return {
            requestsPerMinute: {
                used: Math.floor(this.config.requestsPerMinute - this.minuteTokens),
                limit: this.config.requestsPerMinute,
                resetAt: new Date(this.lastMinuteRefill + 60000)
            },
            requestsPerDay: {
                used: Math.floor(this.config.requestsPerDay - this.dayTokens),
                limit: this.config.requestsPerDay,
                resetAt: new Date(this.lastDayRefill + 86400000)
            }
        };
    }
    refill() {
        const now = Date.now();
        const minuteElapsed = now - this.lastMinuteRefill;
        if (minuteElapsed >= 60000) {
            this.minuteTokens = this.config.requestsPerMinute;
            this.lastMinuteRefill = now;
        }
        const dayElapsed = now - this.lastDayRefill;
        if (dayElapsed >= 86400000) {
            this.dayTokens = this.config.requestsPerDay;
            this.lastDayRefill = now;
        }
    }
};
let GeminiModuleManager = class GeminiModuleManager extends EventEmitter {
    static instance = null;
    constructor(){
        super();
        this.config = {
            ...DEFAULT_CONFIG
        };
        this.cache = new SimpleCache(this.config.cache);
        this.rateLimiter = new SimpleRateLimiter(this.config.rateLimit);
        this.initialized = false;
        this.executor = null;
    }
    static getInstance() {
        if (!GeminiModuleManager.instance) {
            GeminiModuleManager.instance = new GeminiModuleManager();
        }
        return GeminiModuleManager.instance;
    }
    async initialize() {
        if (this.initialized) return;
        await this.loadConfig();
        await this.cache.initialize();
        this.initialized = true;
    }
    async enable(options = {}) {
        console.log('🚀 Enabling Gemini CLI module...');
        await this.initialize();
        const { exec, spawn } = await import('child_process');
        const { promisify } = await import('util');
        const execAsync = promisify(exec);
        try {
            await execAsync('which gemini');
        } catch  {
            if (!options.skipInstall) {
                console.log('📦 Installing Gemini CLI...');
                try {
                    await execAsync('npm install -g @google/gemini-cli', {
                        timeout: 120000
                    });
                    console.log('✅ Gemini CLI installed');
                } catch (err) {
                    throw new Error(`Failed to install Gemini CLI: ${err.message}`);
                }
            }
        }
        const authMethod = options.authMethod || 'google-login';
        if (authMethod === 'google-login') {
            const oauthCredsPath = path.join(os.homedir(), '.gemini', 'oauth_creds.json');
            let alreadyAuthenticated = false;
            try {
                await fs.access(oauthCredsPath);
                alreadyAuthenticated = true;
            } catch  {}
            if (alreadyAuthenticated && !options.force) {
                console.log('✅ Already authenticated with Google OAuth');
            } else {
                console.log('🔐 Starting Google OAuth login...');
                console.log('   Opening browser for authentication...');
                await new Promise((resolve, reject)=>{
                    const child = spawn('gemini', [
                        'auth',
                        'login'
                    ], {
                        stdio: 'inherit'
                    });
                    child.on('close', (code)=>{
                        if (code === 0) {
                            console.log('✅ Google authentication successful');
                            resolve();
                        } else {
                            reject(new Error(`Authentication failed with code ${code}`));
                        }
                    });
                    child.on('error', (err)=>{
                        reject(new Error(`Failed to start auth: ${err.message}`));
                    });
                });
            }
        } else if (authMethod === 'api-key') {
            if (!options.apiKey) {
                throw new Error('API key required for api-key authentication');
            }
            console.log('🔑 Setting up API key authentication...');
        } else if (authMethod === 'vertex-ai') {
            if (!options.vertexProject) {
                throw new Error('Vertex project required for vertex-ai authentication');
            }
            console.log('☁️  Setting up Vertex AI authentication...');
        }
        this.config.enabled = true;
        this.config.authMethod = authMethod;
        if (options.apiKey) this.config.apiKey = options.apiKey;
        if (options.vertexProject) this.config.vertexProject = options.vertexProject;
        if (options.vertexLocation) this.config.vertexLocation = options.vertexLocation;
        await this.saveConfig();
        console.log('✅ Gemini CLI module enabled');
    }
    async disable() {
        console.log('⏸️  Disabling Gemini CLI module...');
        this.config.enabled = false;
        this.executor = null;
        await this.saveConfig();
        console.log('✅ Gemini CLI module disabled');
    }
    async eject(options = {}) {
        console.log('🗑️  Ejecting Gemini CLI module...');
        await this.disable();
        await this.cache.clear();
        if (!options.keepConfig) {
            this.config = {
                ...DEFAULT_CONFIG
            };
            await this.deleteConfig();
        }
        console.log('✅ Gemini CLI module ejected');
    }
    async getStatus() {
        const { exec } = await import('child_process');
        const { promisify } = await import('util');
        const execAsync = promisify(exec);
        let installed = false;
        let version = undefined;
        let binaryPath = undefined;
        let authenticated = false;
        try {
            const { stdout } = await execAsync('which gemini');
            binaryPath = stdout.trim();
            installed = true;
            try {
                const { stdout: versionOut } = await execAsync('gemini --version');
                version = versionOut.trim().match(/(\d+\.\d+\.\d+)/)?.[1];
            } catch  {}
        } catch  {}
        const authMethod = this.config.authMethod || 'google-login';
        try {
            if (authMethod === 'google-login') {
                const oauthCredsPath = path.join(os.homedir(), '.gemini', 'oauth_creds.json');
                await fs.access(oauthCredsPath);
                authenticated = true;
            } else if (authMethod === 'api-key') {
                authenticated = !!this.config.apiKey;
            } else if (authMethod === 'vertex-ai') {
                authenticated = !!this.config.vertexProject;
            }
        } catch  {
            authenticated = false;
        }
        return {
            installed,
            enabled: this.config.enabled,
            authenticated,
            version,
            authMethod,
            binaryPath,
            quotaStatus: this.rateLimiter.getQuotaStatus(),
            lastCheck: new Date()
        };
    }
    isEnabled() {
        return this.config.enabled;
    }
    getExecutor() {
        return this.executor;
    }
    async analyze(request) {
        if (!this.config.enabled) {
            throw new Error('Module not enabled. Run `claude-flow gemini enable` first.');
        }
        const startTime = Date.now();
        const requestId = `gemini-${startTime}`;
        if (!this.rateLimiter.canMakeRequest()) {
            await this.rateLimiter.waitForQuota();
        }
        const analysisType = request.type || 'codebase';
        const targetPaths = request.target || [
            '.'
        ];
        const query = request.query;
        const depth = request.depth || 'moderate';
        let prompt = this.buildAnalysisPrompt(analysisType, targetPaths, query, depth);
        const cacheKey = this.cache.generateKey({
            prompt,
            type: analysisType,
            paths: targetPaths
        });
        const cachedResult = await this.cache.get(cacheKey);
        if (cachedResult) {
            return {
                ...cachedResult,
                cached: true,
                requestId
            };
        }
        try {
            const { exec } = await import('child_process');
            const { promisify } = await import('util');
            const execAsync = promisify(exec);
            const model = this.config.defaultModel || 'gemini-2.5-pro';
            const escapedPrompt = prompt.replace(/"/g, '\\"').replace(/`/g, '\\`');
            const { stdout, stderr } = await execAsync(`gemini -m ${model} --output-format json "${escapedPrompt}"`, {
                timeout: this.config.analysis?.timeout || 300000,
                maxBuffer: 50 * 1024 * 1024,
                cwd: targetPaths[0] !== '.' ? targetPaths[0] : process.cwd()
            });
            this.rateLimiter.consumeToken();
            const duration = Date.now() - startTime;
            let geminiResponse;
            try {
                geminiResponse = JSON.parse(stdout);
            } catch  {
                geminiResponse = {
                    response: stdout
                };
            }
            const result = {
                success: true,
                requestId,
                timestamp: new Date(),
                duration,
                tokenUsage: geminiResponse.usage || {
                    prompt: 0,
                    completion: 0,
                    total: 0
                },
                summary: this.extractSummary(geminiResponse),
                findings: this.extractFindings(geminiResponse, analysisType),
                metrics: {
                    filesAnalyzed: targetPaths.length,
                    analysisType,
                    model
                },
                recommendations: this.extractRecommendations(geminiResponse),
                rawOutput: geminiResponse.response || stdout,
                errors: stderr ? [
                    stderr
                ] : []
            };
            await this.cache.set(cacheKey, result);
            return result;
        } catch (err) {
            const duration = Date.now() - startTime;
            return {
                success: false,
                requestId,
                timestamp: new Date(),
                duration,
                tokenUsage: {
                    prompt: 0,
                    completion: 0,
                    total: 0
                },
                summary: `Analysis failed: ${err.message}`,
                findings: [],
                metrics: {
                    filesAnalyzed: 0,
                    analysisType
                },
                recommendations: [],
                errors: [
                    err.message
                ]
            };
        }
    }
    buildAnalysisPrompt(type, paths, query, depth) {
        const depthInstructions = {
            quick: 'Provide a brief high-level overview.',
            moderate: 'Provide a balanced analysis with key details.',
            deep: 'Provide an exhaustive, detailed analysis.'
        };
        const typePrompts = {
            codebase: `Analyze this codebase comprehensively. Focus on:
- Overall architecture and design patterns
- Code organization and structure
- Key components and their responsibilities
- Potential issues or areas for improvement
- Technology stack and dependencies`,
            security: `Perform a security analysis of this codebase. Focus on:
- Common vulnerabilities (OWASP Top 10)
- Authentication and authorization patterns
- Input validation and sanitization
- Sensitive data handling
- Security best practices violations
Rate each finding by severity: critical, high, medium, low`,
            architecture: `Map the architecture of this codebase. Include:
- System components and their relationships
- Data flow between components
- External integrations and APIs
- Design patterns used
- Potential architectural improvements`,
            dependencies: `Analyze the dependencies in this project. Include:
- Direct vs transitive dependencies
- Outdated packages
- Security vulnerabilities in dependencies
- Unused dependencies
- Dependency conflicts or issues`,
            performance: `Analyze this codebase for performance. Focus on:
- Potential bottlenecks
- Memory usage patterns
- Async/await usage and potential issues
- Database query patterns
- Caching opportunities`
        };
        let prompt = typePrompts[type] || typePrompts.codebase;
        if (query) {
            prompt += `\n\nSpecific focus: ${query}`;
        }
        prompt += `\n\n${depthInstructions[depth] || depthInstructions.moderate}`;
        prompt += `\n\nTarget paths: ${paths.join(', ')}`;
        prompt += `\n\nProvide your response in a structured format with clear sections.`;
        return prompt;
    }
    extractSummary(response) {
        const maxLength = 2000;
        if (typeof response === 'string') return response.slice(0, maxLength);
        if (response.response) return response.response.slice(0, maxLength);
        if (response.summary) return response.summary;
        return 'Analysis completed. See rawOutput for details.';
    }
    extractFindings(response, type) {
        const text = response.response || response.text || JSON.stringify(response);
        const findings = [];
        const lines = text.split('\n');
        let currentSection = null;
        for (const line of lines){
            const trimmed = line.trim();
            if (trimmed.match(/^#+\s+/) || trimmed.endsWith(':') && trimmed.length < 100) {
                currentSection = trimmed.replace(/^#+\s*/, '').replace(/:$/, '');
                continue;
            }
            if (trimmed.match(/^[-*•]\s+/) || trimmed.match(/^\d+\.\s+/)) {
                const content = trimmed.replace(/^[-*•\d.]+\s+/, '');
                if (content.length > 10) {
                    const fileMatch = content.match(/`([^`]+\.(js|ts|jsx|tsx|py|go|rs|java|cpp|c|h|json|yaml|yml))`/);
                    const pathMatch = content.match(/(?:in|at|from|file)\s+[`"]?([a-zA-Z0-9_/.-]+\.(js|ts|jsx|tsx|py|go|rs|java|cpp|c|h|json|yaml|yml))[`"]?/i);
                    findings.push({
                        type,
                        message: content,
                        severity: this.inferSeverity(content),
                        location: fileMatch?.[1] || pathMatch?.[1] || currentSection || null,
                        category: currentSection || type
                    });
                }
            }
        }
        return findings.slice(0, 50);
    }
    inferSeverity(text) {
        const lower = text.toLowerCase();
        if (lower.includes('critical') || lower.includes('severe') || lower.includes('urgent')) {
            return 'critical';
        }
        if (lower.includes('high') || lower.includes('important') || lower.includes('significant')) {
            return 'high';
        }
        if (lower.includes('medium') || lower.includes('moderate')) {
            return 'medium';
        }
        return 'low';
    }
    extractRecommendations(response) {
        const text = response.response || response.text || JSON.stringify(response);
        const recommendations = [];
        const patterns = [
            /recommend[s]?:?\s*([^.]+\.)/gi,
            /suggest[s]?:?\s*([^.]+\.)/gi,
            /consider:?\s*([^.]+\.)/gi,
            /should:?\s*([^.]+\.)/gi
        ];
        for (const pattern of patterns){
            let match;
            while((match = pattern.exec(text)) !== null){
                if (match[1] && match[1].length > 10) {
                    recommendations.push(match[1].trim());
                }
            }
        }
        return [
            ...new Set(recommendations)
        ].slice(0, 20);
    }
    getConfig() {
        return {
            ...this.config
        };
    }
    async updateConfig(updates) {
        this.config = {
            ...this.config,
            ...updates
        };
        await this.saveConfig();
    }
    getCache() {
        return this.cache;
    }
    getCacheStats() {
        return this.cache.getStats();
    }
    async clearCache() {
        await this.cache.clear();
    }
    getConfigPath() {
        return path.join(os.homedir(), '.claude-flow', 'modules', 'gemini-cli.json');
    }
    async loadConfig() {
        const configPath = this.getConfigPath();
        try {
            const content = await fs.readFile(configPath, 'utf-8');
            const loaded = JSON.parse(content);
            this.config = {
                ...DEFAULT_CONFIG,
                ...loaded
            };
        } catch  {
            this.config = {
                ...DEFAULT_CONFIG
            };
        }
    }
    async saveConfig() {
        const configPath = this.getConfigPath();
        const configDir = path.dirname(configPath);
        await fs.mkdir(configDir, {
            recursive: true
        });
        await fs.writeFile(configPath, JSON.stringify(this.config, null, 2), 'utf-8');
    }
    async deleteConfig() {
        const configPath = this.getConfigPath();
        try {
            await fs.unlink(configPath);
        } catch  {}
    }
};
export function getGeminiModule() {
    if (_getGeminiModule) {
        return _getGeminiModule();
    }
    return GeminiModuleManager.getInstance();
}
export { GeminiModuleManager, DEFAULT_CONFIG };

//# sourceMappingURL=index.js.map