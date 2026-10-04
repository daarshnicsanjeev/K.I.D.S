# Graph Report - K.I.D.S  (2026-10-04)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 1066 nodes · 2769 edges · 61 communities (18 shown, 43 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 36 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `31d80991`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- KidsAccessibilityService
- GoogleDriveSharedHarvester
- FloatingCrawlerOverlay
- OnboardingWizardScreen
- Query
- ci_watch.py
- ChildProfile
- SafVaultManager.kt
- KidsAccessibilityService.kt
- GoogleDriveClient
- InternalAppDiagnosticsMirror.kt
- DriveSyncWorker
- OnboardingWizardScreen.kt
- StreamManifest
- DriveAttachmentMatcherTest
- Test
- assertthat
- MLKitOcrParser.kt
- StreamManifestAndCardTest
- K.I.D.S. Android Collector (PRD)
- .parse
- MainActivity.kt
- GoogleDriveClient.kt
- DiagnosticFeedScreen
- PrivacyFilterTest
- WhatsAppChatExportParserTest.kt
- log
- WizardStep
- GestureResultCallback

## God Nodes (most connected - your core abstractions)
1. `KidsAccessibilityService` - 121 edges
2. `GoogleDriveSharedHarvester` - 119 edges
3. `FloatingCrawlerOverlay` - 44 edges
4. `GoogleDriveClient` - 37 edges
5. `OnboardingWizardScreen()` - 26 edges
6. `DriveVaultManager` - 24 edges
7. `CrawlerTraceLogger` - 22 edges
8. `DriveAttachmentMatcherTest` - 22 edges
9. `NoticeDao` - 22 edges
10. `AttachmentDao` - 21 edges

## Surprising Connections (you probably didn't know these)
- `KidsAccessibilityService` --calls--> `ContentClassifier`  [INFERRED]
  app/src/main/java/com/kids/collector/service/KidsAccessibilityService.kt → app/src/main/java/com/kids/collector/domain/classifier/ContentClassifier.kt
- `KidsAccessibilityService` --calls--> `DeduplicationEngine`  [INFERRED]
  app/src/main/java/com/kids/collector/service/KidsAccessibilityService.kt → app/src/main/java/com/kids/collector/domain/dedupe/DeduplicationEngine.kt
- `DriveSyncWorker` --calls--> `KotlinGraphifyEngine`  [INFERRED]
  app/src/main/java/com/kids/collector/service/DriveSyncWorker.kt → app/src/main/java/com/kids/collector/domain/graph/KotlinGraphifyEngine.kt
- `DownloadFolderObserver` --calls--> `DeduplicationEngine`  [INFERRED]
  app/src/main/java/com/kids/collector/data/drive/DownloadFolderObserver.kt → app/src/main/java/com/kids/collector/domain/dedupe/DeduplicationEngine.kt
- `DiagnosticFeedScreen()` --calls--> `ProbeItem`  [INFERRED]
  app/src/main/java/com/kids/collector/presentation/telemetry/DiagnosticFeedScreen.kt → app/src/main/java/com/kids/collector/domain/model/Models.kt

## Import Cycles
- None detected.

## Communities (61 total, 43 thin omitted)

### Community 0 - "KidsAccessibilityService"
Cohesion: 0.06
Nodes (5): CrawlerTraceLogger, ExtractedAttachmentDetail, KidsAccessibilityService, UnvisitedCard, VisiblePendingCard

### Community 2 - "FloatingCrawlerOverlay"
Cohesion: 0.05
Nodes (7): FloatingCrawlerOverlay, GestureResultCallback, GestureResultCallback, GestureResultCallback, GestureResultCallback, GestureResultCallback, GestureResultCallback

### Community 3 - "OnboardingWizardScreen"
Cohesion: 0.09
Nodes (11): DriveVaultManager, Failure, ProvisionStep1Result, Success, UserConsentRequired, PermissionHelper, PermissionSetupDialog(), OnboardingWizardScreen() (+3 more)

### Community 4 - "Query"
Cohesion: 0.06
Nodes (4): AttachmentDao, ChildProfileDao, NoticeDao, KidsDatabase

### Community 5 - "ci_watch.py"
Cohesion: 0.05
Nodes (25): AttachmentEntity, ChildProfileEntity, NoticeEntity, NoticeFtsEntity, Converters, ChannelConfig, diagnose_failure(), get_latest_run() (+17 more)

### Community 6 - "ChildProfile"
Cohesion: 0.07
Nodes (27): GraphEdge, GraphNode, KnowledgeGraph, KotlinGraphifyEngine, Attachment, ChannelType, FILE_IMPORT, GOOGLE_CLASSROOM (+19 more)

### Community 7 - "SafVaultManager.kt"
Cohesion: 0.09
Nodes (8): SafVaultFolders, SafVaultManager, MLKitOcrParser, OcrExtractionResult, NotificationParser, ParsedNotification, ShareTargetActivity, NotificationParserTest

### Community 8 - "KidsAccessibilityService.kt"
Cohesion: 0.09
Nodes (3): ContentClassifier, DeduplicationEngine, KidsNotificationListenerService

### Community 10 - "InternalAppDiagnosticsMirror.kt"
Cohesion: 0.08
Nodes (3): DeviceInfo, PipelineMetrics, StepStatus

### Community 11 - "DriveSyncWorker"
Cohesion: 0.10
Nodes (3): DriveSyncWorker, DiagnosticSnapshot, DriveDeepLogger

### Community 13 - "OnboardingWizardScreen.kt"
Cohesion: 0.10
Nodes (3): getDefaultSchoolAppList(), launchAccountPicker(), queryInstalledLauncherApps()

### Community 14 - "StreamManifest"
Cohesion: 0.14
Nodes (8): StreamItemStatus, ALREADY_SYNCED, COMPLETED, FAILED_SKIPPED, IN_PROGRESS, PENDING, StreamManifest, StreamManifestItem

### Community 21 - "K.I.D.S. Android Collector (PRD)"
Cohesion: 0.14
Nodes (7): Dual WhatsApp Catch-Up Engine, 5-Point Cloud Health Probe, Google Credential Manager API, Memory Boundary Privacy Filter, K.I.D.S. Android Collector (PRD), Sequential 4-Step Onboarding, Streaming PdfRenderer OCR

### Community 22 - ".parse"
Cohesion: 0.22
Nodes (3): ClassroomDateParser, ParsedDate, ClassroomDateParserTest

### Community 23 - "MainActivity.kt"
Cohesion: 0.18
Nodes (5): AppScreen, DASHBOARD, DIAGNOSTICS, WIZARD, MainActivity

### Community 25 - "DiagnosticFeedScreen"
Cohesion: 0.20
Nodes (6): ProbeItem, ChildCard(), ChildrenGridDashboard(), DiagnosticFeedScreen(), LogLine, KidsTheme()

### Community 27 - "WhatsAppChatExportParserTest.kt"
Cohesion: 0.22
Nodes (3): ImportedNoticeRecord, WhatsAppChatExportParser, WhatsAppChatExportParserTest

### Community 31 - "WizardStep"
Cohesion: 0.33
Nodes (6): WizardStep, STEP_0_PERMISSIONS, STEP_1_VAULT, STEP_2_CLASSROOM, STEP_3_PORTALS, STEP_4_WHATSAPP

## Knowledge Gaps
- **35 isolated node(s):** `DeviceInfo`, `PipelineMetrics`, `StepStatus`, `ChildProfileEntity`, `NoticeFtsEntity` (+30 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 222 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **43 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `KidsAccessibilityService` connect `KidsAccessibilityService` to `FloatingCrawlerOverlay`, `OnboardingWizardScreen`, `ChildProfile`, `KidsAccessibilityService.kt`, `OnboardingWizardScreen.kt`, `Test`, `MainActivity.kt`, `log`?**
  _High betweenness centrality (0.254) - this node is a cross-community bridge._
- **Why does `KidsDatabase` connect `Query` to `KidsAccessibilityService`?**
  _High betweenness centrality (0.121) - this node is a cross-community bridge._
- **Why does `GoogleDriveSharedHarvester` connect `GoogleDriveSharedHarvester` to `KidsAccessibilityService`, `DriveVaultManager.kt`, `.findBestCandidate`, `DriveAttachmentMatcherTest`?**
  _High betweenness centrality (0.095) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `KidsAccessibilityService` (e.g. with `ContentClassifier` and `DeduplicationEngine`) actually correct?**
  _`KidsAccessibilityService` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Are the 2 inferred relationships involving `GoogleDriveSharedHarvester` (e.g. with `.runDeepCrawlLoop()` and `.startDirectDriveHarvest()`) actually correct?**
  _`GoogleDriveSharedHarvester` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `DeviceInfo`, `PipelineMetrics`, `StepStatus` to the rest of the system?**
  _35 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `KidsAccessibilityService` be split into smaller, more focused modules?**
  _Cohesion score 0.05724284464441945 - nodes in this community are weakly interconnected._