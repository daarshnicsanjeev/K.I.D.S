# Graph Report - K.I.D.S  (2026-10-05)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 1131 nodes · 2969 edges · 64 communities (21 shown, 43 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 35 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `9ae304fd`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- GoogleDriveSharedHarvester
- KidsAccessibilityService
- GoogleDriveClient
- FloatingCrawlerOverlay
- Query
- .matchesAttachmentChipText
- ci_watch.py
- StreamManifest
- DriveAttachmentMatcherTest
- GoogleDriveClient.kt
- KidsAccessibilityService.kt
- GoogleDriveSearchHarvester
- .processSingleUri
- ChildrenGridDashboard.kt
- OnboardingWizardScreen.kt
- DriveSyncWorker.kt
- InternalAppDiagnosticsMirror.kt
- MainActivity.kt
- DriveVaultManager.kt
- KotlinGraphifyEngine.kt
- OnboardingWizardScreen
- .mirrorAllInternalDataToDrive
- MLKitOcrParser.kt
- .parse
- Models.kt
- ChildProfile
- DriveDeepLogger.kt
- Entities.kt
- ChannelConfig
- Intent
- DeduplicationEngine
- ContentCategory
- WizardStep
- AppScreen
- GestureResultCallback

## God Nodes (most connected - your core abstractions)
1. `GoogleDriveSharedHarvester` - 125 edges
2. `KidsAccessibilityService` - 121 edges
3. `FloatingCrawlerOverlay` - 45 edges
4. `GoogleDriveClient` - 39 edges
5. `GoogleDriveSearchHarvester` - 36 edges
6. `DriveVaultManager` - 25 edges
7. `OnboardingWizardScreen()` - 25 edges
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
- `ShareTargetActivity` --calls--> `DeduplicationEngine`  [INFERRED]
  app/src/main/java/com/kids/collector/presentation/share/ShareTargetActivity.kt → app/src/main/java/com/kids/collector/domain/dedupe/DeduplicationEngine.kt
- `DriveSyncWorker` --calls--> `KotlinGraphifyEngine`  [INFERRED]
  app/src/main/java/com/kids/collector/service/DriveSyncWorker.kt → app/src/main/java/com/kids/collector/domain/graph/KotlinGraphifyEngine.kt

## Import Cycles
- None detected.

## Communities (64 total, 43 thin omitted)

### Community 1 - "KidsAccessibilityService"
Cohesion: 0.06
Nodes (4): ExtractedAttachmentDetail, KidsAccessibilityService, UnvisitedCard, VisiblePendingCard

### Community 2 - "GoogleDriveClient"
Cohesion: 0.06
Nodes (10): DriveVaultManager, Failure, ProvisionStep1Result, Success, UserConsentRequired, ChildVaultFolders, GoogleDriveClient, DiagnosticFeedScreen() (+2 more)

### Community 3 - "FloatingCrawlerOverlay"
Cohesion: 0.05
Nodes (7): FloatingCrawlerOverlay, GestureResultCallback, GestureResultCallback, GestureResultCallback, GestureResultCallback, GestureResultCallback, GestureResultCallback

### Community 4 - "Query"
Cohesion: 0.06
Nodes (4): AttachmentDao, ChildProfileDao, NoticeDao, KidsDatabase

### Community 5 - ".matchesAttachmentChipText"
Cohesion: 0.05
Nodes (8): PrivacyFilter, NotificationParser, ParsedNotification, AttachmentChipMatcherTest, ContentClassifierTest, DeduplicationHashTest, NotificationParserTest, PrivacyFilterTest

### Community 6 - "ci_watch.py"
Cohesion: 0.09
Nodes (19): diagnose_failure(), get_latest_run(), main(), monitor_workflow(), run_cmd(), sync_local_graph(), verify_release(), dump_ui_xml() (+11 more)

### Community 7 - "StreamManifest"
Cohesion: 0.09
Nodes (9): StreamItemStatus, ALREADY_SYNCED, COMPLETED, FAILED_SKIPPED, IN_PROGRESS, PENDING, StreamManifest, StreamManifestItem (+1 more)

### Community 9 - "GoogleDriveClient.kt"
Cohesion: 0.06
Nodes (12): ChannelVaultFolders, DriveQuotaInfo, ImportedNoticeRecord, WhatsAppChatExportParser, WhatsAppChatExportParserTest, Dual WhatsApp Catch-Up Engine, 5-Point Cloud Health Probe, Google Credential Manager API (+4 more)

### Community 12 - ".processSingleUri"
Cohesion: 0.17
Nodes (3): SafVaultFolders, SafVaultManager, ShareTargetActivity

### Community 14 - "OnboardingWizardScreen.kt"
Cohesion: 0.10
Nodes (3): getDefaultSchoolAppList(), launchAccountPicker(), queryInstalledLauncherApps()

### Community 17 - "MainActivity.kt"
Cohesion: 0.15
Nodes (4): ChildCard(), ChildrenGridDashboard(), MainActivity, KidsTheme()

### Community 20 - "KotlinGraphifyEngine.kt"
Cohesion: 0.22
Nodes (7): GraphEdge, GraphNode, KnowledgeGraph, KotlinGraphifyEngine, Attachment, Notice, KnowledgeGraphBuilderTest

### Community 21 - "OnboardingWizardScreen"
Cohesion: 0.30
Nodes (3): PermissionHelper, PermissionSetupDialog(), OnboardingWizardScreen()

### Community 24 - ".parse"
Cohesion: 0.24
Nodes (3): ClassroomDateParser, ParsedDate, ClassroomDateParserTest

### Community 25 - "Models.kt"
Cohesion: 0.14
Nodes (12): ChannelType, FILE_IMPORT, GOOGLE_CLASSROOM, SCHOOL_ERP, WHATSAPP, CloudHealthReport, ProbeItem, SyncStatus (+4 more)

### Community 26 - "ChildProfile"
Cohesion: 0.26
Nodes (3): ChildProfile, MultiChildRouter, MultiChildAttributionTest

### Community 27 - "DriveDeepLogger.kt"
Cohesion: 0.24
Nodes (5): DeviceInfo, DiagnosticSnapshot, DriveDeepLogger, PipelineMetrics, StepStatus

### Community 28 - "Entities.kt"
Cohesion: 0.22
Nodes (4): AttachmentEntity, ChildProfileEntity, NoticeEntity, NoticeFtsEntity

### Community 33 - "ContentCategory"
Cohesion: 0.33
Nodes (6): ContentCategory, ATTENDANCE, CIRCULAR, FEES, HOMEWORK, UNKNOWN

### Community 34 - "WizardStep"
Cohesion: 0.33
Nodes (6): WizardStep, STEP_0_PERMISSIONS, STEP_1_VAULT, STEP_2_CLASSROOM, STEP_3_PORTALS, STEP_4_WHATSAPP

### Community 35 - "AppScreen"
Cohesion: 0.50
Nodes (4): AppScreen, DASHBOARD, DIAGNOSTICS, WIZARD

## Knowledge Gaps
- **36 isolated node(s):** `CloudHealthReport`, `DeviceInfo`, `PipelineMetrics`, `StepStatus`, `AttachmentEntity` (+31 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 231 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **43 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `KidsAccessibilityService` connect `KidsAccessibilityService` to `DeduplicationEngine`, `FloatingCrawlerOverlay`, `.matchesAttachmentChipText`, `KidsAccessibilityService.kt`, `.processSingleUri`, `OnboardingWizardScreen.kt`, `MainActivity.kt`, `GoogleDriveSharedHarvester.kt`, `ChildProfile`, `Intent`?**
  _High betweenness centrality (0.205) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `GoogleDriveSharedHarvester` (e.g. with `.runDeepCrawlLoop()` and `.startDirectDriveHarvest()`) actually correct?**
  _`GoogleDriveSharedHarvester` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `CloudHealthReport`, `DeviceInfo`, `PipelineMetrics` to the rest of the system?**
  _36 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `GoogleDriveSharedHarvester` be split into smaller, more focused modules?**
  _Cohesion score 0.06793904002278878 - nodes in this community are weakly interconnected._
- **Why does `GoogleDriveSharedHarvester` connect `GoogleDriveSharedHarvester` to `KidsAccessibilityService`, `FloatingCrawlerOverlay`, `DriveAttachmentMatcherTest`, `KidsAccessibilityService.kt`, `GoogleDriveSharedHarvester.kt`?**
  _High betweenness centrality (0.191) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `KidsAccessibilityService` (e.g. with `ContentClassifier` and `DeduplicationEngine`) actually correct?**
  _`KidsAccessibilityService` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Should `KidsAccessibilityService` be split into smaller, more focused modules?**
  _Cohesion score 0.06101949025487256 - nodes in this community are weakly interconnected._