// lib/ai/metricAnalyzer.ts

import { logger } from '@/lib/logger';

/**
 * AI-Powered Metric Analyzer
 * Uses Claude API to analyze metrics and provide root cause analysis
 * 
 * Features:
 * - Root cause identification
 * - Pattern recognition
 * - Correlation analysis
 * - Actionable recommendations
 * - Performance optimization suggestions
 */

interface AnalysisContext {
    metrics: any;
    issues: string[];
    config: any;
    resourceType?: string;
}

/**
 * Analyze metrics using Claude AI for intelligent root cause analysis
 */
export async function analyzeMetricsWithAI(context: AnalysisContext): Promise<string> {
    try {
        // Prepare the prompt for Claude
        const prompt = buildAnalysisPrompt(context);

        // Call Claude API
        const analysis = await callClaudeAPI(prompt);

        return analysis;
    } catch (error: any) {
        logger.error('AI analysis failed:', error);
        return 'AI analysis unavailable - please check logs for details';
    }
}

/**
 * Build detailed prompt for Claude AI
 */
function buildAnalysisPrompt(context: AnalysisContext): string {
    const { metrics, issues, config, resourceType } = context;

    // Format metrics into readable structure
    const metricsText = Object.entries(metrics)
        .map(([key, value]: [string, any]) => {
            return `
Metric: ${key}
- Current: ${value.current}
- Average: ${value.average}
- Max: ${value.max}
- Min: ${value.min}
- Trend: ${value.trend}
- Unit: ${value.unit || 'N/A'}`;
        })
        .join('\n\n');

    return `You are an expert cloud infrastructure engineer analyzing metrics from a ${resourceType || 'cloud'} resource.

CURRENT METRICS:
${metricsText}

DETECTED ISSUES:
${issues.length > 0 ? issues.join('\n- ') : 'No critical issues detected'}

RESOURCE CONTEXT:
- Resource Type: ${resourceType || 'Unknown'}
- Configuration: ${JSON.stringify(config.thresholds || {}, null, 2)}

Please provide:
1. ROOT CAUSE ANALYSIS: What is likely causing these metrics patterns?
2. CORRELATION INSIGHTS: Are there any correlations between metrics that suggest specific problems?
3. IMMEDIATE ACTIONS: What should be done right now?
4. PREVENTIVE MEASURES: How can we prevent this from happening again?

Keep the analysis concise but actionable (max 500 words). Focus on the most critical insights.`;
}

/**
 * Call Claude API for analysis
 */
async function callClaudeAPI(prompt: string): Promise<string> {
    try {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'anthropic-version': '2023-06-01',
                'x-api-key': process.env.ANTHROPIC_API_KEY || ''
            },
            body: JSON.stringify({
                model: 'claude-sonnet-4-20250514',
                max_tokens: 1024,
                messages: [
                    {
                        role: 'user',
                        content: prompt
                    }
                ]
            })
        });

        if (!response.ok) {
            throw new Error(`Claude API error: ${response.status}`);
        }

        const data = await response.json();

        // Extract text from response
        const analysis = data.content
            .filter((block: any) => block.type === 'text')
            .map((block: any) => block.text)
            .join('\n');

        return analysis || 'No analysis generated';
    } catch (error: any) {
        logger.error('Claude API call failed:', error);
        throw error;
    }
}

/**
 * Analyze historical patterns to detect anomalies
 */
export async function detectAnomalies(
    currentMetrics: any,
    historicalMetrics: any[]
): Promise<{
    anomalies: string[];
    confidence: number;
    recommendations: string[];
}> {
    const anomalies: string[] = [];
    const recommendations: string[] = [];

    // Calculate baseline from historical data
    for (const [metricName, currentValue] of Object.entries(currentMetrics)) {
        const historical = historicalMetrics
            .map(h => h[metricName])
            .filter(v => v !== undefined && v !== null);

        if (historical.length < 5) continue; // Need at least 5 data points

        const mean = historical.reduce((a, b) => a + b, 0) / historical.length;
        const variance = historical.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / historical.length;
        const stdDev = Math.sqrt(variance);

        // Check if current value is outside 2 standard deviations (95% confidence)
        const current = (currentValue as any).current || 0;
        const zScore = Math.abs((current - mean) / stdDev);

        if (zScore > 2) {
            anomalies.push(
                `${metricName}: Current value (${current.toFixed(2)}) is ${zScore.toFixed(1)}σ from baseline (${mean.toFixed(2)})`
            );

            if (current > mean) {
                recommendations.push(`Investigate spike in ${metricName}`);
            } else {
                recommendations.push(`Check for degradation in ${metricName}`);
            }
        }
    }

    return {
        anomalies,
        confidence: anomalies.length > 0 ? 0.95 : 0,
        recommendations
    };
}

/**
 * Correlate multiple metrics to find relationships
 */
export function correlateMetrics(metrics: any): {
    correlations: Array<{ metric1: string; metric2: string; correlation: number; insight: string }>;
} {
    const correlations: any[] = [];
    const metricNames = Object.keys(metrics);

    // Look for common correlation patterns
    for (let i = 0; i < metricNames.length; i++) {
        for (let j = i + 1; j < metricNames.length; j++) {
            const metric1 = metricNames[i];
            const metric2 = metricNames[j];

            const insight = findCorrelationInsight(metric1, metric2, metrics);

            if (insight) {
                correlations.push({
                    metric1,
                    metric2,
                    correlation: 0.8, // Simplified - in production, calculate actual correlation
                    insight
                });
            }
        }
    }

    return { correlations };
}

/**
 * Find insights based on metric correlations
 */
function findCorrelationInsight(metric1: string, metric2: string, metrics: any): string | null {
    const m1 = metrics[metric1];
    const m2 = metrics[metric2];

    if (!m1 || !m2) return null;

    // CPU and Memory correlation
    if (metric1.includes('cpu') && metric2.includes('memory')) {
        if (m1.current > 80 && m2.current > 80) {
            return 'High CPU and Memory together suggests resource exhaustion - consider scaling up';
        }
    }

    // Network and CPU correlation
    if (metric1.includes('network') && metric2.includes('cpu')) {
        if (m1.trend === 'increasing' && m2.trend === 'increasing') {
            return 'Network and CPU both increasing - possible traffic spike or DDoS';
        }
    }

    // Response time and errors correlation
    if (metric1.includes('response') && metric2.includes('error')) {
        if (m1.current > 2000 && m2.current > 0) {
            return 'High response time with errors - likely backend service degradation';
        }
    }

    return null;
}

/**
 * Generate performance optimization recommendations
 */
export function generateOptimizationRecommendations(
    metrics: any,
    resourceType: string
): string[] {
    const recommendations: string[] = [];

    // CPU optimization
    const cpuMetric = Object.entries(metrics).find(([k]) => k.toLowerCase().includes('cpu'))?.[1] as any;
    if (cpuMetric) {
        if (cpuMetric.average > 70) {
            recommendations.push('Enable auto-scaling to handle CPU spikes automatically');
            recommendations.push('Profile application to identify CPU-intensive operations');
        } else if (cpuMetric.average < 20) {
            recommendations.push('Consider downsizing to a smaller instance to reduce costs');
        }
    }

    // Memory optimization
    const memMetric = Object.entries(metrics).find(([k]) => k.toLowerCase().includes('memory'))?.[1] as any;
    if (memMetric) {
        if (memMetric.trend === 'increasing') {
            recommendations.push('Investigate potential memory leak - memory usage is consistently increasing');
        }
    }

    // Response time optimization
    const respMetric = Object.entries(metrics).find(([k]) => k.toLowerCase().includes('response'))?.[1] as any;
    if (respMetric && respMetric.average > 1000) {
        recommendations.push('Enable caching to reduce response times');
        recommendations.push('Use CDN for static assets');
        recommendations.push('Optimize database queries and add indexes');
    }

    // Resource-specific recommendations
    if (resourceType === 'appservice' || resourceType === 'cloudrun') {
        recommendations.push('Consider using connection pooling for database connections');
        recommendations.push('Implement request throttling to prevent overload');
    }

    if (resourceType === 'function' || resourceType === 'cloudfunctions') {
        recommendations.push('Optimize cold start time by reducing dependencies');
        recommendations.push('Consider using provisioned concurrency for critical functions');
    }

    return recommendations.slice(0, 5); // Return top 5 recommendations
}