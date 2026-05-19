# Changelog

Notable changes per version. Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Versions follow [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added
- Skills search tab querying `skills.sh/api/search` with debounced input and Featured / fewest-installs / A–Z / Z–A sort.
- Agent selection screen on first launch with persistence (`Remember for next sessions` checkbox).
- `force reinstall` toggle that passes `--force` to the CLI.
- Smart auto-follow scroll in the execution panel — pauses when the user scrolls up, resumes via the floating button.
- Heartbeat (15s) and hard timeout (90s) on each spawn to recover from stuck CLI runs.
- Detection of "already installed" output → `skipped` status instead of `ok`.
- GitHub Actions CI (typecheck + tests + build on push/PR) and release pipeline (mac dmg + win nsis on tag push).
- TDD-first workflow documented in CONTRIBUTING.md.

### Fixed
- Index mismatch between main process and renderer that caused runs to stay `pending` forever when comments or blank lines were mixed with skill sources.

## [0.1.0] – 2026-05-19

Initial public release.
