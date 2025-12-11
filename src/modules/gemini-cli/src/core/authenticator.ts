/**
 * Gemini CLI Module - Authenticator
 * Handles Google Login, API Key, and Vertex AI authentication
 */

import { spawn } from 'child_process';
import { promisify } from 'util';
import { exec } from 'child_process';
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
        if (!config?.vertexProject) {
          throw new GeminiAuthError('Vertex AI project is required', 'vertex-ai');
        }
        return this.authenticateWithVertexAI({
          project: config.vertexProject,
          location: config.vertexLocation || 'us-central1',
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

      let stderr = '';

      child.stdout?.on('data', (data) => {
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
   * Ensure secure file permissions on credentials directory
   * Directory: 700 (owner only), Files: 600 (owner read/write only)
   */
  async ensureSecurePermissions(): Promise<void> {
    try {
      // Ensure directory exists with secure permissions (0o700)
      await fs.mkdir(this.credentialsPath, { recursive: true, mode: 0o700 });

      // Set directory permissions explicitly
      await fs.chmod(this.credentialsPath, 0o700);

      // Set secure permissions on all JSON credential files (0o600)
      try {
        const files = await fs.readdir(this.credentialsPath);
        for (const file of files) {
          if (file.endsWith('.json')) {
            const filePath = path.join(this.credentialsPath, file);
            await fs.chmod(filePath, 0o600);
          }
        }
      } catch {
        // Directory might not have files yet
      }
    } catch (error) {
      console.warn('Warning: Could not set secure permissions on credentials directory');
    }
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
      // Make a minimal API request to test the key using header (more secure than URL param)
      const response = await fetch(
        'https://generativelanguage.googleapis.com/v1/models',
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': key,
          },
        }
      );

      if (response.ok) {
        return { valid: true };
      }

      const errorResponse = await response.json() as { error?: { message?: string } };
      return {
        valid: false,
        error: errorResponse.error?.message || `HTTP ${response.status}`,
      };
    } catch (err) {
      return {
        valid: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      };
    }
  }
}
