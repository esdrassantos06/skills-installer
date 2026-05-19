# Skills Installer

Desktop GUI for installing [agent skills](https://skills.sh) in batch. Paste a list, click install, get a status card per skill — instead of running `npx skills add ...` one at a time.

Targets Claude Code by default, plus eight other agents (Cursor, Codex, OpenCode, Antigravity, Windsurf, Gemini Code Assist, GitHub Copilot, Continue). Cross-platform: macOS (arm64 + x64) and Windows.

## What it does

The skills CLI installs one source per invocation and prompts for confirmation. That doesn't scale when you're populating a fresh setup with 30+ skills across testing, design, security, and docs. This app:

- Accepts a list of `owner/repo@skill` lines (or full `npx skills add ...` commands — both parse fine)
- Adds `-y`, `-g`, and `-a <agent>` per line so nothing prompts
- Runs sequentially with a status card per skill: `pending` → `running` → `ok` / `skipped` / `failed`
- Detects "already installed" output and surfaces it as `skipped` rather than treating it as success
- Kills any spawn that goes 90 seconds without output (a hung CLI used to mean infinite "pending")
- Searches the skills.sh catalog from a built-in tab so you can find new skills without leaving the app

## Install (from source)

```bash
git clone https://github.com/YOUR-GH-USERNAME/skills-installer.git
cd skills-installer
npm install
npm run dev          # launches Electron in dev mode
```

To build distributable installers:

```bash
npm run dist:mac     # .dmg, arm64 + x64
npm run dist:win     # .exe NSIS, x64
npm run dist:all     # both
```

Pre-built releases ship via [GitHub Releases](https://github.com/YOUR-GH-USERNAME/skills-installer/releases) on tagged versions.

## Usage

On first launch you pick which agents to target. Tick "Remember for next sessions" if you don't want that screen again.

The **Installer** tab takes one source per line:

```
# Frontend
anthropics/skills@frontend-design
vercel-labs/agent-skills@vercel-react-best-practices

# Testing
anthropics/skills@webapp-testing
antfu/skills@vitest
```

Press `⌘↵` (or `Ctrl+↵` on Windows) to run all of them. Lines starting with `#` are ignored. Preset buttons (Design, React/Next/RN, Backend/TS, Testing, Writing, Docs, Security, A11y/Review) append curated bundles.

The **Search** tab queries skills.sh live. Results show the source, name, and install count. Click `+ add` to push a skill into the Installer tab.

## Flags

Every parsed line gets these appended unless the line specifies them:

| Flag | Default | Override |
|------|---------|----------|
| `-y` | always | — |
| `-g` (global install) | yes | `--no-global` |
| `--force` | no | toggle the checkbox |
| `-a <agent>` | per selected agent | inline `-a cursor` overrides for that line |

Tokens you pass inline (like `--skill name` or `--branch main`) get preserved.

## Architecture

```
┌──────────────────────────────┐
│  Renderer (React + Tailwind) │
│  - Installer + Search tabs   │
│  - Per-run status cards      │
└─────────┬────────────────────┘
          │ ipcRenderer.invoke('install-all' | 'search-skills', ...)
          ▼
┌──────────────────────────────┐
│  Main (Node + Electron)      │
│  - parseLine() per entry     │
│  - spawn(npx, args)          │
│  - 15s heartbeat / 90s kill  │
│  - fetch skills.sh API       │
└─────────┬────────────────────┘
          │ webContents.send('install:*', payload)
          ▼
┌──────────────────────────────┐
│  Preload (contextBridge)     │
│  - window.api.installAll     │
│  - window.api.searchSkills   │
└──────────────────────────────┘
```

Pure logic (`parser.ts`, `skillsApi.ts`, `searchReducer.ts`) lives in `src/main/` and gets tested without electron mocks.

## Tests

```bash
npm test           # vitest run
npm run test:watch # vitest watch
npm run test:ui    # vitest browser UI
```

The suite covers the parser (every flag combination, edge cases like comments, quoted bundles, multiple agents), the search reducer state machine, and the skills.sh API client with a mocked fetch.

## Layout

```
src/main/         parser.ts, skillsApi.ts, searchReducer.ts, index.ts (IPC + spawn)
src/preload/      contextBridge surface
src/renderer/     React app: App, AgentSelect, SearchPage, agents
tests/            parser, searchReducer, skillsApi
.github/          workflows + templates
```

## Stack

Electron 33 · electron-vite · React 18 · Tailwind v4 · TypeScript 5.7 (strict) · Vitest 4 · electron-builder · JetBrains Mono Variable (self-hosted via `@fontsource-variable`).

## Contributing

Read [CONTRIBUTING.md](CONTRIBUTING.md) first. Short version: write a failing test before the feature, keep PRs scoped, and follow [Conventional Commits](https://www.conventionalcommits.org/).

## Security

If you find a vulnerability, please don't open a public issue — see [SECURITY.md](SECURITY.md) for how to report it privately.

The threat model is documented there too. In short: spawned commands use `shell: false` (no shell expansion), Electron runs with `contextIsolation: true` + `nodeIntegration: false`, and the only network call from the main process is a hardcoded GET to `skills.sh`. Skills themselves run with full agent permissions once installed — vet them before adding new sources.

## License

MIT — see [LICENSE](LICENSE).

## Acknowledgments

Built using skills from the ecosystem this app installs:

- `anthropics/skills@frontend-design` — visual direction
- `nextlevelbuilder/ui-ux-pro-max-skill@ui-ux-pro-max` — interaction patterns
- `leonxlnx/taste-skill@design-taste-frontend` — taste calibration
- `wshobson/agents@tailwind-design-system` — design tokens
- `vercel-labs/agent-skills@vercel-react-best-practices` — React patterns
- `mcollina/skills@node` — Node 22 patterns
- `anthropics/skills@webapp-testing` + `antfu/skills@vitest` — test foundation
- `xixu-me/skills@opensource-guide-coach` + `xixu-me/skills@github-actions-docs` — OSS setup
- `addyosmani/agent-skills@documentation-and-adrs` — documentation structure

This app installs its own dependencies.
