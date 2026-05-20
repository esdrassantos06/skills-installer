# Contributing

Thanks for taking the time. A few things before you open a PR.

## Quick start

```bash
git clone https://github.com/esdrassantos06/skills-installer.git
cd skills-installer
npm install
npm test          # should pass everything
npm run dev       # opens the app in dev mode with HMR
```

Node 22+ recommended. The Electron binary is downloaded by `electron`'s postinstall script. If your local environment skipped it, run `node node_modules/electron/install.js` once to recover.

## Workflow

1. Open an issue first if the change is non-trivial (more than a one-line fix). Saves both of us a wasted PR.
2. Branch from `main`: `git checkout -b feat/short-description` or `fix/...`.
3. Write a failing test before the code. Run it. Confirm it fails for the right reason.
4. Implement until the test passes.
5. Keep the PR focused. A bug fix shouldn't also reformat the file.
6. Run `npm test` and `npm run build` locally before pushing.

## Commit messages

[Conventional Commits](https://www.conventionalcommits.org/). CI parses tags from them when generating release notes.

```
feat(search): add fuzzy match toggle
fix(parser): preserve quoted --skill argument
docs: clarify --no-global behavior in README
chore(deps): bump electron to 42.2.0
test(cache): cover LRU recency refresh edge case
```

Types in use: `feat`, `fix`, `docs`, `test`, `refactor`, `chore`, `ci`, `build`, `perf`.

## TDD expectations

Every behavior change needs a test that:

1. Was written before the implementation.
2. Failed first. Verify by running it against the unchanged code.
3. Passes after the change.

The parser, the search reducer, the skills.sh client, and the cache are all pure modules. Keep them that way so they stay testable without Electron mocks. If you find yourself wanting to mock `child_process` or the DOM, the logic is probably in the wrong place.

## Code style

- TypeScript strict mode. No `any` unless you can defend it in review.
- Prefer editing existing files over creating new ones.
- Comments are for the *why*, not the *what*. Document a non-obvious constraint or a workaround for a specific bug.
- UI strings live inline. No i18n yet.
- No em-dashes (`—`) in writing. Period, colon, parenthesis, or restructure.

## Reporting bugs

Open an [issue](https://github.com/esdrassantos06/skills-installer/issues/new/choose) with:

- What you tried.
- What happened.
- What you expected.
- OS + Node version.
- The exact lines you pasted into the Installer, if relevant.

## Security

Don't file public issues for vulnerabilities. See [SECURITY.md](SECURITY.md).

## Code of conduct

[Contributor Covenant](CODE_OF_CONDUCT.md). In short: be decent. Disagree about code, not people.
