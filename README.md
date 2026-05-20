<p align="center">
  <img src="assets/logo-wordmark.svg" alt="Skills Installer" width="480">
</p>

<p align="center">
  Desktop GUI for installing <a href="https://skills.sh">agent skills</a> in batch. Paste a list, click install, get a status card per skill, instead of running <code>npx skills add ...</code> one at a time.
</p>

<p align="center">
  <a href="https://github.com/esdrassantos06/skills-installer/actions"><img alt="CI" src="https://github.com/esdrassantos06/skills-installer/actions/workflows/ci.yml/badge.svg"></a>
  <a href="https://github.com/esdrassantos06/skills-installer/releases"><img alt="Release" src="https://img.shields.io/github/v/release/esdrassantos06/skills-installer?include_prereleases"></a>
  <a href="LICENSE"><img alt="License: MIT" src="https://img.shields.io/badge/license-MIT-blue"></a>
</p>

---

Targets Claude Code by default, plus eight other agents (Cursor, Codex, OpenCode, Antigravity, Windsurf, Gemini Code Assist, GitHub Copilot, Continue). Cross-platform: macOS (arm64 + x64), Windows, Linux.

## What it does

The `skills` CLI installs one source per invocation and prompts for confirmation. That doesn't scale when you're populating a fresh setup with 30+ skills across testing, design, security, and docs. This app fixes that:

- Accepts a list of `owner/repo@skill` lines, or full `npx skills add ...` commands. Both parse fine.
- Injects `-y`, `-g`, and `-a <agent>` per line so nothing prompts.
- Runs sequentially with a status card per skill: `pending` → `running` → `ok` / `skipped` / `failed`.
- Detects "already installed" output and shows it as `skipped` rather than treating it as success.
- Kills any spawn that hangs for 90 seconds. A stuck CLI used to mean infinite "pending".
- Browses the skills.sh catalog from a built-in **Search** tab with a Featured list cached in memory.

## Install

### Pre-built releases

Grab the artifact for your OS from [GitHub Releases](https://github.com/esdrassantos06/skills-installer/releases).

**macOS** (`.zip` or `.dmg`, arm64 / x64). The app is **not** code-signed (no Apple Developer cert), so macOS will refuse to open it on the first run with "app is damaged and can't be opened" or "developer cannot be verified". To bypass:

```bash
xattr -dr com.apple.quarantine "/Applications/Skills Installer.app"
```

That strips the quarantine attribute macOS adds to downloaded binaries. After that, the app opens normally. Alternative: right-click the app, pick **Open** the first time, confirm in the prompt.

**Windows** (`.exe` installer or portable). Also unsigned, so Microsoft SmartScreen will show "Windows protected your PC" on first run. Click **More info** then **Run anyway**. This is the expected experience for unsigned binaries from individual developers, and Microsoft only stops showing the warning after the binary builds reputation across many downloads.

**Linux** (`.AppImage`):

```bash
chmod +x "Skills Installer-X.Y.Z.AppImage"
./Skills\ Installer-X.Y.Z.AppImage
```

### From source

```bash
git clone https://github.com/esdrassantos06/skills-installer.git
cd skills-installer
npm install
npm run dev
```

To build distributable installers locally:

```bash
npm run dist:mac     # .zip + .dmg, arm64 + x64
npm run dist:win     # .exe NSIS installer + portable
npm run dist:linux   # .AppImage
npm run dist:all     # all three
```

## Usage

On first launch you pick which agents to target. Tick "Remember for next sessions" if you don't want that screen again.

### Installer tab

Paste one source per line:

```
# Frontend
anthropics/skills@frontend-design
vercel-labs/agent-skills@vercel-react-best-practices

# Testing
anthropics/skills@webapp-testing
antfu/skills@vitest
```

Press `⌘↵` (or `Ctrl+↵` on Windows) to run them all. The shortcut works regardless of which control has focus inside the tab. Lines starting with `#` are ignored. Preset buttons (Design, React/Next/RN, Backend/TS, Testing, Writing, Docs, Security, A11y/Review) append curated bundles without duplicating.

### Search tab

Featured list loads the top results across 8 broad categories (react, design, testing, security, docs, typescript, nextjs, best-practices), deduplicates by id, and sorts by install count. Click `+ add` on any row to push that source into the Installer tab.

The search input debounces for 300ms and requires at least 2 characters. Results live in an in-memory LRU cache (TTL 5 minutes, 100 entries) so flipping back to the Installer tab and returning doesn't refetch.

Sort options apply to both Featured and search results:

- **Featured** (most installed, default)
- **Fewest installs**
- **A–Z** / **Z–A**

## Flags

Every parsed line gets these appended unless the line specifies them inline:

| Flag | Default | Override |
|------|---------|----------|
| `-y` | always | n/a |
| `-g` (global install) | yes | inline `--no-global` |
| `--force` | off | toggle the "force reinstall" checkbox |
| `-a <agent>` | each agent picked on the first screen | inline `-a cursor` replaces defaults for that line |

Tokens you pass inline like `--skill name` or `--branch main` are preserved as-is.

## Architecture

```
┌──────────────────────────────┐
│  Renderer (React + Tailwind) │
│  Installer + Search tabs     │
│  Per-run status cards        │
│  Featured list with cache    │
└─────────┬────────────────────┘
          │ ipcRenderer.invoke('install-all' | 'search-skills', ...)
          ▼
┌──────────────────────────────┐
│  Main (Node + Electron)      │
│  parseLine() per entry       │
│  spawn(npx, args)            │
│  15s heartbeat, 90s kill     │
│  In-memory LRU search cache  │
│  fetch skills.sh API         │
└─────────┬────────────────────┘
          │ webContents.send('install:*', payload)
          ▼
┌──────────────────────────────┐
│  Preload (contextBridge)     │
│  window.api.installAll       │
│  window.api.searchSkills     │
│  window.api.clearSearchCache │
└──────────────────────────────┘
```

Pure logic (`parser.ts`, `skillsApi.ts`, `searchReducer.ts`, `cache.ts`) lives in `src/main/` and is tested without electron mocks.

## Tests

```bash
npm test           # vitest run (58 tests)
npm run test:watch # vitest watch
npm run test:ui    # vitest browser UI
```

The suite covers:

- **Parser** (21 tests). Every flag combination, comments, quoted bundles, multiple agents.
- **Search reducer** (17 tests). State machine, sort modes, edge cases.
- **Skills.sh API client** (10 tests). Mocked fetch, HTTP errors, malformed payloads.
- **Cache** (10 tests). TTL expiry, LRU eviction, key normalization, recency refresh.

## Layout

```
src/main/         parser.ts, skillsApi.ts, searchReducer.ts, cache.ts, index.ts
src/preload/      contextBridge surface (window.api)
src/renderer/     React app: App, AgentSelect, SearchPage, Logo, agents
tests/            parser, searchReducer, skillsApi, cache
assets/           logo.svg, logo-wordmark.svg, favicon.svg, generated icons
scripts/          generate-icons.mjs
.github/          workflows + issue/PR templates + dependabot
```

## Stack

| Layer | Tooling |
|-------|---------|
| Bundling | electron-vite 5, Vite 7 |
| Shell | Electron 42 |
| UI | React 18, Tailwind v4 (via `@tailwindcss/vite`) |
| Types | TypeScript 5.7 (strict) |
| Font | JetBrains Mono Variable, self-hosted via `@fontsource-variable` |
| Tests | Vitest 4 |
| Packaging | electron-builder 26 (dmg, nsis, AppImage) |
| Raster icons | sharp (run `npm run icons` after editing the SVG) |

## Contributing

Read [CONTRIBUTING.md](CONTRIBUTING.md) first. In short: write a failing test before the feature, keep PRs scoped, follow [Conventional Commits](https://www.conventionalcommits.org/).

## Security

If you find a vulnerability, please don't open a public issue. See [SECURITY.md](SECURITY.md) for private reporting.

Threat model summary: spawned commands use `shell: false`, so no shell expansion. Electron runs with `contextIsolation: true` and `nodeIntegration: false`. The only outbound call from the main process is a hardcoded GET to `skills.sh`. Skills themselves run with full agent permissions once installed, so vet sources before adding them.

## License

MIT. See [LICENSE](LICENSE).

## Acknowledgments

Built using skills from the ecosystem this app installs:

- `anthropics/skills@frontend-design`, `nextlevelbuilder/ui-ux-pro-max-skill@ui-ux-pro-max`, `leonxlnx/taste-skill@design-taste-frontend`, `wshobson/agents@tailwind-design-system`. Visual direction.
- `vercel-labs/agent-skills@vercel-react-best-practices`, `mcollina/skills@node`. Code patterns.
- `anthropics/skills@webapp-testing`, `antfu/skills@vitest`. Test foundation.
- `xixu-me/skills@opensource-guide-coach`, `xixu-me/skills@github-actions-docs`, `wshobson/agents@github-actions-templates`. OSS scaffolding.
- `addyosmani/agent-skills@documentation-and-adrs`, `softaworks/agent-toolkit@crafting-effective-readmes`. Doc structure.
- `rknall/claude-skills@svg-logo-designer`. Logo design.
- `brianlovin/claude-config@deslop`, `jalaalrd/anti-ai-slop-writing@anti-ai-slop-writing`. Writing discipline.

This app installs its own dependencies.
