/**
 * Gemini CLI Module - Public API
 *
 * This is the main entry point for the Gemini CLI module.
 * All public APIs are re-exported from here.
 */

// Re-export everything from core
export * from './src/core/index.js';
export * from './src/core/types.js';
export * from './src/core/errors.js';

// Re-export CLI command for Cliffy integration
export { geminiCommand } from './src/cli/commands/gemini.js';
