import * as vscode from 'vscode';
import { ClaudeUsage } from '../types';
import { UsageCalculator } from '../api/usage-calculator';

export class StatusBarManager {
  private statusBarItem: vscode.StatusBarItem;

  constructor() {
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      100
    );
    this.statusBarItem.command = 'claude-usage-monitor.showDetails';
  }

  updateUsage(usage: ClaudeUsage | null, threshold: number = 90): void {
    if (!usage) {
      this.showError('Claude: Unavailable');
      return;
    }

    const icon = UsageCalculator.getStatusBarIcon(usage, threshold);
    const text = UsageCalculator.getStatusBarText(usage);
    const tooltip = UsageCalculator.getTooltip(usage);

    this.statusBarItem.text = `${icon} ${text}`;
    this.statusBarItem.tooltip = tooltip;
    this.statusBarItem.show();
  }

  showError(message: string): void {
    this.statusBarItem.text = '$(alert) ' + message;
    this.statusBarItem.tooltip = 'Click to configure authentication';
    this.statusBarItem.command = 'claude-usage-monitor.login';
    this.statusBarItem.show();
  }

  showLoading(): void {
    this.statusBarItem.text = '$(sync~spin) Claude';
    this.statusBarItem.tooltip = 'Fetching usage statistics...';
    this.statusBarItem.show();
  }

  hide(): void {
    this.statusBarItem.hide();
  }

  dispose(): void {
    this.statusBarItem.dispose();
  }
}
