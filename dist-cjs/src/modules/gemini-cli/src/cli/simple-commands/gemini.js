import { printSuccess, printError, printWarning } from '../../../../../cli/utils.js';
export async function geminiCommand(subArgs, flags) {
    const geminiCmd = subArgs[0];
    switch(geminiCmd){
        case 'enable':
            await enableGemini(subArgs, flags);
            break;
        case 'disable':
            await disableGemini(subArgs, flags);
            break;
        case 'status':
            await showGeminiStatus(subArgs, flags);
            break;
        case 'analyze':
            await runAnalysis(subArgs, flags);
            break;
        case 'security':
            await runSecurityScan(subArgs, flags);
            break;
        case 'architecture':
            await runArchitectureMap(subArgs, flags);
            break;
        case 'verify':
            await verifyFeature(subArgs, flags);
            break;
        case 'cache':
            await manageCache(subArgs, flags);
            break;
        case 'eject':
            await ejectModule(subArgs, flags);
            break;
        default:
            showGeminiHelp();
    }
}
async function getGeminiModule() {
    const { getGeminiModule } = await import('../../../index.js');
    return getGeminiModule();
}
async function enableGemini(subArgs, flags) {
    try {
        const module = await getGeminiModule();
        const authMethod = flags.auth || 'google-login';
        const apiKey = flags.apiKey || flags['api-key'];
        const vertexProject = flags.vertexProject || flags['vertex-project'];
        const vertexLocation = flags.vertexLocation || flags['vertex-location'] || 'us-central1';
        const skipInstall = flags.skipInstall || flags['skip-install'];
        await module.enable({
            authMethod,
            apiKey,
            vertexProject,
            vertexLocation,
            skipInstall
        });
    } catch (err) {
        printError(`Failed to enable Gemini: ${err.message}`);
        process.exit(1);
    }
}
async function disableGemini(subArgs, flags) {
    try {
        const module = await getGeminiModule();
        await module.disable();
    } catch (err) {
        printError(`Failed to disable Gemini: ${err.message}`);
        process.exit(1);
    }
}
async function showGeminiStatus(subArgs, flags) {
    try {
        const module = await getGeminiModule();
        await module.initialize();
        const status = await module.getStatus();
        console.log('\n🤖 Gemini CLI Module Status\n');
        console.log(`  Installed:      ${status.installed ? '✅ Yes' : '❌ No'}`);
        console.log(`  Version:        ${status.version || 'N/A'}`);
        console.log(`  Enabled:        ${status.enabled ? '✅ Yes' : '⚠️  No'}`);
        console.log(`  Authenticated:  ${status.authenticated ? '✅ Yes' : '❌ No'}`);
        console.log(`  Auth Method:    ${status.authMethod || 'N/A'}`);
        if (status.quotaStatus) {
            console.log('\n📊 Quota Status\n');
            const rpm = status.quotaStatus.requestsPerMinute;
            const rpd = status.quotaStatus.requestsPerDay;
            console.log(`  Requests/min:   ${rpm.used}/${rpm.limit} (resets ${rpm.resetAt.toLocaleTimeString()})`);
            console.log(`  Requests/day:   ${rpd.used}/${rpd.limit} (resets ${rpd.resetAt.toLocaleDateString()})`);
        }
        console.log();
    } catch (err) {
        printError(`Failed to get status: ${err.message}`);
        process.exit(1);
    }
}
async function runAnalysis(subArgs, flags) {
    try {
        const module = await getGeminiModule();
        if (!module.isEnabled()) {
            printError('Gemini module not enabled. Run `claude-flow gemini enable` first.');
            process.exit(1);
        }
        const analysisType = flags.type || flags.t || 'codebase';
        const paths = flags.path || flags.p || [
            '.'
        ];
        const query = flags.query || flags.q;
        const outputFormat = flags.output || flags.o || 'markdown';
        const depth = flags.depth || flags.d || 'moderate';
        const storeInMemory = flags.storeMemory || flags['store-memory'];
        console.log(`\n🔍 Running ${analysisType} analysis...\n`);
        const result = await module.analyze({
            type: analysisType,
            target: Array.isArray(paths) ? paths : [
                paths
            ],
            query,
            outputFormat,
            depth,
            storeInMemory
        });
        if (result.success) {
            printSuccess('Analysis complete\n');
            console.log('📋 Summary:');
            console.log(result.summary);
            if (result.findings.length > 0) {
                console.log('\n🔎 Findings:');
                for (const finding of result.findings.slice(0, 10)){
                    const severityIcon = finding.severity === 'critical' || finding.severity === 'high' ? '🔴' : finding.severity === 'medium' ? '🟡' : '⚪';
                    console.log(`  ${severityIcon} [${finding.severity.toUpperCase()}] ${finding.message}`);
                    if (finding.location !== 'unknown') {
                        console.log(`     📍 ${finding.location}`);
                    }
                }
                if (result.findings.length > 10) {
                    console.log(`  ... and ${result.findings.length - 10} more findings`);
                }
            }
            console.log('\n📊 Metrics:');
            console.log(`  Files analyzed: ${result.metrics.filesAnalyzed}`);
            console.log(`  Lines of code:  ${result.metrics.linesOfCode}`);
            console.log(`  Duration:       ${result.duration}ms`);
        } else {
            printError('Analysis failed:');
            result.errors?.forEach((err)=>console.error(`  - ${err}`));
        }
    } catch (err) {
        printError(`Analysis failed: ${err.message}`);
        process.exit(1);
    }
}
async function runSecurityScan(subArgs, flags) {
    try {
        const module = await getGeminiModule();
        if (!module.isEnabled()) {
            printError('Gemini module not enabled. Run `claude-flow gemini enable` first.');
            process.exit(1);
        }
        const executor = module.getExecutor();
        if (!executor) {
            printError('Executor not available');
            process.exit(1);
        }
        const targetPath = flags.path || flags.p || '.';
        const depth = flags.depth || flags.d || 'deep';
        console.log('\n🔒 Running security scan...\n');
        const result = await executor.securityScan(targetPath, {
            depth
        });
        if (result.success) {
            printSuccess('Security scan complete\n');
            console.log('📋 Summary:');
            console.log(result.summary);
            const criticalFindings = result.findings.filter((f)=>f.severity === 'critical' || f.severity === 'high');
            if (criticalFindings.length > 0) {
                console.log(`\n⚠️  ${criticalFindings.length} critical/high findings:`);
                for (const finding of criticalFindings){
                    console.log(`  🔴 [${finding.severity.toUpperCase()}] ${finding.message}`);
                    if (finding.suggestion) {
                        console.log(`     💡 Fix: ${finding.suggestion}`);
                    }
                }
            } else {
                printSuccess('No critical or high severity issues found!');
            }
        } else {
            printError('Security scan failed:');
            result.errors?.forEach((err)=>console.error(`  - ${err}`));
        }
    } catch (err) {
        printError(`Security scan failed: ${err.message}`);
        process.exit(1);
    }
}
async function runArchitectureMap(subArgs, flags) {
    try {
        const module = await getGeminiModule();
        if (!module.isEnabled()) {
            printError('Gemini module not enabled. Run `claude-flow gemini enable` first.');
            process.exit(1);
        }
        const executor = module.getExecutor();
        if (!executor) {
            printError('Executor not available');
            process.exit(1);
        }
        const targetPath = flags.path || flags.p || '.';
        console.log('\n🏗️  Mapping architecture...\n');
        const result = await executor.architectureMap(targetPath);
        if (result.success) {
            printSuccess('Architecture mapping complete\n');
            console.log(result.summary);
            if (result.rawOutput) {
                console.log('\n📐 Architecture Details:');
                console.log(result.rawOutput);
            }
        } else {
            printError('Architecture mapping failed:');
            result.errors?.forEach((err)=>console.error(`  - ${err}`));
        }
    } catch (err) {
        printError(`Architecture mapping failed: ${err.message}`);
        process.exit(1);
    }
}
async function verifyFeature(subArgs, flags) {
    try {
        const module = await getGeminiModule();
        if (!module.isEnabled()) {
            printError('Gemini module not enabled. Run `claude-flow gemini enable` first.');
            process.exit(1);
        }
        const executor = module.getExecutor();
        if (!executor) {
            printError('Executor not available');
            process.exit(1);
        }
        const feature = flags.feature || flags.f;
        const targetPath = flags.path || flags.p || '.';
        if (!feature) {
            printError("Feature description required. Use --feature or -f");
            process.exit(1);
        }
        console.log(`\n🔍 Verifying: "${feature}"...\n`);
        const result = await executor.verify(feature, targetPath);
        const statusIcon = result.implemented ? '✅' : '❌';
        console.log(`Status: ${statusIcon} ${result.implemented ? 'IMPLEMENTED' : 'NOT FOUND'}`);
        console.log(`Confidence: ${result.confidence}%`);
        console.log(`Details: ${result.details}`);
    } catch (err) {
        printError(`Verification failed: ${err.message}`);
        process.exit(1);
    }
}
async function manageCache(subArgs, flags) {
    try {
        const module = await getGeminiModule();
        await module.initialize();
        if (flags.clear) {
            printWarning('Clearing cache...');
            await module.clearCache();
            printSuccess('Cache cleared');
        } else if (flags.stats) {
            const stats = module.getCacheStats();
            console.log('\n📦 Cache Statistics\n');
            console.log(`  Entries:   ${stats.entries}`);
            console.log(`  Size:      ${stats.size} bytes`);
            console.log(`  Hit Rate:  ${(stats.hitRate * 100).toFixed(1)}%`);
        } else {
            console.log('Use --clear to clear cache or --stats to show statistics');
        }
    } catch (err) {
        printError(`Cache operation failed: ${err.message}`);
        process.exit(1);
    }
}
async function ejectModule(subArgs, flags) {
    try {
        if (!flags.force) {
            printWarning('This will remove all Gemini CLI integration.');
            console.log('Run with --force to confirm.\n');
            return;
        }
        const module = await getGeminiModule();
        await module.eject({
            force: flags.force,
            uninstall: flags.uninstall,
            keepConfig: flags.keepConfig || flags['keep-config']
        });
    } catch (err) {
        printError(`Eject failed: ${err.message}`);
        process.exit(1);
    }
}
function showGeminiHelp() {
    console.log(`
🤖 Gemini CLI Module - Large-scale codebase analysis with 1M+ token context

USAGE:
  claude-flow gemini <command> [options]

COMMANDS:
  enable        Enable and authenticate Gemini CLI
  disable       Disable Gemini CLI temporarily
  status        Show module status and quota
  analyze       Run codebase analysis
  security      Run security vulnerability scan
  architecture  Map system architecture
  verify        Verify feature implementation
  cache         Manage analysis cache
  eject         Completely remove module

ENABLE OPTIONS:
  --auth <method>           Authentication: google-login, api-key, vertex-ai (default: google-login)
  --api-key <key>           API key for api-key authentication
  --vertex-project <id>     GCP project ID for Vertex AI
  --vertex-location <loc>   GCP region (default: us-central1)
  --skip-install            Skip Gemini CLI installation check

ANALYZE OPTIONS:
  -t, --type <type>         Analysis type: codebase, architecture, security, dependencies, coverage
  -p, --path <paths>        Paths to analyze (default: .)
  -q, --query <query>       Custom analysis query
  -o, --output <format>     Output: json, markdown, text (default: markdown)
  -d, --depth <depth>       Depth: surface, moderate, deep, comprehensive (default: moderate)
  --store-memory            Store results in Claude Flow memory

VERIFY OPTIONS:
  -f, --feature <desc>      Feature description to verify (required)
  -p, --path <path>         Path to check (default: .)

CACHE OPTIONS:
  --clear                   Clear all cached results
  --stats                   Show cache statistics

EJECT OPTIONS:
  --force                   Skip confirmation
  --uninstall               Also uninstall Gemini CLI globally
  --keep-config             Keep configuration for future use

EXAMPLES:
  claude-flow gemini enable --auth api-key --api-key YOUR_KEY
  claude-flow gemini status
  claude-flow gemini analyze --type security --path ./src
  claude-flow gemini verify --feature "user authentication"
  claude-flow gemini cache --stats
`);
}

//# sourceMappingURL=gemini.js.map