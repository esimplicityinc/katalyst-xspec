# Agent Skills for AI-Assisted Development

Katalyst BDD includes a set of **Agent Skills** that enhance AI coding assistants (like OpenCode, Claude Code, and Cursor) with deep knowledge of the framework. These skills help AI agents write better tests, troubleshoot issues, and understand the framework architecture.

## What Are Agent Skills?

Agent Skills are structured knowledge files that follow the [agentskills.io](https://agentskills.io) specification. They provide AI coding assistants with:

- **Context-aware help** - The AI understands Katalyst BDD's step definitions, patterns, and best practices
- **Accurate code generation** - Generate correct feature files and step implementations
- **Troubleshooting guidance** - Debug common issues with framework-specific knowledge
- **Architecture understanding** - Create custom adapters and extend the framework properly

## Available Skills

| Skill | Description |
|-------|-------------|
| `katalyst-bdd-quickstart` | Getting started guide for new users. Helps with installation, first test creation, and basic concepts. |
| `katalyst-bdd-step-reference` | Complete reference of all built-in step definitions for API, UI, TUI, and shared steps. |
| `katalyst-bdd-create-test` | Test creation wizard with patterns for API, UI, TUI, and hybrid testing scenarios. |
| `katalyst-bdd-troubleshooting` | Debug and fix common issues like selector failures, authentication problems, and timing issues. |
| `katalyst-bdd-architecture` | Framework internals guide for creating custom adapters, ports, and step definitions. |

## Installing Agent Skills

### During Project Scaffolding (Recommended)

When you scaffold a new project with `katalyst-xspec init`, you'll be prompted to install Agent Skills:

```bash
npx @esimplicityinc/katalyst-xspec init

# Interactive prompts:
# ? Would you like to install Katalyst BDD Agent Skills? Yes
# ? Which AI agents do you use? (select all that apply)
#   [x] OpenCode
#   [x] Claude Code
#   [ ] Cursor
#   [ ] Generic (skills/ directory)
```

### Using CLI Flags

You can also use CLI flags to control skill installation:

```bash
# Install skills for all supported agents
npx @esimplicityinc/katalyst-xspec init --with-skills

# Skip skills installation
npx @esimplicityinc/katalyst-xspec init --no-skills

# Install for specific agents only
npx @esimplicityinc/katalyst-xspec init --with-skills --skills-agents opencode,claude

# Available agent options: opencode, claude, cursor, generic
```

### Manual Installation

To manually install skills in an existing project:

1. Copy the skills from the [katalyst-xspec repository](https://github.com/esimplicityinc/katalyst-xspec/tree/main/katalyst-xspec/skills)
2. Place them in the appropriate directory for your AI agent:

| Agent | Directory |
|-------|-----------|
| OpenCode | `.opencode/skills/` |
| Claude Code | `.claude/skills/` |
| Cursor | `.cursor/skills/` |
| Generic | `skills/` |

## Updating Agent Skills

When new versions of Katalyst BDD are released, you can update your installed skills:

```bash
# Update all installed skills to latest version
npx @esimplicityinc/katalyst-xspec upgrade --update-skills
```

This command:
1. Detects which agent directories have Katalyst skills installed
2. Updates them to the version bundled with the installed `@esimplicityinc/katalyst-xspec` package

## Using Skills with AI Agents

### OpenCode

Skills are automatically loaded from `.opencode/skills/`. Simply ask OpenCode questions about Katalyst BDD:

```
"How do I write a hybrid test that creates data via API and verifies it in the UI?"
"What's the step for filling a form field?"
"Help me debug why my API authentication isn't working"
```

### Claude Code

Skills are loaded from `.claude/skills/`. Claude will use the skills when you ask about testing:

```
"Create a feature file for testing user registration"
"What steps are available for TUI testing?"
"How do I create a custom adapter for my auth system?"
```

### Cursor

Skills are loaded from `.cursor/skills/`. Reference them in your prompts:

```
"Using the Katalyst BDD framework, write tests for the checkout flow"
"Show me how to use variable interpolation in API tests"
```

## Skill Contents

### katalyst-bdd-quickstart

Covers:
- Installation and setup
- Project structure
- Writing your first test
- Running tests
- Understanding tags (@api, @ui, @tui, @hybrid)

### katalyst-bdd-step-reference

Complete reference including:
- All API steps (GET, POST, PUT, DELETE, response assertions)
- All UI steps (navigation, clicks, forms, assertions)
- All TUI steps (terminal interaction, output verification)
- Shared steps (variables, cleanup, authentication)
- Step syntax with examples

### katalyst-bdd-create-test

Guided test creation for:
- API-only tests
- UI-only tests
- TUI tests
- Hybrid (cross-layer) tests
- Data-driven scenarios
- Background setup patterns

### katalyst-bdd-troubleshooting

Solutions for common issues:
- "Element not found" errors
- Authentication failures
- Timing and synchronization issues
- Variable interpolation problems
- Environment configuration
- CI/CD failures

### katalyst-bdd-architecture

Deep dive into:
- Ports and adapters pattern
- Creating custom ports
- Implementing custom adapters
- Writing custom step definitions
- Extending the framework
- Testing custom components

## Best Practices

1. **Keep skills updated** - Run `npx katalyst-xspec upgrade --update-skills` after upgrading Katalyst BDD
2. **Install for your primary agent** - Only install skills for agents you actually use
3. **Provide context** - When asking AI agents for help, mention you're using Katalyst BDD
4. **Review generated code** - Always review AI-generated tests before committing

## Troubleshooting

### Skills not being recognized

Ensure skills are in the correct directory:
```bash
# Check if skills exist
ls -la .opencode/skills/    # For OpenCode
ls -la .claude/skills/      # For Claude Code
ls -la .cursor/skills/      # For Cursor
```

### AI agent not using skill knowledge

Try being explicit in your prompt:
```
"Using the Katalyst BDD framework and its built-in steps, help me..."
```

### Skills out of date

Update to the latest version:
```bash
npx @esimplicityinc/katalyst-xspec upgrade --update-skills
```

## Related

- [Installation](../getting-started/installation.md) - Initial setup
- [Quick Start](../getting-started/quick-start.md) - First test guide
- [Architecture](../concepts/architecture.md) - Framework design
- [Custom Steps](./custom-steps.md) - Writing your own steps
