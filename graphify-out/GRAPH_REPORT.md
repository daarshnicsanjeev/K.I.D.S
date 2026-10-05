# Graph Report - K.I.D.S  (2026-10-05)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 1069 nodes · 2618 edges · 73 communities (21 shown, 52 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 37 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `c30e474e`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- GoogleDriveSharedHarvester
- GoogleDriveClient
- Query
- InternalAppDiagnosticsMirror.kt
- ci_watch.py
- DriveAttachmentMatcherTest
- StreamManifest
- MLKitOcrParser.kt
- GoogleDriveClient.kt
- GoogleDriveSearchHarvester
- CrawlerTraceLogger
- KidsAccessibilityService.kt
- GoogleDriveSharedHarvester.kt
- ShareTargetActivity.kt
- OnboardingWizardScreen.kt
- runDeepCrawlLoop
- GestureDescription
- ChildProfile
- FloatingCrawlerOverlay
- AttachmentChipMatcherTest
- ChildrenGridDashboard.kt
- assertthat
- Entities.kt
- ScreenWakeLockManager.kt
- Models.kt
- NotificationParserTest.kt
- MainActivity.kt
- dispatchers
- AccessibilityNodeInfo
- PrivacyFilterTest
- ContentClassifier
- .fallbackNativeScroll
- ContentCategory
- WizardStep
- ContentClassifierTest
- ChildrenGridDashboard
- KidsTheme.kt
- MultiChildAttributionTest

## God Nodes (most connected - your core abstractions)
1. `GoogleDriveSharedHarvester` - 125 edges
2. `FloatingCrawlerOverlay` - 46 edges
3. `GoogleDriveClient` - 39 edges
4. `GoogleDriveSearchHarvester` - 36 edges
5. `DriveVaultManager` - 25 edges
6. `OnboardingWizardScreen()` - 25 edges
7. `CrawlerTraceLogger` - 24 edges
8. `AttachmentDao` - 22 edges
9. `NoticeDao` - 22 edges
10. `DriveAttachmentMatcherTest` - 22 edges

## Surprising Connections (you probably didn't know these)
- `processPostDetailAndDownload()` --calls--> `AttachmentEntity`  [INFERRED]
  app/src/main/java/com/kids/collector/service/KidsAccessibilityService.kt → app/src/main/java/com/kids/collector/data/db/Entities.kt
- `processPostDetailAndDownload()` --calls--> `NoticeEntity`  [INFERRED]
  app/src/main/java/com/kids/collector/service/KidsAccessibilityService.kt → app/src/main/java/com/kids/collector/data/db/Entities.kt
- `DiagnosticFeedScreen()` --calls--> `ProbeItem`  [INFERRED]
  app/src/main/java/com/kids/collector/presentation/telemetry/DiagnosticFeedScreen.kt → app/src/main/java/com/kids/collector/domain/model/Models.kt
- `runDeepCrawlLoop()` --calls--> `GoogleDriveSharedHarvester`  [INFERRED]
  app/src/main/java/com/kids/collector/service/KidsAccessibilityService.kt → app/src/main/java/com/kids/collector/service/GoogleDriveSharedHarvester.kt
- `startDirectDriveHarvest()` --calls--> `GoogleDriveSharedHarvester`  [INFERRED]
  app/src/main/java/com/kids/collector/service/KidsAccessibilityService.kt → app/src/main/java/com/kids/collector/service/GoogleDriveSharedHarvester.kt

## Import Cycles
- None detected.

## Communities (73 total, 52 thin omitted)

### Community 1 - "GoogleDriveClient"
Cohesion: 0.06
Nodes (12): DriveVaultManager, Failure, ProvisionStep1Result, Success, UserConsentRequired, ChildVaultFolders, GoogleDriveClient, PermissionHelper (+4 more)

### Community 2 - "Query"
Cohesion: 0.06
Nodes (4): AttachmentDao, ChildProfileDao, NoticeDao, KidsDatabase

### Community 3 - "InternalAppDiagnosticsMirror.kt"
Cohesion: 0.06
Nodes (9): DriveSyncWorker, isEnabled(), DeviceInfo, DiagnosticSnapshot, DriveDeepLogger, PipelineMetrics, StepStatus, InternalAppDiagnosticsMirror (+1 more)

### Community 4 - "ci_watch.py"
Cohesion: 0.09
Nodes (19): diagnose_failure(), get_latest_run(), main(), monitor_workflow(), run_cmd(), sync_local_graph(), verify_release(), dump_ui_xml() (+11 more)

### Community 6 - "StreamManifest"
Cohesion: 0.09
Nodes (9): StreamItemStatus, ALREADY_SYNCED, COMPLETED, FAILED_SKIPPED, IN_PROGRESS, PENDING, StreamManifest, StreamManifestItem (+1 more)

### Community 7 - "MLKitOcrParser.kt"
Cohesion: 0.10
Nodes (5): SafVaultFolders, SafVaultManager, MLKitOcrParser, OcrExtractionResult, ShareTargetActivity

### Community 8 - "GoogleDriveClient.kt"
Cohesion: 0.06
Nodes (12): ChannelVaultFolders, DriveQuotaInfo, ImportedNoticeRecord, WhatsAppChatExportParser, WhatsAppChatExportParserTest, Dual WhatsApp Catch-Up Engine, 5-Point Cloud Health Probe, Google Credential Manager API (+4 more)

### Community 11 - "KidsAccessibilityService.kt"
Cohesion: 0.10
Nodes (10): calculateDynamicChipSearchScrollLimit(), calculateDynamicDetailDiscoveryScrollBudget(), calculateDynamicWakeSettleDelayMs(), calculateDynamicWakeViewerTimeoutMs(), createCaptureNotificationChannel(), fastWakeAttachmentsInDrive(), matchesAttachmentChipText(), processPostDetailAndDownload() (+2 more)

### Community 12 - "GoogleDriveSharedHarvester.kt"
Cohesion: 0.12
Nodes (3): ClassroomDateParser, ParsedDate, ClassroomDateParserTest

### Community 14 - "OnboardingWizardScreen.kt"
Cohesion: 0.10
Nodes (3): getDefaultSchoolAppList(), launchAccountPicker(), queryInstalledLauncherApps()

### Community 15 - "runDeepCrawlLoop"
Cohesion: 0.17
Nodes (16): checkAndDismissSystemAnr(), ensureAtStreamTop(), getOrCreateOverlay(), handleAppExitEvent(), handleSystemAnrDialogIfPresent(), markAttachmentNonDownloadable(), onAccessibilityEvent(), onServiceConnected() (+8 more)

### Community 16 - "GestureDescription"
Cohesion: 0.15
Nodes (5): GestureResultCallback, GestureResultCallback, GestureResultCallback, GestureResultCallback, GestureResultCallback

### Community 17 - "ChildProfile"
Cohesion: 0.24
Nodes (8): GraphEdge, GraphNode, KnowledgeGraph, KotlinGraphifyEngine, Attachment, ChildProfile, Notice, KnowledgeGraphBuilderTest

### Community 22 - "Entities.kt"
Cohesion: 0.14
Nodes (6): AttachmentEntity, ChildProfileEntity, NoticeEntity, NoticeFtsEntity, Converters, ChannelConfig

### Community 24 - "Models.kt"
Cohesion: 0.14
Nodes (12): ChannelType, FILE_IMPORT, GOOGLE_CLASSROOM, SCHOOL_ERP, WHATSAPP, CloudHealthReport, ProbeItem, SyncStatus (+4 more)

### Community 25 - "NotificationParserTest.kt"
Cohesion: 0.20
Nodes (3): NotificationParser, ParsedNotification, NotificationParserTest

### Community 26 - "MainActivity.kt"
Cohesion: 0.18
Nodes (5): AppScreen, DASHBOARD, DIAGNOSTICS, WIZARD, MainActivity

### Community 29 - "AccessibilityNodeInfo"
Cohesion: 0.33
Nodes (10): automateViewerShareOrDownload(), findExplicitCopyOrDownloadButton(), findGenericShareButton(), findKidsShareTarget(), findKidsShareTargetInAllWindows(), findOverflowMenuButton(), findShareButton(), isKidsVaultLabel() (+2 more)

### Community 32 - "ContentClassifier"
Cohesion: 0.20
Nodes (3): ContentClassifier, MultiChildRouter, KidsNotificationListenerService

### Community 36 - "ContentCategory"
Cohesion: 0.33
Nodes (6): ContentCategory, ATTENDANCE, CIRCULAR, FEES, HOMEWORK, UNKNOWN

### Community 37 - "WizardStep"
Cohesion: 0.33
Nodes (6): WizardStep, STEP_0_PERMISSIONS, STEP_1_VAULT, STEP_2_CLASSROOM, STEP_3_PORTALS, STEP_4_WHATSAPP

## Knowledge Gaps
- **35 isolated node(s):** `ChildProfileEntity`, `NoticeFtsEntity`, `CloudHealthReport`, `DeviceInfo`, `PipelineMetrics` (+30 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 237 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **52 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `GoogleDriveSharedHarvester` connect `GoogleDriveSharedHarvester` to `DriveAttachmentMatcherTest`, `GoogleDriveSharedHarvester.kt`, `ShareTargetActivity.kt`, `runDeepCrawlLoop`, `FloatingCrawlerOverlay`?**
  _High betweenness centrality (0.200) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `GoogleDriveSharedHarvester` (e.g. with `runDeepCrawlLoop()` and `startDirectDriveHarvest()`) actually correct?**
  _`GoogleDriveSharedHarvester` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `ChildProfileEntity`, `NoticeFtsEntity`, `CloudHealthReport` to the rest of the system?**
  _35 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `GoogleDriveSharedHarvester` be split into smaller, more focused modules?**
  _Cohesion score 0.07456213511259382 - nodes in this community are weakly interconnected._
- **Why does `KidsDatabase` connect `Query` to `runDeepCrawlLoop`?**
  _High betweenness centrality (0.077) - this node is a cross-community bridge._
- **Are the 6 inferred relationships involving `GoogleDriveClient` (e.g. with `.preWarmOAuthAndFolders()` and `.provisionStep1()`) actually correct?**
  _`GoogleDriveClient` has 6 INFERRED edges - model-reasoned connections that need verification._
- **Should `GoogleDriveClient` be split into smaller, more focused modules?**
  _Cohesion score 0.055822466254861584 - nodes in this community are weakly interconnected._