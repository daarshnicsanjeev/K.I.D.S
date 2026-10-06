# Graph Report - K.I.D.S  (2026-10-06)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 1170 nodes · 3061 edges · 76 communities (23 shown, 53 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 38 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `9e2782b3`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- KidsAccessibilityService
- GoogleDriveSharedHarvester
- GoogleDriveClient
- Query
- ci_watch.py
- DriveAttachmentMatcherTest
- KidsAccessibilityService.kt
- CrawlerTraceLogger
- GoogleDriveSearchHarvester
- InternalAppDiagnosticsMirror.kt
- ChildrenGridDashboard.kt
- FloatingCrawlerOverlay.kt
- OnboardingWizardScreen.kt
- .processSingleUri
- MainActivity.kt
- GestureDescription
- FloatingCrawlerOverlay
- AttachmentChipMatcherTest
- Test
- KotlinGraphifyEngine.kt
- ContentCategory
- .mirrorAllInternalDataToDrive
- Entities.kt
- StreamManifest
- NotificationParserTest.kt
- .findMatchingNoticeForAttachment
- OnboardingWizardScreen
- MLKitOcrParser.kt
- .parse
- WhatsAppChatExportParser.kt
- Models.kt
- assertthat
- PrivacyFilterTest
- ChildProfile
- log
- K.I.D.S. Android Collector (PRD)
- StreamItemStatus
- .fallbackNativeScrollBackward
- WizardStep
- GestureResultCallback

## God Nodes (most connected - your core abstractions)
1. `KidsAccessibilityService` - 131 edges
2. `GoogleDriveSharedHarvester` - 125 edges
3. `FloatingCrawlerOverlay` - 44 edges
4. `GoogleDriveClient` - 38 edges
5. `GoogleDriveSearchHarvester` - 36 edges
6. `StreamManifest` - 29 edges
7. `OnboardingWizardScreen()` - 24 edges
8. `DriveVaultManager` - 23 edges
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
- `ShareTargetActivity` --calls--> `DeduplicationEngine`  [INFERRED]
  app/src/main/java/com/kids/collector/presentation/share/ShareTargetActivity.kt → app/src/main/java/com/kids/collector/domain/dedupe/DeduplicationEngine.kt

## Import Cycles
- None detected.

## Communities (76 total, 53 thin omitted)

### Community 0 - "KidsAccessibilityService"
Cohesion: 0.06
Nodes (5): NoticeEntity, ExtractedAttachmentDetail, KidsAccessibilityService, UnvisitedCard, VisiblePendingCard

### Community 2 - "GoogleDriveClient"
Cohesion: 0.06
Nodes (11): DriveVaultManager, Failure, ProvisionStep1Result, Success, UserConsentRequired, ChannelVaultFolders, ChildVaultFolders, DriveQuotaInfo (+3 more)

### Community 3 - "Query"
Cohesion: 0.06
Nodes (4): AttachmentDao, ChildProfileDao, NoticeDao, KidsDatabase

### Community 4 - "ci_watch.py"
Cohesion: 0.09
Nodes (19): diagnose_failure(), get_latest_run(), main(), monitor_workflow(), run_cmd(), sync_local_graph(), verify_release(), dump_ui_xml() (+11 more)

### Community 6 - "KidsAccessibilityService.kt"
Cohesion: 0.08
Nodes (3): DownloadFolderObserver, DeduplicationEngine, KidsNotificationListenerService

### Community 7 - "CrawlerTraceLogger"
Cohesion: 0.07
Nodes (4): CrawlerTraceLogger, DriveSyncWorker, DiagnosticSnapshot, DriveDeepLogger

### Community 9 - "InternalAppDiagnosticsMirror.kt"
Cohesion: 0.08
Nodes (3): DeviceInfo, PipelineMetrics, StepStatus

### Community 12 - "OnboardingWizardScreen.kt"
Cohesion: 0.10
Nodes (3): getDefaultSchoolAppList(), launchAccountPicker(), queryInstalledLauncherApps()

### Community 13 - ".processSingleUri"
Cohesion: 0.21
Nodes (3): SafVaultFolders, SafVaultManager, ShareTargetActivity

### Community 14 - "MainActivity.kt"
Cohesion: 0.12
Nodes (8): ChildCard(), ChildrenGridDashboard(), AppScreen, DASHBOARD, DIAGNOSTICS, WIZARD, MainActivity, KidsTheme()

### Community 15 - "GestureDescription"
Cohesion: 0.15
Nodes (5): GestureResultCallback, GestureResultCallback, GestureResultCallback, GestureResultCallback, GestureResultCallback

### Community 19 - "KotlinGraphifyEngine.kt"
Cohesion: 0.22
Nodes (7): GraphEdge, GraphNode, KnowledgeGraph, KotlinGraphifyEngine, Attachment, Notice, KnowledgeGraphBuilderTest

### Community 21 - "ContentCategory"
Cohesion: 0.15
Nodes (8): ContentClassifier, ContentCategory, ATTENDANCE, CIRCULAR, FEES, HOMEWORK, UNKNOWN, ContentClassifierTest

### Community 23 - "Entities.kt"
Cohesion: 0.15
Nodes (5): AttachmentEntity, ChildProfileEntity, NoticeFtsEntity, Converters, ChannelConfig

### Community 25 - "NotificationParserTest.kt"
Cohesion: 0.19
Nodes (3): NotificationParser, ParsedNotification, NotificationParserTest

### Community 27 - "OnboardingWizardScreen"
Cohesion: 0.33
Nodes (3): PermissionHelper, PermissionSetupDialog(), OnboardingWizardScreen()

### Community 29 - ".parse"
Cohesion: 0.24
Nodes (3): ClassroomDateParser, ParsedDate, ClassroomDateParserTest

### Community 30 - "WhatsAppChatExportParser.kt"
Cohesion: 0.16
Nodes (4): ImportedNoticeRecord, WhatsAppChatExportParser, WhatsAppChatExportParserTest, Dual WhatsApp Catch-Up Engine

### Community 31 - "Models.kt"
Cohesion: 0.14
Nodes (12): ChannelType, FILE_IMPORT, GOOGLE_CLASSROOM, SCHOOL_ERP, WHATSAPP, CloudHealthReport, ProbeItem, SyncStatus (+4 more)

### Community 35 - "ChildProfile"
Cohesion: 0.27
Nodes (3): ChildProfile, MultiChildRouter, MultiChildAttributionTest

### Community 37 - "K.I.D.S. Android Collector (PRD)"
Cohesion: 0.22
Nodes (6): 5-Point Cloud Health Probe, Google Credential Manager API, Memory Boundary Privacy Filter, K.I.D.S. Android Collector (PRD), Sequential 4-Step Onboarding, Streaming PdfRenderer OCR

### Community 38 - "StreamItemStatus"
Cohesion: 0.22
Nodes (6): StreamItemStatus, ALREADY_SYNCED, COMPLETED, FAILED_SKIPPED, IN_PROGRESS, PENDING

### Community 41 - "WizardStep"
Cohesion: 0.33
Nodes (6): WizardStep, STEP_0_PERMISSIONS, STEP_1_VAULT, STEP_2_CLASSROOM, STEP_3_PORTALS, STEP_4_WHATSAPP

## Knowledge Gaps
- **35 isolated node(s):** `ChildProfileEntity`, `NoticeFtsEntity`, `CloudHealthReport`, `DeviceInfo`, `PipelineMetrics` (+30 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 233 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **53 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `KidsAccessibilityService` connect `KidsAccessibilityService` to `KidsAccessibilityService.kt`, `FloatingCrawlerOverlay.kt`, `OnboardingWizardScreen.kt`, `MainActivity.kt`, `FloatingCrawlerOverlay`, `AttachmentChipMatcherTest`, `ContentCategory`?**
  _High betweenness centrality (0.248) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `KidsAccessibilityService` (e.g. with `ContentClassifier` and `DeduplicationEngine`) actually correct?**
  _`KidsAccessibilityService` has 3 INFERRED edges - model-reasoned connections that need verification._
- **What connects `ChildProfileEntity`, `NoticeFtsEntity`, `CloudHealthReport` to the rest of the system?**
  _35 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `KidsAccessibilityService` be split into smaller, more focused modules?**
  _Cohesion score 0.057566220823498555 - nodes in this community are weakly interconnected._
- **Why does `KidsDatabase` connect `Query` to `KidsAccessibilityService`?**
  _High betweenness centrality (0.122) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `GoogleDriveSharedHarvester` (e.g. with `.runDeepCrawlLoop()` and `.startDirectDriveHarvest()`) actually correct?**
  _`GoogleDriveSharedHarvester` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Should `GoogleDriveSharedHarvester` be split into smaller, more focused modules?**
  _Cohesion score 0.07031484257871065 - nodes in this community are weakly interconnected._