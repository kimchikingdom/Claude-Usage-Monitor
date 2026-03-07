# Improvement Plan

## Phase 1: Critical Bug Fixes (Stability)

### 1-1. Move command registration inside try-catch — `extension.ts`
- Move command registration (lines 67-108) inside the try-catch block
- Prevent runtime crash when `usageMonitor` is uninitialized due to activation failure

### 1-2. Fix config default mismatch — `extension.ts:123`
- Change `getConfig()` `updateInterval` fallback from 300 → 60 (match package.json)

### 1-3. Remove dead code — `package.json`, `types.ts`
- Remove unused `apiKey` setting from package.json configuration
- Remove `apiKey` field from `ExtensionConfig` interface

---

## Phase 2: Security Hardening

### 2-1. Add Webview CSP — `webview-provider.ts`
- Add `<meta http-equiv="Content-Security-Policy">` tag
- Use nonce-based script allowlisting

### 2-2. Remove duplicate formatResetTime — `webview-provider.ts`
- Remove duplicated `formatResetTime` logic from inline webview JS
- Pre-compute reset time strings server-side and pass as data

---

## Phase 3: Reliability Improvements

### 3-1. Add API retry logic — `claude-client.ts`
- Implement exponential backoff retry (max 3 attempts)
- Honor `retry-after` header on 429 responses
- Auto-retry on transient network errors

### 3-2. Add refresh debouncing — `usage-monitor.ts`
- Add `isUpdating` flag to guard concurrent requests
- Skip duplicate calls while a request is in-flight

### 3-3. Improve token expiry handling — `auth-manager.ts`
- Show pre-emptive warning when token expires within 5 minutes
- Display re-authentication prompt on expiry

---

## Phase 4: Code Quality

### 4-1. Set up test framework
- Install Jest + ts-jest
- Create `jest.config.js` and `tsconfig.test.json`

### 4-2. Write unit tests
- `UsageCalculator` tests (pure functions, easiest target)
- `CacheManager` tests
- `ClaudeClient` tests (mock https)

### 4-3. Fix resource disposal — `tree-provider.ts`, `extension.ts`
- Implement `dispose()` for `EventEmitter`
- Register all disposables in `context.subscriptions`

---

## Phase 5: Async I/O Migration

### 5-1. Convert to async file I/O — `cache-manager.ts`, `auth-manager.ts`
- `fs.readFileSync` → `fs.promises.readFile`
- `fs.writeFileSync` → `fs.promises.writeFile`
- `fs.existsSync` → `fs.promises.access`

---

## Phase 6: Cross-Platform Support (Long-term)

### 6-1. Abstract platform-specific auth — `auth/`
- Create `CredentialProvider` interface
- `MacOSKeychainProvider` (existing code)
- `WindowsCredentialProvider` (future)
- `LinuxSecretServiceProvider` (future)
- Auto-select provider via `os.platform()`
