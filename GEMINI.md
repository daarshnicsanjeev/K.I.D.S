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

6. **Sequential Onboarding Flow**
   - The parent completes the full 4-step wizard for child #1 first. Once completed, the child is displayed on the Children Grid Dashboard.
   - Children cannot be switched midway through the 4-step setup.

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
