# Workspace Orchestrator Rules

1. **Pre-Flight Flow, UX & Ripple-Effect Estimation**:
   Before writing code for any feature or workflow modification, consult `@flow-architect` to:
   - Estimate the complete user journey across 5 operational scenarios (Cold Start, Happy Path, Transient Errors/Quotas, Multi-Child Concurrency, and Downstream Gemini Spark consumption).
   - Trace the blast radius across extension popup, background service workers, Google Apps Script, Drive manifests, and local storage to prevent regressions.
   - Apply the **Obvious vs. Confusing Filter**:
     * *Obvious*: Directly implement standard ergonomic UX patterns (in-flight button disabling, spinners/progress bars, optimistic UI rollbacks, resilient toasts, atomic writes).
     * *Confusing / Ambiguous*: Stop and proactively ask the user for clarification, offering 2–3 concrete options with trade-offs before proceeding.
   - Run `npm run verify:flow` to guarantee state and DOM integrity.

2. **Chrome Extension Compliance**:
   Before presenting any refactored or generated extension code, delegate verification to `@cws-verifier` and confirm clean linting output (`npm run verify`).

3. **Google Apps Script & Cloud Worker Architecture**:
   Before presenting or deploying any Apps Script modifications (`.gs` files or `gasProvisioner.ts` templates), delegate verification to `@gas-guardian` to guarantee:
   - 100% V8 syntax validity with zero escaping or regex parse errors (`npm run verify:gas`).
   - 4.5-minute time-budget guards on all batch ingestion loops.
   - 1:1 synchronization between `gas-mcp-server/src/*.gs` and `extension/src/services/gasProvisioner.ts`.

4. **Google Drive Vault & Gemini Spark Data Integrity**:
   - **STRICT READ-ONLY ON LIVE DRIVE DATA**: Neither subagents nor agent scripts may ever directly write, trash, or edit files in `G:\My Drive\...`.
   - All Google Drive files and folders must be created, updated, and managed exclusively by production application code (Google Apps Script or the Chrome Extension).
   - Before committing sync features or file organization logic, delegate verification to `@vault-sentinel` to audit (read-only) and guarantee:
     * Canonical folder hierarchy and isolation by academic year and child (`npm run verify:vault`).
     * Clean, descriptive attachment naming without generic tags or double extensions (`.pdf.pdf`).
     * LLM-friendly formatting for manifests (`classroom_data.json`, `school_emails.json`, `daily_digest.json`).
     * Production code resilience: self-contained temp cleanup and `try...finally` guards so temporary files never leak.
