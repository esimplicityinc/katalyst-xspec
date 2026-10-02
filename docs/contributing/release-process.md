# Release Process

Guide to versioning, releasing, and publishing @esimplicityinc/katalyst-xspec packages.

## Overview

```mermaid
flowchart LR
    DEV[Development] --> PR[Pull Request]
    PR --> REVIEW[Code Review]
    REVIEW --> MERGE[Merge to Main]
    MERGE --> CI[CI Tests]
    CI --> TAG[Create Tag]
    TAG --> BUILD[Build]
    BUILD --> PUBLISH[Publish to Registry]
    PUBLISH --> RELEASE[GitHub Release]
```

## Versioning

We follow [Semantic Versioning](https://semver.org/):

| Version | When to Bump | Example Changes |
|---------|--------------|-----------------|
| MAJOR (X.0.0) | Breaking changes | Remove/rename port methods, change fixture API |
| MINOR (0.X.0) | New features | Add new port, add adapter, add steps |
| PATCH (0.0.X) | Bug fixes | Fix adapter bug, improve error messages |

### Pre-release Versions

```
0.1.0-alpha.1    # Alpha release
0.1.0-beta.1     # Beta release
0.1.0-rc.1       # Release candidate
```

## Packages

| Package | Registry |
|---------|----------|
| @esimplicityinc/katalyst-xspec | npm |
| @esimplicityinc/create-katalyst-xspec | npm |

## Release Workflow

### 1. Prepare Release Branch

```bash
# Ensure main is up to date
git checkout main
git pull origin main

# Create release branch
git checkout -b release/v0.2.0
```

### 2. Update Version Numbers

Update `package.json` in each package:

```bash
# Update katalyst-xspec
cd katalyst-xspec
npm version 0.2.0 --no-git-tag-version

# Update create-katalyst-xspec
cd ../create-katalyst-xspec
npm version 0.2.0 --no-git-tag-version
```

### 3. Update Changelog

Add entry to `CHANGELOG.md`:

```markdown
## [0.2.0] - 2024-01-20

### Added
- TUI testing support with TuiPort and TuiTesterAdapter
- New step definitions for terminal UI testing
- `@tui` tag for TUI-only scenarios

### Changed
- Updated Playwright peer dependency to ^1.49.0

### Fixed
- API adapter timeout handling (#123)

### Contributors
- @username1 - TUI adapter implementation
- @username2 - Bug fixes
```

### 4. Build and Test

```bash
# Build all packages
npm run build --workspaces

# Run full test suite
npm test --workspaces

# Run linter
npm run lint --workspaces
```

### 5. Create Pull Request

```bash
git add .
git commit -m "chore: prepare release v0.2.0"
git push origin release/v0.2.0
```

Create PR titled: `Release v0.2.0`

### 6. Merge and Tag

After PR approval and merge:

```bash
git checkout main
git pull origin main

# Create annotated tag
git tag -a v0.2.0 -m "Release v0.2.0"
git push origin v0.2.0
```

### 7. Automated Publishing

Publishing a GitHub Release (`gh release create vX.Y.Z --target main ...`) triggers
`.github/workflows/publish.yml`, which:
1. Installs, builds and tests all workspaces
2. Publishes `@esimplicityinc/katalyst-xspec` and `@esimplicityinc/create-katalyst-xspec`
   to GitHub Packages using the built-in `GITHUB_TOKEN` (versions already published are skipped)

The workflow can also be run manually from the Actions tab, with an optional dry run.

## Manual Publishing (if needed)

Authenticate to GitHub Packages with a token that has `write:packages`:

```bash
npm login --scope=@esimplicityinc --auth-type=legacy --registry=https://npm.pkg.github.com
```

Then publish (each package's `publishConfig.registry` already points at GitHub Packages):

```bash
npm run build
(cd katalyst-xspec && npm publish)
(cd create-katalyst-xspec && npm publish)
```

## Release Checklist

### Pre-release
- [ ] All tests passing on main
- [ ] Changelog updated
- [ ] Version numbers updated
- [ ] Documentation updated for new features
- [ ] Breaking changes documented
- [ ] Migration guide written (if breaking)

### Release
- [ ] Release branch created and merged
- [ ] Tag created and pushed
- [ ] CI pipeline successful
- [ ] Packages published to registry
- [ ] GitHub Release created

### Post-release
- [ ] Verify packages installable (`npm install @esimplicityinc/katalyst-xspec@0.2.0`)
- [ ] Announce release (Discord, email, etc.)
- [ ] Update example projects
- [ ] Monitor for issues

## Troubleshooting

### Package not found after publish

```bash
# Check package exists
npm view @esimplicityinc/katalyst-xspec@0.2.0

# Clear npm cache
npm cache clean --force

# Try installing again
npm install @esimplicityinc/katalyst-xspec@0.2.0
```

### Authentication errors

```bash
# Verify token
npm whoami --registry=https://npm.pkg.github.com

# Check .npmrc
cat ~/.npmrc | grep npm.pkg.github.com
```

### Version conflict

```bash
# Unpublish (within 72 hours)
npm unpublish @esimplicityinc/katalyst-xspec@0.2.0

# Or deprecate
npm deprecate @esimplicityinc/katalyst-xspec@0.2.0 "Use 0.2.1 instead"
```

## Related Guides

- [CONTRIBUTING.md](./CONTRIBUTING.md) - Contribution guidelines
- [Development Setup](./development-setup.md) - Local setup
- [CI/CD Guide](../guides/ci-cd.md) - CI configuration
