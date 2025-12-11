# Gemini CLI Integration Guide

> This documentation has been moved to the Gemini CLI module.

## Documentation Location

The complete Gemini CLI documentation is located in the module directory:

📁 **[src/modules/gemini-cli/docs/](../../src/modules/gemini-cli/docs/)**

## Quick Links

| Document | Description |
|----------|-------------|
| [README.md](../../src/modules/gemini-cli/docs/README.md) | Module overview and quick start |
| [INTEGRATION-GUIDE.md](../../src/modules/gemini-cli/docs/INTEGRATION-GUIDE.md) | Complete integration guide |
| [CLI-COMMANDS.md](../../src/modules/gemini-cli/docs/CLI-COMMANDS.md) | All available CLI commands |
| [AUTHENTICATOR.md](../../src/modules/gemini-cli/docs/AUTHENTICATOR.md) | Authentication methods |
| [MCP-TOOLS.md](../../src/modules/gemini-cli/docs/MCP-TOOLS.md) | MCP tool definitions |

## Quick Start

```bash
# Enable Gemini CLI module
claude-flow gemini enable

# Check status
claude-flow gemini status

# Run codebase analysis
claude-flow gemini analyze --path ./src

# Security scan
claude-flow gemini security --path ./src
```

For detailed documentation, see the [module docs](../../src/modules/gemini-cli/docs/README.md).
