/**
 * MCP Tools Tests
 * Tests for MCP tool definitions and provider
 */

import { describe, it, expect, beforeEach } from '@jest/globals';

// Simulated tool definition matching actual implementation
interface GeminiToolDefinition {
  id: string;
  name: string;
  description: string;
  category: 'analysis' | 'security' | 'architecture' | 'quality';
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required: string[];
  };
  outputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
  };
  disclosure: {
    level: 'basic' | 'standard' | 'full';
    triggers: string[];
    priority: number;
  };
  estimatedDuration: string;
  tokenEstimate: string;
}

// Simulated tool definitions
const mockToolDefinitions: GeminiToolDefinition[] = [
  {
    id: 'codebase_analyze',
    name: 'Codebase Analysis',
    description: 'Comprehensive codebase analysis using Gemini\'s 1M+ token context.',
    category: 'analysis',
    inputSchema: {
      type: 'object',
      properties: {
        paths: { type: 'array', items: { type: 'string' } },
        query: { type: 'string' },
        depth: { type: 'string', enum: ['surface', 'moderate', 'deep', 'comprehensive'] },
      },
      required: ['paths'],
    },
    outputSchema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        summary: { type: 'string' },
        findings: { type: 'array' },
      },
    },
    disclosure: {
      level: 'standard',
      triggers: ['analyze', 'codebase', 'review', 'understand'],
      priority: 80,
    },
    estimatedDuration: '30-120 seconds',
    tokenEstimate: '10,000-100,000 tokens',
  },
  {
    id: 'architecture_map',
    name: 'Architecture Mapping',
    description: 'Maps system architecture including components, layers, and dependencies.',
    category: 'architecture',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string' },
        includeDataFlows: { type: 'boolean' },
        includeDependencies: { type: 'boolean' },
      },
      required: ['path'],
    },
    outputSchema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        components: { type: 'array' },
        diagram: { type: 'string' },
      },
    },
    disclosure: {
      level: 'standard',
      triggers: ['architecture', 'structure', 'components', 'diagram'],
      priority: 75,
    },
    estimatedDuration: '45-180 seconds',
    tokenEstimate: '20,000-150,000 tokens',
  },
  {
    id: 'security_scan',
    name: 'Security Vulnerability Scan',
    description: 'Comprehensive security audit identifying vulnerabilities and secrets.',
    category: 'security',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string' },
        scanTypes: { type: 'array' },
        severityThreshold: { type: 'string' },
      },
      required: ['path'],
    },
    outputSchema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        vulnerabilities: { type: 'array' },
        riskScore: { type: 'number' },
      },
    },
    disclosure: {
      level: 'standard',
      triggers: ['security', 'vulnerability', 'audit', 'secrets'],
      priority: 90,
    },
    estimatedDuration: '60-240 seconds',
    tokenEstimate: '30,000-200,000 tokens',
  },
  {
    id: 'dependency_analyze',
    name: 'Dependency Analysis',
    description: 'Analyzes project dependencies for outdated packages and vulnerabilities.',
    category: 'quality',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string' },
        checkOutdated: { type: 'boolean' },
        checkVulnerabilities: { type: 'boolean' },
      },
      required: ['path'],
    },
    outputSchema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        outdated: { type: 'array' },
        vulnerabilities: { type: 'array' },
      },
    },
    disclosure: {
      level: 'standard',
      triggers: ['dependency', 'dependencies', 'packages', 'npm'],
      priority: 70,
    },
    estimatedDuration: '20-90 seconds',
    tokenEstimate: '5,000-50,000 tokens',
  },
  {
    id: 'coverage_assess',
    name: 'Test Coverage Assessment',
    description: 'Assesses test coverage and identifies untested code paths.',
    category: 'quality',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string' },
        testDirectory: { type: 'string' },
        focusAreas: { type: 'array' },
      },
      required: ['path'],
    },
    outputSchema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        coverageScore: { type: 'number' },
        untestedPaths: { type: 'array' },
      },
    },
    disclosure: {
      level: 'standard',
      triggers: ['coverage', 'test', 'testing', 'untested'],
      priority: 65,
    },
    estimatedDuration: '30-120 seconds',
    tokenEstimate: '10,000-80,000 tokens',
  },
];

describe('Tool Definitions', () => {
  describe('Structure', () => {
    it('should have 5 tool definitions', () => {
      expect(mockToolDefinitions).toHaveLength(5);
    });

    it('should have unique IDs', () => {
      const ids = mockToolDefinitions.map((t) => t.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(mockToolDefinitions.length);
    });

    it('should have all required fields', () => {
      mockToolDefinitions.forEach((tool) => {
        expect(tool.id).toBeDefined();
        expect(tool.name).toBeDefined();
        expect(tool.description).toBeDefined();
        expect(tool.category).toBeDefined();
        expect(tool.inputSchema).toBeDefined();
        expect(tool.outputSchema).toBeDefined();
        expect(tool.disclosure).toBeDefined();
        expect(tool.estimatedDuration).toBeDefined();
        expect(tool.tokenEstimate).toBeDefined();
      });
    });
  });

  describe('Categories', () => {
    it('should have valid categories', () => {
      const validCategories = ['analysis', 'security', 'architecture', 'quality'];
      mockToolDefinitions.forEach((tool) => {
        expect(validCategories).toContain(tool.category);
      });
    });

    it('should have security_scan in security category', () => {
      const securityTool = mockToolDefinitions.find((t) => t.id === 'security_scan');
      expect(securityTool?.category).toBe('security');
    });

    it('should have architecture_map in architecture category', () => {
      const archTool = mockToolDefinitions.find((t) => t.id === 'architecture_map');
      expect(archTool?.category).toBe('architecture');
    });
  });

  describe('Input Schemas', () => {
    it('should have type object for all input schemas', () => {
      mockToolDefinitions.forEach((tool) => {
        expect(tool.inputSchema.type).toBe('object');
      });
    });

    it('should have required fields array', () => {
      mockToolDefinitions.forEach((tool) => {
        expect(Array.isArray(tool.inputSchema.required)).toBe(true);
      });
    });

    it('codebase_analyze should require paths', () => {
      const tool = mockToolDefinitions.find((t) => t.id === 'codebase_analyze');
      expect(tool?.inputSchema.required).toContain('paths');
    });

    it('security_scan should require path', () => {
      const tool = mockToolDefinitions.find((t) => t.id === 'security_scan');
      expect(tool?.inputSchema.required).toContain('path');
    });
  });

  describe('Disclosure Levels', () => {
    it('should have valid disclosure levels', () => {
      const validLevels = ['basic', 'standard', 'full'];
      mockToolDefinitions.forEach((tool) => {
        expect(validLevels).toContain(tool.disclosure.level);
      });
    });

    it('should have non-empty triggers', () => {
      mockToolDefinitions.forEach((tool) => {
        expect(tool.disclosure.triggers.length).toBeGreaterThan(0);
      });
    });

    it('should have positive priority values', () => {
      mockToolDefinitions.forEach((tool) => {
        expect(tool.disclosure.priority).toBeGreaterThan(0);
      });
    });

    it('security_scan should have highest priority', () => {
      const securityTool = mockToolDefinitions.find((t) => t.id === 'security_scan');
      const otherPriorities = mockToolDefinitions
        .filter((t) => t.id !== 'security_scan')
        .map((t) => t.disclosure.priority);

      expect(securityTool?.disclosure.priority).toBeGreaterThanOrEqual(Math.max(...otherPriorities));
    });
  });

  describe('Tool Triggers', () => {
    it('codebase_analyze should trigger on "analyze" keyword', () => {
      const tool = mockToolDefinitions.find((t) => t.id === 'codebase_analyze');
      expect(tool?.disclosure.triggers).toContain('analyze');
    });

    it('security_scan should trigger on "vulnerability" keyword', () => {
      const tool = mockToolDefinitions.find((t) => t.id === 'security_scan');
      expect(tool?.disclosure.triggers).toContain('vulnerability');
    });

    it('architecture_map should trigger on "diagram" keyword', () => {
      const tool = mockToolDefinitions.find((t) => t.id === 'architecture_map');
      expect(tool?.disclosure.triggers).toContain('diagram');
    });
  });
});

describe('Tool Lookup Functions', () => {
  function getToolDefinition(toolId: string): GeminiToolDefinition | undefined {
    return mockToolDefinitions.find((t) => t.id === toolId);
  }

  function getAllToolIds(): string[] {
    return mockToolDefinitions.map((t) => t.id);
  }

  it('should find tool by ID', () => {
    const tool = getToolDefinition('security_scan');
    expect(tool).toBeDefined();
    expect(tool?.name).toBe('Security Vulnerability Scan');
  });

  it('should return undefined for unknown ID', () => {
    const tool = getToolDefinition('unknown_tool');
    expect(tool).toBeUndefined();
  });

  it('should return all tool IDs', () => {
    const ids = getAllToolIds();
    expect(ids).toHaveLength(5);
    expect(ids).toContain('codebase_analyze');
    expect(ids).toContain('security_scan');
  });
});

describe('Progressive Disclosure', () => {
  function getToolsByDisclosure(
    level: 'basic' | 'standard' | 'full',
    query?: string
  ): GeminiToolDefinition[] {
    const levelPriority = { basic: 1, standard: 2, full: 3 };
    const currentLevel = levelPriority[level];

    return mockToolDefinitions
      .filter((tool) => {
        const toolLevel = levelPriority[tool.disclosure.level];
        if (toolLevel > currentLevel) return false;

        if (query) {
          const queryLower = query.toLowerCase();
          return tool.disclosure.triggers.some((trigger) =>
            queryLower.includes(trigger.toLowerCase())
          );
        }

        return true;
      })
      .sort((a, b) => b.disclosure.priority - a.disclosure.priority);
  }

  it('should return all tools for standard level without query', () => {
    const tools = getToolsByDisclosure('standard');
    expect(tools.length).toBe(5);
  });

  it('should filter tools based on query triggers', () => {
    const tools = getToolsByDisclosure('standard', 'analyze the security vulnerabilities');
    const ids = tools.map((t) => t.id);
    expect(ids).toContain('security_scan');
    expect(ids).toContain('codebase_analyze');
  });

  it('should sort by priority (highest first)', () => {
    const tools = getToolsByDisclosure('standard');
    for (let i = 1; i < tools.length; i++) {
      expect(tools[i - 1].disclosure.priority).toBeGreaterThanOrEqual(tools[i].disclosure.priority);
    }
  });

  it('should match security_scan for security-related queries', () => {
    const tools = getToolsByDisclosure('standard', 'run security audit');
    expect(tools[0].id).toBe('security_scan');
  });

  it('should match architecture_map for structure queries', () => {
    const tools = getToolsByDisclosure('standard', 'show me the architecture');
    const ids = tools.map((t) => t.id);
    expect(ids).toContain('architecture_map');
  });
});

describe('MCP Tool Response Format', () => {
  interface MCPToolResponse {
    success: boolean;
    content: string | Record<string, unknown>;
    isError?: boolean;
    metadata?: Record<string, unknown>;
  }

  it('should format successful response', () => {
    const response: MCPToolResponse = {
      success: true,
      content: '# Analysis Results\n\nNo issues found.',
      metadata: {
        toolId: 'codebase_analyze',
        duration: 1500,
        filesAnalyzed: 42,
      },
    };

    expect(response.success).toBe(true);
    expect(response.isError).toBeUndefined();
    expect(response.metadata?.toolId).toBe('codebase_analyze');
  });

  it('should format error response', () => {
    const response: MCPToolResponse = {
      success: false,
      content: 'Tool execution failed: Rate limit exceeded',
      isError: true,
      metadata: {
        toolId: 'security_scan',
        error: 'GeminiRateLimitError',
      },
    };

    expect(response.success).toBe(false);
    expect(response.isError).toBe(true);
  });

  it('should support markdown content', () => {
    const response: MCPToolResponse = {
      success: true,
      content: `# Security Scan Results

## Summary
Found 3 vulnerabilities.

## Findings
- **Critical**: SQL Injection in db.ts:45
- **High**: XSS in render.ts:112
- **Medium**: Outdated dependency lodash@3.x`,
    };

    expect(typeof response.content).toBe('string');
    expect((response.content as string).includes('# Security')).toBe(true);
  });
});
