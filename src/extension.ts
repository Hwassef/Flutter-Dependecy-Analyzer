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
			vscode.window.showErrorMessage(`❌ Error checking for outdated dependencies: ${error instanceof Error ? error.message : 'Unknown error occurred.'}`);
		}
	});

	// Command: Show dependency usage insights with a loading indicator
	const showDependencyUsageCommand = vscode.commands.registerCommand('extension.listFlutterDependenciesWithUsage', async () => {
		if (!checkFlutterProject()) {
			return;
		}

		// Ask the user for their preference
		const options = ['Find Used Dependencies', 'Find Unused Dependencies', 'Find Both'];
		const choice = await vscode.window.showQuickPick(options, {
			placeHolder: 'What would you like to search for?',
		});

		if (!choice) {
			return; // If the user cancels the selection
		}

		// Progress Indicator: Show a loading indicator while the search is in progress
		await vscode.window.withProgress({
			location: vscode.ProgressLocation.Notification,
			title: 'Analyzing dependencies...',
			cancellable: true,
		}, async (progress, token) => {
			token.onCancellationRequested(() => {
				vscode.window.showWarningMessage('Dependency analysis canceled.');
			});

			// Get all dependencies from pubspec.yaml
			try {
				const dependencies = await getDependenciesFromPubspec();
				const outputChannel = vscode.window.createOutputChannel('Flutter Dependency Usage Insights');
				outputChannel.show();

				// Analyze dependencies based on the user's choice
				if (choice === 'Find Used Dependencies' || choice === 'Find Both') {
					progress.report({ message: '🔍 Searching for used dependencies...' });

					outputChannel.appendLine('🔍 --- Used Dependencies --- 🔍');
					outputChannel.appendLine('----------------------------');

					const tokenSource = new vscode.CancellationTokenSource();

					// Create a new object to store dependency names with arrays of usage files
					const usedDependencies: { [depName: string]: string[] } = {};

					// Iterate through the original dependencies object
					for (const [depName, version] of Object.entries(dependencies)) {
						// Assume `findDependencyUsage` is a function that returns a list of files where the dependency is used
						const usageFiles = await findDependencyUsage(depName);

						if (usageFiles.length > 0) {
							// Assign the array of usage files to the usedDependencies object
							usedDependencies[depName] = usageFiles;
						}
					}

					// Now pass the usedDependencies object to the function
					await showUsedDependenciesWithFiles(usedDependencies, tokenSource.token);
				}
				if (choice === 'Find Unused Dependencies' || choice === 'Find Both') {
					progress.report({ message: '🔍 Searching for unused dependencies...' });

					outputChannel.appendLine('\n❌ --- Unused Dependencies --- ❌');
					outputChannel.appendLine('------------------------------');

					for (const [depName] of Object.entries(dependencies)) {
						if (token.isCancellationRequested) {
							break; // Stop the process if canceled
						}

						const usage = await findDependencyUsage(depName);
						if (usage.length === 0) {
							outputChannel.appendLine(`📦 ${depName} is not used.`);
						}
					}
					outputChannel.appendLine('\n🎉 Search for unused dependencies is complete!');

				}

			} catch (error) {
				vscode.window.showErrorMessage(`❌ Error checking dependency usage: ${error instanceof Error ? error.message : 'Unknown error occurred.'}`);
			}

			progress.report({ message: 'Completed dependency analysis.' });
		});
	});

	// Register all commands for proper disposal upon deactivation
	context.subscriptions.push(
		listDependenciesCommand,
		checkOutdated,
		showDependencyUsageCommand
	);
}

// Clean up on extension deactivation
export function deactivate() { }

/**
 * Function to get dependencies from pubspec.yaml
 */
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

/**
 * Function to check for outdated dependencies
 */
async function checkOutdatedDependenciesCommand(): Promise<string[]> {
	return new Promise((resolve, reject) => {
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
/**
 * Function to find the usage of a dependency across the workspace
 * with formatted console output
 */

async function findDependencyUsage(dependencyName: string): Promise<string[]> {
	const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath; // Get the project folder
	if (!workspaceFolder) {
		console.warn('No workspace folder found.');
		return []; // Return an empty array if no workspace folder is found
	}

	const startTime = Date.now();

	console.log('\n' + '='.repeat(50));
	console.log(`🔍 Searching for dependency: "${dependencyName}"`);
	console.log('='.repeat(50));

	// Fixed regex pattern with proper escaping
	const searchPattern = new RegExp(`(?:^|\\n)\\s*import[^'""\`]*['""\`].*${dependencyName}.*['""\`]`, 'im');

	try {
		// Get all Dart files
		const files = await vscode.workspace.findFiles(
			'**/*.dart',
			'**/build/**', // Exclude build directory
			5000 // Limit to prevent memory issues with extremely large workspaces
		);

		console.log(`📁 Scanning ${files.length} Dart files...\n`);

		// Process files in parallel using Promise.all
		const results = await Promise.all(
			files.map(async (file) => {
				try {
					const fileContent = await vscode.workspace.fs.readFile(file);
					const text = Buffer.from(fileContent).toString('utf8');

					// Check your condition for text, e.g., `searchPattern.test(text)`
					if (searchPattern.test(text)) {
						return file.fsPath.replace(workspaceFolder, ''); // Return the relative path
					}
				} catch (error) {
					console.warn(`⚠️ Error reading file ${file.fsPath}:`, error);
				}
				return null; // Ensure null is returned if no match
			})
		);

		// Filter out null values
		// After filtering out null values
		const matchingFiles = results.filter((path): path is string => path !== null);
		const endTime = Date.now();
		const duration = ((endTime - startTime) / 1000).toFixed(2);

		// Format and display results
		console.log('-'.repeat(50));
		if (matchingFiles.length === 0) {
			console.log('❌ No usage found for this dependency');
		} else {
			console.log(`✅ Found ${matchingFiles.length} file(s) using "${dependencyName}":`);
			matchingFiles.forEach((file, index) => {
				// Log the relative path instead of the full path
				console.log(`${index + 1}. 📄 ${file}`); // file should already be relative here
			});
		}

		console.log('-'.repeat(50));
		console.log(`⏱️ Search completed in ${duration} seconds`);
		console.log('🏁 End of search results\n');

		return matchingFiles;
	} catch (error) {
		console.error('\n❌ Error in findDependencyUsage:', error);
		console.log('🏁 Search terminated due to error\n');
		throw error;
	}
}
async function showUsedDependenciesWithFiles(dependencies: { [depName: string]: string[] }, token: vscode.CancellationToken) {
	const outputChannel = vscode.window.createOutputChannel('Used Dependencies');
	outputChannel.show();

	for (const [depName, files] of Object.entries(dependencies)) {
		if (token.isCancellationRequested) {
			vscode.window.showInformationMessage('🚫 Search canceled.');
			return;
		}

		// Display the used dependencies and the corresponding files
		if (files.length > 0) {
			outputChannel.appendLine(`✅ ${depName} is used in the following files:`);
			files.forEach((file) => {
				console.log("file clean or not ?", file)
				outputChannel.appendLine(`📄 ${file}`);
			});
		}
	}

	outputChannel.appendLine('\n🎉 Analysis complete! Your used dependencies have been found and displayed in full glory.');
}
class DependencyTreeItem extends vscode.TreeItem {
	constructor(
		public readonly label: string,
		public readonly collapsibleState: vscode.TreeItemCollapsibleState,
		public readonly command?: vscode.Command
	) {
		super(label, collapsibleState);
	}
}

class DependencyTreeDataProvider implements vscode.TreeDataProvider<DependencyTreeItem> {
	private _onDidChangeTreeData: vscode.EventEmitter<DependencyTreeItem | undefined | void> = new vscode.EventEmitter<DependencyTreeItem | undefined | void>();
	readonly onDidChangeTreeData: vscode.Event<DependencyTreeItem | undefined | void> = this._onDidChangeTreeData.event;

	constructor(private dependencies: { [depName: string]: string[] }) { }

	getTreeItem(element: DependencyTreeItem): vscode.TreeItem {
		return element;
	}

	getChildren(element?: DependencyTreeItem): Thenable<DependencyTreeItem[]> {
		if (element) {
			// If element is a dependency, show the files where it's used
			const files = this.dependencies[element.label] || [];
			return Promise.resolve(files.map(file => new DependencyTreeItem(file, vscode.TreeItemCollapsibleState.None)));
		} else {
			// If there's no element, show the dependencies
			return Promise.resolve(
				Object.keys(this.dependencies).map(depName =>
					new DependencyTreeItem(depName, vscode.TreeItemCollapsibleState.Collapsed)
				)
			);
		}
	}

	refresh(): void {
		this._onDidChangeTreeData.fire();
	}
}
