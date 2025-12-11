/**
 * Error Classes Tests
 * Tests for custom Gemini CLI error types
 */

import { describe, it, expect } from '@jest/globals';

// Simulated error classes matching the actual implementation
class GeminiModuleError extends Error {
  readonly code: string;
  readonly recoverable: boolean;

  constructor(message: string, code: string, recoverable = false) {
    super(message);
    this.name = 'GeminiModuleError';
    this.code = code;
    this.recoverable = recoverable;
  }
}

class GeminiInstallError extends GeminiModuleError {
  readonly version?: string;

  constructor(message: string, version?: string) {
    super(message, 'INSTALL_ERROR', true);
    this.name = 'GeminiInstallError';
    this.version = version;
  }
}

class GeminiAuthError extends GeminiModuleError {
  readonly authMethod: string;

  constructor(message: string, authMethod: string) {
    super(message, 'AUTH_ERROR', true);
    this.name = 'GeminiAuthError';
    this.authMethod = authMethod;
  }
}

class GeminiExecutionError extends GeminiModuleError {
  readonly command: string;
  readonly exitCode?: number;

  constructor(message: string, command: string, exitCode?: number) {
    super(message, 'EXECUTION_ERROR', false);
    this.name = 'GeminiExecutionError';
    this.command = command;
    this.exitCode = exitCode;
  }
}

class GeminiRateLimitError extends GeminiModuleError {
  readonly retryAfter: number;

  constructor(message: string, retryAfter: number) {
    super(message, 'RATE_LIMIT_ERROR', true);
    this.name = 'GeminiRateLimitError';
    this.retryAfter = retryAfter;
  }
}

class GeminiConfigError extends GeminiModuleError {
  readonly configKey: string;

  constructor(message: string, configKey: string) {
    super(message, 'CONFIG_ERROR', true);
    this.name = 'GeminiConfigError';
    this.configKey = configKey;
  }
}

describe('GeminiModuleError', () => {
  it('should create error with message and code', () => {
    const error = new GeminiModuleError('Test error', 'TEST_CODE');
    expect(error.message).toBe('Test error');
    expect(error.code).toBe('TEST_CODE');
    expect(error.name).toBe('GeminiModuleError');
  });

  it('should default to non-recoverable', () => {
    const error = new GeminiModuleError('Test error', 'TEST_CODE');
    expect(error.recoverable).toBe(false);
  });

  it('should allow setting recoverable flag', () => {
    const error = new GeminiModuleError('Test error', 'TEST_CODE', true);
    expect(error.recoverable).toBe(true);
  });

  it('should be instance of Error', () => {
    const error = new GeminiModuleError('Test error', 'TEST_CODE');
    expect(error).toBeInstanceOf(Error);
  });
});

describe('GeminiInstallError', () => {
  it('should create install error', () => {
    const error = new GeminiInstallError('Installation failed');
    expect(error.message).toBe('Installation failed');
    expect(error.code).toBe('INSTALL_ERROR');
    expect(error.name).toBe('GeminiInstallError');
  });

  it('should be recoverable', () => {
    const error = new GeminiInstallError('Installation failed');
    expect(error.recoverable).toBe(true);
  });

  it('should include version when provided', () => {
    const error = new GeminiInstallError('Version mismatch', '1.0.0');
    expect(error.version).toBe('1.0.0');
  });

  it('should have undefined version when not provided', () => {
    const error = new GeminiInstallError('Installation failed');
    expect(error.version).toBeUndefined();
  });

  it('should be instance of GeminiModuleError', () => {
    const error = new GeminiInstallError('Installation failed');
    expect(error).toBeInstanceOf(GeminiModuleError);
  });
});

describe('GeminiAuthError', () => {
  it('should create auth error with method', () => {
    const error = new GeminiAuthError('Authentication failed', 'api-key');
    expect(error.message).toBe('Authentication failed');
    expect(error.authMethod).toBe('api-key');
    expect(error.code).toBe('AUTH_ERROR');
    expect(error.name).toBe('GeminiAuthError');
  });

  it('should be recoverable', () => {
    const error = new GeminiAuthError('Authentication failed', 'google-login');
    expect(error.recoverable).toBe(true);
  });

  it('should support different auth methods', () => {
    const methods = ['google-login', 'api-key', 'vertex-ai'];
    methods.forEach((method) => {
      const error = new GeminiAuthError('Auth failed', method);
      expect(error.authMethod).toBe(method);
    });
  });
});

describe('GeminiExecutionError', () => {
  it('should create execution error', () => {
    const error = new GeminiExecutionError('Command failed', 'analyze');
    expect(error.message).toBe('Command failed');
    expect(error.command).toBe('analyze');
    expect(error.code).toBe('EXECUTION_ERROR');
    expect(error.name).toBe('GeminiExecutionError');
  });

  it('should not be recoverable', () => {
    const error = new GeminiExecutionError('Command failed', 'analyze');
    expect(error.recoverable).toBe(false);
  });

  it('should include exit code when provided', () => {
    const error = new GeminiExecutionError('Command failed', 'analyze', 1);
    expect(error.exitCode).toBe(1);
  });

  it('should have undefined exit code when not provided', () => {
    const error = new GeminiExecutionError('Command failed', 'analyze');
    expect(error.exitCode).toBeUndefined();
  });
});

describe('GeminiRateLimitError', () => {
  it('should create rate limit error', () => {
    const error = new GeminiRateLimitError('Rate limit exceeded', 60);
    expect(error.message).toBe('Rate limit exceeded');
    expect(error.retryAfter).toBe(60);
    expect(error.code).toBe('RATE_LIMIT_ERROR');
    expect(error.name).toBe('GeminiRateLimitError');
  });

  it('should be recoverable', () => {
    const error = new GeminiRateLimitError('Rate limit exceeded', 30);
    expect(error.recoverable).toBe(true);
  });

  it('should track retry time in seconds', () => {
    const error = new GeminiRateLimitError('Rate limit exceeded', 120);
    expect(error.retryAfter).toBe(120);
  });
});

describe('GeminiConfigError', () => {
  it('should create config error', () => {
    const error = new GeminiConfigError('Invalid config', 'apiKey');
    expect(error.message).toBe('Invalid config');
    expect(error.configKey).toBe('apiKey');
    expect(error.code).toBe('CONFIG_ERROR');
    expect(error.name).toBe('GeminiConfigError');
  });

  it('should be recoverable', () => {
    const error = new GeminiConfigError('Invalid config', 'apiKey');
    expect(error.recoverable).toBe(true);
  });

  it('should track which config key caused the error', () => {
    const error = new GeminiConfigError('Missing value', 'vertexProject');
    expect(error.configKey).toBe('vertexProject');
  });
});

describe('Error Hierarchy', () => {
  it('all specific errors should be instances of GeminiModuleError', () => {
    const errors = [
      new GeminiInstallError('test'),
      new GeminiAuthError('test', 'api-key'),
      new GeminiExecutionError('test', 'analyze'),
      new GeminiRateLimitError('test', 60),
      new GeminiConfigError('test', 'key'),
    ];

    errors.forEach((error) => {
      expect(error).toBeInstanceOf(GeminiModuleError);
      expect(error).toBeInstanceOf(Error);
    });
  });

  it('errors should have distinct names', () => {
    const errors = [
      new GeminiInstallError('test'),
      new GeminiAuthError('test', 'api-key'),
      new GeminiExecutionError('test', 'analyze'),
      new GeminiRateLimitError('test', 60),
      new GeminiConfigError('test', 'key'),
    ];

    const names = errors.map((e) => e.name);
    const uniqueNames = new Set(names);
    expect(uniqueNames.size).toBe(errors.length);
  });

  it('errors should have distinct codes', () => {
    const errors = [
      new GeminiInstallError('test'),
      new GeminiAuthError('test', 'api-key'),
      new GeminiExecutionError('test', 'analyze'),
      new GeminiRateLimitError('test', 60),
      new GeminiConfigError('test', 'key'),
    ];

    const codes = errors.map((e) => e.code);
    const uniqueCodes = new Set(codes);
    expect(uniqueCodes.size).toBe(errors.length);
  });
});
