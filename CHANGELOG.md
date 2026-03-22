# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.2] - 2026-03-23

### Added
- Linux and Windows support: reads credentials from `~/.claude/.credentials.json`
- `usageTree` view registration fix (resolves "No view is registered" error)

### Changed
- Updated README to reflect cross-platform support
- Removed unused `apiKey` setting
- Fixed `updateInterval` default value (300 → 60 seconds)

### Security
- Replaced `exec` with `execFile` for Keychain access to prevent command injection

### Added
- Keyboard shortcuts (`Cmd/Ctrl+Alt+U` for refresh, `Cmd/Ctrl+Alt+Shift+U` for details)
- Color preset documentation in README
- ESLint and Prettier configuration
- Unit tests with Mocha and @vscode/test-electron
- GitHub Actions CI/CD workflows
- "Visualization" category for VS Code Marketplace
- **Offline status indicator**: Shows connection status in status bar and sidebar
  - `$(cloud-offline)` icon when offline
  - Displays cached data when available during offline periods
  - "Connecting..." spinner during initial connection
  - Clear error messages for authentication issues

### Fixed
- README documentation now matches actual default values

## [0.1.1] - 2025-01-22

### Added
- Extension icon for VS Code Marketplace
- Updated display name to "Usage Monitor - Claude Code"

### Fixed
- Image URLs in README for marketplace display

## [0.1.0] - 2025-01-08

### Added
- Initial release
- Status bar integration showing Claude API usage percentage
- Real-time monitoring with configurable update interval (minimum 60 seconds)
- Detailed statistics sidebar with progress bars
- Usage alerts when threshold is exceeded (configurable, default 90%)
- Support for three usage windows:
  - 5-hour window
  - 7-day window
  - 7-day Opus window
- macOS Keychain integration for authentication
- Local caching with 5-minute TTL
- Color presets (default, blue, purple, monochrome, custom)
- Custom color configuration support

### Security
- OAuth tokens are never logged
- All API calls use HTTPS
- Credentials stored securely in macOS Keychain

## [0.0.1] - 2025-01-03

### Added
- Initial development version
- Basic usage monitoring functionality
- Configuration options for update interval and warning threshold
