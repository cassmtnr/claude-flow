/**
 * Gemini CLI Module - Main Entry Point
 * Manages the complete lifecycle of the Gemini CLI integration
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { EventEmitter } from 'events';
import type {
  GeminiCLIConfig,
  ModuleStatus,
  AuthMethod,
  AnalysisRequest,
  AnalysisResult,
} from './types.js';
import { DEFAULT_CONFIG } from './types.js';
import { GeminiConfigError } from './errors.js';
import { GeminiInstaller } from './installer.js';
import { GeminiAuthenticator } from './authenticator.js';
import { GeminiExecutor } from './executor.js';
import { GeminiCache } from './cache.js';
import { RateLimiter } from './rate-limiter.js';

export class GeminiModuleManager extends EventEmitter {
  private static instance: GeminiModuleManager | null = null;

  private config: GeminiCLIConfig;
  private installer: GeminiInstaller;
  private authenticator: GeminiAuthenticator;
  private executor: GeminiExecutor | null = null;
  private cache: GeminiCache;
  private rateLimiter: RateLimiter;
  private initialized: boolean = false;

  private constructor() {
    super();
    this.config = { ...DEFAULT_CONFIG };
    this.installer = new GeminiInstaller();
    this.authenticator = new GeminiAuthenticator(this.installer);
    this.cache = new GeminiCache(this.config.cache);
    this.rateLimiter = new RateLimiter(this.config.rateLimit);
  }

  /**
   * Get singleton instance
   */
  static getInstance(): GeminiModuleManager {
    if (!GeminiModuleManager.instance) {
      GeminiModuleManager.instance = new GeminiModuleManager();
    }
    return GeminiModuleManager.instance;
  }

  /**
   * Initialize the module
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    // Load configuration
    await this.loadConfig();

    // Initialize cache
    await this.cache.initialize();

    this.initialized = true;
    this.emit('initialized');
  }

  /**
   * Enable the module
   */
  async enable(options: {
    authMethod?: AuthMethod;
    apiKey?: string;
    vertexProject?: string;
    vertexLocation?: string;
    skipInstall?: boolean;
  } = {}): Promise<void> {
    console.log('🚀 Enabling Gemini CLI module...');

    // Ensure initialized
    await this.initialize();

    // Install if needed
    if (!options.skipInstall) {
      const installResult = await this.installer.ensureInstalled();
      if (!installResult.success) {
        throw new GeminiConfigError('Failed to install Gemini CLI');
      }
    }

    // Authenticate
    const authMethod = options.authMethod || 'google-login';
    await this.authenticator.authenticate(authMethod, {
      apiKey: options.apiKey,
      vertexProject: options.vertexProject,
      vertexLocation: options.vertexLocation,
    } as Partial<GeminiCLIConfig>);

    // Update config
    this.config.enabled = true;
    this.config.authMethod = authMethod;
    if (options.apiKey) this.config.apiKey = options.apiKey;
    if (options.vertexProject) this.config.vertexProject = options.vertexProject;
    if (options.vertexLocation) this.config.vertexLocation = options.vertexLocation;

    // Create executor
    this.executor = new GeminiExecutor(
      this.installer,
      this.cache,
      this.rateLimiter,
      this.config
    );

    // Save config
    await this.saveConfig();

    console.log('✅ Gemini CLI module enabled');
    this.emit('enabled');
  }

  /**
   * Disable the module
   */
  async disable(): Promise<void> {
    console.log('⏸️  Disabling Gemini CLI module...');

    this.config.enabled = false;
    this.executor = null;

    await this.saveConfig();

    console.log('✅ Gemini CLI module disabled');
    this.emit('disabled');
  }

  /**
   * Eject (completely remove) the module
   */
  async eject(options: {
    force?: boolean;
    uninstall?: boolean;
    keepConfig?: boolean;
  } = {}): Promise<void> {
    console.log('🗑️  Ejecting Gemini CLI module...');

    // Disable first
    await this.disable();

    // Clear cache
    await this.cache.clear();

    // Logout
    await this.authenticator.logout();

    // Uninstall if requested
    if (options.uninstall) {
      await this.installer.uninstall();
    }

    // Clear config unless keepConfig is set
    if (!options.keepConfig) {
      this.config = { ...DEFAULT_CONFIG };
      await this.deleteConfig();
    }

    console.log('✅ Gemini CLI module ejected');
    this.emit('ejected');
  }

  /**
   * Get module status
   */
  async getStatus(): Promise<ModuleStatus> {
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
      lastCheck: new Date(),
    };
  }

  /**
   * Check if module is enabled
   */
  isEnabled(): boolean {
    return this.config.enabled;
  }

  /**
   * Get the executor (for running analyses)
   */
  getExecutor(): GeminiExecutor | null {
    return this.executor;
  }

  /**
   * Run an analysis
   */
  async analyze(request: AnalysisRequest): Promise<AnalysisResult> {
    if (!this.executor) {
      throw new GeminiConfigError('Module not enabled. Run `claude-flow gemini enable` first.');
    }
    return this.executor.analyze(request);
  }

  /**
   * Get current configuration
   */
  getConfig(): GeminiCLIConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  async updateConfig(updates: Partial<GeminiCLIConfig>): Promise<void> {
    this.config = { ...this.config, ...updates };
    await this.saveConfig();
    this.emit('config-updated', this.config);
  }

  /**
   * Get cache instance for external access
   */
  getCache(): GeminiCache {
    return this.cache;
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { entries: number; size: number; hitRate: number } {
    return this.cache.getStats();
  }

  /**
   * Clear the cache
   */
  async clearCache(): Promise<void> {
    await this.cache.clear();
  }

  // ============================================
  // Private Methods
  // ============================================

  private getConfigPath(): string {
    return path.join(os.homedir(), '.claude-flow', 'modules', 'gemini-cli.json');
  }

  private async loadConfig(): Promise<void> {
    const configPath = this.getConfigPath();

    try {
      const content = await fs.readFile(configPath, 'utf-8');
      const loaded = JSON.parse(content);
      this.config = { ...DEFAULT_CONFIG, ...loaded };
    } catch {
      // Use defaults if config doesn't exist
      this.config = { ...DEFAULT_CONFIG };
    }

    // Update child components with loaded config
    this.cache = new GeminiCache(this.config.cache);
    this.rateLimiter = new RateLimiter(this.config.rateLimit);
  }

  private async saveConfig(): Promise<void> {
    const configPath = this.getConfigPath();
    const configDir = path.dirname(configPath);

    await fs.mkdir(configDir, { recursive: true });
    await fs.writeFile(configPath, JSON.stringify(this.config, null, 2), 'utf-8');
  }

  private async deleteConfig(): Promise<void> {
    const configPath = this.getConfigPath();

    try {
      await fs.unlink(configPath);
    } catch {
      // Ignore if doesn't exist
    }
  }
}

// Export singleton getter
export function getGeminiModule(): GeminiModuleManager {
  return GeminiModuleManager.getInstance();
}

// Re-export types and components
export * from './types.js';
export * from './errors.js';
export { GeminiInstaller } from './installer.js';
export { GeminiAuthenticator } from './authenticator.js';
export { GeminiExecutor } from './executor.js';
export { GeminiCache } from './cache.js';
export { RateLimiter } from './rate-limiter.js';
