import * as fs from 'fs';
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
      if (!fs.existsSync(this.cacheDir)) {
        fs.mkdirSync(this.cacheDir, { recursive: true });
      }

      const cached: CachedUsage = {
        usage,
        timestamp: Date.now()
      };

      fs.writeFileSync(this.cachePath, JSON.stringify(cached, null, 2), 'utf-8');
    } catch (error) {
      console.error('Failed to save usage cache:', error);
    }
  }

  loadUsage(): ClaudeUsage | null {
    try {
      if (!fs.existsSync(this.cachePath)) {
        return null;
      }

      const content = fs.readFileSync(this.cachePath, 'utf-8');
      const cached: CachedUsage = JSON.parse(content);

      const age = Date.now() - cached.timestamp;
      if (age > this.CACHE_DURATION_MS) {
        console.log('Cache expired');
        return null;
      }

      return cached.usage;
    } catch (error) {
      console.error('Failed to load usage cache:', error);
      return null;
    }
  }

  clearCache(): void {
    try {
      if (fs.existsSync(this.cachePath)) {
        fs.unlinkSync(this.cachePath);
      }
    } catch (error) {
      console.error('Failed to clear cache:', error);
    }
  }

  isCacheValid(): boolean {
    try {
      if (!fs.existsSync(this.cachePath)) {
        return false;
      }

      const content = fs.readFileSync(this.cachePath, 'utf-8');
      const cached: CachedUsage = JSON.parse(content);

      const age = Date.now() - cached.timestamp;
      return age <= this.CACHE_DURATION_MS;
    } catch {
      return false;
    }
  }
}
