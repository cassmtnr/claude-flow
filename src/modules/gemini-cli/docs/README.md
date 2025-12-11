# Gemini CLI Module for Claude Flow

**Version**: 1.0.0
**Status**: Proposed Implementation
**Compatibility**: Claude Flow v2.8.0+
**License**: MIT

---

## Overview

The Gemini CLI Module is an **optional, ejectable integration** that brings Google's Gemini CLI capabilities into Claude Flow. Following the principle **"Claude Flow orchestrates, Claude Code edits, Gemini reads"**, this module provides specialized analysis tools that leverage Gemini's 1M+ token context window for large-scale codebase analysis.

### Key Features

- **Opt-in Only**: Zero impact on existing Claude Flow installations
- **Fully Ejectable**: Complete removal without affecting core functionality
- **Fork-Friendly**: Designed for easy maintenance in forked repositories
- **Specialized Tools**: Codebase analysis, architecture mapping, security scanning
- **MCP Integration**: Exposed as progressive disclosure tools

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Architecture](#architecture)
3. [Installation](#installation)
4. [Authentication](#authentication)
5. [CLI Commands](#cli-commands)
6. [Specialized Tools](#specialized-tools)
7. [MCP Integration](#mcp-integration)
8. [Configuration](#configuration)
9. [Agent Integration](#agent-integration)
10. [Testing](#testing)
11. [Ejection](#ejection)
12. [Development](#development)

---

## Quick Start

```bash
# Enable Gemini CLI integration
npx claude-flow gemini enable

# Complete Google authentication in browser
# ...authentication completes...

# Analyze your codebase
npx claude-flow gemini analyze --path ./src

# Security audit
npx claude-flow gemini analyze --type security --path ./src

# Architecture overview
npx claude-flow gemini analyze --type architecture --path ./
```

---

## Architecture

### Module Isolation Design

The Gemini CLI module is completely isolated from Claude Flow core to ensure:

1. **No Core Dependencies**: Module doesn't import from core internals
2. **Interface Communication**: Uses defined interfaces for data exchange
3. **Lazy Loading**: Only loads when explicitly invoked
4. **Separate Configuration**: Own config namespace (`gemini.*`)

```
claude-flow/
├── src/
│   ├── core/                    # Core Claude Flow (unchanged)
│   ├── modules/                 # Optional modules directory
│   │   └── gemini-cli/         # Gemini CLI module
│   │       ├── index.ts        # Module entry point
│   │       ├── types.ts        # TypeScript interfaces
│   │       ├── installer.ts    # Installation management
│   │       ├── authenticator.ts # Auth flow management
│   │       ├── executor.ts     # Command execution
│   │       ├── tools/          # Specialized analysis tools
│   │       ├── parsers/        # Output parsers
│   │       └── config/         # Configuration
│   ├── cli/
│   │   └── commands/
│   │       └── gemini.ts       # CLI command handler
│   └── mcp/
│       └── tools/
│           └── gemini/         # MCP tool definitions
└── docs/
    └── modules/
        └── gemini-cli/         # This documentation
```

### Integration Flow

```
┌───────────────────────────────────────────────────────────────────────────┐
│                         Claude Flow Orchestrator                          │
│                                                                           │
│   ┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────┐   │
│   │    Claude Code      │  │    Gemini CLI       │  │     Memory      │   │
│   │     (Editor)        │  │    [OPTIONAL]       │  │     System      │   │
│   │                     │  │                     │  │                 │   │
│   │ • Write code        │  │ • Codebase scan     │  │ • Store results │   │
│   │ • Edit files        │  │ • Architecture map  │  │ • Share context │   │
│   │ • Run commands      │  │ • Security audit    │  │ • Track patterns│   │
│   │ • Execute tests     │  │ • Dep analysis      │  │                 │   │
│   └─────────────────────┘  └─────────────────────┘  └─────────────────┘   │
│                                                                           │
│   Decision Matrix: File size > 100KB OR full codebase → Use Gemini        │
│                    Code editing OR small files → Use Claude Code          │
└───────────────────────────────────────────────────────────────────────────┘
```

---

## Installation

### Prerequisites

- Node.js 18+ (Node.js 20+ recommended)
- npm 9+ or pnpm
- Claude Flow v2.8.0+
- Google account (for free tier) OR API key

### Enable the Module

```bash
# The enable command will:
# 1. Check if Gemini CLI is installed globally
# 2. Install it if missing
# 3. Start authentication flow
# 4. Update Claude Flow configuration

npx claude-flow gemini enable
```

### Manual Gemini CLI Installation

If you prefer to install Gemini CLI separately:

```bash
# Install globally
npm install -g @google/gemini-cli

# Verify installation
gemini --version

# Then enable in Claude Flow
npx claude-flow gemini enable --skip-install
```

---

## Authentication

The module supports three authentication methods, each suited for different use cases.

### Method 1: Google Login (Recommended)

**Best for**: Individual developers, local development

```bash
npx claude-flow gemini enable --auth google-login
```

**Process**:
1. Browser opens automatically
2. Complete Google OAuth login
3. Credentials cached in `~/.gemini/`
4. Free tier: 60 req/min, 1000 req/day

**Benefits**:
- Access to Gemini 2.5 Pro (1M context)
- No API key management
- Automatic token refresh

### Method 2: API Key

**Best for**: CI/CD, scripts, automated workflows

```bash
# Obtain key from Google AI Studio: https://aistudio.google.com/app/apikey

npx claude-flow gemini enable --auth api-key --api-key "YOUR_GEMINI_API_KEY"

# Or via environment variable
export GEMINI_API_KEY="YOUR_GEMINI_API_KEY"
npx claude-flow gemini enable --auth api-key
```

**Benefits**:
- Non-interactive authentication
- Works in headless environments
- Scriptable and automatable

### Method 3: Vertex AI (Enterprise)

**Best for**: Enterprise, Google Cloud users, compliance requirements

```bash
# 1. Create service account in Google Cloud Console
# 2. Assign "Vertex AI User" role
# 3. Download JSON key file
# 4. Set environment variable

export GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account.json"

npx claude-flow gemini enable \
  --auth vertex-ai \
  --vertex-project "my-gcp-project" \
  --vertex-location "us-central1"
```

**Benefits**:
- Enterprise-grade security
- Custom quotas and limits
- Audit logging
- VPC integration
- Compliance certifications

### Checking Authentication Status

```bash
npx claude-flow gemini status

# Output:
# Gemini CLI Module Status
#   Installed:      Yes
#   Version:        1.0.0
#   Authenticated:  Yes
#   Auth Method:    google-login
#   Enabled:        Yes
#
# Quota Status:
#   Requests/min:   60
#   Requests/day:   1000
```

---

## CLI Commands

### Command Reference

| Command | Description | Options |
|---------|-------------|---------|
| `gemini enable` | Enable and authenticate | `--auth`, `--api-key`, `--vertex-*`, `--skip-install` |
| `gemini disable` | Disable temporarily | - |
| `gemini status` | Check module status | - |
| `gemini analyze` | Run analysis | `-t/--type`, `-p/--path`, `-q/--query`, `-o/--output` |
| `gemini search` | Semantic code search | `-q/--query`, `-p/--path` |
| `gemini verify` | Verify implementation | `-f/--feature`, `-p/--path` |
| `gemini eject` | Complete removal | `--force`, `--uninstall` |

### Enable Command

```bash
npx claude-flow gemini enable [options]

Options:
  --auth <method>           Authentication method: google-login, api-key, vertex-ai
                            (default: google-login)
  --api-key <key>          API key for api-key authentication
  --vertex-project <id>    Google Cloud project ID for Vertex AI
  --vertex-location <loc>  Google Cloud region (default: us-central1)
  --skip-install           Skip Gemini CLI installation check
  --model <model>          Default model: gemini-2.5-pro, gemini-2.5-flash
                            (default: gemini-2.5-pro)
```

### Analyze Command

```bash
npx claude-flow gemini analyze [options]

Options:
  -t, --type <type>        Analysis type (default: codebase)
                            • codebase    - Full codebase overview
                            • architecture - System architecture
                            • security    - Security audit
                            • dependencies - Dependency analysis
                            • coverage    - Test coverage assessment

  -p, --path <paths...>    Paths to analyze (default: .)
                            Supports @ syntax: @src/, @./lib

  -q, --query <query>      Custom analysis prompt

  -o, --output <format>    Output format: json, markdown, text
                            (default: markdown)

  --include <patterns...>  Include file patterns (e.g., "*.ts", "*.js")
  --exclude <patterns...>  Exclude file patterns (e.g., "*.test.ts")
  --max-files <n>          Maximum files to analyze
  --store-memory           Store results in Claude Flow memory

Examples:
  # Full codebase analysis
  npx claude-flow gemini analyze --path ./src

  # Security audit with JSON output
  npx claude-flow gemini analyze --type security --path ./src -o json

  # Architecture with custom query
  npx claude-flow gemini analyze --type architecture \
    --query "Focus on the authentication flow"

  # Multiple paths
  npx claude-flow gemini analyze --path ./src ./tests ./lib

  # With include/exclude patterns
  npx claude-flow gemini analyze \
    --include "*.ts" "*.tsx" \
    --exclude "*.test.ts" "*.spec.ts"
```

### Search Command

```bash
npx claude-flow gemini search [options]

Options:
  -q, --query <query>      Search query (required)
  -p, --path <paths...>    Paths to search (default: .)
  -o, --output <format>    Output format: json, markdown (default: markdown)
  --max-results <n>        Maximum results to return

Examples:
  # Find authentication implementation
  npx claude-flow gemini search --query "JWT token validation"

  # Search specific directory
  npx claude-flow gemini search -q "database connection" -p ./src/db
```

### Verify Command

```bash
npx claude-flow gemini verify [options]

Options:
  -f, --feature <name>     Feature to verify (required)
  -p, --path <paths...>    Paths to check (default: .)
  -o, --output <format>    Output format: json, markdown (default: json)

Examples:
  # Verify feature exists
  npx claude-flow gemini verify --feature "user authentication with OAuth2"

  # Verify with specific path
  npx claude-flow gemini verify \
    --feature "rate limiting on API endpoints" \
    --path ./src/api
```

### Eject Command

```bash
npx claude-flow gemini eject [options]

Options:
  --force                  Skip confirmation prompt
  --uninstall              Also uninstall Gemini CLI globally
  --keep-config            Keep configuration for future use

Examples:
  # Soft eject (keeps installed)
  npx claude-flow gemini eject --force

  # Complete removal
  npx claude-flow gemini eject --force --uninstall
```

---

## Specialized Tools

### Tool Categories

The module provides five specialized analysis tools, each optimized for specific use cases.

### 1. Codebase Analyzer

**Purpose**: Comprehensive overview of entire codebase

```bash
npx claude-flow gemini analyze --type codebase --path ./

# Output includes:
# - Project structure summary
# - Technology stack detection
# - Key components identification
# - Code organization patterns
# - Entry points and main flows
```

**When to use**:
- Onboarding to new projects
- Understanding unfamiliar codebases
- Documentation generation
- Technical debt assessment

### 2. Architecture Mapper

**Purpose**: System architecture visualization and analysis

```bash
npx claude-flow gemini analyze --type architecture --path ./src

# Output includes:
# - Component relationship diagram
# - Data flow analysis
# - Design patterns in use
# - Module dependencies
# - API boundaries
```

**When to use**:
- System documentation
- Refactoring planning
- Identifying coupling issues
- Microservices decomposition

### 3. Security Scanner

**Purpose**: Security vulnerability detection and audit

```bash
npx claude-flow gemini analyze --type security --path ./src -o json

# Output includes:
# - Potential vulnerabilities (OWASP Top 10)
# - Insecure patterns detected
# - Hardcoded secrets scan
# - Authentication/authorization issues
# - Input validation gaps
# - Security recommendations
```

**When to use**:
- Pre-deployment security review
- Compliance audits
- Penetration testing preparation
- Security-focused code review

### 4. Dependency Analyzer

**Purpose**: Dependency graph and health analysis

```bash
npx claude-flow gemini analyze --type dependencies --path ./

# Output includes:
# - Dependency tree visualization
# - Outdated packages
# - Known vulnerabilities (CVEs)
# - License compliance
# - Bundle size impact
# - Unused dependencies
```

**When to use**:
- Dependency upgrades
- Security patch prioritization
- Bundle optimization
- License compliance checks

### 5. Test Coverage Assessor

**Purpose**: Test quality and coverage analysis

```bash
npx claude-flow gemini analyze --type coverage --path ./src ./tests

# Output includes:
# - Estimated coverage by module
# - Untested code paths
# - Missing edge cases
# - Test quality assessment
# - Testing recommendations
# - Critical paths without tests
```

**When to use**:
- Test suite improvements
- QA planning
- Risk assessment
- CI/CD gate decisions

---

## MCP Integration

The Gemini CLI module exposes its capabilities as MCP tools, following Claude Flow's progressive disclosure pattern.

### Tool Registration

Tools are automatically registered when the module is enabled:

```typescript
// MCP tools available when module is enabled:
// - gemini/analyze
// - gemini/search
// - gemini/verify
// - gemini/security
// - gemini/architecture
```

### Tool Definitions

#### gemini/analyze

```typescript
{
  name: 'gemini/analyze',
  description: 'Analyze codebase using Gemini CLI (1M+ token context)',
  inputSchema: {
    type: 'object',
    properties: {
      type: {
        type: 'string',
        enum: ['codebase', 'architecture', 'security', 'dependencies', 'coverage'],
        description: 'Type of analysis to perform'
      },
      paths: {
        type: 'array',
        items: { type: 'string' },
        description: 'Paths to analyze'
      },
      query: {
        type: 'string',
        description: 'Optional custom analysis prompt'
      },
      outputFormat: {
        type: 'string',
        enum: ['json', 'markdown', 'text'],
        default: 'markdown'
      }
    },
    required: ['type', 'paths']
  }
}
```

#### gemini/search

```typescript
{
  name: 'gemini/search',
  description: 'Semantic code search across large codebases',
  inputSchema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'Search query'
      },
      paths: {
        type: 'array',
        items: { type: 'string' },
        description: 'Paths to search'
      },
      maxResults: {
        type: 'number',
        default: 10
      }
    },
    required: ['query']
  }
}
```

#### gemini/verify

```typescript
{
  name: 'gemini/verify',
  description: 'Verify if a feature is implemented in the codebase',
  inputSchema: {
    type: 'object',
    properties: {
      feature: {
        type: 'string',
        description: 'Feature description to verify'
      },
      paths: {
        type: 'array',
        items: { type: 'string' },
        default: ['.']
      }
    },
    required: ['feature']
  }
}
```

### Using in Swarm Agents

Agents can invoke Gemini tools through MCP:

```typescript
// In agent implementation
const analysisResult = await mcpClient.callTool('gemini/analyze', {
  type: 'architecture',
  paths: ['./src'],
  query: 'Focus on the data layer'
});

// Store in memory for other agents
await memoryManager.store('analysis/architecture', analysisResult);
```

---

## Configuration

### Configuration File

The module configuration is stored in `.claude-flow/config.json`:

```json
{
  "gemini": {
    "enabled": true,
    "authMethod": "google-login",
    "defaultModel": "gemini-2.5-pro",
    "contextLimit": 1000000,
    "requestsPerMinute": 60,
    "requestsPerDay": 1000,

    "analysis": {
      "defaultType": "codebase",
      "outputFormat": "markdown",
      "storeInMemory": true,
      "excludePatterns": [
        "node_modules/**",
        "dist/**",
        ".git/**",
        "*.min.js"
      ]
    },

    "autoAnalyze": {
      "enabled": false,
      "triggerSize": 102400,
      "types": ["architecture", "security"]
    },

    "cache": {
      "enabled": true,
      "ttl": 3600000,
      "maxSize": 100
    }
  }
}
```

### Environment Variables

```bash
# Authentication
GEMINI_API_KEY=your-api-key
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
GOOGLE_CLOUD_PROJECT=your-project-id
GOOGLE_CLOUD_LOCATION=us-central1

# Module Settings
CLAUDE_FLOW_GEMINI_ENABLED=true
CLAUDE_FLOW_GEMINI_MODEL=gemini-2.5-pro
CLAUDE_FLOW_GEMINI_CONTEXT_LIMIT=1000000

# Debug
CLAUDE_FLOW_GEMINI_DEBUG=true
```

### Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `enabled` | boolean | false | Module enabled state |
| `authMethod` | string | 'google-login' | Authentication method |
| `defaultModel` | string | 'gemini-2.5-pro' | Default Gemini model |
| `contextLimit` | number | 1000000 | Max tokens per request |
| `requestsPerMinute` | number | 60 | Rate limit (free tier) |
| `requestsPerDay` | number | 1000 | Daily limit (free tier) |
| `analysis.defaultType` | string | 'codebase' | Default analysis type |
| `analysis.outputFormat` | string | 'markdown' | Default output format |
| `analysis.storeInMemory` | boolean | true | Auto-store in memory |
| `analysis.excludePatterns` | string[] | [...] | Patterns to exclude |
| `autoAnalyze.enabled` | boolean | false | Auto-trigger for large files |
| `autoAnalyze.triggerSize` | number | 102400 | Size threshold (bytes) |
| `cache.enabled` | boolean | true | Enable result caching |
| `cache.ttl` | number | 3600000 | Cache TTL (ms) |

---

## Agent Integration

### Using Gemini in Swarm Workflows

The module integrates seamlessly with Claude Flow's swarm orchestration:

```typescript
// Example: Full-stack development workflow
async function developFeature(feature: string) {
  // Step 1: Use Gemini for large-scale analysis
  const architectureAnalysis = await geminiModule.analyze({
    type: 'architecture',
    paths: ['./src'],
    query: `Where should we implement: ${feature}`
  });

  // Step 2: Store findings in shared memory
  await memoryManager.store('swarm/analysis/architecture', architectureAnalysis);

  // Step 3: Spawn Claude Code agents with context
  const swarm = await swarmManager.spawn({
    topology: 'hierarchical',
    agents: [
      { type: 'architect', task: 'Design implementation based on analysis' },
      { type: 'coder', task: 'Implement the feature' },
      { type: 'tester', task: 'Write tests' }
    ],
    context: {
      analysis: architectureAnalysis
    }
  });

  // Step 4: Verify implementation with Gemini
  const verification = await geminiModule.verify({
    feature,
    paths: ['./src']
  });

  return { swarm, verification };
}
```

### Agent Decision Matrix

Agents automatically decide when to use Gemini vs Claude:

```typescript
// In agent implementation
async function analyzeCode(paths: string[]): Promise<AnalysisResult> {
  const totalSize = await calculateTotalSize(paths);

  // Decision: Use Gemini for large codebases
  if (totalSize > 100 * 1024) { // > 100KB
    logger.info('Using Gemini for large-scale analysis');
    return await geminiModule.analyze({ paths });
  }

  // Use Claude Code for smaller analysis
  logger.info('Using Claude Code for local analysis');
  return await claudeCode.analyze({ paths });
}
```

### Hook Integration

The module integrates with Claude Flow's hook system:

```typescript
// Pre-task hook: Auto-analyze if needed
hooks.register('pre-task', async (task) => {
  if (task.requiresCodebaseAnalysis) {
    const analysis = await geminiModule.analyze({
      type: 'codebase',
      paths: task.paths
    });
    task.context.analysis = analysis;
  }
});

// Post-task hook: Verify implementation
hooks.register('post-task', async (task, result) => {
  if (task.type === 'implementation') {
    const verification = await geminiModule.verify({
      feature: task.description,
      paths: task.paths
    });
    result.verification = verification;
  }
});
```

---

## Testing

### Test Structure

```
tests/
└── modules/
    └── gemini-cli/
        ├── unit/
        │   ├── installer.test.ts
        │   ├── authenticator.test.ts
        │   ├── executor.test.ts
        │   └── tools/
        │       ├── codebase-analyzer.test.ts
        │       ├── security-scanner.test.ts
        │       └── ...
        ├── integration/
        │   ├── module-lifecycle.test.ts
        │   ├── mcp-tools.test.ts
        │   └── agent-integration.test.ts
        └── e2e/
            ├── full-workflow.test.ts
            └── ejection.test.ts
```

### Running Tests

```bash
# Unit tests only
npm run test:unit -- --testPathPattern="gemini-cli"

# Integration tests
npm run test:integration -- --testPathPattern="gemini-cli"

# All module tests
npm test -- --testPathPattern="gemini-cli"

# With coverage
npm run test:coverage -- --testPathPattern="gemini-cli"
```

### Test Cases

#### Unit Tests

```typescript
// tests/modules/gemini-cli/unit/installer.test.ts
describe('GeminiInstaller', () => {
  it('should detect installed Gemini CLI', async () => {
    const installer = new GeminiInstaller();
    const isInstalled = await installer.isInstalled();
    expect(typeof isInstalled).toBe('boolean');
  });

  it('should get version when installed', async () => {
    const installer = new GeminiInstaller();
    if (await installer.isInstalled()) {
      const version = await installer.getVersion();
      expect(version).toMatch(/^\d+\.\d+\.\d+/);
    }
  });

  it('should handle installation failure gracefully', async () => {
    const installer = new GeminiInstaller();
    // Mock npm install failure
    jest.spyOn(installer as any, 'runNpmInstall').mockRejectedValue(
      new Error('npm install failed')
    );

    await expect(installer.ensureInstalled()).rejects.toThrow(
      'Failed to install Gemini CLI'
    );
  });
});
```

#### Integration Tests

```typescript
// tests/modules/gemini-cli/integration/module-lifecycle.test.ts
describe('GeminiCLIModule Lifecycle', () => {
  let module: GeminiCLIModule;

  beforeEach(() => {
    module = GeminiCLIModule.getInstance();
  });

  afterEach(async () => {
    await module.disable();
  });

  it('should enable without affecting core Claude Flow', async () => {
    const coreStatus = await claudeFlow.getStatus();

    await module.enable({ authMethod: 'api-key', apiKey: 'test-key' });

    const coreStatusAfter = await claudeFlow.getStatus();
    expect(coreStatus).toEqual(coreStatusAfter);
  });

  it('should disable cleanly', async () => {
    await module.enable({ authMethod: 'api-key', apiKey: 'test-key' });
    expect(module.isEnabled()).toBe(true);

    await module.disable();
    expect(module.isEnabled()).toBe(false);
  });

  it('should eject completely without data loss', async () => {
    // Store some data
    await memoryManager.store('test-key', 'test-value');

    // Enable and use module
    await module.enable({ authMethod: 'api-key', apiKey: 'test-key' });

    // Eject
    await module.eject({ force: true });

    // Verify core data intact
    const value = await memoryManager.retrieve('test-key');
    expect(value).toBe('test-value');
  });
});
```

---

## Ejection

### Soft Disable

Temporarily disable without removing:

```bash
npx claude-flow gemini disable
```

**Effects**:
- Module marked as disabled in config
- MCP tools return "not enabled" message
- CLI commands still accessible
- No data loss
- Quick re-enable with `gemini enable`

### Full Ejection

Complete removal of the module:

```bash
npx claude-flow gemini eject --force --uninstall
```

**Ejection Process**:

1. **Disable Module**
   - Stop all active operations
   - Unregister MCP tools
   - Clear runtime state

2. **Clear Configuration**
   - Remove `config.gemini.*` entries
   - Keep other configuration intact

3. **Clear Cache**
   - Remove cached analysis results
   - Clear authentication tokens

4. **Uninstall (Optional)**
   - Remove Gemini CLI globally
   - Clear `~/.gemini/` directory

### No Core Impact Guarantee

The ejection process:
- **Does NOT** modify core Claude Flow files
- **Does NOT** affect other modules
- **Does NOT** require restart
- **Does NOT** lose other configuration
- **Does NOT** affect memory/database

### Re-enabling After Ejection

```bash
# Simply run enable again
npx claude-flow gemini enable

# With previous settings
npx claude-flow gemini enable --restore
```

---

## Development

### Setting Up Development Environment

```bash
# Clone the repository
git clone https://github.com/your-fork/claude-flow.git
cd claude-flow

# Install dependencies
npm install

# Run in development mode
npm run dev

# Build the module
npm run build
```

### Module Development Guidelines

1. **No Core Imports**: Never import from core Claude Flow internals
2. **Interface Only**: Use defined interfaces for communication
3. **Lazy Loading**: Module should only load on explicit invocation
4. **Error Isolation**: Errors should never crash core functionality
5. **Configuration Namespace**: Use `gemini.*` for all config

### File Structure for Development

```typescript
// src/modules/gemini-cli/index.ts
export class GeminiCLIModule {
  // Singleton pattern for global access
  private static instance: GeminiCLIModule | null = null;

  static getInstance(): GeminiCLIModule {
    if (!GeminiCLIModule.instance) {
      GeminiCLIModule.instance = new GeminiCLIModule();
    }
    return GeminiCLIModule.instance;
  }

  // Core methods
  async enable(config: GeminiConfig): Promise<void>;
  async disable(): Promise<void>;
  async eject(options: EjectOptions): Promise<void>;
  async getStatus(): Promise<GeminiStatus>;
  isEnabled(): boolean;
  getExecutor(): GeminiExecutor | null;
}
```

### Keeping Updated with Upstream

Since this module is designed to be fork-friendly:

```bash
# Add upstream remote
git remote add upstream https://github.com/ruvnet/claude-flow.git

# Fetch upstream changes
git fetch upstream

# Merge upstream main into your fork
git checkout main
git merge upstream/main

# The module directory is isolated, so conflicts are minimal
```

---

## Troubleshooting

### Common Issues

#### Authentication Failures

```bash
# Clear cached credentials
rm -rf ~/.gemini/

# Re-authenticate
npx claude-flow gemini enable --auth google-login
```

#### Rate Limiting

```bash
# Check current quota
npx claude-flow gemini status

# Wait for quota reset or upgrade to paid tier
# Free tier: 60 req/min, 1000 req/day
```

#### Installation Issues

```bash
# Manual installation
npm install -g @google/gemini-cli

# Verify
gemini --version

# Then enable without auto-install
npx claude-flow gemini enable --skip-install
```

#### Module Not Loading

```bash
# Check if enabled
npx claude-flow gemini status

# Re-enable
npx claude-flow gemini disable
npx claude-flow gemini enable
```

### Debug Mode

```bash
# Enable debug logging
export CLAUDE_FLOW_GEMINI_DEBUG=true
npx claude-flow gemini analyze --path ./src

# Check logs
cat .claude-flow/logs/gemini-module.log
```

---

## Changelog

### v1.0.0 (Proposed)

- Initial implementation
- Three authentication methods
- Five specialized analysis tools
- MCP tool integration
- Full ejection support

---

## License

MIT License - See [LICENSE](../../../LICENSE)

---

## Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](../../../CONTRIBUTING.md) first.

---

## Support

- **Issues**: [GitHub Issues](https://github.com/ruvnet/claude-flow/issues)
- **Documentation**: [Claude Flow Docs](../../INDEX.md)
- **Community**: [Discord](https://discord.gg/claude-flow)
