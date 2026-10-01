# Graph Report - K.I.D.S  (2026-10-01)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 947 nodes · 2312 edges · 50 communities (17 shown, 33 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 36 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `3588fb76`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- KidsAccessibilityService
- GoogleDriveClient
- GoogleDriveSharedHarvester
- FloatingCrawlerOverlay
- Test
- ChildProfile
- Query
- MLKitOcrParser.kt
- ContentCategory
- StreamManifest
- ci_watch.py
- OnboardingWizardScreen.kt
- ShareTargetActivity.kt
- GoogleDriveClient.kt
- .matchesAttachmentChipText
- DriveSyncWorker.kt
- MainActivity.kt
- GestureDescription
- DriveDeepLogger.kt
- log
- ChildProfile
- Intent
- WizardStep

## God Nodes (most connected - your core abstractions)
1. `KidsAccessibilityService` - 107 edges
2. `GoogleDriveSharedHarvester` - 87 edges
3. `FloatingCrawlerOverlay` - 44 edges
4. `GoogleDriveClient` - 32 edges
5. `OnboardingWizardScreen()` - 25 edges
6. `DriveVaultManager` - 23 edges
7. `DriveAttachmentMatcherTest` - 20 edges
8. `CrawlerTraceLogger` - 19 edges
9. `ChildProfile` - 18 edges
10. `NoticeDao` - 18 edges

## Surprising Connections (you probably didn't know these)
- `DiagnosticFeedScreen()` --calls--> `ProbeItem`  [INFERRED]
  app/src/main/java/com/kids/collector/presentation/telemetry/DiagnosticFeedScreen.kt → app/src/main/java/com/kids/collector/domain/model/Models.kt
- `KidsAccessibilityService` --calls--> `ContentClassifier`  [INFERRED]
  app/src/main/java/com/kids/collector/service/KidsAccessibilityService.kt → app/src/main/java/com/kids/collector/domain/classifier/ContentClassifier.kt
- `KidsAccessibilityService` --calls--> `DeduplicationEngine`  [INFERRED]
  app/src/main/java/com/kids/collector/service/KidsAccessibilityService.kt → app/src/main/java/com/kids/collector/domain/dedupe/DeduplicationEngine.kt
- `DownloadFolderObserver` --calls--> `DeduplicationEngine`  [INFERRED]
  app/src/main/java/com/kids/collector/data/drive/DownloadFolderObserver.kt → app/src/main/java/com/kids/collector/domain/dedupe/DeduplicationEngine.kt
- `ShareTargetActivity` --calls--> `DeduplicationEngine`  [INFERRED]
  app/src/main/java/com/kids/collector/presentation/share/ShareTargetActivity.kt → app/src/main/java/com/kids/collector/domain/dedupe/DeduplicationEngine.kt

## Import Cycles
- None detected.

## Communities (50 total, 33 thin omitted)

### Community 0 - "KidsAccessibilityService"
Cohesion: 0.07
Nodes (5): NoticeEntity, ExtractedAttachmentDetail, KidsAccessibilityService, UnvisitedCard, VisiblePendingCard

### Community 1 - "GoogleDriveClient"
Cohesion: 0.05
Nodes (15): DriveVaultManager, Failure, ProvisionStep1Result, Success, UserConsentRequired, ChannelVaultFolders, ChildVaultFolders, DriveQuotaInfo (+7 more)

### Community 2 - "GoogleDriveSharedHarvester"
Cohesion: 0.08
Nodes (3): CrawlerTraceLogger, DriveSharedItem, GoogleDriveSharedHarvester

### Community 3 - "FloatingCrawlerOverlay"
Cohesion: 0.06
Nodes (7): FloatingCrawlerOverlay, GestureResultCallback, GestureResultCallback, GestureResultCallback, GestureResultCallback, GestureResultCallback, GestureResultCallback

### Community 4 - "Test"
Cohesion: 0.06
Nodes (7): ClassroomDateParser, ParsedDate, PrivacyFilter, ClassroomDateParserTest, DeduplicationHashTest, DriveAttachmentMatcherTest, PrivacyFilterTest

### Community 5 - "ChildProfile"
Cohesion: 0.05
Nodes (27): AttachmentEntity, ChildProfileEntity, NoticeFtsEntity, Converters, GraphEdge, GraphNode, KnowledgeGraph, KotlinGraphifyEngine (+19 more)

### Community 6 - "Query"
Cohesion: 0.07
Nodes (4): AttachmentDao, ChildProfileDao, NoticeDao, KidsDatabase

### Community 7 - "MLKitOcrParser.kt"
Cohesion: 0.07
Nodes (8): SafVaultFolders, SafVaultManager, MLKitOcrParser, OcrExtractionResult, NotificationParser, ParsedNotification, ShareTargetActivity, NotificationParserTest

### Community 8 - "ContentCategory"
Cohesion: 0.06
Nodes (18): ContentClassifier, ImportedNoticeRecord, WhatsAppChatExportParser, ContentCategory, ATTENDANCE, CIRCULAR, FEES, HOMEWORK (+10 more)

### Community 9 - "StreamManifest"
Cohesion: 0.08
Nodes (9): StreamItemStatus, ALREADY_SYNCED, COMPLETED, FAILED_SKIPPED, IN_PROGRESS, PENDING, StreamManifest, StreamManifestItem (+1 more)

### Community 11 - "ci_watch.py"
Cohesion: 0.12
Nodes (11): diagnose_failure(), get_latest_run(), main(), monitor_workflow(), run_cmd(), sync_local_graph(), verify_release(), check_file() (+3 more)

### Community 12 - "OnboardingWizardScreen.kt"
Cohesion: 0.10
Nodes (3): getDefaultSchoolAppList(), launchAccountPicker(), queryInstalledLauncherApps()

### Community 18 - "MainActivity.kt"
Cohesion: 0.18
Nodes (5): AppScreen, DASHBOARD, DIAGNOSTICS, WIZARD, MainActivity

### Community 20 - "GestureDescription"
Cohesion: 0.27
Nodes (3): GestureResultCallback, GestureResultCallback, GestureResultCallback

### Community 21 - "DriveDeepLogger.kt"
Cohesion: 0.24
Nodes (5): DeviceInfo, DiagnosticSnapshot, DriveDeepLogger, PipelineMetrics, StepStatus

### Community 23 - "ChildProfile"
Cohesion: 0.28
Nodes (3): ChildCard(), ChildrenGridDashboard(), KidsTheme()

### Community 27 - "WizardStep"
Cohesion: 0.33
Nodes (6): WizardStep, STEP_0_PERMISSIONS, STEP_1_VAULT, STEP_2_CLASSROOM, STEP_3_PORTALS, STEP_4_WHATSAPP

## Knowledge Gaps
- **35 isolated node(s):** `DeviceInfo`, `PipelineMetrics`, `StepStatus`, `CloudHealthReport`, `AttachmentEntity` (+30 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 222 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **33 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `KidsAccessibilityService` connect `KidsAccessibilityService` to `GoogleDriveClient`, `FloatingCrawlerOverlay`, `Test`, `ContentCategory`, `KidsAccessibilityService.kt`, `OnboardingWizardScreen.kt`, `ShareTargetActivity.kt`, `.matchesAttachmentChipText`, `Intent`?**
  _High betweenness centrality (0.244) - this node is a cross-community bridge._
- **Why does `GoogleDriveSharedHarvester` connect `GoogleDriveSharedHarvester` to `KidsAccessibilityService`, `KidsAccessibilityService.kt`, `Test`, `ShareTargetActivity.kt`?**
  _High betweenness centrality (0.119) - this node is a cross-community bridge._
- **Why does `ChildProfile` connect `ChildProfile` to `KidsAccessibilityService`, `GoogleDriveClient`, `ShareTargetActivity.kt`?**
  _High betweenness centrality (0.066) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `KidsAccessibilityService` (e.g. with `ContentClassifier` and `DeduplicationEngine`) actually correct?**
  _`KidsAccessibilityService` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Are the 2 inferred relationships involving `GoogleDriveSharedHarvester` (e.g. with `.runDeepCrawlLoop()` and `.startDirectDriveHarvest()`) actually correct?**
  _`GoogleDriveSharedHarvester` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `DeviceInfo`, `PipelineMetrics`, `StepStatus` to the rest of the system?**
  _35 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `KidsAccessibilityService` be split into smaller, more focused modules?**
  _Cohesion score 0.07148514851485148 - nodes in this community are weakly interconnected._