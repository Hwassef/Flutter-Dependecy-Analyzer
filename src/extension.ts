// src/types.ts
import * as vscode from 'vscode';
import { DependencyCommands } from './utils/dependecyCommands';

export interface DependencyUsage {
	[depName: string]: string[];
}

export interface PubspecDependencies {
	[key: string]: string;
}

export interface DependencyAnalysisProgress {
	message: string;
	increment?: number;
}

// src/constants.ts
export const EXTENSION_CONSTANTS = {
	OUTPUT_CHANNELS: {
		DEPENDENCY_ANALYZER: 'Flutter Dependency Analyzer',
		DEPENDENCY_USAGE: 'Flutter Dependency Usage Insights',
		USED_DEPENDENCIES: 'Used Dependencies',
		HEALTH_CHECKER: 'Flutter Dependency Health'
	},
	MESSAGES: {
		ERRORS: {
			NO_WORKSPACE: '⚠️ Please open a Flutter project folder to use this extension.',
			NO_PUBSPEC: '❌ No pubspec.yaml file found. Please ensure you are in a Flutter project directory.',
			UNKNOWN_ERROR: 'Unknown error occurred'
		},
		SUCCESS: {
			ANALYSIS_COMPLETE: '✨ Analysis Complete!',
			HEALTH_CHECK_COMPLETE: '🎉 Health check completed successfully!'
		}
	},
	FILE_PATTERNS: {
		DART_FILES: '**/*.dart',
		BUILD_DIR: '**/build/**'
	},
	MAX_FILES: 5000,
	SEARCH_OPTIONS: ['Find Used Dependencies', 'Find Unused Dependencies', 'Find Both']
};

export function activate(context: vscode.ExtensionContext) {
	const commands = [
		vscode.commands.registerCommand(
			'extension.dependenciesHealthChecker',
			DependencyCommands.checkDependencyHealth
		),
		vscode.commands.registerCommand(
			'extension.checkOutdatedDependencies',
			DependencyCommands.checkOutdatedDependencies
		),
		vscode.commands.registerCommand(
			'extension.listFlutterDependenciesWithUsage',
			DependencyCommands.showDependencyUsage
		)
	];

	context.subscriptions.push(...commands);
}

export function deactivate() { }