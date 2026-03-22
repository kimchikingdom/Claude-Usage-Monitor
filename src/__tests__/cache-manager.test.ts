import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { CacheManager } from '../services/cache-manager';
import { ClaudeUsage } from '../types';

describe('CacheManager', () => {
  let cacheManager: CacheManager;
  const cachePath = path.join(os.homedir(), '.claude', 'stats-cache.json');

  beforeEach(() => {
    cacheManager = new CacheManager();
  });

  afterEach(async () => {
    try {
      await fs.unlink(cachePath);
    } catch {
      // ignore
    }
  });

  const mockUsage: ClaudeUsage = {
    five_hour: { utilization: 45, resets_at: '2026-03-07T12:00:00Z' },
    seven_day: { utilization: 30, resets_at: '2026-03-10T00:00:00Z' }
  };

  describe('saveUsage and loadUsage', () => {
    it('should save and load usage data', async () => {
      await cacheManager.saveUsage(mockUsage);
      const loaded = await cacheManager.loadUsage();
      expect(loaded).toEqual(mockUsage);
    });

    it('should return null when no cache exists', async () => {
      try { await fs.unlink(cachePath); } catch {}
      const loaded = await cacheManager.loadUsage();
      expect(loaded).toBeNull();
    });
  });

  describe('clearCache', () => {
    it('should remove cache file', async () => {
      await cacheManager.saveUsage(mockUsage);
      await cacheManager.clearCache();
      const loaded = await cacheManager.loadUsage();
      expect(loaded).toBeNull();
    });

    it('should not throw when no cache exists', async () => {
      await expect(cacheManager.clearCache()).resolves.not.toThrow();
    });
  });

  describe('isCacheValid', () => {
    it('should return true for fresh cache', async () => {
      await cacheManager.saveUsage(mockUsage);
      const valid = await cacheManager.isCacheValid();
      expect(valid).toBe(true);
    });

    it('should return false when no cache exists', async () => {
      try { await fs.unlink(cachePath); } catch {}
      const valid = await cacheManager.isCacheValid();
      expect(valid).toBe(false);
    });
  });
});
