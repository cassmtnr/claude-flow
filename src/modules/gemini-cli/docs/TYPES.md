# Gemini CLI Module - TypeScript Interfaces & Types

**Version**: 1.0.0
**Last Updated**: 2025-12-06

This document provides complete TypeScript interface definitions for the Gemini CLI Module integration with Claude Flow.

---

## Table of Contents

1. [Core Types](#core-types)
2. [Configuration Types](#configuration-types)
3. [Authentication Types](#authentication-types)
4. [Analysis Types](#analysis-types)
5. [Executor Types](#executor-types)
6. [MCP Tool Types](#mcp-tool-types)
7. [Event Types](#event-types)
8. [Error Types](#error-types)
9. [Integration Types](#integration-types)

---

## Core Types

### Module Status

```typescript
/**
 * Current status of the Gemini CLI module
 */
export interface GeminiModuleStatus {
  /** Whether Gemini CLI is installed on the system */
  installed: boolean;

  /** Whether user is authenticated */
  authenticated: boolean;

  /** Gemini CLI version (e.g., "1.0.0") */
  version?: string;

  /** Current authentication method in use */
  authMethod?: GeminiAuthMethod;

  /** Module enabled state in Claude Flow */
  enabled: boolean;

  /** Last successful authentication timestamp */
  lastAuthTime?: Date;

  /** Remaining API quota */
  quotaRemaining?: GeminiQuotaStatus;

  /** Active analysis sessions */
  activeSessions: number;

  /** Cache statistics */
  cache?: GeminiCacheStats;
}

/**
 * API quota status
 */
export interface GeminiQuotaStatus {
  /** Requests remaining this minute */
  requestsPerMinute: number;

  /** Requests remaining today */
  requestsPerDay: number;

  /** Tokens remaining this minute */
  tokensPerMinute?: number;

  /** Quota reset time */
  resetTime?: Date;

  /** Whether currently rate limited */
  isRateLimited: boolean;
}

/**
 * Cache statistics
 */
export interface GeminiCacheStats {
  /** Number of cached entries */
  entries: number;

  /** Total cache size in bytes */
  sizeBytes: number;

  /** Cache hit rate (0-1) */
  hitRate: number;

  /** Oldest entry timestamp */
  oldestEntry?: Date;
}
```

### Authentication Method

```typescript
/**
 * Supported authentication methods
 */
export type GeminiAuthMethod =
  | 'google-login'    // OAuth via Google account (recommended)
  | 'api-key'         // Direct API key
  | 'vertex-ai';      // Google Cloud Vertex AI

/**
 * Gemini model options
 */
export type GeminiModel =
  | 'gemini-2.5-pro'      // 1M context, most capable
  | 'gemini-2.5-flash'    // Faster, cost-effective
  | 'gemini-1.5-pro'      // Previous generation
  | 'gemini-1.5-flash';   // Previous generation, fast
```

---

## Configuration Types

### Main Configuration

```typescript
/**
 * Complete Gemini CLI module configuration
 */
export interface GeminiCLIConfig {
  /** Whether the module is enabled */
  enabled: boolean;

  /** Authentication method to use */
  authMethod: GeminiAuthMethod;

  /** API key (for api-key auth method) */
  apiKey?: string;

  /** Google Cloud project ID (for vertex-ai) */
  vertexProject?: string;

  /** Google Cloud location (for vertex-ai) */
  vertexLocation?: string;

  /** Default Gemini model to use */
  defaultModel: GeminiModel;

  /** Maximum context limit in tokens */
  contextLimit: number;

  /** Requests per minute limit */
  requestsPerMinute: number;

  /** Requests per day limit */
  requestsPerDay: number;

  /** Analysis-specific configuration */
  analysis: GeminiAnalysisConfig;

  /** Auto-analysis trigger configuration */
  autoAnalyze: GeminiAutoAnalyzeConfig;

  /** Cache configuration */
  cache: GeminiCacheConfig;

  /** Debug mode */
  debug: boolean;

  /** Custom environment variables */
  env?: Record<string, string>;
}

/**
 * Analysis-specific configuration
 */
export interface GeminiAnalysisConfig {
  /** Default analysis type */
  defaultType: GeminiAnalysisType;

  /** Default output format */
  outputFormat: GeminiOutputFormat;

  /** Whether to auto-store results in Claude Flow memory */
  storeInMemory: boolean;

  /** Memory namespace for stored results */
  memoryNamespace: string;

  /** File patterns to exclude from analysis */
  excludePatterns: string[];

  /** File patterns to include (if set, only these are analyzed) */
  includePatterns?: string[];

  /** Maximum file size to analyze (in bytes) */
  maxFileSize: number;

  /** Maximum total size for analysis (in bytes) */
  maxTotalSize: number;

  /** Timeout for analysis operations (in ms) */
  timeout: number;
}

/**
 * Auto-analyze trigger configuration
 */
export interface GeminiAutoAnalyzeConfig {
  /** Enable automatic analysis triggering */
  enabled: boolean;

  /** Minimum total file size to trigger (in bytes) */
  triggerSize: number;

  /** Analysis types to run automatically */
  types: GeminiAnalysisType[];

  /** Hooks that trigger auto-analysis */
  triggers: GeminiAutoTrigger[];
}

/**
 * Cache configuration
 */
export interface GeminiCacheConfig {
  /** Enable result caching */
  enabled: boolean;

  /** Cache time-to-live (in ms) */
  ttl: number;

  /** Maximum cache entries */
  maxSize: number;

  /** Cache storage path */
  storagePath?: string;

  /** Cache strategy */
  strategy: 'lru' | 'lfu' | 'ttl';
}

/**
 * Auto-analysis triggers
 */
export type GeminiAutoTrigger =
  | 'pre-task'        // Before swarm task starts
  | 'post-task'       // After swarm task completes
  | 'pre-commit'      // Before git commit
  | 'file-change'     // When files change
  | 'manual';         // Manual trigger only
```

---

## Authentication Types

### Authentication Request

```typescript
/**
 * Authentication request parameters
 */
export interface GeminiAuthRequest {
  /** Authentication method */
  method: GeminiAuthMethod;

  /** API key (for api-key method) */
  apiKey?: string;

  /** Vertex AI project ID */
  vertexProject?: string;

  /** Vertex AI location */
  vertexLocation?: string;

  /** Whether to skip validation */
  skipValidation?: boolean;

  /** Custom timeout (ms) */
  timeout?: number;
}

/**
 * Authentication result
 */
export interface GeminiAuthResult {
  /** Whether authentication succeeded */
  success: boolean;

  /** Authentication method used */
  method: GeminiAuthMethod;

  /** Authenticated user/project info */
  identity?: GeminiIdentity;

  /** Error message if failed */
  error?: string;

  /** Error code if failed */
  errorCode?: GeminiAuthErrorCode;

  /** Timestamp of authentication */
  timestamp: Date;

  /** Token expiry time (if applicable) */
  expiresAt?: Date;
}

/**
 * Authenticated identity information
 */
export interface GeminiIdentity {
  /** Account type */
  type: 'personal' | 'service_account' | 'organization';

  /** Email or service account ID */
  email?: string;

  /** Project ID (for Vertex AI) */
  projectId?: string;

  /** Account tier */
  tier: 'free' | 'paid' | 'enterprise';

  /** Available quotas */
  quotas: GeminiQuotaStatus;
}

/**
 * Authentication error codes
 */
export type GeminiAuthErrorCode =
  | 'INVALID_API_KEY'
  | 'EXPIRED_TOKEN'
  | 'PERMISSION_DENIED'
  | 'PROJECT_NOT_FOUND'
  | 'NETWORK_ERROR'
  | 'CLI_NOT_INSTALLED'
  | 'BROWSER_REQUIRED'
  | 'TIMEOUT'
  | 'UNKNOWN';
```

---

## Analysis Types

### Analysis Request

```typescript
/**
 * Types of analysis available
 */
export type GeminiAnalysisType =
  | 'codebase'       // Full codebase overview
  | 'architecture'   // System architecture analysis
  | 'security'       // Security vulnerability scan
  | 'dependencies'   // Dependency analysis
  | 'coverage'       // Test coverage assessment
  | 'performance'    // Performance analysis
  | 'custom';        // Custom analysis with query

/**
 * Output format options
 */
export type GeminiOutputFormat =
  | 'json'           // Structured JSON
  | 'markdown'       // Markdown formatted
  | 'text'           // Plain text
  | 'structured';    // Typed structured output

/**
 * Analysis request parameters
 */
export interface GeminiAnalysisRequest {
  /** Type of analysis to perform */
  type: GeminiAnalysisType;

  /** Paths to analyze (files or directories) */
  paths: string[];

  /** Custom analysis prompt/query */
  query?: string;

  /** Output format */
  outputFormat: GeminiOutputFormat;

  /** File patterns to include */
  includePatterns?: string[];

  /** File patterns to exclude */
  excludePatterns?: string[];

  /** Maximum files to analyze */
  maxFiles?: number;

  /** Maximum total size in bytes */
  maxSize?: number;

  /** Whether to store result in memory */
  storeInMemory?: boolean;

  /** Memory key for storing result */
  memoryKey?: string;

  /** Analysis options */
  options?: GeminiAnalysisOptions;

  /** Request metadata */
  metadata?: Record<string, any>;
}

/**
 * Analysis-specific options
 */
export interface GeminiAnalysisOptions {
  /** For security analysis */
  security?: {
    /** Check for OWASP Top 10 */
    owaspTop10: boolean;
    /** Check for hardcoded secrets */
    secretsDetection: boolean;
    /** Security severity threshold */
    severityThreshold: 'low' | 'medium' | 'high' | 'critical';
  };

  /** For architecture analysis */
  architecture?: {
    /** Include dependency graph */
    includeDependencyGraph: boolean;
    /** Include data flow analysis */
    includeDataFlow: boolean;
    /** Detect design patterns */
    detectPatterns: boolean;
  };

  /** For dependencies analysis */
  dependencies?: {
    /** Check for outdated packages */
    checkOutdated: boolean;
    /** Check for vulnerabilities (CVEs) */
    checkVulnerabilities: boolean;
    /** Check license compliance */
    checkLicenses: boolean;
    /** Include transitive dependencies */
    includeTransitive: boolean;
  };

  /** For coverage analysis */
  coverage?: {
    /** Test directories to include */
    testDirs: string[];
    /** Minimum coverage threshold */
    threshold: number;
    /** Include branch coverage */
    branchCoverage: boolean;
  };
}
```

### Analysis Result

```typescript
/**
 * Analysis result
 */
export interface GeminiAnalysisResult {
  /** Whether analysis succeeded */
  success: boolean;

  /** Unique request identifier */
  requestId: string;

  /** Analysis type performed */
  type: GeminiAnalysisType;

  /** Timestamp of completion */
  timestamp: Date;

  /** Duration in milliseconds */
  duration: number;

  /** Token usage statistics */
  tokenUsage: GeminiTokenUsage;

  /** The analysis result */
  result: any;

  /** Structured result (if outputFormat is 'structured') */
  structured?: GeminiStructuredResult;

  /** Files that were analyzed */
  analyzedFiles: string[];

  /** Files that were skipped */
  skippedFiles: GeminiSkippedFile[];

  /** Errors encountered (if any) */
  errors?: string[];

  /** Warnings (non-fatal issues) */
  warnings?: string[];

  /** Memory key if stored */
  memoryKey?: string;

  /** Cache information */
  cache?: {
    hit: boolean;
    key?: string;
  };
}

/**
 * Token usage statistics
 */
export interface GeminiTokenUsage {
  /** Prompt tokens used */
  prompt: number;

  /** Completion tokens generated */
  completion: number;

  /** Total tokens */
  total: number;

  /** Estimated cost (USD) */
  estimatedCost?: number;
}

/**
 * File that was skipped during analysis
 */
export interface GeminiSkippedFile {
  /** File path */
  path: string;

  /** Reason for skipping */
  reason: 'too_large' | 'binary' | 'excluded' | 'permission_denied' | 'not_found';

  /** File size if applicable */
  size?: number;
}

/**
 * Structured analysis result
 */
export interface GeminiStructuredResult {
  /** Summary of findings */
  summary: string;

  /** Key findings/issues */
  findings: GeminiFinding[];

  /** Recommendations */
  recommendations: GeminiRecommendation[];

  /** Metrics (analysis-type specific) */
  metrics?: Record<string, number | string>;

  /** Related files */
  relatedFiles?: string[];
}

/**
 * Individual finding from analysis
 */
export interface GeminiFinding {
  /** Finding ID */
  id: string;

  /** Finding type */
  type: string;

  /** Severity level */
  severity: 'info' | 'low' | 'medium' | 'high' | 'critical';

  /** Finding title */
  title: string;

  /** Detailed description */
  description: string;

  /** Affected file(s) */
  files?: string[];

  /** Line numbers if applicable */
  lines?: { file: string; start: number; end: number }[];

  /** Code snippet if applicable */
  snippet?: string;

  /** Category */
  category?: string;
}

/**
 * Recommendation from analysis
 */
export interface GeminiRecommendation {
  /** Recommendation ID */
  id: string;

  /** Priority level */
  priority: 'low' | 'medium' | 'high';

  /** Short title */
  title: string;

  /** Detailed recommendation */
  description: string;

  /** Effort estimate */
  effort?: 'trivial' | 'small' | 'medium' | 'large';

  /** Impact estimate */
  impact?: 'low' | 'medium' | 'high';

  /** Related finding IDs */
  relatedFindings?: string[];
}
```

---

## Executor Types

### Executor Interface

```typescript
/**
 * Gemini CLI executor interface
 */
export interface IGeminiExecutor {
  /** Execute an analysis */
  analyze(request: GeminiAnalysisRequest): Promise<GeminiAnalysisResult>;

  /** Perform semantic search */
  search(query: string, paths: string[]): Promise<GeminiSearchResult>;

  /** Verify feature implementation */
  verify(feature: string, paths: string[]): Promise<GeminiVerifyResult>;

  /** Execute raw Gemini CLI command */
  execute(command: string, options?: GeminiExecuteOptions): Promise<GeminiExecuteResult>;

  /** Check if executor is ready */
  isReady(): boolean;

  /** Get executor status */
  getStatus(): GeminiExecutorStatus;

  /** Abort current operation */
  abort(): Promise<void>;
}

/**
 * Execute options
 */
export interface GeminiExecuteOptions {
  /** Working directory */
  cwd?: string;

  /** Environment variables */
  env?: Record<string, string>;

  /** Timeout in milliseconds */
  timeout?: number;

  /** Capture stderr */
  captureStderr?: boolean;

  /** Stream output */
  stream?: boolean;

  /** On output callback (for streaming) */
  onOutput?: (chunk: string) => void;
}

/**
 * Raw execute result
 */
export interface GeminiExecuteResult {
  /** Exit code */
  exitCode: number;

  /** Standard output */
  stdout: string;

  /** Standard error */
  stderr: string;

  /** Execution duration (ms) */
  duration: number;

  /** Whether command succeeded */
  success: boolean;
}

/**
 * Executor status
 */
export interface GeminiExecutorStatus {
  /** Whether executor is initialized */
  initialized: boolean;

  /** Whether authenticated */
  authenticated: boolean;

  /** Current operation (if any) */
  currentOperation?: string;

  /** Operations in queue */
  queueLength: number;

  /** Rate limit status */
  rateLimitStatus: GeminiQuotaStatus;
}

/**
 * Search result
 */
export interface GeminiSearchResult {
  /** Whether search succeeded */
  success: boolean;

  /** Search query */
  query: string;

  /** Search results */
  results: GeminiSearchMatch[];

  /** Total matches found */
  totalMatches: number;

  /** Token usage */
  tokenUsage: GeminiTokenUsage;
}

/**
 * Individual search match
 */
export interface GeminiSearchMatch {
  /** File path */
  file: string;

  /** Relevance score (0-1) */
  score: number;

  /** Matched content snippet */
  snippet: string;

  /** Line numbers */
  lines: { start: number; end: number };

  /** Context around match */
  context?: string;

  /** Explanation of why this matched */
  explanation?: string;
}

/**
 * Verification result
 */
export interface GeminiVerifyResult {
  /** Whether verification succeeded */
  success: boolean;

  /** Feature being verified */
  feature: string;

  /** Whether feature is implemented */
  implemented: boolean;

  /** Confidence level (0-1) */
  confidence: number;

  /** Evidence supporting the conclusion */
  evidence: GeminiEvidence[];

  /** Missing components (if not fully implemented) */
  missing?: string[];

  /** Token usage */
  tokenUsage: GeminiTokenUsage;
}

/**
 * Evidence for verification
 */
export interface GeminiEvidence {
  /** Type of evidence */
  type: 'code' | 'test' | 'documentation' | 'config';

  /** File containing evidence */
  file: string;

  /** Lines containing evidence */
  lines?: { start: number; end: number };

  /** Code snippet */
  snippet?: string;

  /** Description of how this supports the conclusion */
  description: string;

  /** Strength of evidence (0-1) */
  strength: number;
}
```

---

## MCP Tool Types

### Tool Definitions

```typescript
/**
 * MCP tool input schema for gemini/analyze
 */
export interface GeminiAnalyzeToolInput {
  type: GeminiAnalysisType;
  paths: string[];
  query?: string;
  outputFormat?: GeminiOutputFormat;
  options?: GeminiAnalysisOptions;
}

/**
 * MCP tool input schema for gemini/search
 */
export interface GeminiSearchToolInput {
  query: string;
  paths?: string[];
  maxResults?: number;
  includeContext?: boolean;
}

/**
 * MCP tool input schema for gemini/verify
 */
export interface GeminiVerifyToolInput {
  feature: string;
  paths?: string[];
  strictMode?: boolean;
}

/**
 * MCP tool result wrapper
 */
export interface GeminiMCPToolResult<T> {
  /** Tool execution success */
  success: boolean;

  /** Error message if failed */
  error?: string;

  /** Error code if failed */
  errorCode?: string;

  /** Tool result data */
  data?: T;

  /** Execution metadata */
  metadata?: {
    duration: number;
    tokenUsage: GeminiTokenUsage;
    cached: boolean;
  };
}

/**
 * MCP tool registration metadata
 */
export interface GeminiMCPToolMetadata {
  /** Tool name */
  name: string;

  /** Tool description */
  description: string;

  /** Tool category */
  category: 'gemini';

  /** Detail level for progressive disclosure */
  detailLevel: 'names-only' | 'basic' | 'full';

  /** Search tags */
  tags: string[];

  /** Whether tool requires opt-in */
  requiresOptIn: boolean;

  /** Dependencies */
  dependencies?: string[];
}
```

---

## Event Types

### Module Events

```typescript
/**
 * Event emitted when module status changes
 */
export interface GeminiStatusChangeEvent {
  type: 'status_change';
  previousStatus: GeminiModuleStatus;
  currentStatus: GeminiModuleStatus;
  timestamp: Date;
}

/**
 * Event emitted when authentication changes
 */
export interface GeminiAuthChangeEvent {
  type: 'auth_change';
  action: 'login' | 'logout' | 'refresh' | 'expire';
  method?: GeminiAuthMethod;
  identity?: GeminiIdentity;
  timestamp: Date;
}

/**
 * Event emitted during analysis
 */
export interface GeminiAnalysisProgressEvent {
  type: 'analysis_progress';
  requestId: string;
  analysisType: GeminiAnalysisType;
  phase: 'preparing' | 'scanning' | 'analyzing' | 'formatting' | 'complete';
  progress: number; // 0-100
  currentFile?: string;
  filesProcessed: number;
  totalFiles: number;
  timestamp: Date;
}

/**
 * Event emitted when analysis completes
 */
export interface GeminiAnalysisCompleteEvent {
  type: 'analysis_complete';
  requestId: string;
  result: GeminiAnalysisResult;
  timestamp: Date;
}

/**
 * Event emitted on error
 */
export interface GeminiErrorEvent {
  type: 'error';
  error: GeminiError;
  context?: string;
  recoverable: boolean;
  timestamp: Date;
}

/**
 * Event emitted on rate limit
 */
export interface GeminiRateLimitEvent {
  type: 'rate_limit';
  limitType: 'minute' | 'day' | 'token';
  resetTime: Date;
  currentUsage: number;
  limit: number;
  timestamp: Date;
}

/**
 * All possible Gemini events
 */
export type GeminiEvent =
  | GeminiStatusChangeEvent
  | GeminiAuthChangeEvent
  | GeminiAnalysisProgressEvent
  | GeminiAnalysisCompleteEvent
  | GeminiErrorEvent
  | GeminiRateLimitEvent;

/**
 * Event handler type
 */
export type GeminiEventHandler<T extends GeminiEvent = GeminiEvent> = (event: T) => void;
```

---

## Error Types

### Error Classes

```typescript
/**
 * Base Gemini error class
 */
export class GeminiError extends Error {
  constructor(
    message: string,
    public code: GeminiErrorCode,
    public recoverable: boolean = true,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = 'GeminiError';
  }
}

/**
 * Authentication error
 */
export class GeminiAuthError extends GeminiError {
  constructor(
    message: string,
    public authMethod: GeminiAuthMethod,
    details?: Record<string, any>
  ) {
    super(message, 'AUTH_ERROR', false, details);
    this.name = 'GeminiAuthError';
  }
}

/**
 * Rate limit error
 */
export class GeminiRateLimitError extends GeminiError {
  constructor(
    message: string,
    public resetTime: Date,
    public limitType: 'minute' | 'day' | 'token',
    details?: Record<string, any>
  ) {
    super(message, 'RATE_LIMIT', true, details);
    this.name = 'GeminiRateLimitError';
  }
}

/**
 * Analysis error
 */
export class GeminiAnalysisError extends GeminiError {
  constructor(
    message: string,
    public analysisType: GeminiAnalysisType,
    public phase: string,
    details?: Record<string, any>
  ) {
    super(message, 'ANALYSIS_ERROR', true, details);
    this.name = 'GeminiAnalysisError';
  }
}

/**
 * CLI execution error
 */
export class GeminiCLIError extends GeminiError {
  constructor(
    message: string,
    public exitCode: number,
    public stderr: string,
    details?: Record<string, any>
  ) {
    super(message, 'CLI_ERROR', true, details);
    this.name = 'GeminiCLIError';
  }
}

/**
 * Error codes
 */
export type GeminiErrorCode =
  | 'AUTH_ERROR'
  | 'RATE_LIMIT'
  | 'ANALYSIS_ERROR'
  | 'CLI_ERROR'
  | 'CONFIG_ERROR'
  | 'NETWORK_ERROR'
  | 'TIMEOUT'
  | 'NOT_INSTALLED'
  | 'NOT_ENABLED'
  | 'INVALID_INPUT'
  | 'UNKNOWN';

/**
 * Type guard for GeminiError
 */
export function isGeminiError(error: any): error is GeminiError {
  return error instanceof GeminiError;
}

/**
 * Type guard for GeminiRateLimitError
 */
export function isRateLimitError(error: any): error is GeminiRateLimitError {
  return error instanceof GeminiRateLimitError;
}
```

---

## Integration Types

### Claude Flow Integration

```typescript
/**
 * Integration with Claude Flow memory system
 */
export interface GeminiMemoryIntegration {
  /** Store analysis result in memory */
  storeResult(key: string, result: GeminiAnalysisResult): Promise<void>;

  /** Retrieve cached analysis from memory */
  retrieveResult(key: string): Promise<GeminiAnalysisResult | null>;

  /** Search memory for relevant analyses */
  searchResults(query: string): Promise<GeminiAnalysisResult[]>;

  /** Clear cached results */
  clearResults(pattern?: string): Promise<number>;
}

/**
 * Integration with Claude Flow agents
 */
export interface GeminiAgentIntegration {
  /** Register Gemini tools with agent */
  registerTools(agent: any): void;

  /** Provide analysis context to agent */
  provideContext(analysis: GeminiAnalysisResult): any;

  /** Get agent decision matrix for Gemini vs Claude */
  getDecisionMatrix(): GeminiDecisionMatrix;
}

/**
 * Decision matrix for when to use Gemini vs Claude
 */
export interface GeminiDecisionMatrix {
  /** Size thresholds (in bytes) */
  sizeThresholds: {
    /** Below this size, use Claude */
    useClaudeBelow: number;
    /** Above this size, use Gemini */
    useGeminiAbove: number;
  };

  /** Task type preferences */
  taskPreferences: {
    /** Tasks that should always use Gemini */
    preferGemini: string[];
    /** Tasks that should always use Claude */
    preferClaude: string[];
  };

  /** Context length preferences */
  contextPreferences: {
    /** If context > this, prefer Gemini */
    geminiContextThreshold: number;
  };
}

/**
 * Integration with Claude Flow hooks
 */
export interface GeminiHookIntegration {
  /** Pre-task hook */
  preTask(task: any): Promise<GeminiAnalysisResult | null>;

  /** Post-task hook */
  postTask(task: any, result: any): Promise<GeminiVerifyResult | null>;

  /** Pre-commit hook */
  preCommit(files: string[]): Promise<GeminiAnalysisResult | null>;
}

/**
 * Integration with Claude Flow swarm
 */
export interface GeminiSwarmIntegration {
  /** Provide analysis to swarm */
  provideAnalysis(swarmId: string, analysis: GeminiAnalysisResult): Promise<void>;

  /** Get analysis requests from swarm */
  getAnalysisRequests(swarmId: string): Promise<GeminiAnalysisRequest[]>;

  /** Report analysis complete to swarm */
  reportComplete(swarmId: string, requestId: string, result: GeminiAnalysisResult): Promise<void>;
}
```

### Eject Types

```typescript
/**
 * Eject options
 */
export interface GeminiEjectOptions {
  /** Skip confirmation prompt */
  force: boolean;

  /** Uninstall Gemini CLI globally */
  uninstall: boolean;

  /** Keep configuration for future use */
  keepConfig: boolean;

  /** Clear cached results */
  clearCache: boolean;

  /** Remove auth credentials */
  clearAuth: boolean;
}

/**
 * Eject result
 */
export interface GeminiEjectResult {
  /** Whether eject succeeded */
  success: boolean;

  /** Actions taken */
  actions: GeminiEjectAction[];

  /** Errors encountered (non-fatal) */
  warnings: string[];

  /** Final status */
  finalStatus: GeminiModuleStatus;
}

/**
 * Individual eject action
 */
export interface GeminiEjectAction {
  /** Action type */
  type: 'disable' | 'clear_config' | 'clear_cache' | 'clear_auth' | 'uninstall';

  /** Whether action succeeded */
  success: boolean;

  /** Details */
  details?: string;
}
```

---

## Usage Examples

### Basic Usage

```typescript
import {
  GeminiCLIModule,
  GeminiAnalysisRequest,
  GeminiAnalysisResult
} from 'claude-flow/modules/gemini-cli';

// Get module instance
const gemini = GeminiCLIModule.getInstance();

// Enable with Google login
await gemini.enable({ authMethod: 'google-login' });

// Run analysis
const request: GeminiAnalysisRequest = {
  type: 'architecture',
  paths: ['./src'],
  outputFormat: 'json',
  options: {
    architecture: {
      includeDependencyGraph: true,
      detectPatterns: true
    }
  }
};

const result: GeminiAnalysisResult = await gemini.analyze(request);

console.log('Analysis complete:', result.success);
console.log('Findings:', result.structured?.findings.length);
```

### Event Handling

```typescript
import { GeminiEventHandler, GeminiAnalysisProgressEvent } from 'claude-flow/modules/gemini-cli';

const gemini = GeminiCLIModule.getInstance();

// Subscribe to progress events
const handler: GeminiEventHandler<GeminiAnalysisProgressEvent> = (event) => {
  console.log(`Progress: ${event.progress}% - ${event.phase}`);
  console.log(`Files: ${event.filesProcessed}/${event.totalFiles}`);
};

gemini.on('analysis_progress', handler);
```

### Error Handling

```typescript
import {
  GeminiError,
  GeminiRateLimitError,
  isRateLimitError
} from 'claude-flow/modules/gemini-cli';

try {
  const result = await gemini.analyze(request);
} catch (error) {
  if (isRateLimitError(error)) {
    console.log(`Rate limited. Reset at: ${error.resetTime}`);
    // Wait and retry
  } else if (error instanceof GeminiError) {
    console.log(`Gemini error: ${error.code} - ${error.message}`);
    if (error.recoverable) {
      // Retry logic
    }
  } else {
    throw error;
  }
}
```

---

## Type Export Summary

All types are exported from the main module entry:

```typescript
// From claude-flow/modules/gemini-cli

// Core types
export type { GeminiModuleStatus, GeminiQuotaStatus, GeminiCacheStats };
export type { GeminiAuthMethod, GeminiModel };

// Configuration types
export type { GeminiCLIConfig, GeminiAnalysisConfig, GeminiAutoAnalyzeConfig, GeminiCacheConfig };

// Authentication types
export type { GeminiAuthRequest, GeminiAuthResult, GeminiIdentity };

// Analysis types
export type { GeminiAnalysisType, GeminiOutputFormat, GeminiAnalysisRequest, GeminiAnalysisResult };
export type { GeminiTokenUsage, GeminiFinding, GeminiRecommendation };

// Executor types
export type { IGeminiExecutor, GeminiExecuteOptions, GeminiSearchResult, GeminiVerifyResult };

// MCP types
export type { GeminiAnalyzeToolInput, GeminiSearchToolInput, GeminiVerifyToolInput, GeminiMCPToolResult };

// Event types
export type { GeminiEvent, GeminiEventHandler };

// Error types
export { GeminiError, GeminiAuthError, GeminiRateLimitError, GeminiAnalysisError, GeminiCLIError };
export { isGeminiError, isRateLimitError };

// Integration types
export type { GeminiMemoryIntegration, GeminiAgentIntegration, GeminiDecisionMatrix };
export type { GeminiEjectOptions, GeminiEjectResult };
```
