/**
 * Installer Tests
 * Tests for Gemini CLI binary detection and installation
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// Simulated installer for testing
class TestGeminiInstaller {
  private installedPath: string | null = null;
  private installedVersion: string | null = null;
  private npmGlobalPath: string = '/usr/local/lib/node_modules';

  constructor(config?: { npmGlobalPath?: string }) {
    if (config?.npmGlobalPath) {
      this.npmGlobalPath = config.npmGlobalPath;
    }
  }

  async findBinary(): Promise<string | null> {
    return this.installedPath;
  }

  async getVersion(): Promise<string | null> {
    return this.installedVersion;
  }

  async isInstalled(): Promise<boolean> {
    return this.installedPath !== null;
  }

  async install(): Promise<{ success: boolean; path: string; version: string }> {
    this.installedPath = `${this.npmGlobalPath}/@anthropic-ai/gemini-cli/bin/gemini`;
    this.installedVersion = '1.0.0';
    return {
      success: true,
      path: this.installedPath,
      version: this.installedVersion,
    };
  }

  async update(): Promise<{ success: boolean; previousVersion: string; newVersion: string }> {
    const prevVersion = this.installedVersion || '0.0.0';
    this.installedVersion = '1.1.0';
    return {
      success: true,
      previousVersion: prevVersion,
      newVersion: this.installedVersion,
    };
  }

  async uninstall(): Promise<{ success: boolean }> {
    this.installedPath = null;
    this.installedVersion = null;
    return { success: true };
  }

  // Test helper to simulate pre-installed state
  _setInstalled(path: string, version: string): void {
    this.installedPath = path;
    this.installedVersion = version;
  }
}

describe('GeminiInstaller', () => {
  let installer: TestGeminiInstaller;

  beforeEach(() => {
    installer = new TestGeminiInstaller();
  });

  describe('Binary Detection', () => {
    it('should return null when not installed', async () => {
      const path = await installer.findBinary();
      expect(path).toBeNull();
    });

    it('should return path when installed', async () => {
      installer._setInstalled('/usr/local/bin/gemini', '1.0.0');
      const path = await installer.findBinary();
      expect(path).toBe('/usr/local/bin/gemini');
    });

    it('should report not installed correctly', async () => {
      expect(await installer.isInstalled()).toBe(false);
    });

    it('should report installed correctly', async () => {
      installer._setInstalled('/usr/local/bin/gemini', '1.0.0');
      expect(await installer.isInstalled()).toBe(true);
    });
  });

  describe('Version Detection', () => {
    it('should return null version when not installed', async () => {
      const version = await installer.getVersion();
      expect(version).toBeNull();
    });

    it('should return version when installed', async () => {
      installer._setInstalled('/usr/local/bin/gemini', '1.2.3');
      const version = await installer.getVersion();
      expect(version).toBe('1.2.3');
    });
  });

  describe('Installation', () => {
    it('should install successfully', async () => {
      const result = await installer.install();
      expect(result.success).toBe(true);
      expect(result.path).toBeDefined();
      expect(result.version).toBeDefined();
    });

    it('should be detected after installation', async () => {
      expect(await installer.isInstalled()).toBe(false);
      await installer.install();
      expect(await installer.isInstalled()).toBe(true);
    });

    it('should have version after installation', async () => {
      await installer.install();
      const version = await installer.getVersion();
      expect(version).toBe('1.0.0');
    });

    it('should have path after installation', async () => {
      await installer.install();
      const path = await installer.findBinary();
      expect(path).toContain('gemini');
    });
  });

  describe('Update', () => {
    it('should update successfully', async () => {
      installer._setInstalled('/usr/local/bin/gemini', '1.0.0');
      const result = await installer.update();
      expect(result.success).toBe(true);
      expect(result.previousVersion).toBe('1.0.0');
      expect(result.newVersion).toBe('1.1.0');
    });

    it('should update version number', async () => {
      installer._setInstalled('/usr/local/bin/gemini', '1.0.0');
      await installer.update();
      const version = await installer.getVersion();
      expect(version).toBe('1.1.0');
    });

    it('should handle update when not previously installed', async () => {
      const result = await installer.update();
      expect(result.previousVersion).toBe('0.0.0');
      expect(result.newVersion).toBe('1.1.0');
    });
  });

  describe('Uninstall', () => {
    it('should uninstall successfully', async () => {
      installer._setInstalled('/usr/local/bin/gemini', '1.0.0');
      const result = await installer.uninstall();
      expect(result.success).toBe(true);
    });

    it('should not be detected after uninstall', async () => {
      installer._setInstalled('/usr/local/bin/gemini', '1.0.0');
      expect(await installer.isInstalled()).toBe(true);
      await installer.uninstall();
      expect(await installer.isInstalled()).toBe(false);
    });

    it('should have null version after uninstall', async () => {
      installer._setInstalled('/usr/local/bin/gemini', '1.0.0');
      await installer.uninstall();
      const version = await installer.getVersion();
      expect(version).toBeNull();
    });
  });

  describe('Custom npm Path', () => {
    it('should use custom npm global path', async () => {
      const customInstaller = new TestGeminiInstaller({
        npmGlobalPath: '/custom/path/node_modules',
      });
      await customInstaller.install();
      const path = await customInstaller.findBinary();
      expect(path).toContain('/custom/path/node_modules');
    });
  });
});

describe('Version Comparison', () => {
  function compareVersions(v1: string, v2: string): number {
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

  function isNewerVersion(current: string, required: string): boolean {
    return compareVersions(current, required) >= 0;
  }

  it('should compare equal versions', () => {
    expect(compareVersions('1.0.0', '1.0.0')).toBe(0);
  });

  it('should detect newer major version', () => {
    expect(compareVersions('2.0.0', '1.0.0')).toBe(1);
  });

  it('should detect older major version', () => {
    expect(compareVersions('1.0.0', '2.0.0')).toBe(-1);
  });

  it('should compare minor versions', () => {
    expect(compareVersions('1.2.0', '1.1.0')).toBe(1);
    expect(compareVersions('1.1.0', '1.2.0')).toBe(-1);
  });

  it('should compare patch versions', () => {
    expect(compareVersions('1.0.2', '1.0.1')).toBe(1);
    expect(compareVersions('1.0.1', '1.0.2')).toBe(-1);
  });

  it('should handle missing patch version', () => {
    expect(compareVersions('1.0', '1.0.0')).toBe(0);
    expect(compareVersions('1.0.1', '1.0')).toBe(1);
  });

  it('should check if version meets requirement', () => {
    expect(isNewerVersion('1.2.0', '1.0.0')).toBe(true);
    expect(isNewerVersion('1.0.0', '1.0.0')).toBe(true);
    expect(isNewerVersion('0.9.0', '1.0.0')).toBe(false);
  });
});

describe('Installation Path Detection', () => {
  interface PathCandidate {
    path: string;
    priority: number;
  }

  function getBinaryPaths(): PathCandidate[] {
    const isWindows = process.platform === 'win32';
    const home = process.env.HOME || process.env.USERPROFILE || '';

    if (isWindows) {
      return [
        { path: `${process.env.APPDATA}\\npm\\gemini.cmd`, priority: 1 },
        { path: `${home}\\.npm-global\\gemini.cmd`, priority: 2 },
        { path: 'C:\\Program Files\\nodejs\\gemini.cmd', priority: 3 },
      ];
    }

    return [
      { path: '/usr/local/bin/gemini', priority: 1 },
      { path: `${home}/.npm-global/bin/gemini`, priority: 2 },
      { path: '/usr/bin/gemini', priority: 3 },
      { path: `${home}/.local/bin/gemini`, priority: 4 },
    ];
  }

  it('should return multiple path candidates', () => {
    const paths = getBinaryPaths();
    expect(paths.length).toBeGreaterThan(0);
  });

  it('should have priority ordering', () => {
    const paths = getBinaryPaths();
    for (let i = 1; i < paths.length; i++) {
      expect(paths[i].priority).toBeGreaterThan(paths[i - 1].priority);
    }
  });

  it('should include home directory in paths', () => {
    const paths = getBinaryPaths();
    const home = process.env.HOME || process.env.USERPROFILE || '';
    if (home) {
      const hasHomePath = paths.some((p) => p.path.includes(home));
      expect(hasHomePath).toBe(true);
    }
  });
});
