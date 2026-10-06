# Graph Report - K.I.D.S  (2026-10-06)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 1143 nodes · 2971 edges · 72 communities (21 shown, 51 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 36 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `084fdeed`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- KidsAccessibilityService
- GoogleDriveSharedHarvester
- Query
- GoogleDriveClient
- ci_watch.py
- DriveAttachmentMatcherTest
- StreamManifest
- GoogleDriveSearchHarvester
- KidsAccessibilityService.kt
- FloatingCrawlerOverlay
- ChildrenGridDashboard.kt
- SafVaultManager.kt
- OnboardingWizardScreen.kt
- GoogleDriveClient.kt
- MainActivity.kt
- DriveSyncWorker.kt
- GestureDescription
- FloatingCrawlerOverlay.kt
- .log
- InternalAppDiagnosticsMirror.kt
- KotlinGraphifyEngine.kt
- AttachmentChipMatcherTest
- ContentCategory
- OnboardingWizardScreen
- .mirrorAllInternalDataToDrive
- Entities.kt
- MLKitOcrParser.kt
- .parse
- WhatsAppChatExportParser.kt
- Models.kt
- NotificationParserTest.kt
- assertthat
- PrivacyFilterTest
- ChildProfile
- DriveDeepLogger.kt
- DeduplicationEngine
- .fallbackNativeScroll
- Intent
- WizardStep
- GestureResultCallback

## God Nodes (most connected - your core abstractions)
1. `GoogleDriveSharedHarvester` - 126 edges
2. `KidsAccessibilityService` - 124 edges
3. `FloatingCrawlerOverlay` - 45 edges
4. `GoogleDriveClient` - 39 edges
5. `GoogleDriveSearchHarvester` - 36 edges
6. `OnboardingWizardScreen()` - 25 edges
7. `CrawlerTraceLogger` - 24 edges
8. `DriveVaultManager` - 24 edges
9. `AttachmentDao` - 22 edges
10. `NoticeDao` - 22 edges

## Surprising Connections (you probably didn't know these)
- `DiagnosticFeedScreen()` --calls--> `ProbeItem`  [INFERRED]
  app/src/main/java/com/kids/collector/presentation/telemetry/DiagnosticFeedScreen.kt → app/src/main/java/com/kids/collector/domain/model/Models.kt
- `KidsAccessibilityService` --calls--> `ContentClassifier`  [INFERRED]
  app/src/main/java/com/kids/collector/service/KidsAccessibilityService.kt → app/src/main/java/com/kids/collector/domain/classifier/ContentClassifier.kt
- `KidsAccessibilityService` --calls--> `DeduplicationEngine`  [INFERRED]
  app/src/main/java/com/kids/collector/service/KidsAccessibilityService.kt → app/src/main/java/com/kids/collector/domain/dedupe/DeduplicationEngine.kt
- `KidsAccessibilityService` --calls--> `ScreenWakeLockManager`  [INFERRED]
  app/src/main/java/com/kids/collector/service/KidsAccessibilityService.kt → app/src/main/java/com/kids/collector/service/ScreenWakeLockManager.kt
- `ShareTargetActivity` --calls--> `DeduplicationEngine`  [INFERRED]
  app/src/main/java/com/kids/collector/presentation/share/ShareTargetActivity.kt → app/src/main/java/com/kids/collector/domain/dedupe/DeduplicationEngine.kt

## Import Cycles
- None detected.

## Communities (72 total, 51 thin omitted)

### Community 0 - "KidsAccessibilityService"
Cohesion: 0.06
Nodes (5): NoticeEntity, ExtractedAttachmentDetail, KidsAccessibilityService, UnvisitedCard, VisiblePendingCard

### Community 2 - "Query"
Cohesion: 0.06
Nodes (4): AttachmentDao, ChildProfileDao, NoticeDao, KidsDatabase

### Community 3 - "GoogleDriveClient"
Cohesion: 0.08
Nodes (9): DriveVaultManager, Failure, ProvisionStep1Result, Success, UserConsentRequired, ChildVaultFolders, GoogleDriveClient, DiagnosticFeedScreen() (+1 more)

### Community 4 - "ci_watch.py"
Cohesion: 0.09
Nodes (19): diagnose_failure(), get_latest_run(), main(), monitor_workflow(), run_cmd(), sync_local_graph(), verify_release(), dump_ui_xml() (+11 more)

### Community 6 - "StreamManifest"
Cohesion: 0.09
Nodes (9): StreamItemStatus, ALREADY_SYNCED, COMPLETED, FAILED_SKIPPED, IN_PROGRESS, PENDING, StreamManifest, StreamManifestItem (+1 more)

### Community 11 - "SafVaultManager.kt"
Cohesion: 0.19
Nodes (3): SafVaultFolders, SafVaultManager, ShareTargetActivity

### Community 12 - "OnboardingWizardScreen.kt"
Cohesion: 0.10
Nodes (3): getDefaultSchoolAppList(), launchAccountPicker(), queryInstalledLauncherApps()

### Community 13 - "GoogleDriveClient.kt"
Cohesion: 0.09
Nodes (8): ChannelVaultFolders, DriveQuotaInfo, 5-Point Cloud Health Probe, Google Credential Manager API, Memory Boundary Privacy Filter, K.I.D.S. Android Collector (PRD), Sequential 4-Step Onboarding, Streaming PdfRenderer OCR

### Community 14 - "MainActivity.kt"
Cohesion: 0.12
Nodes (8): ChildCard(), ChildrenGridDashboard(), AppScreen, DASHBOARD, DIAGNOSTICS, WIZARD, MainActivity, KidsTheme()

### Community 16 - "GestureDescription"
Cohesion: 0.13
Nodes (5): GestureResultCallback, GestureResultCallback, GestureResultCallback, GestureResultCallback, GestureResultCallback

### Community 20 - "KotlinGraphifyEngine.kt"
Cohesion: 0.22
Nodes (7): GraphEdge, GraphNode, KnowledgeGraph, KotlinGraphifyEngine, Attachment, Notice, KnowledgeGraphBuilderTest

### Community 23 - "ContentCategory"
Cohesion: 0.15
Nodes (8): ContentClassifier, ContentCategory, ATTENDANCE, CIRCULAR, FEES, HOMEWORK, UNKNOWN, ContentClassifierTest

### Community 24 - "OnboardingWizardScreen"
Cohesion: 0.30
Nodes (3): PermissionHelper, PermissionSetupDialog(), OnboardingWizardScreen()

### Community 26 - "Entities.kt"
Cohesion: 0.15
Nodes (5): AttachmentEntity, ChildProfileEntity, NoticeFtsEntity, Converters, ChannelConfig

### Community 28 - ".parse"
Cohesion: 0.24
Nodes (3): ClassroomDateParser, ParsedDate, ClassroomDateParserTest

### Community 29 - "WhatsAppChatExportParser.kt"
Cohesion: 0.16
Nodes (4): ImportedNoticeRecord, WhatsAppChatExportParser, WhatsAppChatExportParserTest, Dual WhatsApp Catch-Up Engine

### Community 30 - "Models.kt"
Cohesion: 0.14
Nodes (12): ChannelType, FILE_IMPORT, GOOGLE_CLASSROOM, SCHOOL_ERP, WHATSAPP, CloudHealthReport, ProbeItem, SyncStatus (+4 more)

### Community 31 - "NotificationParserTest.kt"
Cohesion: 0.20
Nodes (3): NotificationParser, ParsedNotification, NotificationParserTest

### Community 34 - "ChildProfile"
Cohesion: 0.27
Nodes (3): ChildProfile, MultiChildRouter, MultiChildAttributionTest

### Community 35 - "DriveDeepLogger.kt"
Cohesion: 0.24
Nodes (5): DeviceInfo, DiagnosticSnapshot, DriveDeepLogger, PipelineMetrics, StepStatus

### Community 40 - "WizardStep"
Cohesion: 0.33
Nodes (6): WizardStep, STEP_0_PERMISSIONS, STEP_1_VAULT, STEP_2_CLASSROOM, STEP_3_PORTALS, STEP_4_WHATSAPP

## Knowledge Gaps
- **36 isolated node(s):** `AttachmentEntity`, `ChildProfileEntity`, `NoticeFtsEntity`, `CloudHealthReport`, `DeviceInfo` (+31 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 231 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **51 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `KidsAccessibilityService` connect `KidsAccessibilityService` to `assertthat`, `DeduplicationEngine`, `Intent`, `KidsAccessibilityService.kt`, `FloatingCrawlerOverlay`, `OnboardingWizardScreen.kt`, `MainActivity.kt`, `FloatingCrawlerOverlay.kt`, `ContentCategory`?**
  _High betweenness centrality (0.264) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `GoogleDriveSharedHarvester` (e.g. with `.runDeepCrawlLoop()` and `.startDirectDriveHarvest()`) actually correct?**
  _`GoogleDriveSharedHarvester` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `AttachmentEntity`, `ChildProfileEntity`, `NoticeFtsEntity` to the rest of the system?**
  _36 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `KidsAccessibilityService` be split into smaller, more focused modules?**
  _Cohesion score 0.05939324882495371 - nodes in this community are weakly interconnected._
- **Why does `GoogleDriveSharedHarvester` connect `GoogleDriveSharedHarvester` to `KidsAccessibilityService.kt`, `KidsAccessibilityService`, `DriveAttachmentMatcherTest`, `DriveVaultManager.kt`?**
  _High betweenness centrality (0.118) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `KidsAccessibilityService` (e.g. with `ContentClassifier` and `DeduplicationEngine`) actually correct?**
  _`KidsAccessibilityService` has 3 INFERRED edges - model-reasoned connections that need verification._
- **Should `GoogleDriveSharedHarvester` be split into smaller, more focused modules?**
  _Cohesion score 0.06722558608911659 - nodes in this community are weakly interconnected._