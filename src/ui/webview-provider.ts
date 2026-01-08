import * as vscode from 'vscode';
import { ClaudeUsage } from '../types';
import { UsageCalculator } from '../api/usage-calculator';

export class WebviewProvider implements vscode.WebviewViewProvider {
  private _view?: vscode.WebviewView;
  private currentUsage: ClaudeUsage | null = null;

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

    webviewView.webview.onDidReceiveMessage(async (message) => {
      switch (message.command) {
        case 'refresh':
          vscode.commands.executeCommand('claude-usage-monitor.refresh');
          break;
      }
    });
  }

  updateUsage(usage: ClaudeUsage | null): void {
    this.currentUsage = usage;

    if (this._view) {
      this._view.webview.postMessage({
        command: 'updateUsage',
        usage: usage
      });
    }
  }

  private _getHtmlForWebview(webview: vscode.Webview): string {
    const usageData = this.currentUsage
      ? JSON.stringify(this.currentUsage)
      : 'null';

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
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

  <script>
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

    function formatResetTime(resetsAt) {
      if (!resetsAt) return 'Unknown';

      const resetDate = new Date(resetsAt);
      const now = new Date();
      const diffMs = resetDate.getTime() - now.getTime();

      if (diffMs < 0) return 'Resetting soon...';

      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

      if (hours > 24) {
        const days = Math.floor(hours / 24);
        const remainingHours = hours % 24;
        return \`\${days}d \${remainingHours}h\`;
      }

      return \`\${hours}h \${minutes}m\`;
    }

    function renderUsage(usage) {
      if (!usage) {
        return '<div class="no-data">No usage data available</div>';
      }

      let html = '';

      if (usage.five_hour) {
        const util = Math.round(usage.five_hour.utilization);
        const resetTime = formatResetTime(usage.five_hour.resets_at);
        const progressClass = getProgressClass(util);

        html += \`
          <div class="card">
            <div class="card-title">5-Hour Window</div>
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

      if (usage.seven_day) {
        const util = Math.round(usage.seven_day.utilization);
        const resetTime = formatResetTime(usage.seven_day.resets_at);
        const progressClass = getProgressClass(util);

        html += \`
          <div class="card">
            <div class="card-title">7-Day Window</div>
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

      if (usage.seven_day_opus) {
        const util = Math.round(usage.seven_day_opus.utilization);
        const resetTime = formatResetTime(usage.seven_day_opus.resets_at);
        const progressClass = getProgressClass(util);

        html += \`
          <div class="card">
            <div class="card-title">7-Day Opus Window</div>
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
