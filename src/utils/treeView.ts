import * as vscode from 'vscode';
import { DependencyUsage } from '../extension';
export class DependencyTreeItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly command?: vscode.Command
    ) {
        super(label, collapsibleState);
        this.tooltip = label;
        this.contextValue = 'dependency';
    }
}

export class DependencyTreeDataProvider implements vscode.TreeDataProvider<DependencyTreeItem> {
    private _onDidChangeTreeData = new vscode.EventEmitter<DependencyTreeItem | undefined | void>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

    constructor(private dependencies: DependencyUsage) { }

    getTreeItem(element: DependencyTreeItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: DependencyTreeItem): Thenable<DependencyTreeItem[]> {
        if (element) {
            const files = this.dependencies[element.label] || [];
            return Promise.resolve(
                files.map(file =>
                    new DependencyTreeItem(file, vscode.TreeItemCollapsibleState.None)
                )
            );
        }
        return Promise.resolve(
            Object.keys(this.dependencies).map(depName =>
                new DependencyTreeItem(depName, vscode.TreeItemCollapsibleState.Collapsed)
            )
        );
    }

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }
}
