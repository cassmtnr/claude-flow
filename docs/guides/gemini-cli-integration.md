# Gemini CLI Integration Guide

> Large-scale codebase analysis with 1M+ token context using Google's Gemini 2.5 Pro

## Overview

The Gemini CLI module integrates Google's Gemini 2.5 Pro model into Claude Flow, enabling analysis of entire codebases with its massive 1M+ token context window. This is particularly useful for:

- **Full codebase analysis** - Understand architecture, patterns, and structure
- **Security scanning** - Identify vulnerabilities across the entire project
- **Architecture mapping** - Visualize component relationships
- **Feature verification** - Check if features are implemented

## Installation

### Prerequisites

- Node.js 18+
- npm or pnpm
- Google account for authentication

### Installing from Local Build

If you're working with a local fork of claude-flow:

```bash
# Option 1: npm link (recommended for development)
cd /path/to/claude-flow
npm link

# Option 2: Install globally from local path
npm install -g /path/to/claude-flow

# Option 3: Pack and install
cd /path/to/claude-flow
npm pack
npm install -g claude-flow-2.7.34-gemini.tgz
```

### Verify Installation

```bash
claude-flow --version
# Should show: v2.7.34-gemini

which claude-flow
# Shows the path to your installation
```

## Quick Start

### 1. Enable the Gemini Module

```bash
claude-flow gemini enable
```

This will:
- Install `@google/gemini-cli` globally if not present
- Open your browser for Google OAuth authentication
- Save credentials to `~/.gemini/oauth_creds.json`
- Enable the module in Claude Flow config

### 2. Check Status

```bash
claude-flow gemini status
```

Output:
```
🤖 Gemini CLI Module Status

  Installed:      ✅ Yes
  Version:        0.19.4
  Enabled:        ✅ Yes
  Authenticated:  ✅ Yes
  Auth Method:    google-login

📊 Quota Status

  Requests/min:   0/60 (resets 11:40:47 PM)
  Requests/day:   0/1000 (resets 12/11/2025)
```

### 3. Run Your First Analysis

```bash
# Analyze a specific directory (recommended)
claude-flow gemini analyze --path ./src --depth quick

# Full codebase analysis (may take longer)
claude-flow gemini analyze --depth moderate
```

## Commands Reference

### `gemini enable`

Enable and authenticate the Gemini CLI module.

```bash
# Default: Google OAuth login
claude-flow gemini enable

# Use API key instead
claude-flow gemini enable --auth api-key --api-key YOUR_API_KEY

# Use Vertex AI
claude-flow gemini enable --auth vertex-ai --vertex-project PROJECT_ID

# Skip installation check
claude-flow gemini enable --skip-install
```

### `gemini status`

Show module status, authentication state, and quota usage.

```bash
claude-flow gemini status
```

### `gemini analyze`

Run comprehensive codebase analysis.

```bash
# Basic usage
claude-flow gemini analyze

# Specific path (recommended for large codebases)
claude-flow gemini analyze --path ./src/cli

# Different analysis types
claude-flow gemini analyze --type security
claude-flow gemini analyze --type architecture
claude-flow gemini analyze --type dependencies
claude-flow gemini analyze --type performance

# Depth control
claude-flow gemini analyze --depth quick      # Fast overview
claude-flow gemini analyze --depth moderate   # Balanced (default)
claude-flow gemini analyze --depth deep       # Exhaustive

# Custom query
claude-flow gemini analyze --query "Find all API endpoints and their authentication"
```

**Options:**
| Option | Short | Description | Default |
|--------|-------|-------------|---------|
| `--type` | `-t` | Analysis type: codebase, security, architecture, dependencies, performance | codebase |
| `--path` | `-p` | Target path(s) to analyze | . |
| `--depth` | `-d` | Analysis depth: quick, moderate, deep | moderate |
| `--query` | `-q` | Custom analysis query | - |
| `--output` | `-o` | Output format: json, markdown, text | markdown |

### `gemini security`

Run security vulnerability scan.

```bash
claude-flow gemini security --path ./src
claude-flow gemini security --depth deep
```

### `gemini architecture`

Map system architecture and component relationships.

```bash
claude-flow gemini architecture --path ./src
```

### `gemini verify`

Verify if a specific feature is implemented.

```bash
claude-flow gemini verify --feature "user authentication"
claude-flow gemini verify --feature "rate limiting" --path ./src/api
```

### `gemini cache`

Manage analysis cache.

```bash
# Show cache statistics
claude-flow gemini cache --stats

# Clear all cached results
claude-flow gemini cache --clear
```

### `gemini disable`

Temporarily disable the module.

```bash
claude-flow gemini disable
```

### `gemini eject`

Completely remove the module.

```bash
claude-flow gemini eject --force
claude-flow gemini eject --force --uninstall  # Also uninstall gemini CLI
claude-flow gemini eject --force --keep-config  # Keep config for later
```

## Best Practices

### 1. Target Specific Directories

For large codebases, always specify a target path:

```bash
# Good - focused analysis
claude-flow gemini analyze --path ./src/api --depth moderate

# Less ideal - entire codebase may timeout
claude-flow gemini analyze --depth deep
```

### 2. Use Quick Depth for Initial Exploration

```bash
# Start with quick to get overview
claude-flow gemini analyze --path ./src --depth quick

# Then drill down with moderate/deep
claude-flow gemini analyze --path ./src/specific-module --depth deep
```

### 3. Combine with Hive Mind

Use Gemini for initial analysis, then spawn agents:

```bash
# 1. Get codebase overview
claude-flow gemini analyze --type architecture --depth moderate

# 2. Start orchestration
claude-flow start

# 3. Spawn agents with context
claude-flow swarm init --topology hive-mind
```

### 4. Security Scans on Critical Paths

```bash
claude-flow gemini security --path ./src/auth --depth deep
claude-flow gemini security --path ./src/api --depth deep
```

## Authentication Methods

### Google OAuth (Default)

```bash
claude-flow gemini enable --auth google-login
```

- Opens browser for authentication
- Stores credentials in `~/.gemini/oauth_creds.json`
- Best for personal use

### API Key

```bash
claude-flow gemini enable --auth api-key --api-key YOUR_KEY
```

- Get key from [Google AI Studio](https://aistudio.google.com/)
- Best for automation/CI

### Vertex AI

```bash
claude-flow gemini enable --auth vertex-ai \
  --vertex-project YOUR_PROJECT \
  --vertex-location us-central1
```

- Requires GCP project with Vertex AI enabled
- Best for enterprise/production use

## Troubleshooting

### "Module not enabled" Error

```bash
claude-flow gemini enable
```

### "Not authenticated" Error

```bash
# Re-authenticate
claude-flow gemini enable --force
```

### Analysis Timeout

- Use `--path` to target specific directories
- Use `--depth quick` for faster results
- Large codebases (100k+ files) may need multiple targeted analyses

### Rate Limiting

The module includes built-in rate limiting:
- 60 requests per minute
- 1000 requests per day

Check quota with:
```bash
claude-flow gemini status
```

## Configuration

Configuration is stored in `~/.claude-flow/modules/gemini-cli.json`:

```json
{
  "enabled": true,
  "authMethod": "google-login",
  "defaultModel": "gemini-2.5-pro",
  "contextLimit": 1000000,
  "requestsPerMinute": 60,
  "requestsPerDay": 1000,
  "analysis": {
    "defaultType": "codebase",
    "outputFormat": "markdown",
    "timeout": 300000
  },
  "cache": {
    "enabled": true,
    "ttl": 3600000,
    "maxSize": 100
  }
}
```

## Example Workflows

### Full Project Analysis

```bash
# 1. Enable module
claude-flow gemini enable

# 2. Architecture overview
claude-flow gemini architecture --depth moderate

# 3. Security scan
claude-flow gemini security --depth deep

# 4. Feature verification
claude-flow gemini verify --feature "authentication"
claude-flow gemini verify --feature "rate limiting"
```

### Pre-Development Analysis

```bash
# Before starting work on a new feature
claude-flow gemini analyze \
  --path ./src \
  --query "Show me the current authentication flow and where I should add OAuth2"
```

### CI/CD Integration

```bash
# In your CI pipeline
claude-flow gemini enable --auth api-key --api-key $GEMINI_API_KEY
claude-flow gemini security --path ./src --depth deep
```

## Uninstalling

### Remove from Claude Flow

```bash
claude-flow gemini eject --force
```

### Remove npm link

```bash
npm unlink -g claude-flow
```

### Complete Cleanup

```bash
claude-flow gemini eject --force --uninstall
npm uninstall -g claude-flow
rm -rf ~/.claude-flow/modules/gemini-cli.json
```

## Version History

- **v2.7.34-gemini** - Initial Gemini CLI integration
  - Google OAuth, API key, and Vertex AI authentication
  - Codebase, security, architecture, dependencies, performance analysis
  - Feature verification
  - In-memory caching with rate limiting
