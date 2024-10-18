import * as vscode from 'vscode';
import { exec } from 'child_process';
import { DependencyUsage, EXTENSION_CONSTANTS, PubspecDependencies } from '../extension';
import { WorkspaceHelper } from './workSpaceHelper';
import { FileHelper } from './fileHelper';

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

