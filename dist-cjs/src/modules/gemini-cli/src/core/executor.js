import { spawn } from 'child_process';
import { EventEmitter } from 'events';
import { GeminiExecutionError } from './errors.js';
export class GeminiExecutor extends EventEmitter {
    installer;
    cache;
    rateLimiter;
    config;
    constructor(installer, cache, rateLimiter, config){
        super();
        this.installer = installer;
        this.cache = cache;
        this.rateLimiter = rateLimiter;
        this.config = config;
    }
    async analyze(request) {
        const startTime = Date.now();
        const requestId = this.generateRequestId();
        const cacheKey = this.cache.generateKey(request);
        const cached = await this.cache.get(cacheKey);
        if (cached) {
            this.emit('cache-hit', {
                requestId,
                cacheKey
            });
            return cached;
        }
        await this.rateLimiter.waitForQuota();
        const binaryPath = await this.installer.findBinary();
        if (!binaryPath) {
            throw new GeminiExecutionError('Gemini CLI not installed', 'analyze');
        }
        const args = this.buildAnalysisArgs(request);
        this.emit('analysis-start', {
            requestId,
            request
        });
        try {
            const output = await this.executeCommand(binaryPath, args);
            this.rateLimiter.consumeToken();
            const result = this.parseAnalysisOutput(output, request, requestId, startTime);
            await this.cache.set(cacheKey, result);
            this.emit('analysis-complete', {
                requestId,
                result
            });
            return result;
        } catch (error) {
            const errorResult = {
                success: false,
                requestId,
                timestamp: new Date(),
                duration: Date.now() - startTime,
                tokenUsage: {
                    prompt: 0,
                    completion: 0,
                    total: 0
                },
                summary: 'Analysis failed',
                findings: [],
                metrics: {
                    filesAnalyzed: 0,
                    linesOfCode: 0
                },
                recommendations: [],
                errors: [
                    error instanceof Error ? error.message : 'Unknown error'
                ]
            };
            this.emit('analysis-error', {
                requestId,
                error
            });
            return errorResult;
        }
    }
    async securityScan(target, options) {
        return this.analyze({
            type: 'security',
            target,
            depth: 'deep',
            focus: [
                'vulnerabilities',
                'secrets',
                'misconfig'
            ],
            ...options
        });
    }
    async architectureMap(target, options) {
        return this.analyze({
            type: 'architecture',
            target,
            depth: 'comprehensive',
            focus: [
                'components',
                'dependencies',
                'layers'
            ],
            ...options
        });
    }
    async dependencyAnalysis(target, options) {
        return this.analyze({
            type: 'dependencies',
            target,
            depth: 'deep',
            focus: [
                'outdated',
                'vulnerabilities',
                'licenses'
            ],
            ...options
        });
    }
    async coverageAssess(target, options) {
        return this.analyze({
            type: 'coverage',
            target,
            depth: 'moderate',
            focus: [
                'untested',
                'quality',
                'edge-cases'
            ],
            ...options
        });
    }
    async verify(feature, target) {
        const result = await this.analyze({
            type: 'codebase',
            target,
            query: `Verify if this feature is implemented: "${feature}". Return JSON with fields: implemented (boolean), confidence (0-100), details (string)`,
            outputFormat: 'json'
        });
        try {
            const verification = JSON.parse(result.rawOutput || '{}');
            return {
                implemented: verification.implemented ?? false,
                confidence: verification.confidence ?? 0,
                details: verification.details ?? result.summary
            };
        } catch  {
            return {
                implemented: false,
                confidence: 0,
                details: result.summary
            };
        }
    }
    generateRequestId() {
        return `gemini-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    }
    buildAnalysisArgs(request) {
        const args = [];
        const targets = Array.isArray(request.target) ? request.target : [
            request.target
        ];
        args.push(...targets.map((t)=>`@${t}`));
        const typePrompts = {
            codebase: 'Analyze this codebase comprehensively. Identify patterns, structure, and key components.',
            architecture: 'Map the architecture of this codebase. Identify components, layers, dependencies, and data flows.',
            security: 'Perform a security audit. Find vulnerabilities, insecure patterns, hardcoded secrets, and misconfigurations.',
            dependencies: 'Analyze dependencies. Find outdated packages, vulnerabilities, license issues, and unused dependencies.',
            coverage: 'Assess test coverage. Identify untested code paths, missing edge cases, and testing recommendations.'
        };
        let prompt = typePrompts[request.type];
        if (request.query) {
            prompt += `\n\nAdditional focus: ${request.query}`;
        }
        if (request.focus && request.focus.length > 0) {
            prompt += `\n\nFocus on: ${request.focus.join(', ')}`;
        }
        if (request.depth) {
            const depthInstructions = {
                surface: 'Provide a quick overview without deep analysis.',
                moderate: 'Provide moderate detail with key findings.',
                deep: 'Provide detailed analysis with comprehensive findings.',
                comprehensive: 'Provide exhaustive analysis covering all aspects.'
            };
            prompt += `\n\n${depthInstructions[request.depth]}`;
        }
        prompt += '\n\nReturn structured output with: summary, findings (type, severity, location, message, suggestion), metrics, and recommendations.';
        args.push('-p', prompt);
        if (request.outputFormat === 'json') {
            args.push('--json');
        }
        return args;
    }
    async executeCommand(binaryPath, args) {
        return new Promise((resolve, reject)=>{
            const child = spawn(binaryPath, args, {
                timeout: this.config.analysis.timeout
            });
            let stdout = '';
            let stderr = '';
            child.stdout.on('data', (data)=>{
                const chunk = data.toString();
                stdout += chunk;
                this.emit('output', {
                    type: 'stdout',
                    data: chunk
                });
            });
            child.stderr.on('data', (data)=>{
                const chunk = data.toString();
                stderr += chunk;
                this.emit('output', {
                    type: 'stderr',
                    data: chunk
                });
            });
            child.on('close', (code)=>{
                if (code === 0) {
                    resolve(stdout);
                } else {
                    reject(new GeminiExecutionError(`Command failed with code ${code}: ${stderr}`, 'analyze', {
                        exitCode: code,
                        stderr
                    }));
                }
            });
            child.on('error', (error)=>{
                reject(new GeminiExecutionError(`Failed to execute command: ${error.message}`, 'analyze', {
                    error: error.message
                }));
            });
        });
    }
    parseAnalysisOutput(output, request, requestId, startTime) {
        const duration = Date.now() - startTime;
        try {
            const parsed = JSON.parse(output);
            return {
                success: true,
                requestId,
                timestamp: new Date(),
                duration,
                tokenUsage: parsed.tokenUsage || {
                    prompt: 0,
                    completion: 0,
                    total: 0
                },
                summary: parsed.summary || 'Analysis complete',
                findings: this.normalizeFindings(parsed.findings || []),
                metrics: parsed.metrics || {
                    filesAnalyzed: 0,
                    linesOfCode: 0
                },
                recommendations: parsed.recommendations || [],
                rawOutput: output
            };
        } catch  {
            return {
                success: true,
                requestId,
                timestamp: new Date(),
                duration,
                tokenUsage: {
                    prompt: 0,
                    completion: 0,
                    total: 0
                },
                summary: this.extractSummary(output),
                findings: this.extractFindings(output),
                metrics: {
                    filesAnalyzed: 0,
                    linesOfCode: 0
                },
                recommendations: this.extractRecommendations(output),
                rawOutput: output
            };
        }
    }
    normalizeFindings(findings) {
        return findings.map((f)=>{
            const finding = f;
            return {
                type: finding.type || 'general',
                severity: this.normalizeSeverity(finding.severity),
                location: finding.location || finding.file || 'unknown',
                message: finding.message || finding.description || '',
                suggestion: finding.suggestion || finding.recommendation,
                code: finding.code,
                line: finding.line,
                column: finding.column
            };
        });
    }
    normalizeSeverity(severity) {
        const normalized = (severity || '').toLowerCase();
        if ([
            'critical',
            'high',
            'medium',
            'low',
            'info'
        ].includes(normalized)) {
            return normalized;
        }
        return 'info';
    }
    extractSummary(output) {
        const lines = output.split('\n');
        const summaryLines = lines.slice(0, 5).filter((l)=>l.trim());
        return summaryLines.join(' ').slice(0, 500);
    }
    extractFindings(output) {
        const findings = [];
        const patterns = [
            /(?:error|warning|issue|vulnerability|problem):\s*(.+)/gi,
            /(?:found|detected|identified):\s*(.+)/gi
        ];
        for (const pattern of patterns){
            let match;
            while((match = pattern.exec(output)) !== null){
                findings.push({
                    type: 'general',
                    severity: 'info',
                    location: 'unknown',
                    message: match[1].trim()
                });
            }
        }
        return findings;
    }
    extractRecommendations(output) {
        const recommendations = [];
        const patterns = [
            /(?:recommend|suggest|should|consider):\s*(.+)/gi,
            /(?:recommendation|suggestion):\s*(.+)/gi
        ];
        for (const pattern of patterns){
            let match;
            while((match = pattern.exec(output)) !== null){
                recommendations.push({
                    type: 'general',
                    priority: 'medium',
                    description: match[1].trim()
                });
            }
        }
        return recommendations;
    }
}

//# sourceMappingURL=executor.js.map