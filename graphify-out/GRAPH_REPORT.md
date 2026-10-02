# Graph Report - K.I.D.S  (2026-10-02)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 969 nodes · 2415 edges · 68 communities (19 shown, 49 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 38 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `e7fc2ac3`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- KidsAccessibilityService
- GoogleDriveSharedHarvester
- FloatingCrawlerOverlay
- Query
- OnboardingWizardScreen
- ChildProfile
- ci_watch.py
- MLKitOcrParser.kt
- StreamManifest
- GoogleDriveClient
- SafVaultManager.kt
- OnboardingWizardScreen.kt
- ShareTargetActivity.kt
- Test
- DriveSyncWorker.kt
- .matchesAttachmentChipText
- .parse
- assertthat
- PrivacyFilterTest
- WhatsAppChatExportParserTest.kt
- GestureDescription
- dispatchers
- MainActivity.kt
- DriveDeepLogger.kt
- log
- ChildProfile
- ContentClassifier
- Intent
- WizardStep
- ContentClassifierTest

## God Nodes (most connected - your core abstractions)
1. `KidsAccessibilityService` - 110 edges
2. `GoogleDriveSharedHarvester` - 95 edges
3. `FloatingCrawlerOverlay` - 44 edges
4. `GoogleDriveClient` - 32 edges
5. `OnboardingWizardScreen()` - 25 edges
6. `DriveVaultManager` - 23 edges
7. `CrawlerTraceLogger` - 22 edges
8. `DriveAttachmentMatcherTest` - 22 edges
9. `NoticeDao` - 18 edges
10. `ChildProfile` - 18 edges

## Surprising Connections (you probably didn't know these)
- `DiagnosticFeedScreen()` --calls--> `ProbeItem`  [INFERRED]
  app/src/main/java/com/kids/collector/presentation/telemetry/DiagnosticFeedScreen.kt → app/src/main/java/com/kids/collector/domain/model/Models.kt
- `KidsAccessibilityService` --calls--> `ContentClassifier`  [INFERRED]
  app/src/main/java/com/kids/collector/service/KidsAccessibilityService.kt → app/src/main/java/com/kids/collector/domain/classifier/ContentClassifier.kt
- `KidsAccessibilityService` --calls--> `DeduplicationEngine`  [INFERRED]
  app/src/main/java/com/kids/collector/service/KidsAccessibilityService.kt → app/src/main/java/com/kids/collector/domain/dedupe/DeduplicationEngine.kt
- `ShareTargetActivity` --calls--> `DeduplicationEngine`  [INFERRED]
  app/src/main/java/com/kids/collector/presentation/share/ShareTargetActivity.kt → app/src/main/java/com/kids/collector/domain/dedupe/DeduplicationEngine.kt
- `DownloadFolderObserver` --calls--> `DeduplicationEngine`  [INFERRED]
  app/src/main/java/com/kids/collector/data/drive/DownloadFolderObserver.kt → app/src/main/java/com/kids/collector/domain/dedupe/DeduplicationEngine.kt

## Import Cycles
- None detected.

## Communities (68 total, 49 thin omitted)

### Community 0 - "KidsAccessibilityService"
Cohesion: 0.07
Nodes (5): NoticeEntity, ExtractedAttachmentDetail, KidsAccessibilityService, UnvisitedCard, VisiblePendingCard

### Community 1 - "GoogleDriveSharedHarvester"
Cohesion: 0.06
Nodes (3): CrawlerTraceLogger, DriveSharedItem, GoogleDriveSharedHarvester

### Community 2 - "FloatingCrawlerOverlay"
Cohesion: 0.06
Nodes (7): FloatingCrawlerOverlay, GestureResultCallback, GestureResultCallback, GestureResultCallback, GestureResultCallback, GestureResultCallback, GestureResultCallback

### Community 3 - "Query"
Cohesion: 0.07
Nodes (4): AttachmentDao, ChildProfileDao, NoticeDao, KidsDatabase

### Community 4 - "OnboardingWizardScreen"
Cohesion: 0.11
Nodes (11): DriveVaultManager, Failure, ProvisionStep1Result, Success, UserConsentRequired, PermissionHelper, PermissionSetupDialog(), DiagnosticFeedScreen() (+3 more)

### Community 5 - "ChildProfile"
Cohesion: 0.07
Nodes (28): GraphEdge, GraphNode, KnowledgeGraph, KotlinGraphifyEngine, Attachment, ChannelType, FILE_IMPORT, GOOGLE_CLASSROOM (+20 more)

### Community 6 - "ci_watch.py"
Cohesion: 0.07
Nodes (16): AttachmentEntity, ChildProfileEntity, NoticeFtsEntity, Converters, ChannelConfig, diagnose_failure(), get_latest_run(), main() (+8 more)

### Community 7 - "MLKitOcrParser.kt"
Cohesion: 0.07
Nodes (11): MLKitOcrParser, OcrExtractionResult, NotificationParser, ParsedNotification, NotificationParserTest, 5-Point Cloud Health Probe, Google Credential Manager API, Memory Boundary Privacy Filter (+3 more)

### Community 8 - "StreamManifest"
Cohesion: 0.08
Nodes (9): StreamItemStatus, ALREADY_SYNCED, COMPLETED, FAILED_SKIPPED, IN_PROGRESS, PENDING, StreamManifest, StreamManifestItem (+1 more)

### Community 9 - "GoogleDriveClient"
Cohesion: 0.11
Nodes (4): ChannelVaultFolders, ChildVaultFolders, DriveQuotaInfo, GoogleDriveClient

### Community 12 - "SafVaultManager.kt"
Cohesion: 0.23
Nodes (3): SafVaultFolders, SafVaultManager, ShareTargetActivity

### Community 13 - "OnboardingWizardScreen.kt"
Cohesion: 0.11
Nodes (3): getDefaultSchoolAppList(), launchAccountPicker(), queryInstalledLauncherApps()

### Community 18 - ".parse"
Cohesion: 0.22
Nodes (3): ClassroomDateParser, ParsedDate, ClassroomDateParserTest

### Community 22 - "WhatsAppChatExportParserTest.kt"
Cohesion: 0.22
Nodes (3): ImportedNoticeRecord, WhatsAppChatExportParser, WhatsAppChatExportParserTest

### Community 24 - "GestureDescription"
Cohesion: 0.27
Nodes (3): GestureResultCallback, GestureResultCallback, GestureResultCallback

### Community 27 - "MainActivity.kt"
Cohesion: 0.20
Nodes (4): AppScreen, DASHBOARD, DIAGNOSTICS, WIZARD

### Community 28 - "DriveDeepLogger.kt"
Cohesion: 0.24
Nodes (5): DeviceInfo, DiagnosticSnapshot, DriveDeepLogger, PipelineMetrics, StepStatus

### Community 30 - "ChildProfile"
Cohesion: 0.28
Nodes (3): ChildCard(), ChildrenGridDashboard(), KidsTheme()

### Community 34 - "WizardStep"
Cohesion: 0.33
Nodes (6): WizardStep, STEP_0_PERMISSIONS, STEP_1_VAULT, STEP_2_CLASSROOM, STEP_3_PORTALS, STEP_4_WHATSAPP

## Knowledge Gaps
- **34 isolated node(s):** `DeviceInfo`, `PipelineMetrics`, `StepStatus`, `CloudHealthReport`, `NoticeFtsEntity` (+29 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 228 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **49 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `KidsAccessibilityService` connect `KidsAccessibilityService` to `ContentClassifier`, `Intent`, `FloatingCrawlerOverlay`, `GoogleDriveSharedHarvester`, `OnboardingWizardScreen`, `KidsAccessibilityService.kt`, `OnboardingWizardScreen.kt`, `ShareTargetActivity.kt`, `.matchesAttachmentChipText`, `assertthat`?**
  _High betweenness centrality (0.230) - this node is a cross-community bridge._
- **Why does `GoogleDriveSharedHarvester` connect `GoogleDriveSharedHarvester` to `KidsAccessibilityService`, `OnboardingWizardScreen`, `KidsAccessibilityService.kt`, `ShareTargetActivity.kt`, `Test`, `assertthat`, `.findBestCandidate`, `dispatchers`, `DriveVaultManager.kt`?**
  _High betweenness centrality (0.097) - this node is a cross-community bridge._
- **Why does `FloatingCrawlerOverlay` connect `FloatingCrawlerOverlay` to `KidsAccessibilityService`?**
  _High betweenness centrality (0.063) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `KidsAccessibilityService` (e.g. with `ContentClassifier` and `DeduplicationEngine`) actually correct?**
  _`KidsAccessibilityService` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Are the 2 inferred relationships involving `GoogleDriveSharedHarvester` (e.g. with `.runDeepCrawlLoop()` and `.startDirectDriveHarvest()`) actually correct?**
  _`GoogleDriveSharedHarvester` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `DeviceInfo`, `PipelineMetrics`, `StepStatus` to the rest of the system?**
  _34 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `KidsAccessibilityService` be split into smaller, more focused modules?**
  _Cohesion score 0.07076176250933533 - nodes in this community are weakly interconnected._