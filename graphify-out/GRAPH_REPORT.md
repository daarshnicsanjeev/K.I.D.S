# Graph Report - K.I.D.S  (2026-09-20)

## Corpus Check
- Corpus is ~14,560 words - fits in a single context window. You may not need a graph.

## Summary
- 244 nodes · 350 edges · 19 communities (14 shown, 5 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 5 edges (avg confidence: 0.95)
- Token cost: 1,200 input · 850 output

## Community Hubs (Navigation)
- Compose UI & Wizard
- Local Graphify Engine
- Content Classification Engine
- ML Kit OCR Engine
- Room Child Profile DAOs
- Notification Listener & Privacy
- Attachment DAOs & Storage
- Google Drive Vault Client
- Sync State Machine
- SHA-256 Deduplication Engine
- Application Lifecycle & Boot
- Drive Deep-Logging Telemetry
- Historical Accessibility Crawler
- Brand Typography System
- Gradle Wrapper System

## God Nodes (most connected - your core abstractions)
1. `ContentCategory` - 11 edges
2. `ChildProfile` - 11 edges
3. `DeduplicationEngine` - 9 edges
4. `K.I.D.S. Android Collector (PRD)` - 9 edges
5. `NoticeEntity` - 8 edges
6. `KidsDatabase` - 8 edges
7. `PrivacyFilter` - 8 edges
8. `KotlinGraphifyEngine` - 8 edges
9. `SyncStatus` - 8 edges
10. `PrivacyFilterTest` - 8 edges

## Surprising Connections (you probably didn't know these)
- `K.I.D.S. Android Collector (PRD)` --filters_with--> `Memory Boundary Privacy Filter`  [EXTRACTED]
  prd.md → GEMINI.md
- `K.I.D.S. Android Collector (PRD)` --verified_by--> `Multi-Tier Testing Pyramid`  [EXTRACTED]
  prd.md → GEMINI.md
- `K.I.D.S. Android Collector (PRD)` --governed_by--> `Restricted Drive Scope (drive.file)`  [EXTRACTED]
  prd.md → GEMINI.md
- `K.I.D.S. Android Collector (PRD)` --complies_with--> `WCAG 2.1 AA/AAA Design System`  [EXTRACTED]
  prd.md → README.md
- `KidsNotificationListenerService` --calls--> `ContentClassifier`  [EXTRACTED]
  app/src/main/java/com/kids/collector/service/KidsNotificationListenerService.kt → app/src/main/java/com/kids/collector/domain/classifier/ContentClassifier.kt

## Import Cycles
- None detected.

## Communities (19 total, 5 thin omitted)

### Community 0 - "Compose UI & Wizard"
Cohesion: 0.08
Nodes (27): alignment, MainActivity, DiagnosticFeedScreen(), LogEntry, KidsTheme(), OnboardingWizardScreen(), WizardStep, STEP_1_VAULT (+19 more)

### Community 1 - "Local Graphify Engine"
Cohesion: 0.12
Nodes (14): GraphEdge, GraphNode, KnowledgeGraph, KotlinGraphifyEngine, Attachment, ChildProfile, Notice, MultiChildRouter (+6 more)

### Community 2 - "Content Classification Engine"
Cohesion: 0.14
Nodes (11): ContentClassifier, ContentCategory, ATTENDANCE, CIRCULAR, FEES, HOMEWORK, UNKNOWN, ContentClassifierTest (+3 more)

### Community 3 - "ML Kit OCR Engine"
Cohesion: 0.10
Nodes (17): MLKitOcrParser, Bitmap, 4-Step Onboarding Wizard, inputimage, Memory Boundary Privacy Filter, Multi-Tier Testing Pyramid, On-Device ML Kit OCR Engine, K.I.D.S. Android Collector (PRD) (+9 more)

### Community 4 - "Room Child Profile DAOs"
Cohesion: 0.15
Nodes (8): ChildProfileDao, NoticeDao, ChildProfileEntity, NoticeEntity, entity, Flow, index, primarykey

### Community 5 - "Notification Listener & Privacy"
Cohesion: 0.13
Nodes (10): PrivacyFilter, KidsNotificationListenerService, PrivacyFilterTest, coroutinescope, launch, notification, NotificationListenerService, StatusBarNotification (+2 more)

### Community 6 - "Attachment DAOs & Storage"
Cohesion: 0.19
Nodes (7): AttachmentDao, AttachmentEntity, KidsDatabase, Context, database, room, RoomDatabase

### Community 7 - "Google Drive Vault Client"
Cohesion: 0.14
Nodes (10): GoogleDriveClient, GoogleSheetsClient, dispatchers, drive, file, filecontent, java, sheets (+2 more)

### Community 8 - "Sync State Machine"
Cohesion: 0.18
Nodes (10): SyncStatus, DROPPED, FAILED, PENDING, SYNCED, DriveSyncWorker, context, CoroutineWorker (+2 more)

### Community 9 - "SHA-256 Deduplication Engine"
Cohesion: 0.22
Nodes (4): DeduplicationEngine, DeduplicationHashTest, ByteArray, messagedigest

### Community 10 - "Application Lifecycle & Boot"
Cohesion: 0.25
Nodes (7): KidsApplication, BootReceiver, Context, Application, BroadcastReceiver, Intent, log

### Community 11 - "Drive Deep-Logging Telemetry"
Cohesion: 0.22
Nodes (7): DeviceInfo, DiagnosticSnapshot, DriveDeepLogger, PipelineMetrics, StepStatus, Drive Deep Logging & Telemetry Subsystem, simpledateformat

### Community 12 - "Historical Accessibility Crawler"
Cohesion: 0.33
Nodes (4): AccessibilityEvent, AccessibilityNodeInfo, AccessibilityService, KidsAccessibilityService

### Community 13 - "Brand Typography System"
Cohesion: 0.22
Nodes (8): font, fontfamily, fontweight, googlefont, r, sp, textstyle, typography

## Knowledge Gaps
- **19 isolated node(s):** `PENDING`, `SYNCED`, `FAILED`, `DROPPED`, `CIRCULAR` (+14 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 89 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `K.I.D.S. Android Collector (PRD)` connect `ML Kit OCR Engine` to `Local Graphify Engine`, `Drive Deep-Logging Telemetry`?**
  _High betweenness centrality (0.271) - this node is a cross-community bridge._
- **Why does `4-Step Onboarding Wizard` connect `ML Kit OCR Engine` to `Compose UI & Wizard`?**
  _High betweenness centrality (0.213) - this node is a cross-community bridge._
- **Why does `SyncStatus` connect `Sync State Machine` to `Local Graphify Engine`, `Room Child Profile DAOs`, `Notification Listener & Privacy`?**
  _High betweenness centrality (0.170) - this node is a cross-community bridge._
- **What connects `PENDING`, `SYNCED`, `FAILED` to the rest of the system?**
  _19 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Compose UI & Wizard` be split into smaller, more focused modules?**
  _Cohesion score 0.0846774193548387 - nodes in this community are weakly interconnected._
- **Should `Local Graphify Engine` be split into smaller, more focused modules?**
  _Cohesion score 0.11822660098522167 - nodes in this community are weakly interconnected._
- **Should `Content Classification Engine` be split into smaller, more focused modules?**
  _Cohesion score 0.1383399209486166 - nodes in this community are weakly interconnected._