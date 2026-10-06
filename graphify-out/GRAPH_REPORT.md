# Graph Report - K.I.D.S  (2026-10-06)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 1163 nodes · 3027 edges · 80 communities (16 shown, 64 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 34 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `9815440c`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- KidsAccessibilityService
- GoogleDriveSharedHarvester
- GoogleDriveClient
- Query
- ChildProfile
- MLKitOcrParser.kt
- DriveAttachmentMatcherTest
- ci_watch.py
- GoogleDriveSearchHarvester
- KidsAccessibilityService.kt
- FloatingCrawlerOverlay.kt
- DriveSyncWorker.kt
- OnboardingWizardScreen.kt
- GestureDescription
- InternalAppDiagnosticsMirror.kt
- CrawlerTraceLogger
- FloatingCrawlerOverlay
- AttachmentChipMatcherTest
- ChildrenGridDashboard.kt
- .mirrorAllInternalDataToDrive
- StreamManifestAndCardTest
- StreamManifest
- GoogleDriveClient.kt
- .parse
- ContentCategory
- MainActivity.kt
- PrivacyFilterTest
- DeduplicationEngine
- .findMatchingNoticeForAttachment
- WhatsAppChatExportParser.kt
- DriveDeepLogger.kt
- K.I.D.S. Android Collector (PRD)
- StreamItemStatus
- Test
- Intent
- .fallbackNativeScrollBackward
- DownloadFolderObserver.kt
- WizardStep
- ContentClassifierTest
- ChildrenGridDashboard
- KidsTheme.kt
- GestureResultCallback
- WhatsAppChatExportParserTest

## God Nodes (most connected - your core abstractions)
1. `KidsAccessibilityService` - 126 edges
2. `GoogleDriveSharedHarvester` - 125 edges
3. `FloatingCrawlerOverlay` - 44 edges
4. `GoogleDriveClient` - 38 edges
5. `GoogleDriveSearchHarvester` - 36 edges
6. `StreamManifest` - 28 edges
7. `OnboardingWizardScreen()` - 25 edges
8. `DriveVaultManager` - 24 edges
9. `CrawlerTraceLogger` - 23 edges
10. `AttachmentDao` - 22 edges

## Surprising Connections (you probably didn't know these)
- `DiagnosticFeedScreen()` --calls--> `ProbeItem`  [INFERRED]
  app/src/main/java/com/kids/collector/presentation/telemetry/DiagnosticFeedScreen.kt → app/src/main/java/com/kids/collector/domain/model/Models.kt
- `KidsAccessibilityService` --calls--> `ContentClassifier`  [INFERRED]
  app/src/main/java/com/kids/collector/service/KidsAccessibilityService.kt → app/src/main/java/com/kids/collector/domain/classifier/ContentClassifier.kt
- `KidsAccessibilityService` --calls--> `DeduplicationEngine`  [INFERRED]
  app/src/main/java/com/kids/collector/service/KidsAccessibilityService.kt → app/src/main/java/com/kids/collector/domain/dedupe/DeduplicationEngine.kt
- `KidsAccessibilityService` --calls--> `ScreenWakeLockManager`  [INFERRED]
  app/src/main/java/com/kids/collector/service/KidsAccessibilityService.kt → app/src/main/java/com/kids/collector/service/ScreenWakeLockManager.kt
- `DriveSyncWorker` --calls--> `KotlinGraphifyEngine`  [INFERRED]
  app/src/main/java/com/kids/collector/service/DriveSyncWorker.kt → app/src/main/java/com/kids/collector/domain/graph/KotlinGraphifyEngine.kt

## Import Cycles
- None detected.

## Communities (80 total, 64 thin omitted)

### Community 0 - "KidsAccessibilityService"
Cohesion: 0.06
Nodes (4): ExtractedAttachmentDetail, KidsAccessibilityService, UnvisitedCard, VisiblePendingCard

### Community 2 - "GoogleDriveClient"
Cohesion: 0.07
Nodes (12): DriveVaultManager, Failure, ProvisionStep1Result, Success, UserConsentRequired, ChildVaultFolders, GoogleDriveClient, PermissionHelper (+4 more)

### Community 3 - "Query"
Cohesion: 0.06
Nodes (4): AttachmentDao, ChildProfileDao, NoticeDao, KidsDatabase

### Community 4 - "ChildProfile"
Cohesion: 0.05
Nodes (28): AttachmentEntity, ChildProfileEntity, NoticeEntity, NoticeFtsEntity, Converters, GraphEdge, GraphNode, KnowledgeGraph (+20 more)

### Community 5 - "MLKitOcrParser.kt"
Cohesion: 0.07
Nodes (8): SafVaultFolders, SafVaultManager, MLKitOcrParser, OcrExtractionResult, NotificationParser, ParsedNotification, ShareTargetActivity, NotificationParserTest

### Community 7 - "ci_watch.py"
Cohesion: 0.09
Nodes (19): diagnose_failure(), get_latest_run(), main(), monitor_workflow(), run_cmd(), sync_local_graph(), verify_release(), dump_ui_xml() (+11 more)

### Community 12 - "OnboardingWizardScreen.kt"
Cohesion: 0.10
Nodes (3): getDefaultSchoolAppList(), launchAccountPicker(), queryInstalledLauncherApps()

### Community 13 - "GestureDescription"
Cohesion: 0.15
Nodes (5): GestureResultCallback, GestureResultCallback, GestureResultCallback, GestureResultCallback, GestureResultCallback

### Community 24 - ".parse"
Cohesion: 0.24
Nodes (3): ClassroomDateParser, ParsedDate, ClassroomDateParserTest

### Community 25 - "ContentCategory"
Cohesion: 0.18
Nodes (7): ContentClassifier, ContentCategory, ATTENDANCE, CIRCULAR, FEES, HOMEWORK, UNKNOWN

### Community 26 - "MainActivity.kt"
Cohesion: 0.16
Nodes (5): AppScreen, DASHBOARD, DIAGNOSTICS, WIZARD, MainActivity

### Community 31 - "WhatsAppChatExportParser.kt"
Cohesion: 0.24
Nodes (3): ImportedNoticeRecord, WhatsAppChatExportParser, Dual WhatsApp Catch-Up Engine

### Community 32 - "DriveDeepLogger.kt"
Cohesion: 0.24
Nodes (5): DeviceInfo, DiagnosticSnapshot, DriveDeepLogger, PipelineMetrics, StepStatus

### Community 33 - "K.I.D.S. Android Collector (PRD)"
Cohesion: 0.22
Nodes (6): 5-Point Cloud Health Probe, Google Credential Manager API, Memory Boundary Privacy Filter, K.I.D.S. Android Collector (PRD), Sequential 4-Step Onboarding, Streaming PdfRenderer OCR

### Community 34 - "StreamItemStatus"
Cohesion: 0.22
Nodes (6): StreamItemStatus, ALREADY_SYNCED, COMPLETED, FAILED_SKIPPED, IN_PROGRESS, PENDING

### Community 41 - "WizardStep"
Cohesion: 0.33
Nodes (6): WizardStep, STEP_0_PERMISSIONS, STEP_1_VAULT, STEP_2_CLASSROOM, STEP_3_PORTALS, STEP_4_WHATSAPP

## Knowledge Gaps
- **37 isolated node(s):** `DeviceInfo`, `PipelineMetrics`, `StepStatus`, `AttachmentEntity`, `ChildProfileEntity` (+32 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 235 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **64 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `KidsAccessibilityService` connect `KidsAccessibilityService` to `Intent`, `KidsAccessibilityService.kt`, `FloatingCrawlerOverlay.kt`, `OnboardingWizardScreen.kt`, `FloatingCrawlerOverlay`, `DriveVaultManager.kt`, `.mirrorAllInternalDataToDrive`, `ContentCategory`, `MainActivity.kt`, `DeduplicationEngine`?**
  _High betweenness centrality (0.244) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `KidsAccessibilityService` (e.g. with `ContentClassifier` and `DeduplicationEngine`) actually correct?**
  _`KidsAccessibilityService` has 3 INFERRED edges - model-reasoned connections that need verification._
- **What connects `DeviceInfo`, `PipelineMetrics`, `StepStatus` to the rest of the system?**
  _37 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `KidsAccessibilityService` be split into smaller, more focused modules?**
  _Cohesion score 0.0616191904047976 - nodes in this community are weakly interconnected._
- **Why does `KidsDatabase` connect `Query` to `KidsAccessibilityService`?**
  _High betweenness centrality (0.123) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `GoogleDriveSharedHarvester` (e.g. with `.runDeepCrawlLoop()` and `.startDirectDriveHarvest()`) actually correct?**
  _`GoogleDriveSharedHarvester` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Should `GoogleDriveSharedHarvester` be split into smaller, more focused modules?**
  _Cohesion score 0.07303732303732303 - nodes in this community are weakly interconnected._