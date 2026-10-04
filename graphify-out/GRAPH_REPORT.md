# Graph Report - K.I.D.S  (2026-10-04)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 1070 nodes · 2777 edges · 64 communities (22 shown, 42 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 36 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `e881551a`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- KidsAccessibilityService
- GoogleDriveSharedHarvester
- Test
- FloatingCrawlerOverlay
- Query
- GoogleDriveClient
- ci_watch.py
- SafVaultManager.kt
- KidsAccessibilityService.kt
- InternalAppDiagnosticsMirror.kt
- GoogleDriveClient.kt
- OnboardingWizardScreen.kt
- StreamManifest
- DriveSyncWorker
- ContentCategory
- KotlinGraphifyEngine.kt
- MainActivity.kt
- .mirrorAllInternalDataToDrive
- OnboardingWizardScreen
- MLKitOcrParser.kt
- Models.kt
- ChildProfile
- DeduplicationEngine
- PrivacyFilterTest
- WhatsAppChatExportParserTest.kt
- Entities.kt
- DiagnosticFeedScreen
- Intent
- WizardStep
- GestureResultCallback

## God Nodes (most connected - your core abstractions)
1. `KidsAccessibilityService` - 121 edges
2. `GoogleDriveSharedHarvester` - 119 edges
3. `FloatingCrawlerOverlay` - 44 edges
4. `GoogleDriveClient` - 37 edges
5. `OnboardingWizardScreen()` - 26 edges
6. `DriveVaultManager` - 24 edges
7. `CrawlerTraceLogger` - 22 edges
8. `DriveAttachmentMatcherTest` - 22 edges
9. `NoticeDao` - 22 edges
10. `StreamManifest` - 21 edges

## Surprising Connections (you probably didn't know these)
- `DownloadFolderObserver` --calls--> `DeduplicationEngine`  [INFERRED]
  app/src/main/java/com/kids/collector/data/drive/DownloadFolderObserver.kt → app/src/main/java/com/kids/collector/domain/dedupe/DeduplicationEngine.kt
- `KidsAccessibilityService` --calls--> `ContentClassifier`  [INFERRED]
  app/src/main/java/com/kids/collector/service/KidsAccessibilityService.kt → app/src/main/java/com/kids/collector/domain/classifier/ContentClassifier.kt
- `KidsAccessibilityService` --calls--> `DeduplicationEngine`  [INFERRED]
  app/src/main/java/com/kids/collector/service/KidsAccessibilityService.kt → app/src/main/java/com/kids/collector/domain/dedupe/DeduplicationEngine.kt
- `DriveSyncWorker` --calls--> `KotlinGraphifyEngine`  [INFERRED]
  app/src/main/java/com/kids/collector/service/DriveSyncWorker.kt → app/src/main/java/com/kids/collector/domain/graph/KotlinGraphifyEngine.kt
- `OnboardingWizardScreen()` --calls--> `ChildProfile`  [INFERRED]
  app/src/main/java/com/kids/collector/presentation/wizard/OnboardingWizardScreen.kt → app/src/main/java/com/kids/collector/domain/model/Models.kt

## Import Cycles
- None detected.

## Communities (64 total, 42 thin omitted)

### Community 0 - "KidsAccessibilityService"
Cohesion: 0.06
Nodes (6): DownloadFolderObserver, CrawlerTraceLogger, ExtractedAttachmentDetail, KidsAccessibilityService, UnvisitedCard, VisiblePendingCard

### Community 2 - "Test"
Cohesion: 0.05
Nodes (6): ClassroomDateParser, ParsedDate, AttachmentChipMatcherTest, ClassroomDateParserTest, DriveAttachmentMatcherTest, StreamManifestAndCardTest

### Community 3 - "FloatingCrawlerOverlay"
Cohesion: 0.06
Nodes (7): FloatingCrawlerOverlay, GestureResultCallback, GestureResultCallback, GestureResultCallback, GestureResultCallback, GestureResultCallback, GestureResultCallback

### Community 4 - "Query"
Cohesion: 0.06
Nodes (4): AttachmentDao, ChildProfileDao, NoticeDao, KidsDatabase

### Community 5 - "GoogleDriveClient"
Cohesion: 0.08
Nodes (8): DriveVaultManager, Failure, ProvisionStep1Result, Success, UserConsentRequired, DriveQuotaInfo, GoogleDriveClient, DriveVaultManagerTest

### Community 6 - "ci_watch.py"
Cohesion: 0.06
Nodes (21): Converters, ChannelConfig, diagnose_failure(), get_latest_run(), main(), monitor_workflow(), run_cmd(), sync_local_graph() (+13 more)

### Community 7 - "SafVaultManager.kt"
Cohesion: 0.08
Nodes (8): SafVaultFolders, SafVaultManager, MLKitOcrParser, OcrExtractionResult, NotificationParser, ParsedNotification, ShareTargetActivity, NotificationParserTest

### Community 9 - "InternalAppDiagnosticsMirror.kt"
Cohesion: 0.08
Nodes (3): DeviceInfo, PipelineMetrics, StepStatus

### Community 11 - "GoogleDriveClient.kt"
Cohesion: 0.08
Nodes (9): ChannelVaultFolders, ChildVaultFolders, Dual WhatsApp Catch-Up Engine, 5-Point Cloud Health Probe, Google Credential Manager API, Memory Boundary Privacy Filter, K.I.D.S. Android Collector (PRD), Sequential 4-Step Onboarding (+1 more)

### Community 12 - "OnboardingWizardScreen.kt"
Cohesion: 0.10
Nodes (3): getDefaultSchoolAppList(), launchAccountPicker(), queryInstalledLauncherApps()

### Community 13 - "StreamManifest"
Cohesion: 0.13
Nodes (8): StreamItemStatus, ALREADY_SYNCED, COMPLETED, FAILED_SKIPPED, IN_PROGRESS, PENDING, StreamManifest, StreamManifestItem

### Community 14 - "DriveSyncWorker"
Cohesion: 0.12
Nodes (3): DriveSyncWorker, DiagnosticSnapshot, DriveDeepLogger

### Community 16 - "ContentCategory"
Cohesion: 0.12
Nodes (8): ContentClassifier, ContentCategory, ATTENDANCE, CIRCULAR, FEES, HOMEWORK, UNKNOWN, ContentClassifierTest

### Community 17 - "KotlinGraphifyEngine.kt"
Cohesion: 0.22
Nodes (7): GraphEdge, GraphNode, KnowledgeGraph, KotlinGraphifyEngine, Attachment, Notice, KnowledgeGraphBuilderTest

### Community 18 - "MainActivity.kt"
Cohesion: 0.14
Nodes (6): AppScreen, DASHBOARD, DIAGNOSTICS, WIZARD, MainActivity, KidsTheme()

### Community 20 - "OnboardingWizardScreen"
Cohesion: 0.33
Nodes (3): PermissionHelper, PermissionSetupDialog(), OnboardingWizardScreen()

### Community 22 - "Models.kt"
Cohesion: 0.15
Nodes (11): ChannelType, FILE_IMPORT, GOOGLE_CLASSROOM, SCHOOL_ERP, WHATSAPP, CloudHealthReport, SyncStatus, DROPPED (+3 more)

### Community 23 - "ChildProfile"
Cohesion: 0.26
Nodes (3): ChildProfile, MultiChildRouter, MultiChildAttributionTest

### Community 26 - "WhatsAppChatExportParserTest.kt"
Cohesion: 0.22
Nodes (3): ImportedNoticeRecord, WhatsAppChatExportParser, WhatsAppChatExportParserTest

### Community 27 - "Entities.kt"
Cohesion: 0.22
Nodes (4): AttachmentEntity, ChildProfileEntity, NoticeEntity, NoticeFtsEntity

### Community 29 - "DiagnosticFeedScreen"
Cohesion: 0.32
Nodes (5): ProbeItem, ChildCard(), ChildrenGridDashboard(), DiagnosticFeedScreen(), LogLine

### Community 31 - "WizardStep"
Cohesion: 0.33
Nodes (6): WizardStep, STEP_0_PERMISSIONS, STEP_1_VAULT, STEP_2_CLASSROOM, STEP_3_PORTALS, STEP_4_WHATSAPP

## Knowledge Gaps
- **35 isolated node(s):** `CloudHealthReport`, `ChildProfileEntity`, `NoticeFtsEntity`, `DeviceInfo`, `PipelineMetrics` (+30 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 226 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **42 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `KidsAccessibilityService` connect `KidsAccessibilityService` to `Test`, `FloatingCrawlerOverlay`, `SafVaultManager.kt`, `KidsAccessibilityService.kt`, `OnboardingWizardScreen.kt`, `DriveVaultManager.kt`, `ContentCategory`, `MainActivity.kt`, `ChildProfile`, `DeduplicationEngine`, `Intent`?**
  _High betweenness centrality (0.247) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `KidsAccessibilityService` (e.g. with `ContentClassifier` and `DeduplicationEngine`) actually correct?**
  _`KidsAccessibilityService` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `CloudHealthReport`, `ChildProfileEntity`, `NoticeFtsEntity` to the rest of the system?**
  _35 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `KidsAccessibilityService` be split into smaller, more focused modules?**
  _Cohesion score 0.05610236220472441 - nodes in this community are weakly interconnected._
- **Why does `KidsDatabase` connect `Query` to `KidsAccessibilityService`?**
  _High betweenness centrality (0.134) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `GoogleDriveSharedHarvester` (e.g. with `.runDeepCrawlLoop()` and `.startDirectDriveHarvest()`) actually correct?**
  _`GoogleDriveSharedHarvester` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Should `GoogleDriveSharedHarvester` be split into smaller, more focused modules?**
  _Cohesion score 0.06756756756756757 - nodes in this community are weakly interconnected._