# Graph Report - K.I.D.S  (2026-10-02)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 956 nodes · 2355 edges · 57 communities (22 shown, 35 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 35 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `a244e3bb`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- KidsAccessibilityService
- GoogleDriveSharedHarvester
- FloatingCrawlerOverlay
- OnboardingWizardScreen
- Query
- ci_watch.py
- SafVaultManager.kt
- Test
- GoogleDriveClient
- StreamManifest
- GoogleDriveClient.kt
- ShareTargetActivity.kt
- OnboardingWizardScreen.kt
- DriveSyncWorker.kt
- KotlinGraphifyEngine.kt
- .matchesAttachmentChipText
- MLKitOcrParser.kt
- ContentCategory
- log
- Models.kt
- MainActivity.kt
- ChildProfile
- PrivacyFilterTest
- GestureDescription
- DriveDeepLogger.kt
- WhatsAppChatExportParser
- ChildProfile
- Intent
- WizardStep

## God Nodes (most connected - your core abstractions)
1. `KidsAccessibilityService` - 107 edges
2. `GoogleDriveSharedHarvester` - 88 edges
3. `FloatingCrawlerOverlay` - 44 edges
4. `GoogleDriveClient` - 32 edges
5. `OnboardingWizardScreen()` - 25 edges
6. `CrawlerTraceLogger` - 23 edges
7. `DriveVaultManager` - 23 edges
8. `DriveAttachmentMatcherTest` - 20 edges
9. `ChildProfile` - 18 edges
10. `NoticeDao` - 18 edges

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

## Communities (57 total, 35 thin omitted)

### Community 0 - "KidsAccessibilityService"
Cohesion: 0.07
Nodes (4): ExtractedAttachmentDetail, KidsAccessibilityService, UnvisitedCard, VisiblePendingCard

### Community 1 - "GoogleDriveSharedHarvester"
Cohesion: 0.08
Nodes (3): CrawlerTraceLogger, DriveSharedItem, GoogleDriveSharedHarvester

### Community 2 - "FloatingCrawlerOverlay"
Cohesion: 0.06
Nodes (7): FloatingCrawlerOverlay, GestureResultCallback, GestureResultCallback, GestureResultCallback, GestureResultCallback, GestureResultCallback, GestureResultCallback

### Community 3 - "OnboardingWizardScreen"
Cohesion: 0.09
Nodes (12): DriveVaultManager, Failure, ProvisionStep1Result, Success, UserConsentRequired, ProbeItem, PermissionHelper, PermissionSetupDialog() (+4 more)

### Community 4 - "Query"
Cohesion: 0.07
Nodes (4): AttachmentDao, ChildProfileDao, NoticeDao, KidsDatabase

### Community 5 - "ci_watch.py"
Cohesion: 0.06
Nodes (17): AttachmentEntity, ChildProfileEntity, NoticeEntity, NoticeFtsEntity, Converters, ChannelConfig, diagnose_failure(), get_latest_run() (+9 more)

### Community 6 - "SafVaultManager.kt"
Cohesion: 0.09
Nodes (8): SafVaultFolders, SafVaultManager, MLKitOcrParser, OcrExtractionResult, NotificationParser, ParsedNotification, ShareTargetActivity, NotificationParserTest

### Community 7 - "Test"
Cohesion: 0.10
Nodes (4): ClassroomDateParser, ParsedDate, ClassroomDateParserTest, DriveAttachmentMatcherTest

### Community 8 - "GoogleDriveClient"
Cohesion: 0.08
Nodes (6): ChannelVaultFolders, ChildVaultFolders, DriveQuotaInfo, GoogleDriveClient, DeduplicationEngine, DeduplicationHashTest

### Community 9 - "StreamManifest"
Cohesion: 0.08
Nodes (9): StreamItemStatus, ALREADY_SYNCED, COMPLETED, FAILED_SKIPPED, IN_PROGRESS, PENDING, StreamManifest, StreamManifestItem (+1 more)

### Community 11 - "GoogleDriveClient.kt"
Cohesion: 0.09
Nodes (7): Dual WhatsApp Catch-Up Engine, 5-Point Cloud Health Probe, Google Credential Manager API, Memory Boundary Privacy Filter, K.I.D.S. Android Collector (PRD), Sequential 4-Step Onboarding, Streaming PdfRenderer OCR

### Community 13 - "OnboardingWizardScreen.kt"
Cohesion: 0.12
Nodes (3): getDefaultSchoolAppList(), launchAccountPicker(), queryInstalledLauncherApps()

### Community 15 - "KotlinGraphifyEngine.kt"
Cohesion: 0.22
Nodes (7): GraphEdge, GraphNode, KnowledgeGraph, KotlinGraphifyEngine, Attachment, Notice, KnowledgeGraphBuilderTest

### Community 19 - "ContentCategory"
Cohesion: 0.15
Nodes (8): ContentClassifier, ContentCategory, ATTENDANCE, CIRCULAR, FEES, HOMEWORK, UNKNOWN, ContentClassifierTest

### Community 21 - "Models.kt"
Cohesion: 0.15
Nodes (11): ChannelType, FILE_IMPORT, GOOGLE_CLASSROOM, SCHOOL_ERP, WHATSAPP, CloudHealthReport, SyncStatus, DROPPED (+3 more)

### Community 22 - "MainActivity.kt"
Cohesion: 0.15
Nodes (4): AppScreen, DASHBOARD, DIAGNOSTICS, WIZARD

### Community 23 - "ChildProfile"
Cohesion: 0.26
Nodes (3): ChildProfile, MultiChildRouter, MultiChildAttributionTest

### Community 25 - "GestureDescription"
Cohesion: 0.27
Nodes (3): GestureResultCallback, GestureResultCallback, GestureResultCallback

### Community 28 - "DriveDeepLogger.kt"
Cohesion: 0.24
Nodes (5): DeviceInfo, DiagnosticSnapshot, DriveDeepLogger, PipelineMetrics, StepStatus

### Community 29 - "WhatsAppChatExportParser"
Cohesion: 0.25
Nodes (3): ImportedNoticeRecord, WhatsAppChatExportParser, WhatsAppChatExportParserTest

### Community 30 - "ChildProfile"
Cohesion: 0.28
Nodes (3): ChildCard(), ChildrenGridDashboard(), KidsTheme()

### Community 34 - "WizardStep"
Cohesion: 0.33
Nodes (6): WizardStep, STEP_0_PERMISSIONS, STEP_1_VAULT, STEP_2_CLASSROOM, STEP_3_PORTALS, STEP_4_WHATSAPP

## Knowledge Gaps
- **35 isolated node(s):** `CloudHealthReport`, `DeviceInfo`, `PipelineMetrics`, `StepStatus`, `AttachmentEntity` (+30 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 222 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **35 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `KidsAccessibilityService` connect `KidsAccessibilityService` to `assertthat`, `Intent`, `FloatingCrawlerOverlay`, `OnboardingWizardScreen`, `GoogleDriveClient`, `KidsAccessibilityService.kt`, `OnboardingWizardScreen.kt`, `.matchesAttachmentChipText`, `ContentCategory`, `ChildProfile`?**
  _High betweenness centrality (0.241) - this node is a cross-community bridge._
- **Why does `GoogleDriveSharedHarvester` connect `GoogleDriveSharedHarvester` to `KidsAccessibilityService`, `KidsAccessibilityService.kt`, `ShareTargetActivity.kt`, `Test`?**
  _High betweenness centrality (0.122) - this node is a cross-community bridge._
- **Why does `FloatingCrawlerOverlay` connect `FloatingCrawlerOverlay` to `KidsAccessibilityService`?**
  _High betweenness centrality (0.065) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `KidsAccessibilityService` (e.g. with `ContentClassifier` and `DeduplicationEngine`) actually correct?**
  _`KidsAccessibilityService` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Are the 2 inferred relationships involving `GoogleDriveSharedHarvester` (e.g. with `.runDeepCrawlLoop()` and `.startDirectDriveHarvest()`) actually correct?**
  _`GoogleDriveSharedHarvester` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `CloudHealthReport`, `DeviceInfo`, `PipelineMetrics` to the rest of the system?**
  _35 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `KidsAccessibilityService` be split into smaller, more focused modules?**
  _Cohesion score 0.07313131313131313 - nodes in this community are weakly interconnected._