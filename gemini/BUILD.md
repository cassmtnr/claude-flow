# Building the Gemini CLI Module

> Step-by-step implementation guide for building the Gemini CLI integration module from scratch.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Project Structure](#project-structure)
3. [Phase 1: Foundation](#phase-1-foundation)
4. [Phase 2: Core Components](#phase-2-core-components)
5. [Phase 3: CLI Integration](#phase-3-cli-integration)
6. [Phase 4: MCP Tools](#phase-4-mcp-tools)
7. [Phase 5: Testing](#phase-5-testing)
8. [Phase 6: Build & Verify](#phase-6-build--verify)
9. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Tools

```bash
# Node.js 20+ required
node --version  # Should be >= 20.0.0

# pnpm recommended (or npm 9+)
pnpm --version

# TypeScript (installed as dev dependency)
npx tsc --version
```

### Clone and Setup

```bash
# If starting fresh
git clone https://github.com/ruvnet/claude-flow.git
cd claude-flow

# Install dependencies
pnpm install

# Verify build works before adding module
pnpm run build
```

---

## Project Structure

Create the following directory structure:

```
src/
├── modules/
│   └── gemini-cli/
│       ├── index.ts              # Module entry point & manager
│       ├── types.ts              # TypeScript interfaces
│       ├── installer.ts          # Gemini CLI installation
│       ├── authenticator.ts      # Authentication methods
│       ├── executor.ts           # Analysis execution
│       ├── cache.ts              # Result caching
│       ├── rate-limiter.ts       # Rate limiting
│       ├── validators.ts         # Input validation
│       └── errors.ts             # Custom error types
├── cli/
│   └── commands/
│       └── gemini.ts             # CLI command handler
└── mcp/
    └── providers/
        └── gemini-cli/
            ├── index.ts          # MCP provider
            └── tools.ts          # Tool definitions
```

### Create Directory Structure

```bash
# Run from project root
mkdir -p src/modules/gemini-cli
mkdir -p src/mcp/providers/gemini-cli
```

---

## Phase 1: Foundation

### Step 1.1: Create Error Types

Create `src/modules/gemini-cli/errors.ts`:

```typescript
/**
 * Gemini CLI Module - Error Types
 */

export class GeminiModuleError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'GeminiModuleError';
  }
}

export class GeminiInstallError extends GeminiModuleError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'INSTALL_ERROR', details);
    this.name = 'GeminiInstallError';
  }
}

export class GeminiAuthError extends GeminiModuleError {
  constructor(
    message: string,
    public readonly authMethod: string,
    details?: Record<string, unknown>
  ) {
    super(message, 'AUTH_ERROR', { authMethod, ...details });
    this.name = 'GeminiAuthError';
  }
}

export class GeminiExecutionError extends GeminiModuleError {
  constructor(
    message: string,
    public readonly command: string,
    details?: Record<string, unknown>
  ) {
    super(message, 'EXECUTION_ERROR', { command, ...details });
    this.name = 'GeminiExecutionError';
  }
}

export class GeminiRateLimitError extends GeminiModuleError {
  constructor(
    message: string,
    public readonly retryAfter: number,
    details?: Record<string, unknown>
  ) {
    super(message, 'RATE_LIMIT_ERROR', { retryAfter, ...details });
    this.name = 'GeminiRateLimitError';
  }
}

export class GeminiConfigError extends GeminiModuleError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'CONFIG_ERROR', details);
    this.name = 'GeminiConfigError';
  }
}
```

### Step 1.2: Create Type Definitions

Create `src/modules/gemini-cli/types.ts`:

```typescript
/**
 * Gemini CLI Module - Type Definitions
 * Based on: gemini/TYPES.md
 */

// ============================================
// Configuration Types
// ============================================

export type AuthMethod = 'google-login' | 'api-key' | 'vertex-ai';
export type GeminiModel = 'gemini-2.5-pro' | 'gemini-2.5-flash';
export type AnalysisType = 'codebase' | 'architecture' | 'security' | 'dependencies' | 'coverage';
export type OutputFormat = 'json' | 'markdown' | 'text';
export type AnalysisDepth = 'surface' | 'moderate' | 'deep' | 'comprehensive';

export interface GeminiCLIConfig {
  enabled: boolean;
  authMethod: AuthMethod;
  apiKey?: string;
  vertexProject?: string;
  vertexLocation?: string;
  defaultModel: GeminiModel;
  contextLimit: number;
  requestsPerMinute: number;
  requestsPerDay: number;
  analysis: AnalysisConfig;
  cache: CacheConfig;
  rateLimit: RateLimitConfig;
}

export interface AnalysisConfig {
  defaultType: AnalysisType;
  outputFormat: OutputFormat;
  storeInMemory: boolean;
  excludePatterns: string[];
  maxFileSize: number;
  timeout: number;
}

export interface CacheConfig {
  enabled: boolean;
  ttl: number;
  maxSize: number;
  directory: string;
}

export interface RateLimitConfig {
  enabled: boolean;
  requestsPerMinute: number;
  requestsPerDay: number;
  burstLimit: number;
}

// ============================================
// Analysis Types
// ============================================

export interface AnalysisRequest {
  type: AnalysisType;
  target: string | string[];
  depth?: AnalysisDepth;
  query?: string;
  outputFormat?: OutputFormat;
  includePatterns?: string[];
  excludePatterns?: string[];
  focus?: string[];
  storeInMemory?: boolean;
}

export interface AnalysisResult {
  success: boolean;
  requestId: string;
  timestamp: Date;
  duration: number;
  tokenUsage: TokenUsage;
  summary: string;
  findings: Finding[];
  metrics: AnalysisMetrics;
  recommendations: Recommendation[];
  rawOutput?: string;
  errors?: string[];
}

export interface TokenUsage {
  prompt: number;
  completion: number;
  total: number;
}

export interface Finding {
  type: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  location: string;
  message: string;
  suggestion?: string;
  code?: string;
  line?: number;
  column?: number;
}

export interface AnalysisMetrics {
  filesAnalyzed: number;
  linesOfCode: number;
  complexity?: number;
  dependencies?: number;
  qualityScore?: number;
}

export interface Recommendation {
  type: string;
  priority: 'high' | 'medium' | 'low';
  description: string;
  effort?: string;
  impact?: string;
}

// ============================================
// Module Status Types
// ============================================

export interface ModuleStatus {
  installed: boolean;
  enabled: boolean;
  authenticated: boolean;
  version?: string;
  authMethod?: AuthMethod;
  binaryPath?: string;
  quotaStatus?: QuotaStatus;
  lastCheck: Date;
}

export interface QuotaStatus {
  requestsPerMinute: {
    used: number;
    limit: number;
    resetAt: Date;
  };
  requestsPerDay: {
    used: number;
    limit: number;
    resetAt: Date;
  };
}

// ============================================
// Authentication Types
// ============================================

export interface AuthResult {
  success: boolean;
  method: AuthMethod;
  expiresAt?: Date;
  quotaInfo?: QuotaStatus;
  error?: string;
}

export interface VertexAIConfig {
  project: string;
  location: string;
  serviceAccountPath?: string;
}

// ============================================
// Installer Types
// ============================================

export interface InstallResult {
  success: boolean;
  version?: string;
  path?: string;
  error?: string;
}

export interface PlatformInfo {
  os: 'darwin' | 'linux' | 'win32';
  arch: 'x64' | 'arm64';
  shell: string;
  homeDir: string;
  npmGlobalDir: string;
}

// ============================================
// Default Configuration
// ============================================

export const DEFAULT_CONFIG: GeminiCLIConfig = {
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
    maxFileSize: 10485760, // 10MB
    timeout: 300000, // 5 minutes
  },
  cache: {
    enabled: true,
    ttl: 3600000, // 1 hour
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
```

### Step 1.3: Create Rate Limiter

Create `src/modules/gemini-cli/rate-limiter.ts`:

```typescript
/**
 * Gemini CLI Module - Rate Limiter
 * Token bucket algorithm implementation
 */

import { GeminiRateLimitError } from './errors.js';
import type { RateLimitConfig, QuotaStatus } from './types.js';

interface TokenBucket {
  tokens: number;
  lastRefill: number;
  capacity: number;
  refillRate: number; // tokens per ms
}

export class RateLimiter {
  private minuteBucket: TokenBucket;
  private dayBucket: TokenBucket;
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = config;

    // Initialize minute bucket
    this.minuteBucket = {
      tokens: config.requestsPerMinute,
      lastRefill: Date.now(),
      capacity: config.requestsPerMinute,
      refillRate: config.requestsPerMinute / 60000, // per ms
    };

    // Initialize day bucket
    this.dayBucket = {
      tokens: config.requestsPerDay,
      lastRefill: Date.now(),
      capacity: config.requestsPerDay,
      refillRate: config.requestsPerDay / 86400000, // per ms
    };
  }

  /**
   * Check if a request can be made
   */
  canMakeRequest(): boolean {
    if (!this.config.enabled) return true;

    this.refillBuckets();
    return this.minuteBucket.tokens >= 1 && this.dayBucket.tokens >= 1;
  }

  /**
   * Consume a token (call after successful request)
   */
  consumeToken(): void {
    if (!this.config.enabled) return;

    this.refillBuckets();

    if (this.minuteBucket.tokens < 1 || this.dayBucket.tokens < 1) {
      const retryAfter = this.getRetryAfter();
      throw new GeminiRateLimitError(
        'Rate limit exceeded',
        retryAfter,
        { quota: this.getQuotaStatus() }
      );
    }

    this.minuteBucket.tokens -= 1;
    this.dayBucket.tokens -= 1;
  }

  /**
   * Wait until a request can be made
   */
  async waitForQuota(): Promise<void> {
    if (!this.config.enabled) return;

    while (!this.canMakeRequest()) {
      const waitTime = Math.min(this.getRetryAfter(), 60000); // Max 1 minute wait
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }

  /**
   * Get current quota status
   */
  getQuotaStatus(): QuotaStatus {
    this.refillBuckets();

    const now = Date.now();
    const minuteResetAt = new Date(this.minuteBucket.lastRefill + 60000);
    const dayResetAt = new Date(this.getDayResetTime());

    return {
      requestsPerMinute: {
        used: Math.floor(this.minuteBucket.capacity - this.minuteBucket.tokens),
        limit: this.minuteBucket.capacity,
        resetAt: minuteResetAt,
      },
      requestsPerDay: {
        used: Math.floor(this.dayBucket.capacity - this.dayBucket.tokens),
        limit: this.dayBucket.capacity,
        resetAt: dayResetAt,
      },
    };
  }

  /**
   * Get time until next available request (ms)
   */
  getRetryAfter(): number {
    this.refillBuckets();

    if (this.minuteBucket.tokens < 1) {
      // Time until minute bucket has 1 token
      const tokensNeeded = 1 - this.minuteBucket.tokens;
      return Math.ceil(tokensNeeded / this.minuteBucket.refillRate);
    }

    if (this.dayBucket.tokens < 1) {
      // Time until day bucket has 1 token
      const tokensNeeded = 1 - this.dayBucket.tokens;
      return Math.ceil(tokensNeeded / this.dayBucket.refillRate);
    }

    return 0;
  }

  /**
   * Refill token buckets based on elapsed time
   */
  private refillBuckets(): void {
    const now = Date.now();

    // Refill minute bucket
    const minuteElapsed = now - this.minuteBucket.lastRefill;
    const minuteTokensToAdd = minuteElapsed * this.minuteBucket.refillRate;
    this.minuteBucket.tokens = Math.min(
      this.minuteBucket.capacity,
      this.minuteBucket.tokens + minuteTokensToAdd
    );
    this.minuteBucket.lastRefill = now;

    // Refill day bucket
    const dayElapsed = now - this.dayBucket.lastRefill;
    const dayTokensToAdd = dayElapsed * this.dayBucket.refillRate;
    this.dayBucket.tokens = Math.min(
      this.dayBucket.capacity,
      this.dayBucket.tokens + dayTokensToAdd
    );
    this.dayBucket.lastRefill = now;
  }

  /**
   * Get the next day reset time (midnight UTC)
   */
  private getDayResetTime(): number {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    tomorrow.setUTCHours(0, 0, 0, 0);
    return tomorrow.getTime();
  }

  /**
   * Reset rate limits (for testing or manual reset)
   */
  reset(): void {
    this.minuteBucket.tokens = this.minuteBucket.capacity;
    this.minuteBucket.lastRefill = Date.now();
    this.dayBucket.tokens = this.dayBucket.capacity;
    this.dayBucket.lastRefill = Date.now();
  }
}
```

### Step 1.4: Create Cache Manager

Create `src/modules/gemini-cli/cache.ts`:

```typescript
/**
 * Gemini CLI Module - Cache Manager
 * LRU cache with file persistence
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';
import type { CacheConfig, AnalysisResult } from './types.js';

interface CacheEntry {
  key: string;
  value: AnalysisResult;
  createdAt: number;
  accessedAt: number;
  size: number;
}

export class GeminiCache {
  private cache: Map<string, CacheEntry> = new Map();
  private config: CacheConfig;
  private initialized: boolean = false;

  constructor(config: CacheConfig) {
    this.config = config;
  }

  /**
   * Initialize cache directory
   */
  async initialize(): Promise<void> {
    if (!this.config.enabled || this.initialized) return;

    try {
      await fs.mkdir(this.config.directory, { recursive: true });
      await this.loadFromDisk();
      this.initialized = true;
    } catch (error) {
      console.warn('Failed to initialize cache:', error);
    }
  }

  /**
   * Generate cache key from request parameters
   */
  generateKey(params: Record<string, unknown>): string {
    const normalized = JSON.stringify(params, Object.keys(params).sort());
    return crypto.createHash('sha256').update(normalized).digest('hex').slice(0, 16);
  }

  /**
   * Get cached result
   */
  async get(key: string): Promise<AnalysisResult | null> {
    if (!this.config.enabled) return null;

    const entry = this.cache.get(key);
    if (!entry) return null;

    // Check TTL
    if (Date.now() - entry.createdAt > this.config.ttl) {
      this.cache.delete(key);
      await this.removeFromDisk(key);
      return null;
    }

    // Update access time (LRU)
    entry.accessedAt = Date.now();
    return entry.value;
  }

  /**
   * Set cached result
   */
  async set(key: string, value: AnalysisResult): Promise<void> {
    if (!this.config.enabled) return;

    const size = JSON.stringify(value).length;

    // Evict if necessary
    await this.evictIfNeeded(size);

    const entry: CacheEntry = {
      key,
      value,
      createdAt: Date.now(),
      accessedAt: Date.now(),
      size,
    };

    this.cache.set(key, entry);
    await this.saveToDisk(key, entry);
  }

  /**
   * Invalidate cache entries matching pattern
   */
  async invalidate(pattern?: { target?: string; type?: string }): Promise<number> {
    let invalidated = 0;

    for (const [key, entry] of this.cache.entries()) {
      let shouldInvalidate = !pattern;

      if (pattern) {
        const value = entry.value;
        if (pattern.target && value.requestId?.includes(pattern.target)) {
          shouldInvalidate = true;
        }
        if (pattern.type && value.findings?.some(f => f.type === pattern.type)) {
          shouldInvalidate = true;
        }
      }

      if (shouldInvalidate) {
        this.cache.delete(key);
        await this.removeFromDisk(key);
        invalidated++;
      }
    }

    return invalidated;
  }

  /**
   * Clear all cache
   */
  async clear(): Promise<void> {
    this.cache.clear();

    try {
      const files = await fs.readdir(this.config.directory);
      await Promise.all(
        files
          .filter(f => f.endsWith('.json'))
          .map(f => fs.unlink(path.join(this.config.directory, f)))
      );
    } catch (error) {
      // Ignore errors during clear
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): { entries: number; size: number; hitRate: number } {
    let totalSize = 0;
    for (const entry of this.cache.values()) {
      totalSize += entry.size;
    }

    return {
      entries: this.cache.size,
      size: totalSize,
      hitRate: 0, // Would need to track hits/misses
    };
  }

  /**
   * Evict least recently used entries if needed
   */
  private async evictIfNeeded(newEntrySize: number): Promise<void> {
    while (this.cache.size >= this.config.maxSize) {
      // Find LRU entry
      let lruKey: string | null = null;
      let lruTime = Infinity;

      for (const [key, entry] of this.cache.entries()) {
        if (entry.accessedAt < lruTime) {
          lruTime = entry.accessedAt;
          lruKey = key;
        }
      }

      if (lruKey) {
        this.cache.delete(lruKey);
        await this.removeFromDisk(lruKey);
      } else {
        break;
      }
    }
  }

  /**
   * Save entry to disk
   */
  private async saveToDisk(key: string, entry: CacheEntry): Promise<void> {
    try {
      const filePath = path.join(this.config.directory, `${key}.json`);
      await fs.writeFile(filePath, JSON.stringify(entry), 'utf-8');
    } catch (error) {
      console.warn(`Failed to save cache entry ${key}:`, error);
    }
  }

  /**
   * Remove entry from disk
   */
  private async removeFromDisk(key: string): Promise<void> {
    try {
      const filePath = path.join(this.config.directory, `${key}.json`);
      await fs.unlink(filePath);
    } catch (error) {
      // Ignore if file doesn't exist
    }
  }

  /**
   * Load cache from disk on startup
   */
  private async loadFromDisk(): Promise<void> {
    try {
      const files = await fs.readdir(this.config.directory);
      const jsonFiles = files.filter(f => f.endsWith('.json'));

      for (const file of jsonFiles) {
        try {
          const filePath = path.join(this.config.directory, file);
          const content = await fs.readFile(filePath, 'utf-8');
          const entry: CacheEntry = JSON.parse(content);

          // Check TTL
          if (Date.now() - entry.createdAt <= this.config.ttl) {
            this.cache.set(entry.key, entry);
          } else {
            await fs.unlink(filePath);
          }
        } catch (error) {
          // Skip invalid files
        }
      }
    } catch (error) {
      // Directory might not exist yet
    }
  }
}
```

---

## Phase 2: Core Components

### Step 2.1: Create Installer

Create `src/modules/gemini-cli/installer.ts`:

```typescript
/**
 * Gemini CLI Module - Installer
 * Handles detection, installation, and version management
 */

import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { GeminiInstallError } from './errors.js';
import type { InstallResult, PlatformInfo } from './types.js';

const execAsync = promisify(exec);

export class GeminiInstaller {
  private platformInfo: PlatformInfo;
  private cachedVersion: string | null = null;
  private cachedPath: string | null = null;

  constructor() {
    this.platformInfo = this.detectPlatform();
  }

  /**
   * Check if Gemini CLI is installed
   */
  async isInstalled(): Promise<boolean> {
    const binaryPath = await this.findBinary();
    return binaryPath !== null;
  }

  /**
   * Find the Gemini CLI binary path
   */
  async findBinary(): Promise<string | null> {
    if (this.cachedPath) return this.cachedPath;

    // Try 'which' command first (Unix) or 'where' (Windows)
    const whichCmd = this.platformInfo.os === 'win32' ? 'where' : 'which';

    try {
      const { stdout } = await execAsync(`${whichCmd} gemini`);
      const binaryPath = stdout.trim().split('\n')[0];

      if (binaryPath && await this.verifyBinary(binaryPath)) {
        this.cachedPath = binaryPath;
        return binaryPath;
      }
    } catch {
      // Not found via which/where, check common paths
    }

    // Check common installation paths
    const commonPaths = this.getCommonPaths();

    for (const p of commonPaths) {
      if (await this.verifyBinary(p)) {
        this.cachedPath = p;
        return p;
      }
    }

    return null;
  }

  /**
   * Get installed version
   */
  async getVersion(): Promise<string | undefined> {
    if (this.cachedVersion) return this.cachedVersion;

    const binaryPath = await this.findBinary();
    if (!binaryPath) return undefined;

    try {
      const { stdout } = await execAsync(`"${binaryPath}" --version`);
      const version = stdout.trim().match(/(\d+\.\d+\.\d+)/)?.[1];
      if (version) {
        this.cachedVersion = version;
        return version;
      }
    } catch {
      // Version check failed
    }

    return undefined;
  }

  /**
   * Check if installed version meets minimum requirement
   */
  async checkMinVersion(minVersion: string): Promise<boolean> {
    const currentVersion = await this.getVersion();
    if (!currentVersion) return false;

    return this.compareVersions(currentVersion, minVersion) >= 0;
  }

  /**
   * Ensure Gemini CLI is installed, install if not
   */
  async ensureInstalled(): Promise<InstallResult> {
    if (await this.isInstalled()) {
      const version = await this.getVersion();
      const binaryPath = await this.findBinary();

      return {
        success: true,
        version,
        path: binaryPath ?? undefined,
      };
    }

    return this.install();
  }

  /**
   * Install Gemini CLI
   */
  async install(): Promise<InstallResult> {
    console.log('📦 Installing Gemini CLI...');

    try {
      // Use npm to install globally
      const { stdout, stderr } = await execAsync(
        'npm install -g @google/gemini-cli',
        { timeout: 120000 } // 2 minute timeout
      );

      // Clear cached values
      this.cachedPath = null;
      this.cachedVersion = null;

      // Verify installation
      if (await this.isInstalled()) {
        const version = await this.getVersion();
        const binaryPath = await this.findBinary();

        console.log(`✅ Gemini CLI installed successfully (v${version})`);

        return {
          success: true,
          version,
          path: binaryPath ?? undefined,
        };
      }

      throw new Error('Installation completed but binary not found');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new GeminiInstallError(`Failed to install Gemini CLI: ${message}`, {
        originalError: message,
      });
    }
  }

  /**
   * Uninstall Gemini CLI
   */
  async uninstall(): Promise<void> {
    console.log('🗑️  Uninstalling Gemini CLI...');

    try {
      await execAsync('npm uninstall -g @google/gemini-cli', { timeout: 60000 });

      // Clear cached values
      this.cachedPath = null;
      this.cachedVersion = null;

      // Clear credentials
      const geminiDir = path.join(os.homedir(), '.gemini');
      try {
        await fs.rm(geminiDir, { recursive: true, force: true });
      } catch {
        // Ignore if doesn't exist
      }

      console.log('✅ Gemini CLI uninstalled successfully');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new GeminiInstallError(`Failed to uninstall Gemini CLI: ${message}`);
    }
  }

  /**
   * Update Gemini CLI to latest version
   */
  async update(): Promise<InstallResult> {
    console.log('🔄 Updating Gemini CLI...');

    try {
      await execAsync('npm update -g @google/gemini-cli', { timeout: 120000 });

      // Clear cached values
      this.cachedPath = null;
      this.cachedVersion = null;

      const version = await this.getVersion();
      const binaryPath = await this.findBinary();

      console.log(`✅ Gemini CLI updated to v${version}`);

      return {
        success: true,
        version,
        path: binaryPath ?? undefined,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new GeminiInstallError(`Failed to update Gemini CLI: ${message}`);
    }
  }

  /**
   * Get installation instructions for manual install
   */
  getInstallInstructions(): string {
    return `
To install Gemini CLI manually:

1. Using npm (recommended):
   npm install -g @google/gemini-cli

2. Verify installation:
   gemini --version

3. Authenticate:
   gemini auth login

For more information, visit:
https://github.com/google/gemini-cli
    `.trim();
  }

  /**
   * Get platform information
   */
  getPlatformInfo(): PlatformInfo {
    return { ...this.platformInfo };
  }

  // ============================================
  // Private Methods
  // ============================================

  private detectPlatform(): PlatformInfo {
    return {
      os: os.platform() as 'darwin' | 'linux' | 'win32',
      arch: os.arch() as 'x64' | 'arm64',
      shell: process.env.SHELL || (os.platform() === 'win32' ? 'cmd.exe' : '/bin/bash'),
      homeDir: os.homedir(),
      npmGlobalDir: this.getNpmGlobalDir(),
    };
  }

  private getNpmGlobalDir(): string {
    try {
      const { execSync } = require('child_process');
      return execSync('npm root -g', { encoding: 'utf-8' }).trim();
    } catch {
      // Fallback to common paths
      if (os.platform() === 'win32') {
        return path.join(process.env.APPDATA || '', 'npm', 'node_modules');
      }
      return '/usr/local/lib/node_modules';
    }
  }

  private getCommonPaths(): string[] {
    const home = os.homedir();
    const isWindows = os.platform() === 'win32';
    const ext = isWindows ? '.cmd' : '';

    const paths: string[] = [];

    if (isWindows) {
      paths.push(
        path.join(process.env.APPDATA || '', 'npm', `gemini${ext}`),
        path.join(process.env.LOCALAPPDATA || '', 'npm', `gemini${ext}`),
        `C:\\Program Files\\nodejs\\gemini${ext}`,
      );
    } else {
      paths.push(
        path.join(home, '.local', 'bin', 'gemini'),
        '/usr/local/bin/gemini',
        '/usr/bin/gemini',
        path.join(home, '.npm-global', 'bin', 'gemini'),
        path.join(home, 'n', 'bin', 'gemini'),
      );
    }

    return paths;
  }

  private async verifyBinary(binaryPath: string): Promise<boolean> {
    try {
      await fs.access(binaryPath, fs.constants.X_OK);
      return true;
    } catch {
      return false;
    }
  }

  private compareVersions(v1: string, v2: string): number {
    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);

    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
      const p1 = parts1[i] || 0;
      const p2 = parts2[i] || 0;

      if (p1 > p2) return 1;
      if (p1 < p2) return -1;
    }

    return 0;
  }
}
```

### Step 2.2: Create Authenticator

Create `src/modules/gemini-cli/authenticator.ts`:

```typescript
/**
 * Gemini CLI Module - Authenticator
 * Handles Google Login, API Key, and Vertex AI authentication
 */

import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { GeminiAuthError } from './errors.js';
import type { AuthMethod, AuthResult, VertexAIConfig, GeminiCLIConfig } from './types.js';
import { GeminiInstaller } from './installer.js';

const execAsync = promisify(exec);

export class GeminiAuthenticator {
  private installer: GeminiInstaller;
  private credentialsPath: string;

  constructor(installer: GeminiInstaller) {
    this.installer = installer;
    this.credentialsPath = path.join(os.homedir(), '.gemini');
  }

  /**
   * Check if currently authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    try {
      // Check for credentials file
      const credFiles = [
        path.join(this.credentialsPath, 'credentials.json'),
        path.join(this.credentialsPath, 'application_default_credentials.json'),
      ];

      for (const file of credFiles) {
        try {
          await fs.access(file);
          return true;
        } catch {
          continue;
        }
      }

      // Check for API key in environment
      if (process.env.GEMINI_API_KEY) {
        return true;
      }

      // Check for Vertex AI credentials
      if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        try {
          await fs.access(process.env.GOOGLE_APPLICATION_CREDENTIALS);
          return true;
        } catch {
          // File doesn't exist
        }
      }

      return false;
    } catch {
      return false;
    }
  }

  /**
   * Get current authentication method
   */
  async getAuthMethod(): Promise<AuthMethod | null> {
    if (process.env.GEMINI_API_KEY) {
      return 'api-key';
    }

    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      return 'vertex-ai';
    }

    const credFile = path.join(this.credentialsPath, 'credentials.json');
    try {
      await fs.access(credFile);
      return 'google-login';
    } catch {
      return null;
    }
  }

  /**
   * Authenticate using the specified method
   */
  async authenticate(
    method: AuthMethod,
    config?: Partial<GeminiCLIConfig>
  ): Promise<AuthResult> {
    switch (method) {
      case 'google-login':
        return this.authenticateWithGoogle();
      case 'api-key':
        return this.authenticateWithApiKey(config?.apiKey);
      case 'vertex-ai':
        return this.authenticateWithVertexAI({
          project: config?.vertexProject!,
          location: config?.vertexLocation || 'us-central1',
        });
      default:
        throw new GeminiAuthError(`Unknown authentication method: ${method}`, method);
    }
  }

  /**
   * Google OAuth login
   */
  async authenticateWithGoogle(): Promise<AuthResult> {
    console.log('🔐 Starting Google OAuth login...');

    const binaryPath = await this.installer.findBinary();
    if (!binaryPath) {
      throw new GeminiAuthError('Gemini CLI not installed', 'google-login');
    }

    return new Promise((resolve, reject) => {
      const child = spawn(binaryPath, ['auth', 'login'], {
        stdio: ['inherit', 'pipe', 'pipe'],
      });

      let stdout = '';
      let stderr = '';

      child.stdout?.on('data', (data) => {
        stdout += data.toString();
        process.stdout.write(data);
      });

      child.stderr?.on('data', (data) => {
        stderr += data.toString();
        process.stderr.write(data);
      });

      child.on('close', async (code) => {
        if (code === 0) {
          console.log('✅ Google authentication successful');
          resolve({
            success: true,
            method: 'google-login',
          });
        } else {
          reject(
            new GeminiAuthError(
              `Google login failed: ${stderr || 'Unknown error'}`,
              'google-login',
              { exitCode: code }
            )
          );
        }
      });

      child.on('error', (error) => {
        reject(
          new GeminiAuthError(
            `Failed to start auth process: ${error.message}`,
            'google-login'
          )
        );
      });
    });
  }

  /**
   * API Key authentication
   */
  async authenticateWithApiKey(apiKey?: string): Promise<AuthResult> {
    const key = apiKey || process.env.GEMINI_API_KEY;

    if (!key) {
      throw new GeminiAuthError(
        'API key is required. Provide via --api-key or GEMINI_API_KEY environment variable',
        'api-key'
      );
    }

    console.log('🔐 Validating API key...');

    try {
      // Test the API key with a simple request
      const testResult = await this.testApiKey(key);

      if (!testResult.valid) {
        throw new GeminiAuthError(
          `Invalid API key: ${testResult.error}`,
          'api-key'
        );
      }

      // Store in environment for this session
      process.env.GEMINI_API_KEY = key;

      console.log('✅ API key validated successfully');

      return {
        success: true,
        method: 'api-key',
      };
    } catch (error) {
      if (error instanceof GeminiAuthError) throw error;
      throw new GeminiAuthError(
        `API key validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'api-key'
      );
    }
  }

  /**
   * Vertex AI authentication
   */
  async authenticateWithVertexAI(config: VertexAIConfig): Promise<AuthResult> {
    console.log('🔐 Configuring Vertex AI authentication...');

    if (!config.project) {
      throw new GeminiAuthError(
        'Vertex AI project ID is required',
        'vertex-ai'
      );
    }

    // Check for service account credentials
    const saPath = config.serviceAccountPath || process.env.GOOGLE_APPLICATION_CREDENTIALS;

    if (!saPath) {
      throw new GeminiAuthError(
        'Service account credentials required. Set GOOGLE_APPLICATION_CREDENTIALS or --sa-path',
        'vertex-ai'
      );
    }

    // Verify credentials file exists
    try {
      await fs.access(saPath);
    } catch {
      throw new GeminiAuthError(
        `Service account file not found: ${saPath}`,
        'vertex-ai'
      );
    }

    // Validate credentials format
    try {
      const content = await fs.readFile(saPath, 'utf-8');
      const creds = JSON.parse(content);

      if (!creds.type || !creds.project_id) {
        throw new GeminiAuthError(
          'Invalid service account file format',
          'vertex-ai'
        );
      }
    } catch (error) {
      if (error instanceof GeminiAuthError) throw error;
      throw new GeminiAuthError(
        `Failed to parse service account file: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'vertex-ai'
      );
    }

    // Set environment variables
    process.env.GOOGLE_APPLICATION_CREDENTIALS = saPath;
    process.env.GOOGLE_CLOUD_PROJECT = config.project;
    process.env.GOOGLE_CLOUD_LOCATION = config.location;

    console.log('✅ Vertex AI authentication configured');
    console.log(`   Project: ${config.project}`);
    console.log(`   Location: ${config.location}`);

    return {
      success: true,
      method: 'vertex-ai',
    };
  }

  /**
   * Logout / clear credentials
   */
  async logout(): Promise<void> {
    console.log('🔓 Clearing authentication...');

    // Clear environment variables
    delete process.env.GEMINI_API_KEY;
    delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
    delete process.env.GOOGLE_CLOUD_PROJECT;
    delete process.env.GOOGLE_CLOUD_LOCATION;

    // Try to run gemini auth logout
    const binaryPath = await this.installer.findBinary();
    if (binaryPath) {
      try {
        await execAsync(`"${binaryPath}" auth logout`);
      } catch {
        // Ignore errors
      }
    }

    // Clear local credentials
    try {
      await fs.rm(this.credentialsPath, { recursive: true, force: true });
    } catch {
      // Ignore if doesn't exist
    }

    console.log('✅ Authentication cleared');
  }

  // ============================================
  // Private Methods
  // ============================================

  private async testApiKey(key: string): Promise<{ valid: boolean; error?: string }> {
    try {
      // Make a minimal API request to test the key
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1/models?key=${key}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.ok) {
        return { valid: true };
      }

      const error = await response.json();
      return {
        valid: false,
        error: error.error?.message || `HTTP ${response.status}`,
      };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}
```

### Step 2.3: Create Executor

Create `src/modules/gemini-cli/executor.ts`:

```typescript
/**
 * Gemini CLI Module - Executor
 * Handles running Gemini CLI commands and parsing results
 */

import { spawn } from 'child_process';
import { EventEmitter } from 'events';
import { GeminiExecutionError } from './errors.js';
import type {
  AnalysisRequest,
  AnalysisResult,
  AnalysisType,
  GeminiCLIConfig,
  Finding,
} from './types.js';
import { GeminiInstaller } from './installer.js';
import { GeminiCache } from './cache.js';
import { RateLimiter } from './rate-limiter.js';

export class GeminiExecutor extends EventEmitter {
  private installer: GeminiInstaller;
  private cache: GeminiCache;
  private rateLimiter: RateLimiter;
  private config: GeminiCLIConfig;

  constructor(
    installer: GeminiInstaller,
    cache: GeminiCache,
    rateLimiter: RateLimiter,
    config: GeminiCLIConfig
  ) {
    super();
    this.installer = installer;
    this.cache = cache;
    this.rateLimiter = rateLimiter;
    this.config = config;
  }

  /**
   * Execute an analysis request
   */
  async analyze(request: AnalysisRequest): Promise<AnalysisResult> {
    const startTime = Date.now();
    const requestId = this.generateRequestId();

    // Check cache
    const cacheKey = this.cache.generateKey(request);
    const cached = await this.cache.get(cacheKey);
    if (cached) {
      this.emit('cache-hit', { requestId, cacheKey });
      return cached;
    }

    // Check rate limit
    await this.rateLimiter.waitForQuota();

    // Get binary path
    const binaryPath = await this.installer.findBinary();
    if (!binaryPath) {
      throw new GeminiExecutionError('Gemini CLI not installed', 'analyze');
    }

    // Build command
    const args = this.buildAnalysisArgs(request);

    this.emit('analysis-start', { requestId, request });

    try {
      // Execute command
      const output = await this.executeCommand(binaryPath, args);

      // Consume rate limit token
      this.rateLimiter.consumeToken();

      // Parse output
      const result = this.parseAnalysisOutput(output, request, requestId, startTime);

      // Cache result
      await this.cache.set(cacheKey, result);

      this.emit('analysis-complete', { requestId, result });

      return result;
    } catch (error) {
      const errorResult: AnalysisResult = {
        success: false,
        requestId,
        timestamp: new Date(),
        duration: Date.now() - startTime,
        tokenUsage: { prompt: 0, completion: 0, total: 0 },
        summary: 'Analysis failed',
        findings: [],
        metrics: { filesAnalyzed: 0, linesOfCode: 0 },
        recommendations: [],
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      };

      this.emit('analysis-error', { requestId, error });

      return errorResult;
    }
  }

  /**
   * Run security scan
   */
  async securityScan(target: string, options?: Partial<AnalysisRequest>): Promise<AnalysisResult> {
    return this.analyze({
      type: 'security',
      target,
      depth: 'deep',
      focus: ['vulnerabilities', 'secrets', 'misconfig'],
      ...options,
    });
  }

  /**
   * Run architecture analysis
   */
  async architectureMap(target: string, options?: Partial<AnalysisRequest>): Promise<AnalysisResult> {
    return this.analyze({
      type: 'architecture',
      target,
      depth: 'comprehensive',
      focus: ['components', 'dependencies', 'layers'],
      ...options,
    });
  }

  /**
   * Run dependency analysis
   */
  async dependencyAnalysis(target: string, options?: Partial<AnalysisRequest>): Promise<AnalysisResult> {
    return this.analyze({
      type: 'dependencies',
      target,
      depth: 'deep',
      focus: ['outdated', 'vulnerabilities', 'licenses'],
      ...options,
    });
  }

  /**
   * Run coverage assessment
   */
  async coverageAssess(target: string, options?: Partial<AnalysisRequest>): Promise<AnalysisResult> {
    return this.analyze({
      type: 'coverage',
      target,
      depth: 'moderate',
      focus: ['untested', 'quality', 'edge-cases'],
      ...options,
    });
  }

  /**
   * Verify feature implementation
   */
  async verify(feature: string, target: string): Promise<{ implemented: boolean; confidence: number; details: string }> {
    const result = await this.analyze({
      type: 'codebase',
      target,
      query: `Verify if this feature is implemented: "${feature}". Return JSON with fields: implemented (boolean), confidence (0-100), details (string)`,
      outputFormat: 'json',
    });

    try {
      const verification = JSON.parse(result.rawOutput || '{}');
      return {
        implemented: verification.implemented ?? false,
        confidence: verification.confidence ?? 0,
        details: verification.details ?? result.summary,
      };
    } catch {
      return {
        implemented: false,
        confidence: 0,
        details: result.summary,
      };
    }
  }

  // ============================================
  // Private Methods
  // ============================================

  private generateRequestId(): string {
    return `gemini-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  private buildAnalysisArgs(request: AnalysisRequest): string[] {
    const args: string[] = [];

    // Target paths
    const targets = Array.isArray(request.target) ? request.target : [request.target];
    args.push(...targets.map(t => `@${t}`));

    // Analysis type prompt
    const typePrompts: Record<AnalysisType, string> = {
      codebase: 'Analyze this codebase comprehensively. Identify patterns, structure, and key components.',
      architecture: 'Map the architecture of this codebase. Identify components, layers, dependencies, and data flows.',
      security: 'Perform a security audit. Find vulnerabilities, insecure patterns, hardcoded secrets, and misconfigurations.',
      dependencies: 'Analyze dependencies. Find outdated packages, vulnerabilities, license issues, and unused dependencies.',
      coverage: 'Assess test coverage. Identify untested code paths, missing edge cases, and testing recommendations.',
    };

    let prompt = typePrompts[request.type];

    // Add custom query
    if (request.query) {
      prompt += `\n\nAdditional focus: ${request.query}`;
    }

    // Add focus areas
    if (request.focus && request.focus.length > 0) {
      prompt += `\n\nFocus on: ${request.focus.join(', ')}`;
    }

    // Add depth instruction
    if (request.depth) {
      const depthInstructions: Record<string, string> = {
        surface: 'Provide a quick overview without deep analysis.',
        moderate: 'Provide moderate detail with key findings.',
        deep: 'Provide detailed analysis with comprehensive findings.',
        comprehensive: 'Provide exhaustive analysis covering all aspects.',
      };
      prompt += `\n\n${depthInstructions[request.depth]}`;
    }

    // Request structured output
    prompt += '\n\nReturn structured output with: summary, findings (type, severity, location, message, suggestion), metrics, and recommendations.';

    args.push('-p', prompt);

    // Output format
    if (request.outputFormat === 'json') {
      args.push('--json');
    }

    return args;
  }

  private async executeCommand(binaryPath: string, args: string[]): Promise<string> {
    return new Promise((resolve, reject) => {
      const child = spawn(binaryPath, args, {
        timeout: this.config.analysis.timeout,
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        const chunk = data.toString();
        stdout += chunk;
        this.emit('output', { type: 'stdout', data: chunk });
      });

      child.stderr.on('data', (data) => {
        const chunk = data.toString();
        stderr += chunk;
        this.emit('output', { type: 'stderr', data: chunk });
      });

      child.on('close', (code) => {
        if (code === 0) {
          resolve(stdout);
        } else {
          reject(
            new GeminiExecutionError(
              `Command failed with code ${code}: ${stderr}`,
              'analyze',
              { exitCode: code, stderr }
            )
          );
        }
      });

      child.on('error', (error) => {
        reject(
          new GeminiExecutionError(
            `Failed to execute command: ${error.message}`,
            'analyze',
            { error: error.message }
          )
        );
      });
    });
  }

  private parseAnalysisOutput(
    output: string,
    request: AnalysisRequest,
    requestId: string,
    startTime: number
  ): AnalysisResult {
    const duration = Date.now() - startTime;

    // Try to parse as JSON first
    try {
      const parsed = JSON.parse(output);
      return {
        success: true,
        requestId,
        timestamp: new Date(),
        duration,
        tokenUsage: parsed.tokenUsage || { prompt: 0, completion: 0, total: 0 },
        summary: parsed.summary || 'Analysis complete',
        findings: this.normalizeFindings(parsed.findings || []),
        metrics: parsed.metrics || { filesAnalyzed: 0, linesOfCode: 0 },
        recommendations: parsed.recommendations || [],
        rawOutput: output,
      };
    } catch {
      // Parse as text
      return {
        success: true,
        requestId,
        timestamp: new Date(),
        duration,
        tokenUsage: { prompt: 0, completion: 0, total: 0 },
        summary: this.extractSummary(output),
        findings: this.extractFindings(output),
        metrics: { filesAnalyzed: 0, linesOfCode: 0 },
        recommendations: this.extractRecommendations(output),
        rawOutput: output,
      };
    }
  }

  private normalizeFindings(findings: any[]): Finding[] {
    return findings.map((f) => ({
      type: f.type || 'general',
      severity: this.normalizeSeverity(f.severity),
      location: f.location || f.file || 'unknown',
      message: f.message || f.description || '',
      suggestion: f.suggestion || f.recommendation,
      code: f.code,
      line: f.line,
      column: f.column,
    }));
  }

  private normalizeSeverity(severity: string): Finding['severity'] {
    const normalized = (severity || '').toLowerCase();
    if (['critical', 'high', 'medium', 'low', 'info'].includes(normalized)) {
      return normalized as Finding['severity'];
    }
    return 'info';
  }

  private extractSummary(output: string): string {
    const lines = output.split('\n');
    const summaryLines = lines.slice(0, 5).filter(l => l.trim());
    return summaryLines.join(' ').slice(0, 500);
  }

  private extractFindings(output: string): Finding[] {
    // Basic extraction from text output
    const findings: Finding[] = [];
    const patterns = [
      /(?:error|warning|issue|vulnerability|problem):\s*(.+)/gi,
      /(?:found|detected|identified):\s*(.+)/gi,
    ];

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(output)) !== null) {
        findings.push({
          type: 'general',
          severity: 'info',
          location: 'unknown',
          message: match[1].trim(),
        });
      }
    }

    return findings;
  }

  private extractRecommendations(output: string): Array<{ type: string; priority: 'high' | 'medium' | 'low'; description: string }> {
    const recommendations: Array<{ type: string; priority: 'high' | 'medium' | 'low'; description: string }> = [];
    const patterns = [
      /(?:recommend|suggest|should|consider):\s*(.+)/gi,
      /(?:recommendation|suggestion):\s*(.+)/gi,
    ];

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(output)) !== null) {
        recommendations.push({
          type: 'general',
          priority: 'medium',
          description: match[1].trim(),
        });
      }
    }

    return recommendations;
  }
}
```

### Step 2.4: Create Module Manager (Entry Point)

Create `src/modules/gemini-cli/index.ts`:

```typescript
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
  DEFAULT_CONFIG,
} from './types.js';
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
    });

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
```

---

## Phase 3: CLI Integration

### Step 3.1: Create CLI Command

Create `src/cli/commands/gemini.ts`:

```typescript
/**
 * Gemini CLI Command Handler
 * Provides CLI interface for the Gemini module
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { getGeminiModule } from '../../modules/gemini-cli/index.js';
import type { AnalysisType, AuthMethod } from '../../modules/gemini-cli/types.js';

export function createGeminiCommand(): Command {
  const gemini = new Command('gemini')
    .description('Manage Gemini CLI integration for large-scale codebase analysis')
    .action(() => {
      console.log(chalk.cyan('\nGemini CLI Module Commands:\n'));
      console.log('  enable      Enable and authenticate Gemini CLI');
      console.log('  disable     Disable Gemini CLI temporarily');
      console.log('  status      Show module status');
      console.log('  analyze     Run codebase analysis');
      console.log('  verify      Verify feature implementation');
      console.log('  cache       Manage analysis cache');
      console.log('  eject       Completely remove module');
      console.log('\nRun `claude-flow gemini <command> --help` for details\n');
    });

  // Enable command
  gemini
    .command('enable')
    .description('Enable and authenticate Gemini CLI')
    .option('--auth <method>', 'Authentication method: google-login, api-key, vertex-ai', 'google-login')
    .option('--api-key <key>', 'API key (for api-key auth)')
    .option('--vertex-project <project>', 'GCP project ID (for vertex-ai auth)')
    .option('--vertex-location <location>', 'GCP region (for vertex-ai auth)', 'us-central1')
    .option('--skip-install', 'Skip Gemini CLI installation check')
    .action(async (options) => {
      try {
        const module = getGeminiModule();
        await module.enable({
          authMethod: options.auth as AuthMethod,
          apiKey: options.apiKey,
          vertexProject: options.vertexProject,
          vertexLocation: options.vertexLocation,
          skipInstall: options.skipInstall,
        });
      } catch (error) {
        console.error(chalk.red(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`));
        process.exit(1);
      }
    });

  // Disable command
  gemini
    .command('disable')
    .description('Disable Gemini CLI temporarily')
    .action(async () => {
      try {
        const module = getGeminiModule();
        await module.disable();
      } catch (error) {
        console.error(chalk.red(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`));
        process.exit(1);
      }
    });

  // Status command
  gemini
    .command('status')
    .description('Show Gemini CLI module status')
    .action(async () => {
      try {
        const module = getGeminiModule();
        await module.initialize();
        const status = await module.getStatus();

        console.log(chalk.cyan('\nGemini CLI Module Status\n'));
        console.log(`  Installed:      ${status.installed ? chalk.green('Yes') : chalk.red('No')}`);
        console.log(`  Version:        ${status.version || 'N/A'}`);
        console.log(`  Enabled:        ${status.enabled ? chalk.green('Yes') : chalk.yellow('No')}`);
        console.log(`  Authenticated:  ${status.authenticated ? chalk.green('Yes') : chalk.red('No')}`);
        console.log(`  Auth Method:    ${status.authMethod || 'N/A'}`);

        if (status.quotaStatus) {
          console.log(chalk.cyan('\nQuota Status\n'));
          const rpm = status.quotaStatus.requestsPerMinute;
          const rpd = status.quotaStatus.requestsPerDay;
          console.log(`  Requests/min:   ${rpm.used}/${rpm.limit} (resets ${rpm.resetAt.toLocaleTimeString()})`);
          console.log(`  Requests/day:   ${rpd.used}/${rpd.limit} (resets ${rpd.resetAt.toLocaleDateString()})`);
        }

        console.log();
      } catch (error) {
        console.error(chalk.red(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`));
        process.exit(1);
      }
    });

  // Analyze command
  gemini
    .command('analyze')
    .description('Run codebase analysis')
    .option('-t, --type <type>', 'Analysis type: codebase, architecture, security, dependencies, coverage', 'codebase')
    .option('-p, --path <paths...>', 'Paths to analyze', ['.'])
    .option('-q, --query <query>', 'Custom analysis query')
    .option('-o, --output <format>', 'Output format: json, markdown, text', 'markdown')
    .option('-d, --depth <depth>', 'Analysis depth: surface, moderate, deep, comprehensive', 'moderate')
    .option('--store-memory', 'Store results in Claude Flow memory')
    .action(async (options) => {
      try {
        const module = getGeminiModule();

        if (!module.isEnabled()) {
          console.error(chalk.red('Error: Gemini module not enabled. Run `claude-flow gemini enable` first.'));
          process.exit(1);
        }

        console.log(chalk.cyan(`\n🔍 Running ${options.type} analysis...\n`));

        const result = await module.analyze({
          type: options.type as AnalysisType,
          target: options.path,
          query: options.query,
          outputFormat: options.output,
          depth: options.depth,
          storeInMemory: options.storeMemory,
        });

        if (result.success) {
          console.log(chalk.green('✅ Analysis complete\n'));
          console.log(chalk.cyan('Summary:'));
          console.log(result.summary);

          if (result.findings.length > 0) {
            console.log(chalk.cyan('\nFindings:'));
            for (const finding of result.findings.slice(0, 10)) {
              const color = finding.severity === 'critical' || finding.severity === 'high'
                ? chalk.red
                : finding.severity === 'medium'
                ? chalk.yellow
                : chalk.gray;
              console.log(`  ${color(`[${finding.severity.toUpperCase()}]`)} ${finding.message}`);
              if (finding.location !== 'unknown') {
                console.log(`    ${chalk.gray(finding.location)}`);
              }
            }
            if (result.findings.length > 10) {
              console.log(chalk.gray(`  ... and ${result.findings.length - 10} more findings`));
            }
          }

          console.log(chalk.cyan('\nMetrics:'));
          console.log(`  Files analyzed: ${result.metrics.filesAnalyzed}`);
          console.log(`  Lines of code:  ${result.metrics.linesOfCode}`);
          console.log(`  Duration:       ${result.duration}ms`);
        } else {
          console.error(chalk.red('Analysis failed:'));
          result.errors?.forEach(err => console.error(`  - ${err}`));
        }
      } catch (error) {
        console.error(chalk.red(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`));
        process.exit(1);
      }
    });

  // Verify command
  gemini
    .command('verify')
    .description('Verify if a feature is implemented')
    .requiredOption('-f, --feature <description>', 'Feature to verify')
    .option('-p, --path <paths...>', 'Paths to check', ['.'])
    .action(async (options) => {
      try {
        const module = getGeminiModule();

        if (!module.isEnabled()) {
          console.error(chalk.red('Error: Gemini module not enabled. Run `claude-flow gemini enable` first.'));
          process.exit(1);
        }

        console.log(chalk.cyan(`\n🔍 Verifying: "${options.feature}"...\n`));

        const executor = module.getExecutor();
        if (!executor) {
          console.error(chalk.red('Error: Executor not available'));
          process.exit(1);
        }

        const result = await executor.verify(options.feature, options.path[0]);

        const statusColor = result.implemented ? chalk.green : chalk.red;
        console.log(`Status: ${statusColor(result.implemented ? 'IMPLEMENTED' : 'NOT FOUND')}`);
        console.log(`Confidence: ${result.confidence}%`);
        console.log(`Details: ${result.details}`);
      } catch (error) {
        console.error(chalk.red(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`));
        process.exit(1);
      }
    });

  // Cache command
  gemini
    .command('cache')
    .description('Manage analysis cache')
    .option('--clear', 'Clear all cached results')
    .option('--stats', 'Show cache statistics')
    .action(async (options) => {
      try {
        const module = getGeminiModule();
        await module.initialize();

        if (options.clear) {
          // Access cache through module internals (would need to expose this)
          console.log(chalk.yellow('Clearing cache...'));
          // await module.clearCache();
          console.log(chalk.green('Cache cleared'));
        } else if (options.stats) {
          console.log(chalk.cyan('\nCache Statistics\n'));
          // const stats = module.getCacheStats();
          // console.log(`  Entries: ${stats.entries}`);
          // console.log(`  Size:    ${stats.size} bytes`);
          console.log('  (Not yet implemented)');
        } else {
          console.log('Use --clear to clear cache or --stats to show statistics');
        }
      } catch (error) {
        console.error(chalk.red(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`));
        process.exit(1);
      }
    });

  // Eject command
  gemini
    .command('eject')
    .description('Completely remove Gemini CLI module')
    .option('--force', 'Skip confirmation')
    .option('--uninstall', 'Also uninstall Gemini CLI globally')
    .option('--keep-config', 'Keep configuration for future use')
    .action(async (options) => {
      try {
        if (!options.force) {
          console.log(chalk.yellow('\n⚠️  This will remove all Gemini CLI integration.'));
          console.log('Run with --force to confirm.\n');
          return;
        }

        const module = getGeminiModule();
        await module.eject({
          force: options.force,
          uninstall: options.uninstall,
          keepConfig: options.keepConfig,
        });
      } catch (error) {
        console.error(chalk.red(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`));
        process.exit(1);
      }
    });

  return gemini;
}
```

### Step 3.2: Register Command in CLI

Add to `src/cli/commands/index.ts`:

```typescript
// Add this import
import { createGeminiCommand } from './gemini.js';

// Add to command registration (find where other commands are added)
program.addCommand(createGeminiCommand());
```

---

## Phase 4: MCP Tools

### Step 4.1: Create MCP Tool Definitions

Create `src/mcp/providers/gemini-cli/tools.ts`:

```typescript
/**
 * Gemini CLI MCP Tool Definitions
 */

export const GEMINI_TOOLS = {
  codebase_analyze: {
    name: 'mcp__gemini-cli__codebase_analyze',
    description: 'Analyze codebase using Gemini CLI (1M+ token context). Best for large codebases, architecture review, and comprehensive analysis.',
    inputSchema: {
      type: 'object',
      properties: {
        target: {
          type: 'string',
          description: 'Path to analyze (file or directory)',
        },
        depth: {
          type: 'string',
          enum: ['surface', 'moderate', 'deep', 'comprehensive'],
          default: 'moderate',
          description: 'Analysis depth level',
        },
        focus: {
          type: 'array',
          items: { type: 'string' },
          description: 'Areas to focus on (e.g., ["patterns", "dependencies"])',
        },
        query: {
          type: 'string',
          description: 'Custom analysis query',
        },
      },
      required: ['target'],
    },
  },

  architecture_map: {
    name: 'mcp__gemini-cli__architecture_map',
    description: 'Map system architecture including components, layers, and data flows',
    inputSchema: {
      type: 'object',
      properties: {
        target: {
          type: 'string',
          description: 'Path to analyze',
        },
        diagramTypes: {
          type: 'array',
          items: {
            type: 'string',
            enum: ['component', 'dependency', 'layer', 'flow', 'sequence'],
          },
          default: ['component', 'dependency'],
          description: 'Types of diagrams to generate',
        },
        outputFormat: {
          type: 'string',
          enum: ['mermaid', 'text', 'json'],
          default: 'mermaid',
        },
      },
      required: ['target'],
    },
  },

  security_scan: {
    name: 'mcp__gemini-cli__security_scan',
    description: 'Perform security audit scanning for vulnerabilities, secrets, and misconfigurations',
    inputSchema: {
      type: 'object',
      properties: {
        target: {
          type: 'string',
          description: 'Path to scan',
        },
        scanTypes: {
          type: 'array',
          items: {
            type: 'string',
            enum: ['injection', 'xss', 'secrets', 'authentication', 'authorization', 'misconfig', 'cryptography'],
          },
          default: ['injection', 'xss', 'secrets'],
          description: 'Types of security issues to scan for',
        },
        severity: {
          type: 'string',
          enum: ['critical', 'high', 'medium', 'low'],
          default: 'medium',
          description: 'Minimum severity to report',
        },
        includeRemediation: {
          type: 'boolean',
          default: true,
          description: 'Include remediation suggestions',
        },
      },
      required: ['target'],
    },
  },

  dependency_analyze: {
    name: 'mcp__gemini-cli__dependency_analyze',
    description: 'Analyze project dependencies for vulnerabilities, outdated packages, and license issues',
    inputSchema: {
      type: 'object',
      properties: {
        target: {
          type: 'string',
          description: 'Path to project root',
        },
        checkVulnerabilities: {
          type: 'boolean',
          default: true,
        },
        checkOutdated: {
          type: 'boolean',
          default: true,
        },
        checkLicenses: {
          type: 'boolean',
          default: false,
        },
      },
      required: ['target'],
    },
  },

  coverage_assess: {
    name: 'mcp__gemini-cli__coverage_assess',
    description: 'Assess test coverage and identify untested code paths',
    inputSchema: {
      type: 'object',
      properties: {
        sourcePath: {
          type: 'string',
          description: 'Path to source code',
        },
        testPath: {
          type: 'string',
          description: 'Path to test files',
        },
        focusAreas: {
          type: 'array',
          items: { type: 'string' },
          description: 'Specific areas to focus coverage analysis on',
        },
      },
      required: ['sourcePath'],
    },
  },
};
```

### Step 4.2: Create MCP Provider

Create `src/mcp/providers/gemini-cli/index.ts`:

```typescript
/**
 * Gemini CLI MCP Provider
 * Exposes Gemini analysis tools through MCP
 */

import { getGeminiModule } from '../../../modules/gemini-cli/index.js';
import { GEMINI_TOOLS } from './tools.js';
import type { AnalysisType } from '../../../modules/gemini-cli/types.js';

export class GeminiCLIMCPProvider {
  readonly namespace = 'gemini-cli';
  readonly version = '1.0.0';

  /**
   * Check if provider is available
   */
  async isAvailable(): Promise<boolean> {
    const module = getGeminiModule();
    await module.initialize();
    return module.isEnabled();
  }

  /**
   * Get all tool definitions
   */
  getTools() {
    return Object.values(GEMINI_TOOLS);
  }

  /**
   * Execute a tool
   */
  async executeTool(toolName: string, params: Record<string, unknown>): Promise<unknown> {
    const module = getGeminiModule();

    if (!module.isEnabled()) {
      return {
        success: false,
        error: 'Gemini CLI module not enabled. Run `claude-flow gemini enable` first.',
      };
    }

    switch (toolName) {
      case 'mcp__gemini-cli__codebase_analyze':
        return this.executeCodebaseAnalyze(params);

      case 'mcp__gemini-cli__architecture_map':
        return this.executeArchitectureMap(params);

      case 'mcp__gemini-cli__security_scan':
        return this.executeSecurityScan(params);

      case 'mcp__gemini-cli__dependency_analyze':
        return this.executeDependencyAnalyze(params);

      case 'mcp__gemini-cli__coverage_assess':
        return this.executeCoverageAssess(params);

      default:
        return {
          success: false,
          error: `Unknown tool: ${toolName}`,
        };
    }
  }

  private async executeCodebaseAnalyze(params: Record<string, unknown>) {
    const module = getGeminiModule();
    return module.analyze({
      type: 'codebase',
      target: params.target as string,
      depth: (params.depth as string) || 'moderate',
      focus: params.focus as string[],
      query: params.query as string,
    });
  }

  private async executeArchitectureMap(params: Record<string, unknown>) {
    const module = getGeminiModule();
    const executor = module.getExecutor();
    if (!executor) {
      return { success: false, error: 'Executor not available' };
    }
    return executor.architectureMap(params.target as string, {
      query: `Generate ${(params.diagramTypes as string[])?.join(', ') || 'component, dependency'} diagrams in ${params.outputFormat || 'mermaid'} format`,
    });
  }

  private async executeSecurityScan(params: Record<string, unknown>) {
    const module = getGeminiModule();
    const executor = module.getExecutor();
    if (!executor) {
      return { success: false, error: 'Executor not available' };
    }
    return executor.securityScan(params.target as string, {
      focus: params.scanTypes as string[],
      query: params.includeRemediation ? 'Include remediation suggestions for each finding' : undefined,
    });
  }

  private async executeDependencyAnalyze(params: Record<string, unknown>) {
    const module = getGeminiModule();
    return module.analyze({
      type: 'dependencies',
      target: params.target as string,
      focus: [
        params.checkVulnerabilities && 'vulnerabilities',
        params.checkOutdated && 'outdated',
        params.checkLicenses && 'licenses',
      ].filter(Boolean) as string[],
    });
  }

  private async executeCoverageAssess(params: Record<string, unknown>) {
    const module = getGeminiModule();
    return module.analyze({
      type: 'coverage',
      target: [params.sourcePath as string, params.testPath as string].filter(Boolean),
      focus: params.focusAreas as string[],
    });
  }
}

// Export singleton
let provider: GeminiCLIMCPProvider | null = null;

export function getGeminiMCPProvider(): GeminiCLIMCPProvider {
  if (!provider) {
    provider = new GeminiCLIMCPProvider();
  }
  return provider;
}
```

---

## Phase 5: Testing

### Step 5.1: Create Test Files

Create `src/__tests__/modules/gemini-cli/installer.test.ts`:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GeminiInstaller } from '../../../modules/gemini-cli/installer.js';

describe('GeminiInstaller', () => {
  let installer: GeminiInstaller;

  beforeEach(() => {
    installer = new GeminiInstaller();
  });

  describe('isInstalled', () => {
    it('should return boolean', async () => {
      const result = await installer.isInstalled();
      expect(typeof result).toBe('boolean');
    });
  });

  describe('getVersion', () => {
    it('should return string or undefined', async () => {
      const version = await installer.getVersion();
      expect(version === undefined || typeof version === 'string').toBe(true);
    });
  });

  describe('getPlatformInfo', () => {
    it('should return platform information', () => {
      const info = installer.getPlatformInfo();
      expect(info).toHaveProperty('os');
      expect(info).toHaveProperty('arch');
      expect(info).toHaveProperty('shell');
      expect(info).toHaveProperty('homeDir');
    });
  });

  describe('getInstallInstructions', () => {
    it('should return installation instructions', () => {
      const instructions = installer.getInstallInstructions();
      expect(instructions).toContain('npm install');
      expect(instructions).toContain('gemini');
    });
  });
});
```

### Step 5.2: Run Tests

```bash
# Run Gemini module tests
npm test -- --testPathPattern="gemini-cli"

# Run with coverage
npm run test:coverage -- --testPathPattern="gemini-cli"
```

---

## Phase 6: Build & Verify

### Step 6.1: TypeScript Compilation

```bash
# Type check without emitting
npm run typecheck

# Build the project
npm run build
```

### Step 6.2: Verify Module Works

```bash
# Test the CLI command
npx claude-flow gemini status

# Enable (will prompt for auth)
npx claude-flow gemini enable --auth api-key --api-key YOUR_KEY

# Run an analysis
npx claude-flow gemini analyze --path ./src --type codebase

# Disable
npx claude-flow gemini disable
```

### Step 6.3: Integration Test

```bash
# Full integration test
npm run test:integration -- --testPathPattern="gemini"
```

---

## Troubleshooting

### Common Issues

#### TypeScript Errors

```bash
# Check for type errors
npm run typecheck

# Common fixes:
# - Ensure all imports use .js extension
# - Check that types.ts exports DEFAULT_CONFIG
```

#### Module Not Found

```bash
# Ensure the module is built
npm run build

# Check dist folder exists
ls -la dist/modules/gemini-cli/
```

#### CLI Command Not Registered

```bash
# Verify command is in index.ts
grep -r "gemini" src/cli/commands/index.ts

# Rebuild
npm run build
```

#### Authentication Issues

```bash
# Clear credentials and re-auth
rm -rf ~/.gemini/
npx claude-flow gemini enable
```

---

## Next Steps

After building the module:

1. **Write more tests** - Add integration and E2E tests
2. **Add MCP registration** - Register provider with MCP server
3. **Add memory integration** - Store results in Claude Flow memory
4. **Add hooks** - Integrate with Claude Flow hooks system
5. **Documentation** - Update main docs to reference the module

---

## File Checklist

| File | Status |
|------|--------|
| `src/modules/gemini-cli/errors.ts` | ⬜ Create |
| `src/modules/gemini-cli/types.ts` | ⬜ Create |
| `src/modules/gemini-cli/rate-limiter.ts` | ⬜ Create |
| `src/modules/gemini-cli/cache.ts` | ⬜ Create |
| `src/modules/gemini-cli/installer.ts` | ⬜ Create |
| `src/modules/gemini-cli/authenticator.ts` | ⬜ Create |
| `src/modules/gemini-cli/executor.ts` | ⬜ Create |
| `src/modules/gemini-cli/index.ts` | ⬜ Create |
| `src/cli/commands/gemini.ts` | ⬜ Create |
| `src/mcp/providers/gemini-cli/tools.ts` | ⬜ Create |
| `src/mcp/providers/gemini-cli/index.ts` | ⬜ Create |
| `src/__tests__/modules/gemini-cli/*.test.ts` | ⬜ Create |
| Update `src/cli/commands/index.ts` | ⬜ Modify |

---

*Build guide version: 1.0.0*
*Last updated: December 2024*
