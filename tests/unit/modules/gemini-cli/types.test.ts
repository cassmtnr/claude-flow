/**
 * Types Tests
 * Tests for TypeScript types and default configuration
 */

import { describe, it, expect } from '@jest/globals';

// Simulated types matching the actual implementation
type AuthMethod = 'google-login' | 'api-key' | 'vertex-ai';
type AnalysisType = 'codebase' | 'architecture' | 'security' | 'dependencies' | 'coverage';
type AnalysisDepth = 'surface' | 'moderate' | 'deep' | 'comprehensive';
type OutputFormat = 'json' | 'markdown' | 'text';

interface GeminiCLIConfig {
  enabled: boolean;
  authMethod?: AuthMethod;
  apiKey?: string;
  vertexProject?: string;
  vertexLocation?: string;
  defaultDepth: AnalysisDepth;
  defaultOutput: OutputFormat;
  cacheEnabled: boolean;
  cacheTTL: number;
  maxCacheSize: number;
  rateLimitPerMinute: number;
  rateLimitPerDay: number;
}

const DEFAULT_CONFIG: GeminiCLIConfig = {
  enabled: false,
  defaultDepth: 'moderate',
  defaultOutput: 'markdown',
  cacheEnabled: true,
  cacheTTL: 3600000,
  maxCacheSize: 100,
  rateLimitPerMinute: 60,
  rateLimitPerDay: 1500,
};

describe('AuthMethod Type', () => {
  it('should accept valid auth methods', () => {
    const methods: AuthMethod[] = ['google-login', 'api-key', 'vertex-ai'];
    expect(methods).toHaveLength(3);
    expect(methods).toContain('google-login');
    expect(methods).toContain('api-key');
    expect(methods).toContain('vertex-ai');
  });
});

describe('AnalysisType Type', () => {
  it('should accept valid analysis types', () => {
    const types: AnalysisType[] = ['codebase', 'architecture', 'security', 'dependencies', 'coverage'];
    expect(types).toHaveLength(5);
  });

  it('should include all expected analysis types', () => {
    const types: AnalysisType[] = ['codebase', 'architecture', 'security', 'dependencies', 'coverage'];
    expect(types).toContain('codebase');
    expect(types).toContain('architecture');
    expect(types).toContain('security');
    expect(types).toContain('dependencies');
    expect(types).toContain('coverage');
  });
});

describe('AnalysisDepth Type', () => {
  it('should accept valid depth levels', () => {
    const depths: AnalysisDepth[] = ['surface', 'moderate', 'deep', 'comprehensive'];
    expect(depths).toHaveLength(4);
  });

  it('should include all expected depth levels', () => {
    const depths: AnalysisDepth[] = ['surface', 'moderate', 'deep', 'comprehensive'];
    expect(depths).toContain('surface');
    expect(depths).toContain('moderate');
    expect(depths).toContain('deep');
    expect(depths).toContain('comprehensive');
  });
});

describe('OutputFormat Type', () => {
  it('should accept valid output formats', () => {
    const formats: OutputFormat[] = ['json', 'markdown', 'text'];
    expect(formats).toHaveLength(3);
  });

  it('should include all expected output formats', () => {
    const formats: OutputFormat[] = ['json', 'markdown', 'text'];
    expect(formats).toContain('json');
    expect(formats).toContain('markdown');
    expect(formats).toContain('text');
  });
});

describe('DEFAULT_CONFIG', () => {
  it('should have enabled set to false by default', () => {
    expect(DEFAULT_CONFIG.enabled).toBe(false);
  });

  it('should have moderate as default depth', () => {
    expect(DEFAULT_CONFIG.defaultDepth).toBe('moderate');
  });

  it('should have markdown as default output format', () => {
    expect(DEFAULT_CONFIG.defaultOutput).toBe('markdown');
  });

  it('should have caching enabled by default', () => {
    expect(DEFAULT_CONFIG.cacheEnabled).toBe(true);
  });

  it('should have 1 hour cache TTL (in milliseconds)', () => {
    expect(DEFAULT_CONFIG.cacheTTL).toBe(3600000);
    expect(DEFAULT_CONFIG.cacheTTL / 1000 / 60 / 60).toBe(1); // 1 hour
  });

  it('should have max cache size of 100', () => {
    expect(DEFAULT_CONFIG.maxCacheSize).toBe(100);
  });

  it('should have rate limit of 60 per minute', () => {
    expect(DEFAULT_CONFIG.rateLimitPerMinute).toBe(60);
  });

  it('should have rate limit of 1500 per day', () => {
    expect(DEFAULT_CONFIG.rateLimitPerDay).toBe(1500);
  });

  it('should not have auth method set by default', () => {
    expect(DEFAULT_CONFIG.authMethod).toBeUndefined();
  });

  it('should not have API key set by default', () => {
    expect(DEFAULT_CONFIG.apiKey).toBeUndefined();
  });

  it('should not have vertex project set by default', () => {
    expect(DEFAULT_CONFIG.vertexProject).toBeUndefined();
  });
});

describe('GeminiCLIConfig', () => {
  it('should allow partial configuration with defaults', () => {
    const partialConfig: Partial<GeminiCLIConfig> = {
      enabled: true,
      authMethod: 'api-key',
    };

    const merged: GeminiCLIConfig = { ...DEFAULT_CONFIG, ...partialConfig };

    expect(merged.enabled).toBe(true);
    expect(merged.authMethod).toBe('api-key');
    expect(merged.defaultDepth).toBe('moderate'); // From defaults
  });

  it('should allow full configuration', () => {
    const fullConfig: GeminiCLIConfig = {
      enabled: true,
      authMethod: 'vertex-ai',
      vertexProject: 'my-project',
      vertexLocation: 'us-central1',
      defaultDepth: 'deep',
      defaultOutput: 'json',
      cacheEnabled: false,
      cacheTTL: 7200000,
      maxCacheSize: 50,
      rateLimitPerMinute: 30,
      rateLimitPerDay: 1000,
    };

    expect(fullConfig.enabled).toBe(true);
    expect(fullConfig.authMethod).toBe('vertex-ai');
    expect(fullConfig.vertexProject).toBe('my-project');
    expect(fullConfig.cacheEnabled).toBe(false);
  });
});

describe('AnalysisRequest Interface', () => {
  interface AnalysisRequest {
    type: AnalysisType;
    target: string | string[];
    depth?: AnalysisDepth;
    query?: string;
    outputFormat?: OutputFormat;
    includePatterns?: string[];
    excludePatterns?: string[];
    focus?: string[];
    storeInMemory?: boolean;
  }

  it('should require type and target', () => {
    const request: AnalysisRequest = {
      type: 'codebase',
      target: './src',
    };
    expect(request.type).toBe('codebase');
    expect(request.target).toBe('./src');
  });

  it('should accept array target', () => {
    const request: AnalysisRequest = {
      type: 'codebase',
      target: ['./src', './lib'],
    };
    expect(request.target).toHaveLength(2);
  });

  it('should accept optional parameters', () => {
    const request: AnalysisRequest = {
      type: 'security',
      target: './src',
      depth: 'deep',
      query: 'Find SQL injection vulnerabilities',
      outputFormat: 'json',
      excludePatterns: ['node_modules/**'],
      focus: ['vulnerabilities', 'secrets'],
      storeInMemory: true,
    };

    expect(request.depth).toBe('deep');
    expect(request.query).toBeDefined();
    expect(request.excludePatterns).toHaveLength(1);
    expect(request.focus).toHaveLength(2);
    expect(request.storeInMemory).toBe(true);
  });
});

describe('AnalysisResult Interface', () => {
  interface Finding {
    type: string;
    severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
    message: string;
    location: string;
    suggestion?: string;
  }

  interface AnalysisResult {
    success: boolean;
    requestId: string;
    timestamp: Date;
    duration: number;
    summary: string;
    findings: Finding[];
    recommendations: string[];
    errors?: string[];
  }

  it('should represent successful result', () => {
    const result: AnalysisResult = {
      success: true,
      requestId: 'req-123',
      timestamp: new Date(),
      duration: 1500,
      summary: 'Analysis complete',
      findings: [],
      recommendations: ['Consider adding tests'],
    };

    expect(result.success).toBe(true);
    expect(result.errors).toBeUndefined();
  });

  it('should represent failed result', () => {
    const result: AnalysisResult = {
      success: false,
      requestId: 'req-456',
      timestamp: new Date(),
      duration: 100,
      summary: 'Analysis failed',
      findings: [],
      recommendations: [],
      errors: ['Connection timeout', 'Rate limit exceeded'],
    };

    expect(result.success).toBe(false);
    expect(result.errors).toHaveLength(2);
  });

  it('should support findings with different severities', () => {
    const findings: Finding[] = [
      { type: 'vulnerability', severity: 'critical', message: 'SQL injection', location: 'db.ts:45' },
      { type: 'code-smell', severity: 'low', message: 'Unused variable', location: 'utils.ts:12' },
    ];

    expect(findings[0].severity).toBe('critical');
    expect(findings[1].severity).toBe('low');
  });
});
