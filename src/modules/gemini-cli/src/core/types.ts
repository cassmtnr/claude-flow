/**
 * Gemini CLI Module - Type Definitions
 * Based on: gemini/TYPES.md
 */

// ============================================
// Configuration Types
// ============================================

export type AuthMethod = 'google-login' | 'api-key' | 'vertex-ai';
export type GeminiModel = 'gemini-2.5-pro' | 'gemini-2.5-flash';
export type AnalysisType = 'codebase' | 'architecture' | 'security' | 'dependencies' | 'coverage';
export type OutputFormat = 'json' | 'markdown' | 'text';
export type AnalysisDepth = 'surface' | 'moderate' | 'deep' | 'comprehensive';

export interface GeminiCLIConfig {
  enabled: boolean;
  authMethod: AuthMethod;
  apiKey?: string;
  vertexProject?: string;
  vertexLocation?: string;
  defaultModel: GeminiModel;
  contextLimit: number;
  requestsPerMinute: number;
  requestsPerDay: number;
  analysis: AnalysisConfig;
  cache: CacheConfig;
  rateLimit: RateLimitConfig;
}

export interface AnalysisConfig {
  defaultType: AnalysisType;
  outputFormat: OutputFormat;
  storeInMemory: boolean;
  excludePatterns: string[];
  maxFileSize: number;
  timeout: number;
}

export interface CacheConfig {
  enabled: boolean;
  ttl: number;
  maxSize: number;
  directory: string;
}

export interface RateLimitConfig {
  enabled: boolean;
  requestsPerMinute: number;
  requestsPerDay: number;
  burstLimit: number;
}

// ============================================
// Analysis Types
// ============================================

export interface AnalysisRequest {
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

export interface AnalysisResult {
  success: boolean;
  requestId: string;
  timestamp: Date;
  duration: number;
  tokenUsage: TokenUsage;
  summary: string;
  findings: Finding[];
  metrics: AnalysisMetrics;
  recommendations: Recommendation[];
  rawOutput?: string;
  errors?: string[];
}

export interface TokenUsage {
  prompt: number;
  completion: number;
  total: number;
}

export interface Finding {
  type: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  location: string;
  message: string;
  suggestion?: string;
  code?: string;
  line?: number;
  column?: number;
}

export interface AnalysisMetrics {
  filesAnalyzed: number;
  linesOfCode: number;
  complexity?: number;
  dependencies?: number;
  qualityScore?: number;
}

export interface Recommendation {
  type: string;
  priority: 'high' | 'medium' | 'low';
  description: string;
  effort?: string;
  impact?: string;
}

// ============================================
// Module Status Types
// ============================================

export interface ModuleStatus {
  installed: boolean;
  enabled: boolean;
  authenticated: boolean;
  version?: string;
  authMethod?: AuthMethod;
  binaryPath?: string;
  quotaStatus?: QuotaStatus;
  lastCheck: Date;
}

export interface QuotaStatus {
  requestsPerMinute: {
    used: number;
    limit: number;
    resetAt: Date;
  };
  requestsPerDay: {
    used: number;
    limit: number;
    resetAt: Date;
  };
}

// ============================================
// Authentication Types
// ============================================

export interface AuthResult {
  success: boolean;
  method: AuthMethod;
  expiresAt?: Date;
  quotaInfo?: QuotaStatus;
  error?: string;
}

export interface VertexAIConfig {
  project: string;
  location: string;
  serviceAccountPath?: string;
}

// ============================================
// Installer Types
// ============================================

export interface InstallResult {
  success: boolean;
  version?: string;
  path?: string;
  error?: string;
}

export interface PlatformInfo {
  os: 'darwin' | 'linux' | 'win32';
  arch: 'x64' | 'arm64';
  shell: string;
  homeDir: string;
  npmGlobalDir: string;
}

// ============================================
// Default Configuration
// ============================================

export const DEFAULT_CONFIG: GeminiCLIConfig = {
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
      'build/**',
    ],
    maxFileSize: 10485760, // 10MB
    timeout: 300000, // 5 minutes
  },
  cache: {
    enabled: true,
    ttl: 3600000, // 1 hour
    maxSize: 100,
    directory: '.claude-flow/cache/gemini',
  },
  rateLimit: {
    enabled: true,
    requestsPerMinute: 60,
    requestsPerDay: 1000,
    burstLimit: 10,
  },
};
