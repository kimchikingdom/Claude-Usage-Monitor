import { UsageCalculator } from '../api/usage-calculator';
import { ClaudeUsage, UsageLevel } from '../types';

describe('UsageCalculator', () => {
  describe('getMaxUtilization', () => {
    it('should return 0 when all windows are undefined', () => {
      const usage: ClaudeUsage = {};
      expect(UsageCalculator.getMaxUtilization(usage)).toBe(0);
    });

    it('should return the highest utilization', () => {
      const usage: ClaudeUsage = {
        five_hour: { utilization: 30, resets_at: null },
        seven_day: { utilization: 80, resets_at: null },
        seven_day_opus: { utilization: 50, resets_at: null }
      };
      expect(UsageCalculator.getMaxUtilization(usage)).toBe(80);
    });

    it('should handle partial windows', () => {
      const usage: ClaudeUsage = {
        five_hour: { utilization: 45, resets_at: null }
      };
      expect(UsageCalculator.getMaxUtilization(usage)).toBe(45);
    });
  });

  describe('getUsageLevel', () => {
    it('should return Normal for low utilization', () => {
      expect(UsageCalculator.getUsageLevel(50)).toBe(UsageLevel.Normal);
    });

    it('should return Warning at 75% of threshold', () => {
      expect(UsageCalculator.getUsageLevel(68)).toBe(UsageLevel.Warning);
    });

    it('should return Critical at threshold', () => {
      expect(UsageCalculator.getUsageLevel(90)).toBe(UsageLevel.Critical);
    });

    it('should respect custom threshold', () => {
      expect(UsageCalculator.getUsageLevel(80, 80)).toBe(UsageLevel.Critical);
      expect(UsageCalculator.getUsageLevel(60, 80)).toBe(UsageLevel.Warning);
      expect(UsageCalculator.getUsageLevel(50, 80)).toBe(UsageLevel.Normal);
    });
  });

  describe('formatResetTime', () => {
    it('should return Unknown for null', () => {
      expect(UsageCalculator.formatResetTime(null)).toBe('Unknown');
    });

    it('should return "Resetting soon..." for past dates', () => {
      const pastDate = new Date(Date.now() - 60000).toISOString();
      expect(UsageCalculator.formatResetTime(pastDate)).toBe('Resetting soon...');
    });

    it('should format hours and minutes', () => {
      const futureDate = new Date(Date.now() + 3 * 60 * 60 * 1000 + 30 * 60 * 1000).toISOString();
      const result = UsageCalculator.formatResetTime(futureDate);
      expect(result).toMatch(/3h 3\dm/);
    });

    it('should format days for > 24 hours', () => {
      const futureDate = new Date(Date.now() + 50 * 60 * 60 * 1000).toISOString();
      const result = UsageCalculator.formatResetTime(futureDate);
      expect(result).toMatch(/2d 2h/);
    });
  });

  describe('formatUtilization', () => {
    it('should round and add percent sign', () => {
      expect(UsageCalculator.formatUtilization(45.7)).toBe('46%');
      expect(UsageCalculator.formatUtilization(0)).toBe('0%');
      expect(UsageCalculator.formatUtilization(100)).toBe('100%');
    });
  });

  describe('getStatusBarText', () => {
    it('should show 5-hour usage when available', () => {
      const usage: ClaudeUsage = {
        five_hour: { utilization: 42.3, resets_at: null },
        seven_day: { utilization: 80, resets_at: null }
      };
      expect(UsageCalculator.getStatusBarText(usage)).toBe('Claude 42%');
    });

    it('should fallback to max utilization', () => {
      const usage: ClaudeUsage = {
        seven_day: { utilization: 80, resets_at: null }
      };
      expect(UsageCalculator.getStatusBarText(usage)).toBe('Claude 80%');
    });
  });

  describe('shouldShowWarning', () => {
    it('should return false below threshold', () => {
      const usage: ClaudeUsage = {
        five_hour: { utilization: 50, resets_at: null }
      };
      expect(UsageCalculator.shouldShowWarning(usage, 90, null)).toBe(false);
    });

    it('should return true above threshold with no previous warning', () => {
      const usage: ClaudeUsage = {
        five_hour: { utilization: 95, resets_at: null }
      };
      expect(UsageCalculator.shouldShowWarning(usage, 90, null)).toBe(true);
    });

    it('should return false within cooldown period', () => {
      const usage: ClaudeUsage = {
        five_hour: { utilization: 95, resets_at: null }
      };
      const recentWarning = Date.now() - 5 * 60 * 1000; // 5 minutes ago
      expect(UsageCalculator.shouldShowWarning(usage, 90, recentWarning)).toBe(false);
    });

    it('should return true after cooldown period', () => {
      const usage: ClaudeUsage = {
        five_hour: { utilization: 95, resets_at: null }
      };
      const oldWarning = Date.now() - 31 * 60 * 1000; // 31 minutes ago
      expect(UsageCalculator.shouldShowWarning(usage, 90, oldWarning)).toBe(true);
    });
  });

  describe('getRemaining', () => {
    it('should return complement of utilization', () => {
      expect(UsageCalculator.getRemaining(75)).toBe(25);
    });

    it('should not go below 0', () => {
      expect(UsageCalculator.getRemaining(105)).toBe(0);
    });
  });
});
