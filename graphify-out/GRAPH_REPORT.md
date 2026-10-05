# Graph Report - K.I.D.S  (2026-10-05)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 1142 nodes · 2965 edges · 77 communities (22 shown, 55 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 37 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `292af027`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- GoogleDriveSharedHarvester
- KidsAccessibilityService
- Query
- ci_watch.py
- DriveAttachmentMatcherTest
- StreamManifest
- GoogleDriveSearchHarvester
- GoogleDriveClient
- ChildrenGridDashboard.kt
- DriveVaultManager
- SafVaultManager.kt
- FloatingCrawlerOverlay.kt
- OnboardingWizardScreen.kt
- DriveSyncWorker.kt
- CrawlerTraceLogger
- GestureDescription
- ChildProfile
- MainActivity.kt
- FloatingCrawlerOverlay
- AttachmentChipMatcherTest
- ContentCategory
- .mirrorAllInternalDataToDrive
- WhatsAppChatExportParser.kt
- OnboardingWizardScreen
- NotificationParserTest.kt
- MLKitOcrParser.kt
- .parse
- .onNotificationPosted
- Models.kt
- GoogleDriveClient.kt
- .provisionStep1
- assertthat
- log
- DriveDeepLogger.kt
- K.I.D.S. Android Collector (PRD)
- DeduplicationEngine
- .fallbackNativeScrollBackward
- WizardStep
- DeduplicationHashTest.kt
- AppScreen
- GestureResultCallback

## God Nodes (most connected - your core abstractions)
1. `GoogleDriveSharedHarvester` - 125 edges
2. `KidsAccessibilityService` - 124 edges
3. `FloatingCrawlerOverlay` - 46 edges
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
- `KidsAccessibilityService` --calls--> `ScreenWakeLockManager`  [INFERRED]
  app/src/main/java/com/kids/collector/service/KidsAccessibilityService.kt → app/src/main/java/com/kids/collector/service/ScreenWakeLockManager.kt
- `ShareTargetActivity` --calls--> `DeduplicationEngine`  [INFERRED]
  app/src/main/java/com/kids/collector/presentation/share/ShareTargetActivity.kt → app/src/main/java/com/kids/collector/domain/dedupe/DeduplicationEngine.kt

## Import Cycles
- None detected.

## Communities (77 total, 55 thin omitted)

### Community 1 - "KidsAccessibilityService"
Cohesion: 0.06
Nodes (5): NoticeEntity, ExtractedAttachmentDetail, KidsAccessibilityService, UnvisitedCard, VisiblePendingCard

### Community 2 - "Query"
Cohesion: 0.06
Nodes (4): AttachmentDao, ChildProfileDao, NoticeDao, KidsDatabase

### Community 3 - "ci_watch.py"
Cohesion: 0.06
Nodes (24): AttachmentEntity, ChildProfileEntity, NoticeFtsEntity, Converters, ChannelConfig, diagnose_failure(), get_latest_run(), main() (+16 more)

### Community 6 - "StreamManifest"
Cohesion: 0.09
Nodes (9): StreamItemStatus, ALREADY_SYNCED, COMPLETED, FAILED_SKIPPED, IN_PROGRESS, PENDING, StreamManifest, StreamManifestItem (+1 more)

### Community 10 - "DriveVaultManager"
Cohesion: 0.26
Nodes (3): DriveVaultManager, ChildVaultFolders, DiagnosticFeedScreen()

### Community 11 - "SafVaultManager.kt"
Cohesion: 0.19
Nodes (3): SafVaultFolders, SafVaultManager, ShareTargetActivity

### Community 13 - "OnboardingWizardScreen.kt"
Cohesion: 0.10
Nodes (3): getDefaultSchoolAppList(), launchAccountPicker(), queryInstalledLauncherApps()

### Community 16 - "GestureDescription"
Cohesion: 0.15
Nodes (5): GestureResultCallback, GestureResultCallback, GestureResultCallback, GestureResultCallback, GestureResultCallback

### Community 17 - "ChildProfile"
Cohesion: 0.24
Nodes (8): GraphEdge, GraphNode, KnowledgeGraph, KotlinGraphifyEngine, Attachment, ChildProfile, Notice, KnowledgeGraphBuilderTest

### Community 18 - "MainActivity.kt"
Cohesion: 0.15
Nodes (4): ChildCard(), ChildrenGridDashboard(), MainActivity, KidsTheme()

### Community 22 - "ContentCategory"
Cohesion: 0.14
Nodes (8): ContentClassifier, ContentCategory, ATTENDANCE, CIRCULAR, FEES, HOMEWORK, UNKNOWN, ContentClassifierTest

### Community 24 - "WhatsAppChatExportParser.kt"
Cohesion: 0.15
Nodes (4): ImportedNoticeRecord, WhatsAppChatExportParser, WhatsAppChatExportParserTest, Dual WhatsApp Catch-Up Engine

### Community 25 - "OnboardingWizardScreen"
Cohesion: 0.30
Nodes (3): PermissionHelper, PermissionSetupDialog(), OnboardingWizardScreen()

### Community 26 - "NotificationParserTest.kt"
Cohesion: 0.19
Nodes (3): NotificationParser, ParsedNotification, NotificationParserTest

### Community 28 - ".parse"
Cohesion: 0.24
Nodes (3): ClassroomDateParser, ParsedDate, ClassroomDateParserTest

### Community 30 - "Models.kt"
Cohesion: 0.14
Nodes (12): ChannelType, FILE_IMPORT, GOOGLE_CLASSROOM, SCHOOL_ERP, WHATSAPP, CloudHealthReport, ProbeItem, SyncStatus (+4 more)

### Community 33 - ".provisionStep1"
Cohesion: 0.27
Nodes (5): Failure, ProvisionStep1Result, Success, UserConsentRequired, DriveVaultManagerTest

### Community 36 - "DriveDeepLogger.kt"
Cohesion: 0.24
Nodes (5): DeviceInfo, DiagnosticSnapshot, DriveDeepLogger, PipelineMetrics, StepStatus

### Community 37 - "K.I.D.S. Android Collector (PRD)"
Cohesion: 0.22
Nodes (6): 5-Point Cloud Health Probe, Google Credential Manager API, Memory Boundary Privacy Filter, K.I.D.S. Android Collector (PRD), Sequential 4-Step Onboarding, Streaming PdfRenderer OCR

### Community 39 - "DeduplicationEngine"
Cohesion: 0.29
Nodes (3): DownloadFolderObserver, DeduplicationEngine, KidsNotificationListenerService

### Community 41 - "WizardStep"
Cohesion: 0.33
Nodes (6): WizardStep, STEP_0_PERMISSIONS, STEP_1_VAULT, STEP_2_CLASSROOM, STEP_3_PORTALS, STEP_4_WHATSAPP

### Community 43 - "AppScreen"
Cohesion: 0.50
Nodes (4): AppScreen, DASHBOARD, DIAGNOSTICS, WIZARD

## Knowledge Gaps
- **35 isolated node(s):** `ChildProfileEntity`, `NoticeFtsEntity`, `CloudHealthReport`, `DeviceInfo`, `PipelineMetrics` (+30 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 230 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **55 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `KidsAccessibilityService` connect `KidsAccessibilityService` to `GoogleDriveSharedHarvester`, `assertthat`, `log`, `KidsAccessibilityService.kt`, `DeduplicationEngine`, `FloatingCrawlerOverlay.kt`, `OnboardingWizardScreen.kt`, `MainActivity.kt`, `FloatingCrawlerOverlay`, `ContentCategory`, `.mirrorAllInternalDataToDrive`?**
  _High betweenness centrality (0.229) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `GoogleDriveSharedHarvester` (e.g. with `.runDeepCrawlLoop()` and `.startDirectDriveHarvest()`) actually correct?**
  _`GoogleDriveSharedHarvester` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `ChildProfileEntity`, `NoticeFtsEntity`, `CloudHealthReport` to the rest of the system?**
  _35 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `GoogleDriveSharedHarvester` be split into smaller, more focused modules?**
  _Cohesion score 0.0665266106442577 - nodes in this community are weakly interconnected._
- **Why does `GoogleDriveSharedHarvester` connect `GoogleDriveSharedHarvester` to `KidsAccessibilityService`, `FloatingCrawlerOverlay`, `KidsAccessibilityService.kt`, `DriveAttachmentMatcherTest`?**
  _High betweenness centrality (0.150) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `KidsAccessibilityService` (e.g. with `ContentClassifier` and `DeduplicationEngine`) actually correct?**
  _`KidsAccessibilityService` has 3 INFERRED edges - model-reasoned connections that need verification._
- **Should `KidsAccessibilityService` be split into smaller, more focused modules?**
  _Cohesion score 0.06176911544227886 - nodes in this community are weakly interconnected._