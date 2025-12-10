import { spawn } from 'child_process';
import { promisify } from 'util';
import { exec } from 'child_process';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { GeminiAuthError } from './errors.js';
const execAsync = promisify(exec);
export class GeminiAuthenticator {
    installer;
    credentialsPath;
    constructor(installer){
        this.installer = installer;
        this.credentialsPath = path.join(os.homedir(), '.gemini');
    }
    async isAuthenticated() {
        try {
            const credFiles = [
                path.join(this.credentialsPath, 'credentials.json'),
                path.join(this.credentialsPath, 'application_default_credentials.json')
            ];
            for (const file of credFiles){
                try {
                    await fs.access(file);
                    return true;
                } catch  {
                    continue;
                }
            }
            if (process.env.GEMINI_API_KEY) {
                return true;
            }
            if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
                try {
                    await fs.access(process.env.GOOGLE_APPLICATION_CREDENTIALS);
                    return true;
                } catch  {}
            }
            return false;
        } catch  {
            return false;
        }
    }
    async getAuthMethod() {
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
        } catch  {
            return null;
        }
    }
    async authenticate(method, config) {
        switch(method){
            case 'google-login':
                return this.authenticateWithGoogle();
            case 'api-key':
                return this.authenticateWithApiKey(config?.apiKey);
            case 'vertex-ai':
                if (!config?.vertexProject) {
                    throw new GeminiAuthError('Vertex AI project is required', 'vertex-ai');
                }
                return this.authenticateWithVertexAI({
                    project: config.vertexProject,
                    location: config.vertexLocation || 'us-central1'
                });
            default:
                throw new GeminiAuthError(`Unknown authentication method: ${method}`, method);
        }
    }
    async authenticateWithGoogle() {
        console.log('🔐 Starting Google OAuth login...');
        const binaryPath = await this.installer.findBinary();
        if (!binaryPath) {
            throw new GeminiAuthError('Gemini CLI not installed', 'google-login');
        }
        return new Promise((resolve, reject)=>{
            const child = spawn(binaryPath, [
                'auth',
                'login'
            ], {
                stdio: [
                    'inherit',
                    'pipe',
                    'pipe'
                ]
            });
            let stderr = '';
            child.stdout?.on('data', (data)=>{
                process.stdout.write(data);
            });
            child.stderr?.on('data', (data)=>{
                stderr += data.toString();
                process.stderr.write(data);
            });
            child.on('close', async (code)=>{
                if (code === 0) {
                    console.log('✅ Google authentication successful');
                    resolve({
                        success: true,
                        method: 'google-login'
                    });
                } else {
                    reject(new GeminiAuthError(`Google login failed: ${stderr || 'Unknown error'}`, 'google-login', {
                        exitCode: code
                    }));
                }
            });
            child.on('error', (error)=>{
                reject(new GeminiAuthError(`Failed to start auth process: ${error.message}`, 'google-login'));
            });
        });
    }
    async authenticateWithApiKey(apiKey) {
        const key = apiKey || process.env.GEMINI_API_KEY;
        if (!key) {
            throw new GeminiAuthError('API key is required. Provide via --api-key or GEMINI_API_KEY environment variable', 'api-key');
        }
        console.log('🔐 Validating API key...');
        try {
            const testResult = await this.testApiKey(key);
            if (!testResult.valid) {
                throw new GeminiAuthError(`Invalid API key: ${testResult.error}`, 'api-key');
            }
            process.env.GEMINI_API_KEY = key;
            console.log('✅ API key validated successfully');
            return {
                success: true,
                method: 'api-key'
            };
        } catch (error) {
            if (error instanceof GeminiAuthError) throw error;
            throw new GeminiAuthError(`API key validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 'api-key');
        }
    }
    async authenticateWithVertexAI(config) {
        console.log('🔐 Configuring Vertex AI authentication...');
        if (!config.project) {
            throw new GeminiAuthError('Vertex AI project ID is required', 'vertex-ai');
        }
        const saPath = config.serviceAccountPath || process.env.GOOGLE_APPLICATION_CREDENTIALS;
        if (!saPath) {
            throw new GeminiAuthError('Service account credentials required. Set GOOGLE_APPLICATION_CREDENTIALS or --sa-path', 'vertex-ai');
        }
        try {
            await fs.access(saPath);
        } catch  {
            throw new GeminiAuthError(`Service account file not found: ${saPath}`, 'vertex-ai');
        }
        try {
            const content = await fs.readFile(saPath, 'utf-8');
            const creds = JSON.parse(content);
            if (!creds.type || !creds.project_id) {
                throw new GeminiAuthError('Invalid service account file format', 'vertex-ai');
            }
        } catch (error) {
            if (error instanceof GeminiAuthError) throw error;
            throw new GeminiAuthError(`Failed to parse service account file: ${error instanceof Error ? error.message : 'Unknown error'}`, 'vertex-ai');
        }
        process.env.GOOGLE_APPLICATION_CREDENTIALS = saPath;
        process.env.GOOGLE_CLOUD_PROJECT = config.project;
        process.env.GOOGLE_CLOUD_LOCATION = config.location;
        console.log('✅ Vertex AI authentication configured');
        console.log(`   Project: ${config.project}`);
        console.log(`   Location: ${config.location}`);
        return {
            success: true,
            method: 'vertex-ai'
        };
    }
    async logout() {
        console.log('🔓 Clearing authentication...');
        delete process.env.GEMINI_API_KEY;
        delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
        delete process.env.GOOGLE_CLOUD_PROJECT;
        delete process.env.GOOGLE_CLOUD_LOCATION;
        const binaryPath = await this.installer.findBinary();
        if (binaryPath) {
            try {
                await execAsync(`"${binaryPath}" auth logout`);
            } catch  {}
        }
        try {
            await fs.rm(this.credentialsPath, {
                recursive: true,
                force: true
            });
        } catch  {}
        console.log('✅ Authentication cleared');
    }
    async testApiKey(key) {
        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1/models?key=${key}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            if (response.ok) {
                return {
                    valid: true
                };
            }
            const errorResponse = await response.json();
            return {
                valid: false,
                error: errorResponse.error?.message || `HTTP ${response.status}`
            };
        } catch (err) {
            return {
                valid: false,
                error: err instanceof Error ? err.message : 'Unknown error'
            };
        }
    }
}

//# sourceMappingURL=authenticator.js.map