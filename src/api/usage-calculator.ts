import { ClaudeUsage, UsageLevel, UsageWindow } from '../types';

export class UsageCalculator {
  static getMaxUtilization(usage: ClaudeUsage): number {
    const values = [
      usage.five_hour?.utilization ?? 0,
      usage.seven_day?.utilization ?? 0,
      usage.seven_day_opus?.utilization ?? 0
    ];

    return Math.max(...values);
  }

  static getUsageLevel(utilization: number, threshold: number = 90): UsageLevel {
    if (utilization >= threshold) {
      return UsageLevel.Critical;
    } else if (utilization >= threshold * 0.75) {
      return UsageLevel.Warning;
    }
    return UsageLevel.Normal;
  }

  static formatResetTime(resetsAt: string | null): string {
    if (!resetsAt) {
      return 'Unknown';
    }

    const resetDate = new Date(resetsAt);
    if (isNaN(resetDate.getTime())) {
      return 'Invalid';
    }
    const now = new Date();
    const diffMs = resetDate.getTime() - now.getTime();

    if (diffMs < 0) {
      return 'Resetting soon...';
    }

    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 24) {
      const days = Math.floor(hours / 24);
      const remainingHours = hours % 24;
      return `${days}d ${remainingHours}h`;
    }

    return `${hours}h ${minutes}m`;
  }

  static formatUtilization(utilization: number): string {
    return `${Math.round(utilization)}%`;
  }

  static getStatusBarText(usage: ClaudeUsage): string {
    // Always show 5-hour usage in status bar
    if (usage.five_hour) {
      return `Claude ${this.formatUtilization(usage.five_hour.utilization)}`;
    }
    // Fallback to max utilization if 5-hour data is not available
    const maxUtil = this.getMaxUtilization(usage);
    return `Claude ${this.formatUtilization(maxUtil)}`;
  }

  static getStatusBarIcon(usage: ClaudeUsage, threshold: number = 90): string {
    const maxUtil = this.getMaxUtilization(usage);
    const level = this.getUsageLevel(maxUtil, threshold);

    switch (level) {
      case UsageLevel.Critical:
        return '$(alert)';
      case UsageLevel.Warning:
        return '$(warning)';
      default:
        return '$(pulse)';
    }
  }

  static getTooltip(usage: ClaudeUsage): string {
    const lines: string[] = ['Claude Code Usage:'];

    if (usage.five_hour) {
      const resetTime = this.formatResetTime(usage.five_hour.resets_at);
      lines.push(
        `5-Hour: ${this.formatUtilization(usage.five_hour.utilization)} (resets in ${resetTime})`
      );
    }

    if (usage.seven_day) {
      const resetTime = this.formatResetTime(usage.seven_day.resets_at);
      lines.push(
        `7-Day: ${this.formatUtilization(usage.seven_day.utilization)} (resets in ${resetTime})`
      );
    }

    if (usage.seven_day_opus) {
      const resetTime = this.formatResetTime(usage.seven_day_opus.resets_at);
      lines.push(
        `7-Day Opus: ${this.formatUtilization(usage.seven_day_opus.utilization)} (resets in ${resetTime})`
      );
    }

    return lines.join('\n');
  }

  static shouldShowWarning(
    usage: ClaudeUsage,
    threshold: number,
    lastWarningTime: number | null
  ): boolean {
    const maxUtil = this.getMaxUtilization(usage);

    if (maxUtil < threshold) {
      return false;
    }

    const COOLDOWN_MS = 30 * 60 * 1000;
    if (lastWarningTime && Date.now() - lastWarningTime < COOLDOWN_MS) {
      return false;
    }

    return true;
  }

  static getWarningMessage(usage: ClaudeUsage): string {
    const parts: string[] = [];

    if (usage.five_hour && usage.five_hour.utilization >= 90) {
      parts.push(`5-hour: ${this.formatUtilization(usage.five_hour.utilization)}`);
    }

    if (usage.seven_day && usage.seven_day.utilization >= 90) {
      parts.push(`7-day: ${this.formatUtilization(usage.seven_day.utilization)}`);
    }

    if (usage.seven_day_opus && usage.seven_day_opus.utilization >= 90) {
      parts.push(`7-day Opus: ${this.formatUtilization(usage.seven_day_opus.utilization)}`);
    }

    if (parts.length === 0) {
      return 'Claude usage high';
    }
    return `Claude usage high: ${parts.join(', ')}`;
  }

  static getRemaining(utilization: number): number {
    return Math.max(0, 100 - utilization);
  }
}
