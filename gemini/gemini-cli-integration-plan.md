# Gemini CLI Integration Module - Implementation Plan

**Version**: 1.0.0
**Status**: Proposed
**Author**: Claude Flow Team
**Date**: 2025-12-06

---

## Executive Summary

This document outlines the implementation plan for integrating Gemini CLI as an **optional, ejectable module** within Claude Flow. The integration follows the architectural pattern established in [codeflow](https://github.com/cassmtnr/codeflow): **"Claude Flow orchestrates, Claude Code edits, Gemini reads."**

### Key Principles

1. **Opt-in Only**: Users must explicitly enable Gemini CLI integration
2. **Fully Ejectable**: Module can be completely removed without affecting core functionality
3. **Zero Breaking Changes**: No modifications to existing Claude Flow behavior
4. **Specialized Use Case**: Focused on large codebase analysis (1M+ token context)

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Module Structure](#2-module-structure)
3. [Implementation Steps](#3-implementation-steps)
4. [CLI Commands](#4-cli-commands)
5. [Authentication Flow](#5-authentication-flow)
6. [Specialized Tools](#6-specialized-tools)
7. [Configuration Schema](#7-configuration-schema)
8. [MCP Tool Integration](#8-mcp-tool-integration)
9. [Ejection Process](#9-ejection-process)
10. [Testing Strategy](#10-testing-strategy)
11. [Migration & Rollback](#11-migration--rollback)

---

## 1. Architecture Overview

### 1.1 Integration Pattern

```
┌─────────────────────────────────────────────────────────────────┐
│                      Claude Flow (Orchestrator)                  │
│  ┌──────────────────┐  ┌──────────────────┐  ┌───────────────┐  │
│  │   Claude Code    │  │   Gemini CLI     │  │  Memory/DB    │  │
│  │   (Editor)       │  │   (Analyzer)     │  │  (Storage)    │  │
│  │                  │  │   [OPTIONAL]     │  │               │  │
│  │ • Code editing   │  │ • Codebase scan  │  │ • Results     │  │
│  │ • File ops       │  │ • Architecture   │  │ • Context     │  │
│  │ • Commands       │  │ • Security audit │  │ • Patterns    │  │
│  └──────────────────┘  └──────────────────┘  └───────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 Decision Matrix: When to Use Gemini vs Claude

| Scenario | Tool | Reason |
|----------|------|--------|
| Files > 100KB total | **Gemini CLI** | 1M+ token context window |
| Full codebase analysis | **Gemini CLI** | Can process entire repos |
| Architecture overview | **Gemini CLI** | Read-only, large context |
| Security pattern detection | **Gemini CLI** | Cross-file analysis |
| Code editing/writing | **Claude Code** | Superior editing capabilities |
| Multi-step operations | **Claude Code** | Tool chaining support |
| Interactive sessions | **Claude Code** | Conversation context |
| Small file operations | **Claude Code** | More efficient |

---

## 2. Module Structure

### 2.1 Directory Layout

```
src/
├── modules/
│   └── gemini-cli/                    # [NEW] Ejectable module
│       ├── index.ts                   # Module entry point
│       ├── types.ts                   # TypeScript interfaces
│       ├── installer.ts               # Auto-installation logic
│       ├── authenticator.ts           # Auth flow management
│       ├── executor.ts                # Command execution wrapper
│       ├── tools/                     # Specialized analysis tools
│       │   ├── codebase-analyzer.ts   # Full codebase analysis
│       │   ├── architecture-mapper.ts # Architecture visualization
│       │   ├── security-scanner.ts    # Security pattern detection
│       │   ├── dependency-analyzer.ts # Dependency graph analysis
│       │   └── test-coverage.ts       # Test coverage assessment
│       ├── parsers/                   # Output parsers
│       │   ├── json-parser.ts         # JSON response parsing
│       │   └── markdown-parser.ts     # Markdown output handling
│       └── config/
│           ├── defaults.ts            # Default configuration
│           └── schema.ts              # Validation schema
├── cli/
│   └── commands/
│       └── gemini.ts                  # [NEW] CLI command handler
└── mcp/
    └── tools/
        └── gemini/                    # [NEW] MCP tool definitions
            ├── analyze.ts             # Codebase analysis tool
            ├── search.ts              # Semantic search tool
            └── verify.ts              # Implementation verification
```

### 2.2 Module Isolation

The Gemini CLI module is completely isolated:

- **No imports from core**: Module doesn't depend on core Claude Flow internals
- **Interface-based communication**: Uses defined interfaces for data exchange
- **Lazy loading**: Module only loads when explicitly invoked
- **Separate configuration**: Own config namespace (`gemini.*`)

---

## 3. Implementation Steps

### Phase 1: Foundation (Week 1)

#### Step 1.1: Create Module Structure
```bash
# Create directory structure
mkdir -p src/modules/gemini-cli/{tools,parsers,config}
mkdir -p src/mcp/tools/gemini
```

#### Step 1.2: Define Core Types
```typescript
// src/modules/gemini-cli/types.ts

export interface GeminiCLIConfig {
  enabled: boolean;
  authMethod: 'google-login' | 'api-key' | 'vertex-ai';
  apiKey?: string;
  vertexProject?: string;
  vertexLocation?: string;
  defaultModel: 'gemini-2.5-pro' | 'gemini-2.5-flash';
  contextLimit: number;  // Default: 1000000 tokens
  requestsPerMinute: number;  // Default: 60
  requestsPerDay: number;  // Default: 1000
}

export interface GeminiAnalysisRequest {
  type: 'codebase' | 'architecture' | 'security' | 'dependencies' | 'coverage';
  paths: string[];  // Files/directories to analyze
  query?: string;   // Custom analysis prompt
  outputFormat: 'json' | 'markdown' | 'text';
  includePatterns?: string[];
  excludePatterns?: string[];
}

export interface GeminiAnalysisResult {
  success: boolean;
  requestId: string;
  timestamp: Date;
  tokenUsage: {
    prompt: number;
    completion: number;
    total: number;
  };
  result: any;
  errors?: string[];
}

export interface GeminiModuleStatus {
  installed: boolean;
  authenticated: boolean;
  version?: string;
  authMethod?: string;
  quotaRemaining?: {
    requestsPerMinute: number;
    requestsPerDay: number;
  };
}
```

#### Step 1.3: Create Module Entry Point
```typescript
// src/modules/gemini-cli/index.ts

import { GeminiCLIConfig, GeminiModuleStatus } from './types.js';
import { GeminiInstaller } from './installer.js';
import { GeminiAuthenticator } from './authenticator.js';
import { GeminiExecutor } from './executor.js';

export class GeminiCLIModule {
  private static instance: GeminiCLIModule | null = null;
  private config: GeminiCLIConfig | null = null;
  private installer: GeminiInstaller;
  private authenticator: GeminiAuthenticator;
  private executor: GeminiExecutor | null = null;

  private constructor() {
    this.installer = new GeminiInstaller();
    this.authenticator = new GeminiAuthenticator();
  }

  static getInstance(): GeminiCLIModule {
    if (!GeminiCLIModule.instance) {
      GeminiCLIModule.instance = new GeminiCLIModule();
    }
    return GeminiCLIModule.instance;
  }

  async enable(config: Partial<GeminiCLIConfig>): Promise<void> {
    // Install Gemini CLI if not present
    await this.installer.ensureInstalled();

    // Authenticate based on method
    await this.authenticator.authenticate(config.authMethod || 'google-login', config);

    // Initialize executor
    this.executor = new GeminiExecutor(this.config!);
    this.config = { ...this.getDefaults(), ...config, enabled: true };
  }

  async disable(): Promise<void> {
    this.config = null;
    this.executor = null;
  }

  async getStatus(): Promise<GeminiModuleStatus> {
    return {
      installed: await this.installer.isInstalled(),
      authenticated: await this.authenticator.isAuthenticated(),
      version: await this.installer.getVersion(),
      authMethod: this.config?.authMethod,
      quotaRemaining: await this.getQuotaStatus(),
    };
  }

  isEnabled(): boolean {
    return this.config?.enabled ?? false;
  }

  getExecutor(): GeminiExecutor | null {
    return this.executor;
  }

  private getDefaults(): GeminiCLIConfig {
    return {
      enabled: false,
      authMethod: 'google-login',
      defaultModel: 'gemini-2.5-pro',
      contextLimit: 1000000,
      requestsPerMinute: 60,
      requestsPerDay: 1000,
    };
  }

  private async getQuotaStatus() {
    // Implementation to check current quota
    return { requestsPerMinute: 60, requestsPerDay: 1000 };
  }
}

export { GeminiCLIConfig, GeminiModuleStatus } from './types.js';
```

### Phase 2: Installer & Authentication (Week 1-2)

#### Step 2.1: Create Installer
```typescript
// src/modules/gemini-cli/installer.ts

import { spawn } from 'child_process';
import { promisify } from 'util';
import { exec as execCallback } from 'child_process';

const exec = promisify(execCallback);

export class GeminiInstaller {
  private static readonly PACKAGE_NAME = '@google/gemini-cli';
  private static readonly MIN_VERSION = '1.0.0';

  async isInstalled(): Promise<boolean> {
    try {
      const { stdout } = await exec('which gemini || where gemini');
      return stdout.trim().length > 0;
    } catch {
      return false;
    }
  }

  async getVersion(): Promise<string | undefined> {
    try {
      const { stdout } = await exec('gemini --version');
      return stdout.trim();
    } catch {
      return undefined;
    }
  }

  async ensureInstalled(): Promise<void> {
    if (await this.isInstalled()) {
      console.log('✅ Gemini CLI is already installed');
      return;
    }

    console.log('📦 Installing Gemini CLI...');

    try {
      await exec(`npm install -g ${GeminiInstaller.PACKAGE_NAME}`);
      console.log('✅ Gemini CLI installed successfully');
    } catch (error) {
      throw new Error(
        `Failed to install Gemini CLI: ${(error as Error).message}\n` +
        `Please install manually: npm install -g ${GeminiInstaller.PACKAGE_NAME}`
      );
    }
  }

  async uninstall(): Promise<void> {
    try {
      await exec(`npm uninstall -g ${GeminiInstaller.PACKAGE_NAME}`);
      console.log('✅ Gemini CLI uninstalled successfully');
    } catch (error) {
      throw new Error(`Failed to uninstall Gemini CLI: ${(error as Error).message}`);
    }
  }
}
```

#### Step 2.2: Create Authenticator
```typescript
// src/modules/gemini-cli/authenticator.ts

import { spawn } from 'child_process';
import { GeminiCLIConfig } from './types.js';

export class GeminiAuthenticator {
  private authToken: string | null = null;

  async authenticate(
    method: 'google-login' | 'api-key' | 'vertex-ai',
    config: Partial<GeminiCLIConfig>
  ): Promise<void> {
    switch (method) {
      case 'google-login':
        await this.authenticateWithGoogle();
        break;
      case 'api-key':
        await this.authenticateWithApiKey(config.apiKey!);
        break;
      case 'vertex-ai':
        await this.authenticateWithVertexAI(config);
        break;
    }
  }

  async isAuthenticated(): Promise<boolean> {
    try {
      // Check if we can make a simple API call
      const result = await this.executeCommand(['--version']);
      return result.success;
    } catch {
      return false;
    }
  }

  private async authenticateWithGoogle(): Promise<void> {
    console.log('🔐 Opening browser for Google authentication...');
    console.log('   Please complete the login in your browser.');

    return new Promise((resolve, reject) => {
      const process = spawn('gemini', ['auth', 'login'], {
        stdio: 'inherit',
        shell: true,
      });

      process.on('close', (code) => {
        if (code === 0) {
          console.log('✅ Successfully authenticated with Google');
          resolve();
        } else {
          reject(new Error('Google authentication failed'));
        }
      });

      process.on('error', (error) => {
        reject(new Error(`Authentication error: ${error.message}`));
      });
    });
  }

  private async authenticateWithApiKey(apiKey: string): Promise<void> {
    if (!apiKey) {
      throw new Error('API key is required for api-key authentication');
    }

    // Set environment variable for session
    process.env.GEMINI_API_KEY = apiKey;

    // Verify the key works
    const result = await this.executeCommand(['-p', '"test"']);
    if (!result.success) {
      throw new Error('API key validation failed. Please check your key.');
    }

    console.log('✅ Successfully authenticated with API key');
  }

  private async authenticateWithVertexAI(config: Partial<GeminiCLIConfig>): Promise<void> {
    if (!config.vertexProject) {
      throw new Error('Vertex AI project ID is required');
    }

    // Set environment variables
    process.env.GOOGLE_CLOUD_PROJECT = config.vertexProject;
    if (config.vertexLocation) {
      process.env.GOOGLE_CLOUD_LOCATION = config.vertexLocation;
    }

    console.log('✅ Configured for Vertex AI authentication');
    console.log('   Ensure GOOGLE_APPLICATION_CREDENTIALS is set');
  }

  private async executeCommand(args: string[]): Promise<{ success: boolean; output: string }> {
    return new Promise((resolve) => {
      let output = '';
      const process = spawn('gemini', args, { shell: true });

      process.stdout?.on('data', (data) => {
        output += data.toString();
      });

      process.stderr?.on('data', (data) => {
        output += data.toString();
      });

      process.on('close', (code) => {
        resolve({ success: code === 0, output });
      });

      process.on('error', () => {
        resolve({ success: false, output: 'Command execution failed' });
      });
    });
  }

  async logout(): Promise<void> {
    delete process.env.GEMINI_API_KEY;
    delete process.env.GOOGLE_CLOUD_PROJECT;
    this.authToken = null;

    try {
      await this.executeCommand(['auth', 'logout']);
    } catch {
      // Ignore logout errors
    }

    console.log('✅ Logged out from Gemini CLI');
  }
}
```

### Phase 3: CLI Commands (Week 2)

#### Step 3.1: Create Gemini CLI Command
```typescript
// src/cli/commands/gemini.ts

import { Command } from '../commander-fix.js';
import chalk from 'chalk';
import { GeminiCLIModule } from '../../modules/gemini-cli/index.js';

const geminiModule = GeminiCLIModule.getInstance();

export const geminiCommand = new Command('gemini')
  .description('Gemini CLI integration module (opt-in)')
  .action(() => {
    console.log(chalk.cyan('Gemini CLI Module - Optional Integration\n'));
    console.log('Available subcommands:');
    console.log('  enable    - Enable and authenticate Gemini CLI');
    console.log('  disable   - Disable Gemini CLI integration');
    console.log('  status    - Check module status');
    console.log('  analyze   - Run codebase analysis');
    console.log('  eject     - Completely remove the module');
    console.log('\nUse "claude-flow gemini <command> --help" for more info');
  });

// Enable subcommand
geminiCommand
  .command('enable')
  .description('Enable Gemini CLI integration')
  .option('--auth <method>', 'Authentication method: google-login, api-key, vertex-ai', 'google-login')
  .option('--api-key <key>', 'API key (for api-key auth method)')
  .option('--vertex-project <project>', 'Google Cloud project (for vertex-ai)')
  .option('--vertex-location <location>', 'Google Cloud location (for vertex-ai)', 'us-central1')
  .action(async (options) => {
    try {
      console.log(chalk.cyan('🚀 Enabling Gemini CLI integration...\n'));

      await geminiModule.enable({
        authMethod: options.auth,
        apiKey: options.apiKey,
        vertexProject: options.vertexProject,
        vertexLocation: options.vertexLocation,
      });

      console.log(chalk.green('\n✅ Gemini CLI integration enabled successfully!'));
      console.log(chalk.gray('   Use "claude-flow gemini analyze" to analyze your codebase'));
    } catch (error) {
      console.error(chalk.red(`\n❌ Failed to enable Gemini CLI: ${(error as Error).message}`));
      process.exit(1);
    }
  });

// Disable subcommand
geminiCommand
  .command('disable')
  .description('Disable Gemini CLI integration (keeps installed)')
  .action(async () => {
    try {
      await geminiModule.disable();
      console.log(chalk.yellow('⚠️  Gemini CLI integration disabled'));
      console.log(chalk.gray('   Use "claude-flow gemini enable" to re-enable'));
    } catch (error) {
      console.error(chalk.red(`Failed to disable: ${(error as Error).message}`));
      process.exit(1);
    }
  });

// Status subcommand
geminiCommand
  .command('status')
  .description('Check Gemini CLI module status')
  .action(async () => {
    try {
      const status = await geminiModule.getStatus();

      console.log(chalk.cyan('Gemini CLI Module Status\n'));
      console.log(`  Installed:      ${status.installed ? chalk.green('Yes') : chalk.red('No')}`);
      console.log(`  Version:        ${status.version || chalk.gray('N/A')}`);
      console.log(`  Authenticated:  ${status.authenticated ? chalk.green('Yes') : chalk.yellow('No')}`);
      console.log(`  Auth Method:    ${status.authMethod || chalk.gray('N/A')}`);
      console.log(`  Enabled:        ${geminiModule.isEnabled() ? chalk.green('Yes') : chalk.yellow('No')}`);

      if (status.quotaRemaining) {
        console.log(chalk.cyan('\nQuota Status:'));
        console.log(`  Requests/min:   ${status.quotaRemaining.requestsPerMinute}`);
        console.log(`  Requests/day:   ${status.quotaRemaining.requestsPerDay}`);
      }
    } catch (error) {
      console.error(chalk.red(`Failed to get status: ${(error as Error).message}`));
      process.exit(1);
    }
  });

// Analyze subcommand
geminiCommand
  .command('analyze')
  .description('Analyze codebase using Gemini CLI')
  .option('-t, --type <type>', 'Analysis type: codebase, architecture, security, dependencies, coverage', 'codebase')
  .option('-p, --path <paths...>', 'Paths to analyze (supports @syntax)', ['.'])
  .option('-q, --query <query>', 'Custom analysis prompt')
  .option('-o, --output <format>', 'Output format: json, markdown, text', 'markdown')
  .option('--include <patterns...>', 'Include file patterns')
  .option('--exclude <patterns...>', 'Exclude file patterns')
  .action(async (options) => {
    if (!geminiModule.isEnabled()) {
      console.error(chalk.yellow('⚠️  Gemini CLI is not enabled.'));
      console.log(chalk.gray('   Run "claude-flow gemini enable" first'));
      process.exit(1);
    }

    try {
      const executor = geminiModule.getExecutor();
      if (!executor) {
        throw new Error('Gemini executor not initialized');
      }

      console.log(chalk.cyan(`🔍 Running ${options.type} analysis...\n`));

      const result = await executor.analyze({
        type: options.type,
        paths: options.path,
        query: options.query,
        outputFormat: options.output,
        includePatterns: options.include,
        excludePatterns: options.exclude,
      });

      if (result.success) {
        console.log(chalk.green('✅ Analysis complete\n'));
        console.log(result.result);
        console.log(chalk.gray(`\nTokens used: ${result.tokenUsage.total}`));
      } else {
        console.error(chalk.red('❌ Analysis failed:'));
        console.error(result.errors?.join('\n'));
        process.exit(1);
      }
    } catch (error) {
      console.error(chalk.red(`Analysis error: ${(error as Error).message}`));
      process.exit(1);
    }
  });

// Eject subcommand
geminiCommand
  .command('eject')
  .description('Completely remove Gemini CLI module')
  .option('--force', 'Skip confirmation prompt')
  .option('--uninstall', 'Also uninstall Gemini CLI globally')
  .action(async (options) => {
    if (!options.force) {
      console.log(chalk.yellow('⚠️  This will completely remove the Gemini CLI integration.'));
      console.log(chalk.gray('   Use --force to skip this confirmation.'));
      // In real implementation, add interactive confirmation
      return;
    }

    try {
      console.log(chalk.cyan('🗑️  Ejecting Gemini CLI module...\n'));

      // Disable the module
      await geminiModule.disable();

      // Remove configuration
      // (Implementation: clear config.gemini.* entries)

      if (options.uninstall) {
        console.log(chalk.gray('   Uninstalling Gemini CLI...'));
        // (Implementation: run uninstaller)
      }

      console.log(chalk.green('\n✅ Gemini CLI module ejected successfully'));
      console.log(chalk.gray('   The module can be re-enabled anytime with "claude-flow gemini enable"'));
    } catch (error) {
      console.error(chalk.red(`Eject failed: ${(error as Error).message}`));
      process.exit(1);
    }
  });

export default geminiCommand;
```

### Phase 4: Executor & Tools (Week 2-3)

#### Step 4.1: Create Executor
```typescript
// src/modules/gemini-cli/executor.ts

import { spawn } from 'child_process';
import { GeminiCLIConfig, GeminiAnalysisRequest, GeminiAnalysisResult } from './types.js';

export class GeminiExecutor {
  private config: GeminiCLIConfig;

  constructor(config: GeminiCLIConfig) {
    this.config = config;
  }

  async analyze(request: GeminiAnalysisRequest): Promise<GeminiAnalysisResult> {
    const prompt = this.buildPrompt(request);
    const pathRefs = this.buildPathReferences(request.paths);

    const command = `gemini -p "${pathRefs} ${prompt}"`;
    const startTime = Date.now();

    try {
      const output = await this.execute(command);

      return {
        success: true,
        requestId: `gemini-${Date.now()}`,
        timestamp: new Date(),
        tokenUsage: this.estimateTokens(request, output),
        result: this.parseOutput(output, request.outputFormat),
      };
    } catch (error) {
      return {
        success: false,
        requestId: `gemini-${Date.now()}`,
        timestamp: new Date(),
        tokenUsage: { prompt: 0, completion: 0, total: 0 },
        result: null,
        errors: [(error as Error).message],
      };
    }
  }

  async search(query: string, paths: string[]): Promise<GeminiAnalysisResult> {
    return this.analyze({
      type: 'codebase',
      paths,
      query: `Search for: ${query}. Return all relevant code locations and explanations.`,
      outputFormat: 'json',
    });
  }

  async verify(feature: string, paths: string[]): Promise<GeminiAnalysisResult> {
    return this.analyze({
      type: 'codebase',
      paths,
      query: `Is the following feature implemented? "${feature}". Provide evidence and locations.`,
      outputFormat: 'json',
    });
  }

  private buildPrompt(request: GeminiAnalysisRequest): string {
    const prompts: Record<string, string> = {
      codebase: 'Analyze this codebase and provide a comprehensive summary including architecture, patterns, and key components.',
      architecture: 'Generate a detailed architecture overview including component relationships, data flow, and design patterns.',
      security: 'Perform a security audit. Identify potential vulnerabilities, insecure patterns, and recommendations.',
      dependencies: 'Analyze the dependency graph. Identify outdated packages, security issues, and optimization opportunities.',
      coverage: 'Assess the test coverage. Identify untested code paths, missing edge cases, and test quality.',
    };

    const basePrompt = prompts[request.type] || prompts.codebase;
    const customQuery = request.query ? `\n\nAdditional focus: ${request.query}` : '';
    const formatInstruction = request.outputFormat === 'json'
      ? '\n\nProvide the response as valid JSON.'
      : '';

    return `${basePrompt}${customQuery}${formatInstruction}`;
  }

  private buildPathReferences(paths: string[]): string {
    return paths.map(p => {
      // Convert to Gemini @ syntax
      if (p.startsWith('@')) return p;
      if (p.startsWith('./') || p.startsWith('/')) return `@${p}`;
      return `@./${p}`;
    }).join(' ');
  }

  private async execute(command: string): Promise<string> {
    return new Promise((resolve, reject) => {
      let stdout = '';
      let stderr = '';

      const proc = spawn('sh', ['-c', command], {
        env: { ...process.env },
        shell: true,
      });

      proc.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      proc.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      proc.on('close', (code) => {
        if (code === 0) {
          resolve(stdout);
        } else {
          reject(new Error(stderr || `Process exited with code ${code}`));
        }
      });

      proc.on('error', (error) => {
        reject(error);
      });
    });
  }

  private parseOutput(output: string, format: string): any {
    switch (format) {
      case 'json':
        try {
          return JSON.parse(output);
        } catch {
          return { raw: output, parseError: 'Failed to parse as JSON' };
        }
      case 'markdown':
      case 'text':
      default:
        return output;
    }
  }

  private estimateTokens(request: GeminiAnalysisRequest, output: string): {
    prompt: number;
    completion: number;
    total: number;
  } {
    // Rough estimation: ~4 chars per token
    const promptTokens = Math.ceil(JSON.stringify(request).length / 4);
    const completionTokens = Math.ceil(output.length / 4);

    return {
      prompt: promptTokens,
      completion: completionTokens,
      total: promptTokens + completionTokens,
    };
  }
}
```

### Phase 5: MCP Tools Integration (Week 3)

#### Step 5.1: Create MCP Tools
```typescript
// src/mcp/tools/gemini/analyze.ts

import { GeminiCLIModule } from '../../../modules/gemini-cli/index.js';
import type { ILogger } from '../../../core/logger.js';

export interface GeminiAnalyzeInput {
  type: 'codebase' | 'architecture' | 'security' | 'dependencies' | 'coverage';
  paths: string[];
  query?: string;
  outputFormat?: 'json' | 'markdown' | 'text';
}

export function createGeminiAnalyzeTool(logger: ILogger) {
  return {
    name: 'gemini/analyze',
    description: 'Analyze codebase using Gemini CLI (1M+ token context). ' +
                 'Use for large-scale analysis exceeding 100KB of files. ' +
                 'Requires opt-in: "claude-flow gemini enable"',
    inputSchema: {
      type: 'object' as const,
      properties: {
        type: {
          type: 'string',
          enum: ['codebase', 'architecture', 'security', 'dependencies', 'coverage'],
          description: 'Type of analysis to perform',
        },
        paths: {
          type: 'array',
          items: { type: 'string' },
          description: 'Paths to analyze (files or directories)',
        },
        query: {
          type: 'string',
          description: 'Optional custom analysis prompt',
        },
        outputFormat: {
          type: 'string',
          enum: ['json', 'markdown', 'text'],
          default: 'markdown',
          description: 'Output format',
        },
      },
      required: ['type', 'paths'],
    },
    handler: async (input: GeminiAnalyzeInput) => {
      const gemini = GeminiCLIModule.getInstance();

      if (!gemini.isEnabled()) {
        return {
          success: false,
          error: 'Gemini CLI is not enabled. Run "claude-flow gemini enable" first.',
          enableCommand: 'npx claude-flow gemini enable',
        };
      }

      const executor = gemini.getExecutor();
      if (!executor) {
        return {
          success: false,
          error: 'Gemini executor not initialized',
        };
      }

      logger.info('Starting Gemini analysis', { type: input.type, paths: input.paths });

      const result = await executor.analyze({
        type: input.type,
        paths: input.paths,
        query: input.query,
        outputFormat: input.outputFormat || 'markdown',
      });

      logger.info('Gemini analysis complete', {
        success: result.success,
        tokens: result.tokenUsage.total
      });

      return result;
    },
  };
}

export const toolMetadata = {
  name: 'gemini/analyze',
  description: 'Analyze codebase using Gemini CLI with 1M+ token context',
  category: 'gemini',
  detailLevel: 'standard',
  tags: ['analysis', 'codebase', 'gemini', 'optional'],
  requiresOptIn: true,
};
```

---

## 4. CLI Commands

### 4.1 Command Summary

| Command | Description | Options |
|---------|-------------|---------|
| `gemini enable` | Enable and authenticate | `--auth`, `--api-key`, `--vertex-*` |
| `gemini disable` | Disable (keeps installed) | - |
| `gemini status` | Check module status | - |
| `gemini analyze` | Run analysis | `-t`, `-p`, `-q`, `-o` |
| `gemini eject` | Complete removal | `--force`, `--uninstall` |

### 4.2 Usage Examples

```bash
# Enable with Google login (recommended)
npx claude-flow gemini enable

# Enable with API key
npx claude-flow gemini enable --auth api-key --api-key "YOUR_KEY"

# Enable with Vertex AI (enterprise)
npx claude-flow gemini enable --auth vertex-ai --vertex-project my-project

# Check status
npx claude-flow gemini status

# Analyze entire codebase
npx claude-flow gemini analyze --path ./src

# Security audit
npx claude-flow gemini analyze --type security --path ./src --output json

# Custom analysis
npx claude-flow gemini analyze --query "Find all API endpoints and their authentication"

# Disable temporarily
npx claude-flow gemini disable

# Complete removal
npx claude-flow gemini eject --force --uninstall
```

---

## 5. Authentication Flow

### 5.1 Authentication Methods

#### Method 1: Google Login (Recommended)
```
┌─────────────────────────────────────────────────────────────────┐
│  1. User runs: claude-flow gemini enable                        │
│  2. System checks if Gemini CLI is installed                    │
│  3. Browser opens for Google OAuth                              │
│  4. User completes login                                        │
│  5. Credentials cached locally (~/.gemini/)                     │
│  6. Module enabled in config                                    │
└─────────────────────────────────────────────────────────────────┘

Benefits:
- Free tier: 60 req/min, 1000 req/day
- Access to Gemini 2.5 Pro (1M context)
- No API key management
```

#### Method 2: API Key
```
┌─────────────────────────────────────────────────────────────────┐
│  1. User obtains key from Google AI Studio                      │
│  2. Runs: claude-flow gemini enable --auth api-key --api-key X  │
│  3. Key validated with test request                             │
│  4. Key stored securely in config (encrypted)                   │
│  5. Set as GEMINI_API_KEY for sessions                          │
└─────────────────────────────────────────────────────────────────┘

Benefits:
- Non-interactive authentication
- Good for CI/CD environments
- Scriptable
```

#### Method 3: Vertex AI (Enterprise)
```
┌─────────────────────────────────────────────────────────────────┐
│  1. Create service account in Google Cloud                      │
│  2. Download JSON key file                                      │
│  3. Set GOOGLE_APPLICATION_CREDENTIALS                          │
│  4. Run: claude-flow gemini enable --auth vertex-ai --vertex-*  │
│  5. Enterprise quotas and security                              │
└─────────────────────────────────────────────────────────────────┘

Benefits:
- Enterprise-grade security
- Custom quotas
- Audit logging
- VPC integration
```

---

## 6. Specialized Tools

### 6.1 Tool Catalog

| Tool | Description | Use Case |
|------|-------------|----------|
| `gemini/analyze` | Full codebase analysis | Architecture understanding |
| `gemini/search` | Semantic code search | Finding implementations |
| `gemini/verify` | Feature verification | Checking if feature exists |
| `gemini/security` | Security scan | Vulnerability detection |
| `gemini/architecture` | Architecture mapping | System documentation |
| `gemini/dependencies` | Dependency analysis | Upgrade planning |

### 6.2 Integration with Claude Code Workflow

```typescript
// Example: Agent workflow using both Claude Code and Gemini CLI

async function analyzeAndImplement(feature: string) {
  // Step 1: Use Gemini for large-scale analysis
  const analysis = await geminiModule.getExecutor()?.analyze({
    type: 'architecture',
    paths: ['./src'],
    query: `Where should we implement: ${feature}`,
    outputFormat: 'json',
  });

  // Step 2: Store findings in memory
  await memoryManager.store('analysis/current', analysis.result);

  // Step 3: Claude Code implements based on findings
  // (Claude Code reads the memory and implements the feature)

  // Step 4: Gemini verifies the implementation
  const verification = await geminiModule.getExecutor()?.verify(
    feature,
    ['./src']
  );

  return { analysis, verification };
}
```

---

## 7. Configuration Schema

### 7.1 Config Location

Configuration is stored in the Claude Flow config under the `gemini` namespace:

```json
// .claude-flow/config.json
{
  "gemini": {
    "enabled": true,
    "authMethod": "google-login",
    "defaultModel": "gemini-2.5-pro",
    "contextLimit": 1000000,
    "requestsPerMinute": 60,
    "requestsPerDay": 1000,
    "autoAnalyze": {
      "enabled": false,
      "triggerSize": 102400,
      "types": ["architecture", "security"]
    },
    "cache": {
      "enabled": true,
      "ttl": 3600000
    }
  }
}
```

### 7.2 Environment Variables

```bash
# Authentication
GEMINI_API_KEY=your-api-key
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
GOOGLE_CLOUD_PROJECT=your-project-id
GOOGLE_CLOUD_LOCATION=us-central1

# Module settings
CLAUDE_FLOW_GEMINI_ENABLED=true
CLAUDE_FLOW_GEMINI_MODEL=gemini-2.5-pro
```

---

## 8. MCP Tool Integration

### 8.1 Tool Registration

The Gemini tools are registered in the MCP progressive disclosure system:

```typescript
// src/mcp/tools/gemini/index.ts

export { createGeminiAnalyzeTool, toolMetadata as analyzeMetadata } from './analyze.js';
export { createGeminiSearchTool, toolMetadata as searchMetadata } from './search.js';
export { createGeminiVerifyTool, toolMetadata as verifyMetadata } from './verify.js';
```

### 8.2 Tool Discovery

Tools are only loaded when Gemini module is enabled:

```typescript
// In tool loader
if (geminiModule.isEnabled()) {
  const geminiTools = await loadToolsFromDirectory('gemini');
  registry.registerTools(geminiTools);
} else {
  // Register placeholder that explains how to enable
  registry.registerPlaceholder('gemini/*', {
    message: 'Gemini CLI tools require opt-in',
    enableCommand: 'npx claude-flow gemini enable',
  });
}
```

---

## 9. Ejection Process

### 9.1 Soft Disable

Keeps everything installed, just disables functionality:

```bash
npx claude-flow gemini disable
```

Effects:
- Module marked as disabled in config
- MCP tools return "not enabled" error
- CLI commands still available

### 9.2 Full Ejection

Complete removal of the module:

```bash
npx claude-flow gemini eject --force --uninstall
```

Effects:
1. Disable module
2. Clear configuration (`config.gemini.*`)
3. Clear cached credentials
4. Optionally uninstall Gemini CLI globally
5. Remove analysis cache

### 9.3 No Core Impact

The ejection process:
- **Does NOT** modify core Claude Flow files
- **Does NOT** affect other modules
- **Does NOT** require restart
- **Does NOT** lose other settings

---

## 10. Testing Strategy

### 10.1 Unit Tests

```typescript
// tests/modules/gemini-cli/installer.test.ts
describe('GeminiInstaller', () => {
  it('should detect installed Gemini CLI', async () => {});
  it('should install Gemini CLI when missing', async () => {});
  it('should get version', async () => {});
});

// tests/modules/gemini-cli/authenticator.test.ts
describe('GeminiAuthenticator', () => {
  it('should authenticate with API key', async () => {});
  it('should detect authentication status', async () => {});
  it('should logout properly', async () => {});
});

// tests/modules/gemini-cli/executor.test.ts
describe('GeminiExecutor', () => {
  it('should build proper path references', () => {});
  it('should parse JSON output', () => {});
  it('should handle errors gracefully', async () => {});
});
```

### 10.2 Integration Tests

```typescript
// tests/integration/gemini-module.test.ts
describe('Gemini Module Integration', () => {
  it('should enable/disable without affecting core', async () => {});
  it('should perform codebase analysis', async () => {});
  it('should eject cleanly', async () => {});
});
```

### 10.3 E2E Tests

```typescript
// tests/e2e/gemini-workflow.test.ts
describe('Gemini CLI Workflow', () => {
  it('should complete full analysis workflow', async () => {});
  it('should integrate with swarm agents', async () => {});
});
```

---

## 11. Migration & Rollback

### 11.1 No Migration Required

Since this is a new opt-in module:
- Existing installations are unaffected
- No data migration needed
- No configuration changes to existing setups

### 11.2 Rollback Process

If issues occur:

```bash
# Immediate rollback
npx claude-flow gemini disable

# Full removal
npx claude-flow gemini eject --force

# Verify core functionality
npx claude-flow status
```

### 11.3 Version Compatibility

| Claude Flow Version | Gemini Module | Status |
|---------------------|---------------|--------|
| < 2.8.0 | Not available | N/A |
| >= 2.8.0 | 1.0.0 | Supported |

---

## Summary

This implementation plan provides a comprehensive roadmap for integrating Gemini CLI as an optional, ejectable module in Claude Flow. The key benefits are:

1. **Zero Risk**: Opt-in only, no impact on existing functionality
2. **Powerful Analysis**: 1M+ token context for large codebases
3. **Clean Architecture**: Fully isolated module design
4. **Easy Management**: Simple enable/disable/eject commands
5. **MCP Integration**: Works with existing tool infrastructure

**Estimated Implementation Time**: 3 weeks

**Dependencies**:
- `@google/gemini-cli` (installed on enable)
- No new npm dependencies for core module

---

## Sources

- [Gemini CLI GitHub Repository](https://github.com/google-gemini/gemini-cli)
- [Gemini CLI Authentication Documentation](https://github.com/google-gemini/gemini-cli/blob/main/docs/get-started/authentication.md)
- [Gemini CLI Cheatsheet](https://www.philschmid.de/gemini-cli-cheatsheet)
- [CodeFlow Documentation](https://github.com/cassmtnr/codeflow/tree/master/docs)
- [Google Cloud Gemini CLI Docs](https://cloud.google.com/gemini/docs/codeassist/gemini-cli)
