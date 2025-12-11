import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { EventEmitter } from 'events';
import { DEFAULT_CONFIG } from './types.js';
import { GeminiConfigError } from './errors.js';
import { GeminiInstaller } from './installer.js';
import { GeminiAuthenticator } from './authenticator.js';
import { GeminiExecutor } from './executor.js';
import { GeminiCache } from './cache.js';
import { RateLimiter } from './rate-limiter.js';
export class GeminiModuleManager extends EventEmitter {
    static instance = null;
    config;
    installer;
    authenticator;
    executor = null;
    cache;
    rateLimiter;
    initialized = false;
    constructor(){
        super();
        this.config = {
            ...DEFAULT_CONFIG
        };
        this.installer = new GeminiInstaller();
        this.authenticator = new GeminiAuthenticator(this.installer);
        this.cache = new GeminiCache(this.config.cache);
        this.rateLimiter = new RateLimiter(this.config.rateLimit);
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
        this.emit('initialized');
    }
    async enable(options = {}) {
        console.log('🚀 Enabling Gemini CLI module...');
        await this.initialize();
        if (!options.skipInstall) {
            const installResult = await this.installer.ensureInstalled();
            if (!installResult.success) {
                throw new GeminiConfigError('Failed to install Gemini CLI');
            }
        }
        const authMethod = options.authMethod || 'google-login';
        await this.authenticator.authenticate(authMethod, {
            apiKey: options.apiKey,
            vertexProject: options.vertexProject,
            vertexLocation: options.vertexLocation
        });
        this.config.enabled = true;
        this.config.authMethod = authMethod;
        if (options.apiKey) this.config.apiKey = options.apiKey;
        if (options.vertexProject) this.config.vertexProject = options.vertexProject;
        if (options.vertexLocation) this.config.vertexLocation = options.vertexLocation;
        this.executor = new GeminiExecutor(this.installer, this.cache, this.rateLimiter, this.config);
        await this.saveConfig();
        console.log('✅ Gemini CLI module enabled');
        this.emit('enabled');
    }
    async disable() {
        console.log('⏸️  Disabling Gemini CLI module...');
        this.config.enabled = false;
        this.executor = null;
        await this.saveConfig();
        console.log('✅ Gemini CLI module disabled');
        this.emit('disabled');
    }
    async eject(options = {}) {
        console.log('🗑️  Ejecting Gemini CLI module...');
        await this.disable();
        await this.cache.clear();
        await this.authenticator.logout();
        if (options.uninstall) {
            await this.installer.uninstall();
        }
        if (!options.keepConfig) {
            this.config = {
                ...DEFAULT_CONFIG
            };
            await this.deleteConfig();
        }
        console.log('✅ Gemini CLI module ejected');
        this.emit('ejected');
    }
    async getStatus() {
        const installed = await this.installer.isInstalled();
        const authenticated = await this.authenticator.isAuthenticated();
        const version = await this.installer.getVersion();
        const binaryPath = await this.installer.findBinary();
        const authMethod = await this.authenticator.getAuthMethod();
        return {
            installed,
            enabled: this.config.enabled,
            authenticated,
            version,
            authMethod: authMethod ?? undefined,
            binaryPath: binaryPath ?? undefined,
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
        if (!this.executor) {
            throw new GeminiConfigError('Module not enabled. Run `claude-flow gemini enable` first.');
        }
        return this.executor.analyze(request);
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
        this.emit('config-updated', this.config);
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
        this.cache = new GeminiCache(this.config.cache);
        this.rateLimiter = new RateLimiter(this.config.rateLimit);
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
}
export function getGeminiModule() {
    return GeminiModuleManager.getInstance();
}
export * from './types.js';
export * from './errors.js';
export { GeminiInstaller } from './installer.js';
export { GeminiAuthenticator } from './authenticator.js';
export { GeminiExecutor } from './executor.js';
export { GeminiCache } from './cache.js';
export { RateLimiter } from './rate-limiter.js';

//# sourceMappingURL=index.js.map