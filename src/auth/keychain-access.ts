import { execFile } from 'child_process';
import { promisify } from 'util';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import * as vscode from 'vscode';
import { OAuthCredentials } from '../types';

const execFileAsync = promisify(execFile);

export class KeychainAccess {
  private static readonly SERVICE_NAME = 'Claude Code-credentials';

  constructor(private outputChannel?: vscode.OutputChannel) {}

  async getCredentials(): Promise<OAuthCredentials | null> {
    try {
      this.log('[KeychainAccess] Attempting to read credentials...');
      const password = await this.readFromKeychain();
      if (!password) {
        this.log('[KeychainAccess] No password returned from keychain');
        return null;
      }

      this.log('[KeychainAccess] Password retrieved, parsing JSON...');
      const data = JSON.parse(password);

      if (!data.claudeAiOauth || !data.claudeAiOauth.accessToken) {
        this.log('[KeychainAccess] ERROR: Invalid credentials format in Keychain');
        this.log(`[KeychainAccess] Credential keys found: ${Object.keys(data).join(', ')}`);
        return null;
      }

      this.log('[KeychainAccess] Credentials successfully parsed');
      return {
        accessToken: data.claudeAiOauth.accessToken,
        expiresAt: data.claudeAiOauth.expiresAt || 0
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.log(`[KeychainAccess] ERROR: Failed to read credentials from Keychain: ${errorMsg}`);
      if (error instanceof Error && error.stack) {
        this.log(`[KeychainAccess] Stack: ${error.stack}`);
      }
      return null;
    }
  }

  private async readFromKeychain(): Promise<string | null> {
    try {
      const platform = process.platform;

      if (platform === 'darwin') {
        // macOS: Use Keychain (execFile to prevent command injection)
        this.log(`[KeychainAccess] Searching for credentials in service: "${KeychainAccess.SERVICE_NAME}"`);
        const { stdout: findOutput } = await execFileAsync(
          'security', ['find-generic-password', '-s', KeychainAccess.SERVICE_NAME]
        );

        const accountMatch = findOutput.match(/"acct"<blob>="([^"]+)"/);
        if (!accountMatch) {
          this.log('[KeychainAccess] ERROR: Could not find account name in Keychain');
          return null;
        }

        const accountName = accountMatch[1];
        this.log(`[KeychainAccess] Found account: "${accountName}"`);

        const { stdout } = await execFileAsync(
          'security', ['find-generic-password', '-s', KeychainAccess.SERVICE_NAME, '-a', accountName, '-w']
        );

        this.log('[KeychainAccess] Successfully read credentials from keychain');
        return stdout.trim();
      } else {
        // Linux/Windows: Read from ~/.claude/.credentials.json
        const credPath = join(homedir(), '.claude', '.credentials.json');
        this.log(`[KeychainAccess] Reading credentials from: ${credPath}`);

        if (!existsSync(credPath)) {
          this.log('[KeychainAccess] ERROR: Credentials file not found');
          return null;
        }

        const credData = readFileSync(credPath, 'utf8');
        this.log('[KeychainAccess] Successfully read credentials from file');
        return credData.trim();
      }
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      if (errorMsg.includes('could not be found')) {
        this.log('[KeychainAccess] ERROR: Credentials not found');
      } else {
        this.log(`[KeychainAccess] ERROR: Credential access error: ${errorMsg}`);
      }
      return null;
    }
  }

  isTokenExpired(expiresAt: number): boolean {
    if (!expiresAt) {
      return false;
    }
    return Date.now() >= expiresAt;
  }

  async isAvailable(): Promise<boolean> {
    try {
      if (process.platform === 'darwin') {
        await execFileAsync('which', ['security']);
        return true;
      } else {
        const credPath = join(homedir(), '.claude', '.credentials.json');
        return existsSync(credPath);
      }
    } catch {
      return false;
    }
  }

  private log(message: string): void {
    if (this.outputChannel) {
      this.outputChannel.appendLine(message);
    } else {
      console.log(message);
    }
  }
}
