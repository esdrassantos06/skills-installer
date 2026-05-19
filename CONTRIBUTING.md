# Contributing

Thanks for taking the time. A few things before you open a PR.

## Quick start

```bash
git clone https://github.com/YOUR-GH-USERNAME/skills-installer.git
cd skills-installer
npm install
npm test          # should pass
npm run dev       # opens the app in dev mode with HMR
```

Node 22+ recommended.

## Workflow

1. Open an issue first if the change is non-trivial (more than a one-line fix). Saves both of us a wasted PR.
2. Branch from `main`: `git checkout -b feat/short-description` or `fix/...`.
3. Write a failing test before the code. Then make it pass. This is enforced in review.
4. Keep the PR focused. A bug fix shouldn't also reformat the file.
5. Run `npm test` and `npm run build` locally before pushing.

## Commit messages

[Conventional Commits](https://www.conventionalcommits.org/). The CI parses tags from them when generating release notes.

```
feat(search): add fuzzy match toggle
fix(parser): preserve quoted --skill argument
docs: clarify --no-global behavior in README
chore(deps): bump electron to 33.2.2
test(parser): cover multi-agent override case
```

Types we use: `feat`, `fix`, `docs`, `test`, `refactor`, `chore`, `ci`, `build`, `perf`.

## TDD expectations

Every behavior change needs a test that:

1. Was written before the implementation
2. Fails first (verify by running it against the unchanged code)
3. Passes with the change

The parser, the search reducer, and the skills.sh client are all pure modules — keep them that way so they stay testable without Electron mocks. If you find yourself wanting to mock `child_process` or the DOM, you're probably putting logic in the wrong place.

## Code style

- TypeScript strict mode. No `any` unless you can defend it in review.
- Prefer editing existing files over creating new ones.
- No comments explaining what the code does. Comments are for the *why* — a non-obvious constraint, a workaround for a specific bug.
- UI strings live inline. No i18n yet.

## Reporting bugs

Open an [issue](https://github.com/YOUR-GH-USERNAME/skills-installer/issues/new/choose) with:

- What you tried
- What happened
- What you expected
- OS + Node version
- The exact lines you pasted into the Installer, if relevant

## Security

Don't file public issues for vulnerabilities. See [SECURITY.md](SECURITY.md).

## Code of conduct

[Contributor Covenant](CODE_OF_CONDUCT.md). Short version: be decent. Disagree about code, not people.
