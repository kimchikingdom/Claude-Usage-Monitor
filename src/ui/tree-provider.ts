import * as vscode from 'vscode';
import { ClaudeUsage, UsageWindow } from '../types';
import { UsageCalculator } from '../api/usage-calculator';

class UsageTreeItem extends vscode.TreeItem {
  constructor(
    label: string,
    collapsibleState?: vscode.TreeItemCollapsibleState,
    public readonly children?: UsageTreeItem[]
  ) {
    super(label, collapsibleState);
  }
}

export class UsageTreeProvider implements vscode.TreeDataProvider<UsageTreeItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<UsageTreeItem | undefined | null | void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private currentUsage: ClaudeUsage | null = null;

  updateUsage(usage: ClaudeUsage | null): void {
    this.currentUsage = usage;
    this.refresh();
  }

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: UsageTreeItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: UsageTreeItem): UsageTreeItem[] {
    if (element && element.children) {
      return element.children;
    }

    if (!element) {
      return this.getRootItems();
    }

    return [];
  }

  private getRootItems(): UsageTreeItem[] {
    if (!this.currentUsage) {
      return [new UsageTreeItem('No usage data available')];
    }

    const items: UsageTreeItem[] = [];

    const maxUtil = UsageCalculator.getMaxUtilization(this.currentUsage);
    items.push(
      new UsageTreeItem(
        `Overall Usage: ${UsageCalculator.formatUtilization(maxUtil)}`,
        vscode.TreeItemCollapsibleState.Expanded
      )
    );

    if (this.currentUsage.five_hour) {
      items.push(this.createWindowItem('5-Hour Window', this.currentUsage.five_hour));
    }

    if (this.currentUsage.seven_day) {
      items.push(this.createWindowItem('7-Day Window', this.currentUsage.seven_day));
    }

    if (this.currentUsage.seven_day_opus) {
      items.push(this.createWindowItem('7-Day Opus', this.currentUsage.seven_day_opus));
    }

    return items;
  }

  private createWindowItem(label: string, window: UsageWindow): UsageTreeItem {
    const utilization = UsageCalculator.formatUtilization(window.utilization);
    const remaining = UsageCalculator.formatUtilization(
      UsageCalculator.getRemaining(window.utilization)
    );
    const resetTime = UsageCalculator.formatResetTime(window.resets_at);

    const children = [
      new UsageTreeItem(`Utilization: ${utilization}`),
      new UsageTreeItem(`Remaining: ${remaining}`),
      new UsageTreeItem(`Resets in: ${resetTime}`)
    ];

    const item = new UsageTreeItem(
      `${label}: ${utilization}`,
      vscode.TreeItemCollapsibleState.Collapsed,
      children
    );

    return item;
  }
}
