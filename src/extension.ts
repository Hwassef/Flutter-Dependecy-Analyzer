import * as vscode from 'vscode';
import { getDependenciesFromPubspec } from './dependencyManager';
import { checkUnusedDependencies, checkOutdatedDependencies } from './dependencyChecker';
import { getDependencyHealth } from './dependencyHealth';

export function activate(context: vscode.ExtensionContext) {
	// Function to check if the current workspace is a Flutter project
	function checkFlutterProject(): boolean {
		const workspaceFolders = vscode.workspace.workspaceFolders;
		if (!workspaceFolders) {
			vscode.window.showErrorMessage('Please open a Flutter project folder');
			return false;
		}
		return true;
	}

	// Command to list all Flutter dependencies
	const listDependenciesCommand = vscode.commands.registerCommand(
		'extension.listFlutterDependencies',
		async () => {
			if (!checkFlutterProject()) {
				return;
			}

			try {
				const dependencies = await getDependenciesFromPubspec();
				const outputChannel = vscode.window.createOutputChannel('Flutter Dependency Analyzer');
				outputChannel.show();

				// Header with separator line
				outputChannel.appendLine('--- Flutter Dependencies Found ---');
				outputChannel.appendLine('---------------------------------');

				// Loop through dependencies and display name and version
				Object.entries(dependencies).forEach(([name, version]) => {
					outputChannel.appendLine(` ${name}: \t${version}`);
				});

				// Separator line to mark the end
				outputChannel.appendLine('---------------------------------');
			} catch (error) {
				vscode.window.showErrorMessage(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
			}
		}
	);

	// Command to check for unused dependencies
	const checkUnused = vscode.commands.registerCommand('extension.checkUnusedDependencies', async () => {
		if (!checkFlutterProject()) {
			return;
		}

		await checkUnusedDependencies();
	});

	// Command to check for outdated dependencies
	const checkOutdated = vscode.commands.registerCommand('extension.checkOutdatedDependencies', async () => {
		if (!checkFlutterProject()) {
			return;
		}

		await checkOutdatedDependencies();
	});

	// Command to list dependencies with health scores
	const listDependenciesWithHealth = vscode.commands.registerCommand(
		'extension.listFlutterDependenciesWithHealth',
		async () => {
			if (!checkFlutterProject()) {
				return;
			}

			try {
				const dependencies = await getDependenciesFromPubspec();
				const outputChannel = vscode.window.createOutputChannel('Flutter Dependency Analyzer');
				outputChannel.show();

				// Header with separator line
				outputChannel.appendLine('--- Dependency Health Scores ---');
				outputChannel.appendLine('-------------------------------');

				for (const [name, version] of Object.entries(dependencies)) {
					try {
						const health = await getDependencyHealth(name);

						// Display package name and version
						outputChannel.appendLine(` ${name}: ${version}`);

						// Display health information with indentation
						outputChannel.appendLine(`\t Popularity: ${health.popularity}`);
						outputChannel.appendLine(`\t Health: ${health.health}`);
						outputChannel.appendLine(`\t Maintenance: ${health.maintenance}`);

						// Separator line to mark the end of each dependency info
						outputChannel.appendLine('-------------------------------');
					} catch (error) {
						// Handle error fetching health data
						outputChannel.appendLine(` ${name}: \t${version} - ⚠️ Error fetching health data`);
						outputChannel.appendLine('-------------------------------');
					}
				}
			} catch (error) {
				vscode.window.showErrorMessage(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
			}
		}
	);

	// Add all commands to subscriptions for proper disposal
	context.subscriptions.push(
		listDependenciesCommand,
		checkUnused,
		checkOutdated,
		listDependenciesWithHealth
	);
}

export function deactivate() { }