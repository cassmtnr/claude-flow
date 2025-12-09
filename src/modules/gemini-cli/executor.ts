/**
 * Gemini CLI Module - Executor
 * Handles running Gemini CLI commands and parsing results
 */

import { spawn } from 'child_process';
import { EventEmitter } from 'events';
import { GeminiExecutionError } from './errors.js';
import type {
  AnalysisRequest,
  AnalysisResult,
  AnalysisType,
  GeminiCLIConfig,
  Finding,
} from './types.js';
import { GeminiInstaller } from './installer.js';
import { GeminiCache } from './cache.js';
import { RateLimiter } from './rate-limiter.js';

export class GeminiExecutor extends EventEmitter {
  private installer: GeminiInstaller;
  private cache: GeminiCache;
  private rateLimiter: RateLimiter;
  private config: GeminiCLIConfig;

  constructor(
    installer: GeminiInstaller,
    cache: GeminiCache,
    rateLimiter: RateLimiter,
    config: GeminiCLIConfig
  ) {
    super();
    this.installer = installer;
    this.cache = cache;
    this.rateLimiter = rateLimiter;
    this.config = config;
  }

  /**
   * Execute an analysis request
   */
  async analyze(request: AnalysisRequest): Promise<AnalysisResult> {
    const startTime = Date.now();
    const requestId = this.generateRequestId();

    // Check cache
    const cacheKey = this.cache.generateKey(request as unknown as Record<string, unknown>);
    const cached = await this.cache.get(cacheKey);
    if (cached) {
      this.emit('cache-hit', { requestId, cacheKey });
      return cached;
    }

    // Check rate limit
    await this.rateLimiter.waitForQuota();

    // Get binary path
    const binaryPath = await this.installer.findBinary();
    if (!binaryPath) {
      throw new GeminiExecutionError('Gemini CLI not installed', 'analyze');
    }

    // Build command
    const args = this.buildAnalysisArgs(request);

    this.emit('analysis-start', { requestId, request });

    try {
      // Execute command
      const output = await this.executeCommand(binaryPath, args);

      // Consume rate limit token
      this.rateLimiter.consumeToken();

      // Parse output
      const result = this.parseAnalysisOutput(output, request, requestId, startTime);

      // Cache result
      await this.cache.set(cacheKey, result);

      this.emit('analysis-complete', { requestId, result });

      return result;
    } catch (error) {
      const errorResult: AnalysisResult = {
        success: false,
        requestId,
        timestamp: new Date(),
        duration: Date.now() - startTime,
        tokenUsage: { prompt: 0, completion: 0, total: 0 },
        summary: 'Analysis failed',
        findings: [],
        metrics: { filesAnalyzed: 0, linesOfCode: 0 },
        recommendations: [],
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      };

      this.emit('analysis-error', { requestId, error });

      return errorResult;
    }
  }

  /**
   * Run security scan
   */
  async securityScan(target: string, options?: Partial<AnalysisRequest>): Promise<AnalysisResult> {
    return this.analyze({
      type: 'security',
      target,
      depth: 'deep',
      focus: ['vulnerabilities', 'secrets', 'misconfig'],
      ...options,
    });
  }

  /**
   * Run architecture analysis
   */
  async architectureMap(target: string, options?: Partial<AnalysisRequest>): Promise<AnalysisResult> {
    return this.analyze({
      type: 'architecture',
      target,
      depth: 'comprehensive',
      focus: ['components', 'dependencies', 'layers'],
      ...options,
    });
  }

  /**
   * Run dependency analysis
   */
  async dependencyAnalysis(target: string, options?: Partial<AnalysisRequest>): Promise<AnalysisResult> {
    return this.analyze({
      type: 'dependencies',
      target,
      depth: 'deep',
      focus: ['outdated', 'vulnerabilities', 'licenses'],
      ...options,
    });
  }

  /**
   * Run coverage assessment
   */
  async coverageAssess(target: string, options?: Partial<AnalysisRequest>): Promise<AnalysisResult> {
    return this.analyze({
      type: 'coverage',
      target,
      depth: 'moderate',
      focus: ['untested', 'quality', 'edge-cases'],
      ...options,
    });
  }

  /**
   * Verify feature implementation
   */
  async verify(feature: string, target: string): Promise<{ implemented: boolean; confidence: number; details: string }> {
    const result = await this.analyze({
      type: 'codebase',
      target,
      query: `Verify if this feature is implemented: "${feature}". Return JSON with fields: implemented (boolean), confidence (0-100), details (string)`,
      outputFormat: 'json',
    });

    try {
      const verification = JSON.parse(result.rawOutput || '{}');
      return {
        implemented: verification.implemented ?? false,
        confidence: verification.confidence ?? 0,
        details: verification.details ?? result.summary,
      };
    } catch {
      return {
        implemented: false,
        confidence: 0,
        details: result.summary,
      };
    }
  }

  // ============================================
  // Private Methods
  // ============================================

  private generateRequestId(): string {
    return `gemini-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  private buildAnalysisArgs(request: AnalysisRequest): string[] {
    const args: string[] = [];

    // Target paths
    const targets = Array.isArray(request.target) ? request.target : [request.target];
    args.push(...targets.map(t => `@${t}`));

    // Analysis type prompt
    const typePrompts: Record<AnalysisType, string> = {
      codebase: 'Analyze this codebase comprehensively. Identify patterns, structure, and key components.',
      architecture: 'Map the architecture of this codebase. Identify components, layers, dependencies, and data flows.',
      security: 'Perform a security audit. Find vulnerabilities, insecure patterns, hardcoded secrets, and misconfigurations.',
      dependencies: 'Analyze dependencies. Find outdated packages, vulnerabilities, license issues, and unused dependencies.',
      coverage: 'Assess test coverage. Identify untested code paths, missing edge cases, and testing recommendations.',
    };

    let prompt = typePrompts[request.type];

    // Add custom query
    if (request.query) {
      prompt += `\n\nAdditional focus: ${request.query}`;
    }

    // Add focus areas
    if (request.focus && request.focus.length > 0) {
      prompt += `\n\nFocus on: ${request.focus.join(', ')}`;
    }

    // Add depth instruction
    if (request.depth) {
      const depthInstructions: Record<string, string> = {
        surface: 'Provide a quick overview without deep analysis.',
        moderate: 'Provide moderate detail with key findings.',
        deep: 'Provide detailed analysis with comprehensive findings.',
        comprehensive: 'Provide exhaustive analysis covering all aspects.',
      };
      prompt += `\n\n${depthInstructions[request.depth]}`;
    }

    // Request structured output
    prompt += '\n\nReturn structured output with: summary, findings (type, severity, location, message, suggestion), metrics, and recommendations.';

    args.push('-p', prompt);

    // Output format
    if (request.outputFormat === 'json') {
      args.push('--json');
    }

    return args;
  }

  private async executeCommand(binaryPath: string, args: string[]): Promise<string> {
    return new Promise((resolve, reject) => {
      const child = spawn(binaryPath, args, {
        timeout: this.config.analysis.timeout,
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        const chunk = data.toString();
        stdout += chunk;
        this.emit('output', { type: 'stdout', data: chunk });
      });

      child.stderr.on('data', (data) => {
        const chunk = data.toString();
        stderr += chunk;
        this.emit('output', { type: 'stderr', data: chunk });
      });

      child.on('close', (code) => {
        if (code === 0) {
          resolve(stdout);
        } else {
          reject(
            new GeminiExecutionError(
              `Command failed with code ${code}: ${stderr}`,
              'analyze',
              { exitCode: code, stderr }
            )
          );
        }
      });

      child.on('error', (error) => {
        reject(
          new GeminiExecutionError(
            `Failed to execute command: ${error.message}`,
            'analyze',
            { error: error.message }
          )
        );
      });
    });
  }

  private parseAnalysisOutput(
    output: string,
    request: AnalysisRequest,
    requestId: string,
    startTime: number
  ): AnalysisResult {
    const duration = Date.now() - startTime;

    // Try to parse as JSON first
    try {
      const parsed = JSON.parse(output);
      return {
        success: true,
        requestId,
        timestamp: new Date(),
        duration,
        tokenUsage: parsed.tokenUsage || { prompt: 0, completion: 0, total: 0 },
        summary: parsed.summary || 'Analysis complete',
        findings: this.normalizeFindings(parsed.findings || []),
        metrics: parsed.metrics || { filesAnalyzed: 0, linesOfCode: 0 },
        recommendations: parsed.recommendations || [],
        rawOutput: output,
      };
    } catch {
      // Parse as text
      return {
        success: true,
        requestId,
        timestamp: new Date(),
        duration,
        tokenUsage: { prompt: 0, completion: 0, total: 0 },
        summary: this.extractSummary(output),
        findings: this.extractFindings(output),
        metrics: { filesAnalyzed: 0, linesOfCode: 0 },
        recommendations: this.extractRecommendations(output),
        rawOutput: output,
      };
    }
  }

  private normalizeFindings(findings: unknown[]): Finding[] {
    return findings.map((f: unknown) => {
      const finding = f as Record<string, unknown>;
      return {
        type: (finding.type as string) || 'general',
        severity: this.normalizeSeverity(finding.severity as string),
        location: (finding.location as string) || (finding.file as string) || 'unknown',
        message: (finding.message as string) || (finding.description as string) || '',
        suggestion: finding.suggestion as string | undefined || finding.recommendation as string | undefined,
        code: finding.code as string | undefined,
        line: finding.line as number | undefined,
        column: finding.column as number | undefined,
      };
    });
  }

  private normalizeSeverity(severity: string): Finding['severity'] {
    const normalized = (severity || '').toLowerCase();
    if (['critical', 'high', 'medium', 'low', 'info'].includes(normalized)) {
      return normalized as Finding['severity'];
    }
    return 'info';
  }

  private extractSummary(output: string): string {
    const lines = output.split('\n');
    const summaryLines = lines.slice(0, 5).filter(l => l.trim());
    return summaryLines.join(' ').slice(0, 500);
  }

  private extractFindings(output: string): Finding[] {
    // Basic extraction from text output
    const findings: Finding[] = [];
    const patterns = [
      /(?:error|warning|issue|vulnerability|problem):\s*(.+)/gi,
      /(?:found|detected|identified):\s*(.+)/gi,
    ];

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(output)) !== null) {
        findings.push({
          type: 'general',
          severity: 'info',
          location: 'unknown',
          message: match[1].trim(),
        });
      }
    }

    return findings;
  }

  private extractRecommendations(output: string): Array<{ type: string; priority: 'high' | 'medium' | 'low'; description: string }> {
    const recommendations: Array<{ type: string; priority: 'high' | 'medium' | 'low'; description: string }> = [];
    const patterns = [
      /(?:recommend|suggest|should|consider):\s*(.+)/gi,
      /(?:recommendation|suggestion):\s*(.+)/gi,
    ];

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(output)) !== null) {
        recommendations.push({
          type: 'general',
          priority: 'medium',
          description: match[1].trim(),
        });
      }
    }

    return recommendations;
  }
}
