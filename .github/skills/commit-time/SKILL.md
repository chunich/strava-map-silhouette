---
name: commit-time
description: "Use when user asks to commit changes, prepare a commit, draft commit message, stage files, or push after review. Workflow: inspect git changes, run git add ., draft message preview, collect user approval/feedback, then commit and optionally push only after explicit confirmation."
---

# Commit Time

Use this skill when the user is ready to commit work and wants a safe, review-first flow.

## Goals

- Make commit creation consistent and reviewable
- Prevent accidental commits or pushes
- Keep user in control of final message and push decision

## Required Workflow

1. Inspect current git state first.

- Run `git status --short` and summarize changed files.
- If useful, run `git diff --stat` to summarize scope.

2. Stage current work.

- Run `git add .` exactly as requested by user workflow.
- Re-check with `git status --short` and confirm staged/unstaged state.

3. Draft commit message preview.

- Propose a commit title + bullet body based on actual changes.
- Keep message clear, concise, and implementation-accurate.

4. Approval gate (mandatory).

- Ask for explicit approval of the exact commit message.
- If user provides edits, revise and re-present for approval.
- Do not run `git commit` until approval is explicit.

5. Commit only after approval.

- Run `git commit -m "<approved subject>" -m "<approved body>"`.
- Share commit hash and summary (`files changed`, `insertions/deletions`).

6. Push gate (mandatory).

- Ask whether to push now.
- Do not run `git push` without explicit confirmation.
- If approved, push and report branch + remote status.

## Guardrails

- Never bypass approval gates for commit or push.
- Never amend or force-push unless user explicitly requests it.
- If there are merge conflicts or rebase state, stop and ask how to proceed.
- If unrelated risky files are staged, call them out before committing.

## Suggested Commit Style

- Subject line: conventional style when appropriate (e.g., `feat: ...`, `fix: ...`, `refactor: ...`).
- Body bullets: focus on user-visible behavior changes first, then implementation details.
- Keep subject in imperative mood and under ~72 chars when practical.
