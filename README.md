# Claude Code Stats

Monitor Claude Code API usage in VS Code with real-time statistics.

## Features

- **Status Bar Integration**: See your Claude API usage at a glance in the VS Code status bar
- **Real-time Monitoring**: Automatically updates usage statistics every 5 minutes (configurable)
- **Detailed Statistics**: View comprehensive usage information in a dedicated sidebar
- **Usage Alerts**: Get notified when your usage exceeds configurable thresholds
- **Multiple Windows**: Track 5-hour, 7-day, and 7-day Opus usage windows
- **No Re-authentication**: Uses your existing Claude Code CLI credentials

## Requirements

- **macOS**: Currently only supports macOS (uses Keychain for authentication)
- **Claude Code CLI**: Must be authenticated with Claude Code CLI (`claude` command)
- **VS Code**: Version 1.85.0 or higher

## Installation

### From Source

1. Clone or download this repository
2. Install dependencies:
   ```bash
   cd claude-code-stats
   npm install
   ```
3. Update the publisher ID in `package.json`:
   ```json
   "publisher": "your-publisher-id"
   ```
4. Compile the extension:
   ```bash
   npm run compile
   ```
5. Package the extension:
   ```bash
   npm run package
   ```
6. Install the generated `.vsix` file:
   ```bash
   code --install-extension claude-code-stats-0.1.0.vsix
   ```

## Setup

1. Ensure you're authenticated with Claude Code CLI:
   ```bash
   claude
   ```
2. Reload VS Code
3. The extension will automatically start monitoring your usage

## Usage

### Status Bar

The status bar item shows your current maximum usage across all windows:

- `$(pulse) Claude 45%` - Normal usage (< 75%)
- `$(warning) Claude 80%` - Warning usage (75-90%)
- `$(alert) Claude 95%` - Critical usage (≥ 90%)

Click the status bar item to open the detailed statistics view.

### Sidebar

The extension adds a "Claude Stats" sidebar with:

<!-- - **Usage Overview**: Tree view with detailed breakdown by window -->
- **Detailed Statistics**: Webview with progress bars and visual indicators

### Commands

Available commands (accessible via `Cmd+Shift+P`):

- `Claude Stats: Refresh Claude Stats` - Manually refresh usage data
- `Claude Stats: Show Detailed Usage` - Open the detailed statistics view
- `Claude Stats: Login to Claude Code` - Get help with authentication

## Configuration

Configure the extension in VS Code settings (`Cmd+,`):

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `claude-stats.updateInterval` | number | 300 | Update interval in seconds (minimum 60) |
| `claude-stats.showNotifications` | boolean | true | Show notifications when usage is high |
| `claude-stats.warningThreshold` | number | 90 | Warning threshold percentage (0-100) |
| `claude-stats.apiKey` | string | "" | Optional API key (CLI auth preferred) |

### Example Configuration

```json
{
  "claude-stats.updateInterval": 180,
  "claude-stats.showNotifications": true,
  "claude-stats.warningThreshold": 85
}
```

## How It Works

1. **Authentication**: Reads OAuth credentials from macOS Keychain (same credentials used by Claude Code CLI)
2. **API Calls**: Fetches usage data from `api.anthropic.com/api/oauth/usage`
3. **Caching**: Stores usage data locally in `~/.claude/stats-cache.json` (5-minute cache)
4. **Updates**: Automatically refreshes usage data at configured intervals
5. **Notifications**: Shows warning when usage exceeds threshold

## Troubleshooting

### "Not authenticated" error

1. Ensure you're logged in with Claude Code CLI:
   ```bash
   claude
   ```
2. Check that credentials are stored in Keychain:
   ```bash
   security find-generic-password -s "Claude Code-credentials"
   ```

### No usage data shown

1. Try manually refreshing: `Cmd+Shift+P` → "Refresh Claude Stats"
2. Check the Output panel for errors: View → Output → "Claude Stats"
3. Ensure you have an active internet connection

### Extension not working on Windows/Linux

Currently, the extension only supports macOS due to Keychain dependency. Windows and Linux support is planned for future releases.

## Privacy & Security

- **Local Storage**: All data is stored locally on your machine
- **No Logging**: OAuth tokens are never logged or transmitted to third parties
- **HTTPS Only**: All API calls use HTTPS encryption
- **Keychain Security**: Credentials are stored securely in macOS Keychain

## Development

### Building from Source

```bash
# Install dependencies
npm install

# Compile TypeScript
npm run compile

# Watch mode (auto-compile on changes)
npm run watch

# Package extension
npm run package
```

### Testing

1. Open the project in VS Code
2. Press `F5` to launch Extension Development Host
3. Test the extension in the new window

## Known Limitations

- **macOS only**: Keychain access requires macOS
- **OAuth only**: Only supports OAuth authentication (not API keys)
- **Read-only**: Cannot modify usage limits or settings via API

## Roadmap

- [ ] Windows and Linux support (Credential Manager, Secret Service)
- [ ] Historical usage charts
- [ ] Cost tracking and estimation
- [ ] Multi-account support
- [ ] Export usage reports (CSV/JSON)
- [ ] Desktop notifications
- [ ] Usage prediction (ML-based)

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

## License

MIT

## Acknowledgments

- Built for use with [Claude Code](https://claude.com/claude-code)
- Uses the [Anthropic API](https://docs.anthropic.com/)

---

**Note**: This is an unofficial extension and is not affiliated with Anthropic.
