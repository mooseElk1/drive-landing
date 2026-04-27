# Development Cycle (Agent + You + Lead Engineer)

This repo uses a **small-chunk, review-first** workflow so changes are easy to validate and safe to merge.

## Roles

- **Agent (implementation)**: ships work in small slices, keeps checks green, updates docs alongside code.
- **You (product/UX)**: approves UI decision gates, validates “looks right / feels right”.
- **Lead engineer (merge owner)**: reviews commits/PRs and merges to `master`/`main`.

## Working agreement (what “good” looks like)

- **Small commits**: coherent, one concept, ideally **≤200 lines changed** (not a hard limit; a guardrail).
- **Docs travel with code**: if behavior changes, the docs change in the same commit/PR.
- **Green before review**: don’t ask for review on a broken branch.
- **Explicit UI gates**: navigation/layout/copy changes pause for a quick manual check.

## Branching and PRs

- **One branch per epic/phase** (example: `power-profile/phase-2-sessions`).
- **One PR per epic/phase**.
- Prefer **stacking commits** in the PR rather than batching huge diffs.

## Commit cadence

### What goes in a single commit

A single commit should represent **one logical step** such as:

- Add/adjust a type + update dependent call sites
- Add a service + add unit tests for the service
- Add a UI component primitive + its tests
- Wire a screen route + minimal screen scaffold (no extra refactors)

### Pre-review checks (local)

Run these before asking for review (or before a “review checkpoint” commit):

```bash
pnpm type-check
pnpm test -- --watchman=false
```

If a change is UI-only and tests aren’t affected, tests should still run before PR review whenever feasible.

## UI decision gates (human-in-the-loop)

Pause for manual review when any of the following change:

- **Navigation**: tabs, stacks, router structure, deep links
- **Information architecture**: what lives on which screen, ordering, grouping
- **Interactive behavior**: button behavior, empty states, destructive actions
- **Copy/tone**: user-facing strings, labels, errors
- **Visual standards**: spacing, typography, component patterns

### UI gate checklist (copy/paste)

- **What changed** (1–3 bullets):
  - …
- **Where to look** (routes/screens):
  - …
- **Expected behavior**:
  - …
- **Screenshots to capture**:
  - iOS light
  - iOS dark
- **Edge cases**:
  - empty state
  - loading state
  - error state (if applicable)

## PR template (copy/paste)

**Title**: `feat(scope): short outcome` (or `fix(scope): …`)

### Summary

- …

### UI / UX notes (if applicable)

- …

### Test plan

- [ ] `pnpm type-check`
- [ ] `pnpm test -- --watchman=false`
- [ ] Manual smoke test:
  - [ ] Key flow 1
  - [ ] Key flow 2

### Risks / follow-ups

- …

## Commit message template (copy/paste)

Use small, descriptive commits. Prefer describing the **why** in the body.

```text
<type>(<scope>): <short summary>

Why:
- <reason / context>

Notes:
- <tradeoffs / constraints / follow-ups>
```

Common types: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`.
