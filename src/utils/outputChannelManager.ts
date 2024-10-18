import { EXTENSION_CONSTANTS } from "../extension";
import * as vscode from 'vscode';
export class OutputChannelManager {
    private static channels: Map<string, vscode.OutputChannel> = new Map();

    static getChannel(channelName: string): vscode.OutputChannel {
        let channel = this.channels.get(channelName);
        if (!channel) {
            channel = vscode.window.createOutputChannel(channelName);
            this.channels.set(channelName, channel);
        }
        return channel;
    }

    static formatOutput(channel: vscode.OutputChannel, title: string, content: string[]): void {
        channel.clear();
        channel.appendLine(`\n🚀 ${title}`);
        channel.appendLine('='.repeat(50));
        channel.appendLine(`📅 ${new Date().toLocaleString()}`);
        channel.appendLine('='.repeat(50));

        content.forEach(line => channel.appendLine(line));

        channel.appendLine('\n' + '='.repeat(50));
        channel.appendLine(EXTENSION_CONSTANTS.MESSAGES.SUCCESS.ANALYSIS_COMPLETE);
        channel.appendLine(`⏱️ Finished at: ${new Date().toLocaleString()}`);
        channel.appendLine('='.repeat(50));
    }
}
