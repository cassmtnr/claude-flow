/**
 * Gemini CLI Command Handler
 * Provides CLI interface for the Gemini module
 */

import { Command } from '@cliffy/command';
import chalk from 'chalk';
import { getGeminiModule } from '../../core/index.js';
import type { AnalysisType, AuthMethod, AnalysisDepth, OutputFormat } from '../../core/types.js';

// Type definitions for command options
interface EnableOptions {
  auth: string;
  apiKey?: string;
  vertexProject?: string;
  vertexLocation?: string;
  skipInstall?: boolean;
}

interface AnalyzeOptions {
  type: string;
  path: string[];
  query?: string;
  output: string;
  depth: string;
  storeMemory?: boolean;
}

interface SecurityOptions {
  path: string;
  depth: string;
}

interface ArchitectureOptions {
  path: string;
}

interface VerifyOptions {
  feature: string;
  path: string;
}

interface CacheOptions {
  clear?: boolean;
  stats?: boolean;
}

interface EjectOptions {
  force?: boolean;
  uninstall?: boolean;
  keepConfig?: boolean;
}

export const geminiCommand = new Command()
  .description('Manage Gemini CLI integration for large-scale codebase analysis')
  .action(() => {
    console.log(chalk.cyan('\nGemini CLI Module Commands:\n'));
    console.log('  enable      Enable and authenticate Gemini CLI');
    console.log('  disable     Disable Gemini CLI temporarily');
    console.log('  status      Show module status');
    console.log('  analyze     Run codebase analysis');
    console.log('  security    Run security scan');
    console.log('  architecture Map system architecture');
    console.log('  verify      Verify feature implementation');
    console.log('  cache       Manage analysis cache');
    console.log('  eject       Completely remove module');
    console.log('\nRun `claude-flow gemini <command> --help` for details\n');
  })
  // Enable command
  .command(
    'enable',
    new Command()
      .description('Enable and authenticate Gemini CLI')
      .option('--auth <method:string>', 'Authentication method: google-login, api-key, vertex-ai', {
        default: 'google-login',
      })
      .option('--api-key <key:string>', 'API key (for api-key auth)')
      .option('--vertex-project <project:string>', 'GCP project ID (for vertex-ai auth)')
      .option('--vertex-location <location:string>', 'GCP region (for vertex-ai auth)', {
        default: 'us-central1',
      })
      .option('--skip-install', 'Skip Gemini CLI installation check')
      .action(async (options: EnableOptions) => {
        try {
          const module = getGeminiModule();
          await module.enable({
            authMethod: options.auth as AuthMethod,
            apiKey: options.apiKey,
            vertexProject: options.vertexProject,
            vertexLocation: options.vertexLocation,
            skipInstall: options.skipInstall,
          });
        } catch (err) {
          console.error(chalk.red(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`));
          process.exit(1);
        }
      })
  )
  // Disable command
  .command(
    'disable',
    new Command()
      .description('Disable Gemini CLI temporarily')
      .action(async () => {
        try {
          const module = getGeminiModule();
          await module.disable();
        } catch (err) {
          console.error(chalk.red(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`));
          process.exit(1);
        }
      })
  )
  // Status command
  .command(
    'status',
    new Command()
      .description('Show Gemini CLI module status')
      .action(async () => {
        try {
          const module = getGeminiModule();
          await module.initialize();
          const status = await module.getStatus();

          console.log(chalk.cyan('\nGemini CLI Module Status\n'));
          console.log(`  Installed:      ${status.installed ? chalk.green('Yes') : chalk.red('No')}`);
          console.log(`  Version:        ${status.version || 'N/A'}`);
          console.log(`  Enabled:        ${status.enabled ? chalk.green('Yes') : chalk.yellow('No')}`);
          console.log(`  Authenticated:  ${status.authenticated ? chalk.green('Yes') : chalk.red('No')}`);
          console.log(`  Auth Method:    ${status.authMethod || 'N/A'}`);

          if (status.quotaStatus) {
            console.log(chalk.cyan('\nQuota Status\n'));
            const rpm = status.quotaStatus.requestsPerMinute;
            const rpd = status.quotaStatus.requestsPerDay;
            console.log(
              `  Requests/min:   ${rpm.used}/${rpm.limit} (resets ${rpm.resetAt.toLocaleTimeString()})`
            );
            console.log(
              `  Requests/day:   ${rpd.used}/${rpd.limit} (resets ${rpd.resetAt.toLocaleDateString()})`
            );
          }

          console.log();
        } catch (err) {
          console.error(chalk.red(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`));
          process.exit(1);
        }
      })
  )
  // Analyze command
  .command(
    'analyze',
    new Command()
      .description('Run codebase analysis')
      .option('-t, --type <type:string>', 'Analysis type: codebase, architecture, security, dependencies, coverage', {
        default: 'codebase',
      })
      .option('-p, --path <paths:string[]>', 'Paths to analyze', { default: ['.'] })
      .option('-q, --query <query:string>', 'Custom analysis query')
      .option('-o, --output <format:string>', 'Output format: json, markdown, text', {
        default: 'markdown',
      })
      .option('-d, --depth <depth:string>', 'Analysis depth: surface, moderate, deep, comprehensive', {
        default: 'moderate',
      })
      .option('--store-memory', 'Store results in Claude Flow memory')
      .action(async (options: AnalyzeOptions) => {
        try {
          const module = getGeminiModule();

          if (!module.isEnabled()) {
            console.error(
              chalk.red('Error: Gemini module not enabled. Run `claude-flow gemini enable` first.')
            );
            process.exit(1);
          }

          console.log(chalk.cyan(`\n🔍 Running ${options.type} analysis...\n`));

          const result = await module.analyze({
            type: options.type as AnalysisType,
            target: options.path,
            query: options.query,
            outputFormat: options.output as OutputFormat,
            depth: options.depth as AnalysisDepth,
            storeInMemory: options.storeMemory,
          });

          if (result.success) {
            console.log(chalk.green('✅ Analysis complete\n'));
            console.log(chalk.cyan('Summary:'));
            console.log(result.summary);

            if (result.findings.length > 0) {
              console.log(chalk.cyan('\nFindings:'));
              for (const finding of result.findings.slice(0, 10)) {
                const color =
                  finding.severity === 'critical' || finding.severity === 'high'
                    ? chalk.red
                    : finding.severity === 'medium'
                      ? chalk.yellow
                      : chalk.gray;
                console.log(`  ${color(`[${finding.severity.toUpperCase()}]`)} ${finding.message}`);
                if (finding.location !== 'unknown') {
                  console.log(`    ${chalk.gray(finding.location)}`);
                }
              }
              if (result.findings.length > 10) {
                console.log(chalk.gray(`  ... and ${result.findings.length - 10} more findings`));
              }
            }

            console.log(chalk.cyan('\nMetrics:'));
            console.log(`  Files analyzed: ${result.metrics.filesAnalyzed}`);
            console.log(`  Lines of code:  ${result.metrics.linesOfCode}`);
            console.log(`  Duration:       ${result.duration}ms`);
          } else {
            console.error(chalk.red('Analysis failed:'));
            result.errors?.forEach((e) => console.error(`  - ${e}`));
          }
        } catch (err) {
          console.error(chalk.red(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`));
          process.exit(1);
        }
      })
  )
  // Security scan command
  .command(
    'security',
    new Command()
      .description('Run security scan')
      .option('-p, --path <path:string>', 'Path to scan', { default: '.' })
      .option('-d, --depth <depth:string>', 'Scan depth: surface, moderate, deep, comprehensive', {
        default: 'deep',
      })
      .action(async (options: SecurityOptions) => {
        try {
          const module = getGeminiModule();

          if (!module.isEnabled()) {
            console.error(
              chalk.red('Error: Gemini module not enabled. Run `claude-flow gemini enable` first.')
            );
            process.exit(1);
          }

          const executor = module.getExecutor();
          if (!executor) {
            console.error(chalk.red('Error: Executor not available'));
            process.exit(1);
          }

          console.log(chalk.cyan('\n🔒 Running security scan...\n'));

          const result = await executor.securityScan(options.path, {
            depth: options.depth as AnalysisDepth,
          });

          if (result.success) {
            console.log(chalk.green('✅ Security scan complete\n'));
            console.log(chalk.cyan('Summary:'));
            console.log(result.summary);

            const criticalFindings = result.findings.filter(
              (f) => f.severity === 'critical' || f.severity === 'high'
            );
            if (criticalFindings.length > 0) {
              console.log(chalk.red(`\n⚠️  ${criticalFindings.length} critical/high findings:`));
              for (const finding of criticalFindings) {
                console.log(chalk.red(`  [${finding.severity.toUpperCase()}] ${finding.message}`));
                if (finding.suggestion) {
                  console.log(chalk.yellow(`    Fix: ${finding.suggestion}`));
                }
              }
            }
          } else {
            console.error(chalk.red('Security scan failed:'));
            result.errors?.forEach((e) => console.error(`  - ${e}`));
          }
        } catch (err) {
          console.error(chalk.red(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`));
          process.exit(1);
        }
      })
  )
  // Architecture command
  .command(
    'architecture',
    new Command()
      .description('Map system architecture')
      .option('-p, --path <path:string>', 'Path to analyze', { default: '.' })
      .action(async (options: ArchitectureOptions) => {
        try {
          const module = getGeminiModule();

          if (!module.isEnabled()) {
            console.error(
              chalk.red('Error: Gemini module not enabled. Run `claude-flow gemini enable` first.')
            );
            process.exit(1);
          }

          const executor = module.getExecutor();
          if (!executor) {
            console.error(chalk.red('Error: Executor not available'));
            process.exit(1);
          }

          console.log(chalk.cyan('\n🏗️  Mapping architecture...\n'));

          const result = await executor.architectureMap(options.path);

          if (result.success) {
            console.log(chalk.green('✅ Architecture mapping complete\n'));
            console.log(result.summary);
            if (result.rawOutput) {
              console.log(chalk.cyan('\nArchitecture Details:'));
              console.log(result.rawOutput);
            }
          } else {
            console.error(chalk.red('Architecture mapping failed:'));
            result.errors?.forEach((e) => console.error(`  - ${e}`));
          }
        } catch (err) {
          console.error(chalk.red(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`));
          process.exit(1);
        }
      })
  )
  // Verify command
  .command(
    'verify',
    new Command()
      .description('Verify if a feature is implemented')
      .option('-f, --feature <description:string>', 'Feature to verify', { required: true })
      .option('-p, --path <path:string>', 'Path to check', { default: '.' })
      .action(async (options: VerifyOptions) => {
        try {
          const module = getGeminiModule();

          if (!module.isEnabled()) {
            console.error(
              chalk.red('Error: Gemini module not enabled. Run `claude-flow gemini enable` first.')
            );
            process.exit(1);
          }

          const executor = module.getExecutor();
          if (!executor) {
            console.error(chalk.red('Error: Executor not available'));
            process.exit(1);
          }

          console.log(chalk.cyan(`\n🔍 Verifying: "${options.feature}"...\n`));

          const result = await executor.verify(options.feature, options.path);

          const statusColor = result.implemented ? chalk.green : chalk.red;
          console.log(`Status: ${statusColor(result.implemented ? 'IMPLEMENTED' : 'NOT FOUND')}`);
          console.log(`Confidence: ${result.confidence}%`);
          console.log(`Details: ${result.details}`);
        } catch (err) {
          console.error(chalk.red(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`));
          process.exit(1);
        }
      })
  )
  // Cache command
  .command(
    'cache',
    new Command()
      .description('Manage analysis cache')
      .option('--clear', 'Clear all cached results')
      .option('--stats', 'Show cache statistics')
      .action(async (options: CacheOptions) => {
        try {
          const module = getGeminiModule();
          await module.initialize();

          if (options.clear) {
            console.log(chalk.yellow('Clearing cache...'));
            await module.clearCache();
            console.log(chalk.green('Cache cleared'));
          } else if (options.stats) {
            const stats = module.getCacheStats();
            console.log(chalk.cyan('\nCache Statistics\n'));
            console.log(`  Entries: ${stats.entries}`);
            console.log(`  Size:    ${stats.size} bytes`);
            console.log(`  Hit Rate: ${(stats.hitRate * 100).toFixed(1)}%`);
          } else {
            console.log('Use --clear to clear cache or --stats to show statistics');
          }
        } catch (err) {
          console.error(chalk.red(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`));
          process.exit(1);
        }
      })
  )
  // Eject command
  .command(
    'eject',
    new Command()
      .description('Completely remove Gemini CLI module')
      .option('--force', 'Skip confirmation')
      .option('--uninstall', 'Also uninstall Gemini CLI globally')
      .option('--keep-config', 'Keep configuration for future use')
      .action(async (options: EjectOptions) => {
        try {
          if (!options.force) {
            console.log(chalk.yellow('\n⚠️  This will remove all Gemini CLI integration.'));
            console.log('Run with --force to confirm.\n');
            return;
          }

          const module = getGeminiModule();
          await module.eject({
            force: options.force,
            uninstall: options.uninstall,
            keepConfig: options.keepConfig,
          });
        } catch (err) {
          console.error(chalk.red(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`));
          process.exit(1);
        }
      })
  );
