# Graph Report - K.I.D.S  (2026-10-02)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 963 nodes · 2392 edges · 76 communities (24 shown, 52 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 38 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `e8beeb2d`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- KidsAccessibilityService
- AccessibilityNodeInfo
- Query
- OnboardingWizardScreen
- Test
- GoogleDriveClient
- StreamManifest
- ci_watch.py
- NotificationParserTest.kt
- OnboardingWizardScreen.kt
- FloatingCrawlerOverlay
- SafVaultManager.kt
- ShareTargetActivity.kt
- .log
- GestureDescription
- DriveSyncWorker.kt
- .matchesAttachmentChipText
- KotlinGraphifyEngine
- Models.kt
- MainActivity.kt
- ChildProfile
- assertthat
- .processPostDetailAndDownload
- KotlinGraphifyEngine.kt
- DeduplicationEngine
- PrivacyFilterTest
- .fallbackNativeScroll
- GestureDescription
- WhatsAppChatExportParser.kt
- DriveDeepLogger.kt
- K.I.D.S. Android Collector (PRD)
- log
- ChildProfile
- ContentCategory
- WizardStep
- Intent
- ContentClassifierTest
- WhatsAppChatExportParserTest

## God Nodes (most connected - your core abstractions)
1. `KidsAccessibilityService` - 107 edges
2. `GoogleDriveSharedHarvester` - 93 edges
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
- `DriveSyncWorker` --calls--> `KotlinGraphifyEngine`  [INFERRED]
  app/src/main/java/com/kids/collector/service/DriveSyncWorker.kt → app/src/main/java/com/kids/collector/domain/graph/KotlinGraphifyEngine.kt

## Import Cycles
- None detected.

## Communities (76 total, 52 thin omitted)

### Community 0 - "KidsAccessibilityService"
Cohesion: 0.07
Nodes (4): ExtractedAttachmentDetail, KidsAccessibilityService, UnvisitedCard, VisiblePendingCard

### Community 2 - "Query"
Cohesion: 0.07
Nodes (4): AttachmentDao, ChildProfileDao, NoticeDao, KidsDatabase

### Community 3 - "OnboardingWizardScreen"
Cohesion: 0.11
Nodes (11): DriveVaultManager, Failure, ProvisionStep1Result, Success, UserConsentRequired, PermissionHelper, PermissionSetupDialog(), DiagnosticFeedScreen() (+3 more)

### Community 4 - "Test"
Cohesion: 0.10
Nodes (4): ClassroomDateParser, ParsedDate, ClassroomDateParserTest, DriveAttachmentMatcherTest

### Community 5 - "GoogleDriveClient"
Cohesion: 0.08
Nodes (4): ChannelVaultFolders, ChildVaultFolders, DriveQuotaInfo, GoogleDriveClient

### Community 6 - "StreamManifest"
Cohesion: 0.08
Nodes (9): StreamItemStatus, ALREADY_SYNCED, COMPLETED, FAILED_SKIPPED, IN_PROGRESS, PENDING, StreamManifest, StreamManifestItem (+1 more)

### Community 7 - "ci_watch.py"
Cohesion: 0.12
Nodes (11): diagnose_failure(), get_latest_run(), main(), monitor_workflow(), run_cmd(), sync_local_graph(), verify_release(), check_file() (+3 more)

### Community 8 - "NotificationParserTest.kt"
Cohesion: 0.12
Nodes (5): MLKitOcrParser, OcrExtractionResult, NotificationParser, ParsedNotification, NotificationParserTest

### Community 9 - "OnboardingWizardScreen.kt"
Cohesion: 0.10
Nodes (3): getDefaultSchoolAppList(), launchAccountPicker(), queryInstalledLauncherApps()

### Community 11 - "SafVaultManager.kt"
Cohesion: 0.23
Nodes (3): SafVaultFolders, SafVaultManager, ShareTargetActivity

### Community 14 - "GestureDescription"
Cohesion: 0.16
Nodes (4): GestureResultCallback, GestureResultCallback, GestureResultCallback, GestureResultCallback

### Community 20 - "KotlinGraphifyEngine"
Cohesion: 0.25
Nodes (5): KnowledgeGraph, KotlinGraphifyEngine, Attachment, Notice, KnowledgeGraphBuilderTest

### Community 21 - "Models.kt"
Cohesion: 0.14
Nodes (12): ChannelType, FILE_IMPORT, GOOGLE_CLASSROOM, SCHOOL_ERP, WHATSAPP, CloudHealthReport, ProbeItem, SyncStatus (+4 more)

### Community 23 - "MainActivity.kt"
Cohesion: 0.18
Nodes (5): AppScreen, DASHBOARD, DIAGNOSTICS, WIZARD, MainActivity

### Community 24 - "ChildProfile"
Cohesion: 0.26
Nodes (3): ChildProfile, MultiChildRouter, MultiChildAttributionTest

### Community 26 - ".processPostDetailAndDownload"
Cohesion: 0.20
Nodes (4): AttachmentEntity, ChildProfileEntity, NoticeEntity, NoticeFtsEntity

### Community 27 - "KotlinGraphifyEngine.kt"
Cohesion: 0.24
Nodes (4): Converters, GraphEdge, GraphNode, ChannelConfig

### Community 31 - "GestureDescription"
Cohesion: 0.27
Nodes (3): GestureResultCallback, GestureResultCallback, GestureResultCallback

### Community 33 - "WhatsAppChatExportParser.kt"
Cohesion: 0.24
Nodes (3): ImportedNoticeRecord, WhatsAppChatExportParser, Dual WhatsApp Catch-Up Engine

### Community 34 - "DriveDeepLogger.kt"
Cohesion: 0.24
Nodes (5): DeviceInfo, DiagnosticSnapshot, DriveDeepLogger, PipelineMetrics, StepStatus

### Community 35 - "K.I.D.S. Android Collector (PRD)"
Cohesion: 0.22
Nodes (6): 5-Point Cloud Health Probe, Google Credential Manager API, Memory Boundary Privacy Filter, K.I.D.S. Android Collector (PRD), Sequential 4-Step Onboarding, Streaming PdfRenderer OCR

### Community 37 - "ChildProfile"
Cohesion: 0.28
Nodes (3): ChildCard(), ChildrenGridDashboard(), KidsTheme()

### Community 40 - "ContentCategory"
Cohesion: 0.33
Nodes (6): ContentCategory, ATTENDANCE, CIRCULAR, FEES, HOMEWORK, UNKNOWN

### Community 41 - "WizardStep"
Cohesion: 0.33
Nodes (6): WizardStep, STEP_0_PERMISSIONS, STEP_1_VAULT, STEP_2_CLASSROOM, STEP_3_PORTALS, STEP_4_WHATSAPP

## Knowledge Gaps
- **34 isolated node(s):** `CloudHealthReport`, `NoticeFtsEntity`, `DeviceInfo`, `PipelineMetrics`, `StepStatus` (+29 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 226 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **52 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `KidsAccessibilityService` connect `KidsAccessibilityService` to `AccessibilityNodeInfo`, `OnboardingWizardScreen`, `OnboardingWizardScreen.kt`, `FloatingCrawlerOverlay`, `ShareTargetActivity.kt`, `DriveVaultManager.kt`, `.matchesAttachmentChipText`, `KidsAccessibilityService.kt`, `ChildProfile`, `assertthat`, `.processPostDetailAndDownload`, `DeduplicationEngine`?**
  _High betweenness centrality (0.231) - this node is a cross-community bridge._
- **Why does `GoogleDriveSharedHarvester` connect `AccessibilityNodeInfo` to `KidsAccessibilityService`, `Test`, `NotificationParserTest.kt`, `ShareTargetActivity.kt`, `DriveVaultManager.kt`, `MainActivity.kt`?**
  _High betweenness centrality (0.097) - this node is a cross-community bridge._
- **Why does `FloatingCrawlerOverlay` connect `FloatingCrawlerOverlay` to `KidsAccessibilityService`, `.performControlledDragGesture`, `.performMicroScrollGesture`, `GestureDescription`, `FloatingCrawlerOverlay.kt`, `.fallbackNativeScroll`?**
  _High betweenness centrality (0.064) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `KidsAccessibilityService` (e.g. with `ContentClassifier` and `DeduplicationEngine`) actually correct?**
  _`KidsAccessibilityService` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Are the 2 inferred relationships involving `GoogleDriveSharedHarvester` (e.g. with `.runDeepCrawlLoop()` and `.startDirectDriveHarvest()`) actually correct?**
  _`GoogleDriveSharedHarvester` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `CloudHealthReport`, `NoticeFtsEntity`, `DeviceInfo` to the rest of the system?**
  _34 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `KidsAccessibilityService` be split into smaller, more focused modules?**
  _Cohesion score 0.0669652855543113 - nodes in this community are weakly interconnected._