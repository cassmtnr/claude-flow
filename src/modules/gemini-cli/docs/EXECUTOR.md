# Gemini CLI Module - Executor Documentation

**Version**: 1.0.0
**Last Updated**: 2025-12-06

This document provides comprehensive documentation for the Gemini CLI Executor component, responsible for executing analysis operations and managing the Gemini CLI interactions.

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Analysis Tools](#analysis-tools)
4. [Command Execution](#command-execution)
5. [Output Parsing](#output-parsing)
6. [Caching Strategy](#caching-strategy)
7. [Rate Limiting](#rate-limiting)
8. [Error Handling](#error-handling)
9. [Implementation Details](#implementation-details)
10. [Testing](#testing)

---

## Overview

The Executor component handles all Gemini CLI command execution:

- **Analysis execution**: Run specialized analysis tools
- **Command building**: Construct proper Gemini CLI commands
- **Output parsing**: Parse and structure Gemini responses
- **Caching**: Cache results to reduce API calls
- **Rate limiting**: Respect API quotas
- **Error recovery**: Handle failures gracefully

### Key Design Principles

1. **Efficient**: Minimize API calls through caching and batching
2. **Robust**: Handle errors and edge cases gracefully
3. **Observable**: Emit events for monitoring and progress
4. **Extensible**: Easy to add new analysis types

---

## Architecture

### Component Diagram

```
┌────────────────────────────────────────────────────────────────────────────┐
│                            GeminiExecutor                                  │
│                                                                            │
│  ┌────────────────┐  ┌────────────────┐  ┌─────────────────────────────┐  │
│  │ CommandBuilder │  │  OutputParser  │  │        ResultCache          │  │
│  │                │  │                │  │                             │  │
│  │ • buildPrompt  │  │ • parseJSON    │  │ • get/set                   │  │
│  │ • buildPaths   │  │ • parseMarkdown│  │ • invalidate                │  │
│  │ • buildOptions │  │ • extractMeta  │  │ • cleanup                   │  │
│  └────────────────┘  └────────────────┘  └─────────────────────────────┘  │
│                                                                            │
│  ┌────────────────┐  ┌────────────────┐  ┌─────────────────────────────┐  │
│  │  RateLimiter   │  │ ProgressTracker│  │        EventEmitter         │  │
│  │                │  │                │  │                             │  │
│  │ • checkQuota   │  │ • startTrack   │  │ • emit                      │  │
│  │ • waitForQuota │  │ • updatePhase  │  │ • on/off                    │  │
│  │ • consumeToken │  │ • complete     │  │ • once                      │  │
│  └────────────────┘  └────────────────┘  └─────────────────────────────┘  │
│                                                                            │
│  ┌───────────────────────────────────────────────────────────────────┐    │
│  │                         Analysis Tools                            │    │
│  │                                                                   │    │
│  │  ┌──────────────┐ ┌───────────────┐ ┌────────────────┐            │    │
│  │  │   Codebase   │ │ Architecture  │ │    Security    │            │    │
│  │  │   Analyzer   │ │    Mapper     │ │    Scanner     │            │    │
│  │  └──────────────┘ └───────────────┘ └────────────────┘            │    │
│  │                                                                   │    │
│  │  ┌──────────────┐ ┌───────────────┐ ┌────────────────┐            │    │
│  │  │  Dependency  │ │   Coverage    │ │     Custom     │            │    │
│  │  │   Analyzer   │ │   Assessor    │ │     Query      │            │    │
│  │  └──────────────┘ └───────────────┘ └────────────────┘            │    │
│  └───────────────────────────────────────────────────────────────────┘    │
└────────────────────────────────────────────────────────────────────────────┘
```

### Execution Flow

```
┌───────────────────────────────────────────────────────────────────────────┐
│                          Analysis Execution Flow                          │
└───────────────────────────────────────────────────────────────────────────┘

  Request                Executor              Gemini CLI            Result
     │                      │                      │                   │
     │ 1. analyze(request)  │                      │                   │
     │ ────────────────────▶│                      │                   │
     │                      │                      │                   │
     │                      │ 2. Check cache       │                   │
     │                      │────────┐             │                   │
     │                      │        │ hit?        │                   │
     │                      │◀───────┘             │                   │
     │                      │                      │                   │
     │                      │ 3. Check rate limit  │                   │
     │                      │────────┐             │                   │
     │                      │        │ ok?         │                   │
     │                      │◀───────┘             │                   │
     │                      │                      │                   │
     │                      │ 4. Build command     │                   │
     │                      │────────┐             │                   │
     │                      │        │             │                   │
     │                      │◀───────┘             │                   │
     │                      │                      │                   │
     │                      │ 5. Execute           │                   │
     │                      │ ────────────────────▶│                   │
     │                      │                      │                   │
     │                      │ 6. Stream output     │                   │
     │      ◀───events──────│ ◀────────────────────│                   │
     │                      │                      │                   │
     │                      │ 7. Parse output      │                   │
     │                      │────────┐             │                   │
     │                      │        │             │                   │
     │                      │◀───────┘             │                   │
     │                      │                      │                   │
     │                      │ 8. Cache result      │                   │
     │                      │────────┐             │                   │
     │                      │        │             │                   │
     │                      │◀───────┘             │                   │
     │                      │                      │                   │
     │ 9. Result            │                      │                   │
     │ ◀────────────────────│                      │                   │
     │                      │                      │                   │
```

---

## Analysis Tools

### 1. Codebase Analyzer

**Purpose**: Provide comprehensive overview of the entire codebase.

```typescript
/**
 * Analyze codebase structure and patterns
 */
async analyzeCodebase(request: GeminiAnalysisRequest): Promise<GeminiAnalysisResult> {
  const prompt = `
Analyze this codebase comprehensively. Provide:

1. **Project Overview**
   - Technology stack
   - Project type (library, application, monorepo)
   - Language(s) used

2. **Architecture Summary**
   - Key components and their roles
   - Entry points
   - Data flow patterns

3. **Code Organization**
   - Directory structure purpose
   - Module relationships
   - Naming conventions

4. **Key Patterns**
   - Design patterns in use
   - Coding conventions
   - Testing approach

5. **Notable Features**
   - Unique implementations
   - Third-party integrations
   - Configuration approaches

${request.query ? `\nFocus on: ${request.query}` : ''}

Provide a structured response that helps developers quickly understand the codebase.
`;

  return this.executeAnalysis(request, prompt, 'codebase');
}
```

**Output Structure**:
```typescript
interface CodebaseAnalysisResult {
  overview: {
    name: string;
    type: 'library' | 'application' | 'monorepo' | 'other';
    stack: string[];
    languages: { language: string; percentage: number }[];
  };
  architecture: {
    components: { name: string; role: string; files: string[] }[];
    entryPoints: string[];
    dataFlow: string;
  };
  organization: {
    structure: { dir: string; purpose: string }[];
    conventions: string[];
  };
  patterns: {
    design: string[];
    coding: string[];
    testing: string;
  };
  features: string[];
}
```

### 2. Architecture Mapper

**Purpose**: Create detailed architecture visualization and analysis.

```typescript
/**
 * Map system architecture
 */
async mapArchitecture(request: GeminiAnalysisRequest): Promise<GeminiAnalysisResult> {
  const options = request.options?.architecture || {};

  const prompt = `
Analyze the system architecture of this codebase:

1. **Component Diagram**
   - Identify all major components
   - Map relationships and dependencies
   - Note communication patterns

2. **Layer Analysis**
   - Identify architectural layers
   - Validate separation of concerns
   - Note any layer violations

3. **Module Dependencies**
   ${options.includeDependencyGraph ? '- Generate dependency graph' : ''}
   - Identify circular dependencies
   - Assess coupling levels

4. **Data Flow**
   ${options.includeDataFlow ? '- Map data flow between components' : ''}
   - Identify state management patterns
   - Note data transformation points

5. **Design Patterns**
   ${options.detectPatterns ? '- Identify design patterns in use' : ''}
   - Evaluate pattern appropriateness
   - Suggest improvements

${request.query ? `\nSpecific focus: ${request.query}` : ''}

Output in a format suitable for creating architecture documentation.
`;

  return this.executeAnalysis(request, prompt, 'architecture');
}
```

### 3. Security Scanner

**Purpose**: Identify security vulnerabilities and risks.

```typescript
/**
 * Scan for security vulnerabilities
 */
async scanSecurity(request: GeminiAnalysisRequest): Promise<GeminiAnalysisResult> {
  const options = request.options?.security || {
    owaspTop10: true,
    secretsDetection: true,
    severityThreshold: 'low',
  };

  const prompt = `
Perform a comprehensive security audit of this codebase:

1. **Vulnerability Assessment**
   ${options.owaspTop10 ? `
   Check for OWASP Top 10:
   - Injection flaws
   - Broken authentication
   - Sensitive data exposure
   - XML external entities
   - Broken access control
   - Security misconfiguration
   - Cross-site scripting (XSS)
   - Insecure deserialization
   - Using components with known vulnerabilities
   - Insufficient logging & monitoring
   ` : ''}

2. **Secrets Detection**
   ${options.secretsDetection ? `
   - Hardcoded API keys
   - Database credentials
   - Private keys
   - Authentication tokens
   - Environment variable exposure
   ` : ''}

3. **Code Security Patterns**
   - Input validation
   - Output encoding
   - Authentication/authorization
   - Cryptography usage
   - Error handling (information disclosure)

4. **Configuration Security**
   - Security headers
   - CORS configuration
   - Cookie settings
   - TLS/SSL configuration

5. **Recommendations**
   - Prioritized fixes
   - Best practice suggestions
   - Security improvements

Only report issues with severity >= ${options.severityThreshold}.

${request.query ? `\nSpecific concern: ${request.query}` : ''}

Provide actionable findings with file locations and fix suggestions.
`;

  return this.executeAnalysis(request, prompt, 'security');
}
```

**Output Structure**:
```typescript
interface SecurityScanResult {
  summary: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
  };
  findings: SecurityFinding[];
  secrets: {
    found: boolean;
    locations: { file: string; line: number; type: string }[];
  };
  recommendations: {
    priority: 'critical' | 'high' | 'medium' | 'low';
    title: string;
    description: string;
    files: string[];
  }[];
}

interface SecurityFinding {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  category: string;  // OWASP category or other
  title: string;
  description: string;
  file: string;
  line?: number;
  snippet?: string;
  remediation: string;
  references?: string[];
}
```

### 4. Dependency Analyzer

**Purpose**: Analyze dependencies for health, security, and optimization.

```typescript
/**
 * Analyze project dependencies
 */
async analyzeDependencies(request: GeminiAnalysisRequest): Promise<GeminiAnalysisResult> {
  const options = request.options?.dependencies || {
    checkOutdated: true,
    checkVulnerabilities: true,
    checkLicenses: true,
    includeTransitive: false,
  };

  const prompt = `
Analyze the dependencies of this project:

1. **Dependency Overview**
   - Total direct dependencies
   - Development dependencies
   ${options.includeTransitive ? '- Transitive dependency count' : ''}
   - Dependency tree depth

2. **Version Analysis**
   ${options.checkOutdated ? `
   - Outdated packages
   - Major version gaps
   - Breaking change risks
   ` : ''}

3. **Security Analysis**
   ${options.checkVulnerabilities ? `
   - Known CVEs
   - Security advisories
   - Recommended updates
   ` : ''}

4. **License Compliance**
   ${options.checkLicenses ? `
   - License types in use
   - License compatibility
   - Copyleft requirements
   ` : ''}

5. **Optimization Opportunities**
   - Duplicate packages
   - Unused dependencies
   - Bundle size impact
   - Alternative lighter packages

6. **Recommendations**
   - Priority updates
   - Risk mitigation
   - Maintenance suggestions

${request.query ? `\nSpecific focus: ${request.query}` : ''}

Provide actionable insights for dependency management.
`;

  return this.executeAnalysis(request, prompt, 'dependencies');
}
```

### 5. Coverage Assessor

**Purpose**: Evaluate test coverage and quality.

```typescript
/**
 * Assess test coverage and quality
 */
async assessCoverage(request: GeminiAnalysisRequest): Promise<GeminiAnalysisResult> {
  const options = request.options?.coverage || {
    testDirs: ['tests', 'test', '__tests__', 'spec'],
    threshold: 80,
    branchCoverage: true,
  };

  const prompt = `
Assess the test coverage and quality of this codebase:

1. **Test Overview**
   - Test framework(s) in use
   - Test file organization
   - Test types present (unit, integration, e2e)

2. **Coverage Analysis**
   - Estimated line coverage per module
   ${options.branchCoverage ? '- Estimated branch coverage' : ''}
   - Untested files/modules
   - Coverage gaps

3. **Test Quality**
   - Test naming conventions
   - Assertion patterns
   - Mock/stub usage
   - Test isolation

4. **Critical Path Coverage**
   - Business logic coverage
   - Error handling coverage
   - Edge case coverage
   - Security-sensitive code coverage

5. **Missing Tests**
   - Untested functions
   - Untested branches
   - Risk assessment for gaps

6. **Recommendations**
   - Priority areas for new tests
   - Test refactoring suggestions
   - Coverage improvement plan
   ${options.threshold ? `- Path to ${options.threshold}% coverage` : ''}

${request.query ? `\nSpecific focus: ${request.query}` : ''}

Provide a practical roadmap for improving test coverage.
`;

  return this.executeAnalysis(request, prompt, 'coverage');
}
```

### 6. Custom Query

**Purpose**: Execute custom analysis queries.

```typescript
/**
 * Execute custom analysis query
 */
async executeCustomQuery(request: GeminiAnalysisRequest): Promise<GeminiAnalysisResult> {
  if (!request.query) {
    throw new GeminiError('Custom query requires a query parameter', 'INVALID_INPUT');
  }

  const prompt = `
Analyze this codebase to answer the following question:

${request.query}

Provide a comprehensive answer with:
1. Direct answer to the question
2. Supporting evidence from the code
3. File locations and line numbers
4. Related considerations
5. Recommendations if applicable

Be specific and cite actual code when relevant.
`;

  return this.executeAnalysis(request, prompt, 'custom');
}
```

---

## Command Execution

### Command Building

```typescript
/**
 * Build Gemini CLI command
 */
private buildCommand(request: GeminiAnalysisRequest, prompt: string): string {
  const parts: string[] = ['gemini'];

  // Add path references using @ syntax
  const pathRefs = this.buildPathReferences(request.paths);
  parts.push('-p', `"${pathRefs} ${this.escapeForShell(prompt)}"`);

  // Add output format flag if needed
  if (request.outputFormat === 'json') {
    parts.push('--json');
  }

  return parts.join(' ');
}

/**
 * Build path references for Gemini CLI
 */
private buildPathReferences(paths: string[]): string {
  return paths.map(p => {
    // Normalize path
    const normalized = path.normalize(p);

    // Add @ prefix for Gemini CLI
    if (normalized.startsWith('@')) {
      return normalized;
    }

    if (path.isAbsolute(normalized)) {
      return `@${normalized}`;
    }

    return `@./${normalized}`;
  }).join(' ');
}

/**
 * Escape string for shell execution
 */
private escapeForShell(str: string): string {
  // Escape double quotes and backslashes
  return str
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\$/g, '\\$')
    .replace(/`/g, '\\`');
}
```

### Execution Process

```typescript
/**
 * Execute analysis with full lifecycle management
 */
private async executeAnalysis(
  request: GeminiAnalysisRequest,
  prompt: string,
  type: GeminiAnalysisType
): Promise<GeminiAnalysisResult> {
  const requestId = `gemini-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const startTime = Date.now();

  // Check cache first
  const cacheKey = this.generateCacheKey(request, type);
  const cached = await this.cache.get(cacheKey);
  if (cached) {
    this.logger.debug('Cache hit for analysis');
    return { ...cached, cache: { hit: true, key: cacheKey } };
  }

  // Check rate limit
  await this.rateLimiter.waitForQuota();

  // Emit start event
  this.emit('analysis_start', {
    requestId,
    type,
    paths: request.paths,
  });

  try {
    // Build command
    const command = this.buildCommand(request, prompt);

    // Execute with progress tracking
    const output = await this.executeWithProgress(
      command,
      requestId,
      request
    );

    // Parse output
    const parsed = this.parseOutput(output, request.outputFormat);

    // Calculate token usage
    const tokenUsage = this.estimateTokens(prompt, output);

    // Build result
    const result: GeminiAnalysisResult = {
      success: true,
      requestId,
      type,
      timestamp: new Date(),
      duration: Date.now() - startTime,
      tokenUsage,
      result: parsed,
      analyzedFiles: await this.getAnalyzedFiles(request.paths),
      skippedFiles: [],
      cache: { hit: false },
    };

    // Structure result if requested
    if (request.outputFormat === 'structured') {
      result.structured = this.structureResult(parsed, type);
    }

    // Cache result
    await this.cache.set(cacheKey, result);

    // Consume rate limit tokens
    this.rateLimiter.consumeTokens(tokenUsage.total);

    // Emit complete event
    this.emit('analysis_complete', { requestId, result });

    return result;

  } catch (error) {
    // Emit error event
    this.emit('analysis_error', {
      requestId,
      error: error as Error,
    });

    return {
      success: false,
      requestId,
      type,
      timestamp: new Date(),
      duration: Date.now() - startTime,
      tokenUsage: { prompt: 0, completion: 0, total: 0 },
      result: null,
      analyzedFiles: [],
      skippedFiles: [],
      errors: [(error as Error).message],
    };
  }
}

/**
 * Execute command with progress tracking
 */
private async executeWithProgress(
  command: string,
  requestId: string,
  request: GeminiAnalysisRequest
): Promise<string> {
  return new Promise((resolve, reject) => {
    let stdout = '';
    let stderr = '';
    let phase: 'preparing' | 'scanning' | 'analyzing' | 'formatting' = 'preparing';

    const proc = spawn('sh', ['-c', command], {
      cwd: process.cwd(),
      env: { ...process.env },
    });

    // Track file scanning progress
    let filesScanned = 0;
    const totalFiles = request.paths.length * 10; // Estimate

    proc.stdout?.on('data', (data) => {
      const chunk = data.toString();
      stdout += chunk;

      // Detect phase changes
      if (chunk.includes('Scanning') || chunk.includes('Reading')) {
        phase = 'scanning';
        filesScanned++;
      } else if (chunk.includes('Analyzing') || chunk.includes('Processing')) {
        phase = 'analyzing';
      } else if (chunk.includes('Formatting') || chunk.includes('Generating')) {
        phase = 'formatting';
      }

      // Emit progress
      this.emit('analysis_progress', {
        type: 'analysis_progress',
        requestId,
        analysisType: request.type,
        phase,
        progress: this.calculateProgress(phase, filesScanned, totalFiles),
        filesProcessed: filesScanned,
        totalFiles,
        timestamp: new Date(),
      });
    });

    proc.stderr?.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('close', (code) => {
      if (code === 0) {
        resolve(stdout);
      } else {
        reject(new GeminiCLIError(
          `Gemini CLI exited with code ${code}`,
          code || 1,
          stderr
        ));
      }
    });

    proc.on('error', (error) => {
      reject(new GeminiCLIError(
        `Failed to execute Gemini CLI: ${error.message}`,
        -1,
        error.message
      ));
    });

    // Timeout
    const timeout = request.options?.timeout || 300000; // 5 min default
    setTimeout(() => {
      if (proc.exitCode === null) {
        proc.kill('SIGTERM');
        reject(new GeminiError('Analysis timed out', 'TIMEOUT'));
      }
    }, timeout);
  });
}
```

---

## Output Parsing

### Parser Implementation

```typescript
/**
 * Parse Gemini output based on format
 */
private parseOutput(output: string, format: GeminiOutputFormat): any {
  switch (format) {
    case 'json':
      return this.parseJSON(output);
    case 'markdown':
      return this.parseMarkdown(output);
    case 'text':
      return output.trim();
    case 'structured':
      return this.parseStructured(output);
    default:
      return output.trim();
  }
}

/**
 * Parse JSON output
 */
private parseJSON(output: string): any {
  // Try to extract JSON from output
  const jsonMatch = output.match(/```json\s*([\s\S]*?)\s*```/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[1]);
    } catch {
      // Fall through to other attempts
    }
  }

  // Try to parse entire output as JSON
  try {
    return JSON.parse(output);
  } catch {
    // Return as raw with parse error
    return {
      raw: output,
      parseError: 'Failed to parse as JSON',
    };
  }
}

/**
 * Parse Markdown output into structured sections
 */
private parseMarkdown(output: string): MarkdownDocument {
  const lines = output.split('\n');
  const sections: MarkdownSection[] = [];
  let currentSection: MarkdownSection | null = null;
  let contentBuffer: string[] = [];

  for (const line of lines) {
    // Check for headers
    const headerMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headerMatch) {
      // Save previous section
      if (currentSection) {
        currentSection.content = contentBuffer.join('\n').trim();
        sections.push(currentSection);
      }

      // Start new section
      currentSection = {
        level: headerMatch[1].length,
        title: headerMatch[2],
        content: '',
      };
      contentBuffer = [];
    } else {
      contentBuffer.push(line);
    }
  }

  // Save last section
  if (currentSection) {
    currentSection.content = contentBuffer.join('\n').trim();
    sections.push(currentSection);
  }

  return {
    raw: output,
    sections,
    toc: sections.map(s => ({ level: s.level, title: s.title })),
  };
}

/**
 * Parse output into structured format
 */
private parseStructured(output: string): GeminiStructuredResult {
  // Try JSON first
  const json = this.parseJSON(output);
  if (!json.parseError) {
    return this.jsonToStructured(json);
  }

  // Parse markdown
  const markdown = this.parseMarkdown(output);
  return this.markdownToStructured(markdown);
}

/**
 * Convert parsed content to structured result
 */
private markdownToStructured(doc: MarkdownDocument): GeminiStructuredResult {
  const findings: GeminiFinding[] = [];
  const recommendations: GeminiRecommendation[] = [];

  // Extract findings from sections
  for (const section of doc.sections) {
    if (section.title.toLowerCase().includes('finding') ||
        section.title.toLowerCase().includes('issue') ||
        section.title.toLowerCase().includes('vulnerability')) {
      findings.push(this.parseFinding(section));
    }

    if (section.title.toLowerCase().includes('recommendation') ||
        section.title.toLowerCase().includes('suggestion')) {
      recommendations.push(this.parseRecommendation(section));
    }
  }

  // Generate summary
  const summarySection = doc.sections.find(s =>
    s.title.toLowerCase().includes('summary') ||
    s.title.toLowerCase().includes('overview')
  );

  return {
    summary: summarySection?.content || this.generateSummary(doc),
    findings,
    recommendations,
  };
}
```

---

## Caching Strategy

### Cache Implementation

```typescript
/**
 * Result cache with TTL and size limits
 */
export class ResultCache {
  private cache: Map<string, CacheEntry> = new Map();
  private maxSize: number;
  private ttl: number;

  constructor(config: GeminiCacheConfig) {
    this.maxSize = config.maxSize;
    this.ttl = config.ttl;

    // Start cleanup timer
    setInterval(() => this.cleanup(), 60000);
  }

  /**
   * Get cached result
   */
  async get(key: string): Promise<GeminiAnalysisResult | null> {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // Check TTL
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }

    // Update hits
    entry.hits++;

    return entry.result;
  }

  /**
   * Set cached result
   */
  async set(key: string, result: GeminiAnalysisResult): Promise<void> {
    // Evict if at capacity
    if (this.cache.size >= this.maxSize) {
      this.evict();
    }

    this.cache.set(key, {
      result,
      timestamp: Date.now(),
      hits: 0,
    });
  }

  /**
   * Invalidate cache entries
   */
  invalidate(pattern?: string): number {
    if (!pattern) {
      const count = this.cache.size;
      this.cache.clear();
      return count;
    }

    const regex = new RegExp(pattern);
    let count = 0;

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
        count++;
      }
    }

    return count;
  }

  /**
   * Evict least recently used entry
   */
  private evict(): void {
    let oldest: { key: string; timestamp: number } | null = null;

    for (const [key, entry] of this.cache.entries()) {
      if (!oldest || entry.timestamp < oldest.timestamp) {
        oldest = { key, timestamp: entry.timestamp };
      }
    }

    if (oldest) {
      this.cache.delete(oldest.key);
    }
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.ttl) {
        this.cache.delete(key);
      }
    }
  }
}

/**
 * Generate cache key
 */
private generateCacheKey(
  request: GeminiAnalysisRequest,
  type: GeminiAnalysisType
): string {
  const components = [
    type,
    ...request.paths.sort(),
    request.query || '',
    request.outputFormat,
    JSON.stringify(request.options || {}),
  ];

  return crypto
    .createHash('sha256')
    .update(components.join('|'))
    .digest('hex');
}
```

---

## Rate Limiting

### Rate Limiter Implementation

```typescript
/**
 * Rate limiter with token bucket algorithm
 */
export class RateLimiter {
  private tokensPerMinute: number;
  private tokensPerDay: number;
  private minuteTokens: number;
  private dayTokens: number;
  private lastMinuteReset: number;
  private lastDayReset: number;
  private waitQueue: (() => void)[] = [];

  constructor(config: { requestsPerMinute: number; requestsPerDay: number }) {
    this.tokensPerMinute = config.requestsPerMinute;
    this.tokensPerDay = config.requestsPerDay;
    this.minuteTokens = this.tokensPerMinute;
    this.dayTokens = this.tokensPerDay;
    this.lastMinuteReset = Date.now();
    this.lastDayReset = Date.now();

    // Reset timers
    setInterval(() => this.resetMinute(), 60000);
    setInterval(() => this.resetDay(), 86400000);
  }

  /**
   * Check if request can proceed
   */
  canProceed(): boolean {
    this.checkReset();
    return this.minuteTokens > 0 && this.dayTokens > 0;
  }

  /**
   * Wait for quota to become available
   */
  async waitForQuota(): Promise<void> {
    this.checkReset();

    if (this.canProceed()) {
      return;
    }

    // Calculate wait time
    const now = Date.now();
    const minuteWait = Math.max(0, 60000 - (now - this.lastMinuteReset));
    const dayWait = this.dayTokens <= 0
      ? Math.max(0, 86400000 - (now - this.lastDayReset))
      : 0;

    const waitTime = Math.max(minuteWait, dayWait);

    if (waitTime > 0) {
      await new Promise<void>(resolve => {
        this.waitQueue.push(resolve);
        setTimeout(resolve, waitTime);
      });
    }
  }

  /**
   * Consume tokens
   */
  consumeTokens(count: number = 1): void {
    this.minuteTokens -= count;
    this.dayTokens -= count;
  }

  /**
   * Get current quota status
   */
  getStatus(): GeminiQuotaStatus {
    this.checkReset();

    return {
      requestsPerMinute: Math.max(0, this.minuteTokens),
      requestsPerDay: Math.max(0, this.dayTokens),
      isRateLimited: !this.canProceed(),
      resetTime: new Date(this.lastMinuteReset + 60000),
    };
  }

  private checkReset(): void {
    const now = Date.now();

    if (now - this.lastMinuteReset >= 60000) {
      this.resetMinute();
    }

    if (now - this.lastDayReset >= 86400000) {
      this.resetDay();
    }
  }

  private resetMinute(): void {
    this.minuteTokens = this.tokensPerMinute;
    this.lastMinuteReset = Date.now();
    this.processQueue();
  }

  private resetDay(): void {
    this.dayTokens = this.tokensPerDay;
    this.lastDayReset = Date.now();
    this.processQueue();
  }

  private processQueue(): void {
    while (this.waitQueue.length > 0 && this.canProceed()) {
      const resolve = this.waitQueue.shift();
      resolve?.();
    }
  }
}
```

---

## Error Handling

### Error Recovery

```typescript
/**
 * Execute with automatic retry on transient errors
 */
private async executeWithRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;

      // Check if error is retryable
      if (!this.isRetryableError(error)) {
        throw error;
      }

      if (attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt - 1);
        const jitter = Math.random() * 1000;
        await this.sleep(delay + jitter);
      }
    }
  }

  throw lastError;
}

/**
 * Check if error is retryable
 */
private isRetryableError(error: any): boolean {
  // Rate limit errors are retryable
  if (error instanceof GeminiRateLimitError) {
    return true;
  }

  // CLI errors with specific codes
  if (error instanceof GeminiCLIError) {
    // Temporary failures
    if (error.stderr.includes('RESOURCE_EXHAUSTED') ||
        error.stderr.includes('UNAVAILABLE') ||
        error.stderr.includes('DEADLINE_EXCEEDED')) {
      return true;
    }
  }

  // Network errors
  if (error.message.includes('ECONNRESET') ||
      error.message.includes('ETIMEDOUT') ||
      error.message.includes('ENOTFOUND')) {
    return true;
  }

  return false;
}
```

---

## Implementation Details

### Complete Executor Class

```typescript
import { spawn, exec as execCallback } from 'child_process';
import { promisify } from 'util';
import { EventEmitter } from 'events';
import * as path from 'path';
import * as crypto from 'crypto';

const exec = promisify(execCallback);

export class GeminiExecutor extends EventEmitter implements IGeminiExecutor {
  private config: GeminiCLIConfig;
  private logger: Logger;
  private cache: ResultCache;
  private rateLimiter: RateLimiter;
  private isInitialized: boolean = false;

  constructor(config: GeminiCLIConfig, logger?: Logger) {
    super();
    this.config = config;
    this.logger = logger || new ConsoleLogger();
    this.cache = new ResultCache(config.cache);
    this.rateLimiter = new RateLimiter({
      requestsPerMinute: config.requestsPerMinute,
      requestsPerDay: config.requestsPerDay,
    });
  }

  /**
   * Initialize executor
   */
  async initialize(): Promise<void> {
    // Verify Gemini CLI is available
    try {
      await exec('gemini --version');
      this.isInitialized = true;
    } catch {
      throw new GeminiError('Gemini CLI not available', 'NOT_INSTALLED');
    }
  }

  /**
   * Main analysis entry point
   */
  async analyze(request: GeminiAnalysisRequest): Promise<GeminiAnalysisResult> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    switch (request.type) {
      case 'codebase':
        return this.analyzeCodebase(request);
      case 'architecture':
        return this.mapArchitecture(request);
      case 'security':
        return this.scanSecurity(request);
      case 'dependencies':
        return this.analyzeDependencies(request);
      case 'coverage':
        return this.assessCoverage(request);
      case 'custom':
        return this.executeCustomQuery(request);
      default:
        throw new GeminiError(`Unknown analysis type: ${request.type}`, 'INVALID_INPUT');
    }
  }

  /**
   * Semantic search
   */
  async search(query: string, paths: string[]): Promise<GeminiSearchResult> {
    const request: GeminiAnalysisRequest = {
      type: 'custom',
      paths,
      query: `Search for: ${query}. Return all relevant code locations with explanations.`,
      outputFormat: 'json',
    };

    const result = await this.analyze(request);

    return {
      success: result.success,
      query,
      results: this.parseSearchResults(result.result),
      totalMatches: result.result?.matches?.length || 0,
      tokenUsage: result.tokenUsage,
    };
  }

  /**
   * Verify feature implementation
   */
  async verify(feature: string, paths: string[]): Promise<GeminiVerifyResult> {
    const request: GeminiAnalysisRequest = {
      type: 'custom',
      paths,
      query: `Is this feature implemented: "${feature}"?
              Provide:
              1. Yes/No answer
              2. Confidence level (0-100%)
              3. Evidence with file locations
              4. Any missing components`,
      outputFormat: 'json',
    };

    const result = await this.analyze(request);

    return {
      success: result.success,
      feature,
      implemented: this.parseImplemented(result.result),
      confidence: this.parseConfidence(result.result),
      evidence: this.parseEvidence(result.result),
      missing: this.parseMissing(result.result),
      tokenUsage: result.tokenUsage,
    };
  }

  /**
   * Get executor status
   */
  getStatus(): GeminiExecutorStatus {
    return {
      initialized: this.isInitialized,
      authenticated: true, // Assume authenticated if initialized
      currentOperation: undefined,
      queueLength: 0,
      rateLimitStatus: this.rateLimiter.getStatus(),
    };
  }

  /**
   * Check if ready
   */
  isReady(): boolean {
    return this.isInitialized;
  }

  /**
   * Abort current operation
   */
  async abort(): Promise<void> {
    // Implementation would track and kill active processes
    this.emit('abort');
  }

  // Private methods as documented above...
}
```

---

## Testing

### Unit Tests

```typescript
describe('GeminiExecutor', () => {
  let executor: GeminiExecutor;

  beforeEach(() => {
    executor = new GeminiExecutor({
      enabled: true,
      authMethod: 'api-key',
      defaultModel: 'gemini-2.5-pro',
      contextLimit: 1000000,
      requestsPerMinute: 60,
      requestsPerDay: 1000,
      analysis: {
        defaultType: 'codebase',
        outputFormat: 'markdown',
        storeInMemory: false,
        memoryNamespace: 'gemini',
        excludePatterns: [],
        maxFileSize: 1048576,
        maxTotalSize: 10485760,
        timeout: 300000,
      },
      autoAnalyze: { enabled: false, triggerSize: 102400, types: [], triggers: [] },
      cache: { enabled: true, ttl: 3600000, maxSize: 100, strategy: 'lru' },
      debug: false,
    });
  });

  describe('buildPathReferences', () => {
    it('should add @ prefix to paths', () => {
      const result = (executor as any).buildPathReferences(['./src', 'lib']);
      expect(result).toContain('@./src');
      expect(result).toContain('@./lib');
    });

    it('should preserve existing @ prefix', () => {
      const result = (executor as any).buildPathReferences(['@/src']);
      expect(result).toBe('@/src');
    });
  });

  describe('escapeForShell', () => {
    it('should escape special characters', () => {
      const escape = (executor as any).escapeForShell.bind(executor);
      expect(escape('test"quote')).toBe('test\\"quote');
      expect(escape('$variable')).toBe('\\$variable');
      expect(escape('back`tick')).toBe('back\\`tick');
    });
  });

  describe('parseJSON', () => {
    it('should extract JSON from markdown code block', () => {
      const input = 'Some text\n```json\n{"key": "value"}\n```\nMore text';
      const result = (executor as any).parseJSON(input);
      expect(result).toEqual({ key: 'value' });
    });

    it('should parse raw JSON', () => {
      const input = '{"key": "value"}';
      const result = (executor as any).parseJSON(input);
      expect(result).toEqual({ key: 'value' });
    });

    it('should handle invalid JSON', () => {
      const input = 'not json';
      const result = (executor as any).parseJSON(input);
      expect(result.parseError).toBeDefined();
    });
  });
});
```

---

## References

- [Gemini CLI Cheatsheet](https://www.philschmid.de/gemini-cli-cheatsheet)
- [AndrewAltimit's Gemini MCP Server](https://gist.github.com/AndrewAltimit/fc5ba068b73e7002cbe4e9721cebb0f5)
- [Claude Flow API Documentation](../../../docs/api/API_DOCUMENTATION.md)
- [CodeFlow Integration Patterns](https://github.com/cassmtnr/codeflow/blob/master/docs/05-integration-patterns.md)
