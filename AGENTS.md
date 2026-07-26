# GrammarFix project instructions

## Purpose

GrammarFix is a lightweight AI grammar checker powered by DeepSeek. The product should be simple, accessible, privacy-conscious, inexpensive to operate, and capable of becoming a useful public web product.

## Current architecture

- `index.html`, `style.css`, and `app.js` provide the browser interface.
- `server.js` provides the local development server and `/api/grammar`.
- `functions/api/grammar.js` is the Cloudflare Pages Function.
- `api/grammar.js` is an older edge-function implementation; confirm whether it is still needed before modifying or removing it.
- The DeepSeek API key must remain server-side and must never be printed, committed, or placed in browser code.
- Local development reads `DEEPSEEK_API_KEY` from the parent workspace `.env`, with the project `.env` as a fallback.

## Working rules

- Inspect existing files and preserve user changes before editing.
- Never expose secrets or include `.env` in source control.
- Do not deploy, publish, spend money, change live integrations, or make public pricing/legal/compliance claims without explicit owner approval.
- Do not claim that the site is certified accessible, legally compliant, perfectly private, or perfectly accurate unless independently verified.
- User-submitted text should be processed only as needed for correction. Do not add storage, analytics capture, or logging of submitted text without explicit approval.
- Prefer small, understandable dependencies and low operating cost.
- Keep local and Cloudflare behavior consistent.

## Required verification

Before reporting a code change as complete:

1. Run syntax checks for changed JavaScript.
2. Start the local server on an available port.
3. Test the home page and a successful grammar correction.
4. Test invalid JSON, empty text, HTML input, and over-limit text.
5. Check the browser interface when a visible behavior changed.
6. State what changed, what passed, any remaining risk, and the best next step.

Never answer only `Done.` after performing work. Give the owner a concise Codex-style summary.

## Approval behavior

- Reading project files and making ordinary local project edits are allowed.
- Ask before running commands unless they are clearly safe, read-only checks.
- Always ask before deployment, publication, purchases, deletion of meaningful data, or external communication.
- Group related safe actions so the owner is not interrupted for every minor step.

## Current priorities

1. Establish a repeatable automated test suite for local and Cloudflare request handling.
2. Remove duplicated backend logic or make the source of truth explicit.
3. Complete functional, security, responsive-layout, and accessibility checks.
4. Verify deployment instructions against the actual Cloudflare project structure.
5. Prepare privacy/legal copy and monetization options for owner review without publishing them.

