# Graph Report - K.I.D.S  (2026-10-06)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 1170 nodes · 3073 edges · 79 communities (23 shown, 56 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 37 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `45650725`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- KidsAccessibilityService
- GoogleDriveSharedHarvester
- GoogleDriveClient
- Query
- ci_watch.py
- OnboardingWizardScreen.kt
- DriveAttachmentMatcherTest
- CrawlerTraceLogger
- GoogleDriveSearchHarvester
- FloatingCrawlerOverlay.kt
- InternalAppDiagnosticsMirror.kt
- DriveVaultManager.kt
- assertthat
- OnboardingWizardScreen
- GestureDescription
- Test
- KotlinGraphifyEngine.kt
- MainActivity.kt
- FloatingCrawlerOverlay
- AttachmentChipMatcherTest
- .findMatchingNoticeForAttachment
- ContentCategory
- .mirrorAllInternalDataToDrive
- MLKitOcrParser.kt
- StreamManifest
- .parse
- Models.kt
- .processSingleUri
- NotificationParserTest.kt
- SafVaultManager.kt
- ChildProfile
- PermissionHelper.kt
- WhatsAppChatExportParserTest.kt
- Entities.kt
- K.I.D.S. Android Collector (PRD)
- StreamItemStatus
- DeduplicationEngine
- TypeConverters.kt
- .fallbackNativeScroll
- WizardStep
- log
- GestureResultCallback

## God Nodes (most connected - your core abstractions)
1. `KidsAccessibilityService` - 130 edges
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
- `DriveSyncWorker` --calls--> `KotlinGraphifyEngine`  [INFERRED]
  app/src/main/java/com/kids/collector/service/DriveSyncWorker.kt → app/src/main/java/com/kids/collector/domain/graph/KotlinGraphifyEngine.kt

## Import Cycles
- None detected.

## Communities (79 total, 56 thin omitted)

### Community 0 - "KidsAccessibilityService"
Cohesion: 0.06
Nodes (4): ExtractedAttachmentDetail, KidsAccessibilityService, UnvisitedCard, VisiblePendingCard

### Community 2 - "GoogleDriveClient"
Cohesion: 0.06
Nodes (11): DriveVaultManager, Failure, ProvisionStep1Result, Success, UserConsentRequired, ChannelVaultFolders, ChildVaultFolders, DriveQuotaInfo (+3 more)

### Community 3 - "Query"
Cohesion: 0.06
Nodes (4): AttachmentDao, ChildProfileDao, NoticeDao, KidsDatabase

### Community 4 - "ci_watch.py"
Cohesion: 0.09
Nodes (19): diagnose_failure(), get_latest_run(), main(), monitor_workflow(), run_cmd(), sync_local_graph(), verify_release(), dump_ui_xml() (+11 more)

### Community 5 - "OnboardingWizardScreen.kt"
Cohesion: 0.07
Nodes (3): LogLine, getDefaultSchoolAppList(), queryInstalledLauncherApps()

### Community 7 - "CrawlerTraceLogger"
Cohesion: 0.07
Nodes (4): CrawlerTraceLogger, DriveSyncWorker, DiagnosticSnapshot, DriveDeepLogger

### Community 11 - "InternalAppDiagnosticsMirror.kt"
Cohesion: 0.11
Nodes (3): DeviceInfo, PipelineMetrics, StepStatus

### Community 13 - "assertthat"
Cohesion: 0.11
Nodes (3): PrivacyFilter, DeduplicationHashTest, PrivacyFilterTest

### Community 14 - "OnboardingWizardScreen"
Cohesion: 0.21
Nodes (4): PermissionHelper, PermissionSetupDialog(), KidsTheme(), OnboardingWizardScreen()

### Community 15 - "GestureDescription"
Cohesion: 0.15
Nodes (5): GestureResultCallback, GestureResultCallback, GestureResultCallback, GestureResultCallback, GestureResultCallback

### Community 17 - "KotlinGraphifyEngine.kt"
Cohesion: 0.22
Nodes (7): GraphEdge, GraphNode, KnowledgeGraph, KotlinGraphifyEngine, Attachment, Notice, KnowledgeGraphBuilderTest

### Community 18 - "MainActivity.kt"
Cohesion: 0.14
Nodes (7): ChildCard(), ChildrenGridDashboard(), AppScreen, DASHBOARD, DIAGNOSTICS, WIZARD, MainActivity

### Community 22 - "ContentCategory"
Cohesion: 0.15
Nodes (8): ContentClassifier, ContentCategory, ATTENDANCE, CIRCULAR, FEES, HOMEWORK, UNKNOWN, ContentClassifierTest

### Community 26 - ".parse"
Cohesion: 0.24
Nodes (3): ClassroomDateParser, ParsedDate, ClassroomDateParserTest

### Community 27 - "Models.kt"
Cohesion: 0.14
Nodes (12): ChannelType, FILE_IMPORT, GOOGLE_CLASSROOM, SCHOOL_ERP, WHATSAPP, CloudHealthReport, ProbeItem, SyncStatus (+4 more)

### Community 29 - "NotificationParserTest.kt"
Cohesion: 0.22
Nodes (3): NotificationParser, ParsedNotification, NotificationParserTest

### Community 32 - "ChildProfile"
Cohesion: 0.26
Nodes (3): ChildProfile, MultiChildRouter, MultiChildAttributionTest

### Community 34 - "WhatsAppChatExportParserTest.kt"
Cohesion: 0.22
Nodes (3): ImportedNoticeRecord, WhatsAppChatExportParser, WhatsAppChatExportParserTest

### Community 35 - "Entities.kt"
Cohesion: 0.42
Nodes (4): AttachmentEntity, ChildProfileEntity, NoticeEntity, NoticeFtsEntity

### Community 36 - "K.I.D.S. Android Collector (PRD)"
Cohesion: 0.22
Nodes (6): 5-Point Cloud Health Probe, Google Credential Manager API, Memory Boundary Privacy Filter, K.I.D.S. Android Collector (PRD), Sequential 4-Step Onboarding, Streaming PdfRenderer OCR

### Community 37 - "StreamItemStatus"
Cohesion: 0.22
Nodes (6): StreamItemStatus, ALREADY_SYNCED, COMPLETED, FAILED_SKIPPED, IN_PROGRESS, PENDING

### Community 39 - "DeduplicationEngine"
Cohesion: 0.29
Nodes (3): DownloadFolderObserver, DeduplicationEngine, KidsNotificationListenerService

### Community 42 - "WizardStep"
Cohesion: 0.33
Nodes (6): WizardStep, STEP_0_PERMISSIONS, STEP_1_VAULT, STEP_2_CLASSROOM, STEP_3_PORTALS, STEP_4_WHATSAPP

## Knowledge Gaps
- **33 isolated node(s):** `DeviceInfo`, `PipelineMetrics`, `StepStatus`, `CloudHealthReport`, `DASHBOARD` (+28 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 230 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **56 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `KidsAccessibilityService` connect `KidsAccessibilityService` to `ChildProfile`, `GoogleDriveSharedHarvester`, `DeduplicationEngine`, `KidsAccessibilityService.kt`, `FloatingCrawlerOverlay.kt`, `assertthat`, `MainActivity.kt`, `FloatingCrawlerOverlay`, `ContentCategory`?**
  _High betweenness centrality (0.231) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `KidsAccessibilityService` (e.g. with `ContentClassifier` and `DeduplicationEngine`) actually correct?**
  _`KidsAccessibilityService` has 3 INFERRED edges - model-reasoned connections that need verification._
- **What connects `DeviceInfo`, `PipelineMetrics`, `StepStatus` to the rest of the system?**
  _33 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `KidsAccessibilityService` be split into smaller, more focused modules?**
  _Cohesion score 0.05797680927628948 - nodes in this community are weakly interconnected._
- **Why does `KidsDatabase` connect `Query` to `KidsAccessibilityService`?**
  _High betweenness centrality (0.140) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `GoogleDriveSharedHarvester` (e.g. with `.runDeepCrawlLoop()` and `.startDirectDriveHarvest()`) actually correct?**
  _`GoogleDriveSharedHarvester` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Should `GoogleDriveSharedHarvester` be split into smaller, more focused modules?**
  _Cohesion score 0.0662534435261708 - nodes in this community are weakly interconnected._