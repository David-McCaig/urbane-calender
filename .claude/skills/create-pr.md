---
name: create-pr
description: Create a GitHub pull request with a structured What/Why/Changes description. Commits changes, pushes the branch, and opens the PR.
---

# Create PR

Use this skill when the user wants to create a pull request for the current branch.

## Process

### Step 1: Check state

- Run `git status` to confirm there are changes to commit (or already committed changes).
- Run `git branch --show-current` to confirm the branch name.
- Run `git diff main...HEAD` to review what will go into the PR.

### Step 2: Commit (if needed)

If there are uncommitted changes:

```bash
git add -A
git commit -m "<conventional-commit message>"
```

Use conventional commits: `feat:`, `fix:`, `refactor:`, `chore:`, `docs:`, etc. End the message with:

```
Co-Authored-By: Claude <noreply@anthropic.com>
```

### Step 3: Push

```bash
git push origin <branch-name>
```

If the branch hasn't been pushed yet, this creates it on the remote.

### Step 4: Create the PR

Use `gh pr create` if available:

```bash
gh pr create \
  --title "<title>" \
  --body "<description>"
```

If `gh` is not installed, provide the PR creation URL from the push output and the title + body for the user to paste manually.

## PR format

Every PR must follow this structure:

### Title

A conventional-commit style title that summarizes the change. Keep it under 72 characters.

### Body

```
## What

<1-3 sentences describing the change at a high level. What does this PR do?>

## Why

<1-3 sentences explaining the motivation. What problem does this solve? Why is this the right approach?>

## Changes

- **`path/to/file.tsx`** — <one-line description of what changed and why>
- **`path/to/other.tsx`** — <same>
- ...one bullet per meaningful file changed

## How to test

<Steps to verify the change works. Be specific: commands to run, pages to visit, behavior to observe.>
```

### Footer

End every PR body with:

```
🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

## What to include in the diff review

When generating the PR description:

- Read every changed file's diff — don't guess what's in it.
- Group trivial/mechanical changes under a single bullet (e.g., "Updated imports across 4 files").
- Each bullet under `## Changes` should describe **what** changed and **why**, not just restate the diff.
- If the change touches many files with the same pattern, summarize the pattern rather than listing every file.

## Worktree awareness

If the session is inside a Claude worktree (the working directory is under `.claude/worktrees/`), the PR workflow is the same — commit, push, and create the PR from the worktree branch. But there are a few things to keep in mind:

### Before starting

- Run `git worktree list` to confirm you're in a worktree and see the branch name.
- Run `git branch --show-current` — this is the branch that will become the PR.
- The worktree's branch is independent of the main working directory. Pushing it makes it available for the PR.

### During commit

- Be careful with `git add -A` — only stage the files you intend to include. Worktrees can accumulate stray files (build artifacts, temp files) that shouldn't be committed.
- Prefer `git add <specific files>` or `git add -A :/` (from repo root) over a bare `git add -A` when in a worktree.

### After PR creation

- Remind the user they can exit the worktree with `exit` (or by asking Claude to exit). Use `action: "keep"` if they might want to iterate on the PR, or `action: "remove"` if the work is done.
- The branch lives on the remote even after the worktree is removed — the PR stays open.
- If the PR needs changes later, the user can check out the branch from the main repo with `git fetch && git checkout <branch>` — they don't need the worktree.

## After creating

Confirm the PR URL and summarize the change for the user.
