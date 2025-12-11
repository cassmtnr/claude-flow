export class GeminiModuleError extends Error {
    code;
    details;
    constructor(message, code, details){
        super(message), this.code = code, this.details = details;
        this.name = 'GeminiModuleError';
    }
}
export class GeminiInstallError extends GeminiModuleError {
    constructor(message, details){
        super(message, 'INSTALL_ERROR', details);
        this.name = 'GeminiInstallError';
    }
}
export class GeminiAuthError extends GeminiModuleError {
    authMethod;
    constructor(message, authMethod, details){
        super(message, 'AUTH_ERROR', {
            authMethod,
            ...details
        }), this.authMethod = authMethod;
        this.name = 'GeminiAuthError';
    }
}
export class GeminiExecutionError extends GeminiModuleError {
    command;
    constructor(message, command, details){
        super(message, 'EXECUTION_ERROR', {
            command,
            ...details
        }), this.command = command;
        this.name = 'GeminiExecutionError';
    }
}
export class GeminiRateLimitError extends GeminiModuleError {
    retryAfter;
    constructor(message, retryAfter, details){
        super(message, 'RATE_LIMIT_ERROR', {
            retryAfter,
            ...details
        }), this.retryAfter = retryAfter;
        this.name = 'GeminiRateLimitError';
    }
}
export class GeminiConfigError extends GeminiModuleError {
    constructor(message, details){
        super(message, 'CONFIG_ERROR', details);
        this.name = 'GeminiConfigError';
    }
}

//# sourceMappingURL=errors.js.map