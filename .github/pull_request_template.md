<!--
  GUIDE:
  • Always fill the Human Section (above the fold).
  • Expand and fill the Detail Sections for features & complex changes.
  • For a one-line fix: Summary + Ticket + Checklist is enough.
-->

## Summary

<!-- 1-2 sentences. What does this PR do and why? -->

## Ticket

<!-- Use "Resolves" for closing, "Part of" for incremental -->
Resolves [RIC-XXXX](https://esimplicity.atlassian.net/browse/RIC-XXXX)

## Reviewer Focus

<!-- 1-3 bullets: What's risky? What trade-off did you make? Where should a reviewer spend time? -->
-

## Checklist

- [ ] TypeScript compiles clean (`tsc --noEmit`)
- [ ] All tests pass
- [ ] No secrets or credentials in diff
- [ ] Conventional commit format verified

---

<details>
<summary><strong>📐 Solution & Architecture</strong></summary>

### Solution

<!-- How does this solve the problem? Architecture-level explanation, not line-by-line. -->

### Changes

<!-- Commit-by-commit or file-by-file summary. Use a table for multi-commit PRs. -->

| # | Scope | Description |
|---|-------|-------------|
| 1 | | |

### Architecture & Design References

<!-- Which ADRs, NFRs, or taxonomy artifacts does this implement or relate to? -->
- **ADR:**
- **NFR:**
- **Taxonomy:**

</details>

<details>
<summary><strong>🔒 Security</strong></summary>

<!-- Access control changes, secrets handling, PII exposure, IDOR protection.
     Delete this section if the change is purely cosmetic. -->
- [ ] No secrets or credentials in diff
- [ ] Access control changes reviewed (if applicable)
- [ ] No PII exposure introduced

</details>

<details>
<summary><strong>🧪 Testing</strong></summary>

<!-- Unit tests and Chromium UI BDD run on PR; deployed BDD also runs after merge. -->

### Unit Tests
<!-- New/modified test cases. What scenarios are exercised? -->

### BDD Coverage
<!-- New/modified feature files or scenarios. Tag with @wip if not yet CI-selected.
     Note any coverage that requires the post-merge deployed BDD gate. -->

### Gaps
<!-- What ISN'T tested? What can only be validated manually or in a live environment? -->

</details>

<details>
<summary><strong>🚀 Deployment & Impact</strong></summary>

### Deployment Notes
<!-- Zero-downtime? Rollback plan? Env var changes? Feature flags? Manual steps? -->

### Downstream Impact
<!-- What does this unblock? Part of a series? Follow-up tickets? -->

### Known Risks / Open Questions
<!-- What are you least confident about? What trade-offs did you make?
     What's deferred and why? -->

</details>
