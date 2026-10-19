# Chrome Extension (Manifest V3) Architecture & Antigravity Guardrails

This project (`school-mcp-sync-engine`) contains a production Manifest V3 Chrome Extension located under `extension/` alongside Google Apps Script services and MCP servers. All coding agents must adhere to these architectural guardrails.

---

## 1. Slash Command & Workflow Playbook

| Workflow Command | When to Use in Extension Development | Agent Action |
| :--- | :--- | :--- |
| **/issue** | Pre-implementation architectural planning | Research Chrome APIs, review permissions (`activeTab`, `storage`, `scripting`), and draft the message schema *before* touching code. |
| **/boost** | Single-context, goal-oriented tasks | Bundle Vite to `/dist`, fix path aliases, wrap `chrome.storage.local`, or resolve a specific TypeScript error. |
| **/teamwork** | Cross-context feature additions | Coordinate isolated agents across runtime boundaries (UI Agent, Background Agent, Content Script Agent). |
| **/browser** | Popup & Sidepanel visual smoke testing | Spin up headless Chrome against `npm run dev`, mock `chrome.*` APIs, test UI states and layout constraints. |

---

## 2. Layered Architecture & Stacked PR Boundaries

To prevent regressions and fragility across separate runtime worlds, changes must be structured in distinct layers:

1. **Layer 1: Base Manifest & Build Tooling** (`manifest.json`, `vite.config.ts`, `package.json`)
   - Permissions, content security policy, entry points, and path aliases.
2. **Layer 2: Message Contracts & Shared Types** (`src/types/messages.ts`)
   - Discriminated unions defining action names and strict payloads across contexts.
3. **Layer 3: Background Service Worker Hub** (`src/background/serviceWorker.ts`, `src/services/`)
   - Event listeners, alarms, OAuth token management, and Drive REST calls.
4. **Layer 4: Injected Content Scripts & Popup UI** (`src/content/`, `src/popup/`)
   - DOM observation, scraping logic, wizard steps, and UI rendering.

Never bundle Layer 1 (permissions) and Layer 4 (UI styling) into a single monolithic commit.

---

## 3. Subagent Scoping & Log Triage

Extensions live across isolated sandboxes. Delegate tasks according to runtime contexts:

* **UI Agent:** Focuses strictly on `src/popup/`, `index.html`, and `style.css` with mocked Chrome APIs.
* **Background Agent:** Manages service worker lifecycle, keep-alive alarms, and external APIs in `src/background/` and `src/services/`.
* **Content Script Agent:** Handles DOM mutation observers, script injection, and in-page data scraping.
* **Log Triage Subagent:** Dedicated agent to inspect Chrome LevelDB logs, `chrome.runtime.lastError`, and network dumps without cluttering the primary planner's context.

---

## 4. Manifest V3 Service Worker Lifecycle

* **Ephemeral Workers:** Service workers terminate after 30 seconds of inactivity. **Never rely on global in-memory state persisting across events.**
* **Persistent Storage:** All flags, child profiles, and sync queues must reside in `chrome.storage.local`.
* **Keep-Alive Supervisor:** For multi-minute operations (batch downloads, infinite scroll scrapers), maintain an active 10-15s heartbeat (`chrome.runtime.getPlatformInfo()`) and `chrome.alarms` interval.

---

## 5. Automated Build & Verification Loop

After modifying source files in `extension/src/`, always execute the verification loop:
```bash
# In extension/ directory:
npx tsc --noEmit -p tsconfig.json   # 1. Type validation (@types/chrome)
npm test                           # 2. Vitest unit test suite (250 tests)
npm run build                      # 3. Vite bundler + asset copy to extension/dist/
npm run verify                     # 4. Webstore manifest linting
```

---

## 6. Minimal Permission Scoping & Web Store Safety

* **Host Permissions:** Do not request blanket `<all_urls>`<. Scope strictly to required domains:
  - `*://classroom.google.com/*`
  - `*://web.whatsapp.com/*`
  - `*://*.googleapis.com/*`
  - `*://*.googleusercontent.com/*`
* **API Permissions:** Incrementally declare only required capabilities (`storage`, `alarms`, `identity`, `scripting`, `tabs`).
