import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { ClaudeUsage, CachedUsage } from '../types';

export class CacheManager {
  private cachePath: string;
  private cacheDir: string;
  private readonly CACHE_DURATION_MS = 5 * 60 * 1000;

  constructor() {
    this.cacheDir = path.join(os.homedir(), '.claude');
    this.cachePath = path.join(this.cacheDir, 'stats-cache.json');
  }

  async saveUsage(usage: ClaudeUsage): Promise<void> {
    try {
      await fs.mkdir(this.cacheDir, { recursive: true });

      const cached: CachedUsage = {
        usage,
        timestamp: Date.now()
      };

      await fs.writeFile(this.cachePath, JSON.stringify(cached, null, 2), 'utf-8');
    } catch (error) {
      console.error('Failed to save usage cache:', error);
    }
  }

  async loadUsage(): Promise<ClaudeUsage | null> {
    try {
      const content = await fs.readFile(this.cachePath, 'utf-8');
      const cached: CachedUsage = JSON.parse(content);

      const age = Date.now() - cached.timestamp;
      if (age > this.CACHE_DURATION_MS) {
        return null;
      }

      return cached.usage;
    } catch {
      return null;
    }
  }

  async clearCache(): Promise<void> {
    try {
      await fs.unlink(this.cachePath);
    } catch {
      // File doesn't exist, ignore
    }
  }

  async isCacheValid(): Promise<boolean> {
    try {
      const content = await fs.readFile(this.cachePath, 'utf-8');
      const cached: CachedUsage = JSON.parse(content);

      const age = Date.now() - cached.timestamp;
      return age <= this.CACHE_DURATION_MS;
    } catch {
      return false;
    }
  }
}
