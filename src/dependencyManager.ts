import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';

export function getDependenciesFromPubspec(): Record<string, string> {
    const workspaceFolders = vscode.workspace.workspaceFolders;

    if (workspaceFolders) {
        const pubspecPath = path.join(workspaceFolders[0].uri.fsPath, 'pubspec.yaml');
        const fileContent = fs.readFileSync(pubspecPath, 'utf8');
        const pubspec = yaml.load(fileContent) as { dependencies?: Record<string, string> };
        return pubspec.dependencies || {};
    }
    return {};
}
