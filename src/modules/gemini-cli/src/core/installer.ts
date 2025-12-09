/**
 * Gemini CLI Module - Installer
 * Handles detection, installation, and version management
 */

import { exec, execSync } from 'child_process';
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
      await execAsync(
        'npm install -g @anthropic-ai/gemini-cli',
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
      await execAsync('npm uninstall -g @anthropic-ai/gemini-cli', { timeout: 60000 });

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
      await execAsync('npm update -g @anthropic-ai/gemini-cli', { timeout: 120000 });

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
   npm install -g @anthropic-ai/gemini-cli

2. Verify installation:
   gemini --version

3. Authenticate:
   gemini auth login

For more information, visit:
https://github.com/anthropics/gemini-cli
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
