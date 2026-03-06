# Code Review: Identified Gaps

## 1. No Test Coverage
- Zero test files (`.test.ts`, `.spec.ts`)
- No test framework configured (Jest, Vitest, etc.)
- Pure logic classes like `UsageCalculator` are easily testable but untested

## 2. Config Default Mismatch
- `package.json` defines `updateInterval` default as **60**
- `extension.ts` `getConfig()` uses fallback default of **300**
- Inconsistent behavior depending on which default takes effect

## 3. Dead Code: `apiKey` Setting
- `apiKey` is defined in `package.json` configuration and `ExtensionConfig` type
- `ClaudeClient` only accepts OAuth tokens — `apiKey` is never consumed
- Should either be implemented or removed

## 4. No Token Refresh
- `auth-manager.ts` returns `null` when token expires
- No automatic refresh token flow implemented
- Users must manually re-authenticate via CLI

## 5. No API Retry Logic
- `claude-client.ts` has no retry mechanism for network errors or 429 rate limits
- `retry-after` header is read but never acted upon

## 6. Command Registration Outside try-catch
- In `extension.ts`, command handlers (lines 67-108) are registered outside the main try-catch
- If activation fails, `usageMonitor` may be undefined when commands execute

## 7. Duplicate Code
- `formatResetTime` logic duplicated in both `usage-calculator.ts` and `webview-provider.ts` (inline JS)
- Changes require updates in two places

## 8. Missing Webview CSP
- No `Content-Security-Policy` meta tag in webview HTML
- VS Code extension guidelines recommend CSP for all webviews

## 9. No Refresh Debouncing
- Rapid refresh commands trigger multiple concurrent API calls
- No guard against in-flight request duplication

## 10. Incomplete Resource Disposal
- `UsageTreeProvider`'s `EventEmitter` is never disposed
- Only `StatusBarManager` is added to `context.subscriptions`

## 11. macOS Only
- `keychain-access.ts` uses macOS `security` command exclusively
- No Windows (Credential Manager) or Linux (Secret Service) support

## 12. Synchronous File I/O
- `cache-manager.ts` uses `fs.readFileSync` / `fs.writeFileSync`
- `auth-manager.ts` uses `fs.readFileSync`
- Can block the VS Code main thread
