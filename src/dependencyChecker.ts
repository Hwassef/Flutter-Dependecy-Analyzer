import * as vscode from 'vscode';
import { exec } from 'child_process';

export function checkOutdatedDependencies() {
    const outputChannel = vscode.window.createOutputChannel('Flutter Dependency Analyzer');
    outputChannel.show();
    outputChannel.appendLine('Checking for outdated dependencies...');

    exec('flutter pub outdated', (error, stdout, stderr) => {
        if (error) {
            vscode.window.showErrorMessage(`Error: ${stderr}`);
            return;
        }

        outputChannel.appendLine(stdout);
    });
}
export function checkUnusedDependencies() {
    const outputChannel = vscode.window.createOutputChannel('Flutter Dependency Analyzer');
    outputChannel.show();
    outputChannel.appendLine('Checking for unused dependencies...');

    exec('dart pub deps --unused', (error, stdout, stderr) => {
        if (error) {
            vscode.window.showErrorMessage(`Error: ${stderr}`);
            return;
        }

        outputChannel.appendLine(stdout);
    });
}
