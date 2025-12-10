export const DEFAULT_CONFIG = {
    enabled: false,
    authMethod: 'google-login',
    defaultModel: 'gemini-2.5-pro',
    contextLimit: 1000000,
    requestsPerMinute: 60,
    requestsPerDay: 1000,
    analysis: {
        defaultType: 'codebase',
        outputFormat: 'markdown',
        storeInMemory: true,
        excludePatterns: [
            'node_modules/**',
            'dist/**',
            '.git/**',
            '*.min.js',
            '*.map',
            'coverage/**',
            '.next/**',
            'build/**'
        ],
        maxFileSize: 10485760,
        timeout: 300000
    },
    cache: {
        enabled: true,
        ttl: 3600000,
        maxSize: 100,
        directory: '.claude-flow/cache/gemini'
    },
    rateLimit: {
        enabled: true,
        requestsPerMinute: 60,
        requestsPerDay: 1000,
        burstLimit: 10
    }
};

//# sourceMappingURL=types.js.map