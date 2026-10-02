# Graph Report - K.I.D.S  (2026-10-02)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 970 nodes · 2417 edges · 58 communities (21 shown, 37 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 37 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `07ba4ff5`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- KidsAccessibilityService
- GoogleDriveSharedHarvester
- FloatingCrawlerOverlay
- Test
- Query
- OnboardingWizardScreen
- StreamManifest
- MLKitOcrParser.kt
- GoogleDriveClient
- ContentCategory
- CrawlerTraceLogger
- ci_watch.py
- OnboardingWizardScreen.kt
- KotlinGraphifyEngine.kt
- .matchesAttachmentChipText
- ShareTargetActivity.kt
- Models.kt
- MainActivity.kt
- ChildProfile
- log
- DeduplicationEngine
- GestureDescription
- ChildProfile
- DriveDeepLogger.kt
- Entities.kt
- ChannelConfig
- Intent
- WizardStep

## God Nodes (most connected - your core abstractions)
1. `KidsAccessibilityService` - 110 edges
2. `GoogleDriveSharedHarvester` - 96 edges
3. `FloatingCrawlerOverlay` - 44 edges
4. `GoogleDriveClient` - 32 edges
5. `OnboardingWizardScreen()` - 25 edges
6. `DriveVaultManager` - 23 edges
7. `CrawlerTraceLogger` - 22 edges
8. `DriveAttachmentMatcherTest` - 22 edges
9. `ChildProfile` - 18 edges
10. `NoticeDao` - 18 edges

## Surprising Connections (you probably didn't know these)
- `DiagnosticFeedScreen()` --calls--> `ProbeItem`  [INFERRED]
  app/src/main/java/com/kids/collector/presentation/telemetry/DiagnosticFeedScreen.kt → app/src/main/java/com/kids/collector/domain/model/Models.kt
- `KidsAccessibilityService` --calls--> `ContentClassifier`  [INFERRED]
  app/src/main/java/com/kids/collector/service/KidsAccessibilityService.kt → app/src/main/java/com/kids/collector/domain/classifier/ContentClassifier.kt
- `KidsAccessibilityService` --calls--> `DeduplicationEngine`  [INFERRED]
  app/src/main/java/com/kids/collector/service/KidsAccessibilityService.kt → app/src/main/java/com/kids/collector/domain/dedupe/DeduplicationEngine.kt
- `DriveSyncWorker` --calls--> `KotlinGraphifyEngine`  [INFERRED]
  app/src/main/java/com/kids/collector/service/DriveSyncWorker.kt → app/src/main/java/com/kids/collector/domain/graph/KotlinGraphifyEngine.kt
- `DriveSyncWorker` --calls--> `DriveDeepLogger`  [INFERRED]
  app/src/main/java/com/kids/collector/service/DriveSyncWorker.kt → app/src/main/java/com/kids/collector/telemetry/DriveDeepLogger.kt

## Import Cycles
- None detected.

## Communities (58 total, 37 thin omitted)

### Community 0 - "KidsAccessibilityService"
Cohesion: 0.07
Nodes (5): NoticeEntity, ExtractedAttachmentDetail, KidsAccessibilityService, UnvisitedCard, VisiblePendingCard

### Community 2 - "FloatingCrawlerOverlay"
Cohesion: 0.06
Nodes (7): FloatingCrawlerOverlay, GestureResultCallback, GestureResultCallback, GestureResultCallback, GestureResultCallback, GestureResultCallback, GestureResultCallback

### Community 3 - "Test"
Cohesion: 0.06
Nodes (7): ClassroomDateParser, ParsedDate, NotificationParser, ParsedNotification, ClassroomDateParserTest, DriveAttachmentMatcherTest, NotificationParserTest

### Community 4 - "Query"
Cohesion: 0.07
Nodes (4): AttachmentDao, ChildProfileDao, NoticeDao, KidsDatabase

### Community 5 - "OnboardingWizardScreen"
Cohesion: 0.11
Nodes (11): DriveVaultManager, Failure, ProvisionStep1Result, Success, UserConsentRequired, PermissionHelper, PermissionSetupDialog(), DiagnosticFeedScreen() (+3 more)

### Community 6 - "StreamManifest"
Cohesion: 0.05
Nodes (11): PrivacyFilter, StreamItemStatus, ALREADY_SYNCED, COMPLETED, FAILED_SKIPPED, IN_PROGRESS, PENDING, StreamManifest (+3 more)

### Community 7 - "MLKitOcrParser.kt"
Cohesion: 0.08
Nodes (11): SafVaultFolders, SafVaultManager, MLKitOcrParser, OcrExtractionResult, ShareTargetActivity, 5-Point Cloud Health Probe, Google Credential Manager API, Memory Boundary Privacy Filter (+3 more)

### Community 8 - "GoogleDriveClient"
Cohesion: 0.08
Nodes (4): ChannelVaultFolders, ChildVaultFolders, DriveQuotaInfo, GoogleDriveClient

### Community 9 - "ContentCategory"
Cohesion: 0.08
Nodes (12): ContentClassifier, ImportedNoticeRecord, WhatsAppChatExportParser, ContentCategory, ATTENDANCE, CIRCULAR, FEES, HOMEWORK (+4 more)

### Community 10 - "CrawlerTraceLogger"
Cohesion: 0.10
Nodes (3): KidsApplication, CrawlerTraceLogger, DriveSyncWorker

### Community 11 - "ci_watch.py"
Cohesion: 0.12
Nodes (11): diagnose_failure(), get_latest_run(), main(), monitor_workflow(), run_cmd(), sync_local_graph(), verify_release(), check_file() (+3 more)

### Community 13 - "OnboardingWizardScreen.kt"
Cohesion: 0.11
Nodes (3): getDefaultSchoolAppList(), launchAccountPicker(), queryInstalledLauncherApps()

### Community 15 - "KotlinGraphifyEngine.kt"
Cohesion: 0.22
Nodes (7): GraphEdge, GraphNode, KnowledgeGraph, KotlinGraphifyEngine, Attachment, Notice, KnowledgeGraphBuilderTest

### Community 19 - "Models.kt"
Cohesion: 0.14
Nodes (12): ChannelType, FILE_IMPORT, GOOGLE_CLASSROOM, SCHOOL_ERP, WHATSAPP, CloudHealthReport, ProbeItem, SyncStatus (+4 more)

### Community 20 - "MainActivity.kt"
Cohesion: 0.16
Nodes (5): AppScreen, DASHBOARD, DIAGNOSTICS, WIZARD, MainActivity

### Community 21 - "ChildProfile"
Cohesion: 0.24
Nodes (3): ChildProfile, MultiChildRouter, MultiChildAttributionTest

### Community 25 - "GestureDescription"
Cohesion: 0.27
Nodes (3): GestureResultCallback, GestureResultCallback, GestureResultCallback

### Community 27 - "ChildProfile"
Cohesion: 0.28
Nodes (3): ChildCard(), ChildrenGridDashboard(), KidsTheme()

### Community 29 - "DriveDeepLogger.kt"
Cohesion: 0.28
Nodes (5): DeviceInfo, DiagnosticSnapshot, DriveDeepLogger, PipelineMetrics, StepStatus

### Community 30 - "Entities.kt"
Cohesion: 0.25
Nodes (3): AttachmentEntity, ChildProfileEntity, NoticeFtsEntity

### Community 33 - "WizardStep"
Cohesion: 0.33
Nodes (6): WizardStep, STEP_0_PERMISSIONS, STEP_1_VAULT, STEP_2_CLASSROOM, STEP_3_PORTALS, STEP_4_WHATSAPP

## Knowledge Gaps
- **35 isolated node(s):** `CloudHealthReport`, `DeviceInfo`, `PipelineMetrics`, `StepStatus`, `AttachmentEntity` (+30 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 224 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **37 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `KidsAccessibilityService` connect `KidsAccessibilityService` to `Intent`, `FloatingCrawlerOverlay`, `Test`, `OnboardingWizardScreen`, `ContentCategory`, `DriveVaultManager.kt`, `OnboardingWizardScreen.kt`, `KidsAccessibilityService.kt`, `.matchesAttachmentChipText`, `DeduplicationEngine`?**
  _High betweenness centrality (0.242) - this node is a cross-community bridge._
- **Why does `GoogleDriveSharedHarvester` connect `GoogleDriveSharedHarvester` to `KidsAccessibilityService`, `ShareTargetActivity.kt`, `Test`, `DriveVaultManager.kt`?**
  _High betweenness centrality (0.127) - this node is a cross-community bridge._
- **Why does `FloatingCrawlerOverlay` connect `FloatingCrawlerOverlay` to `KidsAccessibilityService`?**
  _High betweenness centrality (0.064) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `KidsAccessibilityService` (e.g. with `ContentClassifier` and `DeduplicationEngine`) actually correct?**
  _`KidsAccessibilityService` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Are the 2 inferred relationships involving `GoogleDriveSharedHarvester` (e.g. with `.runDeepCrawlLoop()` and `.startDirectDriveHarvest()`) actually correct?**
  _`GoogleDriveSharedHarvester` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `CloudHealthReport`, `DeviceInfo`, `PipelineMetrics` to the rest of the system?**
  _35 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `KidsAccessibilityService` be split into smaller, more focused modules?**
  _Cohesion score 0.0695970695970696 - nodes in this community are weakly interconnected._