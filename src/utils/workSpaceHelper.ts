import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { EXTENSION_CONSTANTS } from '../extension';

export class WorkspaceHelper {
    static getWorkspaceFolder(): string {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
            throw new Error(EXTENSION_CONSTANTS.MESSAGES.ERRORS.NO_WORKSPACE);
        }
        return workspaceFolders[0].uri.fsPath;
    }

    static checkFlutterProject(): boolean {
        try {
            const workspaceFolder = this.getWorkspaceFolder();
            const pubspecPath = path.join(workspaceFolder, 'pubspec.yaml');
            return fs.existsSync(pubspecPath);
        } catch (error) {
            vscode.window.showErrorMessage(EXTENSION_CONSTANTS.MESSAGES.ERRORS.NO_WORKSPACE);
            return false;
        }
    }
}
