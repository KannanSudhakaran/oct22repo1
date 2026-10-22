---
description: Save the finalized plan to _plans/ using the same number and slug as its spec
argument-hint: Optional spec number or spec file (e.g. 03 or _specs/03-card-component.md)
allowed-tools: Read, Write, Glob, Bash(git branch:*), Bash(git rev-parse:*), Bash(mkdir:*)
---

You are saving the implementation plan that was just finalized in this session, so that it sits alongside the spec it was built from. Always adhere to any rules or requirements set out in any CLAUDE.md files when responding.

User input: $ARGUMENTS

## High level behavior

Take the final plan from this conversation and save it as `_plans/<spec_number>-<feature_slug>.md`, where `<spec_number>-<feature_slug>` exactly matches the spec file in `_specs/` (e.g. `_specs/03-card-component.md` → `_plans/03-card-component.md`). Then print a short summary.

Do not start implementing anything.

## Step 1. Find the matching spec

Resolve the spec file in this order, and stop at the first one that works:

1. **User input.** If `$ARGUMENTS` is a spec path, use it. If it is a number (e.g. `3` or `03`), zero-pad it to 2 digits and use Glob on `_specs/<NN>-*.md`.
2. **This conversation.** If a `_specs/NN-*.md` file was created by `/spect` or read during planning in this session, use that one.
3. **Current branch.** Run `git rev-parse --abbrev-ref HEAD`. If it matches `claude/feature/<NN>-<slug>` (optionally with a `-01`, `-02` version suffix), use Glob on `_specs/<NN>-*.md`.

Ignore `_specs/template.md` and any file without a numeric prefix.

If no spec is found, or more than one matches, list what you found and ask the user which spec this plan belongs to. DO NOT GUESS.

From the spec filename, take:
- `spec_number`, e.g. `03`
- `feature_slug`, e.g. `card-component`

## Step 2. Find the plan

- Use the **latest, final version** of the plan from this conversation, including every change the user asked for during plan mode. Ignore earlier drafts.
- If there is no plan in this conversation, read the most recently modified file in `~/.claude/plans/`.
- If you still can't find a plan, stop and tell the user. Never write a plan yourself.

## Step 3. Save the plan

- Create `_plans/` if it doesn't exist.
- Target path: `_plans/<spec_number>-<feature_slug>.md`.
- Never overwrite an existing file. If the path exists, save as `_plans/<spec_number>-<feature_slug>-v2.md`, then `-v3`, and so on.
- Start the file with this header, then the plan **verbatim**, without summarizing or rewording it:

```
---
spec: _specs/<spec_number>-<feature_slug>.md
branch: <current git branch>
created: <today's date, YYYY-MM-DD>
status: approved
---
```

## Step 4. Final output to the user

Respond in this exact format, and nothing else:

Spec file: _specs/<spec_number>-<feature_slug>.md
Plan file: _plans/<file name saved>
Branch: <current git branch>