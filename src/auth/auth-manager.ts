import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as vscode from 'vscode';
import { KeychainAccess } from './keychain-access';
import { OAuthCredentials, ClaudeConfig } from '../types';

export class AuthManager {
  private keychainAccess: KeychainAccess;
  private configPath: string;

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
      return null;
    }

    this.log('[AuthManager] Access token is valid');
    return credentials.accessToken;
  }

  async isAuthenticated(): Promise<boolean> {
    const token = await this.getAccessToken();
    return token !== null;
  }

  getConfig(): ClaudeConfig | null {
    try {
      if (!fs.existsSync(this.configPath)) {
        return null;
      }

      const content = fs.readFileSync(this.configPath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      this.log(`Failed to read Claude config: ${error}`);
      return null;
    }
  }

  getUserInfo(): { email?: string; name?: string } | null {
    const config = this.getConfig();

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
