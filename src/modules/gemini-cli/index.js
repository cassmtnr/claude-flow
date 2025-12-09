// gemini-cli/index.js - JavaScript bridge for the TypeScript Gemini CLI module
// This file provides a JS entrypoint that works in both development and production
// Re-exports from the core module for runtime compatibility

import { EventEmitter } from 'events';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

// Try to import from compiled TypeScript first, fall back to JS implementation
let _getGeminiModule;
try {
  const core = await import('./src/core/index.js');
  _getGeminiModule = core.getGeminiModule;
} catch {
  // Fall back to inline implementation below
  _getGeminiModule = null;
}

// Default configuration
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
      'build/**',
    ],
    maxFileSize: 10485760,
    timeout: 300000,
  },
  cache: {
    enabled: true,
    ttl: 3600000,
    maxSize: 100,
    directory: '.claude-flow/cache/gemini',
  },
  rateLimit: {
    enabled: true,
    requestsPerMinute: 60,
    requestsPerDay: 1000,
    burstLimit: 10,
  },
};

// Simple in-memory cache
class SimpleCache {
  constructor(config) {
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
    this.cache.set(key, { value, createdAt: Date.now() });
  }

  async clear() {
    this.cache.clear();
  }

  getStats() {
    return { entries: this.cache.size, size: 0, hitRate: 0 };
  }
}

// Simple rate limiter
class SimpleRateLimiter {
  constructor(config) {
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
    while (!this.canMakeRequest()) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  getQuotaStatus() {
    return {
      requestsPerMinute: {
        used: Math.floor(this.config.requestsPerMinute - this.minuteTokens),
        limit: this.config.requestsPerMinute,
        resetAt: new Date(this.lastMinuteRefill + 60000),
      },
      requestsPerDay: {
        used: Math.floor(this.config.requestsPerDay - this.dayTokens),
        limit: this.config.requestsPerDay,
        resetAt: new Date(this.lastDayRefill + 86400000),
      },
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
}

// Module manager implementation
class GeminiModuleManager extends EventEmitter {
  static instance = null;

  constructor() {
    super();
    this.config = { ...DEFAULT_CONFIG };
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

    // Check if gemini CLI is installed
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);

    try {
      await execAsync('which gemini');
    } catch {
      if (!options.skipInstall) {
        console.log('📦 Installing Gemini CLI...');
        try {
          await execAsync('npm install -g @anthropic-ai/gemini-cli', { timeout: 120000 });
          console.log('✅ Gemini CLI installed');
        } catch (err) {
          throw new Error(`Failed to install Gemini CLI: ${err.message}`);
        }
      }
    }

    this.config.enabled = true;
    this.config.authMethod = options.authMethod || 'google-login';
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
      this.config = { ...DEFAULT_CONFIG };
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

    try {
      const { stdout } = await execAsync('which gemini');
      binaryPath = stdout.trim();
      installed = true;
      try {
        const { stdout: versionOut } = await execAsync('gemini --version');
        version = versionOut.trim().match(/(\d+\.\d+\.\d+)/)?.[1];
      } catch {}
    } catch {}

    return {
      installed,
      enabled: this.config.enabled,
      authenticated: false, // Would need to check credentials
      version,
      authMethod: this.config.authMethod,
      binaryPath,
      quotaStatus: this.rateLimiter.getQuotaStatus(),
      lastCheck: new Date(),
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

    // Placeholder - actual execution would need the executor
    return {
      success: false,
      requestId: `gemini-${Date.now()}`,
      timestamp: new Date(),
      duration: 0,
      tokenUsage: { prompt: 0, completion: 0, total: 0 },
      summary: 'Analysis not yet implemented in JS bridge. Please use the TypeScript module.',
      findings: [],
      metrics: { filesAnalyzed: 0, linesOfCode: 0 },
      recommendations: [],
      errors: ['JS bridge does not support analysis yet. Build and use the compiled TypeScript module.'],
    };
  }

  getConfig() {
    return { ...this.config };
  }

  async updateConfig(updates) {
    this.config = { ...this.config, ...updates };
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
      this.config = { ...DEFAULT_CONFIG, ...loaded };
    } catch {
      this.config = { ...DEFAULT_CONFIG };
    }
  }

  async saveConfig() {
    const configPath = this.getConfigPath();
    const configDir = path.dirname(configPath);
    await fs.mkdir(configDir, { recursive: true });
    await fs.writeFile(configPath, JSON.stringify(this.config, null, 2), 'utf-8');
  }

  async deleteConfig() {
    const configPath = this.getConfigPath();
    try {
      await fs.unlink(configPath);
    } catch {}
  }
}

export function getGeminiModule() {
  // Use TypeScript module if available, otherwise use JS fallback
  if (_getGeminiModule) {
    return _getGeminiModule();
  }
  return GeminiModuleManager.getInstance();
}

export { GeminiModuleManager, DEFAULT_CONFIG };
