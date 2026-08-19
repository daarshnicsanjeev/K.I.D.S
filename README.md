# Universal School Portal & Workspace MCP Sync Engine

A privacy-first, zero-downtime platform that aggregates student academic data across native Google Workspace tools (Classroom, Gmail, Calendar) and external school portals (EduSprint, Canvas, Moodle) into a personal Model Context Protocol (MCP) server for **Gemini Spark**.

## Project Modules

1. **`extension/` (Chrome Extension MV3)**
   - Built with TypeScript & Vite.
   - Passive sniffing via `activeTab` mode (injected fetch/XHR interceptor).
   - 4-Step Guided Setup Wizard (`wizard_current_step` state machine).
   - 3-Stage Pre-Flight Test Protocol (Local probe, Extension fetch, GAS proxy verification).
   - `SanitizerService` PII scrubbing and `ErrorHasher` SHA-256 fingerprinting.

2. **`gas-mcp-server/` (Google Apps Script MCP Backend)**
   - Implements JSON-RPC 2.0 router over HTTP POST (`tools/list`, `tools/call`, `register_mcp_tool`, `test_preflight_proxy`).
   - Native read-only Google Workspace integration (Classroom, Calendar, Gmail).
   - Dynamic `UrlFetchApp` portal executor saving tools to `UserProperties`.

3. **`gas-error-webhook/` (Developer Error Registry Web App)**
   - Zero-cost, lightweight Apps Script web app logging to a Google Sheet.
   - Screen-reader accessible (NVDA/JAWS compatible).
   - Fingerprint deduplication and occurrence counting.

## Local Setup & Development

### Extension
```bash
cd extension
npm install
npm run build
npm test
```
Load the `extension/dist` folder into Chrome via `chrome://extensions` (Developer Mode -> Load Unpacked).

### Apps Script Deployment (`clasp`)
```bash
cd gas-mcp-server
clasp login
clasp push
clasp deploy --description "Production MCP Engine"
```
