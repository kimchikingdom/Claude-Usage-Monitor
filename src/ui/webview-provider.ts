import * as crypto from 'crypto';
import * as vscode from 'vscode';
import { ClaudeUsage, UsageWindow } from '../types';
import { UsageCalculator } from '../api/usage-calculator';

interface FormattedUsage {
  five_hour?: { utilization: number; formattedResetTime: string };
  seven_day?: { utilization: number; formattedResetTime: string };
  seven_day_opus?: { utilization: number; formattedResetTime: string };
}

export class WebviewProvider implements vscode.WebviewViewProvider, vscode.Disposable {
  private _view?: vscode.WebviewView;
  private currentUsage: ClaudeUsage | null = null;
  private _messageDisposable?: vscode.Disposable;

  constructor(private readonly _extensionUri: vscode.Uri) {}

  resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ): void {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri]
    };

    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

    // Dispose previous listener to prevent memory leaks
    this._messageDisposable?.dispose();
    this._messageDisposable = webviewView.webview.onDidReceiveMessage(async (message) => {
      switch (message.command) {
        case 'refresh':
          vscode.commands.executeCommand('claude-usage-monitor.refresh');
          break;
      }
    });
  }

  dispose(): void {
    this._messageDisposable?.dispose();
  }

  updateUsage(usage: ClaudeUsage | null): void {
    this.currentUsage = usage;

    if (this._view) {
      this._view.webview.postMessage({
        command: 'updateUsage',
        usage: this.formatUsageData(usage)
      });
    }
  }

  private formatWindowData(window: UsageWindow) {
    return {
      utilization: window.utilization,
      formattedResetTime: UsageCalculator.formatResetTime(window.resets_at)
    };
  }

  private formatUsageData(usage: ClaudeUsage | null): FormattedUsage | null {
    if (!usage) { return null; }
    return {
      five_hour: usage.five_hour ? this.formatWindowData(usage.five_hour) : undefined,
      seven_day: usage.seven_day ? this.formatWindowData(usage.seven_day) : undefined,
      seven_day_opus: usage.seven_day_opus ? this.formatWindowData(usage.seven_day_opus) : undefined
    };
  }

  private getNonce(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  private _getHtmlForWebview(webview: vscode.Webview): string {
    const nonce = this.getNonce();
    const usageData = this.currentUsage
      ? JSON.stringify(this.formatUsageData(this.currentUsage))
      : 'null';

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
  <title>Claude Usage Monitor</title>
  <style>
    body {
      padding: 10px;
      color: var(--vscode-foreground);
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }

    h2 {
      margin: 0;
      font-size: 16px;
    }

    button {
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      border: none;
      padding: 6px 14px;
      cursor: pointer;
      border-radius: 2px;
    }

    button:hover {
      background: var(--vscode-button-hoverBackground);
    }

    .card {
      background: var(--vscode-editor-background);
      border: 1px solid var(--vscode-panel-border);
      border-radius: 4px;
      padding: 16px;
      margin-bottom: 12px;
    }

    .card-title {
      font-weight: 600;
      margin-bottom: 12px;
      font-size: 14px;
    }

    .stat-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 8px;
      font-size: 13px;
    }

    .stat-label {
      color: var(--vscode-descriptionForeground);
    }

    .stat-value {
      font-weight: 500;
    }

    .progress-bar {
      width: 100%;
      height: 8px;
      background: var(--vscode-progressBar-background);
      border-radius: 4px;
      overflow: hidden;
      margin-top: 8px;
    }

    .progress-fill {
      height: 100%;
      background: var(--vscode-progressBar-background);
      transition: width 0.3s ease;
    }

    .progress-fill.normal {
      background: #4caf50;
    }

    .progress-fill.warning {
      background: #ff9800;
    }

    .progress-fill.critical {
      background: #f44336;
    }

    .no-data {
      text-align: center;
      padding: 40px 20px;
      color: var(--vscode-descriptionForeground);
    }
  </style>
</head>
<body>
  <div class="header">
    <h2>Claude Usage</h2>
    <button onclick="refresh()">Refresh</button>
  </div>

  <div id="content"></div>

  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    let currentUsage = ${usageData};

    function refresh() {
      vscode.postMessage({ command: 'refresh' });
    }

    function getProgressClass(utilization) {
      if (utilization >= 90) return 'critical';
      if (utilization >= 67.5) return 'warning';
      return 'normal';
    }

    function renderWindowCard(title, window) {
      const util = Math.round(window.utilization);
      const resetTime = window.formattedResetTime;
      const progressClass = getProgressClass(util);

      return \`
        <div class="card">
          <div class="card-title">\${title}</div>
          <div class="stat-row">
            <span class="stat-label">Utilization</span>
            <span class="stat-value">\${util}%</span>
          </div>
          <div class="stat-row">
            <span class="stat-label">Remaining</span>
            <span class="stat-value">\${100 - util}%</span>
          </div>
          <div class="stat-row">
            <span class="stat-label">Resets in</span>
            <span class="stat-value">\${resetTime}</span>
          </div>
          <div class="progress-bar">
            <div class="progress-fill \${progressClass}" style="width: \${util}%"></div>
          </div>
        </div>
      \`;
    }

    function renderUsage(usage) {
      if (!usage) {
        return '<div class="no-data">No usage data available</div>';
      }

      let html = '';
      if (usage.five_hour) { html += renderWindowCard('5-Hour Window', usage.five_hour); }
      if (usage.seven_day) { html += renderWindowCard('7-Day Window', usage.seven_day); }
      if (usage.seven_day_opus) { html += renderWindowCard('7-Day Opus Window', usage.seven_day_opus); }
      return html;
    }

    function updateContent() {
      document.getElementById('content').innerHTML = renderUsage(currentUsage);
    }

    window.addEventListener('message', event => {
      const message = event.data;
      if (message.command === 'updateUsage') {
        currentUsage = message.usage;
        updateContent();
      }
    });

    updateContent();
  </script>
</body>
</html>`;
  }
}
