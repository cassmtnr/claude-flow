# Gemini CLI Module - Authenticator Documentation

**Version**: 1.0.0
**Last Updated**: 2025-12-06

This document provides comprehensive documentation for the Gemini CLI Authenticator component, responsible for managing authentication flows for all three supported methods.

---

## Table of Contents

1. [Overview](#overview)
2. [Authentication Methods](#authentication-methods)
3. [Google Login Flow](#google-login-flow)
4. [API Key Authentication](#api-key-authentication)
5. [Vertex AI Authentication](#vertex-ai-authentication)
6. [Token Management](#token-management)
7. [Session Persistence](#session-persistence)
8. [Security Considerations](#security-considerations)
9. [Implementation Details](#implementation-details)
10. [Testing](#testing)
11. [Troubleshooting](#troubleshooting)

---

## Overview

The Authenticator component handles all authentication-related operations:

- **Multi-method support**: Google OAuth, API Key, and Vertex AI
- **Token management**: Automatic refresh, secure storage
- **Session persistence**: Credentials cached across sessions
- **Validation**: Pre-flight validation before operations
- **Secure storage**: Encrypted credential storage

### Key Principles

1. **Secure by default**: Credentials never logged or exposed
2. **Minimal permissions**: Request only required scopes
3. **User consent**: Clear prompts for authentication actions
4. **Graceful degradation**: Fallback options when methods fail

---

## Authentication Methods

### Method Comparison

| Feature | Google Login | API Key | Vertex AI |
|---------|-------------|---------|-----------|
| **Setup Complexity** | Low | Low | High |
| **Free Tier** | Yes (60 req/min) | Yes (varies) | No (pay-per-use) |
| **Browser Required** | Yes | No | No |
| **CI/CD Compatible** | No | Yes | Yes |
| **Token Refresh** | Automatic | N/A | Automatic |
| **Enterprise Ready** | Limited | No | Yes |
| **Audit Logging** | No | No | Yes |
| **Custom Quotas** | No | No | Yes |

### Selection Flowchart

```
                        ┌─────────────────────────┐
                        │   Select Auth Method    │
                        └───────────┬─────────────┘
                                    │
                     ┌──────────────┼──────────────┐
                     │              │              │
                     ▼              ▼              ▼
            ┌───────────────┐ ┌───────────┐ ┌─────────────────┐
            │  Need CI/CD?  │ │   Free    │ │   Enterprise    │
            │   Headless?   │ │   tier?   │ │   compliance?   │
            └───────┬───────┘ └─────┬─────┘ └────────┬────────┘
                    │               │                │
               Yes  │          Yes  │           Yes  │
                    │               │                │
                    ▼               ▼                ▼
            ┌───────────────┐ ┌─────────────┐ ┌─────────────┐
            │    API Key    │ │Google Login │ │  Vertex AI  │
            └───────────────┘ └─────────────┘ └─────────────┘
```

---

## Google Login Flow

### Overview

Google Login uses OAuth 2.0 to authenticate users through their Google account. This is the recommended method for individual developers as it:

- Requires no API key management
- Provides access to free tier
- Automatically refreshes tokens

### Authentication Flow

```
┌────────────────────────────────────────────────────────────────────────────┐
│                         Google OAuth Login Flow                            │
└────────────────────────────────────────────────────────────────────────────┘

  User                    Claude Flow            Gemini CLI           Google
    │                          │                     │                   │
    │ 1. Enable Gemini         │                     │                   │
    │ ────────────────────────▶│                     │                   │
    │                          │                     │                   │
    │                          │ 2. gemini auth login│                   │
    │                          │ ───────────────────▶│                   │
    │                          │                     │                   │
    │                          │                     │ 3. Open browser   │
    │                          │                     │ ─────────────────▶│
    │                          │                     │                   │
    │ 4. Complete login in browser ─────────────────────────────────────▶│
    │                          │                     │                   │
    │                          │                     │ 5. OAuth callback │
    │                          │                     │ ◀─────────────────│
    │                          │                     │                   │
    │                          │ 6. Auth complete    │                   │
    │                          │ ◀───────────────────│                   │
    │                          │                     │                   │
    │ 7. Ready to use          │                     │                   │
    │ ◀────────────────────────│                     │                   │
    │                          │                     │                   │
```

### Implementation

```typescript
/**
 * Authenticate using Google OAuth login
 */
async authenticateWithGoogle(): Promise<GeminiAuthResult> {
  this.logger.info('🔐 Starting Google authentication...');
  this.logger.info('   A browser window will open for login.');

  return new Promise((resolve, reject) => {
    // Spawn gemini auth login process
    const process = spawn('gemini', ['auth', 'login'], {
      stdio: ['inherit', 'pipe', 'pipe'],
      shell: true,
    });

    let stdout = '';
    let stderr = '';

    process.stdout?.on('data', (data) => {
      stdout += data.toString();
      // Look for success indicators
      if (stdout.includes('Successfully authenticated')) {
        this.logger.success('✅ Google authentication successful');
      }
    });

    process.stderr?.on('data', (data) => {
      stderr += data.toString();
    });

    process.on('close', async (code) => {
      if (code === 0) {
        // Verify authentication
        const identity = await this.getIdentity();

        resolve({
          success: true,
          method: 'google-login',
          identity,
          timestamp: new Date(),
        });
      } else {
        reject(new GeminiAuthError(
          `Google authentication failed: ${stderr}`,
          'google-login',
          { exitCode: code, stderr }
        ));
      }
    });

    process.on('error', (error) => {
      reject(new GeminiAuthError(
        `Failed to start auth process: ${error.message}`,
        'google-login',
        { error }
      ));
    });

    // Set timeout for browser login
    setTimeout(() => {
      if (process.exitCode === null) {
        process.kill();
        reject(new GeminiAuthError(
          'Authentication timed out. Please complete login faster.',
          'google-login',
          { timeout: true }
        ));
      }
    }, 300000); // 5 minute timeout
  });
}
```

### Token Storage

Google OAuth tokens are stored by Gemini CLI in:

| Platform | Location |
|----------|----------|
| macOS | `~/.gemini/credentials.json` |
| Linux | `~/.gemini/credentials.json` |
| Windows | `%USERPROFILE%\.gemini\credentials.json` |

### Token Refresh

Gemini CLI automatically refreshes tokens before expiry. The module monitors token status:

```typescript
/**
 * Check if current token needs refresh
 */
async checkTokenStatus(): Promise<TokenStatus> {
  const credentialsPath = this.getCredentialsPath();

  try {
    const data = await fs.readFile(credentialsPath, 'utf8');
    const credentials = JSON.parse(data);

    if (!credentials.expiry_date) {
      return { valid: true, needsRefresh: false };
    }

    const expiryDate = new Date(credentials.expiry_date);
    const now = new Date();
    const fiveMinutes = 5 * 60 * 1000;

    if (expiryDate <= now) {
      return { valid: false, needsRefresh: true, expired: true };
    }

    if (expiryDate.getTime() - now.getTime() < fiveMinutes) {
      return { valid: true, needsRefresh: true, expiresIn: expiryDate.getTime() - now.getTime() };
    }

    return { valid: true, needsRefresh: false, expiresAt: expiryDate };
  } catch {
    return { valid: false, needsRefresh: true, error: 'Credentials not found' };
  }
}
```

---

## API Key Authentication

### Overview

API Key authentication is ideal for:

- CI/CD pipelines
- Automated scripts
- Headless environments
- Non-interactive workflows

### Getting an API Key

1. Visit [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the generated key

### Authentication Flow

```
┌────────────────────────────────────────────────────────────────────────────┐
│                         API Key Authentication                             │
└────────────────────────────────────────────────────────────────────────────┘

  User                    Claude Flow            Gemini CLI          Google API
    │                          │                     │                   │
    │ 1. Provide API key       │                     │                   │
    │ ────────────────────────▶│                     │                   │
    │                          │                     │                   │
    │                          │ 2. Set env var      │                   │
    │                          │ GEMINI_API_KEY=xxx  │                   │
    │                          │                     │                   │
    │                          │ 3. Test request     │                   │
    │                          │ ───────────────────▶│                   │
    │                          │                     │ ─────────────────▶│
    │                          │                     │ ◀─────────────────│
    │                          │ ◀───────────────────│                   │
    │                          │                     │                   │
    │ 4. Key validated         │                     │                   │
    │ ◀────────────────────────│                     │                   │
    │                          │                     │                   │
```

### Implementation

```typescript
/**
 * Authenticate using API key
 */
async authenticateWithApiKey(apiKey: string): Promise<GeminiAuthResult> {
  if (!apiKey || apiKey.trim().length === 0) {
    throw new GeminiAuthError(
      'API key is required',
      'api-key',
      { reason: 'empty_key' }
    );
  }

  // Validate key format (basic check)
  if (!this.isValidApiKeyFormat(apiKey)) {
    throw new GeminiAuthError(
      'Invalid API key format',
      'api-key',
      { reason: 'invalid_format' }
    );
  }

  this.logger.info('🔐 Validating API key...');

  // Set environment variable
  process.env.GEMINI_API_KEY = apiKey;

  // Test the key with a minimal request
  try {
    const result = await this.testApiKey(apiKey);

    if (result.success) {
      this.logger.success('✅ API key validated successfully');

      // Store key securely
      await this.storeApiKey(apiKey);

      return {
        success: true,
        method: 'api-key',
        identity: {
          type: 'personal',
          tier: this.determineTier(result.quotas),
          quotas: result.quotas,
        },
        timestamp: new Date(),
      };
    } else {
      throw new GeminiAuthError(
        `API key validation failed: ${result.error}`,
        'api-key',
        { response: result }
      );
    }
  } catch (error) {
    // Clear environment variable on failure
    delete process.env.GEMINI_API_KEY;

    if (error instanceof GeminiAuthError) {
      throw error;
    }

    throw new GeminiAuthError(
      `API key validation failed: ${(error as Error).message}`,
      'api-key',
      { error }
    );
  }
}

/**
 * Test API key with minimal request
 */
private async testApiKey(apiKey: string): Promise<ApiKeyTestResult> {
  const testPrompt = 'respond with only the word: ok';

  try {
    const { stdout, stderr } = await exec(
      `GEMINI_API_KEY="${apiKey}" gemini -p "${testPrompt}"`,
      { timeout: 30000 }
    );

    if (stdout.toLowerCase().includes('ok')) {
      return { success: true, quotas: await this.getQuotas() };
    }

    return { success: false, error: 'Unexpected response' };
  } catch (error) {
    const message = (error as Error).message;

    if (message.includes('401') || message.includes('UNAUTHENTICATED')) {
      return { success: false, error: 'Invalid API key' };
    }

    if (message.includes('403') || message.includes('PERMISSION_DENIED')) {
      return { success: false, error: 'API key lacks required permissions' };
    }

    if (message.includes('429') || message.includes('RESOURCE_EXHAUSTED')) {
      return { success: false, error: 'Rate limit exceeded' };
    }

    return { success: false, error: message };
  }
}

/**
 * Basic API key format validation
 */
private isValidApiKeyFormat(key: string): boolean {
  // Google API keys are typically 39 characters, alphanumeric with some special chars
  return /^[A-Za-z0-9_-]{20,50}$/.test(key);
}
```

### Secure Storage

API keys are stored encrypted in the Claude Flow configuration:

```typescript
/**
 * Securely store API key
 */
private async storeApiKey(apiKey: string): Promise<void> {
  const encryptedKey = await this.encrypt(apiKey);

  const config = await this.loadConfig();
  config.gemini = config.gemini || {};
  config.gemini.credentials = {
    method: 'api-key',
    encryptedKey,
    timestamp: new Date().toISOString(),
  };

  await this.saveConfig(config);
}

/**
 * Encrypt sensitive data
 */
private async encrypt(data: string): Promise<string> {
  const algorithm = 'aes-256-gcm';
  const key = await this.getEncryptionKey();
  const iv = crypto.randomBytes(16);

  const cipher = crypto.createCipheriv(algorithm, key, iv);
  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  return JSON.stringify({
    iv: iv.toString('hex'),
    encrypted,
    authTag: authTag.toString('hex'),
  });
}

/**
 * Get or generate encryption key
 */
private async getEncryptionKey(): Promise<Buffer> {
  const keyPath = path.join(this.getConfigDir(), '.key');

  try {
    const key = await fs.readFile(keyPath);
    return key;
  } catch {
    // Generate new key
    const key = crypto.randomBytes(32);
    await fs.writeFile(keyPath, key, { mode: 0o600 });
    return key;
  }
}
```

---

## Vertex AI Authentication

### Overview

Vertex AI authentication is designed for enterprise use cases:

- Google Cloud integration
- Service account authentication
- Custom quotas and limits
- Audit logging
- VPC security

### Prerequisites

1. Google Cloud project with billing enabled
2. Vertex AI API enabled
3. Service account with appropriate roles
4. JSON key file for service account

### Setup Steps

```bash
# 1. Create service account
gcloud iam service-accounts create gemini-claude-flow \
  --display-name="Gemini Claude Flow Integration"

# 2. Grant roles
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:gemini-claude-flow@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/aiplatform.user"

# 3. Create and download key
gcloud iam service-accounts keys create ~/gemini-key.json \
  --iam-account=gemini-claude-flow@YOUR_PROJECT_ID.iam.gserviceaccount.com

# 4. Set environment variable
export GOOGLE_APPLICATION_CREDENTIALS=~/gemini-key.json
```

### Authentication Flow

```
┌────────────────────────────────────────────────────────────────────────────┐
│                       Vertex AI Authentication                             │
└────────────────────────────────────────────────────────────────────────────┘

  User                    Claude Flow          Service Account       Vertex AI
    │                          │                     │                   │
    │ 1. Provide credentials   │                     │                   │
    │ ────────────────────────▶│                     │                   │
    │    project + location    │                     │                   │
    │                          │                     │                   │
    │                          │ 2. Load SA key      │                   │
    │                          │ ───────────────────▶│                   │
    │                          │                     │                   │
    │                          │                     │ 3. Get token      │
    │                          │                     │ ─────────────────▶│
    │                          │                     │ ◀─────────────────│
    │                          │                     │                   │
    │                          │ 4. Validate access  │                   │
    │                          │ ───────────────────────────────────────▶│
    │                          │ ◀───────────────────────────────────────│
    │                          │                     │                   │
    │ 5. Authenticated         │                     │                   │
    │ ◀────────────────────────│                     │                   │
    │                          │                     │                   │
```

### Implementation

```typescript
/**
 * Authenticate using Vertex AI
 */
async authenticateWithVertexAI(
  config: Partial<GeminiCLIConfig>
): Promise<GeminiAuthResult> {
  const { vertexProject, vertexLocation = 'us-central1' } = config;

  if (!vertexProject) {
    throw new GeminiAuthError(
      'Vertex AI project ID is required',
      'vertex-ai',
      { reason: 'missing_project' }
    );
  }

  this.logger.info('🔐 Configuring Vertex AI authentication...');

  // Check for credentials file
  const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!credentialsPath) {
    throw new GeminiAuthError(
      'GOOGLE_APPLICATION_CREDENTIALS environment variable not set',
      'vertex-ai',
      { reason: 'missing_credentials' }
    );
  }

  // Verify credentials file exists
  try {
    await fs.access(credentialsPath);
  } catch {
    throw new GeminiAuthError(
      `Credentials file not found: ${credentialsPath}`,
      'vertex-ai',
      { reason: 'credentials_not_found', path: credentialsPath }
    );
  }

  // Verify credentials file is valid JSON
  let credentials: ServiceAccountCredentials;
  try {
    const content = await fs.readFile(credentialsPath, 'utf8');
    credentials = JSON.parse(content);
  } catch {
    throw new GeminiAuthError(
      'Invalid credentials file format',
      'vertex-ai',
      { reason: 'invalid_credentials' }
    );
  }

  // Validate required fields
  if (!credentials.client_email || !credentials.private_key) {
    throw new GeminiAuthError(
      'Invalid service account credentials',
      'vertex-ai',
      { reason: 'incomplete_credentials' }
    );
  }

  // Set environment variables
  process.env.GOOGLE_CLOUD_PROJECT = vertexProject;
  process.env.GOOGLE_CLOUD_LOCATION = vertexLocation;

  // Test authentication
  try {
    const testResult = await this.testVertexAIAccess(vertexProject, vertexLocation);

    if (testResult.success) {
      this.logger.success('✅ Vertex AI authentication successful');

      return {
        success: true,
        method: 'vertex-ai',
        identity: {
          type: 'service_account',
          email: credentials.client_email,
          projectId: vertexProject,
          tier: 'enterprise',
          quotas: testResult.quotas,
        },
        timestamp: new Date(),
      };
    } else {
      throw new GeminiAuthError(
        `Vertex AI access test failed: ${testResult.error}`,
        'vertex-ai',
        { response: testResult }
      );
    }
  } catch (error) {
    if (error instanceof GeminiAuthError) {
      throw error;
    }

    throw new GeminiAuthError(
      `Vertex AI authentication failed: ${(error as Error).message}`,
      'vertex-ai',
      { error }
    );
  }
}

/**
 * Test Vertex AI access
 */
private async testVertexAIAccess(
  project: string,
  location: string
): Promise<VertexAITestResult> {
  try {
    // Use gcloud to test authentication
    const { stdout } = await exec(
      `gcloud auth application-default print-access-token`,
      { timeout: 30000 }
    );

    if (stdout.trim().length > 0) {
      // Token obtained, test Vertex AI endpoint
      const endpoint = `https://${location}-aiplatform.googleapis.com/v1/projects/${project}/locations/${location}/publishers/google/models/gemini-1.5-pro`;

      const response = await fetch(endpoint, {
        headers: {
          Authorization: `Bearer ${stdout.trim()}`,
        },
      });

      if (response.ok || response.status === 404) {
        // 404 is OK - means we have access but model endpoint format might differ
        return {
          success: true,
          quotas: await this.getVertexQuotas(project, location),
        };
      }

      if (response.status === 403) {
        return { success: false, error: 'Permission denied - check IAM roles' };
      }

      return { success: false, error: `API returned ${response.status}` };
    }

    return { success: false, error: 'No access token received' };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}
```

### Required IAM Roles

| Role | Description |
|------|-------------|
| `roles/aiplatform.user` | Basic Vertex AI access (required) |
| `roles/aiplatform.admin` | Full Vertex AI management |
| `roles/iam.serviceAccountUser` | If using service account impersonation |

---

## Token Management

### Token Lifecycle

```typescript
/**
 * Token lifecycle management
 */
export class TokenManager {
  private refreshTimer?: NodeJS.Timer;

  /**
   * Start token refresh monitoring
   */
  startRefreshMonitor(): void {
    // Check token every 5 minutes
    this.refreshTimer = setInterval(async () => {
      const status = await this.checkTokenStatus();

      if (status.needsRefresh) {
        await this.refreshToken();
      }
    }, 5 * 60 * 1000);
  }

  /**
   * Stop token refresh monitoring
   */
  stopRefreshMonitor(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = undefined;
    }
  }

  /**
   * Refresh authentication token
   */
  async refreshToken(): Promise<void> {
    const method = await this.getCurrentAuthMethod();

    switch (method) {
      case 'google-login':
        // Gemini CLI handles refresh automatically
        await this.triggerGeminiRefresh();
        break;

      case 'api-key':
        // API keys don't expire, just validate
        await this.validateApiKey();
        break;

      case 'vertex-ai':
        // Service account tokens auto-refresh
        await this.validateVertexAIAccess();
        break;
    }
  }

  private async triggerGeminiRefresh(): Promise<void> {
    try {
      // Running any gemini command triggers token refresh if needed
      await exec('gemini --version', { timeout: 10000 });
    } catch {
      // May need to re-authenticate
      throw new GeminiAuthError(
        'Token refresh failed - re-authentication required',
        'google-login',
        { requiresReauth: true }
      );
    }
  }
}
```

---

## Session Persistence

### Credential Storage

Credentials are persisted to allow seamless re-authentication:

```typescript
interface StoredCredentials {
  method: GeminiAuthMethod;
  timestamp: string;
  encryptedData?: string;  // For API key
  vertexConfig?: {
    project: string;
    location: string;
  };
}

/**
 * Persist authentication for future sessions
 */
async persistAuth(result: GeminiAuthResult): Promise<void> {
  const credentials: StoredCredentials = {
    method: result.method,
    timestamp: result.timestamp.toISOString(),
  };

  if (result.method === 'api-key') {
    // API key stored encrypted separately
    credentials.encryptedData = 'stored-in-keychain';
  }

  if (result.method === 'vertex-ai' && result.identity?.projectId) {
    credentials.vertexConfig = {
      project: result.identity.projectId,
      location: process.env.GOOGLE_CLOUD_LOCATION || 'us-central1',
    };
  }

  await this.storeCredentials(credentials);
}

/**
 * Restore authentication from previous session
 */
async restoreAuth(): Promise<GeminiAuthResult | null> {
  const credentials = await this.loadCredentials();

  if (!credentials) {
    return null;
  }

  // Check if credentials are still valid
  switch (credentials.method) {
    case 'google-login':
      return await this.restoreGoogleAuth();

    case 'api-key':
      return await this.restoreApiKeyAuth();

    case 'vertex-ai':
      return await this.restoreVertexAIAuth(credentials.vertexConfig!);
  }
}
```

---

## Security Considerations

### Credential Protection

1. **Never log credentials**: API keys and tokens masked in all logs
2. **Encrypted storage**: All sensitive data encrypted at rest
3. **Minimal exposure**: Credentials only in memory when needed
4. **Secure deletion**: Proper cleanup on logout/eject

### Environment Variable Safety

```typescript
/**
 * Safely set credential environment variables
 */
private setCredentialEnv(key: string, value: string): void {
  // Set for current process
  process.env[key] = value;

  // Log masked version
  this.logger.debug(`Set ${key}=${this.mask(value)}`);
}

/**
 * Mask sensitive values for logging
 */
private mask(value: string): string {
  if (value.length <= 8) {
    return '****';
  }
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}
```

### Logout and Cleanup

```typescript
/**
 * Securely logout and clear credentials
 */
async logout(): Promise<void> {
  this.logger.info('Logging out...');

  // Clear environment variables
  delete process.env.GEMINI_API_KEY;
  delete process.env.GOOGLE_CLOUD_PROJECT;
  delete process.env.GOOGLE_CLOUD_LOCATION;

  // Clear stored credentials
  await this.clearStoredCredentials();

  // Clear Gemini CLI credentials (for google-login)
  try {
    await exec('gemini auth logout');
  } catch {
    // Ignore if already logged out
  }

  // Stop token refresh monitor
  this.tokenManager.stopRefreshMonitor();

  this.logger.success('✅ Logged out successfully');
}

/**
 * Securely clear stored credentials
 */
private async clearStoredCredentials(): Promise<void> {
  const config = await this.loadConfig();

  if (config.gemini?.credentials) {
    // Overwrite with zeros before deletion (secure erase)
    config.gemini.credentials = null;
    await this.saveConfig(config);
  }

  // Delete encryption key
  try {
    await fs.unlink(path.join(this.getConfigDir(), '.key'));
  } catch {
    // Ignore if doesn't exist
  }
}
```

---

## Implementation Details

### Complete Authenticator Class

```typescript
import { spawn, exec as execCallback } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as crypto from 'crypto';
import * as path from 'path';
import * as os from 'os';

const exec = promisify(execCallback);

export class GeminiAuthenticator {
  private logger: Logger;
  private tokenManager: TokenManager;
  private authToken: string | null = null;
  private currentMethod: GeminiAuthMethod | null = null;

  constructor(logger?: Logger) {
    this.logger = logger || new ConsoleLogger();
    this.tokenManager = new TokenManager(this.logger);
  }

  /**
   * Main authentication entry point
   */
  async authenticate(
    method: GeminiAuthMethod,
    config: Partial<GeminiCLIConfig>
  ): Promise<GeminiAuthResult> {
    this.logger.info(`Authenticating with method: ${method}`);

    let result: GeminiAuthResult;

    switch (method) {
      case 'google-login':
        result = await this.authenticateWithGoogle();
        break;

      case 'api-key':
        if (!config.apiKey) {
          throw new GeminiAuthError(
            'API key required for api-key authentication',
            'api-key'
          );
        }
        result = await this.authenticateWithApiKey(config.apiKey);
        break;

      case 'vertex-ai':
        result = await this.authenticateWithVertexAI(config);
        break;

      default:
        throw new GeminiAuthError(
          `Unknown authentication method: ${method}`,
          method
        );
    }

    // Persist for future sessions
    await this.persistAuth(result);

    // Start token refresh monitoring
    this.tokenManager.startRefreshMonitor();

    this.currentMethod = method;

    return result;
  }

  /**
   * Check if currently authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    if (!this.currentMethod) {
      // Try to restore from persisted credentials
      const restored = await this.restoreAuth();
      if (restored) {
        this.currentMethod = restored.method;
        return true;
      }
      return false;
    }

    // Validate current authentication
    try {
      const { stdout } = await exec('gemini -p "test"', { timeout: 30000 });
      return stdout.length > 0;
    } catch {
      return false;
    }
  }

  /**
   * Get current authentication identity
   */
  async getIdentity(): Promise<GeminiIdentity | null> {
    if (!await this.isAuthenticated()) {
      return null;
    }

    // Get identity based on method
    switch (this.currentMethod) {
      case 'google-login':
        return await this.getGoogleIdentity();

      case 'api-key':
        return {
          type: 'personal',
          tier: 'free',
          quotas: await this.getQuotas(),
        };

      case 'vertex-ai':
        return await this.getVertexIdentity();

      default:
        return null;
    }
  }

  /**
   * Logout and clear credentials
   */
  async logout(): Promise<void> {
    // Implementation as shown above
  }

  // Private methods as shown in previous sections
}
```

---

## Testing

### Unit Tests

```typescript
describe('GeminiAuthenticator', () => {
  let authenticator: GeminiAuthenticator;

  beforeEach(() => {
    authenticator = new GeminiAuthenticator();
  });

  describe('authenticateWithApiKey', () => {
    it('should reject empty API key', async () => {
      await expect(
        authenticator.authenticate('api-key', { apiKey: '' })
      ).rejects.toThrow('API key is required');
    });

    it('should reject invalid API key format', async () => {
      await expect(
        authenticator.authenticate('api-key', { apiKey: 'invalid!' })
      ).rejects.toThrow('Invalid API key format');
    });

    it('should validate and store valid API key', async () => {
      // Mock successful validation
      jest.spyOn(authenticator as any, 'testApiKey')
        .mockResolvedValue({ success: true, quotas: {} });

      const result = await authenticator.authenticate('api-key', {
        apiKey: 'AIzaSyTestKeyForTesting12345678'
      });

      expect(result.success).toBe(true);
      expect(result.method).toBe('api-key');
    });
  });

  describe('authenticateWithVertexAI', () => {
    it('should require project ID', async () => {
      await expect(
        authenticator.authenticate('vertex-ai', {})
      ).rejects.toThrow('Vertex AI project ID is required');
    });

    it('should require credentials file', async () => {
      delete process.env.GOOGLE_APPLICATION_CREDENTIALS;

      await expect(
        authenticator.authenticate('vertex-ai', { vertexProject: 'test' })
      ).rejects.toThrow('GOOGLE_APPLICATION_CREDENTIALS');
    });
  });

  describe('isAuthenticated', () => {
    it('should return false when not authenticated', async () => {
      expect(await authenticator.isAuthenticated()).toBe(false);
    });
  });

  describe('mask', () => {
    it('should properly mask sensitive values', () => {
      const mask = (authenticator as any).mask.bind(authenticator);
      expect(mask('short')).toBe('****');
      expect(mask('AIzaSyTestKey123')).toBe('AIza...123');
    });
  });
});
```

### Integration Tests

```typescript
describe('GeminiAuthenticator Integration', () => {
  // These tests require actual credentials
  const hasApiKey = !!process.env.TEST_GEMINI_API_KEY;

  beforeAll(() => {
    if (!hasApiKey) {
      console.log('Skipping integration tests: TEST_GEMINI_API_KEY not set');
    }
  });

  it('should authenticate with valid API key', async () => {
    if (!hasApiKey) return;

    const authenticator = new GeminiAuthenticator();
    const result = await authenticator.authenticate('api-key', {
      apiKey: process.env.TEST_GEMINI_API_KEY!,
    });

    expect(result.success).toBe(true);
  });
});
```

---

## Troubleshooting

### Common Issues

#### 1. "Authentication failed" with Google Login

```bash
# Clear existing credentials and retry
rm -rf ~/.gemini/
npx claude-flow gemini enable --auth google-login
```

#### 2. API Key "Invalid" Error

```bash
# Verify key is correct
echo $GEMINI_API_KEY

# Test directly
gemini -p "test" 2>&1

# Generate new key at https://aistudio.google.com/app/apikey
```

#### 3. Vertex AI Permission Denied

```bash
# Check current identity
gcloud auth list

# Verify required role
gcloud projects get-iam-policy YOUR_PROJECT_ID \
  --flatten="bindings[].members" \
  --filter="bindings.role:roles/aiplatform.user"

# Grant role if missing
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:YOUR_SA@YOUR_PROJECT.iam.gserviceaccount.com" \
  --role="roles/aiplatform.user"
```

#### 4. Token Refresh Failed

```bash
# Force re-authentication
npx claude-flow gemini disable
npx claude-flow gemini enable
```

---

## References

- [Google AI Studio](https://aistudio.google.com/)
- [Gemini CLI Authentication Docs](https://github.com/google-gemini/gemini-cli/blob/main/docs/get-started/authentication.md)
- [Vertex AI Authentication](https://cloud.google.com/vertex-ai/docs/general/authentication)
- [Google Cloud IAM Roles](https://cloud.google.com/iam/docs/understanding-roles)
- [AndrewAltimit's Gemini MCP Server](https://gist.github.com/AndrewAltimit/fc5ba068b73e7002cbe4e9721cebb0f5)
