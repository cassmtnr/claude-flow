# Gemini CLI Module - Installer Documentation

**Version**: 1.0.0
**Last Updated**: 2025-12-06

This document provides comprehensive documentation for the Gemini CLI Installer component, responsible for detecting, installing, and managing the Gemini CLI binary.

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Detection Logic](#detection-logic)
4. [Installation Methods](#installation-methods)
5. [Version Management](#version-management)
6. [Platform Support](#platform-support)
7. [Error Handling](#error-handling)
8. [Implementation Details](#implementation-details)
9. [Testing](#testing)
10. [Troubleshooting](#troubleshooting)

---

## Overview

The Installer component handles all aspects of Gemini CLI installation and version management:

- **Auto-detection**: Checks if Gemini CLI is already installed
- **Version validation**: Ensures installed version meets requirements
- **Cross-platform installation**: Supports macOS, Linux, and Windows
- **Graceful fallback**: Provides manual installation instructions on failure
- **Update management**: Handles version upgrades when needed

### Key Principles

1. **Non-invasive**: Never modifies the system without explicit user consent
2. **Idempotent**: Safe to run multiple times
3. **Transparent**: Clear logging of all actions
4. **Recoverable**: Provides rollback capability

---

## Architecture

### Component Diagram

```
┌──────────────────────────────────────────────────────────────────────┐
│                          GeminiInstaller                              │
│                                                                       │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────────────┐  │
│  │   Detector     │  │   Installer    │  │   VersionManager       │  │
│  │                │  │                │  │                        │  │
│  │ • isInstalled  │  │ • install      │  │ • getVersion           │  │
│  │ • findBinary   │  │ • uninstall    │  │ • checkMinVersion      │  │
│  │ • checkPath    │  │ • update       │  │ • getLatest            │  │
│  └────────────────┘  └────────────────┘  └────────────────────────┘  │
│                                                                       │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────────────┐  │
│  │  PlatformInfo  │  │  PathManager   │  │   Logger               │  │
│  │                │  │                │  │                        │  │
│  │ • os           │  │ • addToPath    │  │ • info                 │  │
│  │ • arch         │  │ • binPath      │  │ • warn                 │  │
│  │ • shell        │  │ • configPath   │  │ • error                │  │
│  └────────────────┘  └────────────────┘  └────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────┘
```

### Class Interface

```typescript
export class GeminiInstaller {
  // Detection
  async isInstalled(): Promise<boolean>;
  async findBinary(): Promise<string | null>;

  // Version management
  async getVersion(): Promise<string | undefined>;
  async checkMinVersion(minVersion: string): Promise<boolean>;
  async getLatestVersion(): Promise<string>;

  // Installation
  async ensureInstalled(): Promise<void>;
  async install(): Promise<void>;
  async uninstall(): Promise<void>;
  async update(): Promise<void>;

  // Utilities
  async verifyInstallation(): Promise<boolean>;
  getInstallInstructions(): string;
}
```

---

## Detection Logic

### Detection Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                      Detection Process                               │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                  ┌───────────────────────┐
                  │  Check 'which gemini' │
                  │  (or 'where' on Win)  │
                  └───────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              │                               │
         Found                           Not Found
              │                               │
              ▼                               ▼
    ┌─────────────────┐           ┌───────────────────────┐
    │  Verify binary  │           │  Check common paths   │
    │  is executable  │           │  ~/.local/bin/        │
    └─────────────────┘           │  /usr/local/bin/      │
              │                   │  %APPDATA%\npm\       │
              │                   └───────────────────────┘
              │                               │
              ▼                   ┌───────────┴───────────┐
    ┌─────────────────┐           │                       │
    │  Check version  │      Found                   Not Found
    │  gemini --ver   │           │                       │
    └─────────────────┘           │                       │
              │                   ▼                       ▼
              │         ┌─────────────────┐     ┌─────────────────┐
              │         │  Verify binary  │     │  Return false   │
              │         └─────────────────┘     │  Not installed  │
              │                   │             └─────────────────┘
              ▼                   ▼
    ┌─────────────────────────────────────────┐
    │  Return true + version + path           │
    └─────────────────────────────────────────┘
```

### Detection Implementation

```typescript
/**
 * Check if Gemini CLI is installed on the system
 */
async isInstalled(): Promise<boolean> {
  try {
    const binaryPath = await this.findBinary();
    if (!binaryPath) return false;

    // Verify it's actually executable
    const result = await this.execute(['--version']);
    return result.success;
  } catch {
    return false;
  }
}

/**
 * Find the Gemini binary path
 */
async findBinary(): Promise<string | null> {
  // Platform-specific 'which' command
  const whichCommand = process.platform === 'win32' ? 'where' : 'which';

  try {
    const { stdout } = await exec(`${whichCommand} gemini`);
    const path = stdout.trim().split('\n')[0]; // First result on Windows

    if (path && await this.isExecutable(path)) {
      return path;
    }
  } catch {
    // Command not found in PATH
  }

  // Check common installation locations
  return await this.checkCommonPaths();
}

/**
 * Check common installation paths
 */
private async checkCommonPaths(): Promise<string | null> {
  const paths = this.getCommonPaths();

  for (const path of paths) {
    if (await this.isExecutable(path)) {
      return path;
    }
  }

  return null;
}

/**
 * Get platform-specific common paths
 */
private getCommonPaths(): string[] {
  const home = os.homedir();

  if (process.platform === 'win32') {
    return [
      `${process.env.APPDATA}\\npm\\gemini.cmd`,
      `${process.env.LOCALAPPDATA}\\npm\\gemini.cmd`,
      `${process.env.ProgramFiles}\\nodejs\\gemini.cmd`,
      `${home}\\.local\\bin\\gemini.exe`,
    ];
  }

  // macOS and Linux
  return [
    '/usr/local/bin/gemini',
    '/usr/bin/gemini',
    `${home}/.local/bin/gemini`,
    `${home}/.npm-global/bin/gemini`,
    '/opt/homebrew/bin/gemini', // Apple Silicon Homebrew
  ];
}
```

---

## Installation Methods

### Primary: npm Global Install

```typescript
/**
 * Install Gemini CLI using npm
 */
async installViaNpm(): Promise<void> {
  this.logger.info('Installing Gemini CLI via npm...');

  const command = 'npm install -g @google/gemini-cli';

  try {
    const { stdout, stderr } = await exec(command, {
      timeout: 120000, // 2 minutes
    });

    this.logger.info('npm install output:', stdout);

    if (stderr && !stderr.includes('npm WARN')) {
      this.logger.warn('npm stderr:', stderr);
    }

    // Verify installation
    if (!await this.verifyInstallation()) {
      throw new Error('Installation verification failed');
    }

    this.logger.success('Gemini CLI installed successfully');
  } catch (error) {
    throw new GeminiInstallError(
      `npm installation failed: ${(error as Error).message}`,
      'NPM_INSTALL_FAILED',
      { command, error }
    );
  }
}
```

### Alternative: pnpm/yarn

```typescript
/**
 * Install using alternative package managers
 */
async installViaPackageManager(manager: 'pnpm' | 'yarn'): Promise<void> {
  const commands = {
    pnpm: 'pnpm add -g @google/gemini-cli',
    yarn: 'yarn global add @google/gemini-cli',
  };

  const command = commands[manager];
  this.logger.info(`Installing via ${manager}...`);

  try {
    await exec(command, { timeout: 120000 });
    await this.verifyInstallation();
    this.logger.success(`Installed via ${manager}`);
  } catch (error) {
    throw new GeminiInstallError(
      `${manager} installation failed`,
      'PM_INSTALL_FAILED',
      { manager, error }
    );
  }
}
```

### Fallback: Manual Instructions

```typescript
/**
 * Get manual installation instructions
 */
getInstallInstructions(): string {
  const platform = process.platform;
  const instructions: Record<string, string> = {
    darwin: `
# macOS Installation

## Option 1: npm (recommended)
npm install -g @google/gemini-cli

## Option 2: Homebrew (if available)
brew install google/gemini/gemini-cli

## Option 3: Direct download
curl -fsSL https://gemini.google.com/cli/install.sh | bash

# Verify installation
gemini --version
`,
    linux: `
# Linux Installation

## Option 1: npm (recommended)
npm install -g @google/gemini-cli

## Option 2: Direct download
curl -fsSL https://gemini.google.com/cli/install.sh | bash

## Option 3: Snap (Ubuntu/Debian)
sudo snap install gemini-cli

# Verify installation
gemini --version
`,
    win32: `
# Windows Installation

## Option 1: npm (recommended)
npm install -g @google/gemini-cli

## Option 2: Chocolatey
choco install gemini-cli

## Option 3: winget
winget install Google.GeminiCLI

# Verify installation
gemini --version
`,
  };

  return instructions[platform] || instructions.linux;
}
```

---

## Version Management

### Version Checking

```typescript
/**
 * Get installed Gemini CLI version
 */
async getVersion(): Promise<string | undefined> {
  try {
    const { stdout } = await exec('gemini --version');
    const match = stdout.match(/(\d+\.\d+\.\d+)/);
    return match ? match[1] : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Check if installed version meets minimum requirement
 */
async checkMinVersion(minVersion: string): Promise<boolean> {
  const installed = await this.getVersion();
  if (!installed) return false;

  return this.compareVersions(installed, minVersion) >= 0;
}

/**
 * Compare semantic versions
 * Returns: -1 if a < b, 0 if a == b, 1 if a > b
 */
private compareVersions(a: string, b: string): number {
  const partsA = a.split('.').map(Number);
  const partsB = b.split('.').map(Number);

  for (let i = 0; i < 3; i++) {
    const numA = partsA[i] || 0;
    const numB = partsB[i] || 0;

    if (numA > numB) return 1;
    if (numA < numB) return -1;
  }

  return 0;
}
```

### Version Upgrade

```typescript
/**
 * Check for and apply updates
 */
async update(): Promise<UpdateResult> {
  const current = await this.getVersion();
  const latest = await this.getLatestVersion();

  if (!current) {
    throw new GeminiInstallError('Gemini CLI not installed', 'NOT_INSTALLED');
  }

  if (this.compareVersions(current, latest) >= 0) {
    return {
      updated: false,
      currentVersion: current,
      latestVersion: latest,
      message: 'Already up to date',
    };
  }

  this.logger.info(`Updating from ${current} to ${latest}...`);

  await exec('npm update -g @google/gemini-cli');

  const newVersion = await this.getVersion();

  return {
    updated: true,
    previousVersion: current,
    currentVersion: newVersion!,
    latestVersion: latest,
    message: `Updated from ${current} to ${newVersion}`,
  };
}

/**
 * Get latest available version from npm registry
 */
async getLatestVersion(): Promise<string> {
  try {
    const { stdout } = await exec('npm view @google/gemini-cli version');
    return stdout.trim();
  } catch {
    // Fallback to package.json requirement
    return GeminiInstaller.MIN_VERSION;
  }
}
```

---

## Platform Support

### Platform Detection

```typescript
interface PlatformInfo {
  os: 'darwin' | 'linux' | 'win32';
  arch: 'x64' | 'arm64' | 'arm';
  shell: string;
  pathSeparator: string;
  homeDir: string;
  globalBinDir: string;
}

/**
 * Detect platform information
 */
private detectPlatform(): PlatformInfo {
  const platform = process.platform as 'darwin' | 'linux' | 'win32';
  const arch = process.arch as 'x64' | 'arm64' | 'arm';
  const home = os.homedir();

  const platformInfo: Record<string, Partial<PlatformInfo>> = {
    darwin: {
      shell: process.env.SHELL || '/bin/zsh',
      pathSeparator: ':',
      globalBinDir: arch === 'arm64'
        ? '/opt/homebrew/bin'
        : '/usr/local/bin',
    },
    linux: {
      shell: process.env.SHELL || '/bin/bash',
      pathSeparator: ':',
      globalBinDir: '/usr/local/bin',
    },
    win32: {
      shell: process.env.COMSPEC || 'cmd.exe',
      pathSeparator: ';',
      globalBinDir: `${process.env.APPDATA}\\npm`,
    },
  };

  return {
    os: platform,
    arch,
    homeDir: home,
    ...platformInfo[platform],
  } as PlatformInfo;
}
```

### Platform-Specific Behaviors

| Platform | npm Location | Config Location | Shell Integration |
|----------|-------------|-----------------|-------------------|
| macOS | `/usr/local/bin` or `/opt/homebrew/bin` | `~/.zshrc` or `~/.bash_profile` | Automatic |
| Linux | `/usr/local/bin` or `~/.local/bin` | `~/.bashrc` or `~/.zshrc` | Automatic |
| Windows | `%APPDATA%\npm` | PowerShell profile | Requires restart |

### Docker Detection

```typescript
/**
 * Detect if running inside Docker
 * Important: Gemini CLI requires Docker access, so it can't run in a container
 */
private async isDocker(): Promise<boolean> {
  try {
    // Check for .dockerenv file
    await fs.access('/.dockerenv');
    return true;
  } catch {
    // Check cgroup for docker
    try {
      const cgroup = await fs.readFile('/proc/1/cgroup', 'utf8');
      return cgroup.includes('docker');
    } catch {
      return false;
    }
  }
}

/**
 * Validate environment before installation
 */
async validateEnvironment(): Promise<ValidationResult> {
  const issues: string[] = [];

  // Check if in Docker
  if (await this.isDocker()) {
    issues.push(
      'Running inside Docker container. Gemini CLI requires Docker access ' +
      'and cannot run inside a container. Please install on host system.'
    );
  }

  // Check Node.js version
  const nodeVersion = process.version;
  if (this.compareVersions(nodeVersion.slice(1), '18.0.0') < 0) {
    issues.push(`Node.js 18+ required, found ${nodeVersion}`);
  }

  // Check npm availability
  try {
    await exec('npm --version');
  } catch {
    issues.push('npm not found in PATH');
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}
```

---

## Error Handling

### Error Types

```typescript
/**
 * Installation-specific errors
 */
export class GeminiInstallError extends GeminiError {
  constructor(
    message: string,
    public installCode: GeminiInstallErrorCode,
    public context?: Record<string, any>
  ) {
    super(message, 'INSTALL_ERROR', true, context);
    this.name = 'GeminiInstallError';
  }

  /**
   * Get recovery suggestions
   */
  getRecoverySuggestions(): string[] {
    const suggestions: Record<GeminiInstallErrorCode, string[]> = {
      NPM_INSTALL_FAILED: [
        'Try running: npm cache clean --force',
        'Check npm permissions: npm config get prefix',
        'Try with sudo: sudo npm install -g @google/gemini-cli',
        'Use npx instead: npx @google/gemini-cli',
      ],
      PERMISSION_DENIED: [
        'Run with elevated permissions',
        'Check directory ownership',
        'Use --prefix to install in user directory',
      ],
      NETWORK_ERROR: [
        'Check internet connection',
        'Try using a different npm registry',
        'Check proxy settings: npm config get proxy',
      ],
      VERSION_MISMATCH: [
        'Update to the latest version',
        'Clear npm cache: npm cache clean --force',
        'Reinstall: npm uninstall -g @google/gemini-cli && npm install -g @google/gemini-cli',
      ],
      NOT_INSTALLED: [
        'Run: claude-flow gemini enable',
        'Install manually: npm install -g @google/gemini-cli',
      ],
      DOCKER_ENVIRONMENT: [
        'Install on host system, not in container',
        'Use Docker-in-Docker if necessary',
      ],
    };

    return suggestions[this.installCode] || ['Contact support'];
  }
}

type GeminiInstallErrorCode =
  | 'NPM_INSTALL_FAILED'
  | 'PERMISSION_DENIED'
  | 'NETWORK_ERROR'
  | 'VERSION_MISMATCH'
  | 'NOT_INSTALLED'
  | 'DOCKER_ENVIRONMENT'
  | 'PATH_NOT_FOUND'
  | 'BINARY_CORRUPT';
```

### Retry Logic

```typescript
/**
 * Retry installation with exponential backoff
 */
async installWithRetry(
  maxRetries: number = 3,
  initialDelay: number = 1000
): Promise<void> {
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      this.logger.info(`Installation attempt ${attempt}/${maxRetries}`);
      await this.install();
      return;
    } catch (error) {
      lastError = error as Error;

      if (attempt < maxRetries) {
        const delay = initialDelay * Math.pow(2, attempt - 1);
        this.logger.warn(`Attempt ${attempt} failed, retrying in ${delay}ms...`);
        await this.sleep(delay);
      }
    }
  }

  throw new GeminiInstallError(
    `Installation failed after ${maxRetries} attempts: ${lastError?.message}`,
    'NPM_INSTALL_FAILED',
    { attempts: maxRetries, lastError }
  );
}
```

---

## Implementation Details

### Complete Installer Class

```typescript
import { exec as execCallback } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as os from 'os';

const exec = promisify(execCallback);

export class GeminiInstaller {
  private static readonly PACKAGE_NAME = '@google/gemini-cli';
  private static readonly MIN_VERSION = '1.0.0';

  private logger: Logger;
  private platform: PlatformInfo;

  constructor(logger?: Logger) {
    this.logger = logger || new ConsoleLogger();
    this.platform = this.detectPlatform();
  }

  /**
   * Ensure Gemini CLI is installed and meets requirements
   */
  async ensureInstalled(): Promise<void> {
    // Validate environment first
    const validation = await this.validateEnvironment();
    if (!validation.valid) {
      throw new GeminiInstallError(
        `Environment validation failed: ${validation.issues.join(', ')}`,
        'DOCKER_ENVIRONMENT',
        { issues: validation.issues }
      );
    }

    // Check if already installed
    if (await this.isInstalled()) {
      this.logger.info('✅ Gemini CLI is already installed');

      // Check version
      const version = await this.getVersion();
      if (version && this.checkMinVersion(version)) {
        this.logger.info(`   Version: ${version}`);
        return;
      }

      // Update if version is outdated
      this.logger.warn(`   Version ${version} is outdated, updating...`);
      await this.update();
      return;
    }

    // Install
    this.logger.info('📦 Gemini CLI not found, installing...');
    await this.installWithRetry();
  }

  /**
   * Install Gemini CLI
   */
  async install(): Promise<void> {
    // Try npm first
    try {
      await this.installViaNpm();
      return;
    } catch (npmError) {
      this.logger.warn('npm installation failed, trying alternatives...');
    }

    // Try pnpm
    try {
      await exec('pnpm --version');
      await this.installViaPackageManager('pnpm');
      return;
    } catch {
      // pnpm not available
    }

    // Try yarn
    try {
      await exec('yarn --version');
      await this.installViaPackageManager('yarn');
      return;
    } catch {
      // yarn not available
    }

    // All methods failed
    throw new GeminiInstallError(
      'All installation methods failed',
      'NPM_INSTALL_FAILED',
      { instructions: this.getInstallInstructions() }
    );
  }

  /**
   * Uninstall Gemini CLI
   */
  async uninstall(): Promise<void> {
    this.logger.info('Uninstalling Gemini CLI...');

    try {
      await exec('npm uninstall -g @google/gemini-cli');
      this.logger.success('✅ Gemini CLI uninstalled successfully');
    } catch (error) {
      throw new GeminiInstallError(
        `Uninstall failed: ${(error as Error).message}`,
        'NPM_INSTALL_FAILED'
      );
    }
  }

  /**
   * Verify installation is working
   */
  async verifyInstallation(): Promise<boolean> {
    try {
      // Check binary exists
      const binary = await this.findBinary();
      if (!binary) return false;

      // Check version command works
      const version = await this.getVersion();
      if (!version) return false;

      // Optionally check authentication
      // (skip for initial install verification)

      return true;
    } catch {
      return false;
    }
  }

  // ... other methods as defined above
}
```

---

## Testing

### Unit Tests

```typescript
describe('GeminiInstaller', () => {
  let installer: GeminiInstaller;
  let mockExec: jest.SpyInstance;

  beforeEach(() => {
    installer = new GeminiInstaller();
    mockExec = jest.spyOn(installer as any, 'execute');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('isInstalled', () => {
    it('should return true when gemini is in PATH', async () => {
      mockExec.mockResolvedValue({ success: true, stdout: '1.0.0' });
      expect(await installer.isInstalled()).toBe(true);
    });

    it('should return false when gemini is not found', async () => {
      mockExec.mockRejectedValue(new Error('not found'));
      expect(await installer.isInstalled()).toBe(false);
    });
  });

  describe('getVersion', () => {
    it('should parse version from output', async () => {
      mockExec.mockResolvedValue({
        success: true,
        stdout: 'Gemini CLI version 1.2.3'
      });
      expect(await installer.getVersion()).toBe('1.2.3');
    });

    it('should return undefined for invalid output', async () => {
      mockExec.mockResolvedValue({
        success: true,
        stdout: 'invalid output'
      });
      expect(await installer.getVersion()).toBeUndefined();
    });
  });

  describe('checkMinVersion', () => {
    it('should return true for higher version', async () => {
      jest.spyOn(installer, 'getVersion').mockResolvedValue('2.0.0');
      expect(await installer.checkMinVersion('1.0.0')).toBe(true);
    });

    it('should return true for equal version', async () => {
      jest.spyOn(installer, 'getVersion').mockResolvedValue('1.0.0');
      expect(await installer.checkMinVersion('1.0.0')).toBe(true);
    });

    it('should return false for lower version', async () => {
      jest.spyOn(installer, 'getVersion').mockResolvedValue('0.9.0');
      expect(await installer.checkMinVersion('1.0.0')).toBe(false);
    });
  });

  describe('compareVersions', () => {
    it('should correctly compare versions', () => {
      const compare = (installer as any).compareVersions.bind(installer);
      expect(compare('1.0.0', '1.0.0')).toBe(0);
      expect(compare('2.0.0', '1.0.0')).toBe(1);
      expect(compare('1.0.0', '2.0.0')).toBe(-1);
      expect(compare('1.2.3', '1.2.2')).toBe(1);
      expect(compare('1.10.0', '1.9.0')).toBe(1);
    });
  });

  describe('validateEnvironment', () => {
    it('should fail when running in Docker', async () => {
      jest.spyOn(installer as any, 'isDocker').mockResolvedValue(true);
      const result = await installer.validateEnvironment();
      expect(result.valid).toBe(false);
      expect(result.issues).toContain(expect.stringContaining('Docker'));
    });
  });
});
```

### Integration Tests

```typescript
describe('GeminiInstaller Integration', () => {
  // Skip if Gemini CLI is not installed
  const skipIfNotInstalled = async () => {
    const installer = new GeminiInstaller();
    if (!await installer.isInstalled()) {
      return true;
    }
    return false;
  };

  it('should detect installed Gemini CLI', async () => {
    if (await skipIfNotInstalled()) {
      console.log('Skipping: Gemini CLI not installed');
      return;
    }

    const installer = new GeminiInstaller();
    expect(await installer.isInstalled()).toBe(true);
  });

  it('should get correct version', async () => {
    if (await skipIfNotInstalled()) {
      console.log('Skipping: Gemini CLI not installed');
      return;
    }

    const installer = new GeminiInstaller();
    const version = await installer.getVersion();
    expect(version).toMatch(/^\d+\.\d+\.\d+/);
  });
});
```

---

## Troubleshooting

### Common Issues

#### 1. Permission Denied

```bash
# Solution: Use npx or install to user directory
npm config set prefix ~/.npm-global
export PATH=~/.npm-global/bin:$PATH
npm install -g @google/gemini-cli
```

#### 2. npm Not Found

```bash
# Solution: Install Node.js
# macOS
brew install node

# Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Windows
winget install OpenJS.NodeJS
```

#### 3. Network Issues

```bash
# Check proxy settings
npm config get proxy
npm config get https-proxy

# Use different registry
npm install -g @google/gemini-cli --registry https://registry.npmmirror.com
```

#### 4. Version Conflicts

```bash
# Clear npm cache and reinstall
npm cache clean --force
npm uninstall -g @google/gemini-cli
npm install -g @google/gemini-cli
```

#### 5. PATH Issues

```bash
# macOS/Linux: Add to PATH
echo 'export PATH="$(npm prefix -g)/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc

# Windows: Check PATH in System Environment Variables
# Add: %APPDATA%\npm
```

### Debug Mode

```bash
# Enable verbose logging
export CLAUDE_FLOW_GEMINI_DEBUG=true
npx claude-flow gemini enable

# Check installation details
npx claude-flow gemini status --verbose
```

---

## References

- [Gemini CLI Documentation](https://cloud.google.com/gemini/docs/codeassist/gemini-cli)
- [npm Global Install Guide](https://docs.npmjs.com/resolving-eacces-permissions-errors-when-installing-packages-globally)
- [Claude Flow Installation](../../../docs/development/DEPLOYMENT.md)
