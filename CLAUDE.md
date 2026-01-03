# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a VS Code extension that monitors Claude Code API usage in real-time. It displays usage statistics in the status bar, sidebar tree view, and webview panel, using OAuth credentials from the Claude Code CLI without requiring re-authentication.

**Platform**: macOS only (uses Keychain for authentication)

## Build & Development Commands

```bash
# Install dependencies
npm install

# Compile TypeScript (required before running/packaging)
npm run compile

# Watch mode (auto-compile on changes during development)
npm run watch

# Package extension to .vsix file
npm run package

# Install packaged extension locally
code --install-extension claude-code-stats-0.1.0.vsix
```

## Testing the Extension

1. Open project in VS Code
2. Press `F5` to launch Extension Development Host
3. Test features in the new window
4. Check Output panel (View → Output → "Claude Stats") for logs

## Architecture

### Authentication Flow

1. **Keychain Access** (`src/auth/keychain-access.ts`): Reads OAuth credentials from macOS Keychain using `security find-generic-password` command
   - Service name: `"Claude Code-credentials"`
   - Account: `"default"`
   - Returns: `accessToken` and `expiresAt`

2. **Auth Manager** (`src/auth/auth-manager.ts`): Manages authentication state
   - Validates token expiration
   - Reads user config from `~/.claude.json`
   - Checks platform availability (macOS only)

3. **API Client** (`src/api/claude-client.ts`): Makes HTTPS requests to `api.anthropic.com/api/oauth/usage`
   - Timeout: 30 seconds
   - Handles 401 (expired token), 429 (rate limit), network errors
   - Beta header required: `anthropic-beta: oauth-2025-04-20,fine-grained-tool-streaming-2025-05-14`

### Data Flow

```
extension.ts (activate)
    ↓
AuthManager checks Keychain → gets OAuth token
    ↓
UsageMonitor starts → fetches usage from API
    ↓
Updates 3 UI components:
- StatusBarManager (status bar item)
- UsageTreeProvider (sidebar tree view)
- WebviewProvider (detailed statistics webview)
```

### Core Components

- **extension.ts**: Entry point, initializes all managers and registers commands
- **services/usage-monitor.ts**: Background polling service (default: 5 minutes)
- **services/cache-manager.ts**: Caches usage data to `~/.claude/stats-cache.json`
- **ui/status-bar.ts**: Status bar with icons indicating usage level (pulse/warning/alert)
- **ui/tree-provider.ts**: Tree view showing breakdown by window (5-hour, 7-day, 7-day Opus)
- **ui/webview-provider.ts**: Detailed statistics with progress bars
- **api/usage-calculator.ts**: Calculates max utilization across windows and formats display

### Type System

All types are defined in `types.ts`:

- **ClaudeUsage**: API response structure with three optional windows (`five_hour`, `seven_day`, `seven_day_opus`)
- **UsageWindow**: Contains `utilization` (0-100) and `resets_at` (ISO 8601 timestamp)
- **OAuthCredentials**: Access token and expiration time
- **ExtensionConfig**: User settings (update interval, notifications, thresholds)

## Commands

Available via Command Palette (`Cmd+Shift+P`):

- `claude-stats.refresh`: Manually refresh usage data
- `claude-stats.showDetails`: Open detailed statistics webview
- `claude-stats.login`: Show authentication help dialog

## Configuration Settings

Defined in `package.json` under `contributes.configuration`:

| Setting | Default | Min/Max | Description |
|---------|---------|---------|-------------|
| `claude-stats.updateInterval` | 300 | min: 60 | Update interval in seconds |
| `claude-stats.showNotifications` | true | - | Show high usage notifications |
| `claude-stats.warningThreshold` | 90 | 0-100 | Warning threshold percentage |
| `claude-stats.apiKey` | "" | - | Optional API key (not used; CLI auth preferred) |

## File Structure

```
src/
├── extension.ts              # Entry point, command registration
├── types.ts                  # All TypeScript interfaces
├── auth/
│   ├── auth-manager.ts      # Authentication orchestration
│   └── keychain-access.ts   # macOS Keychain access via 'security' command
├── api/
│   ├── claude-client.ts     # HTTPS API client
│   └── usage-calculator.ts  # Usage statistics calculations
├── ui/
│   ├── status-bar.ts        # VS Code status bar item
│   ├── tree-provider.ts     # TreeDataProvider for sidebar
│   └── webview-provider.ts  # WebviewViewProvider for details panel
└── services/
    ├── usage-monitor.ts     # Periodic polling + callbacks
    └── cache-manager.ts     # Local JSON cache management
```

## Important Implementation Details

### OAuth Token Extraction

The `keychain-access.ts` file uses Node.js `child_process.exec` to run:
```bash
security find-generic-password -s "Claude Code-credentials" 2>&1
```

This automatically detects the account name from Keychain and retrieves the credentials. The system extracts the account name dynamically, so it works for any user without hardcoding.

### API Response Structure

The `/api/oauth/usage` endpoint returns:
```json
{
  "five_hour": { "utilization": 45, "resets_at": "2026-01-03T12:00:00Z" },
  "seven_day": { "utilization": 67, "resets_at": "2026-01-05T00:00:00Z" },
  "seven_day_opus": { "utilization": 20, "resets_at": "2026-01-05T00:00:00Z" }
}
```

All windows are optional and may be null/undefined.

### Status Bar Icons

Icons change based on max utilization across all windows:
- `$(pulse)` for usage < 75%
- `$(warning)` for usage 75-90%
- `$(alert)` for usage ≥ 90%

### Cache Strategy

- Location: `~/.claude/stats-cache.json`
- TTL: 5 minutes (300 seconds)
- Used when API request fails or to reduce API calls
- Contains: `{ usage: ClaudeUsage, timestamp: number }`

## Platform Constraints

- **macOS only**: Uses `security` command for Keychain access
- Future: Windows (Credential Manager), Linux (Secret Service) support planned
- Extension shows warning message on non-macOS platforms but doesn't crash

## Common Issues

### "Not authenticated" error
User needs to run `claude` CLI to authenticate. The extension reads those credentials from Keychain.

### No usage data
Check Output panel for errors. Verify internet connection and that OAuth token hasn't expired.

### macOS Keychain access denied
User may need to grant Terminal or VS Code permissions in System Settings → Privacy & Security → Keychain.
