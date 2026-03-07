import * as https from 'https';
import { ClaudeUsage } from '../types';

export class ApiError extends Error {
  statusCode?: number;
  retryAfter?: number;

  constructor(message: string, statusCode?: number, retryAfter?: number) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.retryAfter = retryAfter;
  }
}

export class ClaudeClient {
  private static readonly API_BASE = 'api.anthropic.com';
  private static readonly API_PATH = '/api/oauth/usage';
  private static readonly TIMEOUT = 30000;
  private static readonly MAX_RETRIES = 3;
  private static readonly BASE_DELAY_MS = 1000;
  private static readonly MAX_DELAY_MS = 10000;
  private static readonly MAX_RESPONSE_SIZE = 1024 * 1024; // 1MB

  constructor(private accessToken: string) {}

  async getUsage(): Promise<ClaudeUsage | null> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < ClaudeClient.MAX_RETRIES; attempt++) {
      try {
        return await this.makeRequest();
      } catch (error: unknown) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (error instanceof ApiError && error.statusCode === 401) {
          throw lastError;
        }

        const retryAfter = error instanceof ApiError ? error.retryAfter : undefined;
        const delayMs = retryAfter
          ? Math.min(retryAfter * 1000, ClaudeClient.MAX_DELAY_MS)
          : Math.min(ClaudeClient.BASE_DELAY_MS * Math.pow(2, attempt), ClaudeClient.MAX_DELAY_MS);

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
        let size = 0;

        res.on('data', (chunk) => {
          size += chunk.length;
          if (size > ClaudeClient.MAX_RESPONSE_SIZE) {
            req.destroy();
            reject(new Error('Response exceeded maximum size limit'));
            return;
          }
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
            reject(new ApiError('Unauthorized: Access token expired or invalid', 401));
          } else if (res.statusCode === 429) {
            const retryAfterRaw = res.headers['retry-after'];
            let retryAfter: number | undefined;
            if (retryAfterRaw) {
              const parsed = parseInt(retryAfterRaw as string, 10);
              retryAfter = isNaN(parsed) ? undefined : parsed;
            }
            reject(new ApiError('Rate limited', 429, retryAfter));
          } else {
            reject(new ApiError(`HTTP ${res.statusCode}: ${data}`, res.statusCode));
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
