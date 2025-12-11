import { exec, execSync } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { GeminiInstallError } from './errors.js';
const execAsync = promisify(exec);
export class GeminiInstaller {
    platformInfo;
    cachedVersion = null;
    cachedPath = null;
    constructor(){
        this.platformInfo = this.detectPlatform();
    }
    async isInstalled() {
        const binaryPath = await this.findBinary();
        return binaryPath !== null;
    }
    async findBinary() {
        if (this.cachedPath) return this.cachedPath;
        const whichCmd = this.platformInfo.os === 'win32' ? 'where' : 'which';
        try {
            const { stdout } = await execAsync(`${whichCmd} gemini`);
            const binaryPath = stdout.trim().split('\n')[0];
            if (binaryPath && await this.verifyBinary(binaryPath)) {
                this.cachedPath = binaryPath;
                return binaryPath;
            }
        } catch  {}
        const commonPaths = this.getCommonPaths();
        for (const p of commonPaths){
            if (await this.verifyBinary(p)) {
                this.cachedPath = p;
                return p;
            }
        }
        return null;
    }
    async getVersion() {
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
        } catch  {}
        return undefined;
    }
    async checkMinVersion(minVersion) {
        const currentVersion = await this.getVersion();
        if (!currentVersion) return false;
        return this.compareVersions(currentVersion, minVersion) >= 0;
    }
    async ensureInstalled() {
        if (await this.isInstalled()) {
            const version = await this.getVersion();
            const binaryPath = await this.findBinary();
            return {
                success: true,
                version,
                path: binaryPath ?? undefined
            };
        }
        return this.install();
    }
    async install() {
        console.log('📦 Installing Gemini CLI...');
        try {
            await execAsync('npm install -g @google/gemini-cli', {
                timeout: 120000
            });
            this.cachedPath = null;
            this.cachedVersion = null;
            if (await this.isInstalled()) {
                const version = await this.getVersion();
                const binaryPath = await this.findBinary();
                console.log(`✅ Gemini CLI installed successfully (v${version})`);
                return {
                    success: true,
                    version,
                    path: binaryPath ?? undefined
                };
            }
            throw new Error('Installation completed but binary not found');
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            throw new GeminiInstallError(`Failed to install Gemini CLI: ${message}`, {
                originalError: message
            });
        }
    }
    async uninstall() {
        console.log('🗑️  Uninstalling Gemini CLI...');
        try {
            await execAsync('npm uninstall -g @google/gemini-cli', {
                timeout: 60000
            });
            this.cachedPath = null;
            this.cachedVersion = null;
            const geminiDir = path.join(os.homedir(), '.gemini');
            try {
                await fs.rm(geminiDir, {
                    recursive: true,
                    force: true
                });
            } catch  {}
            console.log('✅ Gemini CLI uninstalled successfully');
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            throw new GeminiInstallError(`Failed to uninstall Gemini CLI: ${message}`);
        }
    }
    async update() {
        console.log('🔄 Updating Gemini CLI...');
        try {
            await execAsync('npm update -g @google/gemini-cli', {
                timeout: 120000
            });
            this.cachedPath = null;
            this.cachedVersion = null;
            const version = await this.getVersion();
            const binaryPath = await this.findBinary();
            console.log(`✅ Gemini CLI updated to v${version}`);
            return {
                success: true,
                version,
                path: binaryPath ?? undefined
            };
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            throw new GeminiInstallError(`Failed to update Gemini CLI: ${message}`);
        }
    }
    getInstallInstructions() {
        return `
To install Gemini CLI manually:

1. Using npm (recommended):
   npm install -g @google/gemini-cli

2. Verify installation:
   gemini --version

3. Authenticate:
   gemini auth login

For more information, visit:
https://github.com/google-gemini/gemini-cli
    `.trim();
    }
    getPlatformInfo() {
        return {
            ...this.platformInfo
        };
    }
    detectPlatform() {
        return {
            os: os.platform(),
            arch: os.arch(),
            shell: process.env.SHELL || (os.platform() === 'win32' ? 'cmd.exe' : '/bin/bash'),
            homeDir: os.homedir(),
            npmGlobalDir: this.getNpmGlobalDir()
        };
    }
    getNpmGlobalDir() {
        try {
            return execSync('npm root -g', {
                encoding: 'utf-8'
            }).trim();
        } catch  {
            if (os.platform() === 'win32') {
                return path.join(process.env.APPDATA || '', 'npm', 'node_modules');
            }
            return '/usr/local/lib/node_modules';
        }
    }
    getCommonPaths() {
        const home = os.homedir();
        const isWindows = os.platform() === 'win32';
        const ext = isWindows ? '.cmd' : '';
        const paths = [];
        if (isWindows) {
            paths.push(path.join(process.env.APPDATA || '', 'npm', `gemini${ext}`), path.join(process.env.LOCALAPPDATA || '', 'npm', `gemini${ext}`), `C:\\Program Files\\nodejs\\gemini${ext}`);
        } else {
            paths.push(path.join(home, '.local', 'bin', 'gemini'), '/usr/local/bin/gemini', '/usr/bin/gemini', path.join(home, '.npm-global', 'bin', 'gemini'), path.join(home, 'n', 'bin', 'gemini'));
        }
        return paths;
    }
    async verifyBinary(binaryPath) {
        try {
            await fs.access(binaryPath, fs.constants.X_OK);
            return true;
        } catch  {
            return false;
        }
    }
    compareVersions(v1, v2) {
        const parts1 = v1.split('.').map(Number);
        const parts2 = v2.split('.').map(Number);
        for(let i = 0; i < Math.max(parts1.length, parts2.length); i++){
            const p1 = parts1[i] || 0;
            const p2 = parts2[i] || 0;
            if (p1 > p2) return 1;
            if (p1 < p2) return -1;
        }
        return 0;
    }
}

//# sourceMappingURL=installer.js.map