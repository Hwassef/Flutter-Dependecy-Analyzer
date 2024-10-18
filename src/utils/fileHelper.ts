
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { EXTENSION_CONSTANTS } from '../extension';

export class FileHelper {
    static async readPubspec(workspaceFolder: string): Promise<any> {
        const pubspecPath = path.join(workspaceFolder, 'pubspec.yaml');
        if (!fs.existsSync(pubspecPath)) {
            throw new Error(EXTENSION_CONSTANTS.MESSAGES.ERRORS.NO_PUBSPEC);
        }
        const fileContent = fs.readFileSync(pubspecPath, 'utf8');
        return yaml.load(fileContent);
    }

    static async readFileContent(filePath: string): Promise<string> {
        const fileContent = await vscode.workspace.fs.readFile(vscode.Uri.file(filePath));
        return Buffer.from(fileContent).toString('utf8');
    }
}




