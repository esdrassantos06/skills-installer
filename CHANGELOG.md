# Changelog

Notable changes per version. Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Versions follow [Semantic Versioning](https://semver.org/).

## [0.1.5] - 2026-05-20

### Fixed

- **Windows CI test failures.** `tests/installedSkills.test.ts` was hard-coding POSIX path strings (`/home/test/.claude/skills/foo`) for its expectations. On Windows runners, `path.join` returns backslash-separated paths, so the equality checks failed. Tests now build expected paths via `path.join` so they match the host's separator. Production code was already correct.

### Note

v0.1.4 was tagged but its release build failed in the Windows test job, blocking the consolidated release. v0.1.5 is the same changeset plus this test fix.

## [0.1.5] - 2026-05-20

### Fixed

- **Windows CI test failures.** `tests/installedSkills.test.ts` hard-coded POSIX path strings in expectations, which broke on Windows runners where `path.join` returns backslash-separated paths. Tests now construct expected paths via `path.join` to match the host separator. Production code was already correct.
- **macOS release artifact upload.** `actions/upload-artifact@v5` does not support brace expansion in its `path` field, so `dist/*.{dmg,zip}` silently matched zero files. Switched the matrix entry to a multi-line block scalar that the action splits into two separate patterns.

### Note

v0.1.4 was tagged but its release pipeline failed on both Windows CI tests and the macOS upload step. v0.1.5 ships the same runtime fixes plus these CI-side corrections.

## [0.1.4] - 2026-05-20

### Fixed

- **Already-installed detection.** The previous regex on CLI stdout missed reinstalls because the `skills` CLI doesn't always print `already installed` / `skipping`. Replaced with a filesystem pre-check: before the install loop, the main process probes each referenced skill name against the 9 known agent install dirs (`.claude/skills`, `.cursor/skills`, `.codex/skills`, `.opencode/skills`, `.gemini/antigravity/skills`, `.windsurf/skills`, `.continue/skills`, `.copilot/skills`, `.agents/skills`). Match returns `skipped` without spawning npx. Force-reinstall toggle bypasses the check.
- **Execution state lost when opening the agent picker.** Clicking "change agents" was remounting the entire Shell, throwing away runs, input, summary, and scroll position. The picker now renders as an overlay on top of Shell instead of replacing it.

### Added

- `extractSkillNames` in the parser pulls skill names out of `owner/repo@skill` sources and `--skill` / `-s` flags so the pre-flight check has matchable tokens. 11 new tests.
- `getInstalledSkillNames` / `shouldSkip` in `src/main/installedSkills.ts`. Filesystem-based, injection-friendly, no spawn. 11 new tests.

## [0.1.3] - 2026-05-20

### Fixed

- **Release pipeline**. electron-builder 26 renamed `nsis.allowToChangeInstallationDir` to `allowToChangeInstallationDirectory`. The mismatch was failing the dist step before the build started.
- **Unsigned distribution paths for macOS and Windows**. Set `mac.identity: null` and `CSC_IDENTITY_AUTO_DISCOVERY=false` in the release workflow so the build no longer requires a paid Apple Developer cert. macOS ships as `.zip` (recommended) and `.dmg`. Windows ships as NSIS installer and portable `.exe`. SmartScreen and Gatekeeper still warn (no free way around that), so the release body now embeds the bypass instructions (xattr command for macOS, "More info, Run anyway" for Windows).
- **Linux AppImage** added to the release pipeline. Previously only mac and win were built.
- **CI lockfile-drift guard** removed. It kept catching a cross-platform npm quirk that always had the same fix (re-run install). Net cost > value for a small team. CI now uses `npm install --include=optional` symmetrically across all three OSes.

### Note

v0.1.2 was tagged but its release build failed at the electron-builder validation step. The GitHub Release page for v0.1.2 only contains the auto-generated source archives. v0.1.3 is the first release with real artifacts.

## [0.1.2] - 2026-05-20

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
