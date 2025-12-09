/**
 * Gemini CLI Module - Error Types
 * Custom error classes for the Gemini CLI integration
 */

export class GeminiModuleError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'GeminiModuleError';
  }
}

export class GeminiInstallError extends GeminiModuleError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'INSTALL_ERROR', details);
    this.name = 'GeminiInstallError';
  }
}

export class GeminiAuthError extends GeminiModuleError {
  constructor(
    message: string,
    public readonly authMethod: string,
    details?: Record<string, unknown>
  ) {
    super(message, 'AUTH_ERROR', { authMethod, ...details });
    this.name = 'GeminiAuthError';
  }
}

export class GeminiExecutionError extends GeminiModuleError {
  constructor(
    message: string,
    public readonly command: string,
    details?: Record<string, unknown>
  ) {
    super(message, 'EXECUTION_ERROR', { command, ...details });
    this.name = 'GeminiExecutionError';
  }
}

export class GeminiRateLimitError extends GeminiModuleError {
  constructor(
    message: string,
    public readonly retryAfter: number,
    details?: Record<string, unknown>
  ) {
    super(message, 'RATE_LIMIT_ERROR', { retryAfter, ...details });
    this.name = 'GeminiRateLimitError';
  }
}

export class GeminiConfigError extends GeminiModuleError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'CONFIG_ERROR', details);
    this.name = 'GeminiConfigError';
  }
}
