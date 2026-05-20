# Changelog

Notable changes per version. Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Versions follow [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- **Search tab** querying `skills.sh/api/search` with debounced input (300ms) and four sort modes: Featured (most installs), Fewest installs, A–Z, Z–A.
- **Featured list** on the Search home, populated from 8 broad seed queries (react, design, testing, security, docs, typescript, nextjs, best-practices). Deduplicated by id, sorted by install count.
- **In-memory LRU search cache** in the main process. 5-minute TTL, 100 entries max. Avoids hitting `skills.sh` rate limits when navigating between tabs.
- **Tab keep-alive**. Both Installer and Search stay mounted, hidden via CSS when inactive. State and the Featured list persist across tab switches.
- **Logo**: geometric S monogram in the app palette. Inline in the Installer titlebar (`Logo` mark variant) and on the AgentSelect screen (`Logo` icon variant with the dark tile and ambient glow).
- **Raster icon pipeline**. `npm run icons` runs `scripts/generate-icons.mjs` (uses `sharp`) to emit `assets/icons/icon.png` (1024×1024 master) plus sized variants down to 16px. electron-builder derives `.icns` and `.ico` from the master.
- **AppImage target** for Linux added to `electron-builder.yml`.
- **Global Cmd+Enter / Ctrl+Enter** shortcut in the Installer tab. Fires `Install` regardless of which control has focus, as long as the Installer tab is visible.
- **Retry button** when the Featured list comes back empty (rate limit or network).
- **Agent selection screen** on first launch, with a "Remember for next sessions" checkbox. 9 known agents (Claude Code, Cursor, Codex, OpenCode, Antigravity, Windsurf, Gemini Code Assist, GitHub Copilot, Continue) plus a custom-agent text input.
- **`force reinstall` toggle** that passes `--force` to the CLI.
- **Smart auto-follow scroll** in the execution panel. Pauses when the user scrolls up, resumes via the floating button.
- **Heartbeat (15s) and hard timeout (90s)** on each spawn to recover from stuck CLI runs.
- **Detection of "already installed"** output, surfaced as `skipped` status rather than `ok`.
- **GitHub Actions CI** (typecheck, tests, build on push and PR across ubuntu, macos, windows) and release pipeline (mac dmg + win nsis on tag push).
- **TDD-first workflow** documented in CONTRIBUTING.md.

### Changed

- Upgraded Electron from 33 to 42. Resolves 18 advisories (ASAR integrity bypass, AppleScript injection, multiple use-after-free, command-line switch injection, others).
- Upgraded electron-builder from 25 to 26 and electron-vite from 2 to 5.
- Pinned Vite to 7 and `@vitejs/plugin-react` to 5 for compatibility with electron-vite 5.
- electron-vite config emits CJS `.js` (instead of `.mjs`) so the existing CommonJS main process keeps working without a rewrite to ESM.

### Fixed

- Index mismatch between main process and renderer that left runs stuck in `pending` when comments or blank lines were interleaved with skill sources.
- Lockfile drift across platforms. `.npmrc` pins `include=optional` and the CI runs a guard step that fails fast if `package-lock.json` falls out of sync with `package.json`.

## [0.1.0] - 2026-05-19

Initial public release.
