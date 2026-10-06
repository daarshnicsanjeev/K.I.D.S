# Graph Report - K.I.D.S  (2026-10-06)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 1167 nodes · 3047 edges · 73 communities (17 shown, 56 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 38 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `dd191f00`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- KidsAccessibilityService
- GoogleDriveSharedHarvester
- GoogleDriveClient
- Query
- ChildProfile
- ci_watch.py
- DriveAttachmentMatcherTest
- .processSingleUri
- GoogleDriveSearchHarvester
- KidsAccessibilityService.kt
- ChildrenGridDashboard.kt
- OnboardingWizardScreen.kt
- CrawlerTraceLogger
- FloatingCrawlerOverlay.kt
- MainActivity.kt
- GestureDescription
- DriveSyncWorker.kt
- FloatingCrawlerOverlay
- AttachmentChipMatcherTest
- MLKitOcrParser.kt
- StreamManifestAndCardTest
- StreamManifest
- .mirrorAllInternalDataToDrive
- OnboardingWizardScreen
- .parse
- ContentCategory
- PrivacyFilterTest
- .findMatchingNoticeForAttachment
- DeduplicationEngine
- WhatsAppChatExportParser.kt
- log
- DriveDeepLogger.kt
- K.I.D.S. Android Collector (PRD)
- StreamItemStatus
- Test
- .fallbackNativeScrollBackward
- WizardStep
- ContentClassifierTest
- GestureResultCallback
- WhatsAppChatExportParserTest

## God Nodes (most connected - your core abstractions)
1. `KidsAccessibilityService` - 130 edges
2. `GoogleDriveSharedHarvester` - 125 edges
3. `FloatingCrawlerOverlay` - 44 edges
4. `GoogleDriveClient` - 38 edges
5. `GoogleDriveSearchHarvester` - 36 edges
6. `CrawlerTraceLogger` - 23 edges
7. `DriveVaultManager` - 23 edges
8. `StreamManifest` - 23 edges
9. `OnboardingWizardScreen()` - 23 edges
10. `AttachmentDao` - 22 edges

## Surprising Connections (you probably didn't know these)
- `DiagnosticFeedScreen()` --calls--> `ProbeItem`  [INFERRED]
  app/src/main/java/com/kids/collector/presentation/telemetry/DiagnosticFeedScreen.kt → app/src/main/java/com/kids/collector/domain/model/Models.kt
- `KidsAccessibilityService` --calls--> `ContentClassifier`  [INFERRED]
  app/src/main/java/com/kids/collector/service/KidsAccessibilityService.kt → app/src/main/java/com/kids/collector/domain/classifier/ContentClassifier.kt
- `KidsAccessibilityService` --calls--> `DeduplicationEngine`  [INFERRED]
  app/src/main/java/com/kids/collector/service/KidsAccessibilityService.kt → app/src/main/java/com/kids/collector/domain/dedupe/DeduplicationEngine.kt
- `KidsAccessibilityService` --calls--> `ScreenWakeLockManager`  [INFERRED]
  app/src/main/java/com/kids/collector/service/KidsAccessibilityService.kt → app/src/main/java/com/kids/collector/service/ScreenWakeLockManager.kt
- `DriveSyncWorker` --calls--> `KotlinGraphifyEngine`  [INFERRED]
  app/src/main/java/com/kids/collector/service/DriveSyncWorker.kt → app/src/main/java/com/kids/collector/domain/graph/KotlinGraphifyEngine.kt

## Import Cycles
- None detected.

## Communities (73 total, 56 thin omitted)

### Community 0 - "KidsAccessibilityService"
Cohesion: 0.06
Nodes (4): ExtractedAttachmentDetail, KidsAccessibilityService, UnvisitedCard, VisiblePendingCard

### Community 2 - "GoogleDriveClient"
Cohesion: 0.06
Nodes (11): DriveVaultManager, Failure, ProvisionStep1Result, Success, UserConsentRequired, ChannelVaultFolders, ChildVaultFolders, DriveQuotaInfo (+3 more)

### Community 3 - "Query"
Cohesion: 0.06
Nodes (4): AttachmentDao, ChildProfileDao, NoticeDao, KidsDatabase

### Community 4 - "ChildProfile"
Cohesion: 0.05
Nodes (28): AttachmentEntity, ChildProfileEntity, NoticeEntity, NoticeFtsEntity, Converters, GraphEdge, GraphNode, KnowledgeGraph (+20 more)

### Community 5 - "ci_watch.py"
Cohesion: 0.09
Nodes (19): diagnose_failure(), get_latest_run(), main(), monitor_workflow(), run_cmd(), sync_local_graph(), verify_release(), dump_ui_xml() (+11 more)

### Community 7 - ".processSingleUri"
Cohesion: 0.09
Nodes (8): SafVaultFolders, SafVaultManager, MLKitOcrParser, OcrExtractionResult, NotificationParser, ParsedNotification, ShareTargetActivity, NotificationParserTest

### Community 12 - "OnboardingWizardScreen.kt"
Cohesion: 0.10
Nodes (3): getDefaultSchoolAppList(), launchAccountPicker(), queryInstalledLauncherApps()

### Community 15 - "MainActivity.kt"
Cohesion: 0.12
Nodes (8): ChildCard(), ChildrenGridDashboard(), AppScreen, DASHBOARD, DIAGNOSTICS, WIZARD, MainActivity, KidsTheme()

### Community 16 - "GestureDescription"
Cohesion: 0.15
Nodes (5): GestureResultCallback, GestureResultCallback, GestureResultCallback, GestureResultCallback, GestureResultCallback

### Community 24 - "OnboardingWizardScreen"
Cohesion: 0.33
Nodes (3): PermissionHelper, PermissionSetupDialog(), OnboardingWizardScreen()

### Community 25 - ".parse"
Cohesion: 0.24
Nodes (3): ClassroomDateParser, ParsedDate, ClassroomDateParserTest

### Community 26 - "ContentCategory"
Cohesion: 0.18
Nodes (7): ContentClassifier, ContentCategory, ATTENDANCE, CIRCULAR, FEES, HOMEWORK, UNKNOWN

### Community 31 - "WhatsAppChatExportParser.kt"
Cohesion: 0.24
Nodes (3): ImportedNoticeRecord, WhatsAppChatExportParser, Dual WhatsApp Catch-Up Engine

### Community 33 - "DriveDeepLogger.kt"
Cohesion: 0.24
Nodes (5): DeviceInfo, DiagnosticSnapshot, DriveDeepLogger, PipelineMetrics, StepStatus

### Community 34 - "K.I.D.S. Android Collector (PRD)"
Cohesion: 0.22
Nodes (6): 5-Point Cloud Health Probe, Google Credential Manager API, Memory Boundary Privacy Filter, K.I.D.S. Android Collector (PRD), Sequential 4-Step Onboarding, Streaming PdfRenderer OCR

### Community 35 - "StreamItemStatus"
Cohesion: 0.22
Nodes (6): StreamItemStatus, ALREADY_SYNCED, COMPLETED, FAILED_SKIPPED, IN_PROGRESS, PENDING

### Community 39 - "WizardStep"
Cohesion: 0.33
Nodes (6): WizardStep, STEP_0_PERMISSIONS, STEP_1_VAULT, STEP_2_CLASSROOM, STEP_3_PORTALS, STEP_4_WHATSAPP

## Knowledge Gaps
- **35 isolated node(s):** `DeviceInfo`, `PipelineMetrics`, `StepStatus`, `ChildProfileEntity`, `NoticeFtsEntity` (+30 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 230 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **56 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `KidsAccessibilityService` connect `KidsAccessibilityService` to `GoogleDriveSharedHarvester`, `ChildProfile`, `KidsAccessibilityService.kt`, `OnboardingWizardScreen.kt`, `.onUnbind`, `FloatingCrawlerOverlay.kt`, `MainActivity.kt`, `FloatingCrawlerOverlay`, `ContentCategory`, `DeduplicationEngine`?**
  _High betweenness centrality (0.261) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `KidsAccessibilityService` (e.g. with `ContentClassifier` and `DeduplicationEngine`) actually correct?**
  _`KidsAccessibilityService` has 3 INFERRED edges - model-reasoned connections that need verification._
- **What connects `DeviceInfo`, `PipelineMetrics`, `StepStatus` to the rest of the system?**
  _35 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `KidsAccessibilityService` be split into smaller, more focused modules?**
  _Cohesion score 0.058243369318939094 - nodes in this community are weakly interconnected._
- **Why does `KidsDatabase` connect `Query` to `KidsAccessibilityService`?**
  _High betweenness centrality (0.126) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `GoogleDriveSharedHarvester` (e.g. with `.runDeepCrawlLoop()` and `.startDirectDriveHarvest()`) actually correct?**
  _`GoogleDriveSharedHarvester` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Should `GoogleDriveSharedHarvester` be split into smaller, more focused modules?**
  _Cohesion score 0.0653028044980355 - nodes in this community are weakly interconnected._