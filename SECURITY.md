# Security Policy

## Reporting a vulnerability

Don't open a public issue. Use GitHub's [private security advisories](https://github.com/esdrassantos06/skills-installer/security/advisories/new) or email the maintainer. Response within 7 days.

Include:

- Affected version (or commit hash).
- Steps to reproduce.
- What an attacker could do with it.
- Suggested fix, if you have one.

If you don't hear back in a week, ping again. Assume the report got lost, not ignored.

## Threat model

This app spawns `npx skills add ...` based on user input. It runs locally on the user's machine with the user's privileges. The main risks:

### What's protected

- **Shell injection via input.** `spawn()` is called with `shell: false` and an explicit argv. User input is tokenized in `parseLine()` and passed as separate arguments to npx. No `eval`, no `exec`, no shell interpolation.
- **Renderer to main IPC.** `contextIsolation: true` and `nodeIntegration: false`. The renderer can only call channels explicitly exposed via `contextBridge`. The main process validates the channel and re-parses inputs.
- **External navigation.** `setWindowOpenHandler` denies in-app navigation and routes external URLs through `shell.openExternal`.
- **Network.** The main process makes one outbound type of call: GET to `https://www.skills.sh/api/search?q=...`. The host is hardcoded. Responses are validated with type guards before reaching the renderer. Results are cached in memory only (no disk persistence) for 5 minutes.

### What's not (and why)

- **Skill contents themselves.** A skill is markdown the agent reads when triggered. Installing a malicious skill could prompt-inject your agent into running harmful commands. Vet sources before adding them. Prefer skills from well-known orgs (`vercel-labs`, `anthropics`, `obra`, `wshobson`) or skills with high install counts. `useai-pro/openclaw-skills-security@skill-vetter` is a community skill that helps vet others before install.
- **Supply chain.** `npx skills add` downloads from GitHub. If a repo is compromised between when you read the README and when you install, you get the compromised version. Pin to commits/tags for sensitive flows.
- **Dev tools in production builds.** Electron still allows opening the inspector with the standard shortcut. Not a vulnerability per se, but means anything in the renderer's localStorage is readable by anyone with physical access.

### Hardening you can do

- Use the **force reinstall** toggle only when you intend to overwrite. Default off avoids re-pulling code from compromised repos by accident.
- Review skills before installing. Run `useai-pro/openclaw-skills-security@skill-vetter` on candidates from low-reputation sources.
- Treat localStorage values as non-secret. The app stores the agent list, last input, and view preference there. Never paste API keys or tokens into the Installer textarea.

### Out of scope

- Vulnerabilities in upstream Electron, npm, npx, or the `skills` CLI itself. Report those upstream.
- Issues that require physical access to the user's machine.
- Self-XSS via pasting attacker-controlled content into the textarea. The renderer doesn't render user input as HTML, only as monospace text.

## Disclosure timeline

Once a fix lands, I cut a patch release and disclose 7 days later via a GitHub Security Advisory. Critical bugs get same-day patches.
