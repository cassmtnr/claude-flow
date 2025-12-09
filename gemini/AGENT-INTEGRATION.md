# Gemini CLI Module - Agent Integration Patterns

> Comprehensive guide for integrating Gemini CLI analysis with Claude Flow's multi-agent swarm system, including coordination patterns, decision routing, and context sharing.

## Table of Contents

1. [Overview](#overview)
2. [Core Integration Principle](#core-integration-principle)
3. [Agent Coordination Patterns](#agent-coordination-patterns)
4. [Decision Routing Matrix](#decision-routing-matrix)
5. [Swarm Integration](#swarm-integration)
6. [Memory & Context Sharing](#memory--context-sharing)
7. [Specialized Agent Patterns](#specialized-agent-patterns)
8. [Workflow Examples](#workflow-examples)
9. [Best Practices](#best-practices)
10. [Troubleshooting](#troubleshooting)

---

## Overview

### Integration Philosophy

The Gemini CLI module integrates with Claude Flow's 54+ agents following a clear division of responsibilities:

```
┌───────────────────────────────────────────────────────────────────────┐
│                       Claude Flow Orchestrates                        │
│                       Claude Code Creates                             │
│                       Gemini Reads                                    │
└───────────────────────────────────────────────────────────────────────┘
```

### Role Distribution

| Component | Role | Best For |
|-----------|------|----------|
| **Claude Flow** | Orchestration, coordination | Task distribution, workflow management |
| **Claude Code** | Code creation, editing | Writing code, making changes, bug fixes |
| **Gemini CLI** | Large-scale reading | Codebase analysis, architecture review, security scanning |

### Integration Benefits

- **10-20x token efficiency** for large codebase analysis
- **Parallel processing** of analysis and implementation
- **Specialized context** - right tool for right job
- **Seamless handoffs** between agents

---

## Core Integration Principle

### The Decision Flow

```
                      User Request
                           │
                           ▼
                ┌─────────────────────┐
                │    Task Analysis    │
                │    (Claude Flow)    │
                └──────────┬──────────┘
                           │
             ┌─────────────┴─────────────┐
             │                           │
             ▼                           ▼
     ┌───────────────┐           ┌───────────────┐
     │  Large-Scale  │           │     Code      │
     │   Reading?    │           │   Writing?    │
     │ (>100 files)  │           │               │
     └───────┬───────┘           └───────┬───────┘
             │                           │
             ▼                           ▼
     ┌───────────────┐           ┌───────────────┐
     │  Gemini CLI   │           │  Claude Code  │
     │   Analysis    │──────────▶│Implementation │
     └───────────────┘  context  └───────────────┘
```

### TypeScript Implementation

```typescript
// src/modules/gemini-cli/integration/agent-router.ts

import { AgentCoordinator } from '../../core/coordinator.js';
import { GeminiModuleManager } from '../manager.js';
import { TaskAnalysis, RoutingDecision } from '../types.js';

export class GeminiAgentRouter {
  private coordinator: AgentCoordinator;
  private geminiManager: GeminiModuleManager;

  constructor(coordinator: AgentCoordinator, geminiManager: GeminiModuleManager) {
    this.coordinator = coordinator;
    this.geminiManager = geminiManager;
  }

  /**
   * Analyze task and determine optimal routing
   */
  async analyzeAndRoute(task: string, context: TaskContext): Promise<RoutingDecision> {
    const analysis = await this.analyzeTask(task, context);

    return {
      useGemini: this.shouldUseGemini(analysis),
      useClaude: this.shouldUseClaude(analysis),
      parallel: this.canRunParallel(analysis),
      geminiTasks: this.extractGeminiTasks(analysis),
      claudeTasks: this.extractClaudeTasks(analysis),
      handoffPoints: this.identifyHandoffs(analysis),
    };
  }

  /**
   * Decision matrix for Gemini usage
   */
  private shouldUseGemini(analysis: TaskAnalysis): boolean {
    // Conditions that favor Gemini
    const geminiConditions = [
      analysis.fileCount > 100,                    // Large codebase
      analysis.totalLines > 50000,                 // Lots of code
      analysis.requiresArchitectureUnderstanding,  // Big picture
      analysis.isSecurityAudit,                    // Security scanning
      analysis.isDependencyAnalysis,               // Dependency review
      analysis.requiresFullContext,                // Needs whole codebase
    ];

    return geminiConditions.some(c => c);
  }

  /**
   * Decision matrix for Claude Code usage
   */
  private shouldUseClaude(analysis: TaskAnalysis): boolean {
    // Conditions that favor Claude Code
    const claudeConditions = [
      analysis.requiresEditing,                    // Code changes
      analysis.requiresCreation,                   // New files
      analysis.isDebugging,                        // Bug fixes
      analysis.isRefactoring,                      // Code refactoring
      analysis.requiresInteraction,                // User interaction
    ];

    return claudeConditions.some(c => c);
  }

  /**
   * Check if tasks can run in parallel
   */
  private canRunParallel(analysis: TaskAnalysis): boolean {
    // Gemini analysis can run while Claude prepares context
    return analysis.hasReadPhase && analysis.hasWritePhase;
  }
}
```

---

## Agent Coordination Patterns

### Pattern 1: Analysis-Then-Implementation

Gemini analyzes, Claude implements based on findings.

```typescript
// Workflow: Security fix
async function securityFixWorkflow(target: string) {
  // Phase 1: Gemini scans for vulnerabilities
  const securityReport = await geminiManager.execute('security_scan', {
    target,
    scanTypes: ['injection', 'xss', 'secrets'],
    includeRemediation: true,
  });

  // Phase 2: Claude implements fixes
  for (const vuln of securityReport.vulnerabilities) {
    await claudeAgent.spawn('coder', {
      task: `Fix ${vuln.type} vulnerability`,
      context: {
        file: vuln.location,
        vulnerability: vuln,
        remediation: vuln.remediation,
      },
    });
  }
}
```

### Pattern 2: Parallel Analysis and Implementation

Run Gemini analysis in background while Claude works.

```typescript
// Workflow: Feature implementation with architecture awareness
async function featureWithArchitecture(feature: string) {
  // Start architecture analysis in background
  const archPromise = geminiManager.executeAsync('architecture_map', {
    target: '.',
    diagramTypes: ['component', 'dependency'],
  });

  // Claude starts initial implementation
  const initialWork = await claudeAgent.spawn('coder', {
    task: `Start implementing ${feature}`,
    instructions: 'Begin with core functionality, architecture context coming',
  });

  // Get architecture when ready
  const architecture = await archPromise;

  // Claude refines with architecture knowledge
  await claudeAgent.spawn('coder', {
    task: `Refine ${feature} implementation`,
    context: {
      previousWork: initialWork,
      architecture: architecture.components,
      layers: architecture.layers,
    },
  });
}
```

### Pattern 3: Context-Aware Agent Selection

Dynamic routing based on context.

```typescript
// Context-aware agent spawning
class ContextAwareAgentSpawner {
  async spawn(task: string, context: TaskContext): Promise<AgentResult> {
    const analysis = await this.analyzeContext(context);

    if (analysis.requiresLargeContextRead) {
      // Use Gemini for reading, Claude for action
      return await this.spawnWithGeminiContext(task, context);
    } else if (analysis.isCodeChange) {
      // Direct Claude spawn
      return await this.spawnClaudeAgent(task, context);
    } else if (analysis.isAnalysisOnly) {
      // Gemini only
      return await this.spawnGeminiAnalysis(task, context);
    }

    // Hybrid approach
    return await this.spawnHybrid(task, context);
  }

  private async spawnWithGeminiContext(task: string, context: TaskContext) {
    // Gemini provides context, Claude acts
    const geminiContext = await geminiManager.execute('codebase_analyze', {
      target: context.target,
      depth: 'moderate',
      focus: ['patterns', 'dependencies'],
    });

    return await claudeAgent.spawn('coder', {
      task,
      enhancedContext: {
        codebaseAnalysis: geminiContext,
        patterns: geminiContext.findings.filter(f => f.type === 'pattern'),
        dependencies: geminiContext.metrics.dependencies,
      },
    });
  }
}
```

### Pattern 4: Iterative Refinement

Multiple passes with feedback loop.

```typescript
// Iterative code quality improvement
async function iterativeQualityImprovement(target: string) {
  let iteration = 0;
  let qualityScore = 0;
  const targetScore = 85;

  while (qualityScore < targetScore && iteration < 5) {
    iteration++;

    // Gemini analyzes current state
    const analysis = await geminiManager.execute('codebase_analyze', {
      target,
      depth: 'deep',
      focus: ['quality'],
      includeMetrics: true,
    });

    qualityScore = analysis.metrics.qualityScore;

    if (qualityScore >= targetScore) break;

    // Claude fixes top issues
    const topIssues = analysis.findings
      .filter(f => f.severity === 'high' || f.severity === 'medium')
      .slice(0, 5);

    for (const issue of topIssues) {
      await claudeAgent.spawn('coder', {
        task: `Fix: ${issue.message}`,
        context: {
          file: issue.location,
          suggestion: issue.suggestion,
          iteration,
        },
      });
    }

    // Invalidate cache for next analysis
    await geminiManager.cache.invalidate({ target });
  }

  return { finalScore: qualityScore, iterations: iteration };
}
```

---

## Decision Routing Matrix

### Task Type Matrix

| Task Type | Primary | Secondary | Parallel? |
|-----------|---------|-----------|-----------|
| Whole codebase analysis | Gemini | - | N/A |
| Architecture review | Gemini | Claude (docs) | Yes |
| Security audit | Gemini | Claude (fixes) | Partial |
| Bug fix | Claude | Gemini (context) | No |
| New feature | Claude | Gemini (arch) | Yes |
| Refactoring | Claude | Gemini (analysis) | Yes |
| Test generation | Claude | Gemini (coverage) | Yes |
| Documentation | Claude | Gemini (arch) | Yes |
| Code review | Gemini | Claude (minor fixes) | Partial |
| Performance optimization | Gemini | Claude (impl) | Yes |

### File Count Decision

| Files | Decision |
|-------|----------|
| 1-10 | Claude only |
| 11-50 | Claude (may use Gemini for context) |
| 51-100 | Gemini analysis → Claude action |
| 100+ | Gemini required for analysis |

### Context Size Decision

| Lines of Code | Decision |
|---------------|----------|
| <10,000 | Claude can handle |
| 10,000-50,000 | Consider Gemini for overview |
| 50,000+ | Gemini for analysis |
| 100,000+ | Gemini with chunking |

---

## Swarm Integration

### Hierarchical Swarm with Gemini

```typescript
// Queen coordinates, workers use Gemini/Claude appropriately
async function hierarchicalSwarm(project: string) {
  // Initialize swarm
  await coordinator.initSwarm({
    topology: 'hierarchical',
    maxAgents: 8,
  });

  // Spawn queen coordinator
  const queen = await coordinator.spawnAgent({
    type: 'queen-coordinator',
    role: 'Coordinate development with Gemini-enhanced analysis',
    instructions: `
      For large-scale reading tasks (>50 files), delegate to Gemini analysis.
      For code changes, delegate to Claude Code agents.
      Ensure context flows from Gemini to Claude agents.
    `,
  });

  // Spawn analysis worker (uses Gemini)
  await coordinator.spawnAgent({
    type: 'gemini-analyst',
    role: 'Perform large-scale codebase analysis',
    instructions: `
      Use mcp__gemini-cli__codebase_analyze for full analysis.
      Store findings in shared memory for other agents.
      Report architecture insights to queen.
    `,
  });

  // Spawn implementation workers (use Claude)
  for (let i = 0; i < 4; i++) {
    await coordinator.spawnAgent({
      type: 'coder',
      role: `Implementation specialist ${i + 1}`,
      instructions: `
        Check shared memory for Gemini analysis results.
        Use analysis context when implementing features.
        Report progress to queen coordinator.
      `,
    });
  }
}
```

### Mesh Swarm with Context Flow

```typescript
// Peer-to-peer with shared Gemini context
async function meshSwarmWithGemini() {
  // Initial Gemini analysis shared to all agents
  const analysis = await geminiManager.execute('codebase_analyze', {
    target: '.',
    depth: 'comprehensive',
  });

  // Store in shared memory
  await memoryManager.store({
    key: 'swarm/shared/codebase-analysis',
    value: analysis,
    namespace: 'swarm-session',
    metadata: { type: 'gemini-analysis', expires: Date.now() + 3600000 },
  });

  // Initialize mesh swarm
  await coordinator.initSwarm({
    topology: 'mesh',
    maxAgents: 6,
  });

  // All agents can access shared analysis
  const agentInstructions = `
    Access shared codebase analysis:
    - Memory key: swarm/shared/codebase-analysis
    - Contains: findings, patterns, architecture
    - Use for context when making changes
  `;

  // Spawn specialized agents
  const agents = [
    { type: 'backend-dev', role: 'API development' },
    { type: 'coder', role: 'Frontend development' },
    { type: 'tester', role: 'Test development' },
    { type: 'reviewer', role: 'Code review' },
  ];

  for (const agent of agents) {
    await coordinator.spawnAgent({
      ...agent,
      sharedContext: ['swarm/shared/codebase-analysis'],
      instructions: agentInstructions + `\nSpecialization: ${agent.role}`,
    });
  }
}
```

### Adaptive Topology with Gemini Triggers

```typescript
// Topology changes based on Gemini findings
class AdaptiveGeminiSwarm {
  async run(task: string) {
    // Initial analysis determines topology
    const analysis = await geminiManager.execute('codebase_analyze', {
      target: '.',
      focus: ['patterns', 'dependencies'],
    });

    // Choose topology based on findings
    const topology = this.selectTopology(analysis);

    await coordinator.initSwarm({ topology });

    // Spawn agents based on analysis
    const neededAgents = this.determineNeededAgents(analysis);

    for (const agentSpec of neededAgents) {
      await coordinator.spawnAgent(agentSpec);
    }

    // Re-analyze periodically, adapt if needed
    this.scheduleReanalysis(analysis);
  }

  private selectTopology(analysis: AnalysisResult): string {
    // Complex dependencies → hierarchical
    if (analysis.metrics.dependencyComplexity > 0.7) {
      return 'hierarchical';
    }

    // Simple, well-separated modules → mesh
    if (analysis.findings.some(f => f.type === 'good-separation')) {
      return 'mesh';
    }

    // Default
    return 'adaptive';
  }

  private determineNeededAgents(analysis: AnalysisResult): AgentSpec[] {
    const agents: AgentSpec[] = [];

    // Security issues → security specialist
    if (analysis.findings.some(f => f.type === 'security')) {
      agents.push({ type: 'security-manager', priority: 'high' });
    }

    // Performance issues → performance analyst
    if (analysis.findings.some(f => f.type === 'performance')) {
      agents.push({ type: 'perf-analyzer', priority: 'medium' });
    }

    // Always need core agents
    agents.push({ type: 'coder', priority: 'high' });
    agents.push({ type: 'tester', priority: 'medium' });

    return agents;
  }
}
```

---

## Memory & Context Sharing

### Storing Gemini Analysis in Memory

```typescript
// Store analysis results for agent access
class GeminiMemoryBridge {
  private memory: MemoryManager;
  private gemini: GeminiModuleManager;

  /**
   * Run analysis and store in memory
   */
  async analyzeAndStore(
    analysisId: string,
    params: AnalysisParams
  ): Promise<void> {
    // Run analysis
    const result = await this.gemini.execute('codebase_analyze', params);

    // Store full result
    await this.memory.store({
      key: `gemini/analysis/${analysisId}/full`,
      value: result,
      namespace: 'gemini-cli',
      type: 'analysis',
      ttl: 3600000, // 1 hour
    });

    // Store indexed findings for quick access
    for (const finding of result.findings) {
      await this.memory.store({
        key: `gemini/findings/${analysisId}/${finding.location.replace(/\//g, '_')}`,
        value: finding,
        namespace: 'gemini-cli',
        type: 'finding',
        ttl: 3600000,
      });
    }

    // Store summary for quick reference
    await this.memory.store({
      key: `gemini/analysis/${analysisId}/summary`,
      value: {
        summary: result.summary,
        findingCount: result.findings.length,
        metrics: result.metrics,
        topRecommendations: result.recommendations.slice(0, 5),
      },
      namespace: 'gemini-cli',
      type: 'summary',
      ttl: 3600000,
    });
  }

  /**
   * Retrieve analysis for agent use
   */
  async getAnalysisForAgent(analysisId: string): Promise<AgentContext> {
    const summary = await this.memory.retrieve({
      key: `gemini/analysis/${analysisId}/summary`,
      namespace: 'gemini-cli',
    });

    return {
      geminiAnalysis: summary,
      contextType: 'gemini-analysis',
      usageHints: [
        'Use findings to inform code changes',
        'Follow recommendations for improvements',
        'Check metrics for quality targets',
      ],
    };
  }

  /**
   * Get findings relevant to specific file
   */
  async getFindingsForFile(analysisId: string, filePath: string): Promise<Finding[]> {
    const key = `gemini/findings/${analysisId}/${filePath.replace(/\//g, '_')}`;
    const finding = await this.memory.retrieve({ key, namespace: 'gemini-cli' });

    if (finding) return [finding];

    // Search for related findings
    const results = await this.memory.search({
      pattern: `gemini/findings/${analysisId}/*`,
      namespace: 'gemini-cli',
    });

    return results
      .filter(r => r.value.location.includes(filePath))
      .map(r => r.value);
  }
}
```

### Agent-to-Agent Context Passing

```typescript
// Pass Gemini context between agents
class AgentContextBridge {
  /**
   * Prepare context for Claude agent from Gemini analysis
   */
  prepareClaudeContext(geminiResult: GeminiAnalysisResult): ClaudeContext {
    return {
      codebaseUnderstanding: {
        summary: geminiResult.summary,
        architecture: this.extractArchitecture(geminiResult),
        patterns: this.extractPatterns(geminiResult),
        dependencies: geminiResult.metrics.dependencies,
      },
      actionableInsights: geminiResult.findings
        .filter(f => f.actionable)
        .map(f => ({
          location: f.location,
          issue: f.message,
          suggestion: f.suggestion,
          priority: f.severity,
        })),
      constraints: geminiResult.recommendations
        .filter(r => r.type === 'constraint')
        .map(r => r.description),
    };
  }

  /**
   * Share context via hooks
   */
  async shareViaHooks(analysisId: string): Promise<void> {
    // Pre-edit hook will inject Gemini context
    await hooks.register('pre-edit', async (context) => {
      const findings = await this.memoryBridge.getFindingsForFile(
        analysisId,
        context.file
      );

      if (findings.length > 0) {
        context.additionalContext = {
          geminiFindings: findings,
          message: `Gemini found ${findings.length} issues in this file`,
        };
      }

      return context;
    });
  }
}
```

---

## Specialized Agent Patterns

### Gemini-Enhanced Researcher Agent

```typescript
// Enhanced researcher with Gemini capabilities
const geminiResearcherAgent = {
  type: 'researcher',
  name: 'gemini-enhanced-researcher',
  capabilities: ['gemini-analysis', 'deep-research', 'pattern-recognition'],

  async execute(task: ResearchTask): Promise<ResearchResult> {
    // Phase 1: Gemini for broad codebase understanding
    const broadAnalysis = await geminiManager.execute('codebase_analyze', {
      target: task.scope,
      depth: 'comprehensive',
      focus: ['patterns', 'dependencies', 'architecture'],
    });

    // Phase 2: Targeted deep dives with Claude
    const deepDives = [];
    for (const area of task.focusAreas) {
      const relevantFindings = broadAnalysis.findings
        .filter(f => f.location.includes(area));

      const deepDive = await claudeAgent.research({
        topic: area,
        context: relevantFindings,
        depth: 'detailed',
      });

      deepDives.push(deepDive);
    }

    // Phase 3: Synthesize findings
    return this.synthesize(broadAnalysis, deepDives);
  },
};
```

### Security Auditor Agent

```typescript
// Security-focused agent with Gemini scanning
const securityAuditorAgent = {
  type: 'security-manager',
  name: 'gemini-security-auditor',

  async audit(target: string): Promise<SecurityAuditResult> {
    // Gemini security scan
    const securityScan = await geminiManager.execute('security_scan', {
      target,
      scanTypes: [
        'injection', 'authentication', 'xss', 'xxe',
        'access_control', 'misconfig', 'secrets', 'cryptography'
      ],
      severity: 'low',
      includeRemediation: true,
      scanDependencies: true,
    });

    // Prioritize critical issues
    const criticalIssues = securityScan.vulnerabilities
      .filter(v => v.severity === 'critical' || v.severity === 'high');

    // Claude generates detailed remediation plans
    const remediationPlans = [];
    for (const issue of criticalIssues) {
      const plan = await claudeAgent.spawn('coder', {
        task: `Create remediation plan for ${issue.type}`,
        context: {
          vulnerability: issue,
          cwe: issue.cwe,
          owasp: issue.owasp,
        },
        output: 'remediation-plan',
      });

      remediationPlans.push({
        vulnerability: issue,
        plan: plan.result,
      });
    }

    return {
      summary: securityScan.summary,
      vulnerabilities: securityScan.vulnerabilities,
      remediationPlans,
      dependencyVulnerabilities: securityScan.dependencyVulnerabilities,
    };
  },
};
```

### Architecture Reviewer Agent

```typescript
// Architecture review with Gemini visualization
const architectureReviewerAgent = {
  type: 'system-architect',
  name: 'gemini-architecture-reviewer',

  async review(target: string): Promise<ArchitectureReview> {
    // Generate architecture diagrams with Gemini
    const architecture = await geminiManager.execute('architecture_map', {
      target,
      diagramTypes: ['component', 'dependency', 'layer', 'flow'],
      outputFormat: 'mermaid',
      includeExternal: true,
      depth: 5,
    });

    // Analyze patterns with Gemini
    const patterns = await geminiManager.execute('codebase_analyze', {
      target,
      depth: 'deep',
      focus: ['patterns', 'dependencies'],
    });

    // Claude provides recommendations
    const recommendations = await claudeAgent.spawn('system-architect', {
      task: 'Analyze architecture and provide recommendations',
      context: {
        diagrams: architecture.diagrams,
        components: architecture.components,
        layers: architecture.layers,
        patterns: patterns.findings.filter(f => f.type === 'pattern'),
      },
      output: 'architecture-recommendations',
    });

    return {
      diagrams: architecture.diagrams,
      components: architecture.components,
      layers: architecture.layers,
      patterns: patterns.findings,
      recommendations: recommendations.result,
    };
  },
};
```

---

## Workflow Examples

### Complete Feature Development Workflow

```typescript
// Full feature development with Gemini integration
async function developFeature(featureSpec: FeatureSpec) {
  // Step 1: Understand codebase with Gemini
  const codebaseAnalysis = await geminiManager.execute('codebase_analyze', {
    target: '.',
    depth: 'comprehensive',
    focus: ['architecture', 'patterns'],
  });

  // Store for agent access
  await memoryManager.store({
    key: 'feature/codebase-context',
    value: codebaseAnalysis,
    namespace: 'feature-dev',
  });

  // Step 2: Architecture review
  const architecture = await geminiManager.execute('architecture_map', {
    target: '.',
    diagramTypes: ['component', 'dependency'],
  });

  // Step 3: Spawn implementation swarm
  await coordinator.initSwarm({ topology: 'hierarchical', maxAgents: 6 });

  // Coordinator agent
  const coordinator = await claudeAgent.spawn('queen-coordinator', {
    task: `Coordinate implementation of: ${featureSpec.name}`,
    context: {
      codebaseAnalysis,
      architecture,
      featureSpec,
    },
  });

  // Implementation agents
  await claudeAgent.spawn('coder', {
    task: 'Implement backend API',
    context: { layer: architecture.layers.find(l => l.name === 'api') },
  });

  await claudeAgent.spawn('coder', {
    task: 'Implement frontend UI',
    context: { layer: architecture.layers.find(l => l.name === 'ui') },
  });

  await claudeAgent.spawn('tester', {
    task: 'Write tests for new feature',
    context: { featureSpec },
  });

  // Step 4: Wait for completion
  const results = await coordinator.waitForCompletion();

  // Step 5: Final quality check with Gemini
  const qualityCheck = await geminiManager.execute('codebase_analyze', {
    target: '.',
    depth: 'moderate',
    focus: ['quality'],
  });

  return {
    implementation: results,
    qualityScore: qualityCheck.metrics.qualityScore,
    recommendations: qualityCheck.recommendations,
  };
}
```

### Security Remediation Workflow

```typescript
// Security issue detection and remediation
async function remediateSecurityIssues() {
  // Step 1: Full security scan with Gemini
  const securityScan = await geminiManager.execute('security_scan', {
    target: '.',
    scanTypes: ['injection', 'xss', 'secrets', 'authentication', 'misconfig'],
    severity: 'low',
    includeRemediation: true,
    scanDependencies: true,
  });

  // Store findings
  await memoryManager.store({
    key: 'security/scan-results',
    value: securityScan,
    namespace: 'security-remediation',
  });

  // Step 2: Prioritize issues
  const prioritized = securityScan.vulnerabilities.sort((a, b) => {
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    return severityOrder[a.severity] - severityOrder[b.severity];
  });

  // Step 3: Fix issues with Claude
  const fixes = [];
  for (const vuln of prioritized.slice(0, 10)) { // Top 10 issues
    const fix = await claudeAgent.spawn('coder', {
      task: `Fix ${vuln.type} vulnerability in ${vuln.location}`,
      context: {
        vulnerability: vuln,
        remediation: vuln.remediation,
        cwe: vuln.cwe,
      },
      verification: true,
    });

    fixes.push({ vulnerability: vuln, fix: fix.result });
  }

  // Step 4: Verify fixes with Gemini re-scan
  await geminiManager.cache.invalidate({ target: '.' });

  const verification = await geminiManager.execute('security_scan', {
    target: '.',
    scanTypes: prioritized.slice(0, 10).map(v => v.type),
  });

  return {
    originalIssues: securityScan.summary.totalIssues,
    fixed: fixes.length,
    remaining: verification.summary.totalIssues,
    fixes,
  };
}
```

---

## Best Practices

### 1. Always Start with Gemini for Large Codebases

```typescript
// Good: Gemini first for context
async function goodPattern(target: string) {
  const context = await geminiManager.execute('codebase_analyze', { target });
  await claudeAgent.spawn('coder', { task: 'implement', context });
}

// Bad: Claude tries to read large codebase
async function badPattern(target: string) {
  // This will use many tokens and may miss context
  await claudeAgent.spawn('coder', { task: 'analyze and implement', target });
}
```

### 2. Use Parallel Execution When Possible

```typescript
// Good: Parallel analysis and preparation
async function parallelPattern() {
  const [analysis, preparation] = await Promise.all([
    geminiManager.execute('codebase_analyze', { target: '.' }),
    claudeAgent.spawn('planner', { task: 'prepare implementation plan' }),
  ]);

  return { analysis, preparation };
}
```

### 3. Cache Gemini Results Appropriately

```typescript
// Use cache for repeated queries
const config = {
  cache: {
    enabled: true,
    ttl: 3600000, // 1 hour for analysis results
    keyStrategy: 'content_hash', // Invalidate on file changes
  },
};
```

### 4. Share Context Through Memory

```typescript
// Good: Centralized context sharing
await memoryManager.store({
  key: 'swarm/shared/analysis',
  value: geminiResult,
  namespace: 'swarm-session',
});

// All agents access same context
const context = await memoryManager.retrieve({
  key: 'swarm/shared/analysis',
  namespace: 'swarm-session',
});
```

### 5. Use Progressive Analysis

```typescript
// Start shallow, go deep only where needed
async function progressiveAnalysis(target: string) {
  // Quick overview first
  const overview = await geminiManager.execute('codebase_analyze', {
    target,
    depth: 'surface',
  });

  // Deep dive only on problem areas
  for (const area of overview.findings.filter(f => f.severity === 'high')) {
    await geminiManager.execute('codebase_analyze', {
      target: area.location,
      depth: 'deep',
    });
  }
}
```

---

## Troubleshooting

### Context Not Flowing to Agents

```typescript
// Check memory storage
const stored = await memoryManager.retrieve({
  key: 'gemini/analysis/latest',
  namespace: 'gemini-cli',
});

if (!stored) {
  console.error('Analysis not stored in memory');
  // Re-run analysis with storage
  const result = await geminiManager.execute('codebase_analyze', { target: '.' });
  await memoryBridge.analyzeAndStore('latest', { target: '.' });
}
```

### Agents Not Using Gemini Context

```typescript
// Verify agent instructions include context access
const agentInstructions = `
  IMPORTANT: Before making changes, check shared memory for Gemini analysis:
  - Key: swarm/shared/codebase-analysis
  - Contains: findings, patterns, architecture
  - Use this context for informed decisions
`;
```

### Rate Limiting Issues

```typescript
// Configure rate limiting for parallel analysis
const config = {
  rateLimit: {
    rpm: 30, // Reduce if hitting limits
    queueEnabled: true,
    backoff: { initial: 2000, max: 60000, factor: 2 },
  },
};
```

---

## Related Documentation

- [MCP-TOOLS.md](./MCP-TOOLS.md) - MCP tool integration
- [EXECUTOR.md](./EXECUTOR.md) - Analysis executor details
- [README.md](./README.md) - Main module documentation

---

*Last Updated: December 2025*
*Version: 1.0.0*
