export const GeminiCLIToolDefinitions = [
    {
        id: 'codebase_analyze',
        name: 'Codebase Analysis',
        description: 'Comprehensive codebase analysis using Gemini\'s 1M+ token context. ' + 'Analyzes code structure, patterns, quality, and provides actionable insights. ' + 'Ideal for understanding large codebases, identifying patterns, and code review.',
        category: 'analysis',
        inputSchema: {
            type: 'object',
            properties: {
                paths: {
                    type: 'array',
                    items: {
                        type: 'string'
                    },
                    description: 'Paths to analyze (files or directories)',
                    default: [
                        '.'
                    ]
                },
                query: {
                    type: 'string',
                    description: 'Specific question or focus area for analysis'
                },
                depth: {
                    type: 'string',
                    enum: [
                        'surface',
                        'moderate',
                        'deep',
                        'comprehensive'
                    ],
                    description: 'Analysis depth level',
                    default: 'moderate'
                },
                outputFormat: {
                    type: 'string',
                    enum: [
                        'json',
                        'markdown',
                        'text'
                    ],
                    description: 'Output format',
                    default: 'markdown'
                },
                excludePatterns: {
                    type: 'array',
                    items: {
                        type: 'string'
                    },
                    description: 'Glob patterns to exclude'
                },
                focusAreas: {
                    type: 'array',
                    items: {
                        type: 'string'
                    },
                    description: 'Specific areas to focus on'
                },
                storeInMemory: {
                    type: 'boolean',
                    description: 'Store results in Claude Flow memory',
                    default: false
                }
            },
            required: [
                'paths'
            ]
        },
        outputSchema: {
            type: 'object',
            properties: {
                success: {
                    type: 'boolean'
                },
                summary: {
                    type: 'string'
                },
                findings: {
                    type: 'array'
                },
                metrics: {
                    type: 'object'
                },
                recommendations: {
                    type: 'array'
                }
            }
        },
        disclosure: {
            level: 'standard',
            triggers: [
                'analyze',
                'codebase',
                'review',
                'understand',
                'examine'
            ],
            priority: 80
        },
        estimatedDuration: '30-120 seconds',
        tokenEstimate: '10,000-100,000 tokens'
    },
    {
        id: 'architecture_map',
        name: 'Architecture Mapping',
        description: 'Maps system architecture including components, layers, dependencies, and data flows. ' + 'Uses Gemini\'s large context to understand complex system structures. ' + "Generates visual diagrams and detailed component descriptions.",
        category: 'architecture',
        inputSchema: {
            type: 'object',
            properties: {
                path: {
                    type: 'string',
                    description: 'Root path to analyze',
                    default: '.'
                },
                includeDataFlows: {
                    type: 'boolean',
                    description: 'Include data flow analysis',
                    default: true
                },
                includeDependencies: {
                    type: 'boolean',
                    description: 'Include dependency graph',
                    default: true
                },
                outputFormat: {
                    type: 'string',
                    enum: [
                        'json',
                        'markdown',
                        'text'
                    ],
                    description: 'Output format',
                    default: 'markdown'
                },
                depth: {
                    type: 'string',
                    enum: [
                        'surface',
                        'moderate',
                        'deep',
                        'comprehensive'
                    ],
                    description: 'Analysis depth',
                    default: 'comprehensive'
                }
            },
            required: [
                'path'
            ]
        },
        outputSchema: {
            type: 'object',
            properties: {
                success: {
                    type: 'boolean'
                },
                components: {
                    type: 'array'
                },
                layers: {
                    type: 'array'
                },
                dependencies: {
                    type: 'object'
                },
                dataFlows: {
                    type: 'array'
                },
                diagram: {
                    type: 'string'
                }
            }
        },
        disclosure: {
            level: 'standard',
            triggers: [
                'architecture',
                'structure',
                'components',
                'diagram',
                'design'
            ],
            priority: 75
        },
        estimatedDuration: '45-180 seconds',
        tokenEstimate: '20,000-150,000 tokens'
    },
    {
        id: 'security_scan',
        name: 'Security Vulnerability Scan',
        description: 'Comprehensive security audit using Gemini\'s context understanding. ' + 'Identifies vulnerabilities, hardcoded secrets, misconfigurations, and insecure patterns. ' + 'Provides severity ratings and remediation suggestions.',
        category: 'security',
        inputSchema: {
            type: 'object',
            properties: {
                path: {
                    type: 'string',
                    description: 'Path to scan',
                    default: '.'
                },
                scanTypes: {
                    type: 'array',
                    items: {
                        type: 'string',
                        enum: [
                            'vulnerabilities',
                            'secrets',
                            'misconfig',
                            'dependencies'
                        ]
                    },
                    description: 'Types of security issues to scan for',
                    default: [
                        'vulnerabilities',
                        'secrets',
                        'misconfig'
                    ]
                },
                depth: {
                    type: 'string',
                    enum: [
                        'surface',
                        'moderate',
                        'deep',
                        'comprehensive'
                    ],
                    description: 'Scan depth',
                    default: 'deep'
                },
                outputFormat: {
                    type: 'string',
                    enum: [
                        'json',
                        'markdown',
                        'text'
                    ],
                    description: 'Output format',
                    default: 'markdown'
                },
                severityThreshold: {
                    type: 'string',
                    enum: [
                        'critical',
                        'high',
                        'medium',
                        'low'
                    ],
                    description: 'Minimum severity to report',
                    default: 'low'
                }
            },
            required: [
                'path'
            ]
        },
        outputSchema: {
            type: 'object',
            properties: {
                success: {
                    type: 'boolean'
                },
                summary: {
                    type: 'string'
                },
                vulnerabilities: {
                    type: 'array'
                },
                secrets: {
                    type: 'array'
                },
                misconfigurations: {
                    type: 'array'
                },
                riskScore: {
                    type: 'number'
                },
                remediations: {
                    type: 'array'
                }
            }
        },
        disclosure: {
            level: 'standard',
            triggers: [
                'security',
                'vulnerability',
                'audit',
                'secrets',
                'scan'
            ],
            priority: 90
        },
        estimatedDuration: '60-240 seconds',
        tokenEstimate: '30,000-200,000 tokens'
    },
    {
        id: 'dependency_analyze',
        name: 'Dependency Analysis',
        description: 'Analyzes project dependencies for outdated packages, vulnerabilities, license issues, ' + 'and unused dependencies. Provides upgrade paths and compatibility insights.',
        category: 'quality',
        inputSchema: {
            type: 'object',
            properties: {
                path: {
                    type: 'string',
                    description: 'Path to package manifest',
                    default: '.'
                },
                checkOutdated: {
                    type: 'boolean',
                    description: 'Check for outdated packages',
                    default: true
                },
                checkVulnerabilities: {
                    type: 'boolean',
                    description: 'Check for known vulnerabilities',
                    default: true
                },
                checkLicenses: {
                    type: 'boolean',
                    description: 'Check license compatibility',
                    default: true
                },
                outputFormat: {
                    type: 'string',
                    enum: [
                        'json',
                        'markdown',
                        'text'
                    ],
                    description: 'Output format',
                    default: 'markdown'
                }
            },
            required: [
                'path'
            ]
        },
        outputSchema: {
            type: 'object',
            properties: {
                success: {
                    type: 'boolean'
                },
                summary: {
                    type: 'string'
                },
                outdated: {
                    type: 'array'
                },
                vulnerabilities: {
                    type: 'array'
                },
                licenseIssues: {
                    type: 'array'
                },
                unused: {
                    type: 'array'
                },
                upgradePaths: {
                    type: 'array'
                }
            }
        },
        disclosure: {
            level: 'standard',
            triggers: [
                'dependency',
                'dependencies',
                'packages',
                'npm',
                'outdated'
            ],
            priority: 70
        },
        estimatedDuration: '20-90 seconds',
        tokenEstimate: '5,000-50,000 tokens'
    },
    {
        id: 'coverage_assess',
        name: 'Test Coverage Assessment',
        description: 'Assesses test coverage and identifies untested code paths, missing edge cases, ' + 'and testing gaps. Provides recommendations for improving test coverage.',
        category: 'quality',
        inputSchema: {
            type: 'object',
            properties: {
                path: {
                    type: 'string',
                    description: 'Path to source code',
                    default: '.'
                },
                testDirectory: {
                    type: 'string',
                    description: 'Path to test files'
                },
                focusAreas: {
                    type: 'array',
                    items: {
                        type: 'string'
                    },
                    description: 'Specific areas to assess'
                },
                outputFormat: {
                    type: 'string',
                    enum: [
                        'json',
                        'markdown',
                        'text'
                    ],
                    description: 'Output format',
                    default: 'markdown'
                },
                depth: {
                    type: 'string',
                    enum: [
                        'surface',
                        'moderate',
                        'deep',
                        'comprehensive'
                    ],
                    description: 'Assessment depth',
                    default: 'moderate'
                }
            },
            required: [
                'path'
            ]
        },
        outputSchema: {
            type: 'object',
            properties: {
                success: {
                    type: 'boolean'
                },
                summary: {
                    type: 'string'
                },
                coverageScore: {
                    type: 'number'
                },
                untestedPaths: {
                    type: 'array'
                },
                missingEdgeCases: {
                    type: 'array'
                },
                recommendations: {
                    type: 'array'
                }
            }
        },
        disclosure: {
            level: 'standard',
            triggers: [
                'coverage',
                'test',
                'testing',
                'untested',
                'edge cases'
            ],
            priority: 65
        },
        estimatedDuration: '30-120 seconds',
        tokenEstimate: '10,000-80,000 tokens'
    }
];
export const toolIdToAnalysisType = {
    codebase_analyze: 'codebase',
    architecture_map: 'architecture',
    security_scan: 'security',
    dependency_analyze: 'dependencies',
    coverage_assess: 'coverage'
};
export function getToolDefinition(toolId) {
    return GeminiCLIToolDefinitions.find((t)=>t.id === toolId);
}
export function getAllToolIds() {
    return GeminiCLIToolDefinitions.map((t)=>t.id);
}

//# sourceMappingURL=tools.js.map