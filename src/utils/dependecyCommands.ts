import * as vscode from 'vscode';
import { WorkspaceHelper } from './workSpaceHelper';
import { OutputChannelManager } from './outputChannelManager';
import { DependencyUsage, EXTENSION_CONSTANTS } from '../extension';
import { DependencyHealthChecker } from './dependecyHealthChecker';
import { DependencyAnalyzer } from './dependecyAnalyzer';
export class DependencyCommands {
    static async checkDependencyHealth(): Promise<void> {
        if (!WorkspaceHelper.checkFlutterProject()) {
            return;
        }

        const channel = OutputChannelManager.getChannel(EXTENSION_CONSTANTS.OUTPUT_CHANNELS.HEALTH_CHECKER);

        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'Checking Dependency Health',
            cancellable: false
        }, async (progress) => {
            try {
                progress.report({ message: 'Analyzing dependencies...' });
                const results = await DependencyHealthChecker.checkDependencyHealth();
                OutputChannelManager.formatOutput(channel, 'Dependency Health Check Results', results);
                channel.show();
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : EXTENSION_CONSTANTS.MESSAGES.ERRORS.UNKNOWN_ERROR;
                vscode.window.showErrorMessage(`Error checking dependency health: ${errorMessage}`);
            }
        });
    }

    static async checkOutdatedDependencies(): Promise<void> {
        if (!WorkspaceHelper.checkFlutterProject()) {
            return;
        }

        const channel = OutputChannelManager.getChannel(EXTENSION_CONSTANTS.OUTPUT_CHANNELS.DEPENDENCY_ANALYZER);

        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'Checking Dependencies',
            cancellable: false
        }, async (progress) => {
            try {
                progress.report({ message: 'Analyzing dependencies...' });
                const outdatedDeps = await DependencyAnalyzer.checkOutdatedDependencies();
                OutputChannelManager.formatOutput(channel, 'Outdated Dependencies Analysis', outdatedDeps);
                channel.show();
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : EXTENSION_CONSTANTS.MESSAGES.ERRORS.UNKNOWN_ERROR;
                vscode.window.showErrorMessage(`Error checking dependencies: ${errorMessage}`);
            }
        });
    }

    static async showDependencyUsage(): Promise<void> {
        // Step 1: Check if the workspace is a Flutter project
        if (!WorkspaceHelper.checkFlutterProject()) {
            vscode.window.showWarningMessage('This is not a Flutter project.');
            return;
        }

        // Step 2: Show quick pick to choose between options
        const choice = await vscode.window.showQuickPick(EXTENSION_CONSTANTS.SEARCH_OPTIONS, {
            placeHolder: 'What would you like to search for?'
        });

        if (!choice) {
            vscode.window.showWarningMessage('No option selected.');
            return;
        }

        // Step 3: Create an Output Channel for displaying results
        const outputChannel = vscode.window.createOutputChannel('Dependency Usage Analyzer');
        outputChannel.show(); // Open the Output Channel

        // Step 4: Show progress notification while analyzing dependencies
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'Analyzing dependencies...',
            cancellable: true
        }, async (progress, token) => {
            try {
                // Step 5: Fetch dependencies from pubspec.yaml
                const dependencies = await DependencyAnalyzer.getDependenciesFromPubspec();
                console.log('Dependencies fetched:', dependencies); // Debugging log
                outputChannel.appendLine('Analyzing dependencies...\n');

                if (!dependencies || Object.keys(dependencies).length === 0) {
                    vscode.window.showInformationMessage('No dependencies found in pubspec.yaml.');
                    outputChannel.appendLine('No dependencies found in pubspec.yaml.');
                    return;
                }

                const usageResults: DependencyUsage = {};

                for (const [depName] of Object.entries(dependencies)) {
                    if (token.isCancellationRequested) {
                        vscode.window.showInformationMessage('Dependency analysis was canceled.');
                        outputChannel.appendLine('Dependency analysis was canceled.');
                        break;
                    }

                    // Step 6: Report progress for each dependency
                    progress.report({ message: `Analyzing ${depName}...` });
                    try {
                        // Step 7: Find dependency usage
                        const usageFiles = await DependencyAnalyzer.findDependencyUsage(depName);
                        console.log(`Usage files for ${depName}:`, usageFiles); // Debugging log

                        // Display the results in the output channel
                        if ((choice === 'Find Used Dependencies' && usageFiles.length > 0) ||
                            (choice === 'Find Unused Dependencies' && usageFiles.length === 0) ||
                            (choice === 'Find Both')) {
                            usageResults[depName] = usageFiles;

                            outputChannel.appendLine(`📦 Package: ${depName}`);
                            outputChannel.appendLine(`Used in: ${usageFiles.length} files\n`);
                        }
                    } catch (error) {
                        console.error(`Error analyzing ${depName}:`, error);
                        outputChannel.appendLine(`❌ Error analyzing ${depName}`);
                    }
                }

                outputChannel.appendLine('Analysis complete!');

            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : EXTENSION_CONSTANTS.MESSAGES.ERRORS.UNKNOWN_ERROR;
                vscode.window.showErrorMessage(`Error analyzing dependencies: ${errorMessage}`);
                console.error(`Error during analysis: ${error}`); // Debugging log
                outputChannel.appendLine(`Error: ${errorMessage}`);
            }
        });
    }

}

