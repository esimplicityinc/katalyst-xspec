# CLI Reference

`@esimplicitylabs/katalyst-xspec` ships one command, `katalyst-xspec`, with three subcommands.

```bash
katalyst-xspec <command> [options]
katalyst-xspec --help        # list commands
katalyst-xspec --version     # print the installed version
katalyst-xspec <command> --help
```

Before a project exists, run it through `npx` with the full package name, e.g. `npx @esimplicitylabs/katalyst-xspec init my-tests`. Inside a project that has the package installed, `npx katalyst-xspec ...` or the generated npm scripts work.

| Command | What it does | npm script in a scaffolded project |
|---------|--------------|------------------------------------|
| [`init`](#init) | Scaffold a new test project | — |
| [`upgrade`](#upgrade) | Upgrade the package, migrate scaffolding, update skills | `npm run upgrade`, `npm run check-updates`, `npm run upgrade:migrate` |
| [`stubs`](#stubs) | Generate stubs for undefined steps | `npm run gen:stubs` |

## init

```bash
npx @esimplicitylabs/katalyst-xspec init [dir] [options]
```

Creates a project in `dir` (default `./katalyst-xspec`; use `.` for the current folder). The `package.json` name comes from the folder name, made npm-safe (`My Tests` becomes `my-tests`).

| Option | Description |
|--------|-------------|
| `[dir]`, `--dir <dir>` | Target directory |
| `--force` | Overwrite files that already exist. Without it, existing files are skipped. `.env` is never touched; `.env.example` is always merged. |
| `--with-skills` | Install [Agent Skills](../guides/agent-skills.md) without prompting |
| `--no-skills` | Skip Agent Skills without prompting |
| `--skills-agents <list>` | Where to install skills: comma-separated `opencode`, `claude-code`, `cursor`, `generic` |
| `-h`, `--help` | Show help |

It creates:

```
features/api/example.feature    # JSONPlaceholder API examples
features/ui/example.feature     # Sauce Demo UI examples
features/steps/fixtures.ts      # adapter wiring
features/steps/steps.ts         # registers the built-in steps
playwright.config.ts            # api and ui projects (tui commented out)
package.json, tsconfig.json, .gitignore, .env.example, README.md
```

The examples call public demo sites, so the project passes its first run with no configuration:

```bash
cd my-tests
npm install
npx playwright install chromium   # one-time browser download
npm test
```

## upgrade

```bash
npx katalyst-xspec upgrade [options]
```

| Option | Description |
|--------|-------------|
| `-c`, `--check` | Report whether an update is available; change nothing |
| `-v`, `--version <ver>` | Install a specific version |
| `--migrate` | Refresh the scaffolding (config, `steps.ts`, `fixtures.ts`) while keeping your custom files; backs up first |
| `--dry-run` | With `--migrate`, show what would change |
| `--backup-dir <dir>` | Where `--migrate` writes its backup (default: a temp folder) |
| `--update-skills` | Update installed Agent Skills to the bundled version |
| `-i`, `--interactive` | Prompt before each step |
| `-h`, `--help` | Show help |

Besides upgrading, `upgrade` handles changes from older releases:

- **Old package names.** Projects on `@esimplicity/stack-tests` or `@esimplicityinc/katalyst-xspec` are moved to `@esimplicitylabs/katalyst-xspec`: imports in `features/` and `playwright.config.*` are rewritten, the dependency is swapped, and the obsolete GitHub Packages line is removed from `.npmrc`.
- **Old CLI names** in `package.json` scripts (`upgrade-stack-tests`, `upgrade-katalyst-xspec`, `generate-step-stubs`) are rewritten to `katalyst-xspec upgrade` / `katalyst-xspec stubs`.
- **Type-tag filters** (`tags: '@ui'` on Playwright projects, from 0.6 and earlier) are removed by `--migrate`; plain `upgrade` warns if they're still there. See [Tags](../concepts/tag-system.md).

More detail: [Upgrading](../guides/upgrading.md).

## stubs

```bash
npx katalyst-xspec stubs [options]
```

Runs `bddgen`, collects the steps it reports as missing, and writes stub definitions to `features/steps/generated-stubs.ts`.

| Option | Description |
|--------|-------------|
| `-o`, `--output <file>` | Output file (default `features/steps/generated-stubs.ts`) |
| `--dry-run` | Print the stubs instead of writing them |
| `-v`, `--verbose` | Show detailed output |
| `-h`, `--help` | Show help |

See [Custom Steps](../guides/custom-steps.md) for filling them in.
