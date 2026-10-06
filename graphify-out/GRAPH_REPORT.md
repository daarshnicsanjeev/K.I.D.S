# Graph Report - K.I.D.S  (2026-10-06)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 1144 nodes · 2971 edges · 79 communities (22 shown, 57 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 37 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `fb3d0dfe`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- GoogleDriveSharedHarvester
- KidsAccessibilityService
- Query
- CrawlerTraceLogger
- ci_watch.py
- StreamManifest
- MLKitOcrParser.kt
- GoogleDriveSearchHarvester
- DriveAttachmentMatcherTest
- GoogleDriveClient
- SafVaultManager.kt
- FloatingCrawlerOverlay.kt
- DriveVaultManager
- OnboardingWizardScreen
- GestureDescription
- OnboardingWizardScreen.kt
- CrawlerTraceLogger.kt
- KotlinGraphifyEngine.kt
- FloatingCrawlerOverlay
- AttachmentChipMatcherTest
- ChildrenGridDashboard.kt
- .mirrorAllInternalDataToDrive
- ContentCategory
- .parse
- Models.kt
- DeduplicationEngine
- PrivacyFilterTest
- assertthat
- .provisionStep1
- ChildProfile
- MainActivity.kt
- dispatchers
- log
- .fallbackNativeScrollBackward
- WizardStep
- ChildrenGridDashboard
- KidsTheme.kt
- GestureResultCallback

## God Nodes (most connected - your core abstractions)
1. `GoogleDriveSharedHarvester` - 126 edges
2. `KidsAccessibilityService` - 124 edges
3. `FloatingCrawlerOverlay` - 45 edges
4. `GoogleDriveClient` - 39 edges
5. `GoogleDriveSearchHarvester` - 36 edges
6. `OnboardingWizardScreen()` - 25 edges
7. `DriveVaultManager` - 24 edges
8. `CrawlerTraceLogger` - 24 edges
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

## Communities (79 total, 57 thin omitted)

### Community 1 - "KidsAccessibilityService"
Cohesion: 0.06
Nodes (5): NoticeEntity, ExtractedAttachmentDetail, KidsAccessibilityService, UnvisitedCard, VisiblePendingCard

### Community 2 - "Query"
Cohesion: 0.06
Nodes (4): AttachmentDao, ChildProfileDao, NoticeDao, KidsDatabase

### Community 3 - "CrawlerTraceLogger"
Cohesion: 0.05
Nodes (8): AttachmentEntity, ChildProfileEntity, NoticeFtsEntity, Converters, ChannelConfig, KidsApplication, CrawlerTraceLogger, DriveSyncWorker

### Community 4 - "ci_watch.py"
Cohesion: 0.09
Nodes (19): diagnose_failure(), get_latest_run(), main(), monitor_workflow(), run_cmd(), sync_local_graph(), verify_release(), dump_ui_xml() (+11 more)

### Community 5 - "StreamManifest"
Cohesion: 0.09
Nodes (9): StreamItemStatus, ALREADY_SYNCED, COMPLETED, FAILED_SKIPPED, IN_PROGRESS, PENDING, StreamManifest, StreamManifestItem (+1 more)

### Community 6 - "MLKitOcrParser.kt"
Cohesion: 0.07
Nodes (11): MLKitOcrParser, OcrExtractionResult, NotificationParser, ParsedNotification, NotificationParserTest, 5-Point Cloud Health Probe, Google Credential Manager API, Memory Boundary Privacy Filter (+3 more)

### Community 9 - "GoogleDriveClient"
Cohesion: 0.13
Nodes (3): ChannelVaultFolders, DriveQuotaInfo, GoogleDriveClient

### Community 11 - "SafVaultManager.kt"
Cohesion: 0.19
Nodes (3): SafVaultFolders, SafVaultManager, ShareTargetActivity

### Community 14 - "OnboardingWizardScreen"
Cohesion: 0.20
Nodes (4): PermissionHelper, PermissionSetupDialog(), DiagnosticFeedScreen(), OnboardingWizardScreen()

### Community 15 - "GestureDescription"
Cohesion: 0.15
Nodes (5): GestureResultCallback, GestureResultCallback, GestureResultCallback, GestureResultCallback, GestureResultCallback

### Community 16 - "OnboardingWizardScreen.kt"
Cohesion: 0.12
Nodes (3): getDefaultSchoolAppList(), launchAccountPicker(), queryInstalledLauncherApps()

### Community 17 - "CrawlerTraceLogger.kt"
Cohesion: 0.12
Nodes (6): DeviceInfo, DiagnosticSnapshot, DriveDeepLogger, PipelineMetrics, StepStatus, Dual WhatsApp Catch-Up Engine

### Community 20 - "KotlinGraphifyEngine.kt"
Cohesion: 0.22
Nodes (7): GraphEdge, GraphNode, KnowledgeGraph, KotlinGraphifyEngine, Attachment, Notice, KnowledgeGraphBuilderTest

### Community 25 - "ContentCategory"
Cohesion: 0.15
Nodes (8): ContentClassifier, ContentCategory, ATTENDANCE, CIRCULAR, FEES, HOMEWORK, UNKNOWN, ContentClassifierTest

### Community 26 - ".parse"
Cohesion: 0.24
Nodes (3): ClassroomDateParser, ParsedDate, ClassroomDateParserTest

### Community 27 - "Models.kt"
Cohesion: 0.14
Nodes (12): ChannelType, FILE_IMPORT, GOOGLE_CLASSROOM, SCHOOL_ERP, WHATSAPP, CloudHealthReport, ProbeItem, SyncStatus (+4 more)

### Community 28 - "DeduplicationEngine"
Cohesion: 0.18
Nodes (3): DeduplicationEngine, KidsNotificationListenerService, DeduplicationHashTest

### Community 30 - "assertthat"
Cohesion: 0.18
Nodes (3): ImportedNoticeRecord, WhatsAppChatExportParser, WhatsAppChatExportParserTest

### Community 32 - ".provisionStep1"
Cohesion: 0.24
Nodes (5): Failure, ProvisionStep1Result, Success, UserConsentRequired, DriveVaultManagerTest

### Community 33 - "ChildProfile"
Cohesion: 0.24
Nodes (3): ChildProfile, MultiChildRouter, MultiChildAttributionTest

### Community 34 - "MainActivity.kt"
Cohesion: 0.20
Nodes (5): AppScreen, DASHBOARD, DIAGNOSTICS, WIZARD, MainActivity

### Community 41 - "WizardStep"
Cohesion: 0.33
Nodes (6): WizardStep, STEP_0_PERMISSIONS, STEP_1_VAULT, STEP_2_CLASSROOM, STEP_3_PORTALS, STEP_4_WHATSAPP

## Knowledge Gaps
- **35 isolated node(s):** `DeviceInfo`, `PipelineMetrics`, `StepStatus`, `CloudHealthReport`, `AttachmentEntity` (+30 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 232 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **57 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `KidsAccessibilityService` connect `KidsAccessibilityService` to `MainActivity.kt`, `log`, `KidsAccessibilityService.kt`, `FloatingCrawlerOverlay.kt`, `OnboardingWizardScreen.kt`, `DriveVaultManager.kt`, `FloatingCrawlerOverlay`, `ContentCategory`, `DeduplicationEngine`, `assertthat`?**
  _High betweenness centrality (0.242) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `GoogleDriveSharedHarvester` (e.g. with `.runDeepCrawlLoop()` and `.startDirectDriveHarvest()`) actually correct?**
  _`GoogleDriveSharedHarvester` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `DeviceInfo`, `PipelineMetrics`, `StepStatus` to the rest of the system?**
  _35 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `GoogleDriveSharedHarvester` be split into smaller, more focused modules?**
  _Cohesion score 0.06666666666666667 - nodes in this community are weakly interconnected._
- **Why does `GoogleDriveSharedHarvester` connect `GoogleDriveSharedHarvester` to `DriveAttachmentMatcherTest`, `KidsAccessibilityService`, `KidsAccessibilityService.kt`, `DriveVaultManager.kt`?**
  _High betweenness centrality (0.180) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `KidsAccessibilityService` (e.g. with `ContentClassifier` and `DeduplicationEngine`) actually correct?**
  _`KidsAccessibilityService` has 3 INFERRED edges - model-reasoned connections that need verification._
- **Should `KidsAccessibilityService` be split into smaller, more focused modules?**
  _Cohesion score 0.05939324882495371 - nodes in this community are weakly interconnected._