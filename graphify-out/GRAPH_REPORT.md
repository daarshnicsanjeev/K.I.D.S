# Graph Report - K.I.D.S  (2026-10-04)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 1066 nodes · 2768 edges · 59 communities (17 shown, 42 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 35 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `71304bba`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- KidsAccessibilityService
- GoogleDriveSharedHarvester
- FloatingCrawlerOverlay
- GoogleDriveClient
- Query
- ci_watch.py
- ChildProfile
- .mirrorAllInternalDataToDrive
- CrawlerTraceLogger
- KidsAccessibilityService.kt
- SafVaultManager.kt
- OnboardingWizardScreen.kt
- StreamManifest
- DriveAttachmentMatcherTest
- assertthat
- MainActivity.kt
- GoogleDriveClient.kt
- .matchesAttachmentChipText
- Test
- OnboardingWizardScreen
- dispatchers
- .parse
- PrivacyFilterTest
- WhatsAppChatExportParserTest.kt
- DiagnosticFeedScreen
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
7. `DriveAttachmentMatcherTest` - 22 edges
8. `NoticeDao` - 22 edges
9. `CrawlerTraceLogger` - 22 edges
10. `AttachmentDao` - 21 edges

## Surprising Connections (you probably didn't know these)
- `KidsAccessibilityService` --calls--> `ContentClassifier`  [INFERRED]
  app/src/main/java/com/kids/collector/service/KidsAccessibilityService.kt → app/src/main/java/com/kids/collector/domain/classifier/ContentClassifier.kt
- `KidsAccessibilityService` --calls--> `DeduplicationEngine`  [INFERRED]
  app/src/main/java/com/kids/collector/service/KidsAccessibilityService.kt → app/src/main/java/com/kids/collector/domain/dedupe/DeduplicationEngine.kt
- `ShareTargetActivity` --calls--> `DeduplicationEngine`  [INFERRED]
  app/src/main/java/com/kids/collector/presentation/share/ShareTargetActivity.kt → app/src/main/java/com/kids/collector/domain/dedupe/DeduplicationEngine.kt
- `DiagnosticFeedScreen()` --calls--> `ProbeItem`  [INFERRED]
  app/src/main/java/com/kids/collector/presentation/telemetry/DiagnosticFeedScreen.kt → app/src/main/java/com/kids/collector/domain/model/Models.kt
- `OnboardingWizardScreen()` --calls--> `ChannelConfig`  [INFERRED]
  app/src/main/java/com/kids/collector/presentation/wizard/OnboardingWizardScreen.kt → app/src/main/java/com/kids/collector/domain/model/Models.kt

## Import Cycles
- None detected.

## Communities (59 total, 42 thin omitted)

### Community 0 - "KidsAccessibilityService"
Cohesion: 0.06
Nodes (4): ExtractedAttachmentDetail, KidsAccessibilityService, UnvisitedCard, VisiblePendingCard

### Community 2 - "FloatingCrawlerOverlay"
Cohesion: 0.06
Nodes (7): FloatingCrawlerOverlay, GestureResultCallback, GestureResultCallback, GestureResultCallback, GestureResultCallback, GestureResultCallback, GestureResultCallback

### Community 3 - "GoogleDriveClient"
Cohesion: 0.08
Nodes (10): DriveVaultManager, Failure, ProvisionStep1Result, Success, UserConsentRequired, ChannelVaultFolders, ChildVaultFolders, DriveQuotaInfo (+2 more)

### Community 4 - "Query"
Cohesion: 0.06
Nodes (4): AttachmentDao, ChildProfileDao, NoticeDao, KidsDatabase

### Community 5 - "ci_watch.py"
Cohesion: 0.05
Nodes (25): AttachmentEntity, ChildProfileEntity, NoticeEntity, NoticeFtsEntity, Converters, ChannelConfig, diagnose_failure(), get_latest_run() (+17 more)

### Community 6 - "ChildProfile"
Cohesion: 0.05
Nodes (32): GraphEdge, GraphNode, KnowledgeGraph, KotlinGraphifyEngine, Attachment, ChannelType, FILE_IMPORT, GOOGLE_CLASSROOM (+24 more)

### Community 7 - ".mirrorAllInternalDataToDrive"
Cohesion: 0.06
Nodes (13): MLKitOcrParser, OcrExtractionResult, NotificationParser, ParsedNotification, InternalAppDiagnosticsMirror, MirrorSummary, NotificationParserTest, 5-Point Cloud Health Probe (+5 more)

### Community 8 - "CrawlerTraceLogger"
Cohesion: 0.07
Nodes (3): KidsApplication, CrawlerTraceLogger, DriveSyncWorker

### Community 11 - "SafVaultManager.kt"
Cohesion: 0.18
Nodes (3): SafVaultFolders, SafVaultManager, ShareTargetActivity

### Community 13 - "OnboardingWizardScreen.kt"
Cohesion: 0.10
Nodes (3): getDefaultSchoolAppList(), launchAccountPicker(), queryInstalledLauncherApps()

### Community 14 - "StreamManifest"
Cohesion: 0.14
Nodes (8): StreamItemStatus, ALREADY_SYNCED, COMPLETED, FAILED_SKIPPED, IN_PROGRESS, PENDING, StreamManifest, StreamManifestItem

### Community 18 - "MainActivity.kt"
Cohesion: 0.14
Nodes (6): AppScreen, DASHBOARD, DIAGNOSTICS, WIZARD, MainActivity, KidsTheme()

### Community 22 - "OnboardingWizardScreen"
Cohesion: 0.33
Nodes (3): PermissionHelper, PermissionSetupDialog(), OnboardingWizardScreen()

### Community 24 - ".parse"
Cohesion: 0.22
Nodes (3): ClassroomDateParser, ParsedDate, ClassroomDateParserTest

### Community 26 - "WhatsAppChatExportParserTest.kt"
Cohesion: 0.22
Nodes (3): ImportedNoticeRecord, WhatsAppChatExportParser, WhatsAppChatExportParserTest

### Community 29 - "DiagnosticFeedScreen"
Cohesion: 0.32
Nodes (5): ProbeItem, ChildCard(), ChildrenGridDashboard(), DiagnosticFeedScreen(), LogLine

### Community 31 - "WizardStep"
Cohesion: 0.33
Nodes (6): WizardStep, STEP_0_PERMISSIONS, STEP_1_VAULT, STEP_2_CLASSROOM, STEP_3_PORTALS, STEP_4_WHATSAPP

## Knowledge Gaps
- **36 isolated node(s):** `AttachmentEntity`, `ChildProfileEntity`, `NoticeFtsEntity`, `DeviceInfo`, `PipelineMetrics` (+31 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 221 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **42 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `KidsAccessibilityService` connect `KidsAccessibilityService` to `FloatingCrawlerOverlay`, `ChildProfile`, `KidsAccessibilityService.kt`, `SafVaultManager.kt`, `OnboardingWizardScreen.kt`, `DriveVaultManager.kt`, `assertthat`, `MainActivity.kt`, `.matchesAttachmentChipText`, `dispatchers`, `log`?**
  _High betweenness centrality (0.230) - this node is a cross-community bridge._
- **Why does `KidsDatabase` connect `Query` to `KidsAccessibilityService`?**
  _High betweenness centrality (0.128) - this node is a cross-community bridge._
- **Why does `GoogleDriveSharedHarvester` connect `GoogleDriveSharedHarvester` to `DriveVaultManager.kt`, `KidsAccessibilityService`, `.findBestCandidate`, `DriveAttachmentMatcherTest`?**
  _High betweenness centrality (0.104) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `KidsAccessibilityService` (e.g. with `ContentClassifier` and `DeduplicationEngine`) actually correct?**
  _`KidsAccessibilityService` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Are the 2 inferred relationships involving `GoogleDriveSharedHarvester` (e.g. with `.runDeepCrawlLoop()` and `.startDirectDriveHarvest()`) actually correct?**
  _`GoogleDriveSharedHarvester` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `AttachmentEntity`, `ChildProfileEntity`, `NoticeFtsEntity` to the rest of the system?**
  _36 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `KidsAccessibilityService` be split into smaller, more focused modules?**
  _Cohesion score 0.06272317963049216 - nodes in this community are weakly interconnected._