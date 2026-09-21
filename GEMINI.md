# Antigravity Workspace Guidelines: K.I.D.S.

Welcome to the **Kids Intelligent Dashboard System (K.I.D.S.)** repository. This document establishes authoritative architectural principles, coding conventions, safety invariants, and operational workflows for AI agents and human contributors developing on this codebase.

---

## 1. Core Mission & Invariants

1. **Zero-Backend Architecture (\$0 Cloud Infrastructure Cost)**
   - Student data MUST NEVER be routed through, persisted on, or mirrored to external cloud servers, third-party databases, or proxy relays.
   - All network synchronizations flow strictly between the local Android device and the parent's authenticated personal **Google Drive Vault** in **AI-native file formats** (`notices.jsonl`, `MASTER_DIGEST.md`, `_system/knowledge_graph.json`, `graph.html`).

2. **100% On-Device Machine Learning (Google ML Kit)**
   - Optical Character Recognition (OCR) on circular images and multi-page PDFs MUST run locally on-device using `play-services-mlkit-text-recognition` with streaming `PdfRenderer`.
   - In-memory Bitmaps must be recycled immediately to avoid Out-Of-Memory (OOM) conditions.
   - Never call external cloud vision or OCR APIs that incur billing or send educational media off-device.

3. **Restricted Privacy Scope (`drive.file`)**
   - OAuth scope MUST strictly be `https://www.googleapis.com/auth/drive.file`.
   - Never request full Google Drive access (`drive` or `drive.readonly`) or unnecessary Google Sheets scopes. The application only accesses files and directories it has created under `K.I.D.S. Data/`.

4. **Strict Privacy Filtering at Memory Boundary**
   - Push notifications intercepted via `NotificationListenerService` MUST be evaluated against whitelisted package names and chat groups BEFORE disk persistence or network transmission.
   - Non-educational notifications, personal chats, OTPs, and banking alerts MUST be dropped immediately with zero disk persistence and zero telemetry logging.

5. **Universal Accessibility (WCAG 2.1 AA/AAA)**
   - All interactive touch targets MUST enforce minimum dimensions of **48dp × 48dp**.
   - Contrast ratios MUST meet or exceed 4.5:1 for standard body text and 7:1 for headings.
   - All UI elements in Jetpack Compose MUST provide semantic descriptions for screen readers (Google TalkBack).

6. **Sequential Onboarding Flow & Step 0 Mandatory Gate**
   - **Step 0 (System Permissions & Setup)**: Advance Permission ("Allow restricted settings" in App Info) is required first on Android 13+ to unlock system permission toggles for sideloaded APKs.
   - **Mandatory Accessibility Gate**: Accessibility Service enablement is strictly mandatory before entering Step 1 (Cloud Vault & Child Profile). The parent cannot proceed to Step 1 without activating Accessibility.
   - Once Step 0 prerequisites are satisfied, the parent completes the 4-step wizard for child #1 (Cloud Vault -> Classroom -> School Portals -> WhatsApp). Once completed, the child is displayed on the Children Grid Dashboard.
   - Children cannot be switched midway through setup.

---

## 2. Technology Stack & Tooling (September 2026 Standard)

| Domain | Standard / Framework | Specification |
| :--- | :--- | :--- |
| **Language** | Kotlin | 2.0+ (Kotlin K2 Compiler enabled) |
| **Build System** | Gradle 8.6+ & Kotlin DSL | Gradle Version Catalog (`gradle/libs.versions.toml`) |
| **Android Target** | Target SDK 34/35 (Android 14/15) | Min SDK 26 (Android 8.0 Oreo) |
| **UI Framework** | Jetpack Compose + Material 3 | Compose BOM, single-activity architecture |
| **Typography** | Kanit (Headings) & Poppins (Body) | `androidx.compose.ui:ui-text-google-fonts` |
| **Local Persistence**| Jetpack Room + SQLite FTS4 | Room 2.6.1 with KSP annotation processing |
| **Background Sync**| AndroidX WorkManager | Expedited Work & Periodic Work with constraints |
| **On-Device OCR** | Google ML Kit Text Recognition | `com.google.android.gms:play-services-mlkit-text-recognition:19.0.0` + `PdfRenderer` |
| **Auth** | Google Credential Manager API | `androidx.credentials:credentials:1.3.0` |
| **Cloud Services** | Google API Client Library | Drive REST API v3 (`drive.file` scope only) |
| **Testing** | Multi-Tier Testing Pyramid | JUnit 5, MockK, Robolectric, Truth, Compose Test Rule |
| **Knowledge Graph**| Local Kotlin Graphify Engine | On-device graph generator (`knowledge_graph.json`, `graph.html`) |

---

## 3. Directory Layout & Architecture

The project adheres to Clean Architecture with strict separation of concerns:

```
c:\K.I.D.S\
├── gradle/
│   └── libs.versions.toml             # Authoritative version catalog
├── app/
│   ├── src/
│   │   ├── main/
│   │   │   ├── AndroidManifest.xml
│   │   │   ├── java/com/kids/collector/
│   │   │   │   ├── data/              # Room DB, Google Drive client, ML Kit parser
│   │   │   │   │   ├── db/            # Entities, DAOs, TypeConverters, FTS4 tables
│   │   │   │   │   ├── drive/         # Resumable uploaders, folder provisioning, JSONL stream
│   │   │   │   │   └── ocr/           # ML Kit offline text recognizer & PdfRenderer
│   │   │   │   ├── domain/            # Core business logic, routing, hashing, Graphify
│   │   │   │   │   ├── classifier/    # Rule-based tagger (CIRCULAR, HOMEWORK, ATTENDANCE, FEES)
│   │   │   │   │   ├── filter/        # PrivacyFilter (whitelisting, instant drops)
│   │   │   │   │   ├── router/        # MultiChildRouter (attribution by handle, email, grade)
│   │   │   │   │   ├── dedupe/        # SHA-256 fingerprint deduplication
│   │   │   │   │   ├── importer/      # WhatsAppChatExportParser (.txt / .zip fallback)
│   │   │   │   │   └── graph/         # KotlinGraphifyEngine (nodes, edges, GraphRAG, Markdown)
│   │   │   │   ├── presentation/      # Jetpack Compose UI
│   │   │   │   │   ├── theme/         # KidsTheme, Color tokens, Kanit & Poppins Typography
│   │   │   │   │   ├── wizard/        # 4-Step Onboarding Wizard
│   │   │   │   │   ├── dashboard/     # Multi-child grid dashboard
│   │   │   │   │   └── telemetry/     # Live diagnostic feed & 5-point probe UI
│   │   │   │   ├── service/           # Android System Services
│   │   │   │   │   ├── KidsNotificationListenerService.kt
│   │   │   │   │   ├── KidsAccessibilityService.kt
│   │   │   │   │   └── DriveSyncWorker.kt
│   │   │   │   └── telemetry/         # Drive deep logger (sync_timeline.log, snapshot)
│   │   │   └── res/                   # Drawables, strings, color schemes
│   │   └── test/java/com/kids/collector/ # Unit & Logic Test Suite
│   ├── build.gradle.kts
│   └── proguard-rules.pro
├── graphify-out/                      # Graphify Knowledge Graph artifacts
├── .github/                           # CI workflows, PR and Issue templates
└── GEMINI.md                          # Antigravity Workspace Guidelines (This file)
```

---

## 4. Coding Conventions & Safety Invariants

### 4.1. Privacy Filter Implementation
- `PrivacyFilter.shouldIngest(sbn: StatusBarNotification)` must return `false` unless `sbn.packageName` is strictly contained in the allowed school package registry.
- Non-whitelisted notifications must be silently dropped without logging message content or sender identities to `sync_timeline.log`.

### 4.2. AccessibilityService Governance
- The `AccessibilityService` is strictly used for user-initiated historical backfill.
- Prior to service activation, the application MUST present a full-screen disclosure detailing the exact purpose, targeted boundaries (only foreground school apps), and zero-cloud retention policy.
- Accessibility MUST remain 100% optional: the application must function cleanly through push notifications and manual chat export if Accessibility is denied.

### 4.3. Compose UI Guidelines
- Always use `KidsTheme` color tokens:
  - Deep Navy: `Color(0xFF1A365D)` (Primary brand, headers, primary buttons)
  - Amber Orange: `Color(0xFFED8936)` (Badges, accents, active sync status)
  - Light Slate: `Color(0xFFE2E8F0)` (Card outlines, dividers)
  - Off-White Canvas: `Color(0xFFF7FAFC)` (Main app background)
  - Surface White: `Color(0xFFFFFFFF)` (Card surfaces, dialogs)
  - Text Primary: `Color(0xFF0F172A)` (15.8:1 contrast on canvas)
  - Text Secondary: `Color(0xFF475569)` (5.5:1 contrast on canvas)
- Always specify `minHeight = 48.dp, minWidth = 48.dp` on touch targets.
- Headings must use `KanitFontFamily`; body copy and controls must use `PoppinsFontFamily`.

### 4.4. GitHub CI/CD & Graphify Pipeline Guardian (`github_ci_guardian`)
- **Automated Subagent Delegation**:
  - The `github_ci_guardian` subagent manages GitHub repository activity, keeps codebase knowledge graphs (`graphify-out/`) synchronized with every commit, and monitors CI/CD pipelines.
  - On every build:
    1. Synchronizes AST extraction & community clustering via `graphify extract . --code-only` and `graphify cluster-only .`.
    2. Validates `graphify-out/graph.json` integrity (500+ nodes, valid edges, 20+ clusters).
    3. Runs `scripts/ci_watch.py` to monitor GitHub Actions (`Android CI & Quality Gates` and `Knowledge Graph Validation & Graphify Pipeline`).
    4. Confirms GitHub Release delivery of `app-debug.apk` with zero assumption of success.

### 4.5. Documentation Guardian Subagent (`docs_maintainer`)
- **Automated Documentation Maintenance**:
  - The `docs_maintainer` subagent maintains and updates both the parent-facing User Manual (`docs/USER_MANUAL.md`) and the engineering specification (`docs/TECHNICAL_ARCHITECTURE.md`) on every build.
  - On every build/release:
    1. Updates `docs/USER_MANUAL.md` to reflect new user-facing features, permission requirements, UI interactions, Classroom auto-capture modes (Stream vs. Classwork), autonomous attachment handling, and troubleshooting tips.
    2. Updates `docs/TECHNICAL_ARCHITECTURE.md` to reflect Clean Architecture layers, Room SQLite/FTS4 schema, background services (`KidsAccessibilityService`, `DownloadFolderObserver`, `DriveSyncWorker`), Graphify pipeline, and privacy boundary invariants.
    3. Keeps technical architecture and user guides 100% synchronized with actual code implementation.

### 4.6. Workflow, App & UX Risk Guardian Subagent (`workflow_risk_guardian`)
- **Automated Failure Mode & UX Risk Analysis**:
  - The `workflow_risk_guardian` subagent proactively inspects proposed implementations, code diffs, and architectural changes both before and after execution.
  - Its objective is to detect and report:
    1. **Workflow Breakage & Dead Ends**: Trapped user states, blocked permission gates, unhandled back-button navigation, corrupted state persistence across app restarts.
    2. **App Stability & Lifecycle Failures**: Process death, configuration changes, coroutine lifecycle leaks, OOM from ML Kit/PDF rendering, network dropouts, Google Drive rate limit handling.
    3. **UX & Ergonomics Regressions**: WCAG touch target violations (<48dp), sluggish/frozen UI lacking async progress indicators, unclear technical error jargon shown to parents, and color/typography deviations.
    4. **Safety & Privacy Violations**: Any violation of the Zero-Backend Invariant, privacy filter leaks, or storage anti-clutter regressions.
  - When risks are detected, it brings them to immediate attention with concrete, actionable code and UI solutions.

### 4.7. Deep Logging & Diagnostic Telemetry Guardian Subagent (`deep_logger_guardian`)
- **Automated Logging Audit & Post-Run Diagnostics**:
  - The `deep_logger_guardian` subagent ensures deep, high-signal, structured diagnostic observability is embedded across all application workflows during implementation, and analyzes telemetry/diagnostic logs after runs to diagnose edge cases, anomalies, and performance bottlenecks.
  - Its objective is to verify and diagnose:
    1. **During Implementation**:
       - Ensures every critical path (crawler state machine transitions, attachment downloads, network requests, Room DB operations, Google Drive uploads) has structured log entries with timestamps, event types, parameters, and outcomes.
       - Enforces Zero-Backend & Privacy Preservation: confirms that no student PII, credentials, tokens, or private non-educational messages are written to logs.
       - Eliminates silent failures: detects and removes empty catch blocks, unlogged coroutine cancellations, or swallowed IOExceptions.
    2. **After Implementation / Post-Run**:
       - Analyzes live trace logs (`crawler_trace.log`, `sync_timeline.log`, logcat), notices databases, and Google Drive vault system logs.
       - Provides line-level root-cause analysis for any reported discrepancies (e.g. download counts, dropped notifications, timing bottlenecks) accompanied by concrete remedial code.

### 4.8. Security, Privacy & Threat Modeling Guardian Subagent (`security_guardian`)
- **Automated Security, Privacy & Threat Analysis Before, During & After Implementation**:
  - The `security_guardian` subagent serves as the authoritative guardian of application security, privacy preservation, and threat resistance.
  - Its objective is to evaluate, audit, and verify:
    1. **Before Implementation (Design & Threat Modeling)**:
       - STRIDE threat modeling on proposed features, architecture patterns, and data pipelines.
       - Zero-Backend Invariant enforcement: strictly vetoes external cloud databases, analytics relays, proxy servers, or third-party telemetry.
       - OAuth scope minimization: enforces strict `drive.file` scope, blocking any attempts to broaden permissions.
    2. **During Implementation (Code & Diff Auditing)**:
       - Code-level vulnerability analysis: path traversal during attachment handling, SQL injection in queries, cryptographic misuse, insecure IPC (`PendingIntent.FLAG_IMMUTABLE`, unexported components).
       - Memory-boundary privacy filtering: validates that non-educational notifications, personal chats, OTPs, and banking alerts are dropped before disk persistence.
       - Dependency and supply chain security auditing in `libs.versions.toml`.
    3. **After Implementation (Post-Build Verification & Release Audit)**:
       - Merged AndroidManifest audit for exposed components (`android:exported="false"` enforcement).
       - Runtime log sanitization verification: ensures zero student credentials, tokens, or PII are logged to logcat, `crawler_trace.log`, or `sync_timeline.log`.
       - ProGuard / R8 rule validation to ensure test hooks, mocks, and debug bypasses are stripped from production release builds.


