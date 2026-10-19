---
trigger: always_on
description: Chrome Extension Manifest V3 development rules and guardrails for Antigravity agents.
---

# Chrome Extension (Manifest V3) Rules

1. **Manifest V3 Architecture:**
   - Background runs strictly as an event-driven Service Worker (`dist/background.js`).
   - Service workers are killed after 30s idle. Never rely on persistent in-memory variables.
   - All state must reside in `chrome.storage.local`.
   - Long-running sync loops must maintain a keep-alive supervisor (10-15s heartbeat + alarms).

2. **Content Security Policy (CSP):**
   - Never write inline scripts, eval(), or dynamic remote script injections.
   - Use sandboxed `chrome.scripting.executeScript` with declared functions and args.

3. **Message-Contract First:**
   - Define message types and schemas before writing communication logic.
   - Handle all actions explicitly in `serviceWorker.ts` `handleMessage`.
74 **Automated Verification:**
   - In `extension/`, run `npx tsc --noEmit -p tsconfig.json` and `npm test` before completing tasks.
   - Always compile production bundle with `npm run build` to refresh `extension/dist/`.

5. **Subagent Scoping:**
   - UI Agent: `src/popup/` (HTML, CSS, DOM).
   - Background Agent: `src/background/`, `src/services/` (OALuth, APIs, Worker Events).
   - Content Script Agent: `src/content/`, Tab DOM and Wiz scrapers.
