# Graph Report - K.I.D.S  (2026-10-04)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 1025 nodes · 2618 edges · 60 communities (18 shown, 42 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 33 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `b8c08fb0`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- KidsAccessibilityService
- GoogleDriveSharedHarvester
- FloatingCrawlerOverlay
- Test
- Query
- MLKitOcrParser.kt
- ChildProfile
- OnboardingWizardScreen
- ci_watch.py
- GoogleDriveClient
- CrawlerTraceLogger
- OnboardingWizardScreen.kt
- DriveSyncWorker.kt
- DriveVaultManager.kt
- GoogleDriveClient.kt
- StreamManifest
- MainActivity.kt
- StreamManifestAndCardTest
- PrivacyFilterTest
- DeduplicationEngine
- WhatsAppChatExportParserTest.kt
- log
- GestureDescription
- DriveDeepLogger.kt
- ChildProfile
- StreamItemStatus
- WizardStep

## God Nodes (most connected - your core abstractions)
1. `KidsAccessibilityService` - 120 edges
2. `GoogleDriveSharedHarvester` - 117 edges
3. `FloatingCrawlerOverlay` - 44 edges
4. `GoogleDriveClient` - 32 edges
5. `OnboardingWizardScreen()` - 26 edges
6. `DriveVaultManager` - 25 edges
7. `CrawlerTraceLogger` - 22 edges
8. `StreamManifest` - 22 edges
9. `DriveAttachmentMatcherTest` - 22 edges
10. `NoticeDao` - 22 edges

## Surprising Connections (you probably didn't know these)
- `KidsAccessibilityService` --calls--> `ContentClassifier`  [INFERRED]
  app/src/main/java/com/kids/collector/service/KidsAccessibilityService.kt → app/src/main/java/com/kids/collector/domain/classifier/ContentClassifier.kt
- `KidsAccessibilityService` --calls--> `DeduplicationEngine`  [INFERRED]
  app/src/main/java/com/kids/collector/service/KidsAccessibilityService.kt → app/src/main/java/com/kids/collector/domain/dedupe/DeduplicationEngine.kt
- `DriveSyncWorker` --calls--> `KotlinGraphifyEngine`  [INFERRED]
  app/src/main/java/com/kids/collector/service/DriveSyncWorker.kt → app/src/main/java/com/kids/collector/domain/graph/KotlinGraphifyEngine.kt
- `DriveSyncWorker` --calls--> `DriveDeepLogger`  [INFERRED]
  app/src/main/java/com/kids/collector/service/DriveSyncWorker.kt → app/src/main/java/com/kids/collector/telemetry/DriveDeepLogger.kt
- `DownloadFolderObserver` --calls--> `DeduplicationEngine`  [INFERRED]
  app/src/main/java/com/kids/collector/data/drive/DownloadFolderObserver.kt → app/src/main/java/com/kids/collector/domain/dedupe/DeduplicationEngine.kt

## Import Cycles
- None detected.

## Communities (60 total, 42 thin omitted)

### Community 0 - "KidsAccessibilityService"
Cohesion: 0.07
Nodes (4): ExtractedAttachmentDetail, KidsAccessibilityService, UnvisitedCard, VisiblePendingCard

### Community 2 - "FloatingCrawlerOverlay"
Cohesion: 0.06
Nodes (7): FloatingCrawlerOverlay, GestureResultCallback, GestureResultCallback, GestureResultCallback, GestureResultCallback, GestureResultCallback, GestureResultCallback

### Community 3 - "Test"
Cohesion: 0.06
Nodes (5): ClassroomDateParser, ParsedDate, AttachmentChipMatcherTest, ClassroomDateParserTest, DriveAttachmentMatcherTest

### Community 4 - "Query"
Cohesion: 0.06
Nodes (4): AttachmentDao, ChildProfileDao, NoticeDao, KidsDatabase

### Community 5 - "MLKitOcrParser.kt"
Cohesion: 0.06
Nodes (14): SafVaultFolders, SafVaultManager, MLKitOcrParser, OcrExtractionResult, NotificationParser, ParsedNotification, ShareTargetActivity, NotificationParserTest (+6 more)

### Community 6 - "ChildProfile"
Cohesion: 0.06
Nodes (29): ContentClassifier, GraphEdge, GraphNode, KnowledgeGraph, KotlinGraphifyEngine, Attachment, ChannelType, FILE_IMPORT (+21 more)

### Community 7 - "OnboardingWizardScreen"
Cohesion: 0.11
Nodes (12): DriveVaultManager, Failure, ProvisionStep1Result, Success, UserConsentRequired, ProbeItem, PermissionHelper, PermissionSetupDialog() (+4 more)

### Community 8 - "ci_watch.py"
Cohesion: 0.06
Nodes (17): AttachmentEntity, ChildProfileEntity, NoticeEntity, NoticeFtsEntity, Converters, ChannelConfig, diagnose_failure(), get_latest_run() (+9 more)

### Community 9 - "GoogleDriveClient"
Cohesion: 0.12
Nodes (4): ChannelVaultFolders, ChildVaultFolders, DriveQuotaInfo, GoogleDriveClient

### Community 12 - "OnboardingWizardScreen.kt"
Cohesion: 0.10
Nodes (3): getDefaultSchoolAppList(), launchAccountPicker(), queryInstalledLauncherApps()

### Community 18 - "MainActivity.kt"
Cohesion: 0.15
Nodes (5): AppScreen, DASHBOARD, DIAGNOSTICS, WIZARD, MainActivity

### Community 21 - "DeduplicationEngine"
Cohesion: 0.18
Nodes (3): DeduplicationEngine, KidsNotificationListenerService, DeduplicationHashTest

### Community 23 - "WhatsAppChatExportParserTest.kt"
Cohesion: 0.22
Nodes (3): ImportedNoticeRecord, WhatsAppChatExportParser, WhatsAppChatExportParserTest

### Community 25 - "GestureDescription"
Cohesion: 0.27
Nodes (3): GestureResultCallback, GestureResultCallback, GestureResultCallback

### Community 26 - "DriveDeepLogger.kt"
Cohesion: 0.24
Nodes (5): DeviceInfo, DiagnosticSnapshot, DriveDeepLogger, PipelineMetrics, StepStatus

### Community 27 - "ChildProfile"
Cohesion: 0.28
Nodes (3): ChildCard(), ChildrenGridDashboard(), KidsTheme()

### Community 30 - "StreamItemStatus"
Cohesion: 0.29
Nodes (6): StreamItemStatus, ALREADY_SYNCED, COMPLETED, FAILED_SKIPPED, IN_PROGRESS, PENDING

### Community 31 - "WizardStep"
Cohesion: 0.33
Nodes (6): WizardStep, STEP_0_PERMISSIONS, STEP_1_VAULT, STEP_2_CLASSROOM, STEP_3_PORTALS, STEP_4_WHATSAPP

## Knowledge Gaps
- **37 isolated node(s):** `DeviceInfo`, `PipelineMetrics`, `StepStatus`, `CloudHealthReport`, `AttachmentEntity` (+32 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 228 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **42 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `KidsAccessibilityService` connect `KidsAccessibilityService` to `FloatingCrawlerOverlay`, `Test`, `ChildProfile`, `OnboardingWizardScreen`, `KidsAccessibilityService.kt`, `OnboardingWizardScreen.kt`, `MainActivity.kt`, `DeduplicationEngine`, `GoogleDriveSharedHarvester.kt`, `log`?**
  _High betweenness centrality (0.251) - this node is a cross-community bridge._
- **Why does `GoogleDriveSharedHarvester` connect `GoogleDriveSharedHarvester` to `KidsAccessibilityService`, `Test`, `GoogleDriveSharedHarvester.kt`?**
  _High betweenness centrality (0.131) - this node is a cross-community bridge._
- **Why does `KidsDatabase` connect `Query` to `KidsAccessibilityService`?**
  _High betweenness centrality (0.085) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `KidsAccessibilityService` (e.g. with `ContentClassifier` and `DeduplicationEngine`) actually correct?**
  _`KidsAccessibilityService` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Are the 2 inferred relationships involving `GoogleDriveSharedHarvester` (e.g. with `.runDeepCrawlLoop()` and `.startDirectDriveHarvest()`) actually correct?**
  _`GoogleDriveSharedHarvester` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `DeviceInfo`, `PipelineMetrics`, `StepStatus` to the rest of the system?**
  _37 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `KidsAccessibilityService` be split into smaller, more focused modules?**
  _Cohesion score 0.06552006552006552 - nodes in this community are weakly interconnected._