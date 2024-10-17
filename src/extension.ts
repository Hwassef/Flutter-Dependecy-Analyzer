import * as vscode from 'vscode';
import { exec } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import fetch from 'node-fetch';

export function activate(context: vscode.ExtensionContext) {
	/** Helper function to check if the current workspace is a Flutter project */
	function checkFlutterProject(): boolean {
		const workspaceFolders = vscode.workspace.workspaceFolders;
		if (!workspaceFolders) {
			vscode.window.showErrorMessage('⚠️ Please open a Flutter project folder to use this extension.');
			return false;
		}
		return true;
	}

	// Command: List all Flutter dependencies from pubspec.yaml
	const listDependenciesCommand = vscode.commands.registerCommand('extension.listFlutterDependencies', async () => {
		if (!checkFlutterProject()) {
			return;
		}

		try {
			const dependencies = await getDependenciesFromPubspec();
			const outputChannel = vscode.window.createOutputChannel('Flutter Dependency Analyzer');
			outputChannel.show();
			outputChannel.appendLine('💡 --- Flutter Dependencies Found --- 💡');
			outputChannel.appendLine('---------------------------------------');

			Object.entries(dependencies).forEach(([name, version]) => {
				outputChannel.appendLine(`📦 ${name}: \t${version}`);
			});

			outputChannel.appendLine('---------------------------------------');
		} catch (error) {
			vscode.window.showErrorMessage(`❌ Error fetching dependencies: ${error instanceof Error ? error.message : 'Unknown error occurred.'}`);
		}
	});

	// Command: Check for outdated dependencies
	const checkOutdated = vscode.commands.registerCommand('extension.checkOutdatedDependencies', async () => {
		if (!checkFlutterProject()) {
			return;
		}

		try {
			const outdatedDeps = await checkOutdatedDependenciesCommand();
			const outputChannel = vscode.window.createOutputChannel('Flutter Dependency Analyzer');
			outputChannel.show();
			outputChannel.appendLine('🔄 --- Outdated Dependencies --- 🔄');
			outputChannel.appendLine('----------------------------------');

			if (outdatedDeps.length > 0) {
				outputChannel.appendLine(outdatedDeps.join('\n'));
			} else {
				outputChannel.appendLine('All dependencies are up to date.');
			}
		} catch (error) {
			vscode.window.showErrorMessage(`❌ Error checking for outdated dependenciessssssssss: ${error instanceof Error ? error.message : 'Unknown error occurred.'}`);
		}
	});

	// Command: List dependencies with health scores (popularity, maintenance, etc.)
	const listDependenciesWithHealth = vscode.commands.registerCommand('extension.listFlutterDependenciesWithHealth', async () => {
		if (!checkFlutterProject()) {
			return;
		}

		const outputChannel = vscode.window.createOutputChannel('Flutter Dependency Analyzer');
		outputChannel.show();
		outputChannel.appendLine('📊 --- Dependency Health Scores --- 📊');
		outputChannel.appendLine('------------------------------------');

		try {
			const dependencies = await getDependenciesFromPubspec();
			const totalDeps = Object.keys(dependencies).length;
			let processed = 0;
			const batchSize = 2;
			const entries = Object.entries(dependencies);

			for (let i = 0; i < entries.length; i += batchSize) {
				const batch = entries.slice(i, i + batchSize);
				await Promise.all(batch.map(async ([name, version]) => {
					try {
						const health = await getDependencyHealth(name);
						processed++;

						const scoreMessage = `
📦 Package: ${name} (Version: ${version})
-----------------------------------------
🔥 Popularity: ${health.popularity} 
👍 Likes: ${health.likes} 
🏅 Pub Points: ${health.pubPoints} 
-----------------------------------------
`;
						outputChannel.appendLine(scoreMessage.trim());
						vscode.window.setStatusBarMessage(`Analyzing dependencies: ${processed}/${totalDeps}`, 2000);
					} catch (error) {
						console.error(`Error processing ${name}:`, error);
						outputChannel.appendLine(`❌ ${name} (${version})\n  Unable to fetch health data\n`);
					}
				}));

				await new Promise(resolve => setTimeout(resolve, 1500));
			}

			outputChannel.appendLine('\nAnalysis complete!');

			// Check for outdated dependencies
			try {
				const outdatedDeps = await checkOutdatedDependenciesCommand();
				outputChannel.appendLine('------------------------------------');
				outputChannel.appendLine('🔄 Outdated Dependencies:');
				if (outdatedDeps.length > 0) {
					outputChannel.appendLine(outdatedDeps.join('\n'));
				} else {
					outputChannel.appendLine('All dependencies are up to date.');
				}
			} catch (error) {
				outputChannel.appendLine('❌ Error checking for outdated dependencies.');
				console.error('Error checking dependencies:', error);
			}

			vscode.window.showInformationMessage('Dependency health analysis completed!');
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : 'Unknown error';
			vscode.window.showErrorMessage(`Error analyzing dependencies: ${errorMessage}`);
			outputChannel.appendLine(`\nError: ${errorMessage}`);
		}
	});

	// Register all commands for proper disposal upon deactivation
	context.subscriptions.push(
		listDependenciesCommand,
		checkOutdated,
		listDependenciesWithHealth
	);
}

// Clean up on extension deactivation
export function deactivate() { }

// Function to get dependencies from pubspec.yaml
export async function getDependenciesFromPubspec(): Promise<Record<string, string>> {
	const workspaceFolders = vscode.workspace.workspaceFolders;

	if (workspaceFolders) {
		const pubspecPath = path.join(workspaceFolders[0].uri.fsPath, 'pubspec.yaml');

		if (!fs.existsSync(pubspecPath)) {
			vscode.window.showErrorMessage('❌ No pubspec.yaml file found. Please ensure you are in a Flutter project directory.');
			return {};
		}

		const fileContent = fs.readFileSync(pubspecPath, 'utf8');
		const pubspec = yaml.load(fileContent) as { dependencies?: Record<string, string> };
		return pubspec.dependencies || {};
	}
	return {};
}

// Function to check for outdated dependencies

async function checkOutdatedDependenciesCommand(): Promise<string[]> {
	return new Promise((resolve, reject) => {
		// Get the first workspace folder
		const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;

		if (!workspaceFolder) {
			reject('No workspace folder found');
			return;
		}

		exec('dart pub outdated', { cwd: workspaceFolder }, (error, stdout, stderr) => {
			if (error) {
				console.error(`Error executing 'dart pub outdated':`, stderr);
				reject(stderr);
				return;
			}
			const outdatedDependencies = stdout.split('\n').filter(line => line.trim() !== '');
			resolve(outdatedDependencies);
		});
	});
}


// Function to get dependency health
export async function getDependencyHealth(packageName: string) {
	try {
		const scoreUrl = `https://pub.dev/api/packages/${packageName}/score`;
		const scoreResponse = await fetch(scoreUrl);

		let popularity = 'N/A';
		let likes = 'N/A';
		let pubPoints = 'N/A';

		if (scoreResponse.ok) {
			const scoreData = await scoreResponse.json();
			if (scoreData?.popularityScore) {
				popularity = (scoreData.popularityScore * 100).toFixed(2) + '%';
			}
			if (scoreData?.likeCount) {
				likes = scoreData.likeCount.toString();
			}
			if (scoreData?.grantedPoints && scoreData?.maxPoints) {
				pubPoints = `${scoreData.grantedPoints}/${scoreData.maxPoints}`;
			}

		}

		return { popularity, likes, pubPoints };
	} catch (error) {
		console.error(`Error fetching health data for ${packageName}:`, error);
		return {
			popularity: 'N/A',
			likes: 'N/A',
			pubPoints: 'N/A',
		};
	}
}
