import * as https from 'https';
import { ClaudeUsage } from '../types';

export class ClaudeClient {
  private static readonly API_BASE = 'api.anthropic.com';
  private static readonly API_PATH = '/api/oauth/usage';
  private static readonly TIMEOUT = 30000;
  private static readonly MAX_RETRIES = 3;
  private static readonly BASE_DELAY_MS = 1000;

  constructor(private accessToken: string) {}

  async getUsage(): Promise<ClaudeUsage | null> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < ClaudeClient.MAX_RETRIES; attempt++) {
      try {
        return await this.makeRequest();
      } catch (error: any) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (error.statusCode === 401) {
          throw lastError;
        }

        const delayMs = error.retryAfter
          ? error.retryAfter * 1000
          : ClaudeClient.BASE_DELAY_MS * Math.pow(2, attempt);

        if (attempt < ClaudeClient.MAX_RETRIES - 1) {
          await this.delay(delayMs);
        }
      }
    }

    throw lastError!;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private makeRequest(): Promise<ClaudeUsage> {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: ClaudeClient.API_BASE,
        path: ClaudeClient.API_PATH,
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
          'anthropic-beta': 'oauth-2025-04-20,fine-grained-tool-streaming-2025-05-14'
        },
        timeout: ClaudeClient.TIMEOUT
      };

      const req = https.request(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          if (res.statusCode === 200) {
            try {
              const parsed = JSON.parse(data);
              resolve(parsed);
            } catch (error) {
              reject(new Error(`Failed to parse response: ${error}`));
            }
          } else if (res.statusCode === 401) {
            const err: any = new Error('Unauthorized: Access token expired or invalid');
            err.statusCode = 401;
            reject(err);
          } else if (res.statusCode === 429) {
            const retryAfter = res.headers['retry-after'];
            const err: any = new Error('Rate limited');
            err.statusCode = 429;
            err.retryAfter = retryAfter ? parseInt(retryAfter as string, 10) : undefined;
            reject(err);
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${data}`));
          }
        });
      });

      req.on('error', (error) => {
        reject(new Error(`Network error: ${error.message}`));
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      req.end();
    });
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.getUsage();
      return true;
    } catch (error) {
      return false;
    }
  }
}
