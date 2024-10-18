import * as vscode from 'vscode';
import { WorkspaceHelper } from './workSpaceHelper';
import { OutputChannelManager } from './outputChannelManager';
import { DependencyUsage, EXTENSION_CONSTANTS } from '../extension';
import { DependencyHealthChecker } from './dependecyHealthChecker';
import { DependencyTreeDataProvider } from './treeView';
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
        if (!WorkspaceHelper.checkFlutterProject()) {
            return;
        }

        const choice = await vscode.window.showQuickPick(EXTENSION_CONSTANTS.SEARCH_OPTIONS, {
            placeHolder: 'What would you like to search for?'
        });

        if (!choice) {
            return;
        }

        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'Analyzing dependencies...',
            cancellable: true
        }, async (progress, token) => {
            try {
                const dependencies = await DependencyAnalyzer.getDependenciesFromPubspec();
                const usageResults: DependencyUsage = {};

                for (const [depName] of Object.entries(dependencies)) {
                    if (token.isCancellationRequested) {
                        break;
                    }
                    progress.report({ message: `Analyzing ${depName}...` });
                    const usageFiles = await DependencyAnalyzer.findDependencyUsage(depName);

                    if ((choice === 'Find Used Dependencies' && usageFiles.length > 0) ||
                        (choice === 'Find Unused Dependencies' && usageFiles.length === 0) ||
                        (choice === 'Find Both')) {
                        usageResults[depName] = usageFiles;
                    }
                }

                const treeDataProvider = new DependencyTreeDataProvider(usageResults);
                vscode.window.createTreeView('flutterDependencies', {
                    treeDataProvider
                });
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : EXTENSION_CONSTANTS.MESSAGES.ERRORS.UNKNOWN_ERROR;
                vscode.window.showErrorMessage(`Error analyzing dependencies: ${errorMessage}`);
            }
        });
    }
}

