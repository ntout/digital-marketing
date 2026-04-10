# How to use these prompts with Codex

## Setup
1. Open your terminal in the project root (where `CONTEXT.md` lives)
2. Run `claude` to start a Claude Code session
3. Before implementing any story, paste `CONTEXT.md` into the session

## Workflow for each story
1. Open the prompt file for the story you want to implement (e.g. `prompts/US-001.md`)
2. Copy the entire contents
3. Paste into your Claude Code session
4. Claude Code will write tests first, then implementation, directly into your repo

## Tips
- Implement stories in phase order (see CONTEXT.md)
- Always start a new Claude Code session with CONTEXT.md before a new story
- If Codex generates a field name not in CONTEXT.md, correct it immediately to avoid schema drift
- After completing a phase, ask Claude Code: "Review all files created so far and confirm field names match CONTEXT.md"
