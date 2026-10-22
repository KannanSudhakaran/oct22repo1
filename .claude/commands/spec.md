---
description: Create a feature spec file and branch from a short idea
argument-hint: Short feature description
allowed-tools: Read, Write, Glob, Bash(git switch:*)
---

You are helping to spin up a new feature spec for this application, from a short idea provided in the user input below. Always adhere to any rules or requirements set out in any CLAUDE.md files when responding.

User input: $ARGUMENTS

## High level behavior

Your job will be to turn the user input above into:

- A human friendly feature title in kebab-case (e.g. new-heist-form)
- A safe git branch name not already taken (e.g. claude/feature/new-heist-form)
- A detailed markdown spec file under the _specs/ directory, prefixed with a sequence number (e.g. _specs/03-new-heist-form.md)

Then save the spec file to disk and print a short summary of what you did.

## Step 1. Check the current branch

Check the current Git branch, and abort this entire process if there are any uncommitted, unstaged, or untracked files in the working directory. Tell the user to commit or stash changes before proceeding, and DO NOT GO ANY FURTHER.

## Step 2. Parse the arguments

From `$ARGUMENTS`, extract:

1. `feature_title`  
   - A short, human readable title in Title Case.  
   - Example: "Card Component for Dashboard Stats".

2. `feature_slug`  
   - A git safe slug.  
   - Rules:  
     - Lowercase 
     - Kebab-case 
     - Only `a-z`, `0-9` and `-`  
     - Replace spaces and punctuation with `-`  
     - Collapse multiple `-` into one  
     - Trim `-` from start and end  
     - Maximum length 40 characters  
   - Example: `card-component` or `card-component-dashboard`.

3. `spec_number`  
   - Use Glob to list files matching `_specs/[0-9][0-9]-*.md`.  
   - Take the highest leading number found and add 1.  
   - If no numbered specs exist, start at `01`.  
   - Always zero-pad to 2 digits (e.g. `01`, `02`, `10`).  
   - Ignore `_specs/template.md` and any file without a numeric prefix.  
   - Example: if `_specs/01-login.md` and `_specs/02-dashboard.md` exist, `spec_number` is `03`.

4. `branch_name`  
   - Format: `claude/feature/<spec_number>-<feature_slug>`  
   - Example: `claude/feature/03-card-component`.

If you cannot infer a sensible `feature_title` and `feature_slug`, ask the user to clarify instead of guessing.

## Step 3. Switch to a new Git branch

Before making any content, switch to a new Git branch using the `branch_name` derived from the `$ARGUMENTS`. If the branch name is already taken, append a version suffix and increment it until an unused name is found: e.g. `claude/feature/card-component-01`, then `claude/feature/card-component-02`, and so on. Use the final name as `branch_name` from here on.

## Step 4. Draft the spec content

Create a markdown spec document that Plan mode can use directly. Use the exact structure as defined in the spec template file here: @_specs/template.md. Do not add technical implementation details such as code examples.

Save it as `_specs/<spec_number>-<feature_slug>.md` (e.g. `_specs/03-card-component.md`). Never overwrite an existing file; if the path somehow already exists, recompute `spec_number` and try again.

## Step 5. Final output to the user

After the file is saved, respond to the user with a short summary in this exact format:

Branch: <branch_name>
Spec file: _specs/<spec_number>-<feature_slug>.md
Title: <feature_title>

Do not repeat the full spec in the chat output unless the user explicitly asks to see it. The main goal is to save the spec file and report where it lives and what branch name to use.