// dependencyHealth.ts
import fetch from 'node-fetch';
import * as vscode from 'vscode';
import { getDependenciesFromPubspec } from './dependencyManager';

interface PackageScore {
    grantedPoints: number;
    maxPoints: number;
    likeCount: number;
    popularityScore: number;
    lastUpdated: string;
}

interface PackageMetrics {
    scorecard: {
        packageName: string;
        runtimeVersion: string;
        updated: string;
        packageVersion: string;
        scores: {
            like: number;
            popularity: number;
            maintenance: number;
            health: number;
        };
    };
}

export async function getDependencyHealth(packageName: string) {
    try {
        // URLs to fetch package scores and metrics
        const scoreUrl = `https://pub.dev/api/packages/${packageName}/score`;
        const metricsUrl = `https://pub.dartlang.org/packages/${packageName}/metrics`;

        const [scoreResponse, metricsResponse] = await Promise.all([
            fetch(scoreUrl),
            fetch(metricsUrl)
        ]);

        // Initialize scores as 'N/A'
        let popularity = 'N/A';
        let health = 'N/A';
        let maintenance = 'N/A';

        // Fetch scores from the first endpoint
        if (scoreResponse.ok) {
            const scoreData = await scoreResponse.json();
            if (scoreData?.score) {
                const score = (scoreData.score * 100).toFixed(1);
                popularity = score; // Setting popularity from score data
                health = score;     // Assuming health is the same as score for simplicity
            }
        }

        // Fetch metrics from the second endpoint
        if (metricsResponse.ok) {
            const metricsData = await metricsResponse.json();
            if (metricsData?.score) {
                popularity = (metricsData.score.popularityScore * 100).toFixed(1);
                maintenance = ((metricsData.score.grantedPoints / metricsData.score.maxPoints) * 100).toFixed(1);
            }
        }

        // Attempt to fetch data from an alternative endpoint if both previous attempts failed
        if (popularity === 'N/A' && health === 'N/A' && maintenance === 'N/A') {
            const altUrl = `https://pub.dev/api/packages/${packageName}`;
            const altResponse = await fetch(altUrl);

            if (altResponse.ok) {
                const altData = await altResponse.json();
                if (altData?.latest?.pubspec) {
                    const lastUpdated = new Date(altData.latest.published);
                    const now = new Date();
                    const monthsDiff = (now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60 * 24 * 30);

                    // Calculate maintenance and health scores
                    maintenance = (Math.max(0, 100 - (monthsDiff * 5))).toFixed(1); // Decrease score by 5 points per month
                    health = altData.latest.pubspec.homepage ? '70.0' : '50.0'; // Basic health check based on homepage presence
                    popularity = '50.0'; // Default popularity
                }
            }
        }

        return { popularity, health, maintenance };

    } catch (error) {
        console.error(`Error fetching health data for ${packageName}:`, error);
        return {
            popularity: 'N/A',
            health: 'N/A',
            maintenance: 'N/A'
        };
    }
}

export async function listDependenciesWithHealth() {
    const outputChannel = vscode.window.createOutputChannel('Flutter Dependency Analyzer');
    outputChannel.show();
    outputChannel.appendLine('Analyzing dependencies health...\n');

    try {
        const dependencies = getDependenciesFromPubspec();
        const totalDeps = Object.keys(dependencies).length;
        let processed = 0;

        // Process in smaller batches of 2 to avoid rate limiting
        const batchSize = 2;
        const entries = Object.entries(dependencies);

        for (let i = 0; i < entries.length; i += batchSize) {
            const batch = entries.slice(i, i + batchSize);

            await Promise.all(batch.map(async ([name, version]) => {
                try {
                    const health = await getDependencyHealth(name);
                    processed++;

                    // Construct a more informative output message
                    const scoreMessage = `
Package: ${name} (Version: ${version})
-----------------------------------------
Popularity: ${health.popularity}${health.popularity !== 'N/A' ? '%' : ''} 
  - This metric indicates how widely the package is used and liked by the community.

Health: ${health.health}${health.health !== 'N/A' ? '%' : ''} 
  - A higher score indicates that the package is actively maintained and has fewer issues.

Maintenance: ${health.maintenance}${health.maintenance !== 'N/A' ? '%' : ''} 
  - This score reflects the level of care the package receives from its maintainers. 
-----------------------------------------
                    `;

                    outputChannel.appendLine(scoreMessage.trim());

                    // Show progress in the status bar
                    vscode.window.setStatusBarMessage(
                        `Analyzing dependencies: ${processed}/${totalDeps}`,
                        2000
                    );
                } catch (error) {
                    console.error(`Error processing ${name}:`, error);
                    outputChannel.appendLine(
                        `${name} (${version})\n` +
                        `  Unable to fetch health data\n`
                    );
                }
            }));

            // Add a larger delay between batches to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 1500));
        }

        outputChannel.appendLine('\nAnalysis complete!');
        vscode.window.showInformationMessage('Dependency health analysis completed!');

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        vscode.window.showErrorMessage(`Error analyzing dependencies: ${errorMessage}`);
        outputChannel.appendLine(`\nError: ${errorMessage}`);
    }
}
