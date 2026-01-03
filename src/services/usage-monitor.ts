import * as vscode from 'vscode';
import { AuthManager } from '../auth/auth-manager';
import { ClaudeClient } from '../api/claude-client';
import { CacheManager } from './cache-manager';
import { ClaudeUsage, ExtensionConfig } from '../types';
import { UsageCalculator } from '../api/usage-calculator';

export class UsageMonitor {
  private updateInterval: NodeJS.Timeout | null = null;
  private currentUsage: ClaudeUsage | null = null;
  private lastWarningTime: number | null = null;
  private onUsageUpdated: ((usage: ClaudeUsage | null) => void) | null = null;

  constructor(
    private authManager: AuthManager,
    private cacheManager: CacheManager,
    private config: ExtensionConfig,
    private outputChannel?: vscode.OutputChannel
  ) {}

  async start(callback: (usage: ClaudeUsage | null) => void): Promise<void> {
    this.onUsageUpdated = callback;

    const cachedUsage = this.cacheManager.loadUsage();
    if (cachedUsage) {
      this.currentUsage = cachedUsage;
      this.notifyUpdate();
    }

    await this.updateUsage();

    this.scheduleUpdates();
  }

  stop(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  async updateUsage(): Promise<void> {
    try {
      this.log('[UsageMonitor] Updating usage...');
      const accessToken = await this.authManager.getAccessToken();

      if (!accessToken) {
        this.log('[UsageMonitor] ERROR: No access token available');
        this.currentUsage = null;
        this.notifyUpdate();
        return;
      }

      this.log('[UsageMonitor] Access token obtained, calling API...');
      const client = new ClaudeClient(accessToken);
      const usage = await client.getUsage();

      if (usage) {
        this.log('[UsageMonitor] Usage data received successfully');
        this.log(`[UsageMonitor] Usage: ${JSON.stringify(usage)}`);
        this.currentUsage = usage;
        await this.cacheManager.saveUsage(usage);
        this.notifyUpdate();

        if (this.config.showNotifications) {
          this.checkAndShowWarning(usage);
        }
      } else {
        this.log('[UsageMonitor] WARNING: API returned null usage data');
      }
    } catch (error: any) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.log(`[UsageMonitor] ERROR: Failed to update usage: ${errorMsg}`);

      const cachedUsage = this.cacheManager.loadUsage();
      if (cachedUsage) {
        this.log('[UsageMonitor] Using cached usage data');
        this.currentUsage = cachedUsage;
        this.notifyUpdate();
      }
    }
  }

  private scheduleUpdates(): void {
    this.stop();

    const intervalMs = this.config.updateInterval * 1000;

    this.updateInterval = setInterval(() => {
      this.updateUsage();
    }, intervalMs);
  }

  private notifyUpdate(): void {
    if (this.onUsageUpdated) {
      this.onUsageUpdated(this.currentUsage);
    }
  }

  private checkAndShowWarning(usage: ClaudeUsage): void {
    const shouldWarn = UsageCalculator.shouldShowWarning(
      usage,
      this.config.warningThreshold,
      this.lastWarningTime
    );

    if (shouldWarn) {
      const message = UsageCalculator.getWarningMessage(usage);
      vscode.window.showWarningMessage(message);
      this.lastWarningTime = Date.now();
    }
  }

  updateConfig(config: ExtensionConfig): void {
    this.config = config;
    this.scheduleUpdates();
  }

  getCurrentUsage(): ClaudeUsage | null {
    return this.currentUsage;
  }

  private log(message: string): void {
    if (this.outputChannel) {
      this.outputChannel.appendLine(message);
    } else {
      console.log(message);
    }
  }
}
