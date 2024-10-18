import * as vscode from 'vscode';
import { exec } from 'child_process';
import { EXTENSION_CONSTANTS, PubspecDependencies } from '../extension';
import { WorkspaceHelper } from './workSpaceHelper';
import { FileHelper } from './fileHelper';
import fetch from 'node-fetch';
import { getDependenciesFromPubspec } from '../dependencyManager';


export class DependencyAnalyzer {
    static async getDependenciesFromPubspec(): Promise<PubspecDependencies> {
        const workspaceFolder = WorkspaceHelper.getWorkspaceFolder();
        const pubspec = await FileHelper.readPubspec(workspaceFolder);
        return pubspec.dependencies || {};
    }

    static async checkOutdatedDependencies(): Promise<string[]> {
        return new Promise((resolve, reject) => {
            const workspaceFolder = WorkspaceHelper.getWorkspaceFolder();
            exec('dart pub outdated', { cwd: workspaceFolder }, (error, stdout, stderr) => {
                if (error) {
                    reject(stderr);
                    return;
                }
                const outdatedDependencies = stdout
                    .split('\n')
                    .filter(line => line.trim() !== '');
                resolve(outdatedDependencies);
            });
        });
    }

    static async findDependencyUsage(dependencyName: string): Promise<string[]> {
        const workspaceFolder = WorkspaceHelper.getWorkspaceFolder();
        const searchPattern = new RegExp(
            `(?:^|\\n)\\s*import[^'""\`]*['""\`].*${dependencyName}.*['""\`]`,
            'im'
        );

        const files = await vscode.workspace.findFiles(
            EXTENSION_CONSTANTS.FILE_PATTERNS.DART_FILES,
            EXTENSION_CONSTANTS.FILE_PATTERNS.BUILD_DIR,
            EXTENSION_CONSTANTS.MAX_FILES
        );

        const results = await Promise.all(
            files.map(async (file) => {
                try {
                    const text = await FileHelper.readFileContent(file.fsPath);
                    return searchPattern.test(text) ? file.fsPath.replace(workspaceFolder, '') : null;
                } catch (error) {
                    console.warn(`⚠️ Error reading file ${file.fsPath}:`, error);
                    return null;
                }
            })
        );

        return results.filter((path): path is string => path !== null);
    }

    static async analyzeDependencyHealth(dependencies: PubspecDependencies): Promise<string[]> {
        const results: string[] = [];
        for (const [name, version] of Object.entries(dependencies)) {
            const usage = await this.findDependencyUsage(name);
            const health = usage.length > 0 ? '✅ Used' : '⚠️ Unused';
            results.push(`${name}@${version}: ${health} (Found in ${usage.length} files)`);
        }
        return results;
    }
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
            quality: number;
        };
    };
}

export async function getDependencyHealth(packageName: string) {
    try {
        // URL to fetch package scores
        const scoreUrl = `https://pub.dev/api/packages/${packageName}/score`;

        const scoreResponse = await fetch(scoreUrl);

        // Initialize scores as 'N/A'
        let popularity = 'N/A';
        let likes = 'N/A';
        let pubPoints = 'N/A';
        let maintenance = 'N/A';
        let quality = 'N/A';

        // Fetch scores from the endpoint
        if (scoreResponse.ok) {
            const scoreData = await scoreResponse.json();

            // Update popularity based on the API response (0 to 100%)
            if (scoreData?.popularityScore) {
                popularity = (scoreData.popularityScore * 100).toFixed(2) + '%';
            }

            // Update likes count
            if (scoreData?.likeCount) {
                likes = scoreData.likeCount.toString();
            }

            // Update pub points (grantedPoints/maxPoints)
            if (scoreData?.grantedPoints && scoreData?.maxPoints) {
                pubPoints = `${scoreData.grantedPoints}/${scoreData.maxPoints}`;
            }

            // Update maintenance and quality (if available)
            if (scoreData?.maintenanceScore) {
                maintenance = (scoreData.maintenanceScore * 100).toFixed(2) + '%';
            }

            if (scoreData?.qualityScore) {
                quality = (scoreData.qualityScore * 100).toFixed(2) + '%';
            }
        }

        return { popularity, likes, pubPoints, maintenance, quality };

    } catch (error) {
        console.error(`Error fetching health data for ${packageName}:`, error);
        return {
            popularity: 'N/A',
            likes: 'N/A',
            pubPoints: 'N/A',
            maintenance: 'N/A',
            quality: 'N/A',
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
📦 Package: ${name} (Version: ${version})
-----------------------------------------
🔥 Popularity: ${health.popularity} 
👍 Likes: ${health.likes} 
🏅 Pub Points: ${health.pubPoints} 
-----------------------------------------
`;
                    outputChannel.appendLine(scoreMessage.trim());
                    vscode.window.setStatusBarMessage(
                        `Analyzing dependencies: ${processed}/${totalDeps}`,
                        2000
                    );
                } catch (error) {
                    console.error(`Error processing ${name}:`, error);
                    outputChannel.appendLine(
                        `❌ ${name} (${version})\n` +
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
