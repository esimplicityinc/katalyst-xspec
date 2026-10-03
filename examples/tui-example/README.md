# TUI Example

Terminal UI tests with `@esimplicitylabs/katalyst-xspec`. The app under test is `app.mjs`, a tiny interactive todo CLI; each scenario starts it in a fresh tmux session, types commands and checks the screen.

## Requirements

- Node.js >= 20
- [tmux](https://github.com/tmux/tmux) (`brew install tmux` or `apt-get install tmux`)
- macOS, Linux or WSL

## Run it

```bash
npm install
npm test
DEBUG=true npm test   # with tui-tester debug output
```

## Files

```
app.mjs                   # the CLI under test
features/
├── todo.feature          # start, add/list, complete, unknown command
└── steps/
    ├── fixtures.ts       # TuiTesterAdapter({ command: ['node', 'app.mjs'] })
    └── steps.ts          # registers TUI + shared steps
playwright.config.ts      # one worker (tmux sessions run one at a time)
```

To test your own CLI, change `command` in `features/steps/fixtures.ts`.

See the [TUI Testing guide](../../docs/guides/tui-testing.md) and [TUI steps](../../docs/reference/steps/tui-steps.md).
