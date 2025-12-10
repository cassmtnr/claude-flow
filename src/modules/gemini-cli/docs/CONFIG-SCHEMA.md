# Gemini CLI Module - Configuration Schema

> Complete JSON Schema documentation for all configuration options with validation rules and defaults.

## Table of Contents

1. [Overview](#overview)
2. [Configuration Files](#configuration-files)
3. [Full Schema Definition](#full-schema-definition)
4. [Configuration Sections](#configuration-sections)
   - [Module Settings](#module-settings)
   - [CLI Settings](#cli-settings)
   - [Authentication Settings](#authentication-settings)
   - [API Settings](#api-settings)
   - [Cache Settings](#cache-settings)
   - [Analysis Settings](#analysis-settings)
   - [Rate Limiting](#rate-limiting)
   - [MCP Integration](#mcp-integration)
   - [Fallback Settings](#fallback-settings)
5. [Environment Variable Mapping](#environment-variable-mapping)
6. [Validation Rules](#validation-rules)
7. [Migration Guide](#migration-guide)
8. [Examples](#examples)

---

## Overview

The Gemini CLI module uses a hierarchical configuration system with multiple sources:

```
Priority (highest to lowest):
1. Command-line flags
2. Environment variables
3. Project configuration (.claude-flow/gemini.json)
4. User configuration (~/.claude-flow/modules/gemini-cli.json)
5. Default values
```

### Configuration Resolution

```typescript
interface ConfigResolution {
  // Higher priority overrides lower
  readonly sources: [
    'cli_flags',
    'environment',
    'project_config',
    'user_config',
    'defaults'
  ];

  // Merge strategy
  readonly merge: 'deep'; // Deep merge objects, replace primitives
}
```

---

## Configuration Files

### User Configuration

Location: `~/.claude-flow/modules/gemini-cli.json`

Created automatically when module is enabled. Contains user-wide defaults.

### Project Configuration

Location: `.claude-flow/gemini.json` (in project root)

Optional. Contains project-specific overrides.

### Reading Configuration

```typescript
import { loadGeminiConfig } from 'claude-flow/modules/gemini-cli';

// Loads merged configuration from all sources
const config = await loadGeminiConfig({
  projectRoot: process.cwd(),
  includeEnv: true,
});
```

---

## Full Schema Definition

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://claude-flow.dev/schemas/gemini-cli-config.json",
  "title": "Gemini CLI Module Configuration",
  "description": "Configuration schema for the Gemini CLI integration module",
  "type": "object",
  "additionalProperties": false,

  "properties": {
    "enabled": {
      "type": "boolean",
      "default": false,
      "description": "Whether the Gemini CLI module is enabled"
    },

    "version": {
      "type": "string",
      "pattern": "^\\d+\\.\\d+\\.\\d+$",
      "description": "Configuration schema version"
    },

    "cli": {
      "$ref": "#/$defs/cliSettings"
    },

    "auth": {
      "$ref": "#/$defs/authSettings"
    },

    "api": {
      "$ref": "#/$defs/apiSettings"
    },

    "cache": {
      "$ref": "#/$defs/cacheSettings"
    },

    "analysis": {
      "$ref": "#/$defs/analysisSettings"
    },

    "rateLimit": {
      "$ref": "#/$defs/rateLimitSettings"
    },

    "mcp": {
      "$ref": "#/$defs/mcpSettings"
    },

    "fallback": {
      "$ref": "#/$defs/fallbackSettings"
    }
  },

  "$defs": {
    "cliSettings": {
      "type": "object",
      "description": "Gemini CLI installation settings",
      "additionalProperties": false,
      "properties": {
        "path": {
          "type": "string",
          "description": "Path to gemini CLI binary"
        },
        "version": {
          "type": "string",
          "pattern": "^\\d+\\.\\d+\\.\\d+(-[a-zA-Z0-9.]+)?$",
          "description": "Installed CLI version"
        },
        "minVersion": {
          "type": "string",
          "default": "0.1.30",
          "description": "Minimum required CLI version"
        },
        "autoUpdate": {
          "type": "boolean",
          "default": true,
          "description": "Automatically update CLI when new version available"
        },
        "updateCheckInterval": {
          "type": "integer",
          "minimum": 3600000,
          "default": 86400000,
          "description": "Interval between update checks in milliseconds"
        },
        "installMethod": {
          "type": "string",
          "enum": ["npm", "brew", "manual"],
          "description": "How CLI was installed"
        }
      }
    },

    "authSettings": {
      "type": "object",
      "description": "Authentication configuration",
      "additionalProperties": false,
      "properties": {
        "method": {
          "type": "string",
          "enum": ["google-login", "api-key", "service-account"],
          "default": "google-login",
          "description": "Authentication method"
        },
        "account": {
          "type": "string",
          "format": "email",
          "description": "Authenticated account email"
        },
        "project": {
          "type": "string",
          "pattern": "^[a-z][a-z0-9-]{4,28}[a-z0-9]$",
          "description": "GCP project ID"
        },
        "region": {
          "type": "string",
          "default": "us-central1",
          "description": "GCP region for Vertex AI"
        },
        "credentialsPath": {
          "type": "string",
          "description": "Path to service account credentials"
        },
        "tokenRefreshBuffer": {
          "type": "integer",
          "minimum": 60000,
          "default": 300000,
          "description": "Refresh tokens this many ms before expiry"
        },
        "sessionPersistence": {
          "type": "boolean",
          "default": true,
          "description": "Persist session across restarts"
        }
      }
    },

    "apiSettings": {
      "type": "object",
      "description": "Gemini API configuration",
      "additionalProperties": false,
      "properties": {
        "model": {
          "type": "string",
          "enum": [
            "gemini-1.5-pro",
            "gemini-1.5-flash",
            "gemini-1.5-pro-latest",
            "gemini-1.5-flash-latest",
            "gemini-2.0-pro",
            "gemini-2.0-flash"
          ],
          "default": "gemini-1.5-pro",
          "description": "Gemini model to use"
        },
        "maxTokens": {
          "type": "integer",
          "minimum": 1000,
          "maximum": 2000000,
          "default": 1000000,
          "description": "Maximum tokens per request"
        },
        "maxOutputTokens": {
          "type": "integer",
          "minimum": 100,
          "maximum": 8192,
          "default": 8192,
          "description": "Maximum output tokens"
        },
        "temperature": {
          "type": "number",
          "minimum": 0,
          "maximum": 2,
          "default": 0.1,
          "description": "Sampling temperature (lower = more deterministic)"
        },
        "topP": {
          "type": "number",
          "minimum": 0,
          "maximum": 1,
          "default": 0.95,
          "description": "Top-p (nucleus) sampling"
        },
        "topK": {
          "type": "integer",
          "minimum": 1,
          "maximum": 100,
          "default": 40,
          "description": "Top-k sampling"
        },
        "timeout": {
          "type": "integer",
          "minimum": 5000,
          "maximum": 600000,
          "default": 120000,
          "description": "Request timeout in milliseconds"
        },
        "retries": {
          "type": "integer",
          "minimum": 0,
          "maximum": 5,
          "default": 3,
          "description": "Number of retries on transient errors"
        },
        "retryDelay": {
          "type": "integer",
          "minimum": 100,
          "maximum": 60000,
          "default": 1000,
          "description": "Initial retry delay in milliseconds"
        },
        "safetySettings": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "category": {
                "type": "string",
                "enum": [
                  "HARM_CATEGORY_HARASSMENT",
                  "HARM_CATEGORY_HATE_SPEECH",
                  "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                  "HARM_CATEGORY_DANGEROUS_CONTENT"
                ]
              },
              "threshold": {
                "type": "string",
                "enum": [
                  "BLOCK_NONE",
                  "BLOCK_ONLY_HIGH",
                  "BLOCK_MEDIUM_AND_ABOVE",
                  "BLOCK_LOW_AND_ABOVE"
                ]
              }
            },
            "required": ["category", "threshold"]
          },
          "description": "Content safety settings"
        }
      }
    },

    "cacheSettings": {
      "type": "object",
      "description": "Analysis caching configuration",
      "additionalProperties": false,
      "properties": {
        "enabled": {
          "type": "boolean",
          "default": true,
          "description": "Enable caching"
        },
        "directory": {
          "type": "string",
          "default": "~/.claude-flow/cache/gemini",
          "description": "Cache directory path"
        },
        "memoryCache": {
          "type": "object",
          "properties": {
            "enabled": {
              "type": "boolean",
              "default": true
            },
            "maxSize": {
              "type": "integer",
              "minimum": 10485760,
              "default": 104857600,
              "description": "Max memory cache size in bytes"
            },
            "ttl": {
              "type": "integer",
              "minimum": 60000,
              "default": 300000,
              "description": "Memory cache TTL in milliseconds"
            }
          }
        },
        "fileCache": {
          "type": "object",
          "properties": {
            "enabled": {
              "type": "boolean",
              "default": true
            },
            "maxSize": {
              "type": "integer",
              "minimum": 104857600,
              "default": 1073741824,
              "description": "Max file cache size in bytes (1GB default)"
            },
            "ttl": {
              "type": "integer",
              "minimum": 300000,
              "default": 3600000,
              "description": "File cache TTL in milliseconds"
            }
          }
        },
        "keyStrategy": {
          "type": "string",
          "enum": ["content_hash", "path_mtime", "combined"],
          "default": "combined",
          "description": "Cache key generation strategy"
        },
        "compression": {
          "type": "boolean",
          "default": true,
          "description": "Compress cached data"
        },
        "evictionPolicy": {
          "type": "string",
          "enum": ["lru", "lfu", "fifo"],
          "default": "lru",
          "description": "Cache eviction policy"
        }
      }
    },

    "analysisSettings": {
      "type": "object",
      "description": "Default analysis configuration",
      "additionalProperties": false,
      "properties": {
        "defaultDepth": {
          "type": "string",
          "enum": ["surface", "moderate", "deep", "comprehensive"],
          "default": "moderate",
          "description": "Default analysis depth"
        },
        "maxFiles": {
          "type": "integer",
          "minimum": 1,
          "maximum": 10000,
          "default": 100,
          "description": "Maximum files to include in analysis"
        },
        "maxFileSize": {
          "type": "integer",
          "minimum": 1024,
          "default": 1048576,
          "description": "Maximum file size in bytes (1MB default)"
        },
        "includePatterns": {
          "type": "array",
          "items": { "type": "string" },
          "default": [
            "**/*.ts", "**/*.tsx", "**/*.js", "**/*.jsx",
            "**/*.py", "**/*.go", "**/*.rs", "**/*.java",
            "**/*.c", "**/*.cpp", "**/*.h", "**/*.hpp",
            "**/*.rb", "**/*.php", "**/*.swift", "**/*.kt"
          ],
          "description": "Glob patterns for files to include"
        },
        "excludePatterns": {
          "type": "array",
          "items": { "type": "string" },
          "default": [
            "node_modules/**", ".git/**", "dist/**", "build/**",
            "*.min.js", "*.min.css", "*.map",
            "package-lock.json", "yarn.lock", "pnpm-lock.yaml",
            "*.d.ts", "coverage/**", ".next/**", ".nuxt/**"
          ],
          "description": "Glob patterns for files to exclude"
        },
        "tokenOptimization": {
          "type": "object",
          "properties": {
            "stripComments": {
              "type": "boolean",
              "default": false,
              "description": "Remove comments from code"
            },
            "minifyWhitespace": {
              "type": "boolean",
              "default": true,
              "description": "Reduce whitespace"
            },
            "truncateLargeFiles": {
              "type": "boolean",
              "default": true,
              "description": "Truncate files exceeding size limit"
            },
            "truncateLength": {
              "type": "integer",
              "default": 50000,
              "description": "Truncation length in characters"
            }
          }
        },
        "chunking": {
          "type": "object",
          "properties": {
            "enabled": {
              "type": "boolean",
              "default": true,
              "description": "Enable chunking for large codebases"
            },
            "chunkSize": {
              "type": "integer",
              "default": 100000,
              "description": "Chunk size in tokens"
            },
            "chunkOverlap": {
              "type": "integer",
              "default": 1000,
              "description": "Overlap between chunks in tokens"
            },
            "parallelChunks": {
              "type": "integer",
              "minimum": 1,
              "maximum": 10,
              "default": 3,
              "description": "Number of chunks to process in parallel"
            }
          }
        }
      }
    },

    "rateLimitSettings": {
      "type": "object",
      "description": "Rate limiting configuration",
      "additionalProperties": false,
      "properties": {
        "rpm": {
          "type": "integer",
          "minimum": 1,
          "maximum": 1000,
          "default": 60,
          "description": "Requests per minute"
        },
        "tpm": {
          "type": "integer",
          "minimum": 1000,
          "maximum": 10000000,
          "default": 1000000,
          "description": "Tokens per minute"
        },
        "burstMultiplier": {
          "type": "number",
          "minimum": 1,
          "maximum": 3,
          "default": 1.5,
          "description": "Burst allowance multiplier"
        },
        "backoff": {
          "type": "object",
          "properties": {
            "initial": {
              "type": "integer",
              "minimum": 100,
              "default": 1000,
              "description": "Initial backoff delay in ms"
            },
            "max": {
              "type": "integer",
              "maximum": 120000,
              "default": 60000,
              "description": "Maximum backoff delay in ms"
            },
            "factor": {
              "type": "number",
              "minimum": 1.1,
              "maximum": 5,
              "default": 2,
              "description": "Backoff multiplier"
            }
          }
        },
        "queueEnabled": {
          "type": "boolean",
          "default": true,
          "description": "Queue requests when rate limited"
        },
        "queueMaxSize": {
          "type": "integer",
          "minimum": 1,
          "default": 100,
          "description": "Maximum queue size"
        }
      }
    },

    "mcpSettings": {
      "type": "object",
      "description": "MCP integration configuration",
      "additionalProperties": false,
      "properties": {
        "enabled": {
          "type": "boolean",
          "default": true,
          "description": "Enable MCP tool registration"
        },
        "namespace": {
          "type": "string",
          "default": "gemini-cli",
          "description": "MCP tool namespace"
        },
        "progressiveDisclosure": {
          "type": "object",
          "properties": {
            "enabled": {
              "type": "boolean",
              "default": true
            },
            "defaultLevel": {
              "type": "integer",
              "minimum": 1,
              "maximum": 3,
              "default": 2
            }
          }
        },
        "asyncJobs": {
          "type": "object",
          "properties": {
            "enabled": {
              "type": "boolean",
              "default": true
            },
            "pollInterval": {
              "type": "integer",
              "minimum": 1000,
              "default": 5000,
              "description": "Default poll interval in ms"
            },
            "maxDuration": {
              "type": "integer",
              "minimum": 60000,
              "default": 600000,
              "description": "Maximum job duration in ms"
            }
          }
        }
      }
    },

    "fallbackSettings": {
      "type": "object",
      "description": "Fallback behavior when Gemini unavailable",
      "additionalProperties": false,
      "properties": {
        "enabled": {
          "type": "boolean",
          "default": true,
          "description": "Enable fallback to Claude Code tools"
        },
        "conditions": {
          "type": "array",
          "items": {
            "type": "string",
            "enum": [
              "gemini_unavailable",
              "rate_limit_exceeded",
              "quota_exhausted",
              "auth_expired",
              "timeout"
            ]
          },
          "default": ["gemini_unavailable", "rate_limit_exceeded"],
          "description": "Conditions that trigger fallback"
        },
        "notifyUser": {
          "type": "boolean",
          "default": true,
          "description": "Notify user when fallback activated"
        }
      }
    }
  }
}
```

---

## Configuration Sections

### Module Settings

Top-level module configuration:

```json
{
  "enabled": true,
  "version": "1.0.0"
}
```

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `enabled` | boolean | `false` | Module activation state |
| `version` | string | `"1.0.0"` | Config schema version |

---

### CLI Settings

Gemini CLI installation and update settings:

```json
{
  "cli": {
    "path": "/usr/local/bin/gemini",
    "version": "0.1.34",
    "minVersion": "0.1.30",
    "autoUpdate": true,
    "updateCheckInterval": 86400000,
    "installMethod": "npm"
  }
}
```

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `path` | string | auto-detect | Path to gemini binary |
| `version` | string | detected | Installed version |
| `minVersion` | string | `"0.1.30"` | Minimum required version |
| `autoUpdate` | boolean | `true` | Auto-update enabled |
| `updateCheckInterval` | integer | `86400000` | Check interval (24h) |
| `installMethod` | enum | detected | Installation method |

---

### Authentication Settings

Authentication and session configuration:

```json
{
  "auth": {
    "method": "google-login",
    "account": "user@example.com",
    "project": "my-project-123",
    "region": "us-central1",
    "tokenRefreshBuffer": 300000,
    "sessionPersistence": true
  }
}
```

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `method` | enum | `"google-login"` | Auth method |
| `account` | string | - | Account email |
| `project` | string | - | GCP project ID |
| `region` | string | `"us-central1"` | Vertex AI region |
| `credentialsPath` | string | - | Service account path |
| `tokenRefreshBuffer` | integer | `300000` | Refresh buffer (5min) |
| `sessionPersistence` | boolean | `true` | Persist sessions |

---

### API Settings

Gemini API configuration:

```json
{
  "api": {
    "model": "gemini-1.5-pro",
    "maxTokens": 1000000,
    "maxOutputTokens": 8192,
    "temperature": 0.1,
    "topP": 0.95,
    "topK": 40,
    "timeout": 120000,
    "retries": 3,
    "retryDelay": 1000
  }
}
```

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `model` | enum | `"gemini-1.5-pro"` | Gemini model |
| `maxTokens` | integer | `1000000` | Max input tokens |
| `maxOutputTokens` | integer | `8192` | Max output tokens |
| `temperature` | number | `0.1` | Sampling temperature |
| `topP` | number | `0.95` | Nucleus sampling |
| `topK` | integer | `40` | Top-k sampling |
| `timeout` | integer | `120000` | Request timeout (2min) |
| `retries` | integer | `3` | Retry attempts |
| `retryDelay` | integer | `1000` | Initial retry delay |

**Available Models:**

| Model | Context | Best For |
|-------|---------|----------|
| `gemini-1.5-pro` | 1M tokens | Large codebase analysis |
| `gemini-1.5-flash` | 1M tokens | Fast, cost-effective |
| `gemini-2.0-pro` | 2M tokens | Latest capabilities |
| `gemini-2.0-flash` | 2M tokens | Fast, latest features |

---

### Cache Settings

Multi-level caching configuration:

```json
{
  "cache": {
    "enabled": true,
    "directory": "~/.claude-flow/cache/gemini",
    "memoryCache": {
      "enabled": true,
      "maxSize": 104857600,
      "ttl": 300000
    },
    "fileCache": {
      "enabled": true,
      "maxSize": 1073741824,
      "ttl": 3600000
    },
    "keyStrategy": "combined",
    "compression": true,
    "evictionPolicy": "lru"
  }
}
```

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `enabled` | boolean | `true` | Enable caching |
| `directory` | string | `~/.claude-flow/cache/gemini` | Cache directory |
| `memoryCache.maxSize` | integer | `100 MB` | Memory cache size |
| `memoryCache.ttl` | integer | `5 min` | Memory TTL |
| `fileCache.maxSize` | integer | `1 GB` | File cache size |
| `fileCache.ttl` | integer | `1 hour` | File TTL |
| `keyStrategy` | enum | `"combined"` | Key generation |
| `compression` | boolean | `true` | Compress cached data |
| `evictionPolicy` | enum | `"lru"` | Eviction policy |

---

### Analysis Settings

Default analysis behavior:

```json
{
  "analysis": {
    "defaultDepth": "moderate",
    "maxFiles": 100,
    "maxFileSize": 1048576,
    "includePatterns": ["**/*.ts", "**/*.js"],
    "excludePatterns": ["node_modules/**", ".git/**"],
    "tokenOptimization": {
      "stripComments": false,
      "minifyWhitespace": true,
      "truncateLargeFiles": true,
      "truncateLength": 50000
    },
    "chunking": {
      "enabled": true,
      "chunkSize": 100000,
      "chunkOverlap": 1000,
      "parallelChunks": 3
    }
  }
}
```

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `defaultDepth` | enum | `"moderate"` | Default depth |
| `maxFiles` | integer | `100` | Max files |
| `maxFileSize` | integer | `1 MB` | Max file size |
| `includePatterns` | string[] | common | Include globs |
| `excludePatterns` | string[] | common | Exclude globs |

---

### Rate Limiting

API rate limit configuration:

```json
{
  "rateLimit": {
    "rpm": 60,
    "tpm": 1000000,
    "burstMultiplier": 1.5,
    "backoff": {
      "initial": 1000,
      "max": 60000,
      "factor": 2
    },
    "queueEnabled": true,
    "queueMaxSize": 100
  }
}
```

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `rpm` | integer | `60` | Requests per minute |
| `tpm` | integer | `1000000` | Tokens per minute |
| `burstMultiplier` | number | `1.5` | Burst allowance |
| `backoff.initial` | integer | `1000` | Initial backoff (ms) |
| `backoff.max` | integer | `60000` | Max backoff (ms) |
| `backoff.factor` | number | `2` | Backoff multiplier |
| `queueEnabled` | boolean | `true` | Enable request queue |
| `queueMaxSize` | integer | `100` | Queue size limit |

---

### MCP Integration

MCP tool registration settings:

```json
{
  "mcp": {
    "enabled": true,
    "namespace": "gemini-cli",
    "progressiveDisclosure": {
      "enabled": true,
      "defaultLevel": 2
    },
    "asyncJobs": {
      "enabled": true,
      "pollInterval": 5000,
      "maxDuration": 600000
    }
  }
}
```

---

### Fallback Settings

Fallback behavior configuration:

```json
{
  "fallback": {
    "enabled": true,
    "conditions": [
      "gemini_unavailable",
      "rate_limit_exceeded"
    ],
    "notifyUser": true
  }
}
```

---

## Environment Variable Mapping

Configuration can be set via environment variables:

| Config Path | Environment Variable |
|-------------|---------------------|
| `enabled` | `GEMINI_MODULE_ENABLED` |
| `cli.path` | `GEMINI_CLI_PATH` |
| `auth.method` | `GEMINI_AUTH_METHOD` |
| `auth.project` | `GEMINI_PROJECT` |
| `auth.region` | `GEMINI_REGION` |
| `api.model` | `GEMINI_MODEL` |
| `api.maxTokens` | `GEMINI_MAX_TOKENS` |
| `api.temperature` | `GEMINI_TEMPERATURE` |
| `cache.enabled` | `GEMINI_CACHE_ENABLED` |
| `cache.directory` | `GEMINI_CACHE_DIR` |
| `rateLimit.rpm` | `GEMINI_RATE_LIMIT_RPM` |
| `rateLimit.tpm` | `GEMINI_RATE_LIMIT_TPM` |

**API Key (Special):**

```bash
# For API key auth method
export GEMINI_API_KEY=your-api-key

# For service account auth
export GOOGLE_APPLICATION_CREDENTIALS=/path/to/credentials.json
```

---

## Validation Rules

### Type Validation

```typescript
// TypeScript types for configuration

type AuthMethod = 'google-login' | 'api-key' | 'service-account';
type AnalysisDepth = 'surface' | 'moderate' | 'deep' | 'comprehensive';
type GeminiModel = 'gemini-1.5-pro' | 'gemini-1.5-flash' | 'gemini-2.0-pro' | 'gemini-2.0-flash';
type CacheKeyStrategy = 'content_hash' | 'path_mtime' | 'combined';
type EvictionPolicy = 'lru' | 'lfu' | 'fifo';
```

### Constraint Validation

```typescript
// Validation constraints

const ConfigConstraints = {
  'api.maxTokens': { min: 1000, max: 2000000 },
  'api.temperature': { min: 0, max: 2 },
  'api.topP': { min: 0, max: 1 },
  'cache.memoryCache.maxSize': { min: 10 * 1024 * 1024 }, // 10 MB
  'cache.fileCache.maxSize': { min: 100 * 1024 * 1024 }, // 100 MB
  'rateLimit.rpm': { min: 1, max: 1000 },
  'rateLimit.tpm': { min: 1000, max: 10000000 },
};
```

### Cross-Field Validation

```typescript
// Rules that validate multiple fields together

const CrossFieldRules = [
  {
    rule: 'auth_method_requires_credentials',
    check: (config) => {
      if (config.auth?.method === 'service-account') {
        return !!config.auth.credentialsPath || !!process.env.GOOGLE_APPLICATION_CREDENTIALS;
      }
      return true;
    },
    message: 'Service account auth requires credentialsPath or GOOGLE_APPLICATION_CREDENTIALS',
  },
  {
    rule: 'memory_cache_fits_in_fileCache',
    check: (config) => {
      const memoryMax = config.cache?.memoryCache?.maxSize || 0;
      const fileMax = config.cache?.fileCache?.maxSize || 0;
      return memoryMax <= fileMax;
    },
    message: 'Memory cache maxSize should not exceed file cache maxSize',
  },
];
```

---

## Migration Guide

### v0.x to v1.0

```typescript
// Migration from old config format

interface MigrationV0ToV1 {
  // Renamed properties
  renames: {
    'geminiModel': 'api.model',
    'cacheDir': 'cache.directory',
    'maxTokensPerRequest': 'api.maxTokens',
  };

  // Removed properties (with defaults)
  removed: {
    'legacyMode': false, // No longer supported
  };

  // New properties (with defaults)
  added: {
    'mcp.enabled': true,
    'mcp.progressiveDisclosure.enabled': true,
    'fallback.enabled': true,
  };
}

// Automatic migration
async function migrateConfig(oldConfig: unknown): Promise<GeminiConfig> {
  const migrator = new ConfigMigrator();
  return migrator.migrate(oldConfig, 'v0', 'v1');
}
```

---

## Examples

### Minimal Configuration

```json
{
  "enabled": true
}
```

### Development Configuration

```json
{
  "enabled": true,
  "api": {
    "model": "gemini-1.5-flash",
    "temperature": 0.2
  },
  "cache": {
    "ttl": 60000
  },
  "rateLimit": {
    "rpm": 30
  }
}
```

### Production Configuration

```json
{
  "enabled": true,
  "cli": {
    "autoUpdate": false,
    "minVersion": "0.1.34"
  },
  "auth": {
    "method": "service-account",
    "project": "prod-project-123",
    "region": "us-central1"
  },
  "api": {
    "model": "gemini-1.5-pro",
    "maxTokens": 1000000,
    "temperature": 0.1,
    "retries": 5
  },
  "cache": {
    "enabled": true,
    "fileCache": {
      "maxSize": 10737418240,
      "ttl": 86400000
    },
    "compression": true
  },
  "rateLimit": {
    "rpm": 60,
    "tpm": 1000000,
    "queueEnabled": true
  }
}
```

### CI/CD Configuration

```json
{
  "enabled": true,
  "auth": {
    "method": "api-key"
  },
  "api": {
    "model": "gemini-1.5-flash",
    "timeout": 60000
  },
  "cache": {
    "enabled": false
  },
  "mcp": {
    "enabled": false
  }
}
```

### Enterprise Configuration (Vertex AI)

```json
{
  "enabled": true,
  "auth": {
    "method": "service-account",
    "project": "enterprise-project",
    "region": "us-central1",
    "credentialsPath": "/secure/path/credentials.json"
  },
  "api": {
    "model": "gemini-1.5-pro",
    "maxTokens": 2000000,
    "safetySettings": [
      {
        "category": "HARM_CATEGORY_DANGEROUS_CONTENT",
        "threshold": "BLOCK_MEDIUM_AND_ABOVE"
      }
    ]
  },
  "analysis": {
    "defaultDepth": "deep",
    "maxFiles": 500
  }
}
```

---

## Related Documentation

- [CLI-COMMANDS.md](./CLI-COMMANDS.md) - Command reference
- [AUTHENTICATOR.md](./AUTHENTICATOR.md) - Authentication details
- [TYPES.md](./TYPES.md) - TypeScript interfaces

---

*Last Updated: December 2025*
*Schema Version: 1.0.0*
