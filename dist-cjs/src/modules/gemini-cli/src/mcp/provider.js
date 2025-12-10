import { GeminiCLIToolDefinitions, getToolDefinition } from './tools.js';
import { getGeminiModule } from '../core/index.js';
import { GeminiExecutionError } from '../core/errors.js';
export class GeminiCLIMCPProvider {
    handlers = new Map();
    initialized = false;
    constructor(){
        this.registerHandlers();
    }
    getServerConfig() {
        return {
            name: 'gemini-cli',
            version: '1.0.0',
            capabilities: [
                'tools',
                'progressive-disclosure'
            ]
        };
    }
    getToolDefinitions() {
        return GeminiCLIToolDefinitions;
    }
    getToolsByDisclosure(level, context) {
        const levelPriority = {
            basic: 1,
            standard: 2,
            full: 3
        };
        const currentLevel = levelPriority[level];
        return GeminiCLIToolDefinitions.filter((tool)=>{
            const toolLevel = levelPriority[tool.disclosure.level];
            if (toolLevel > currentLevel) return false;
            if (context?.currentQuery) {
                const query = context.currentQuery.toLowerCase();
                return tool.disclosure.triggers.some((trigger)=>query.includes(trigger.toLowerCase()));
            }
            return true;
        }).sort((a, b)=>b.disclosure.priority - a.disclosure.priority);
    }
    async executeTool(request) {
        const { toolId, input, context } = request;
        if (!this.initialized) {
            await this.initialize();
        }
        const handler = this.handlers.get(toolId);
        if (!handler) {
            return {
                success: false,
                isError: true,
                content: `Unknown tool: ${toolId}. Available tools: ${Array.from(this.handlers.keys()).join(', ')}`
            };
        }
        const module = getGeminiModule();
        if (!module.isEnabled()) {
            return {
                success: false,
                isError: true,
                content: 'Gemini CLI module is not enabled. Run `claude-flow gemini enable` to enable it first.'
            };
        }
        try {
            return await handler(input, context);
        } catch (err) {
            const error = err instanceof Error ? err : new Error(String(err));
            return {
                success: false,
                isError: true,
                content: `Tool execution failed: ${error.message}`,
                metadata: {
                    toolId,
                    error: error.name
                }
            };
        }
    }
    async initialize() {
        if (this.initialized) return;
        const module = getGeminiModule();
        await module.initialize();
        this.initialized = true;
    }
    registerHandlers() {
        this.handlers.set('codebase_analyze', this.handleCodebaseAnalyze.bind(this));
        this.handlers.set('architecture_map', this.handleArchitectureMap.bind(this));
        this.handlers.set('security_scan', this.handleSecurityScan.bind(this));
        this.handlers.set('dependency_analyze', this.handleDependencyAnalyze.bind(this));
        this.handlers.set('coverage_assess', this.handleCoverageAssess.bind(this));
    }
    async handleCodebaseAnalyze(input, _context) {
        const typedInput = input;
        const module = getGeminiModule();
        const result = await module.analyze({
            type: 'codebase',
            target: typedInput.paths,
            query: typedInput.query,
            depth: typedInput.depth || 'moderate',
            outputFormat: typedInput.outputFormat || 'markdown',
            storeInMemory: typedInput.storeInMemory
        });
        return this.formatAnalysisResult(result, 'codebase_analyze');
    }
    async handleArchitectureMap(input, _context) {
        const typedInput = input;
        const module = getGeminiModule();
        const executor = module.getExecutor();
        if (!executor) {
            throw new GeminiExecutionError('Executor not available', 'architecture');
        }
        const focus = [
            'components',
            'layers'
        ];
        if (typedInput.includeDataFlows ?? true) {
            focus.push('data-flows');
        }
        if (typedInput.includeDependencies ?? true) {
            focus.push('dependencies');
        }
        const result = await executor.architectureMap(typedInput.path, {
            depth: typedInput.depth || 'comprehensive',
            focus
        });
        return this.formatAnalysisResult(result, 'architecture_map');
    }
    async handleSecurityScan(input, _context) {
        const typedInput = input;
        const module = getGeminiModule();
        const executor = module.getExecutor();
        if (!executor) {
            throw new GeminiExecutionError('Executor not available', 'security');
        }
        const focus = [
            ...typedInput.scanTypes || [
                'vulnerabilities',
                'secrets',
                'misconfig'
            ]
        ];
        if (typedInput.severityThreshold && typedInput.severityThreshold !== 'low') {
            focus.push(`severity:${typedInput.severityThreshold}`);
        }
        const result = await executor.securityScan(typedInput.path, {
            depth: typedInput.depth || 'deep',
            focus
        });
        return this.formatAnalysisResult(result, 'security_scan');
    }
    async handleDependencyAnalyze(input, _context) {
        const typedInput = input;
        const module = getGeminiModule();
        const result = await module.analyze({
            type: 'dependencies',
            target: [
                typedInput.path
            ],
            outputFormat: typedInput.outputFormat || 'markdown'
        });
        return {
            ...this.formatAnalysisResult(result, 'dependency_analyze'),
            metadata: {
                toolId: 'dependency_analyze',
                checkOutdated: typedInput.checkOutdated ?? true,
                checkVulnerabilities: typedInput.checkVulnerabilities ?? true,
                checkLicenses: typedInput.checkLicenses ?? true
            }
        };
    }
    async handleCoverageAssess(input, _context) {
        const typedInput = input;
        const module = getGeminiModule();
        const result = await module.analyze({
            type: 'coverage',
            target: [
                typedInput.path
            ],
            depth: typedInput.depth || 'moderate',
            outputFormat: typedInput.outputFormat || 'markdown'
        });
        return {
            ...this.formatAnalysisResult(result, 'coverage_assess'),
            metadata: {
                toolId: 'coverage_assess',
                testDirectory: typedInput.testDirectory,
                focusAreas: typedInput.focusAreas
            }
        };
    }
    formatAnalysisResult(result, toolId) {
        if (!result.success) {
            return {
                success: false,
                isError: true,
                content: result.errors?.join('\n') || 'Analysis failed',
                metadata: {
                    toolId,
                    duration: result.duration
                }
            };
        }
        const content = this.formatMarkdownOutput(result, toolId);
        return {
            success: true,
            content,
            metadata: {
                toolId,
                duration: result.duration,
                filesAnalyzed: result.metrics.filesAnalyzed,
                linesOfCode: result.metrics.linesOfCode,
                findingsCount: result.findings.length,
                recommendationsCount: result.recommendations.length
            }
        };
    }
    formatMarkdownOutput(result, toolId) {
        const toolDef = getToolDefinition(toolId);
        const toolName = toolDef?.name || toolId;
        const sections = [];
        sections.push(`# ${toolName} Results\n`);
        sections.push(`## Summary\n\n${result.summary}\n`);
        sections.push(`## Metrics\n`);
        sections.push(`- **Files Analyzed**: ${result.metrics.filesAnalyzed}`);
        sections.push(`- **Lines of Code**: ${result.metrics.linesOfCode}`);
        sections.push(`- **Duration**: ${result.duration}ms\n`);
        if (result.findings.length > 0) {
            sections.push(`## Findings (${result.findings.length})\n`);
            const bySeverity = this.groupBySeverity(result.findings);
            for (const [severity, findings] of Object.entries(bySeverity)){
                if (findings.length === 0) continue;
                sections.push(`### ${severity.charAt(0).toUpperCase() + severity.slice(1)} (${findings.length})\n`);
                for (const finding of findings.slice(0, 10)){
                    const icon = this.getSeverityIcon(finding.severity);
                    sections.push(`${icon} **${finding.message}**`);
                    if (finding.location !== 'unknown') {
                        sections.push(`   - Location: \`${finding.location}\``);
                    }
                    if (finding.suggestion) {
                        sections.push(`   - Suggestion: ${finding.suggestion}`);
                    }
                    sections.push('');
                }
                if (findings.length > 10) {
                    sections.push(`*... and ${findings.length - 10} more ${severity} findings*\n`);
                }
            }
        }
        if (result.recommendations.length > 0) {
            sections.push(`## Recommendations\n`);
            for (const rec of result.recommendations.slice(0, 5)){
                sections.push(`- ${rec}`);
            }
            if (result.recommendations.length > 5) {
                sections.push(`\n*... and ${result.recommendations.length - 5} more recommendations*`);
            }
            sections.push('');
        }
        return sections.join('\n');
    }
    groupBySeverity(findings) {
        const groups = {
            critical: [],
            high: [],
            medium: [],
            low: [],
            info: []
        };
        for (const finding of findings){
            if (groups[finding.severity]) {
                groups[finding.severity].push(finding);
            } else {
                groups.info.push(finding);
            }
        }
        return groups;
    }
    getSeverityIcon(severity) {
        switch(severity){
            case 'critical':
                return '🔴';
            case 'high':
                return '🟠';
            case 'medium':
                return '🟡';
            case 'low':
                return '🟢';
            default:
                return 'ℹ️';
        }
    }
}
let providerInstance = null;
export function getGeminiCLIMCPProvider() {
    if (!providerInstance) {
        providerInstance = new GeminiCLIMCPProvider();
    }
    return providerInstance;
}
export function createMCPServerRegistration() {
    const provider = getGeminiCLIMCPProvider();
    const config = provider.getServerConfig();
    return {
        name: config.name,
        version: config.version,
        tools: provider.getToolDefinitions(),
        execute: (request)=>provider.executeTool(request)
    };
}

//# sourceMappingURL=provider.js.map