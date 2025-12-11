# Gemini CLI Module

> Google Gemini 2.5 Pro integration for Claude Flow - 1M+ token codebase analysis

## Quick Start

```bash
# Enable module (authenticates with Google)
claude-flow gemini enable

# Check status
claude-flow gemini status

# Analyze codebase
claude-flow gemini analyze --path ./src --depth quick
```

## Commands

| Command | Description |
|---------|-------------|
| `gemini enable` | Enable and authenticate |
| `gemini disable` | Temporarily disable |
| `gemini status` | Show status and quota |
| `gemini analyze` | Run codebase analysis |
| `gemini security` | Security vulnerability scan |
| `gemini architecture` | Map system architecture |
| `gemini verify --feature "..."` | Verify feature implementation |
| `gemini cache --stats` | Show cache statistics |
| `gemini eject` | Remove module |

## Analysis Types

- `codebase` - General analysis (default)
- `security` - OWASP vulnerabilities
- `architecture` - Component mapping
- `dependencies` - Package analysis
- `performance` - Bottleneck detection

## Depth Options

- `quick` - Fast high-level overview
- `moderate` - Balanced analysis (default)
- `deep` - Exhaustive detailed analysis

## Authentication Methods

```bash
# Google OAuth (default)
claude-flow gemini enable

# API Key
claude-flow gemini enable --auth api-key --api-key YOUR_KEY

# Vertex AI
claude-flow gemini enable --auth vertex-ai --vertex-project PROJECT_ID
```

## Local Installation

```bash
# From the claude-flow directory
npm link

# Or pack and install
npm pack
npm install -g claude-flow-*.tgz
```

## Documentation

See [docs/guides/gemini-cli-integration.md](../../../docs/guides/gemini-cli-integration.md) for full documentation.
