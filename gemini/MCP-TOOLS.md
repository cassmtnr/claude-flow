# Gemini CLI MCP Tools Integration

> Complete documentation for registering and exposing Gemini CLI analysis tools through Claude Flow's MCP infrastructure with progressive disclosure and MCP 2025-11 compliance.

## Table of Contents

1. [Overview](#overview)
2. [MCP Architecture Integration](#mcp-architecture-integration)
3. [Tool Registration](#tool-registration)
4. [Progressive Disclosure System](#progressive-disclosure-system)
5. [Tool Definitions](#tool-definitions)
6. [Request/Response Protocol](#requestresponse-protocol)
7. [Async Job Integration](#async-job-integration)
8. [Context Sharing with Claude Flow](#context-sharing-with-claude-flow)
9. [Error Handling & Fallbacks](#error-handling--fallbacks)
10. [Performance Optimization](#performance-optimization)
11. [Security Considerations](#security-considerations)
12. [Testing Strategy](#testing-strategy)
13. [API Reference](#api-reference)

---

## Overview

The Gemini CLI module exposes its specialized analysis tools through Claude Flow's Model Context Protocol (MCP) infrastructure. This enables seamless integration with the claude-flow tooling ecosystem while maintaining Gemini's unique capabilities for large-context analysis.

### Key Principles

```
┌─────────────────────────────────────────────────────────────────┐
│                    MCP Tool Integration                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Claude Flow MCP Server                                         │
│  ├── Core Tools (112 claude-flow + ruv-swarm)                  │
│  ├── Progressive Disclosure Layer                              │
│  └── Gemini CLI Tools (5 analysis tools)                       │
│      ├── mcp__gemini-cli__codebase_analyze                     │
│      ├── mcp__gemini-cli__architecture_map                     │
│      ├── mcp__gemini-cli__security_scan                        │
│      ├── mcp__gemini-cli__dependency_analyze                   │
│      └── mcp__gemini-cli__coverage_assess                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Integration Benefits

| Benefit | Description |
|---------|-------------|
| **Unified Access** | Single MCP protocol for all tools |
| **Large Context** | Gemini's 1M+ token window for whole-codebase analysis |
| **Progressive Disclosure** | Tools appear when relevant to context |
| **Async Support** | Long-running analysis with job handles |
| **Version Negotiation** | MCP 2025-11 compliance with backward compatibility |

---

## MCP Architecture Integration

### Namespace Registration

Gemini CLI tools are registered under the `gemini-cli` namespace:

```typescript
// src/mcp/providers/gemini-cli/index.ts

import { MCPToolProvider } from '../../types.js';
import { GeminiCLIToolDefinitions } from './tools.js';
import { GeminiModuleManager } from '../../../modules/gemini-cli/manager.js';

export class GeminiCLIMCPProvider implements MCPToolProvider {
  readonly namespace = 'gemini-cli';
  readonly version = '1.0.0';

  private manager: GeminiModuleManager;

  constructor(manager: GeminiModuleManager) {
    this.manager = manager;
  }

  /**
   * Register all Gemini CLI tools with the MCP server
   */
  async register(server: MCPServer): Promise<void> {
    // Check if module is enabled
    if (!await this.manager.isEnabled()) {
      return; // Don't register if module not enabled
    }

    // Register each tool
    for (const tool of GeminiCLIToolDefinitions) {
      await server.registerTool({
        name: `mcp__${this.namespace}__${tool.id}`,
        description: tool.description,
        inputSchema: tool.inputSchema,
        outputSchema: tool.outputSchema,
        handler: this.createHandler(tool.id),
        metadata: {
          namespace: this.namespace,
          category: tool.category,
          progressiveDisclosure: tool.disclosure,
          estimatedDuration: tool.estimatedDuration,
          tokenEstimate: tool.tokenEstimate,
        },
      });
    }
  }

  /**
   * Create handler for specific tool
   */
  private createHandler(toolId: string): MCPToolHandler {
    return async (params: unknown, context: MCPContext) => {
      // Validate module is authenticated
      const status = await this.manager.getStatus();
      if (!status.authenticated) {
        throw new GeminiMCPError('GEMINI_NOT_AUTHENTICATED',
          'Gemini CLI is not authenticated. Run `claude-flow gemini auth` first.');
      }

      // Route to appropriate executor method
      return await this.manager.executor.execute(toolId, params, context);
    };
  }
}
```

### Server Integration Points

```typescript
// src/mcp/server-factory.ts (additions)

import { GeminiCLIMCPProvider } from './providers/gemini-cli/index.js';
import { GeminiModuleManager } from '../modules/gemini-cli/manager.js';

export async function createMCPServer(config: MCPServerConfig): Promise<MCPServer> {
  const server = new MCPServer(config);

  // Register core providers
  await server.registerProvider(new CoreToolsProvider());
  await server.registerProvider(new RuvSwarmProvider());

  // Register Gemini CLI provider (if enabled)
  if (config.modules?.geminiCli?.enabled) {
    const geminiManager = new GeminiModuleManager(config.modules.geminiCli);
    await server.registerProvider(new GeminiCLIMCPProvider(geminiManager));

    // Track in module registry
    server.moduleRegistry.register('gemini-cli', {
      provider: GeminiCLIMCPProvider,
      manager: geminiManager,
      status: 'active',
    });
  }

  return server;
}
```

---

## Tool Registration

### MCP 2025-11 Compliant Registration

Each Gemini CLI tool is registered with full MCP 2025-11 compliance:

```typescript
// src/mcp/providers/gemini-cli/tools.ts

import { MCPToolDefinition } from '../../types.js';
import {
  GeminiAnalysisType,
  GeminiAnalysisRequest,
  GeminiAnalysisResult
} from '../../../modules/gemini-cli/types.js';

export const GeminiCLIToolDefinitions: MCPToolDefinition[] = [
  {
    id: 'codebase_analyze',
    name: 'mcp__gemini-cli__codebase_analyze',
    description: 'Perform comprehensive codebase analysis using Gemini\'s large context window. Analyzes entire repositories for patterns, quality issues, and improvement opportunities.',
    category: 'analysis',
    version: '1.0.0',

    // JSON Schema 1.1 (Draft 2020-12) compliant
    inputSchema: {
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      type: 'object',
      properties: {
        target: {
          type: 'string',
          description: 'Path to file or directory to analyze',
          default: '.',
        },
        depth: {
          type: 'string',
          enum: ['surface', 'moderate', 'deep', 'comprehensive'],
          default: 'moderate',
          description: 'Analysis depth level',
        },
        focus: {
          type: 'array',
          items: {
            type: 'string',
            enum: ['quality', 'patterns', 'dependencies', 'security', 'performance'],
          },
          description: 'Specific focus areas for analysis',
        },
        includeMetrics: {
          type: 'boolean',
          default: true,
          description: 'Include quantitative metrics',
        },
        maxFiles: {
          type: 'integer',
          minimum: 1,
          maximum: 1000,
          default: 100,
          description: 'Maximum files to include in analysis',
        },
        excludePatterns: {
          type: 'array',
          items: { type: 'string' },
          default: ['node_modules/**', '.git/**', 'dist/**'],
          description: 'Glob patterns to exclude',
        },
      },
      required: [],
      additionalProperties: false,
    },

    outputSchema: {
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      type: 'object',
      properties: {
        summary: {
          type: 'string',
          description: 'Executive summary of findings',
        },
        findings: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              type: { type: 'string' },
              severity: { type: 'string', enum: ['info', 'warning', 'error', 'critical'] },
              location: { type: 'string' },
              message: { type: 'string' },
              suggestion: { type: 'string' },
            },
          },
        },
        metrics: {
          type: 'object',
          additionalProperties: true,
        },
        recommendations: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              priority: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
              category: { type: 'string' },
              title: { type: 'string' },
              description: { type: 'string' },
              effort: { type: 'string' },
              impact: { type: 'string' },
            },
          },
        },
        tokensUsed: { type: 'integer' },
        analysisTime: { type: 'number' },
      },
      required: ['summary', 'findings', 'recommendations'],
    },

    // Progressive disclosure metadata
    disclosure: {
      level: 1, // Show in first tier
      trigger: 'codebase_context', // Show when codebase context detected
      conditions: [
        { type: 'module_enabled', module: 'gemini-cli' },
        { type: 'file_count_gt', threshold: 10 },
      ],
    },

    // Execution metadata
    estimatedDuration: '30-120s',
    tokenEstimate: {
      min: 10000,
      max: 500000,
      formula: 'files * avgLinesPerFile * 1.5',
    },

    // Async support
    asyncSupport: {
      enabled: true,
      pollInterval: 5000, // 5 seconds
      maxDuration: 600000, // 10 minutes
    },
  },

  {
    id: 'architecture_map',
    name: 'mcp__gemini-cli__architecture_map',
    description: 'Generate visual architecture diagrams and documentation from codebase analysis. Creates dependency graphs, component diagrams, and system overviews.',
    category: 'visualization',
    version: '1.0.0',

    inputSchema: {
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      type: 'object',
      properties: {
        target: {
          type: 'string',
          description: 'Path to analyze',
          default: '.',
        },
        outputFormat: {
          type: 'string',
          enum: ['mermaid', 'plantuml', 'dot', 'json', 'markdown'],
          default: 'mermaid',
          description: 'Output diagram format',
        },
        diagramTypes: {
          type: 'array',
          items: {
            type: 'string',
            enum: ['component', 'dependency', 'sequence', 'class', 'flow', 'deployment'],
          },
          default: ['component', 'dependency'],
          description: 'Types of diagrams to generate',
        },
        includeExternal: {
          type: 'boolean',
          default: false,
          description: 'Include external dependencies in diagrams',
        },
        depth: {
          type: 'integer',
          minimum: 1,
          maximum: 10,
          default: 3,
          description: 'Maximum depth of dependency traversal',
        },
      },
      required: [],
      additionalProperties: false,
    },

    outputSchema: {
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      type: 'object',
      properties: {
        diagrams: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              type: { type: 'string' },
              format: { type: 'string' },
              content: { type: 'string' },
              description: { type: 'string' },
            },
          },
        },
        components: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              path: { type: 'string' },
              type: { type: 'string' },
              dependencies: { type: 'array', items: { type: 'string' } },
              description: { type: 'string' },
            },
          },
        },
        layers: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              components: { type: 'array', items: { type: 'string' } },
            },
          },
        },
        summary: { type: 'string' },
        tokensUsed: { type: 'integer' },
        analysisTime: { type: 'number' },
      },
      required: ['diagrams', 'components'],
    },

    disclosure: {
      level: 2,
      trigger: 'architecture_query',
      conditions: [
        { type: 'module_enabled', module: 'gemini-cli' },
        { type: 'query_contains', keywords: ['architecture', 'diagram', 'structure', 'components'] },
      ],
    },

    estimatedDuration: '20-60s',
    tokenEstimate: {
      min: 5000,
      max: 200000,
    },
    asyncSupport: {
      enabled: true,
      pollInterval: 3000,
      maxDuration: 300000,
    },
  },

  {
    id: 'security_scan',
    name: 'mcp__gemini-cli__security_scan',
    description: 'Comprehensive security vulnerability scanning using Gemini\'s deep analysis capabilities. Identifies OWASP Top 10 vulnerabilities, secrets, and security anti-patterns.',
    category: 'security',
    version: '1.0.0',

    inputSchema: {
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      type: 'object',
      properties: {
        target: {
          type: 'string',
          description: 'Path to scan',
          default: '.',
        },
        scanTypes: {
          type: 'array',
          items: {
            type: 'string',
            enum: [
              'injection', 'authentication', 'xss', 'xxe', 'access_control',
              'misconfig', 'components', 'logging', 'deserialization', 'secrets',
              'cryptography', 'input_validation', 'error_handling'
            ],
          },
          default: ['injection', 'authentication', 'xss', 'secrets', 'misconfig'],
          description: 'Types of security issues to scan for',
        },
        severity: {
          type: 'string',
          enum: ['info', 'low', 'medium', 'high', 'critical'],
          default: 'low',
          description: 'Minimum severity to report',
        },
        includeRemediation: {
          type: 'boolean',
          default: true,
          description: 'Include remediation suggestions',
        },
        scanDependencies: {
          type: 'boolean',
          default: true,
          description: 'Scan dependencies for known vulnerabilities',
        },
      },
      required: [],
      additionalProperties: false,
    },

    outputSchema: {
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      type: 'object',
      properties: {
        summary: {
          type: 'object',
          properties: {
            totalIssues: { type: 'integer' },
            critical: { type: 'integer' },
            high: { type: 'integer' },
            medium: { type: 'integer' },
            low: { type: 'integer' },
            info: { type: 'integer' },
            securityScore: { type: 'number' },
          },
        },
        vulnerabilities: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              type: { type: 'string' },
              severity: { type: 'string' },
              location: { type: 'string' },
              line: { type: 'integer' },
              title: { type: 'string' },
              description: { type: 'string' },
              cwe: { type: 'string' },
              owasp: { type: 'string' },
              remediation: { type: 'string' },
              references: { type: 'array', items: { type: 'string' } },
            },
          },
        },
        secretsFound: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              type: { type: 'string' },
              file: { type: 'string' },
              line: { type: 'integer' },
              masked: { type: 'string' },
            },
          },
        },
        dependencyVulnerabilities: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              package: { type: 'string' },
              version: { type: 'string' },
              vulnerability: { type: 'string' },
              severity: { type: 'string' },
              fixVersion: { type: 'string' },
            },
          },
        },
        tokensUsed: { type: 'integer' },
        analysisTime: { type: 'number' },
      },
      required: ['summary', 'vulnerabilities'],
    },

    disclosure: {
      level: 2,
      trigger: 'security_context',
      conditions: [
        { type: 'module_enabled', module: 'gemini-cli' },
        { type: 'query_contains', keywords: ['security', 'vulnerability', 'audit', 'scan'] },
      ],
    },

    estimatedDuration: '60-180s',
    tokenEstimate: {
      min: 20000,
      max: 400000,
    },
    asyncSupport: {
      enabled: true,
      pollInterval: 5000,
      maxDuration: 600000,
    },
  },

  {
    id: 'dependency_analyze',
    name: 'mcp__gemini-cli__dependency_analyze',
    description: 'Analyze project dependencies for updates, vulnerabilities, license compliance, and optimization opportunities.',
    category: 'dependencies',
    version: '1.0.0',

    inputSchema: {
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      type: 'object',
      properties: {
        target: {
          type: 'string',
          description: 'Path to project root',
          default: '.',
        },
        analysisTypes: {
          type: 'array',
          items: {
            type: 'string',
            enum: ['updates', 'security', 'licenses', 'duplicates', 'unused', 'size'],
          },
          default: ['updates', 'security', 'licenses'],
          description: 'Types of dependency analysis to perform',
        },
        includeDevDependencies: {
          type: 'boolean',
          default: true,
          description: 'Include dev dependencies in analysis',
        },
        checkTransitive: {
          type: 'boolean',
          default: true,
          description: 'Check transitive dependencies',
        },
        licensePolicy: {
          type: 'object',
          properties: {
            allowed: { type: 'array', items: { type: 'string' } },
            denied: { type: 'array', items: { type: 'string' } },
          },
          description: 'License policy for compliance checking',
        },
      },
      required: [],
      additionalProperties: false,
    },

    outputSchema: {
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      type: 'object',
      properties: {
        summary: {
          type: 'object',
          properties: {
            totalDependencies: { type: 'integer' },
            directDependencies: { type: 'integer' },
            devDependencies: { type: 'integer' },
            outdatedCount: { type: 'integer' },
            vulnerableCount: { type: 'integer' },
            licenseIssues: { type: 'integer' },
          },
        },
        outdated: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              current: { type: 'string' },
              latest: { type: 'string' },
              type: { type: 'string' },
              breaking: { type: 'boolean' },
            },
          },
        },
        vulnerabilities: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              package: { type: 'string' },
              severity: { type: 'string' },
              advisory: { type: 'string' },
              fixVersion: { type: 'string' },
            },
          },
        },
        licenses: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              package: { type: 'string' },
              license: { type: 'string' },
              status: { type: 'string', enum: ['allowed', 'denied', 'unknown'] },
            },
          },
        },
        recommendations: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              type: { type: 'string' },
              priority: { type: 'string' },
              description: { type: 'string' },
              action: { type: 'string' },
            },
          },
        },
        tokensUsed: { type: 'integer' },
        analysisTime: { type: 'number' },
      },
      required: ['summary'],
    },

    disclosure: {
      level: 2,
      trigger: 'dependency_context',
      conditions: [
        { type: 'module_enabled', module: 'gemini-cli' },
        { type: 'file_exists', patterns: ['package.json', 'requirements.txt', 'Cargo.toml', 'go.mod'] },
      ],
    },

    estimatedDuration: '15-45s',
    tokenEstimate: {
      min: 5000,
      max: 100000,
    },
    asyncSupport: {
      enabled: true,
      pollInterval: 3000,
      maxDuration: 180000,
    },
  },

  {
    id: 'coverage_assess',
    name: 'mcp__gemini-cli__coverage_assess',
    description: 'Assess test coverage quality, identify untested code paths, and suggest test improvements.',
    category: 'testing',
    version: '1.0.0',

    inputSchema: {
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      type: 'object',
      properties: {
        target: {
          type: 'string',
          description: 'Path to analyze',
          default: '.',
        },
        coverageDataPath: {
          type: 'string',
          description: 'Path to existing coverage report (lcov, istanbul, etc.)',
        },
        analysisTypes: {
          type: 'array',
          items: {
            type: 'string',
            enum: ['gaps', 'quality', 'suggestions', 'critical_paths'],
          },
          default: ['gaps', 'suggestions'],
          description: 'Types of coverage analysis to perform',
        },
        targetCoverage: {
          type: 'number',
          minimum: 0,
          maximum: 100,
          default: 80,
          description: 'Target coverage percentage',
        },
        focusAreas: {
          type: 'array',
          items: { type: 'string' },
          description: 'Specific files or directories to focus on',
        },
      },
      required: [],
      additionalProperties: false,
    },

    outputSchema: {
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      type: 'object',
      properties: {
        summary: {
          type: 'object',
          properties: {
            currentCoverage: { type: 'number' },
            targetCoverage: { type: 'number' },
            gap: { type: 'number' },
            filesAnalyzed: { type: 'integer' },
            untestedFiles: { type: 'integer' },
          },
        },
        gaps: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              file: { type: 'string' },
              coverage: { type: 'number' },
              untestedLines: { type: 'array', items: { type: 'integer' } },
              untestedFunctions: { type: 'array', items: { type: 'string' } },
              priority: { type: 'string' },
              reason: { type: 'string' },
            },
          },
        },
        criticalPaths: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              path: { type: 'string' },
              description: { type: 'string' },
              coverage: { type: 'number' },
              risk: { type: 'string' },
            },
          },
        },
        suggestions: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              file: { type: 'string' },
              testType: { type: 'string' },
              description: { type: 'string' },
              example: { type: 'string' },
              priority: { type: 'string' },
            },
          },
        },
        tokensUsed: { type: 'integer' },
        analysisTime: { type: 'number' },
      },
      required: ['summary', 'gaps'],
    },

    disclosure: {
      level: 2,
      trigger: 'testing_context',
      conditions: [
        { type: 'module_enabled', module: 'gemini-cli' },
        { type: 'directory_exists', patterns: ['tests', '__tests__', 'spec', 'test'] },
      ],
    },

    estimatedDuration: '20-60s',
    tokenEstimate: {
      min: 10000,
      max: 200000,
    },
    asyncSupport: {
      enabled: true,
      pollInterval: 3000,
      maxDuration: 300000,
    },
  },
];
```

---

## Progressive Disclosure System

### Integration with Claude Flow's Progressive Disclosure

Gemini CLI tools integrate with the existing Progressive Disclosure system from MCP 2025-11:

```typescript
// src/mcp/disclosure/gemini-cli-disclosure.ts

import { DisclosureEngine, DisclosureContext, ToolVisibility } from '../disclosure.js';
import { GeminiCLIToolDefinitions } from '../providers/gemini-cli/tools.js';
import { GeminiModuleManager } from '../../modules/gemini-cli/manager.js';

export class GeminiCLIDisclosureHandler {
  private engine: DisclosureEngine;
  private manager: GeminiModuleManager;

  constructor(engine: DisclosureEngine, manager: GeminiModuleManager) {
    this.engine = engine;
    this.manager = manager;
  }

  /**
   * Register disclosure rules for Gemini CLI tools
   */
  async register(): Promise<void> {
    // Add module availability condition
    this.engine.addConditionHandler('module_enabled', async (params, context) => {
      if (params.module !== 'gemini-cli') return true;
      return await this.manager.isEnabled();
    });

    // Add authentication check condition
    this.engine.addConditionHandler('gemini_authenticated', async (params, context) => {
      const status = await this.manager.getStatus();
      return status.authenticated;
    });

    // Register tool visibility rules
    for (const tool of GeminiCLIToolDefinitions) {
      this.engine.registerTool({
        toolId: `mcp__gemini-cli__${tool.id}`,
        disclosure: tool.disclosure,
        fallbackLevel: tool.disclosure.level,
      });
    }
  }

  /**
   * Evaluate tool visibility based on current context
   */
  async evaluateVisibility(context: DisclosureContext): Promise<Map<string, ToolVisibility>> {
    const visibility = new Map<string, ToolVisibility>();

    for (const tool of GeminiCLIToolDefinitions) {
      const toolId = `mcp__gemini-cli__${tool.id}`;

      // Check all conditions
      let allConditionsMet = true;
      for (const condition of tool.disclosure.conditions) {
        const result = await this.engine.evaluateCondition(condition, context);
        if (!result) {
          allConditionsMet = false;
          break;
        }
      }

      visibility.set(toolId, {
        visible: allConditionsMet,
        level: tool.disclosure.level,
        reason: allConditionsMet ? 'conditions_met' : 'conditions_not_met',
      });
    }

    return visibility;
  }
}
```

### Visibility Levels

| Level | Description | When Shown |
|-------|-------------|------------|
| **Level 1** | Core tools | Always visible when module enabled |
| **Level 2** | Context-aware tools | When relevant context detected |
| **Level 3** | Advanced tools | On explicit user request |

### Context Detection Rules

```typescript
// Context triggers for progressive disclosure

interface DisclosureTrigger {
  type: string;
  keywords?: string[];
  patterns?: string[];
  conditions?: Array<{
    type: string;
    params: Record<string, unknown>;
  }>;
}

const GeminiCLITriggers: Record<string, DisclosureTrigger> = {
  codebase_context: {
    type: 'composite',
    keywords: ['analyze', 'review', 'codebase', 'project', 'repository'],
    conditions: [
      { type: 'file_count_gt', params: { threshold: 10 } },
      { type: 'has_source_files', params: {} },
    ],
  },

  architecture_query: {
    type: 'keyword',
    keywords: [
      'architecture', 'diagram', 'structure', 'components',
      'modules', 'dependencies', 'layers', 'design',
    ],
  },

  security_context: {
    type: 'composite',
    keywords: ['security', 'vulnerability', 'audit', 'scan', 'secrets'],
    conditions: [
      { type: 'has_source_files', params: {} },
    ],
  },

  dependency_context: {
    type: 'file_exists',
    patterns: [
      'package.json', 'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml',
      'requirements.txt', 'Pipfile', 'pyproject.toml',
      'Cargo.toml', 'Cargo.lock',
      'go.mod', 'go.sum',
      'Gemfile', 'Gemfile.lock',
      'composer.json', 'composer.lock',
    ],
  },

  testing_context: {
    type: 'composite',
    keywords: ['test', 'coverage', 'testing', 'unit test', 'integration'],
    patterns: ['tests/**', '__tests__/**', 'spec/**', '*.test.*', '*.spec.*'],
  },
};
```

---

## Request/Response Protocol

### Standard Request Format

```typescript
// MCP request for Gemini CLI tool

interface GeminiMCPRequest {
  jsonrpc: '2.0';
  id: string | number;
  method: 'tools/call';
  params: {
    name: string; // e.g., 'mcp__gemini-cli__codebase_analyze'
    arguments: Record<string, unknown>;

    // MCP 2025-11 additions
    mode?: 'sync' | 'async'; // Default: 'sync' for small, 'async' for large
    timeout?: number; // Milliseconds
    priority?: 'low' | 'normal' | 'high';

    // Context passing
    context?: {
      conversationId?: string;
      previousAnalysis?: string;
      userPreferences?: Record<string, unknown>;
    };
  };
}

// Example request
const exampleRequest: GeminiMCPRequest = {
  jsonrpc: '2.0',
  id: 'req_123',
  method: 'tools/call',
  params: {
    name: 'mcp__gemini-cli__codebase_analyze',
    arguments: {
      target: './src',
      depth: 'deep',
      focus: ['quality', 'patterns'],
      includeMetrics: true,
    },
    mode: 'async', // Large analysis, use async
    priority: 'normal',
    context: {
      conversationId: 'conv_abc',
    },
  },
};
```

### Response Format

```typescript
// Sync response
interface GeminiMCPSyncResponse {
  jsonrpc: '2.0';
  id: string | number;
  result: {
    content: Array<{
      type: 'text' | 'json' | 'image';
      text?: string;
      data?: unknown;
    }>;
    metadata?: {
      tokensUsed: number;
      analysisTime: number;
      geminiModel: string;
      cached: boolean;
    };
    isError: boolean;
  };
}

// Async response (job submitted)
interface GeminiMCPAsyncResponse {
  jsonrpc: '2.0';
  id: string | number;
  result: {
    job_handle: string;
    status: 'queued' | 'in_progress';
    estimated_duration?: number;
    poll_url?: string;
  };
}

// Poll response
interface GeminiMCPPollResponse {
  jsonrpc: '2.0';
  id: string | number;
  result: {
    status: 'queued' | 'in_progress' | 'completed' | 'failed';
    progress?: number; // 0-100
    progress_message?: string;
    result?: unknown; // Present when completed
    error?: {
      code: string;
      message: string;
      details?: unknown;
    };
  };
}
```

### Error Response Format

```typescript
interface GeminiMCPErrorResponse {
  jsonrpc: '2.0';
  id: string | number;
  error: {
    code: number;
    message: string;
    data?: {
      errorType: string;
      details: string;
      recoverable: boolean;
      retryAfter?: number;
      suggestion?: string;
    };
  };
}

// Error codes specific to Gemini CLI
const GEMINI_ERROR_CODES = {
  MODULE_NOT_ENABLED: -32001,
  AUTHENTICATION_REQUIRED: -32002,
  GEMINI_CLI_NOT_INSTALLED: -32003,
  RATE_LIMIT_EXCEEDED: -32004,
  CONTEXT_TOO_LARGE: -32005,
  ANALYSIS_TIMEOUT: -32006,
  INVALID_TARGET_PATH: -32007,
  GEMINI_API_ERROR: -32008,
} as const;
```

---

## Async Job Integration

### Job Lifecycle for Long-Running Analysis

```typescript
// src/mcp/providers/gemini-cli/async-handler.ts

import { AsyncJobManager } from '../../async/job-manager-mcp25.js';
import { GeminiExecutor } from '../../../modules/gemini-cli/executor.js';

export class GeminiAsyncHandler {
  private jobManager: AsyncJobManager;
  private executor: GeminiExecutor;

  constructor(jobManager: AsyncJobManager, executor: GeminiExecutor) {
    this.jobManager = jobManager;
    this.executor = executor;
  }

  /**
   * Submit async analysis job
   */
  async submitJob(
    toolId: string,
    params: Record<string, unknown>,
    context: MCPContext
  ): Promise<{ job_handle: string; status: 'queued' }> {
    // Create job with metadata
    const jobHandle = await this.jobManager.createJob({
      type: 'gemini_analysis',
      toolId,
      params,
      context: {
        sessionId: context.sessionId,
        conversationId: context.conversationId,
      },
      priority: params.priority as string || 'normal',
      maxDuration: this.getMaxDuration(toolId),
    });

    // Start background execution
    this.executeInBackground(jobHandle, toolId, params, context);

    return {
      job_handle: jobHandle,
      status: 'queued',
    };
  }

  /**
   * Execute job in background
   */
  private async executeInBackground(
    jobHandle: string,
    toolId: string,
    params: Record<string, unknown>,
    context: MCPContext
  ): Promise<void> {
    try {
      // Update to in_progress
      await this.jobManager.updateJob(jobHandle, {
        status: 'in_progress',
        progress: 0,
        progressMessage: 'Starting Gemini analysis...',
      });

      // Execute with progress callbacks
      const result = await this.executor.execute(toolId, params, {
        ...context,
        onProgress: async (progress: number, message: string) => {
          await this.jobManager.updateJob(jobHandle, {
            progress,
            progressMessage: message,
          });
        },
      });

      // Mark completed
      await this.jobManager.completeJob(jobHandle, result);

    } catch (error) {
      // Mark failed
      await this.jobManager.failJob(jobHandle, {
        code: error.code || 'ANALYSIS_ERROR',
        message: error.message,
        details: error.details,
        recoverable: error.recoverable ?? false,
      });
    }
  }

  /**
   * Poll job status
   */
  async pollJob(jobHandle: string): Promise<JobStatus> {
    return await this.jobManager.getJobStatus(jobHandle);
  }

  /**
   * Cancel job
   */
  async cancelJob(jobHandle: string): Promise<boolean> {
    return await this.jobManager.cancelJob(jobHandle);
  }

  /**
   * Get max duration for tool
   */
  private getMaxDuration(toolId: string): number {
    const durations: Record<string, number> = {
      codebase_analyze: 600000,   // 10 minutes
      architecture_map: 300000,   // 5 minutes
      security_scan: 600000,      // 10 minutes
      dependency_analyze: 180000, // 3 minutes
      coverage_assess: 300000,    // 5 minutes
    };
    return durations[toolId] || 300000;
  }
}
```

### Progress Reporting

```typescript
// Progress stages for different analysis types

interface ProgressStage {
  stage: string;
  startPercent: number;
  endPercent: number;
  message: string;
}

const CodebaseAnalysisStages: ProgressStage[] = [
  { stage: 'scan', startPercent: 0, endPercent: 10, message: 'Scanning file structure...' },
  { stage: 'collect', startPercent: 10, endPercent: 30, message: 'Collecting source files...' },
  { stage: 'prepare', startPercent: 30, endPercent: 40, message: 'Preparing analysis context...' },
  { stage: 'analyze', startPercent: 40, endPercent: 85, message: 'Analyzing with Gemini...' },
  { stage: 'parse', startPercent: 85, endPercent: 95, message: 'Parsing results...' },
  { stage: 'format', startPercent: 95, endPercent: 100, message: 'Formatting output...' },
];

const SecurityScanStages: ProgressStage[] = [
  { stage: 'scan', startPercent: 0, endPercent: 10, message: 'Scanning codebase...' },
  { stage: 'secrets', startPercent: 10, endPercent: 25, message: 'Checking for secrets...' },
  { stage: 'vulnerabilities', startPercent: 25, endPercent: 60, message: 'Analyzing vulnerabilities...' },
  { stage: 'dependencies', startPercent: 60, endPercent: 80, message: 'Checking dependencies...' },
  { stage: 'report', startPercent: 80, endPercent: 100, message: 'Generating security report...' },
];
```

---

## Context Sharing with Claude Flow

### Memory Integration

Gemini CLI tools can share analysis results through Claude Flow's memory system:

```typescript
// src/mcp/providers/gemini-cli/context-sharing.ts

import { MemoryManager } from '../../memory/manager.js';

export class GeminiContextSharing {
  private memory: MemoryManager;

  constructor(memory: MemoryManager) {
    this.memory = memory;
  }

  /**
   * Store analysis result in shared memory
   */
  async shareAnalysisResult(
    analysisId: string,
    toolId: string,
    result: unknown,
    options: {
      ttl?: number;
      shareWithAgents?: boolean;
      namespace?: string;
    } = {}
  ): Promise<void> {
    const memoryKey = `gemini/analysis/${analysisId}`;

    await this.memory.store({
      key: memoryKey,
      value: {
        toolId,
        result,
        timestamp: Date.now(),
        expiry: options.ttl ? Date.now() + options.ttl : undefined,
      },
      namespace: options.namespace || 'gemini-cli',
      type: 'analysis_result',
      metadata: {
        shareWithAgents: options.shareWithAgents ?? true,
        source: 'gemini-cli',
      },
    });
  }

  /**
   * Retrieve previous analysis for context
   */
  async getPreviousAnalysis(
    target: string,
    toolId: string,
    maxAge?: number
  ): Promise<unknown | null> {
    const results = await this.memory.search({
      pattern: `gemini/analysis/*`,
      namespace: 'gemini-cli',
      filters: {
        'value.toolId': toolId,
        'metadata.target': target,
      },
      limit: 1,
    });

    if (results.length === 0) return null;

    const result = results[0];

    // Check age
    if (maxAge && Date.now() - result.value.timestamp > maxAge) {
      return null;
    }

    return result.value.result;
  }

  /**
   * Clear analysis cache
   */
  async clearAnalysisCache(options?: {
    target?: string;
    toolId?: string;
    olderThan?: number;
  }): Promise<number> {
    return await this.memory.delete({
      pattern: 'gemini/analysis/*',
      namespace: 'gemini-cli',
      filters: options,
    });
  }
}
```

### Cross-Tool Context

```typescript
// Enable context flow between Claude Code and Gemini tools

interface CrossToolContext {
  // Previous Claude Code operations
  recentEdits?: Array<{
    file: string;
    operation: string;
    timestamp: number;
  }>;

  // Previous Gemini analyses
  previousAnalyses?: Array<{
    toolId: string;
    target: string;
    summary: string;
    timestamp: number;
  }>;

  // Shared understanding
  projectContext?: {
    mainLanguage: string;
    framework: string;
    architecture: string;
    conventions: string[];
  };
}

// Decision matrix: which tool to use
function selectTool(task: string, context: CrossToolContext): 'claude' | 'gemini' {
  // Large-scale analysis → Gemini
  if (context.fileCount > 100 || context.totalLines > 50000) {
    return 'gemini';
  }

  // Code editing → Claude
  if (task.includes('edit') || task.includes('fix') || task.includes('implement')) {
    return 'claude';
  }

  // Whole-codebase understanding → Gemini
  if (task.includes('analyze') || task.includes('architecture') || task.includes('audit')) {
    return 'gemini';
  }

  // Default to Claude
  return 'claude';
}
```

---

## Error Handling & Fallbacks

### Error Categories

```typescript
// src/mcp/providers/gemini-cli/errors.ts

export enum GeminiMCPErrorType {
  // Module errors
  MODULE_NOT_ENABLED = 'MODULE_NOT_ENABLED',
  MODULE_NOT_CONFIGURED = 'MODULE_NOT_CONFIGURED',

  // Authentication errors
  AUTH_REQUIRED = 'AUTH_REQUIRED',
  AUTH_EXPIRED = 'AUTH_EXPIRED',
  AUTH_INVALID = 'AUTH_INVALID',

  // Installation errors
  CLI_NOT_INSTALLED = 'CLI_NOT_INSTALLED',
  CLI_VERSION_MISMATCH = 'CLI_VERSION_MISMATCH',

  // Execution errors
  RATE_LIMIT = 'RATE_LIMIT',
  CONTEXT_TOO_LARGE = 'CONTEXT_TOO_LARGE',
  ANALYSIS_TIMEOUT = 'ANALYSIS_TIMEOUT',
  INVALID_TARGET = 'INVALID_TARGET',

  // Gemini API errors
  API_ERROR = 'API_ERROR',
  MODEL_UNAVAILABLE = 'MODEL_UNAVAILABLE',
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',

  // System errors
  INTERNAL_ERROR = 'INTERNAL_ERROR',
}

export class GeminiMCPError extends Error {
  readonly type: GeminiMCPErrorType;
  readonly code: number;
  readonly recoverable: boolean;
  readonly retryAfter?: number;
  readonly suggestion?: string;

  constructor(
    type: GeminiMCPErrorType,
    message: string,
    options?: {
      code?: number;
      recoverable?: boolean;
      retryAfter?: number;
      suggestion?: string;
    }
  ) {
    super(message);
    this.type = type;
    this.code = options?.code ?? GEMINI_ERROR_CODES[type] ?? -32000;
    this.recoverable = options?.recoverable ?? false;
    this.retryAfter = options?.retryAfter;
    this.suggestion = options?.suggestion;
  }

  toMCPError(): MCPError {
    return {
      code: this.code,
      message: this.message,
      data: {
        errorType: this.type,
        recoverable: this.recoverable,
        retryAfter: this.retryAfter,
        suggestion: this.suggestion,
      },
    };
  }
}
```

### Fallback Strategies

```typescript
// Fallback to Claude Code tools when Gemini is unavailable

interface FallbackConfig {
  enabled: boolean;
  fallbackTools: Map<string, string>; // gemini tool → claude tool
  conditions: FallbackCondition[];
}

const DefaultFallbackConfig: FallbackConfig = {
  enabled: true,
  fallbackTools: new Map([
    ['codebase_analyze', 'mcp__claude-flow__quality_assess'],
    ['security_scan', 'mcp__claude-flow__security_scan'],
    ['dependency_analyze', 'npm audit && npm outdated'], // Shell command
    ['coverage_assess', 'npx jest --coverage'], // Shell command
  ]),
  conditions: [
    { type: 'gemini_unavailable' },
    { type: 'rate_limit_exceeded' },
    { type: 'quota_exhausted' },
  ],
};

async function executeWithFallback(
  toolId: string,
  params: unknown,
  context: MCPContext
): Promise<unknown> {
  try {
    // Try Gemini first
    return await geminiExecutor.execute(toolId, params, context);
  } catch (error) {
    if (shouldFallback(error)) {
      const fallbackTool = DefaultFallbackConfig.fallbackTools.get(toolId);
      if (fallbackTool) {
        console.warn(`Falling back from ${toolId} to ${fallbackTool}`);
        return await executeFallback(fallbackTool, params, context);
      }
    }
    throw error;
  }
}
```

---

## Performance Optimization

### Caching Strategy

```typescript
// Multi-level caching for Gemini analysis results

interface CacheConfig {
  // L1: In-memory cache (fast, limited size)
  memory: {
    enabled: boolean;
    maxSize: number; // MB
    ttl: number; // ms
  };

  // L2: File cache (persistent, larger)
  file: {
    enabled: boolean;
    directory: string;
    maxSize: number; // MB
    ttl: number; // ms
  };

  // Cache key strategy
  keyStrategy: 'content_hash' | 'path_mtime' | 'combined';
}

const DefaultCacheConfig: CacheConfig = {
  memory: {
    enabled: true,
    maxSize: 100, // 100 MB
    ttl: 300000, // 5 minutes
  },
  file: {
    enabled: true,
    directory: '.claude-flow/cache/gemini',
    maxSize: 1000, // 1 GB
    ttl: 3600000, // 1 hour
  },
  keyStrategy: 'combined',
};

// Cache key generation
function generateCacheKey(
  toolId: string,
  params: Record<string, unknown>,
  strategy: string
): string {
  switch (strategy) {
    case 'content_hash':
      return hashContent(params.target);
    case 'path_mtime':
      return `${params.target}:${getModTime(params.target)}`;
    case 'combined':
      return `${toolId}:${hashContent(params.target)}:${hashParams(params)}`;
    default:
      return `${toolId}:${JSON.stringify(params)}`;
  }
}
```

### Rate Limiting

```typescript
// Token bucket rate limiter for Gemini API

interface RateLimitConfig {
  // Requests per minute
  rpm: number;

  // Tokens per minute
  tpm: number;

  // Burst allowance
  burstMultiplier: number;

  // Backoff strategy
  backoff: {
    initial: number; // ms
    max: number; // ms
    factor: number;
  };
}

const DefaultRateLimitConfig: RateLimitConfig = {
  rpm: 60,
  tpm: 1000000, // 1M tokens/minute for Gemini 1.5 Pro
  burstMultiplier: 1.5,
  backoff: {
    initial: 1000,
    max: 60000,
    factor: 2,
  },
};
```

### Token Optimization

```typescript
// Strategies to minimize token usage

interface TokenOptimization {
  // File filtering
  excludePatterns: string[];
  includePatterns: string[];
  maxFileSize: number; // bytes

  // Content optimization
  stripComments: boolean;
  minifyWhitespace: boolean;
  truncateLargeFiles: boolean;
  truncateLength: number;

  // Chunking for large codebases
  chunkSize: number; // tokens
  chunkOverlap: number; // tokens
  parallelChunks: number;
}

const DefaultTokenOptimization: TokenOptimization = {
  excludePatterns: [
    'node_modules/**', '.git/**', 'dist/**', 'build/**',
    '*.min.js', '*.min.css', '*.map', '*.lock',
    'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml',
  ],
  includePatterns: ['**/*.ts', '**/*.js', '**/*.py', '**/*.go', '**/*.rs'],
  maxFileSize: 1024 * 1024, // 1 MB

  stripComments: false, // Comments often contain important context
  minifyWhitespace: true,
  truncateLargeFiles: true,
  truncateLength: 50000, // characters

  chunkSize: 100000,
  chunkOverlap: 1000,
  parallelChunks: 3,
};
```

---

## Security Considerations

### Input Validation

```typescript
// Validate all inputs before passing to Gemini

import { SchemaValidator } from '../../validation/schema-validator-2025.js';

class GeminiInputValidator {
  private schemaValidator: SchemaValidator;

  /**
   * Validate and sanitize input parameters
   */
  async validate(
    toolId: string,
    params: unknown
  ): Promise<{ valid: boolean; sanitized: unknown; errors?: string[] }> {
    const tool = GeminiCLIToolDefinitions.find(t => t.id === toolId);
    if (!tool) {
      return { valid: false, errors: [`Unknown tool: ${toolId}`], sanitized: params };
    }

    // JSON Schema validation
    const schemaResult = await this.schemaValidator.validate(params, tool.inputSchema);
    if (!schemaResult.valid) {
      return { valid: false, errors: schemaResult.errors, sanitized: params };
    }

    // Additional security checks
    const securityResult = await this.securityCheck(params);
    if (!securityResult.safe) {
      return { valid: false, errors: securityResult.issues, sanitized: params };
    }

    // Sanitize paths
    const sanitized = this.sanitizePaths(params);

    return { valid: true, sanitized };
  }

  /**
   * Security checks for path traversal, injection, etc.
   */
  private async securityCheck(params: unknown): Promise<{ safe: boolean; issues?: string[] }> {
    const issues: string[] = [];

    // Check for path traversal
    const target = (params as any).target;
    if (target && (target.includes('..') || path.isAbsolute(target))) {
      // Resolve and validate path is within allowed boundaries
      const resolved = path.resolve(target);
      const cwd = process.cwd();
      if (!resolved.startsWith(cwd)) {
        issues.push('Path traversal detected: target must be within project directory');
      }
    }

    // Check for command injection in patterns
    const patterns = (params as any).excludePatterns || (params as any).includePatterns;
    if (patterns && Array.isArray(patterns)) {
      for (const pattern of patterns) {
        if (/[;&|`$]/.test(pattern)) {
          issues.push(`Potentially malicious pattern detected: ${pattern}`);
        }
      }
    }

    return { safe: issues.length === 0, issues };
  }

  /**
   * Sanitize file paths
   */
  private sanitizePaths(params: unknown): unknown {
    const sanitized = { ...params as object };

    if ('target' in sanitized) {
      (sanitized as any).target = path.normalize((sanitized as any).target);
    }

    return sanitized;
  }
}
```

### Output Sanitization

```typescript
// Sanitize analysis output before returning

class GeminiOutputSanitizer {
  /**
   * Sanitize analysis results
   */
  sanitize(result: unknown, options?: { maskSecrets?: boolean }): unknown {
    const sanitized = structuredClone(result);

    if (options?.maskSecrets !== false) {
      this.maskSecrets(sanitized);
    }

    this.sanitizePaths(sanitized);

    return sanitized;
  }

  /**
   * Mask potential secrets in output
   */
  private maskSecrets(obj: unknown): void {
    if (typeof obj !== 'object' || obj === null) return;

    const secretPatterns = [
      /api[_-]?key/i,
      /secret/i,
      /password/i,
      /token/i,
      /credential/i,
      /private[_-]?key/i,
    ];

    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string' && secretPatterns.some(p => p.test(key))) {
        (obj as any)[key] = '***MASKED***';
      } else if (typeof value === 'object') {
        this.maskSecrets(value);
      }
    }
  }

  /**
   * Sanitize file paths to relative paths
   */
  private sanitizePaths(obj: unknown): void {
    if (typeof obj !== 'object' || obj === null) return;

    const cwd = process.cwd();

    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string' && path.isAbsolute(value)) {
        if (value.startsWith(cwd)) {
          (obj as any)[key] = path.relative(cwd, value) || '.';
        }
      } else if (typeof value === 'object') {
        this.sanitizePaths(value);
      }
    }
  }
}
```

---

## Testing Strategy

### Unit Tests

```typescript
// tests/mcp/providers/gemini-cli/tools.test.ts

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GeminiCLIMCPProvider } from '../../../../src/mcp/providers/gemini-cli/index.js';
import { GeminiModuleManager } from '../../../../src/modules/gemini-cli/manager.js';

describe('GeminiCLIMCPProvider', () => {
  let provider: GeminiCLIMCPProvider;
  let mockManager: GeminiModuleManager;
  let mockServer: any;

  beforeEach(() => {
    mockManager = {
      isEnabled: vi.fn().mockResolvedValue(true),
      getStatus: vi.fn().mockResolvedValue({ authenticated: true }),
      executor: {
        execute: vi.fn().mockResolvedValue({ summary: 'test' }),
      },
    } as any;

    mockServer = {
      registerTool: vi.fn().mockResolvedValue(undefined),
    };

    provider = new GeminiCLIMCPProvider(mockManager);
  });

  describe('register', () => {
    it('should register all 5 tools when module enabled', async () => {
      await provider.register(mockServer);

      expect(mockServer.registerTool).toHaveBeenCalledTimes(5);

      const toolNames = mockServer.registerTool.mock.calls.map(
        (call: any) => call[0].name
      );
      expect(toolNames).toContain('mcp__gemini-cli__codebase_analyze');
      expect(toolNames).toContain('mcp__gemini-cli__architecture_map');
      expect(toolNames).toContain('mcp__gemini-cli__security_scan');
      expect(toolNames).toContain('mcp__gemini-cli__dependency_analyze');
      expect(toolNames).toContain('mcp__gemini-cli__coverage_assess');
    });

    it('should not register tools when module disabled', async () => {
      mockManager.isEnabled = vi.fn().mockResolvedValue(false);

      await provider.register(mockServer);

      expect(mockServer.registerTool).not.toHaveBeenCalled();
    });

    it('should throw when executor called without authentication', async () => {
      mockManager.getStatus = vi.fn().mockResolvedValue({ authenticated: false });

      await provider.register(mockServer);

      const handler = mockServer.registerTool.mock.calls[0][0].handler;

      await expect(handler({}, {})).rejects.toThrow('GEMINI_NOT_AUTHENTICATED');
    });
  });

  describe('tool schemas', () => {
    it('should have valid JSON Schema 1.1 input schemas', async () => {
      await provider.register(mockServer);

      for (const call of mockServer.registerTool.mock.calls) {
        const schema = call[0].inputSchema;
        expect(schema.$schema).toBe('https://json-schema.org/draft/2020-12/schema');
        expect(schema.type).toBe('object');
      }
    });

    it('should have progressive disclosure metadata', async () => {
      await provider.register(mockServer);

      for (const call of mockServer.registerTool.mock.calls) {
        const metadata = call[0].metadata;
        expect(metadata.progressiveDisclosure).toBeDefined();
        expect(metadata.progressiveDisclosure.level).toBeGreaterThan(0);
      }
    });
  });
});
```

### Integration Tests

```typescript
// tests/mcp/providers/gemini-cli/integration.test.ts

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createMCPServer } from '../../../../src/mcp/server-factory.js';
import { MCPClient } from '../../../../src/mcp/client.js';

describe('Gemini CLI MCP Integration', () => {
  let server: any;
  let client: MCPClient;

  beforeAll(async () => {
    server = await createMCPServer({
      transport: 'stdio',
      modules: {
        geminiCli: {
          enabled: true,
          mockMode: true, // Use mock executor for tests
        },
      },
    });

    await server.start();
    client = new MCPClient(server);
  });

  afterAll(async () => {
    await server.stop();
  });

  it('should list gemini-cli tools', async () => {
    const tools = await client.listTools();

    const geminiTools = tools.filter((t: any) =>
      t.name.startsWith('mcp__gemini-cli__')
    );

    expect(geminiTools.length).toBe(5);
  });

  it('should execute codebase_analyze', async () => {
    const result = await client.callTool('mcp__gemini-cli__codebase_analyze', {
      target: '.',
      depth: 'surface',
    });

    expect(result.isError).toBe(false);
    expect(result.content[0].type).toBe('json');
  });

  it('should support async execution', async () => {
    const result = await client.callTool('mcp__gemini-cli__codebase_analyze', {
      target: '.',
      depth: 'deep',
    }, { mode: 'async' });

    expect(result.job_handle).toBeDefined();
    expect(result.status).toBe('queued');

    // Poll for completion
    let status;
    do {
      await new Promise(r => setTimeout(r, 1000));
      status = await client.pollJob(result.job_handle);
    } while (status.status === 'in_progress');

    expect(status.status).toBe('completed');
    expect(status.result).toBeDefined();
  });
});
```

---

## API Reference

### Tool: `mcp__gemini-cli__codebase_analyze`

Perform comprehensive codebase analysis.

**Parameters:**

| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `target` | string | No | `.` | Path to analyze |
| `depth` | enum | No | `moderate` | Analysis depth: `surface`, `moderate`, `deep`, `comprehensive` |
| `focus` | string[] | No | all | Focus areas: `quality`, `patterns`, `dependencies`, `security`, `performance` |
| `includeMetrics` | boolean | No | `true` | Include quantitative metrics |
| `maxFiles` | integer | No | `100` | Maximum files to include |
| `excludePatterns` | string[] | No | common | Glob patterns to exclude |

**Returns:** `GeminiAnalysisResult` with findings, metrics, and recommendations.

---

### Tool: `mcp__gemini-cli__architecture_map`

Generate architecture diagrams from codebase.

**Parameters:**

| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `target` | string | No | `.` | Path to analyze |
| `outputFormat` | enum | No | `mermaid` | Diagram format: `mermaid`, `plantuml`, `dot`, `json`, `markdown` |
| `diagramTypes` | string[] | No | `['component', 'dependency']` | Types of diagrams to generate |
| `includeExternal` | boolean | No | `false` | Include external dependencies |
| `depth` | integer | No | `3` | Maximum dependency traversal depth |

**Returns:** Architecture diagrams, component list, and layer mapping.

---

### Tool: `mcp__gemini-cli__security_scan`

Comprehensive security vulnerability scan.

**Parameters:**

| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `target` | string | No | `.` | Path to scan |
| `scanTypes` | string[] | No | common | Security checks to perform |
| `severity` | enum | No | `low` | Minimum severity to report |
| `includeRemediation` | boolean | No | `true` | Include fix suggestions |
| `scanDependencies` | boolean | No | `true` | Check dependency vulnerabilities |

**Returns:** Security summary, vulnerabilities, secrets found, and remediation guidance.

---

### Tool: `mcp__gemini-cli__dependency_analyze`

Analyze project dependencies.

**Parameters:**

| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `target` | string | No | `.` | Path to project |
| `analysisTypes` | string[] | No | `['updates', 'security', 'licenses']` | Types of analysis |
| `includeDevDependencies` | boolean | No | `true` | Include dev dependencies |
| `checkTransitive` | boolean | No | `true` | Check transitive dependencies |
| `licensePolicy` | object | No | none | License allow/deny lists |

**Returns:** Dependency summary, outdated packages, vulnerabilities, and license issues.

---

### Tool: `mcp__gemini-cli__coverage_assess`

Assess test coverage quality.

**Parameters:**

| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `target` | string | No | `.` | Path to analyze |
| `coverageDataPath` | string | No | none | Path to existing coverage report |
| `analysisTypes` | string[] | No | `['gaps', 'suggestions']` | Types of analysis |
| `targetCoverage` | number | No | `80` | Target coverage percentage |
| `focusAreas` | string[] | No | all | Specific areas to focus on |

**Returns:** Coverage summary, gaps, critical paths, and test suggestions.

---

## Related Documentation

- [TYPES.md](./TYPES.md) - TypeScript interfaces
- [EXECUTOR.md](./EXECUTOR.md) - Analysis executor documentation
- [AUTHENTICATOR.md](./AUTHENTICATOR.md) - Authentication methods
- [INSTALLER.md](./INSTALLER.md) - Installation procedures
- [Claude Flow MCP_TOOLS.md](/docs/reference/MCP_TOOLS.md) - Core MCP tools

---

*Last Updated: December 2025*
*Version: 1.0.0*
*Compatible with: Claude Flow v2.7.34+, MCP 2025-11*
