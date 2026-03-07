export interface UsageWindow {
  utilization: number;
  resets_at: string | null;
}

export interface ClaudeUsage {
  five_hour?: UsageWindow;
  seven_day?: UsageWindow;
  seven_day_opus?: UsageWindow;
}

export interface OAuthCredentials {
  accessToken: string;
  expiresAt: number;
}

export interface ClaudeConfig {
  defaultAccountId?: string;
  accounts?: Array<{
    id: string;
    email?: string;
    name?: string;
  }>;
}

export interface CachedUsage {
  usage: ClaudeUsage;
  timestamp: number;
}

export interface ExtensionConfig {
  updateInterval: number;
  showNotifications: boolean;
  warningThreshold: number;
}

export enum UsageLevel {
  Normal = 'normal',
  Warning = 'warning',
  Critical = 'critical'
}

