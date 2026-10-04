# Graph Report - K.I.D.S  (2026-10-04)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 1017 nodes · 2598 edges · 57 communities (18 shown, 39 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 33 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `759669b5`
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
- CrawlerTraceLogger
- GoogleDriveClient
- OnboardingWizardScreen.kt
- DriveVaultManager.kt
- ShareTargetActivity.kt
- DriveSyncWorker.kt
- StreamManifest
- StreamManifestAndCardTest
- PrivacyFilterTest
- MainActivity.kt
- DeduplicationEngine
- WhatsAppChatExportParserTest.kt
- GestureDescription
- ChildProfile
- dispatchers
- StreamItemStatus
- Intent
- WizardStep
- log

## God Nodes (most connected - your core abstractions)
1. `KidsAccessibilityService` - 118 edges
2. `GoogleDriveSharedHarvester` - 117 edges
3. `FloatingCrawlerOverlay` - 44 edges
4. `GoogleDriveClient` - 32 edges
5. `OnboardingWizardScreen()` - 26 edges
6. `DriveVaultManager` - 25 edges
7. `DriveAttachmentMatcherTest` - 22 edges
8. `NoticeDao` - 22 edges
9. `CrawlerTraceLogger` - 22 edges
10. `AttachmentDao` - 21 edges

## Surprising Connections (you probably didn't know these)
- `KidsAccessibilityService` --calls--> `ContentClassifier`  [INFERRED]
  app/src/main/java/com/kids/collector/service/KidsAccessibilityService.kt → app/src/main/java/com/kids/collector/domain/classifier/ContentClassifier.kt
- `KidsAccessibilityService` --calls--> `DeduplicationEngine`  [INFERRED]
  app/src/main/java/com/kids/collector/service/KidsAccessibilityService.kt → app/src/main/java/com/kids/collector/domain/dedupe/DeduplicationEngine.kt
- `DownloadFolderObserver` --calls--> `DeduplicationEngine`  [INFERRED]
  app/src/main/java/com/kids/collector/data/drive/DownloadFolderObserver.kt → app/src/main/java/com/kids/collector/domain/dedupe/DeduplicationEngine.kt
- `ShareTargetActivity` --calls--> `DeduplicationEngine`  [INFERRED]
  app/src/main/java/com/kids/collector/presentation/share/ShareTargetActivity.kt → app/src/main/java/com/kids/collector/domain/dedupe/DeduplicationEngine.kt
- `OnboardingWizardScreen()` --calls--> `ChildProfile`  [INFERRED]
  app/src/main/java/com/kids/collector/presentation/wizard/OnboardingWizardScreen.kt → app/src/main/java/com/kids/collector/domain/model/Models.kt

## Import Cycles
- None detected.

## Communities (57 total, 39 thin omitted)

### Community 0 - "KidsAccessibilityService"
Cohesion: 0.07
Nodes (4): ExtractedAttachmentDetail, KidsAccessibilityService, UnvisitedCard, VisiblePendingCard

### Community 2 - "FloatingCrawlerOverlay"
Cohesion: 0.06
Nodes (7): FloatingCrawlerOverlay, GestureResultCallback, GestureResultCallback, GestureResultCallback, GestureResultCallback, GestureResultCallback, GestureResultCallback

### Community 3 - "Test"
Cohesion: 0.07
Nodes (5): ClassroomDateParser, ParsedDate, AttachmentChipMatcherTest, ClassroomDateParserTest, DriveAttachmentMatcherTest

### Community 4 - "Query"
Cohesion: 0.06
Nodes (4): AttachmentDao, ChildProfileDao, NoticeDao, KidsDatabase

### Community 5 - "MLKitOcrParser.kt"
Cohesion: 0.05
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

### Community 9 - "CrawlerTraceLogger"
Cohesion: 0.08
Nodes (4): CrawlerTraceLogger, DriveSyncWorker, DiagnosticSnapshot, DriveDeepLogger

### Community 10 - "GoogleDriveClient"
Cohesion: 0.12
Nodes (4): ChannelVaultFolders, ChildVaultFolders, DriveQuotaInfo, GoogleDriveClient

### Community 11 - "OnboardingWizardScreen.kt"
Cohesion: 0.11
Nodes (3): getDefaultSchoolAppList(), launchAccountPicker(), queryInstalledLauncherApps()

### Community 16 - "DriveSyncWorker.kt"
Cohesion: 0.14
Nodes (3): DeviceInfo, PipelineMetrics, StepStatus

### Community 20 - "MainActivity.kt"
Cohesion: 0.16
Nodes (5): AppScreen, DASHBOARD, DIAGNOSTICS, WIZARD, MainActivity

### Community 23 - "WhatsAppChatExportParserTest.kt"
Cohesion: 0.22
Nodes (3): ImportedNoticeRecord, WhatsAppChatExportParser, WhatsAppChatExportParserTest

### Community 24 - "GestureDescription"
Cohesion: 0.27
Nodes (3): GestureResultCallback, GestureResultCallback, GestureResultCallback

### Community 27 - "ChildProfile"
Cohesion: 0.28
Nodes (3): ChildCard(), ChildrenGridDashboard(), KidsTheme()

### Community 30 - "StreamItemStatus"
Cohesion: 0.29
Nodes (6): StreamItemStatus, ALREADY_SYNCED, COMPLETED, FAILED_SKIPPED, IN_PROGRESS, PENDING

### Community 32 - "WizardStep"
Cohesion: 0.33
Nodes (6): WizardStep, STEP_0_PERMISSIONS, STEP_1_VAULT, STEP_2_CLASSROOM, STEP_3_PORTALS, STEP_4_WHATSAPP

## Knowledge Gaps
- **37 isolated node(s):** `DeviceInfo`, `PipelineMetrics`, `StepStatus`, `CloudHealthReport`, `AttachmentEntity` (+32 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 226 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **39 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `KidsAccessibilityService` connect `KidsAccessibilityService` to `FloatingCrawlerOverlay`, `Test`, `ChildProfile`, `OnboardingWizardScreen`, `OnboardingWizardScreen.kt`, `KidsAccessibilityService.kt`, `MainActivity.kt`, `DeduplicationEngine`, `GoogleDriveSharedHarvester.kt`, `Intent`?**
  _High betweenness centrality (0.259) - this node is a cross-community bridge._
- **Why does `GoogleDriveSharedHarvester` connect `GoogleDriveSharedHarvester` to `KidsAccessibilityService`, `GoogleDriveSharedHarvester.kt`, `Test`?**
  _High betweenness centrality (0.145) - this node is a cross-community bridge._
- **Why does `KidsDatabase` connect `Query` to `KidsAccessibilityService`?**
  _High betweenness centrality (0.075) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `KidsAccessibilityService` (e.g. with `ContentClassifier` and `DeduplicationEngine`) actually correct?**
  _`KidsAccessibilityService` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Are the 2 inferred relationships involving `GoogleDriveSharedHarvester` (e.g. with `.runDeepCrawlLoop()` and `.startDirectDriveHarvest()`) actually correct?**
  _`GoogleDriveSharedHarvester` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `DeviceInfo`, `PipelineMetrics`, `StepStatus` to the rest of the system?**
  _37 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `KidsAccessibilityService` be split into smaller, more focused modules?**
  _Cohesion score 0.06601146601146601 - nodes in this community are weakly interconnected._