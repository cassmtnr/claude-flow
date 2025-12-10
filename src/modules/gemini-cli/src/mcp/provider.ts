/**
 * Gemini CLI MCP Provider
 *
 * Implements the MCP server integration for the Gemini CLI module.
 * Registers the 5 analysis tools and routes requests to the executor.
 */

import type {
  GeminiToolDefinition,
  CodebaseAnalyzeInput,
  ArchitectureMapInput,
  SecurityScanInput,
  DependencyAnalyzeInput,
  CoverageAssessInput,
} from './tools.js';
import { GeminiCLIToolDefinitions, getToolDefinition } from './tools.js';
import { getGeminiModule } from '../core/index.js';
import type { AnalysisResult } from '../core/types.js';
import { GeminiExecutionError } from '../core/errors.js';

// ============================================
// MCP Types (minimal subset for integration)
// ============================================

export interface MCPToolRequest {
  toolId: string;
  input: Record<string, unknown>;
  context?: MCPContext;
}

export interface MCPToolResponse {
  success: boolean;
  content: string | Record<string, unknown>;
  isError?: boolean;
  metadata?: Record<string, unknown>;
}

export interface MCPContext {
  sessionId?: string;
  userId?: string;
  conversationHistory?: string[];
  currentQuery?: string;
}

export interface MCPServerConfig {
  name: string;
  version: string;
  capabilities: string[];
}

// ============================================
// Tool Handler Type
// ============================================

type ToolHandler = (input: Record<string, unknown>, context?: MCPContext) => Promise<MCPToolResponse>;

// ============================================
// Provider Class
// ============================================

export class GeminiCLIMCPProvider {
  private handlers: Map<string, ToolHandler> = new Map();
  private initialized: boolean = false;

  constructor() {
    this.registerHandlers();
  }

  // ============================================
  // Server Configuration
  // ============================================

  getServerConfig(): MCPServerConfig {
    return {
      name: 'gemini-cli',
      version: '1.0.0',
      capabilities: ['tools', 'progressive-disclosure'],
    };
  }

  // ============================================
  // Tool Discovery
  // ============================================

  getToolDefinitions(): GeminiToolDefinition[] {
    return GeminiCLIToolDefinitions;
  }

  getToolsByDisclosure(
    level: 'basic' | 'standard' | 'full',
    context?: MCPContext
  ): GeminiToolDefinition[] {
    const levelPriority = { basic: 1, standard: 2, full: 3 };
    const currentLevel = levelPriority[level];

    return GeminiCLIToolDefinitions.filter((tool) => {
      const toolLevel = levelPriority[tool.disclosure.level];
      if (toolLevel > currentLevel) return false;

      // Check if any trigger words match the current query
      if (context?.currentQuery) {
        const query = context.currentQuery.toLowerCase();
        return tool.disclosure.triggers.some((trigger) => query.includes(trigger.toLowerCase()));
      }

      return true;
    }).sort((a, b) => b.disclosure.priority - a.disclosure.priority);
  }

  // ============================================
  // Tool Execution
  // ============================================

  async executeTool(request: MCPToolRequest): Promise<MCPToolResponse> {
    const { toolId, input, context } = request;

    // Ensure module is initialized
    if (!this.initialized) {
      await this.initialize();
    }

    // Get handler
    const handler = this.handlers.get(toolId);
    if (!handler) {
      return {
        success: false,
        isError: true,
        content: `Unknown tool: ${toolId}. Available tools: ${Array.from(this.handlers.keys()).join(', ')}`,
      };
    }

    // Check if module is enabled
    const module = getGeminiModule();
    if (!module.isEnabled()) {
      return {
        success: false,
        isError: true,
        content:
          'Gemini CLI module is not enabled. Run `claude-flow gemini enable` to enable it first.',
      };
    }

    try {
      return await handler(input, context);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      return {
        success: false,
        isError: true,
        content: `Tool execution failed: ${error.message}`,
        metadata: {
          toolId,
          error: error.name,
        },
      };
    }
  }

  // ============================================
  // Initialization
  // ============================================

  async initialize(): Promise<void> {
    if (this.initialized) return;

    const module = getGeminiModule();
    await module.initialize();
    this.initialized = true;
  }

  // ============================================
  // Handler Registration
  // ============================================

  private registerHandlers(): void {
    // 1. Codebase Analyze
    this.handlers.set('codebase_analyze', this.handleCodebaseAnalyze.bind(this));

    // 2. Architecture Map
    this.handlers.set('architecture_map', this.handleArchitectureMap.bind(this));

    // 3. Security Scan
    this.handlers.set('security_scan', this.handleSecurityScan.bind(this));

    // 4. Dependency Analyze
    this.handlers.set('dependency_analyze', this.handleDependencyAnalyze.bind(this));

    // 5. Coverage Assess
    this.handlers.set('coverage_assess', this.handleCoverageAssess.bind(this));
  }

  // ============================================
  // Individual Tool Handlers
  // ============================================

  private async handleCodebaseAnalyze(
    input: Record<string, unknown>,
    _context?: MCPContext
  ): Promise<MCPToolResponse> {
    const typedInput = input as unknown as CodebaseAnalyzeInput;
    const module = getGeminiModule();

    const result = await module.analyze({
      type: 'codebase',
      target: typedInput.paths,
      query: typedInput.query,
      depth: typedInput.depth || 'moderate',
      outputFormat: typedInput.outputFormat || 'markdown',
      storeInMemory: typedInput.storeInMemory,
    });

    return this.formatAnalysisResult(result, 'codebase_analyze');
  }

  private async handleArchitectureMap(
    input: Record<string, unknown>,
    _context?: MCPContext
  ): Promise<MCPToolResponse> {
    const typedInput = input as unknown as ArchitectureMapInput;
    const module = getGeminiModule();
    const executor = module.getExecutor();

    if (!executor) {
      throw new GeminiExecutionError('Executor not available', 'architecture');
    }

    // Build focus areas based on input options
    const focus: string[] = ['components', 'layers'];
    if (typedInput.includeDataFlows ?? true) {
      focus.push('data-flows');
    }
    if (typedInput.includeDependencies ?? true) {
      focus.push('dependencies');
    }

    const result = await executor.architectureMap(typedInput.path, {
      depth: typedInput.depth || 'comprehensive',
      focus,
    });

    return this.formatAnalysisResult(result, 'architecture_map');
  }

  private async handleSecurityScan(
    input: Record<string, unknown>,
    _context?: MCPContext
  ): Promise<MCPToolResponse> {
    const typedInput = input as unknown as SecurityScanInput;
    const module = getGeminiModule();
    const executor = module.getExecutor();

    if (!executor) {
      throw new GeminiExecutionError('Executor not available', 'security');
    }

    // Convert scanTypes to focus areas (cast to string[] for flexibility)
    const focus: string[] = [...(typedInput.scanTypes || ['vulnerabilities', 'secrets', 'misconfig'])];
    // Add severity threshold as a focus item if not low
    if (typedInput.severityThreshold && typedInput.severityThreshold !== 'low') {
      focus.push(`severity:${typedInput.severityThreshold}`);
    }

    const result = await executor.securityScan(typedInput.path, {
      depth: typedInput.depth || 'deep',
      focus,
    });

    return this.formatAnalysisResult(result, 'security_scan');
  }

  private async handleDependencyAnalyze(
    input: Record<string, unknown>,
    _context?: MCPContext
  ): Promise<MCPToolResponse> {
    const typedInput = input as unknown as DependencyAnalyzeInput;
    const module = getGeminiModule();

    const result = await module.analyze({
      type: 'dependencies',
      target: [typedInput.path],
      outputFormat: typedInput.outputFormat || 'markdown',
    });

    // Add dependency-specific metadata
    return {
      ...this.formatAnalysisResult(result, 'dependency_analyze'),
      metadata: {
        toolId: 'dependency_analyze',
        checkOutdated: typedInput.checkOutdated ?? true,
        checkVulnerabilities: typedInput.checkVulnerabilities ?? true,
        checkLicenses: typedInput.checkLicenses ?? true,
      },
    };
  }

  private async handleCoverageAssess(
    input: Record<string, unknown>,
    _context?: MCPContext
  ): Promise<MCPToolResponse> {
    const typedInput = input as unknown as CoverageAssessInput;
    const module = getGeminiModule();

    const result = await module.analyze({
      type: 'coverage',
      target: [typedInput.path],
      depth: typedInput.depth || 'moderate',
      outputFormat: typedInput.outputFormat || 'markdown',
    });

    return {
      ...this.formatAnalysisResult(result, 'coverage_assess'),
      metadata: {
        toolId: 'coverage_assess',
        testDirectory: typedInput.testDirectory,
        focusAreas: typedInput.focusAreas,
      },
    };
  }

  // ============================================
  // Result Formatting
  // ============================================

  private formatAnalysisResult(result: AnalysisResult, toolId: string): MCPToolResponse {
    if (!result.success) {
      return {
        success: false,
        isError: true,
        content: result.errors?.join('\n') || 'Analysis failed',
        metadata: {
          toolId,
          duration: result.duration,
        },
      };
    }

    // Format as markdown for human-readable output
    const content = this.formatMarkdownOutput(result, toolId);

    return {
      success: true,
      content,
      metadata: {
        toolId,
        duration: result.duration,
        filesAnalyzed: result.metrics.filesAnalyzed,
        linesOfCode: result.metrics.linesOfCode,
        findingsCount: result.findings.length,
        recommendationsCount: result.recommendations.length,
      },
    };
  }

  private formatMarkdownOutput(result: AnalysisResult, toolId: string): string {
    const toolDef = getToolDefinition(toolId);
    const toolName = toolDef?.name || toolId;

    const sections: string[] = [];

    // Header
    sections.push(`# ${toolName} Results\n`);

    // Summary
    sections.push(`## Summary\n\n${result.summary}\n`);

    // Metrics
    sections.push(`## Metrics\n`);
    sections.push(`- **Files Analyzed**: ${result.metrics.filesAnalyzed}`);
    sections.push(`- **Lines of Code**: ${result.metrics.linesOfCode}`);
    sections.push(`- **Duration**: ${result.duration}ms\n`);

    // Findings
    if (result.findings.length > 0) {
      sections.push(`## Findings (${result.findings.length})\n`);

      // Group by severity
      const bySeverity = this.groupBySeverity(result.findings);

      for (const [severity, findings] of Object.entries(bySeverity)) {
        if (findings.length === 0) continue;
        sections.push(`### ${severity.charAt(0).toUpperCase() + severity.slice(1)} (${findings.length})\n`);

        for (const finding of findings.slice(0, 10)) {
          const icon = this.getSeverityIcon(finding.severity);
          sections.push(`${icon} **${finding.message}**`);
          if (finding.location !== 'unknown') {
            sections.push(`   - Location: \`${finding.location}\``);
          }
          if (finding.suggestion) {
            sections.push(`   - Suggestion: ${finding.suggestion}`);
          }
          sections.push('');
        }

        if (findings.length > 10) {
          sections.push(`*... and ${findings.length - 10} more ${severity} findings*\n`);
        }
      }
    }

    // Recommendations
    if (result.recommendations.length > 0) {
      sections.push(`## Recommendations\n`);
      for (const rec of result.recommendations.slice(0, 5)) {
        sections.push(`- ${rec}`);
      }
      if (result.recommendations.length > 5) {
        sections.push(`\n*... and ${result.recommendations.length - 5} more recommendations*`);
      }
      sections.push('');
    }

    return sections.join('\n');
  }

  private groupBySeverity(
    findings: AnalysisResult['findings']
  ): Record<string, AnalysisResult['findings']> {
    const groups: Record<string, AnalysisResult['findings']> = {
      critical: [],
      high: [],
      medium: [],
      low: [],
      info: [],
    };

    for (const finding of findings) {
      if (groups[finding.severity]) {
        groups[finding.severity].push(finding);
      } else {
        groups.info.push(finding);
      }
    }

    return groups;
  }

  private getSeverityIcon(severity: string): string {
    switch (severity) {
      case 'critical':
        return '🔴';
      case 'high':
        return '🟠';
      case 'medium':
        return '🟡';
      case 'low':
        return '🟢';
      default:
        return 'ℹ️';
    }
  }
}

// ============================================
// Singleton Instance
// ============================================

let providerInstance: GeminiCLIMCPProvider | null = null;

export function getGeminiCLIMCPProvider(): GeminiCLIMCPProvider {
  if (!providerInstance) {
    providerInstance = new GeminiCLIMCPProvider();
  }
  return providerInstance;
}

// ============================================
// MCP Server Registration Helper
// ============================================

export interface MCPServerRegistration {
  name: string;
  version: string;
  tools: GeminiToolDefinition[];
  execute: (request: MCPToolRequest) => Promise<MCPToolResponse>;
}

export function createMCPServerRegistration(): MCPServerRegistration {
  const provider = getGeminiCLIMCPProvider();
  const config = provider.getServerConfig();

  return {
    name: config.name,
    version: config.version,
    tools: provider.getToolDefinitions(),
    execute: (request) => provider.executeTool(request),
  };
}
