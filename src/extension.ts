import * as vscode from 'vscode';
import { AuthManager } from './auth/auth-manager';
import { CacheManager } from './services/cache-manager';
import { UsageMonitor } from './services/usage-monitor';
import { StatusBarManager } from './ui/status-bar';
import { UsageTreeProvider } from './ui/tree-provider';
import { WebviewProvider } from './ui/webview-provider';
import { ExtensionConfig } from './types';

let statusBarManager: StatusBarManager;
let usageMonitor: UsageMonitor;
let treeProvider: UsageTreeProvider;
let webviewProvider: WebviewProvider;
let outputChannel: vscode.OutputChannel;

export async function activate(context: vscode.ExtensionContext) {
  try {
    outputChannel = vscode.window.createOutputChannel('Claude Usage Monitor');
    outputChannel.appendLine('Claude Usage Monitor extension is now active');

    const authManager = new AuthManager(outputChannel);
    const cacheManager = new CacheManager();

    outputChannel.appendLine('Checking authentication availability...');
    const availability = await authManager.checkAvailability();
    outputChannel.appendLine(`Availability check result: ${JSON.stringify(availability)}`);

    if (!availability.available) {
      outputChannel.appendLine(`Warning: ${availability.reason}`);
      vscode.window.showWarningMessage(
        `Claude Usage Monitor: ${availability.reason}`
      );
    }

    const config = getConfig();

    statusBarManager = new StatusBarManager();
    treeProvider = new UsageTreeProvider();
    webviewProvider = new WebviewProvider(context.extensionUri);
    usageMonitor = new UsageMonitor(authManager, cacheManager, config, outputChannel);

    vscode.window.registerTreeDataProvider('claude-usage-monitor.usageTree', treeProvider);

    context.subscriptions.push(
      vscode.window.registerWebviewViewProvider(
        'claude-usage-monitor.detailsView',
        webviewProvider
      )
    );

    await usageMonitor.start((usage) => {
      statusBarManager.updateUsage(usage, config.warningThreshold);
      treeProvider.updateUsage(usage);
      webviewProvider.updateUsage(usage);
    });

    context.subscriptions.push(
      vscode.commands.registerCommand('claude-usage-monitor.refresh', async () => {
        try {
          statusBarManager.showLoading();
          await usageMonitor.updateUsage();
          vscode.window.showInformationMessage('Claude usage refreshed');
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          vscode.window.showErrorMessage(`Failed to refresh: ${errorMsg}`);
        }
      })
    );

    context.subscriptions.push(
      vscode.commands.registerCommand('claude-usage-monitor.showDetails', () => {
        vscode.commands.executeCommand('claude-usage-monitor.detailsView.focus');
      })
    );

    context.subscriptions.push(
      vscode.commands.registerCommand('claude-usage-monitor.login', async () => {
        const result = await vscode.window.showInformationMessage(
          'To use Claude Usage Monitor, please authenticate with Claude Code CLI.',
          'Open Terminal'
        );

        if (result === 'Open Terminal') {
          const terminal = vscode.window.createTerminal('Claude Login');
          terminal.show();
          terminal.sendText('claude');
        }
      })
    );

    context.subscriptions.push(
      vscode.workspace.onDidChangeConfiguration((e) => {
        if (e.affectsConfiguration('claude-usage-monitor')) {
          const newConfig = getConfig();
          usageMonitor.updateConfig(newConfig);
        }
      })
    );

    context.subscriptions.push(statusBarManager);
    context.subscriptions.push(treeProvider);

    outputChannel.appendLine('Claude Usage Monitor extension activated successfully');
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    outputChannel.appendLine(`ERROR: Failed to activate: ${errorMsg}`);
    if (error instanceof Error && error.stack) {
      outputChannel.appendLine(`Stack trace: ${error.stack}`);
    }
    vscode.window.showErrorMessage(`Claude Usage Monitor activation failed: ${errorMsg}`);
  }
}

export function deactivate() {
  if (usageMonitor) {
    usageMonitor.stop();
  }
}

function getConfig(): ExtensionConfig {
  const config = vscode.workspace.getConfiguration('claude-usage-monitor');

  return {
    updateInterval: config.get<number>('updateInterval', 60),
    showNotifications: config.get<boolean>('showNotifications', true),
    warningThreshold: config.get<number>('warningThreshold', 90)
  };
}
