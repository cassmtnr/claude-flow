# Gemini CLI Module - Migration & Ejection Guide

> Complete guide for enabling, disabling, updating, migrating, and ejecting the Gemini CLI module while maintaining compatibility with upstream claude-flow.

## Table of Contents

1. [Overview](#overview)
2. [Module Lifecycle](#module-lifecycle)
3. [Enabling the Module](#enabling-the-module)
4. [Disabling the Module](#disabling-the-module)
5. [Updating the Module](#updating-the-module)
6. [Ejecting the Module](#ejecting-the-module)
7. [Merging Upstream Changes](#merging-upstream-changes)
8. [Data Migration](#data-migration)
9. [Rollback Procedures](#rollback-procedures)
10. [Troubleshooting](#troubleshooting)

---

## Overview

### Design Principles

The Gemini CLI module is designed as a **fully ejectable, opt-in module** that:

1. **No Core Modifications** - Does not modify claude-flow core files
2. **Isolated Storage** - All data in separate directories
3. **Clean Removal** - Can be completely removed without side effects
4. **Upstream Compatible** - Allows merging new claude-flow versions

### Module Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Claude Flow Core                             │
│  (Unmodified - can be updated independently)                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    Module Registry                           │   │
│  │  (Manages optional modules)                                  │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                              │                                      │
│                              ▼                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                  Gemini CLI Module                           │   │
│  │  (Completely isolated and ejectable)                         │   │
│  │                                                               │   │
│  │  src/modules/gemini-cli/                                     │   │
│  │  ├── index.ts           (entry point)                        │   │
│  │  ├── manager.ts         (lifecycle)                          │   │
│  │  ├── installer.ts       (CLI installation)                   │   │
│  │  ├── authenticator.ts   (auth methods)                       │   │
│  │  ├── executor.ts        (analysis tools)                     │   │
│  │  └── ...                                                     │   │
│  │                                                               │   │
│  │  Data Storage:                                               │   │
│  │  ~/.claude-flow/modules/gemini-cli/                          │   │
│  │  .claude-flow/cache/gemini/                                  │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### File Locations

| Category | Location | Purpose |
|----------|----------|---------|
| **Source Code** | `src/modules/gemini-cli/` | Module implementation |
| **User Config** | `~/.claude-flow/modules/gemini-cli.json` | User-wide settings |
| **Project Config** | `.claude-flow/gemini.json` | Project-specific settings |
| **Credentials** | `~/.claude-flow/modules/gemini-cli/credentials/` | Secure credential storage |
| **Cache** | `.claude-flow/cache/gemini/` | Analysis cache (project) |
| **Backups** | `~/.claude-flow/backups/gemini-cli/` | Configuration backups |

---

## Module Lifecycle

### State Machine

```
┌─────────────┐     enable      ┌─────────────┐
│  Not        │ ───────────────▶│  Enabled    │
│  Installed  │                 │  (No Auth)  │
└─────────────┘                 └──────┬──────┘
       ▲                               │
       │                          auth │
       │ eject                         ▼
       │                        ┌─────────────┐
       │                        │  Enabled    │
       │                        │  (Auth'd)   │
       └────────────────────────┴──────┬──────┘
                                       │
                                  disable
                                       ▼
                                ┌─────────────┐
                                │  Disabled   │
                                │  (Config    │
                                │  Preserved) │
                                └─────────────┘
```

### State Definitions

| State | Description |
|-------|-------------|
| **Not Installed** | Module source files not present |
| **Enabled (No Auth)** | Module enabled but not authenticated |
| **Enabled (Auth'd)** | Fully operational state |
| **Disabled** | Module disabled, config preserved |

---

## Enabling the Module

### Quick Start

```bash
# Enable with auto-install and authentication
npx claude-flow gemini enable
npx claude-flow gemini auth login
```

### Detailed Enable Process

#### Step 1: Check Prerequisites

```bash
# Verify claude-flow version
npx claude-flow --version
# Required: v2.7.30 or higher

# Check for existing module
npx claude-flow gemini status
```

#### Step 2: Enable Module

```bash
# Basic enable
npx claude-flow gemini enable

# Enable with specific CLI version
npx claude-flow gemini enable --version 0.1.34

# Enable without auto-install (manual CLI installation)
npx claude-flow gemini enable --auto-install false

# Enable with verbose output
npx claude-flow gemini enable --verbose
```

#### Step 3: Authenticate

```bash
# Interactive login (recommended)
npx claude-flow gemini auth login

# API key authentication
export GEMINI_API_KEY=your-api-key
npx claude-flow gemini auth api-key

# Service account (enterprise)
npx claude-flow gemini auth service-account \
  --service-account ./credentials.json \
  --project your-project
```

#### Step 4: Verify Installation

```bash
# Check status
npx claude-flow gemini status --verbose

# Test with analysis
npx claude-flow gemini analyze --depth surface
```

### Enable Hooks

The module can register hooks during enable:

```json
// ~/.claude-flow/modules/gemini-cli.json

{
  "enabled": true,
  "hooks": {
    "onEnable": [
      "validate-cli-version",
      "register-mcp-tools"
    ],
    "onAuthenticate": [
      "validate-credentials",
      "setup-cache"
    ]
  }
}
```

---

## Disabling the Module

### Quick Disable

```bash
# Disable (preserves configuration)
npx claude-flow gemini disable

# Disable with confirmation skip
npx claude-flow gemini disable --force
```

### What Disable Does

1. **Unregisters MCP Tools** - Removes tools from MCP server
2. **Stops Background Jobs** - Cancels any pending analysis
3. **Preserves Configuration** - Keeps config for re-enable
4. **Optionally Clears Cache** - Based on `--keep-cache` flag

### Disable Options

```bash
# Disable but keep cache
npx claude-flow gemini disable --keep-cache

# Disable and clear cache
npx claude-flow gemini disable --keep-cache false

# Force disable without confirmation
npx claude-flow gemini disable --force
```

### Re-enabling After Disable

```bash
# Re-enable (uses preserved config)
npx claude-flow gemini enable

# Note: Authentication is preserved
# No need to re-authenticate unless tokens expired
```

---

## Updating the Module

### Update Gemini CLI

```bash
# Check for updates
npx claude-flow gemini update --check

# Update to latest
npx claude-flow gemini update

# Update to specific version
npx claude-flow gemini update --version 0.1.35
```

### Update Module Configuration

```bash
# View current config
npx claude-flow gemini config --list

# Update config value
npx claude-flow gemini config api.model gemini-2.0-pro

# Reset to defaults
npx claude-flow gemini config --reset

# Edit in editor
npx claude-flow gemini config --edit
```

### Version Compatibility Matrix

| claude-flow | Module | Gemini CLI | Status |
|-------------|--------|------------|--------|
| ≥2.7.30 | 1.0.x | ≥0.1.30 | Supported |
| ≥2.8.0 | 1.1.x | ≥0.1.34 | Recommended |
| ≥3.0.0 | 2.0.x | ≥0.2.0 | Future |

---

## Ejecting the Module

### What Ejection Does

Complete removal of the Gemini CLI module:

1. **Removes Source Files** - Deletes `src/modules/gemini-cli/`
2. **Removes Configuration** - Deletes all config files
3. **Clears Credentials** - Securely removes stored credentials
4. **Clears Cache** - Removes all cached data
5. **Unregisters Hooks** - Removes any registered hooks
6. **Creates Backup** - Backs up config before removal

### Ejection Command

```bash
# Eject with backup and confirmation
npx claude-flow gemini eject

# Force eject without confirmation
npx claude-flow gemini eject --force

# Eject but keep Gemini CLI installed
npx claude-flow gemini eject --keep-cli

# Eject without backup
npx claude-flow gemini eject --backup false
```

### Ejection Output

```
Gemini CLI Module Ejection
==========================

This will PERMANENTLY REMOVE:
  ✗ Source files:      src/modules/gemini-cli/
  ✗ User config:       ~/.claude-flow/modules/gemini-cli.json
  ✗ Project config:    .claude-flow/gemini.json
  ✗ Credentials:       ~/.claude-flow/modules/gemini-cli/credentials/
  ✗ Cache:             .claude-flow/cache/gemini/
  ✗ MCP tools:         5 registered tools

Total size: 156 MB

Continue? [y/N]: y

Creating backup...
  ✓ Backup saved: ~/.claude-flow/backups/gemini-cli-2025-12-06-103045.tar.gz

Removing module...
  ✓ MCP tools unregistered (5 tools)
  ✓ Hooks removed
  ✓ Cache cleared (128 MB)
  ✓ Credentials cleared (secure wipe)
  ✓ Configuration removed
  ✓ Source files removed

Gemini CLI module ejected successfully.

To reinstall:
  1. Add module files back to src/modules/gemini-cli/
  2. Run: npx claude-flow gemini enable

To restore from backup:
  tar -xzf ~/.claude-flow/backups/gemini-cli-2025-12-06-103045.tar.gz -C ~
```

### Backup Contents

```
gemini-cli-backup.tar.gz/
├── config/
│   ├── gemini-cli.json          (user config)
│   └── project-gemini.json       (project config)
├── credentials/
│   └── credentials.enc           (encrypted credentials)
├── metadata.json                  (backup metadata)
└── manifest.txt                   (file list)
```

### Restoring from Backup

```bash
# List available backups
ls ~/.claude-flow/backups/gemini-cli-*.tar.gz

# Extract backup
tar -xzf ~/.claude-flow/backups/gemini-cli-2025-12-06.tar.gz -C /tmp/restore/

# View backup contents
cat /tmp/restore/metadata.json

# Restore configuration only
cp /tmp/restore/config/gemini-cli.json ~/.claude-flow/modules/

# Restore credentials (requires decryption key)
npx claude-flow gemini restore-credentials /tmp/restore/credentials/

# Full restore after re-enabling
npx claude-flow gemini enable
npx claude-flow gemini restore /tmp/restore/
```

---

## Merging Upstream Changes

### Fork Workflow

This module is designed for a fork workflow where you can:
1. Fork the claude-flow repository
2. Add/modify the Gemini CLI module
3. Merge upstream changes without conflicts

### Setting Up Upstream

```bash
# Add upstream remote
git remote add upstream https://github.com/ruvnet/claude-flow.git

# Verify remotes
git remote -v
# origin    https://github.com/youruser/claude-flow.git (fetch)
# origin    https://github.com/youruser/claude-flow.git (push)
# upstream  https://github.com/ruvnet/claude-flow.git (fetch)
# upstream  https://github.com/ruvnet/claude-flow.git (push)
```

### Merging Upstream Updates

```bash
# Fetch upstream changes
git fetch upstream

# Check for changes
git log HEAD..upstream/main --oneline

# Merge upstream main
git checkout main
git merge upstream/main

# If conflicts occur in module files:
# - Module files (src/modules/gemini-cli/) - keep yours
# - Core files (src/core/, src/mcp/) - usually take upstream
# - Package.json - merge carefully
```

### Conflict Resolution Strategy

| File Pattern | Resolution |
|--------------|------------|
| `src/modules/gemini-cli/**` | Always keep your changes |
| `src/core/**` | Take upstream (no modifications expected) |
| `src/mcp/server-factory.ts` | Merge carefully (has module registration) |
| `package.json` | Manual merge (preserve module dependencies) |
| `docs/**` | Take upstream |

### Automated Merge Script

```bash
#!/bin/bash
# scripts/merge-upstream.sh

set -e

echo "Fetching upstream changes..."
git fetch upstream

echo "Checking for conflicts..."
CONFLICTS=$(git merge-tree $(git merge-base HEAD upstream/main) HEAD upstream/main | grep -c "^@@")

if [ "$CONFLICTS" -gt 0 ]; then
  echo "Potential conflicts detected in $CONFLICTS files"
  echo "Running manual merge..."

  git merge upstream/main --no-commit || true

  # Auto-resolve module files (keep ours)
  git checkout --ours src/modules/gemini-cli/
  git add src/modules/gemini-cli/

  echo "Review remaining conflicts and commit"
else
  echo "No conflicts, merging..."
  git merge upstream/main -m "Merge upstream main"
fi
```

### Keeping Module Isolated

To ensure clean merges:

1. **Never modify core files** - Only add to module registry
2. **Use extension points** - Hook into existing systems
3. **Separate dependencies** - Keep module deps separate

```json
// package.json - module dependencies section

{
  "dependencies": {
    // Core claude-flow dependencies...
  },
  "optionalDependencies": {
    // Gemini CLI module dependencies
    "@google-cloud/vertexai": "^1.0.0",
    "google-auth-library": "^9.0.0"
  }
}
```

---

## Data Migration

### Configuration Migration

#### v0.x to v1.0

```typescript
// Migration script

interface MigrationConfig {
  from: string;
  to: string;
  transformations: Array<{
    path: string;
    transform: (value: unknown) => unknown;
  }>;
  removals: string[];
  additions: Record<string, unknown>;
}

const v0ToV1Migration: MigrationConfig = {
  from: '0.x',
  to: '1.0',
  transformations: [
    {
      path: 'geminiModel',
      transform: (value) => ({ api: { model: value } }),
    },
    {
      path: 'cacheDir',
      transform: (value) => ({ cache: { directory: value } }),
    },
  ],
  removals: ['legacyMode', 'debugMode'],
  additions: {
    mcp: { enabled: true, progressiveDisclosure: { enabled: true } },
    fallback: { enabled: true },
  },
};
```

#### Running Migration

```bash
# Check if migration needed
npx claude-flow gemini migrate --check

# Run migration
npx claude-flow gemini migrate

# Migrate with backup
npx claude-flow gemini migrate --backup

# Dry run (show changes without applying)
npx claude-flow gemini migrate --dry-run
```

### Cache Migration

```bash
# Migrate cache format
npx claude-flow gemini cache migrate

# Clear and rebuild cache
npx claude-flow gemini cache rebuild
```

### Credential Migration

```bash
# Migrate credentials to new storage format
npx claude-flow gemini credentials migrate

# Export credentials (for backup)
npx claude-flow gemini credentials export --output ./creds-backup.enc

# Import credentials
npx claude-flow gemini credentials import --input ./creds-backup.enc
```

---

## Rollback Procedures

### Quick Rollback

```bash
# Disable module (preserves config)
npx claude-flow gemini disable

# Re-enable with previous config
npx claude-flow gemini enable
```

### Configuration Rollback

```bash
# List config backups
ls ~/.claude-flow/modules/gemini-cli/backups/

# Restore specific backup
npx claude-flow gemini config restore 2025-12-05-config.json

# Restore to defaults
npx claude-flow gemini config --reset
```

### Full Rollback from Backup

```bash
# List available backups
npx claude-flow gemini backups list

# Restore from backup
npx claude-flow gemini restore ~/.claude-flow/backups/gemini-cli-2025-12-01.tar.gz

# Verify restoration
npx claude-flow gemini status --verbose
```

### Git-Based Rollback

```bash
# Find last working commit
git log --oneline src/modules/gemini-cli/

# Rollback module files
git checkout <commit-hash> -- src/modules/gemini-cli/

# Rebuild
npm run build

# Re-enable
npx claude-flow gemini enable
```

---

## Troubleshooting

### Common Issues

#### Module Won't Enable

```bash
# Check prerequisites
npx claude-flow --version  # Need ≥2.7.30
node --version             # Need ≥18.0.0

# Check for conflicting modules
npx claude-flow modules list

# Enable with debug output
DEBUG=claude-flow:gemini npx claude-flow gemini enable
```

#### Authentication Fails

```bash
# Check network connectivity
curl -I https://accounts.google.com

# Verify API key
export GEMINI_API_KEY=your-key
npx claude-flow gemini auth api-key --debug

# Clear and re-authenticate
npx claude-flow gemini logout
npx claude-flow gemini auth login
```

#### Merge Conflicts

```bash
# View conflicting files
git diff --name-only --diff-filter=U

# If conflicts in module files, keep ours
git checkout --ours src/modules/gemini-cli/

# If conflicts in core files, review carefully
git mergetool src/mcp/server-factory.ts
```

#### Cache Corruption

```bash
# Clear cache
npx claude-flow gemini cache clear

# Verify cache directory
ls -la .claude-flow/cache/gemini/

# Remove and rebuild
rm -rf .claude-flow/cache/gemini/
npx claude-flow gemini analyze  # Rebuilds cache
```

### Debug Mode

```bash
# Enable debug logging
export DEBUG=claude-flow:gemini*

# Run command with debug
npx claude-flow gemini status

# View debug logs
tail -f ~/.claude-flow/logs/gemini-cli.log
```

### Getting Help

```bash
# Show help
npx claude-flow gemini --help
npx claude-flow gemini enable --help

# Check documentation
npx claude-flow gemini docs

# Report issue
npx claude-flow gemini report-issue
```

---

## Best Practices

### Before Enabling

1. **Backup existing config** - `npx claude-flow config export`
2. **Check version compatibility** - See compatibility matrix
3. **Review resource requirements** - Cache can grow large

### During Use

1. **Regular cache cleanup** - `npx claude-flow gemini cache clear --older-than 7d`
2. **Monitor API usage** - Check quota in status
3. **Keep CLI updated** - `npx claude-flow gemini update`

### Before Upgrading

1. **Create backup** - `npx claude-flow gemini backup`
2. **Check changelog** - Review breaking changes
3. **Test in development** - Before production upgrade

### Before Ejecting

1. **Export analysis results** - Save important analyses
2. **Backup configuration** - Auto-backup or manual
3. **Document custom settings** - For future reinstall

---

## Related Documentation

- [README.md](./README.md) - Main module documentation
- [CONFIG-SCHEMA.md](./CONFIG-SCHEMA.md) - Configuration options
- [CLI-COMMANDS.md](./CLI-COMMANDS.md) - Command reference
- [TESTING.md](./TESTING.md) - Testing procedures

---

*Last Updated: December 2025*
*Version: 1.0.0*
