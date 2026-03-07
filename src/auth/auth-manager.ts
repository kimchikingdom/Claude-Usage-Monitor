import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import * as vscode from 'vscode';
import { KeychainAccess } from './keychain-access';
import { OAuthCredentials, ClaudeConfig } from '../types';

export class AuthManager {
  private keychainAccess: KeychainAccess;
  private configPath: string;
  private static readonly EXPIRY_WARNING_MS = 5 * 60 * 1000; // 5 minutes

  constructor(private outputChannel?: vscode.OutputChannel) {
    this.keychainAccess = new KeychainAccess(outputChannel);
    this.configPath = path.join(os.homedir(), '.claude.json');
  }

  async getAccessToken(): Promise<string | null> {
    this.log('[AuthManager] Getting access token...');
    const credentials = await this.keychainAccess.getCredentials();

    if (!credentials) {
      this.log('[AuthManager] No credentials found in Keychain');
      return null;
    }

    this.log('[AuthManager] Checking if token is expired...');
    if (this.keychainAccess.isTokenExpired(credentials.expiresAt)) {
      this.log('[AuthManager] Access token has expired');
      const result = await vscode.window.showWarningMessage(
        'Claude Usage Monitor: Token expired. Please run "claude" CLI to re-authenticate.',
        'Open Terminal'
      );
      if (result === 'Open Terminal') {
        const terminal = vscode.window.createTerminal('Claude Login');
        terminal.show();
        terminal.sendText('claude');
      }
      return null;
    }

    // Warn if token expires soon
    if (credentials.expiresAt) {
      const timeUntilExpiry = credentials.expiresAt - Date.now();
      if (timeUntilExpiry > 0 && timeUntilExpiry < AuthManager.EXPIRY_WARNING_MS) {
        this.log('[AuthManager] Token expiring soon');
        vscode.window.showWarningMessage(
          'Claude Usage Monitor: Token expires in less than 5 minutes. Consider re-authenticating.'
        );
      }
    }

    this.log('[AuthManager] Access token is valid');
    return credentials.accessToken;
  }

  async isAuthenticated(): Promise<boolean> {
    const token = await this.getAccessToken();
    return token !== null;
  }

  async getConfig(): Promise<ClaudeConfig | null> {
    try {
      const content = await fs.readFile(this.configPath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        this.log(`Failed to read Claude config: ${error}`);
      }
      return null;
    }
  }

  async getUserInfo(): Promise<{ email?: string; name?: string } | null> {
    const config = await this.getConfig();

    if (!config || !config.defaultAccountId || !config.accounts) {
      return null;
    }

    const account = config.accounts.find(
      acc => acc.id === config.defaultAccountId
    );

    if (!account) {
      return null;
    }

    return {
      email: account.email,
      name: account.name
    };
  }

  async checkAvailability(): Promise<{
    available: boolean;
    reason?: string;
  }> {
    const isKeychainAvailable = await this.keychainAccess.isAvailable();

    if (!isKeychainAvailable) {
      return {
        available: false,
        reason: 'Keychain access not available (macOS only)'
      };
    }

    const isAuth = await this.isAuthenticated();

    if (!isAuth) {
      return {
        available: false,
        reason: 'Not authenticated. Please run "claude" CLI to login.'
      };
    }

    return { available: true };
  }

  private log(message: string): void {
    if (this.outputChannel) {
      this.outputChannel.appendLine(message);
    } else {
      console.log(message);
    }
  }
}
