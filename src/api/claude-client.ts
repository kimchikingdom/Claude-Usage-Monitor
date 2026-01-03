import * as https from 'https';
import { ClaudeUsage } from '../types';

export class ClaudeClient {
  private static readonly API_BASE = 'api.anthropic.com';
  private static readonly API_PATH = '/api/oauth/usage';
  private static readonly TIMEOUT = 30000;

  constructor(private accessToken: string) {}

  async getUsage(): Promise<ClaudeUsage | null> {
    try {
      const data = await this.makeRequest();
      return data;
    } catch (error: any) {
      console.error('Failed to fetch usage:', error.message);
      throw error;
    }
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
            reject(new Error('Unauthorized: Access token expired or invalid'));
          } else if (res.statusCode === 429) {
            const retryAfter = res.headers['retry-after'];
            reject(new Error(`Rate limited. Retry after: ${retryAfter || 'unknown'}`));
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
