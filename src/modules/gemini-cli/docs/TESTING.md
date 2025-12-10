# Gemini CLI Module - Testing Strategy

> Comprehensive testing approach for the Gemini CLI integration module with unit tests, integration tests, and end-to-end scenarios.

## Table of Contents

1. [Overview](#overview)
2. [Test Architecture](#test-architecture)
3. [Test Categories](#test-categories)
4. [Unit Tests](#unit-tests)
5. [Integration Tests](#integration-tests)
6. [End-to-End Tests](#end-to-end-tests)
7. [Mock Strategies](#mock-strategies)
8. [Test Fixtures](#test-fixtures)
9. [CI/CD Integration](#cicd-integration)
10. [Coverage Requirements](#coverage-requirements)
11. [Performance Testing](#performance-testing)
12. [Security Testing](#security-testing)

---

## Overview

### Testing Philosophy

The Gemini CLI module follows a test pyramid approach:

```
        ╱╲
       ╱  ╲        E2E Tests (5%)
      ╱────╲       - Full workflows
     ╱      ╲      - Real Gemini API (optional)
    ╱────────╲
   ╱          ╲    Integration Tests (25%)
  ╱────────────╲   - Component interactions
 ╱              ╲  - Mock Gemini CLI
╱────────────────╲
                   Unit Tests (70%)
                   - Isolated components
                   - Full mocking
```

### Test Framework

```json
{
  "framework": "vitest",
  "version": "1.6.0",
  "features": [
    "ESM support",
    "TypeScript native",
    "Concurrent execution",
    "Snapshot testing",
    "Coverage (v8)"
  ]
}
```

### Running Tests

```bash
# Run all Gemini CLI tests
npm test -- tests/modules/gemini-cli/

# Run specific test file
npm test -- tests/modules/gemini-cli/installer.test.ts

# Run with coverage
npm test -- --coverage tests/modules/gemini-cli/

# Run in watch mode
npm test -- --watch tests/modules/gemini-cli/

# Run E2E tests (requires auth)
npm test -- --e2e tests/modules/gemini-cli/e2e/
```

---

## Test Architecture

### Directory Structure

```
tests/
├── modules/
│   └── gemini-cli/
│       ├── unit/
│       │   ├── installer.test.ts
│       │   ├── authenticator.test.ts
│       │   ├── executor.test.ts
│       │   ├── config.test.ts
│       │   ├── cache.test.ts
│       │   └── rate-limiter.test.ts
│       ├── integration/
│       │   ├── cli-execution.test.ts
│       │   ├── mcp-tools.test.ts
│       │   ├── context-sharing.test.ts
│       │   └── fallback.test.ts
│       ├── e2e/
│       │   ├── full-workflow.test.ts
│       │   ├── codebase-analysis.test.ts
│       │   └── security-scan.test.ts
│       ├── fixtures/
│       │   ├── sample-codebase/
│       │   ├── mock-responses/
│       │   └── test-configs/
│       ├── mocks/
│       │   ├── gemini-cli.mock.ts
│       │   ├── gemini-api.mock.ts
│       │   └── file-system.mock.ts
│       └── helpers/
│           ├── test-utils.ts
│           └── assertions.ts
```

### Test Configuration

```typescript
// vitest.config.ts

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    exclude: ['tests/**/e2e/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/modules/gemini-cli/**/*.ts'],
      exclude: ['**/*.d.ts', '**/types.ts'],
      thresholds: {
        global: {
          statements: 80,
          branches: 75,
          functions: 80,
          lines: 80,
        },
      },
    },
    testTimeout: 10000,
    hookTimeout: 10000,
    sequence: {
      shuffle: true,
    },
  },
});
```

---

## Test Categories

### Category Overview

| Category | Scope | Speed | Dependencies | Coverage Target |
|----------|-------|-------|--------------|-----------------|
| Unit | Single function/class | Fast | Mocked | 80%+ |
| Integration | Component interaction | Medium | Partial mock | 70%+ |
| E2E | Full workflow | Slow | Real/Mock | Critical paths |
| Performance | Load/stress | Variable | Depends | Benchmarks |
| Security | Vulnerabilities | Medium | Real inputs | All vectors |

### Test Naming Convention

```typescript
// Pattern: [component].[method].[scenario].[expected_result]

describe('Installer', () => {
  describe('detect', () => {
    it('should find gemini CLI in PATH when installed globally', async () => {});
    it('should return null when gemini CLI not installed', async () => {});
    it('should detect correct version from output', async () => {});
  });
});
```

---

## Unit Tests

### Installer Unit Tests

```typescript
// tests/modules/gemini-cli/unit/installer.test.ts

import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { GeminiInstaller } from '../../../../src/modules/gemini-cli/installer.js';
import { exec } from 'child_process';
import { promisify } from 'util';

vi.mock('child_process');
vi.mock('util', () => ({
  promisify: vi.fn((fn) => fn),
}));

describe('GeminiInstaller', () => {
  let installer: GeminiInstaller;
  let mockExec: Mock;

  beforeEach(() => {
    installer = new GeminiInstaller();
    mockExec = vi.mocked(exec);
    vi.clearAllMocks();
  });

  describe('detect', () => {
    it('should detect gemini CLI when installed', async () => {
      mockExec.mockImplementation((cmd, callback) => {
        if (cmd === 'which gemini') {
          callback(null, { stdout: '/usr/local/bin/gemini\n', stderr: '' });
        } else if (cmd === 'gemini --version') {
          callback(null, { stdout: 'gemini version 0.1.34\n', stderr: '' });
        }
      });

      const result = await installer.detect();

      expect(result.installed).toBe(true);
      expect(result.path).toBe('/usr/local/bin/gemini');
      expect(result.version).toBe('0.1.34');
    });

    it('should return not installed when CLI not found', async () => {
      mockExec.mockImplementation((cmd, callback) => {
        callback(new Error('not found'), { stdout: '', stderr: 'gemini not found' });
      });

      const result = await installer.detect();

      expect(result.installed).toBe(false);
      expect(result.path).toBeUndefined();
    });

    it('should parse version correctly from different formats', async () => {
      const versionFormats = [
        ['gemini version 0.1.34', '0.1.34'],
        ['0.1.34', '0.1.34'],
        ['v0.1.34', '0.1.34'],
        ['gemini 0.1.34-beta.1', '0.1.34-beta.1'],
      ];

      for (const [output, expected] of versionFormats) {
        mockExec.mockImplementation((cmd, callback) => {
          if (cmd.includes('--version')) {
            callback(null, { stdout: output, stderr: '' });
          } else {
            callback(null, { stdout: '/usr/bin/gemini', stderr: '' });
          }
        });

        const result = await installer.detect();
        expect(result.version).toBe(expected);
      }
    });
  });

  describe('install', () => {
    it('should install via npm globally', async () => {
      mockExec.mockImplementation((cmd, callback) => {
        callback(null, { stdout: 'installed', stderr: '' });
      });

      const result = await installer.install({ method: 'npm' });

      expect(mockExec).toHaveBeenCalledWith(
        expect.stringContaining('npm install -g @anthropic-ai/gemini'),
        expect.any(Function)
      );
      expect(result.success).toBe(true);
    });

    it('should handle installation failure', async () => {
      mockExec.mockImplementation((cmd, callback) => {
        callback(new Error('Permission denied'), { stdout: '', stderr: 'EACCES' });
      });

      const result = await installer.install({ method: 'npm' });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Permission denied');
    });

    it('should validate version after installation', async () => {
      let installCalled = false;
      mockExec.mockImplementation((cmd, callback) => {
        if (cmd.includes('npm install')) {
          installCalled = true;
          callback(null, { stdout: 'installed', stderr: '' });
        } else if (cmd.includes('--version') && installCalled) {
          callback(null, { stdout: '0.1.34', stderr: '' });
        } else {
          callback(null, { stdout: '/usr/bin/gemini', stderr: '' });
        }
      });

      const result = await installer.install({ method: 'npm', validateAfter: true });

      expect(result.version).toBe('0.1.34');
    });
  });

  describe('checkVersion', () => {
    it('should return true when version meets minimum', async () => {
      mockExec.mockImplementation((cmd, callback) => {
        callback(null, { stdout: '0.1.34', stderr: '' });
      });

      const result = await installer.checkVersion('0.1.30');
      expect(result.satisfies).toBe(true);
    });

    it('should return false when version below minimum', async () => {
      mockExec.mockImplementation((cmd, callback) => {
        callback(null, { stdout: '0.1.29', stderr: '' });
      });

      const result = await installer.checkVersion('0.1.30');
      expect(result.satisfies).toBe(false);
      expect(result.currentVersion).toBe('0.1.29');
      expect(result.requiredVersion).toBe('0.1.30');
    });
  });
});
```

### Authenticator Unit Tests

```typescript
// tests/modules/gemini-cli/unit/authenticator.test.ts

import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { GeminiAuthenticator } from '../../../../src/modules/gemini-cli/authenticator.js';
import { SecureCredentialStore } from '../../../../src/modules/gemini-cli/credentials.js';

vi.mock('../../../../src/modules/gemini-cli/credentials.js');

describe('GeminiAuthenticator', () => {
  let authenticator: GeminiAuthenticator;
  let mockCredStore: SecureCredentialStore;

  beforeEach(() => {
    mockCredStore = {
      store: vi.fn().mockResolvedValue(undefined),
      retrieve: vi.fn().mockResolvedValue(null),
      delete: vi.fn().mockResolvedValue(undefined),
      exists: vi.fn().mockResolvedValue(false),
    } as unknown as SecureCredentialStore;

    authenticator = new GeminiAuthenticator(mockCredStore);
    vi.clearAllMocks();
  });

  describe('authenticate', () => {
    describe('api-key method', () => {
      it('should validate and store API key', async () => {
        const mockValidate = vi.spyOn(authenticator as any, 'validateApiKey')
          .mockResolvedValue({ valid: true, model: 'gemini-1.5-pro' });

        const result = await authenticator.authenticate({
          method: 'api-key',
          apiKey: 'test-api-key',
        });

        expect(result.success).toBe(true);
        expect(result.method).toBe('api-key');
        expect(mockCredStore.store).toHaveBeenCalledWith('api-key', 'test-api-key');
      });

      it('should reject invalid API key', async () => {
        vi.spyOn(authenticator as any, 'validateApiKey')
          .mockResolvedValue({ valid: false, error: 'Invalid API key' });

        const result = await authenticator.authenticate({
          method: 'api-key',
          apiKey: 'invalid-key',
        });

        expect(result.success).toBe(false);
        expect(result.error).toContain('Invalid API key');
        expect(mockCredStore.store).not.toHaveBeenCalled();
      });
    });

    describe('google-login method', () => {
      it('should initiate OAuth flow', async () => {
        const mockInitiateOAuth = vi.spyOn(authenticator as any, 'initiateOAuthFlow')
          .mockResolvedValue({
            success: true,
            tokens: { accessToken: 'at', refreshToken: 'rt', expiresAt: Date.now() + 3600000 },
            identity: { email: 'user@example.com' },
          });

        const result = await authenticator.authenticate({
          method: 'google-login',
        });

        expect(result.success).toBe(true);
        expect(result.identity?.email).toBe('user@example.com');
      });

      it('should handle OAuth cancellation', async () => {
        vi.spyOn(authenticator as any, 'initiateOAuthFlow')
          .mockResolvedValue({ success: false, error: 'User cancelled' });

        const result = await authenticator.authenticate({
          method: 'google-login',
        });

        expect(result.success).toBe(false);
        expect(result.error).toContain('cancelled');
      });
    });
  });

  describe('checkSession', () => {
    it('should return valid for non-expired session', async () => {
      mockCredStore.retrieve = vi.fn().mockResolvedValue({
        expiresAt: Date.now() + 3600000, // 1 hour from now
        accessToken: 'valid-token',
      });

      const result = await authenticator.checkSession();

      expect(result.valid).toBe(true);
      expect(result.expiresIn).toBeGreaterThan(0);
    });

    it('should return invalid for expired session', async () => {
      mockCredStore.retrieve = vi.fn().mockResolvedValue({
        expiresAt: Date.now() - 1000, // Expired
        accessToken: 'expired-token',
      });

      const result = await authenticator.checkSession();

      expect(result.valid).toBe(false);
      expect(result.expired).toBe(true);
    });

    it('should trigger refresh when within buffer', async () => {
      mockCredStore.retrieve = vi.fn().mockResolvedValue({
        expiresAt: Date.now() + 60000, // 1 minute from now (within 5min buffer)
        accessToken: 'soon-expiring',
        refreshToken: 'refresh-token',
      });

      const mockRefresh = vi.spyOn(authenticator as any, 'refreshSession')
        .mockResolvedValue({ success: true });

      const result = await authenticator.checkSession({ refreshBuffer: 300000 });

      expect(mockRefresh).toHaveBeenCalled();
    });
  });

  describe('logout', () => {
    it('should clear all credentials', async () => {
      await authenticator.logout();

      expect(mockCredStore.delete).toHaveBeenCalledWith('access-token');
      expect(mockCredStore.delete).toHaveBeenCalledWith('refresh-token');
      expect(mockCredStore.delete).toHaveBeenCalledWith('api-key');
    });

    it('should revoke OAuth tokens when requested', async () => {
      mockCredStore.retrieve = vi.fn().mockResolvedValue({
        accessToken: 'token-to-revoke',
      });

      const mockRevoke = vi.spyOn(authenticator as any, 'revokeToken')
        .mockResolvedValue(undefined);

      await authenticator.logout({ revoke: true });

      expect(mockRevoke).toHaveBeenCalledWith('token-to-revoke');
    });
  });
});
```

### Executor Unit Tests

```typescript
// tests/modules/gemini-cli/unit/executor.test.ts

import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { GeminiExecutor } from '../../../../src/modules/gemini-cli/executor.js';
import { GeminiCLI } from '../../../../src/modules/gemini-cli/cli.js';
import { GeminiCache } from '../../../../src/modules/gemini-cli/cache.js';
import { RateLimiter } from '../../../../src/modules/gemini-cli/rate-limiter.js';

vi.mock('../../../../src/modules/gemini-cli/cli.js');
vi.mock('../../../../src/modules/gemini-cli/cache.js');
vi.mock('../../../../src/modules/gemini-cli/rate-limiter.js');

describe('GeminiExecutor', () => {
  let executor: GeminiExecutor;
  let mockCLI: GeminiCLI;
  let mockCache: GeminiCache;
  let mockRateLimiter: RateLimiter;

  beforeEach(() => {
    mockCLI = {
      execute: vi.fn().mockResolvedValue({ success: true, output: '{}' }),
    } as unknown as GeminiCLI;

    mockCache = {
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn().mockResolvedValue(undefined),
      generateKey: vi.fn().mockReturnValue('cache-key'),
    } as unknown as GeminiCache;

    mockRateLimiter = {
      acquire: vi.fn().mockResolvedValue(true),
      release: vi.fn(),
    } as unknown as RateLimiter;

    executor = new GeminiExecutor(mockCLI, mockCache, mockRateLimiter);
    vi.clearAllMocks();
  });

  describe('execute', () => {
    it('should return cached result when available', async () => {
      const cachedResult = { summary: 'cached analysis' };
      mockCache.get = vi.fn().mockResolvedValue(cachedResult);

      const result = await executor.execute('codebase_analyze', { target: '.' });

      expect(result).toEqual(cachedResult);
      expect(mockCLI.execute).not.toHaveBeenCalled();
    });

    it('should skip cache when noCache option set', async () => {
      mockCache.get = vi.fn().mockResolvedValue({ cached: true });
      mockCLI.execute = vi.fn().mockResolvedValue({
        success: true,
        output: JSON.stringify({ fresh: true }),
      });

      const result = await executor.execute(
        'codebase_analyze',
        { target: '.' },
        { noCache: true }
      );

      expect(result.fresh).toBe(true);
      expect(mockCache.get).not.toHaveBeenCalled();
    });

    it('should wait for rate limiter before executing', async () => {
      const executionOrder: string[] = [];

      mockRateLimiter.acquire = vi.fn().mockImplementation(async () => {
        executionOrder.push('rate-limiter');
        return true;
      });

      mockCLI.execute = vi.fn().mockImplementation(async () => {
        executionOrder.push('cli-execute');
        return { success: true, output: '{}' };
      });

      await executor.execute('codebase_analyze', { target: '.' });

      expect(executionOrder).toEqual(['rate-limiter', 'cli-execute']);
    });

    it('should call progress callback during execution', async () => {
      const progressUpdates: number[] = [];

      mockCLI.execute = vi.fn().mockImplementation(async (cmd, opts) => {
        if (opts.onProgress) {
          opts.onProgress(25, 'Scanning...');
          opts.onProgress(50, 'Analyzing...');
          opts.onProgress(100, 'Complete');
        }
        return { success: true, output: '{}' };
      });

      await executor.execute(
        'codebase_analyze',
        { target: '.' },
        {
          onProgress: (progress, message) => {
            progressUpdates.push(progress);
          },
        }
      );

      expect(progressUpdates).toEqual([25, 50, 100]);
    });
  });

  describe('buildCommand', () => {
    it('should build correct command for codebase_analyze', () => {
      const cmd = (executor as any).buildCommand('codebase_analyze', {
        target: './src',
        depth: 'deep',
        focus: ['quality', 'patterns'],
      });

      expect(cmd).toContain('analyze');
      expect(cmd).toContain('./src');
      expect(cmd).toContain('--depth deep');
      expect(cmd).toContain('--focus quality,patterns');
    });

    it('should build correct command for security_scan', () => {
      const cmd = (executor as any).buildCommand('security_scan', {
        target: '.',
        scanTypes: ['injection', 'xss'],
        severity: 'high',
      });

      expect(cmd).toContain('security');
      expect(cmd).toContain('--scan-types injection,xss');
      expect(cmd).toContain('--severity high');
    });
  });

  describe('parseOutput', () => {
    it('should parse JSON output correctly', () => {
      const output = JSON.stringify({ summary: 'test', findings: [] });
      const result = (executor as any).parseOutput(output, 'json');

      expect(result.summary).toBe('test');
      expect(result.findings).toEqual([]);
    });

    it('should handle malformed JSON gracefully', () => {
      const output = 'not valid json {';

      expect(() => (executor as any).parseOutput(output, 'json')).toThrow();
    });

    it('should parse structured text output', () => {
      const output = `
## Summary
Test summary

## Findings
- Finding 1
- Finding 2
      `;

      const result = (executor as any).parseOutput(output, 'structured');

      expect(result.summary).toContain('Test summary');
      expect(result.findings).toHaveLength(2);
    });
  });

  describe('error handling', () => {
    it('should handle CLI execution failure', async () => {
      mockCLI.execute = vi.fn().mockResolvedValue({
        success: false,
        error: 'CLI crashed',
        exitCode: 1,
      });

      await expect(executor.execute('codebase_analyze', { target: '.' }))
        .rejects.toThrow('CLI crashed');
    });

    it('should handle timeout', async () => {
      mockCLI.execute = vi.fn().mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10000));
        return { success: true, output: '{}' };
      });

      await expect(
        executor.execute('codebase_analyze', { target: '.' }, { timeout: 100 })
      ).rejects.toThrow('timeout');
    });

    it('should release rate limiter on error', async () => {
      mockCLI.execute = vi.fn().mockRejectedValue(new Error('Failed'));

      await expect(executor.execute('codebase_analyze', { target: '.' }))
        .rejects.toThrow();

      expect(mockRateLimiter.release).toHaveBeenCalled();
    });
  });
});
```

### Cache Unit Tests

```typescript
// tests/modules/gemini-cli/unit/cache.test.ts

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { GeminiCache } from '../../../../src/modules/gemini-cli/cache.js';
import * as fs from 'fs/promises';

vi.mock('fs/promises');

describe('GeminiCache', () => {
  let cache: GeminiCache;

  beforeEach(() => {
    cache = new GeminiCache({
      memoryCache: { enabled: true, maxSize: 100 * 1024, ttl: 60000 },
      fileCache: { enabled: true, maxSize: 1024 * 1024, ttl: 3600000 },
      directory: '/tmp/cache',
    });
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe('get', () => {
    it('should return null for non-existent key', async () => {
      const result = await cache.get('non-existent');
      expect(result).toBeNull();
    });

    it('should return cached value from memory', async () => {
      await cache.set('key1', { data: 'test' });
      const result = await cache.get('key1');

      expect(result).toEqual({ data: 'test' });
    });

    it('should return null for expired entry', async () => {
      await cache.set('key1', { data: 'test' });

      // Advance time past TTL
      vi.advanceTimersByTime(70000);

      const result = await cache.get('key1');
      expect(result).toBeNull();
    });

    it('should fall back to file cache when not in memory', async () => {
      const fileContent = JSON.stringify({
        value: { data: 'from-file' },
        expiresAt: Date.now() + 3600000,
      });

      (fs.readFile as any).mockResolvedValue(fileContent);
      (fs.stat as any).mockResolvedValue({ mtime: new Date() });

      const result = await cache.get('file-key');

      expect(result).toEqual({ data: 'from-file' });
    });
  });

  describe('set', () => {
    it('should store value in memory cache', async () => {
      await cache.set('key1', { data: 'test' });

      const memoryStats = cache.getMemoryStats();
      expect(memoryStats.entries).toBe(1);
    });

    it('should write to file cache', async () => {
      await cache.set('key1', { data: 'test' });

      expect(fs.writeFile).toHaveBeenCalled();
    });

    it('should evict oldest entries when memory full', async () => {
      // Fill cache with entries
      for (let i = 0; i < 100; i++) {
        await cache.set(`key${i}`, { data: 'x'.repeat(1000) });
      }

      // Add one more that should trigger eviction
      await cache.set('new-key', { data: 'new' });

      const memoryStats = cache.getMemoryStats();
      expect(memoryStats.size).toBeLessThanOrEqual(100 * 1024);
    });

    it('should compress large values when enabled', async () => {
      const largeData = { data: 'x'.repeat(10000) };

      await cache.set('large-key', largeData, { compress: true });

      const writeCall = (fs.writeFile as any).mock.calls[0];
      const writtenData = writeCall[1];

      // Compressed data should be smaller
      expect(writtenData.length).toBeLessThan(JSON.stringify(largeData).length);
    });
  });

  describe('generateKey', () => {
    it('should generate consistent keys for same input', () => {
      const key1 = cache.generateKey('tool', { target: '.', depth: 'deep' });
      const key2 = cache.generateKey('tool', { target: '.', depth: 'deep' });

      expect(key1).toBe(key2);
    });

    it('should generate different keys for different params', () => {
      const key1 = cache.generateKey('tool', { target: '.', depth: 'deep' });
      const key2 = cache.generateKey('tool', { target: '.', depth: 'surface' });

      expect(key1).not.toBe(key2);
    });

    it('should handle undefined and null values', () => {
      const key = cache.generateKey('tool', { a: undefined, b: null, c: 'value' });

      expect(key).toBeDefined();
      expect(typeof key).toBe('string');
    });
  });

  describe('clear', () => {
    it('should clear all cache entries', async () => {
      await cache.set('key1', { data: 'test1' });
      await cache.set('key2', { data: 'test2' });

      await cache.clear();

      expect(await cache.get('key1')).toBeNull();
      expect(await cache.get('key2')).toBeNull();
    });

    it('should clear only entries matching pattern', async () => {
      await cache.set('analysis:key1', { data: 'test1' });
      await cache.set('security:key2', { data: 'test2' });

      await cache.clear({ pattern: 'analysis:*' });

      expect(await cache.get('analysis:key1')).toBeNull();
      expect(await cache.get('security:key2')).toEqual({ data: 'test2' });
    });

    it('should clear entries older than threshold', async () => {
      await cache.set('old-key', { data: 'old' });
      vi.advanceTimersByTime(60000);
      await cache.set('new-key', { data: 'new' });

      await cache.clear({ olderThan: 30000 });

      expect(await cache.get('old-key')).toBeNull();
      expect(await cache.get('new-key')).toEqual({ data: 'new' });
    });
  });
});
```

---

## Integration Tests

### CLI Execution Integration Tests

```typescript
// tests/modules/gemini-cli/integration/cli-execution.test.ts

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { GeminiModuleManager } from '../../../../src/modules/gemini-cli/manager.js';
import { createMockCLI } from '../mocks/gemini-cli.mock.js';
import { createTestConfig } from '../helpers/test-utils.js';

describe('CLI Execution Integration', () => {
  let manager: GeminiModuleManager;
  let mockCLI: ReturnType<typeof createMockCLI>;

  beforeAll(async () => {
    mockCLI = createMockCLI();
    manager = new GeminiModuleManager(createTestConfig({
      mockCLI: mockCLI.instance,
    }));

    await manager.initialize();
  });

  afterAll(async () => {
    await manager.shutdown();
  });

  describe('codebase analysis flow', () => {
    it('should complete full analysis workflow', async () => {
      // Setup mock responses
      mockCLI.setResponse('analyze', {
        summary: 'Test codebase analysis',
        findings: [
          { type: 'quality', severity: 'medium', message: 'Complex function' },
        ],
        metrics: { linesOfCode: 1000 },
        recommendations: [
          { priority: 'high', title: 'Refactor complex functions' },
        ],
      });

      const result = await manager.analyze({
        target: './src',
        depth: 'moderate',
        focus: ['quality'],
      });

      expect(result.success).toBe(true);
      expect(result.data.summary).toBeDefined();
      expect(result.data.findings).toHaveLength(1);
      expect(result.data.metrics.linesOfCode).toBe(1000);
    });

    it('should handle large codebase with chunking', async () => {
      // Simulate large codebase response
      mockCLI.setResponse('analyze', (params) => {
        // Return different results for different chunks
        return {
          summary: `Analysis of chunk ${params.chunk || 1}`,
          findings: Array(10).fill({ type: 'quality' }),
          partial: params.chunk < 3,
        };
      });

      const result = await manager.analyze({
        target: '.',
        depth: 'deep',
        maxFiles: 1000,
      });

      // Should have aggregated results from all chunks
      expect(result.data.findings.length).toBeGreaterThan(10);
      expect(mockCLI.getCallCount()).toBeGreaterThan(1);
    });
  });

  describe('authentication integration', () => {
    it('should use stored credentials for requests', async () => {
      await manager.authenticate({
        method: 'api-key',
        apiKey: 'test-api-key',
      });

      mockCLI.setResponse('analyze', { summary: 'authenticated request' });

      await manager.analyze({ target: '.' });

      const lastCall = mockCLI.getLastCall();
      expect(lastCall.env.GEMINI_API_KEY).toBe('test-api-key');
    });

    it('should refresh expired tokens automatically', async () => {
      const mockRefresh = vi.fn().mockResolvedValue({
        accessToken: 'new-token',
        expiresAt: Date.now() + 3600000,
      });

      manager.authenticator.refreshSession = mockRefresh;

      // Set expired session
      await manager.setSession({
        accessToken: 'old-token',
        expiresAt: Date.now() - 1000,
        refreshToken: 'refresh-token',
      });

      mockCLI.setResponse('analyze', { summary: 'success' });

      await manager.analyze({ target: '.' });

      expect(mockRefresh).toHaveBeenCalled();
    });
  });

  describe('caching integration', () => {
    it('should cache and retrieve analysis results', async () => {
      mockCLI.setResponse('analyze', { summary: 'cached result' });

      // First call
      await manager.analyze({ target: './src', depth: 'surface' });
      const callCount1 = mockCLI.getCallCount();

      // Second call (should use cache)
      const result2 = await manager.analyze({ target: './src', depth: 'surface' });
      const callCount2 = mockCLI.getCallCount();

      expect(callCount2).toBe(callCount1); // No additional CLI call
      expect(result2.data.summary).toBe('cached result');
      expect(result2.fromCache).toBe(true);
    });

    it('should invalidate cache when file changes detected', async () => {
      // Initial analysis
      mockCLI.setResponse('analyze', { summary: 'initial' });
      await manager.analyze({ target: './src' });

      // Simulate file change
      await manager.cache.invalidate({ target: './src' });

      // Second analysis should hit CLI
      mockCLI.setResponse('analyze', { summary: 'after change' });
      const result = await manager.analyze({ target: './src' });

      expect(result.data.summary).toBe('after change');
      expect(result.fromCache).toBe(false);
    });
  });

  describe('rate limiting integration', () => {
    it('should queue requests when rate limited', async () => {
      const results: number[] = [];

      mockCLI.setResponse('analyze', (params, index) => {
        results.push(index);
        return { summary: `result ${index}` };
      });

      // Make multiple concurrent requests
      const promises = Array(10).fill(null).map((_, i) =>
        manager.analyze({ target: `./${i}` })
      );

      await Promise.all(promises);

      // Requests should have been serialized/rate-limited
      expect(results).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    });
  });
});
```

### MCP Tools Integration Tests

```typescript
// tests/modules/gemini-cli/integration/mcp-tools.test.ts

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createMCPServer } from '../../../../src/mcp/server-factory.js';
import { MCPClient } from '../../../../src/mcp/client.js';
import { createMockGeminiManager } from '../mocks/gemini-manager.mock.js';

describe('MCP Tools Integration', () => {
  let server: any;
  let client: MCPClient;
  let mockManager: ReturnType<typeof createMockGeminiManager>;

  beforeAll(async () => {
    mockManager = createMockGeminiManager();

    server = await createMCPServer({
      transport: 'stdio',
      modules: {
        geminiCli: {
          enabled: true,
          manager: mockManager.instance,
        },
      },
    });

    await server.start();
    client = new MCPClient(server);
  });

  afterAll(async () => {
    await server.stop();
  });

  describe('tool registration', () => {
    it('should register all gemini-cli tools', async () => {
      const tools = await client.listTools();
      const geminiTools = tools.filter((t: any) =>
        t.name.startsWith('mcp__gemini-cli__')
      );

      expect(geminiTools).toHaveLength(5);
      expect(geminiTools.map((t: any) => t.name)).toContain('mcp__gemini-cli__codebase_analyze');
      expect(geminiTools.map((t: any) => t.name)).toContain('mcp__gemini-cli__security_scan');
    });

    it('should have correct input schemas', async () => {
      const tools = await client.listTools();
      const analyzeTool = tools.find((t: any) => t.name === 'mcp__gemini-cli__codebase_analyze');

      expect(analyzeTool.inputSchema.type).toBe('object');
      expect(analyzeTool.inputSchema.properties.target).toBeDefined();
      expect(analyzeTool.inputSchema.properties.depth).toBeDefined();
    });
  });

  describe('tool execution', () => {
    it('should execute codebase_analyze tool', async () => {
      mockManager.setAnalysisResult({
        summary: 'MCP tool execution test',
        findings: [],
        recommendations: [],
      });

      const result = await client.callTool('mcp__gemini-cli__codebase_analyze', {
        target: '.',
        depth: 'surface',
      });

      expect(result.isError).toBe(false);
      expect(result.content[0].type).toBe('json');

      const data = JSON.parse(result.content[0].text);
      expect(data.summary).toBe('MCP tool execution test');
    });

    it('should return error when not authenticated', async () => {
      mockManager.setAuthenticated(false);

      const result = await client.callTool('mcp__gemini-cli__codebase_analyze', {
        target: '.',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('not authenticated');
    });

    it('should support async execution', async () => {
      mockManager.setAnalysisDelay(5000); // 5 second delay
      mockManager.setAnalysisResult({ summary: 'async result' });

      const result = await client.callTool(
        'mcp__gemini-cli__codebase_analyze',
        { target: '.', depth: 'deep' },
        { mode: 'async' }
      );

      expect(result.job_handle).toBeDefined();
      expect(result.status).toBe('queued');

      // Poll for completion
      let status;
      do {
        await new Promise(r => setTimeout(r, 500));
        status = await client.pollJob(result.job_handle);
      } while (status.status === 'in_progress');

      expect(status.status).toBe('completed');
      expect(status.result.summary).toBe('async result');
    });
  });

  describe('progressive disclosure', () => {
    it('should show tools based on context', async () => {
      const context = {
        query: 'analyze the security of my application',
        fileContext: { hasSourceFiles: true },
      };

      const visibleTools = await server.getVisibleTools(context);

      expect(visibleTools).toContain('mcp__gemini-cli__security_scan');
    });

    it('should hide tools when module disabled', async () => {
      mockManager.setEnabled(false);

      const tools = await client.listTools();
      const geminiTools = tools.filter((t: any) =>
        t.name.startsWith('mcp__gemini-cli__')
      );

      expect(geminiTools).toHaveLength(0);
    });
  });
});
```

---

## End-to-End Tests

### Full Workflow E2E Tests

```typescript
// tests/modules/gemini-cli/e2e/full-workflow.test.ts

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs/promises';

/**
 * E2E tests require:
 * - GEMINI_API_KEY environment variable
 * - Or GEMINI_E2E_MOCK=true to use mock server
 */

const USE_MOCK = process.env.GEMINI_E2E_MOCK === 'true';
const FIXTURES_DIR = path.join(__dirname, '../fixtures/sample-codebase');

describe('E2E: Full Workflow', () => {
  beforeAll(async () => {
    // Ensure fixtures exist
    await fs.access(FIXTURES_DIR);

    if (!USE_MOCK && !process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY required for E2E tests. Set GEMINI_E2E_MOCK=true to use mock.');
    }
  });

  describe('module lifecycle', () => {
    it('should enable, authenticate, use, and disable module', async () => {
      // 1. Enable module
      const enableResult = await runCommand('gemini enable');
      expect(enableResult.exitCode).toBe(0);
      expect(enableResult.stdout).toContain('enabled successfully');

      // 2. Check status
      const statusResult = await runCommand('gemini status');
      expect(statusResult.exitCode).toBe(0);
      expect(statusResult.stdout).toContain('Enabled');

      // 3. Authenticate (using API key for E2E)
      const authResult = await runCommand('gemini auth api-key', {
        env: { GEMINI_API_KEY: process.env.GEMINI_API_KEY },
      });
      expect(authResult.exitCode).toBe(0);

      // 4. Run analysis
      const analyzeResult = await runCommand(`gemini analyze ${FIXTURES_DIR} --depth surface`);
      expect(analyzeResult.exitCode).toBe(0);
      expect(analyzeResult.stdout).toContain('Summary');

      // 5. Disable module
      const disableResult = await runCommand('gemini disable --force');
      expect(disableResult.exitCode).toBe(0);
    }, 120000); // 2 minute timeout
  });

  describe('codebase analysis', () => {
    beforeAll(async () => {
      await runCommand('gemini enable');
      await runCommand('gemini auth api-key', {
        env: { GEMINI_API_KEY: process.env.GEMINI_API_KEY },
      });
    });

    it('should analyze sample codebase and produce valid output', async () => {
      const result = await runCommand(`gemini analyze ${FIXTURES_DIR} --output json`);

      expect(result.exitCode).toBe(0);

      const output = JSON.parse(result.stdout);
      expect(output.summary).toBeDefined();
      expect(Array.isArray(output.findings)).toBe(true);
      expect(Array.isArray(output.recommendations)).toBe(true);
    }, 60000);

    it('should generate architecture diagrams', async () => {
      const result = await runCommand(
        `gemini architecture ${FIXTURES_DIR} --format mermaid --output /tmp/arch.md`
      );

      expect(result.exitCode).toBe(0);

      const content = await fs.readFile('/tmp/arch.md', 'utf-8');
      expect(content).toContain('```mermaid');
    }, 60000);

    it('should detect security issues in vulnerable code', async () => {
      const vulnerableDir = path.join(FIXTURES_DIR, 'vulnerable');

      const result = await runCommand(
        `gemini security ${vulnerableDir} --severity low --output json`
      );

      expect(result.exitCode).toBe(0);

      const output = JSON.parse(result.stdout);
      expect(output.summary.totalIssues).toBeGreaterThan(0);
    }, 60000);
  });
});

// Helper function
async function runCommand(
  cmd: string,
  options: { env?: Record<string, string> } = {}
): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    const child = spawn('npx', ['claude-flow', ...cmd.split(' ')], {
      env: { ...process.env, ...options.env },
      shell: true,
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => { stdout += data; });
    child.stderr.on('data', (data) => { stderr += data; });

    child.on('close', (exitCode) => {
      resolve({ exitCode: exitCode || 0, stdout, stderr });
    });
  });
}
```

---

## Mock Strategies

### Gemini CLI Mock

```typescript
// tests/modules/gemini-cli/mocks/gemini-cli.mock.ts

import { vi } from 'vitest';

export function createMockCLI() {
  const responses = new Map<string, any>();
  const calls: Array<{ command: string; args: any; env: any }> = [];
  let callCount = 0;

  const execute = vi.fn(async (command: string, args: any, env: any) => {
    calls.push({ command, args, env });
    callCount++;

    const responseKey = command.split(' ')[0]; // e.g., 'analyze' from 'analyze ./src'
    const response = responses.get(responseKey);

    if (typeof response === 'function') {
      return { success: true, output: JSON.stringify(response(args, callCount)) };
    }

    if (response) {
      return { success: true, output: JSON.stringify(response) };
    }

    return { success: true, output: '{}' };
  });

  return {
    instance: { execute },
    setResponse: (command: string, response: any) => {
      responses.set(command, response);
    },
    getCallCount: () => callCount,
    getLastCall: () => calls[calls.length - 1],
    getCalls: () => [...calls],
    reset: () => {
      responses.clear();
      calls.length = 0;
      callCount = 0;
      execute.mockClear();
    },
  };
}
```

### Gemini API Mock Server

```typescript
// tests/modules/gemini-cli/mocks/gemini-api.mock.ts

import { createServer, Server } from 'http';

export function createMockGeminiAPI(): {
  server: Server;
  url: string;
  setResponse: (response: any) => void;
  close: () => Promise<void>;
} {
  let mockResponse: any = { summary: 'mock response' };

  const server = createServer((req, res) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      // Validate API key
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith('Bearer ')) {
        res.writeHead(401);
        res.end(JSON.stringify({ error: 'Unauthorized' }));
        return;
      }

      // Return mock response
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        candidates: [{
          content: {
            parts: [{ text: JSON.stringify(mockResponse) }],
          },
        }],
      }));
    });
  });

  const port = 9999 + Math.floor(Math.random() * 1000);
  server.listen(port);

  return {
    server,
    url: `http://localhost:${port}`,
    setResponse: (response: any) => { mockResponse = response; },
    close: () => new Promise((resolve) => server.close(() => resolve())),
  };
}
```

---

## Test Fixtures

### Sample Codebase

```
tests/modules/gemini-cli/fixtures/sample-codebase/
├── src/
│   ├── index.ts
│   ├── utils/
│   │   ├── helpers.ts
│   │   └── validation.ts
│   ├── services/
│   │   ├── api.ts
│   │   └── auth.ts
│   └── components/
│       ├── Button.tsx
│       └── Form.tsx
├── tests/
│   └── utils.test.ts
├── vulnerable/
│   ├── sql-injection.ts
│   ├── xss-example.tsx
│   └── hardcoded-secrets.ts
├── package.json
└── tsconfig.json
```

### Mock Response Templates

```typescript
// tests/modules/gemini-cli/fixtures/mock-responses/index.ts

export const mockAnalysisResponse = {
  summary: 'Test codebase follows good practices overall.',
  findings: [
    {
      type: 'quality',
      severity: 'medium',
      location: 'src/utils/helpers.ts:45',
      message: 'Function exceeds complexity threshold',
      suggestion: 'Consider breaking into smaller functions',
    },
  ],
  metrics: {
    linesOfCode: 1234,
    filesAnalyzed: 15,
    complexity: 3.2,
    duplication: 2.5,
  },
  recommendations: [
    {
      priority: 'medium',
      category: 'quality',
      title: 'Reduce function complexity',
      description: 'Several functions exceed the recommended complexity.',
      effort: '2-4 hours',
      impact: 'Improved maintainability',
    },
  ],
  tokensUsed: 25000,
  analysisTime: 12.5,
};

export const mockSecurityResponse = {
  summary: {
    totalIssues: 3,
    critical: 1,
    high: 1,
    medium: 1,
    low: 0,
    info: 0,
    securityScore: 45,
  },
  vulnerabilities: [
    {
      id: 'VULN-001',
      type: 'injection',
      severity: 'critical',
      location: 'vulnerable/sql-injection.ts:12',
      title: 'SQL Injection',
      description: 'User input directly in SQL query',
      cwe: 'CWE-89',
      owasp: 'A03:2021',
      remediation: 'Use parameterized queries',
    },
  ],
  secretsFound: [],
  dependencyVulnerabilities: [],
};
```

---

## CI/CD Integration

### GitHub Actions Workflow

```yaml
# .github/workflows/gemini-cli-tests.yml

name: Gemini CLI Module Tests

on:
  push:
    paths:
      - 'src/modules/gemini-cli/**'
      - 'tests/modules/gemini-cli/**'
  pull_request:
    paths:
      - 'src/modules/gemini-cli/**'
      - 'tests/modules/gemini-cli/**'

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run unit tests
        run: npm test -- tests/modules/gemini-cli/unit/

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
          flags: gemini-cli-unit

  integration-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run integration tests
        run: npm test -- tests/modules/gemini-cli/integration/

  e2e-tests:
    runs-on: ubuntu-latest
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run E2E tests (mock mode)
        run: GEMINI_E2E_MOCK=true npm test -- tests/modules/gemini-cli/e2e/
        env:
          GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}
```

---

## Coverage Requirements

### Minimum Coverage Thresholds

| Category | Statements | Branches | Functions | Lines |
|----------|------------|----------|-----------|-------|
| Overall | 80% | 75% | 80% | 80% |
| Core (installer, auth, executor) | 90% | 85% | 90% | 90% |
| MCP Tools | 85% | 80% | 85% | 85% |
| Utilities (cache, rate-limiter) | 80% | 75% | 80% | 80% |

### Coverage Exceptions

```typescript
// vitest.config.ts coverage.exclude additions

{
  exclude: [
    // Type definitions
    '**/*.d.ts',
    '**/types.ts',
    '**/types/**',

    // Configuration files
    '**/config.ts',

    // CLI entry points (tested via E2E)
    '**/cli/**',

    // Generated code
    '**/generated/**',
  ],
}
```

---

## Performance Testing

### Benchmark Tests

```typescript
// tests/modules/gemini-cli/performance/benchmarks.test.ts

import { describe, it, expect } from 'vitest';
import { GeminiCache } from '../../../../src/modules/gemini-cli/cache.js';

describe('Performance Benchmarks', () => {
  describe('cache performance', () => {
    it('should handle 1000 cache operations in under 100ms', async () => {
      const cache = new GeminiCache({ memoryCache: { enabled: true, maxSize: 100 * 1024 * 1024 } });

      const start = performance.now();

      for (let i = 0; i < 1000; i++) {
        await cache.set(`key-${i}`, { data: `value-${i}` });
        await cache.get(`key-${i}`);
      }

      const duration = performance.now() - start;
      expect(duration).toBeLessThan(100);
    });
  });

  describe('rate limiter performance', () => {
    it('should process 1000 requests with minimal overhead', async () => {
      // Implementation
    });
  });
});
```

---

## Security Testing

### Security Test Cases

```typescript
// tests/modules/gemini-cli/security/security.test.ts

import { describe, it, expect } from 'vitest';
import { GeminiInputValidator } from '../../../../src/modules/gemini-cli/validation.js';

describe('Security Tests', () => {
  describe('input validation', () => {
    it('should reject path traversal attempts', async () => {
      const validator = new GeminiInputValidator();

      const result = await validator.validate('codebase_analyze', {
        target: '../../../etc/passwd',
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('path traversal');
    });

    it('should reject command injection in patterns', async () => {
      const validator = new GeminiInputValidator();

      const result = await validator.validate('codebase_analyze', {
        excludePatterns: ['**/*; rm -rf /'],
      });

      expect(result.valid).toBe(false);
    });

    it('should sanitize output to remove secrets', async () => {
      // Implementation
    });
  });

  describe('credential handling', () => {
    it('should not log API keys', async () => {
      // Implementation
    });

    it('should encrypt stored credentials', async () => {
      // Implementation
    });
  });
});
```

---

## Related Documentation

- [TYPES.md](./TYPES.md) - TypeScript interfaces for types used in tests
- [CONFIG-SCHEMA.md](./CONFIG-SCHEMA.md) - Configuration options for test setup
- [EXECUTOR.md](./EXECUTOR.md) - Executor behavior being tested

---

*Last Updated: December 2025*
*Test Framework: Vitest 1.6.0*
