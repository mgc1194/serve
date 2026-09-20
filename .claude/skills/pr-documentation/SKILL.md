---
name: pr-documentation
description: >
  Generate Pull Request documentation and filled-in PR description templates
  based on code changes discussed in the conversation. Use this skill
  whenever the user asks to "write a PR", "generate PR docs", "create a pull
  request description", "document these changes", "write up this PR", or
  any time they've been discussing code changes and want to produce a PR
  description or summary. Trigger even if the user just says "PR me this"
  or "write the PR description". The stack is Python + Django Ninja
  (backend) and React + TypeScript (frontend).
---

# PR Documentation Skill

Generate a filled-in PR description in Markdown, inline in chat, based on code changes discussed in the conversation.

## Stack Context

- **Backend**: Python, Django Ninja (FastAPI-style APIs on top of Django)
- **Frontend**: React, TypeScript
- Keep language and terminology appropriate to this stack (e.g., "schema", "serializer", "endpoint", "component", "hook", "props", "type")

## Output Format

Output the PR description as a Markdown code block (` ```markdown `) so it's easy to copy-paste into GitHub/GitLab.

## PR Description Template

Always use this exact template, filling in each section based on the conversation:

```markdown
## What & Why
<!-- What does this PR do, and why? Include any relevant context or motivation. -->

## Testing
<!-- How did you test this? -->

## Follow-up
<!-- Any known limitations, TODOs, or future work? -->

## Accessibility
<!-- Does this change affect the UI?
     - Is it keyboard navigable and screen reader friendly?
     - Are color contrasts, font sizes, and focus states appropriate? -->

## Security
<!-- Does this change touch sensitive financial data?
     - Is any new data exposed, stored, or transmitted?
     - Are inputs validated and sanitized?
     - Are auth/permission checks in place? -->

## Checklist
- [ ] Tested locally
- [ ] Code is clean and commented where needed
- [ ] No unintended side effects
- [ ] Accessibility considered for any UI changes
- [ ] No sensitive data leaked or improperly exposed
```

## How to Fill In Each Section

### What & Why
- Summarize what the PR does in 2–4 sentences
- Explain *why* the change is needed (bug fix, feature, refactor, performance, etc.)
- Mention related tickets, issues, or Slack threads if referenced in the conversation
- For Django Ninja changes: mention affected endpoints or schemas
- For React/TS changes: mention affected components, pages, or hooks

### Testing
- Describe how the changes were tested based on what's mentioned in the conversation
- If no testing info was provided, suggest reasonable testing steps given the changes:
  - Backend: unit tests, API endpoint tests, Django shell commands
  - Frontend: manual browser testing, component tests, Storybook
- Be specific: what scenarios were covered?

### Follow-up
- Note any TODOs, known limitations, or deferred work mentioned in the conversation
- If none mentioned, write "None at this time." — do not invent follow-ups

### Accessibility
- If the change is backend-only or has no UI impact, write: "No UI changes in this PR."
- If there are UI changes, assess based on the code: keyboard navigation, focus states, ARIA labels, color contrast, font sizes

### Security
- If the change touches API endpoints (Django Ninja): note whether inputs are validated, auth/permissions are checked, and whether any new data is exposed
- If the change touches forms or user input (React): note sanitization and validation
- If no security implications are evident, write: "No sensitive data or auth changes in this PR."

### Checklist
- Always include the full checklist with all items unchecked (`- [ ]`)
- Do not pre-check items — the developer should do this themselves

## PR Title

Before the template, suggest a concise PR title following this format:
```
[type]: short description
```
Where type is one of: `feat`, `fix`, `refactor`, `chore`, `docs`, `test`, `perf`

Example:
```
feat: add invoice export endpoint and download button
```

## Behavior Guidelines

- **Work from context**: Use everything discussed in the conversation — code snippets, descriptions, error messages, goals stated by the user
- **Be specific**: Generic filler is worse than a short honest answer. If you don't have enough info to fill a section well, write a brief placeholder and note what's missing
- **Don't hallucinate**: Never invent test steps, security implications, or follow-up items that weren't mentioned or clearly implied
- **Preserve comments**: Keep the HTML comments in the template (they help reviewers understand what to fill in if sections are incomplete)
- **Tone**: Professional but concise. GitHub PR descriptions, not essays.