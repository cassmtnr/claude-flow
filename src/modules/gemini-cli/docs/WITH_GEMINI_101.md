# Claude Flow + Gemini CLI: Getting Started Guide

> A practical guide to orchestrating Claude Code and Gemini CLI together using Claude Flow's hive mind system.

## Table of Contents

1. [Quick Start](#quick-start)
2. [How It Works](#how-it-works)
3. [Setting Up the Hive Mind](#setting-up-the-hive-mind)
4. [Example Workflows](#example-workflows)
   - [Refactoring a Module](#1-refactoring-a-module)
   - [Creating a New Project](#2-creating-a-new-project)
   - [Finding and Fixing Bugs](#3-finding-and-fixing-bugs)
   - [Creating Documentation](#4-creating-documentation)
   - [Security Audit](#5-security-audit)
   - [Architecture Review](#6-architecture-review)
5. [Natural Language Prompts](#natural-language-prompts)
6. [Best Practices](#best-practices)

---

## Quick Start

### Prerequisites

```bash
# 1. Install/update Claude Flow
npm install -g claude-flow@alpha

# 2. Enable Gemini CLI integration
npx claude-flow gemini enable

# 3. Complete Google authentication in browser
# ... authentication completes ...

# 4. Verify setup
npx claude-flow gemini status
```

### Your First Hive Mind Command

```bash
# Initialize a hierarchical hive mind for your project
npx claude-flow hive-mind init \
  --topology hierarchical \
  --with-gemini \
  --project ./my-project
```

That's it! Now you can give natural language prompts to Claude Flow.

---

## How It Works

```
┌───────────────────────────────────────────────────────────────────────────┐
│                              Your Prompt                                  │
│                    "Refactor the auth module"                             │
└─────────────────────────────────┬─────────────────────────────────────────┘
                                  │
                                  ▼
┌───────────────────────────────────────────────────────────────────────────┐
│                         Claude Flow Orchestrator                          │
│                                                                           │
│   1. Analyzes your request                                                │
│   2. Decides: Large codebase reading? → Gemini CLI                        │
│               Code changes needed? → Claude Code                          │
│   3. Spawns appropriate agents                                            │
│   4. Coordinates workflow                                                 │
└─────────────────────────────────┬─────────────────────────────────────────┘
                                  │
                    ┌─────────────┴─────────────┐
                    │                           │
                    ▼                           ▼
          ┌─────────────────┐         ┌─────────────────┐
          │   Gemini CLI    │         │   Claude Code   │
          │                 │         │                 │
          │ • Reads 1M+     │────────▶│ • Writes code   │
          │   tokens        │ context │ • Edits files   │
          │ • Analyzes      │         │ • Runs tests    │
          │ • Maps arch     │         │ • Refactors     │
          └─────────────────┘         └─────────────────┘
```

### The Golden Rule

> **"Claude Flow orchestrates, Claude Code creates, Gemini reads"**

| Tool | Best For |
|------|----------|
| **Gemini CLI** | Reading large codebases (>100 files), architecture analysis, security scanning |
| **Claude Code** | Writing code, editing files, running commands, making changes |
| **Claude Flow** | Coordinating both, managing workflows, spawning agents |

---

## Setting Up the Hive Mind

### Option 1: Hierarchical Topology (Recommended)

Best for: Complex projects with clear task delegation.

```bash
npx claude-flow hive-mind init \
  --topology hierarchical \
  --with-gemini \
  --queen-model opus \
  --worker-count 4
```

```
                    ┌─────────────────┐
                    │  Queen Agent    │
                    │  (Coordinator)  │
                    └────────┬────────┘
                             │
         ┌───────────┬───────┼───────┬───────────┐
         │           │       │       │           │
         ▼           ▼       ▼       ▼           ▼
    ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐
    │ Gemini  │ │ Coder   │ │ Coder   │ │ Tester  │
    │ Analyst │ │ Agent   │ │ Agent   │ │ Agent   │
    └─────────┘ └─────────┘ └─────────┘ └─────────┘
```

### Option 2: Mesh Topology

Best for: Parallel independent tasks.

```bash
npx claude-flow hive-mind init \
  --topology mesh \
  --with-gemini \
  --agent-count 6
```

### Option 3: Adaptive Topology

Best for: Dynamic workloads that change based on analysis.

```bash
npx claude-flow hive-mind init \
  --topology adaptive \
  --with-gemini \
  --auto-scale
```

---

## Example Workflows

### 1. Refactoring a Module

**Scenario**: You want to refactor the authentication module in your project.

#### Command

```bash
npx claude-flow task "Refactor the authentication module to use JWT tokens instead of sessions"
```

#### What Happens Behind the Scenes

```
┌───────────────────────────────────────────────────────────────────────────┐
│ Step 1: Gemini CLI analyzes the codebase                                  │
│                                                                           │
│   npx claude-flow gemini analyze \                                        │
│     --type architecture \                                                 │
│     --path ./src/auth \                                                   │
│     --query "Map authentication flow and session handling"                │
└───────────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌───────────────────────────────────────────────────────────────────────────┐
│ Step 2: Queen spawns worker agents with Gemini context                    │
│                                                                           │
│   • Coder Agent 1: Implement JWT token generation                         │
│   • Coder Agent 2: Update middleware to validate JWT                      │
│   • Coder Agent 3: Migrate session storage to token storage               │
│   • Tester Agent: Write tests for new JWT flow                            │
└───────────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌───────────────────────────────────────────────────────────────────────────┐
│ Step 3: Claude Code agents implement changes                              │
│                                                                           │
│   Files modified:                                                         │
│   • src/auth/jwt.ts (new)                                                 │
│   • src/auth/middleware.ts (updated)                                      │
│   • src/auth/session.ts (deprecated)                                      │
│   • tests/auth/jwt.test.ts (new)                                          │
└───────────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌───────────────────────────────────────────────────────────────────────────┐
│ Step 4: Gemini verifies implementation                                    │
│                                                                           │
│   npx claude-flow gemini verify \                                         │
│     --feature "JWT authentication with token refresh" \                   │
│     --path ./src/auth                                                     │
└───────────────────────────────────────────────────────────────────────────┘
```

#### Alternative: Step-by-Step Manual Control

```bash
# Step 1: Analyze first
npx claude-flow gemini analyze \
  --type architecture \
  --path ./src/auth \
  --store-memory

# Step 2: Spawn refactoring swarm
npx claude-flow swarm spawn \
  --topology hierarchical \
  --task "Refactor auth to JWT based on analysis in memory"

# Step 3: Verify changes
npx claude-flow gemini verify \
  --feature "JWT authentication" \
  --path ./src/auth
```

---

### 2. Creating a New Project

**Scenario**: You want to create a new React + Node.js full-stack application.

#### Command

```bash
npx claude-flow task "Create a new full-stack e-commerce application with React frontend, Node.js backend, and PostgreSQL database"
```

#### What Happens

```
┌───────────────────────────────────────────────────────────────────────────┐
│ Phase 1: Architecture Planning (Gemini + Claude)                          │
│                                                                           │
│   Queen Agent designs:                                                    │
│   • Project structure                                                     │
│   • Tech stack decisions                                                  │
│   • Database schema                                                       │
│   • API contract                                                          │
└───────────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌───────────────────────────────────────────────────────────────────────────┐
│ Phase 2: Parallel Implementation (Claude Code Agents)                     │
│                                                                           │
│   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│   │  Backend    │  │  Frontend   │  │  Database   │  │   DevOps    │     │
│   │  Developer  │  │  Developer  │  │  Architect  │  │  Engineer   │     │
│   │             │  │             │  │             │  │             │     │
│   │ • Express   │  │ • React     │  │ • Schema    │  │ • Docker    │     │
│   │ • REST API  │  │ • Redux     │  │ • Migrations│  │ • CI/CD     │     │
│   │ • Auth      │  │ • UI/UX     │  │ • Seeds     │  │ • Deploy    │     │
│   └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘     │
└───────────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌───────────────────────────────────────────────────────────────────────────┐
│ Phase 3: Integration & Testing                                            │
│                                                                           │
│   • Tester Agent: Write unit and integration tests                        │
│   • Reviewer Agent: Code review and security check                        │
│   • Gemini: Full project architecture validation                          │
└───────────────────────────────────────────────────────────────────────────┘
```

#### Simpler Alternative: Template-Based

```bash
# Use a template with Gemini-enhanced setup
npx claude-flow project create \
  --template fullstack-react-node \
  --name my-ecommerce \
  --with-gemini-analysis
```

---

### 3. Finding and Fixing Bugs

**Scenario**: Your application has a bug - users report slow checkout performance.

#### Command

```bash
npx claude-flow task "Find and fix the performance issue in the checkout flow - users report it's slow"
```

#### What Happens

```
┌───────────────────────────────────────────────────────────────────────────┐
│ Step 1: Gemini scans entire codebase for checkout flow                    │
│                                                                           │
│   npx claude-flow gemini analyze \                                        │
│     --type codebase \                                                     │
│     --query "Map the complete checkout flow, identify N+1 queries,        │
│              synchronous operations, and performance bottlenecks"         │
└───────────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌───────────────────────────────────────────────────────────────────────────┐
│ Step 2: Gemini identifies issues                                          │
│                                                                           │
│   Findings:                                                               │
│   ┌─────────────────────────────────────────────────────────────────────┐ │
│   │ 1. N+1 query in CartService.getItems() - src/services/cart.ts:45    │ │
│   │ 2. Synchronous payment validation - src/checkout/payment.ts:112     │ │
│   │ 3. Missing database index on orders.user_id                         │ │
│   │ 4. Unoptimized image loading in cart summary                        │ │
│   └─────────────────────────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌───────────────────────────────────────────────────────────────────────────┐
│ Step 3: Claude Code agents fix each issue                                 │
│                                                                           │
│   Agent 1: Fix N+1 query with eager loading                               │
│   Agent 2: Make payment validation async                                  │
│   Agent 3: Add database migration for index                               │
│   Agent 4: Implement lazy loading for images                              │
└───────────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌───────────────────────────────────────────────────────────────────────────┐
│ Step 4: Verification                                                      │
│                                                                           │
│   • Run existing tests                                                    │
│   • Gemini re-analyzes for remaining issues                               │
│   • Performance benchmarks                                                │
└───────────────────────────────────────────────────────────────────────────┘
```

#### Direct Bug Hunt Command

```bash
# Security-focused bug hunt
npx claude-flow gemini analyze \
  --type security \
  --path ./src \
  --output json \
  | npx claude-flow fix --from-analysis

# Performance-focused
npx claude-flow gemini analyze \
  --type codebase \
  --query "Find performance issues, N+1 queries, memory leaks" \
  --path ./src \
  | npx claude-flow fix --from-analysis
```

---

### 4. Creating Documentation

**Scenario**: You need to document an existing authentication flow.

#### Command

```bash
npx claude-flow task "Create comprehensive documentation for the authentication system including API docs, flow diagrams, and developer guide"
```

#### What Happens

```
┌───────────────────────────────────────────────────────────────────────────┐
│ Step 1: Gemini analyzes the auth system comprehensively                   │
│                                                                           │
│   npx claude-flow gemini analyze \                                        │
│     --type architecture \                                                 │
│     --path ./src/auth ./src/middleware ./src/routes/auth \                │
│     --query "Map complete authentication flow including:                  │
│              - Login/logout process                                       │
│              - Token generation and validation                            │
│              - Session management                                         │
│              - OAuth integrations                                         │
│              - Password reset flow                                        │
│              - Rate limiting and security measures"                       │
└───────────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌───────────────────────────────────────────────────────────────────────────┐
│ Step 2: Claude Code generates documentation                               │
│                                                                           │
│   Generated files:                                                        │
│   ├── docs/auth/                                                          │
│   │   ├── README.md           (Overview)                                  │
│   │   ├── API.md              (API Reference)                             │
│   │   ├── FLOW.md             (Auth Flow Diagrams)                        │
│   │   ├── DEVELOPER_GUIDE.md  (Integration Guide)                         │
│   │   ├── SECURITY.md         (Security Considerations)                   │
│   │   └── diagrams/                                                       │
│   │       ├── login-flow.mermaid                                          │
│   │       ├── token-lifecycle.mermaid                                     │
│   │       └── oauth-flow.mermaid                                          │
└───────────────────────────────────────────────────────────────────────────┘
```

#### Quick Documentation Commands

```bash
# Document a specific module
npx claude-flow task "Document the payment processing module"

# Generate API documentation
npx claude-flow task "Create OpenAPI/Swagger docs for all REST endpoints"

# Create architecture diagrams
npx claude-flow task "Create Mermaid diagrams for the data flow in the order system"
```

---

### 5. Security Audit

**Scenario**: You need a comprehensive security review before deployment.

#### Command

```bash
npx claude-flow task "Perform a complete security audit and fix critical vulnerabilities"
```

#### What Happens

```
┌───────────────────────────────────────────────────────────────────────────┐
│ Step 1: Gemini Security Scan                                              │
│                                                                           │
│   npx claude-flow gemini analyze \                                        │
│     --type security \                                                     │
│     --path ./src \                                                        │
│     --output json                                                         │
│                                                                           │
│   Scans for:                                                              │
│   • SQL/NoSQL injection                                                   │
│   • XSS vulnerabilities                                                   │
│   • Hardcoded secrets                                                     │
│   • Insecure dependencies                                                 │
│   • Authentication flaws                                                  │
│   • Authorization bypass                                                  │
│   • CSRF vulnerabilities                                                  │
│   • Insecure configurations                                               │
└───────────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌───────────────────────────────────────────────────────────────────────────┐
│ Step 2: Prioritized Vulnerabilities                                       │
│                                                                           │
│   ┌─────────────────────────────────────────────────────────────────────┐ │
│   │ CRITICAL (2)                                                        │ │
│   │   • SQL injection in search endpoint - src/api/search.ts:34        │ │
│   │   • Hardcoded API key - src/services/payment.ts:12                 │ │
│   ├─────────────────────────────────────────────────────────────────────┤ │
│   │ HIGH (5)                                                            │ │
│   │   • Missing rate limiting on login - src/auth/login.ts             │ │
│   │   • XSS in user comments - src/components/Comments.tsx             │ │
│   │   • Weak password policy - src/auth/validation.ts                  │ │
│   │   • ...                                                             │ │
│   └─────────────────────────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌───────────────────────────────────────────────────────────────────────────┐
│ Step 3: Claude Code Fixes Critical Issues                                 │
│                                                                           │
│   Security Agent actions:                                                 │
│   • Parameterize SQL queries                                              │
│   • Move secrets to environment variables                                 │
│   • Implement rate limiting middleware                                    │
│   • Add input sanitization                                                │
│   • Update password validation rules                                      │
└───────────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌───────────────────────────────────────────────────────────────────────────┐
│ Step 4: Verification Scan                                                 │
│                                                                           │
│   Gemini re-scans to confirm fixes                                        │
│   Generates security report                                               │
└───────────────────────────────────────────────────────────────────────────┘
```

---

### 6. Architecture Review

**Scenario**: You want to understand and improve a legacy codebase.

#### Command

```bash
npx claude-flow task "Analyze the architecture of this legacy codebase and suggest modernization improvements"
```

#### What Gemini Provides

```bash
npx claude-flow gemini analyze \
  --type architecture \
  --path ./ \
  --output markdown

# Output includes:
# ┌─────────────────────────────────────────────────────────────────────────┐
# │ Architecture Analysis Report                                           │
# ├─────────────────────────────────────────────────────────────────────────┤
# │                                                                         │
# │ Component Diagram:                                                      │
# │   [Mermaid diagram of all modules and their relationships]              │
# │                                                                         │
# │ Dependency Graph:                                                       │
# │   [Visual representation of dependencies]                               │
# │                                                                         │
# │ Layer Analysis:                                                         │
# │   • Presentation Layer: 45 components                                   │
# │   • Business Logic: 23 services                                         │
# │   • Data Access: 12 repositories                                        │
# │                                                                         │
# │ Issues Detected:                                                        │
# │   • Circular dependency: UserService ↔ OrderService                     │
# │   • God class: ApplicationController (2,500 lines)                      │
# │   • Missing abstraction: Direct DB calls in controllers                 │
# │                                                                         │
# │ Recommendations:                                                        │
# │   1. Extract UserOrderService to break circular dependency              │
# │   2. Split ApplicationController into domain-specific controllers       │
# │   3. Implement repository pattern for data access                       │
# │                                                                         │
# └─────────────────────────────────────────────────────────────────────────┘
```

---

## Natural Language Prompts

You can give Claude Flow natural language prompts. Here are examples:

### Refactoring

```bash
npx claude-flow task "Refactor the user service to use the repository pattern"
npx claude-flow task "Split the monolithic API into microservices"
npx claude-flow task "Convert all callbacks to async/await"
npx claude-flow task "Extract common validation logic into a shared module"
```

### Bug Fixing

```bash
npx claude-flow task "Find and fix memory leaks in the application"
npx claude-flow task "Debug why the login fails intermittently"
npx claude-flow task "Fix all TypeScript strict mode errors"
npx claude-flow task "Resolve the race condition in the order processing"
```

### New Features

```bash
npx claude-flow task "Add two-factor authentication to the login system"
npx claude-flow task "Implement a caching layer for API responses"
npx claude-flow task "Add real-time notifications using WebSockets"
npx claude-flow task "Create an admin dashboard for user management"
```

### Documentation

```bash
npx claude-flow task "Document all public APIs with JSDoc comments"
npx claude-flow task "Create a README for each module explaining its purpose"
npx claude-flow task "Generate a system architecture document with diagrams"
npx claude-flow task "Write a developer onboarding guide for this project"
```

### Testing

```bash
npx claude-flow task "Add unit tests to achieve 80% coverage"
npx claude-flow task "Write integration tests for the checkout flow"
npx claude-flow task "Create end-to-end tests for critical user journeys"
npx claude-flow task "Add performance benchmarks for database queries"
```

### Security

```bash
npx claude-flow task "Audit the codebase for security vulnerabilities"
npx claude-flow task "Implement OWASP security best practices"
npx claude-flow task "Add input validation to all API endpoints"
npx claude-flow task "Set up security headers and CORS properly"
```

---

## Best Practices

### 1. Start with Analysis

Always let Gemini analyze first for large codebases:

```bash
# Good: Analyze then act
npx claude-flow gemini analyze --path ./src --store-memory
npx claude-flow task "Refactor based on the analysis"

# Less optimal: Direct action on large codebase
npx claude-flow task "Refactor the entire src folder"
```

### 2. Use Specific Paths

Be specific about what to analyze/modify:

```bash
# Good: Specific path
npx claude-flow task "Refactor the authentication module" --path ./src/auth

# Less optimal: Entire project
npx claude-flow task "Refactor authentication"
```

### 3. Break Down Large Tasks

```bash
# Good: Phased approach
npx claude-flow task "Phase 1: Analyze current authentication architecture"
npx claude-flow task "Phase 2: Design new JWT-based auth system"
npx claude-flow task "Phase 3: Implement JWT authentication"
npx claude-flow task "Phase 4: Migrate existing sessions to JWT"
npx claude-flow task "Phase 5: Remove legacy session code"

# Less optimal: One giant task
npx claude-flow task "Completely rewrite authentication from scratch"
```

### 4. Verify After Changes

```bash
# Always verify
npx claude-flow gemini verify \
  --feature "JWT authentication with refresh tokens" \
  --path ./src/auth
```

### 5. Use Caching for Repeated Analysis

```bash
# Enable caching for faster repeated queries
npx claude-flow config set gemini.cache.enabled true
npx claude-flow config set gemini.cache.ttl 3600000  # 1 hour
```

---

## Quick Reference

| Task | Command |
|------|---------|
| Initialize hive mind | `npx claude-flow hive-mind init --with-gemini` |
| Analyze codebase | `npx claude-flow gemini analyze --path ./src` |
| Security scan | `npx claude-flow gemini analyze --type security` |
| Architecture map | `npx claude-flow gemini analyze --type architecture` |
| Run task | `npx claude-flow task "your prompt here"` |
| Check status | `npx claude-flow gemini status` |
| Verify feature | `npx claude-flow gemini verify --feature "description"` |
| Clear cache | `npx claude-flow gemini cache clear` |

---

## Next Steps

1. Read [AGENT-INTEGRATION.md](./AGENT-INTEGRATION.md) for advanced agent patterns
2. Read [MCP-TOOLS.md](./MCP-TOOLS.md) for MCP tool integration
3. Read [CLI-COMMANDS.md](./CLI-COMMANDS.md) for all available commands
4. Read [CONFIG-SCHEMA.md](./CONFIG-SCHEMA.md) for configuration options

---

*Happy orchestrating!* 🚀
