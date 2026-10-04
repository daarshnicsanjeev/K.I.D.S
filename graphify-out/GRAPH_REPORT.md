# Graph Report - K.I.D.S  (2026-10-04)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 1067 nodes · 2774 edges · 63 communities (15 shown, 48 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 36 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `5b8158ef`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- KidsAccessibilityService
- GoogleDriveSharedHarvester
- OnboardingWizardScreen
- FloatingCrawlerOverlay
- Query
- MLKitOcrParser.kt
- ci_watch.py
- ChildProfile
- GoogleDriveClient
- ShareTargetActivity.kt
- DriveSyncWorker.kt
- StreamManifest
- OnboardingWizardScreen.kt
- DriveAttachmentMatcherTest
- assertthat
- .matchesAttachmentChipText
- Test
- .parse
- GoogleDriveClient.kt
- MainActivity.kt
- PrivacyFilterTest
- WhatsAppChatExportParserTest.kt
- ChildProfile
- ContentClassifier
- Intent
- WizardStep
- GestureResultCallback

## God Nodes (most connected - your core abstractions)
1. `KidsAccessibilityService` - 122 edges
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
- `DriveSyncWorker` --calls--> `DriveDeepLogger`  [INFERRED]
  app/src/main/java/com/kids/collector/service/DriveSyncWorker.kt → app/src/main/java/com/kids/collector/telemetry/DriveDeepLogger.kt
- `DiagnosticFeedScreen()` --calls--> `ProbeItem`  [INFERRED]
  app/src/main/java/com/kids/collector/presentation/telemetry/DiagnosticFeedScreen.kt → app/src/main/java/com/kids/collector/domain/model/Models.kt

## Import Cycles
- None detected.

## Communities (63 total, 48 thin omitted)

### Community 0 - "KidsAccessibilityService"
Cohesion: 0.06
Nodes (6): NoticeEntity, CrawlerTraceLogger, ExtractedAttachmentDetail, KidsAccessibilityService, UnvisitedCard, VisiblePendingCard

### Community 2 - "OnboardingWizardScreen"
Cohesion: 0.07
Nodes (15): DriveVaultManager, Failure, ProvisionStep1Result, Success, UserConsentRequired, ProbeItem, KidsApplication, PermissionHelper (+7 more)

### Community 3 - "FloatingCrawlerOverlay"
Cohesion: 0.06
Nodes (7): FloatingCrawlerOverlay, GestureResultCallback, GestureResultCallback, GestureResultCallback, GestureResultCallback, GestureResultCallback, GestureResultCallback

### Community 4 - "Query"
Cohesion: 0.06
Nodes (4): AttachmentDao, ChildProfileDao, NoticeDao, KidsDatabase

### Community 5 - "MLKitOcrParser.kt"
Cohesion: 0.05
Nodes (14): SafVaultFolders, SafVaultManager, MLKitOcrParser, OcrExtractionResult, NotificationParser, ParsedNotification, ShareTargetActivity, NotificationParserTest (+6 more)

### Community 6 - "ci_watch.py"
Cohesion: 0.05
Nodes (24): AttachmentEntity, ChildProfileEntity, NoticeFtsEntity, Converters, ChannelConfig, diagnose_failure(), get_latest_run(), main() (+16 more)

### Community 7 - "ChildProfile"
Cohesion: 0.05
Nodes (32): GraphEdge, GraphNode, KnowledgeGraph, KotlinGraphifyEngine, Attachment, ChannelType, FILE_IMPORT, GOOGLE_CLASSROOM (+24 more)

### Community 9 - "ShareTargetActivity.kt"
Cohesion: 0.11
Nodes (3): DownloadFolderObserver, DeduplicationEngine, KidsNotificationListenerService

### Community 11 - "StreamManifest"
Cohesion: 0.14
Nodes (8): StreamItemStatus, ALREADY_SYNCED, COMPLETED, FAILED_SKIPPED, IN_PROGRESS, PENDING, StreamManifest, StreamManifestItem

### Community 13 - "OnboardingWizardScreen.kt"
Cohesion: 0.12
Nodes (3): getDefaultSchoolAppList(), launchAccountPicker(), queryInstalledLauncherApps()

### Community 20 - ".parse"
Cohesion: 0.22
Nodes (3): ClassroomDateParser, ParsedDate, ClassroomDateParserTest

### Community 22 - "MainActivity.kt"
Cohesion: 0.20
Nodes (5): AppScreen, DASHBOARD, DIAGNOSTICS, WIZARD, MainActivity

### Community 25 - "WhatsAppChatExportParserTest.kt"
Cohesion: 0.22
Nodes (3): ImportedNoticeRecord, WhatsAppChatExportParser, WhatsAppChatExportParserTest

### Community 27 - "ChildProfile"
Cohesion: 0.28
Nodes (3): ChildCard(), ChildrenGridDashboard(), KidsTheme()

### Community 32 - "WizardStep"
Cohesion: 0.33
Nodes (6): WizardStep, STEP_0_PERMISSIONS, STEP_1_VAULT, STEP_2_CLASSROOM, STEP_3_PORTALS, STEP_4_WHATSAPP

## Knowledge Gaps
- **35 isolated node(s):** `ChildProfileEntity`, `NoticeFtsEntity`, `CloudHealthReport`, `DeviceInfo`, `PipelineMetrics` (+30 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 222 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **48 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `KidsAccessibilityService` connect `KidsAccessibilityService` to `OnboardingWizardScreen`, `FloatingCrawlerOverlay`, `ShareTargetActivity.kt`, `KidsAccessibilityService.kt`, `OnboardingWizardScreen.kt`, `assertthat`, `.matchesAttachmentChipText`, `MainActivity.kt`, `ContentClassifier`, `Intent`?**
  _High betweenness centrality (0.253) - this node is a cross-community bridge._
- **Why does `KidsDatabase` connect `Query` to `KidsAccessibilityService`?**
  _High betweenness centrality (0.133) - this node is a cross-community bridge._
- **Why does `GoogleDriveSharedHarvester` connect `GoogleDriveSharedHarvester` to `KidsAccessibilityService`, `KidsAccessibilityService.kt`, `.findBestCandidate`, `DriveAttachmentMatcherTest`?**
  _High betweenness centrality (0.096) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `KidsAccessibilityService` (e.g. with `ContentClassifier` and `DeduplicationEngine`) actually correct?**
  _`KidsAccessibilityService` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Are the 2 inferred relationships involving `GoogleDriveSharedHarvester` (e.g. with `.runDeepCrawlLoop()` and `.startDirectDriveHarvest()`) actually correct?**
  _`GoogleDriveSharedHarvester` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `ChildProfileEntity`, `NoticeFtsEntity`, `CloudHealthReport` to the rest of the system?**
  _35 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `KidsAccessibilityService` be split into smaller, more focused modules?**
  _Cohesion score 0.0554315913094539 - nodes in this community are weakly interconnected._