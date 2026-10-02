# Graph Report - K.I.D.S  (2026-10-02)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 973 nodes · 2432 edges · 63 communities (23 shown, 40 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 38 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `14cc42bc`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- KidsAccessibilityService
- GoogleDriveSharedHarvester
- FloatingCrawlerOverlay
- Query
- MLKitOcrParser.kt
- Test
- DriveVaultManager
- ci_watch.py
- GoogleDriveClient
- StreamManifest
- OnboardingWizardScreen.kt
- KotlinGraphifyEngine.kt
- ShareTargetActivity.kt
- .matchesAttachmentChipText
- DriveSyncWorker.kt
- ContentCategory
- OnboardingWizardScreen
- WhatsAppChatExportParser.kt
- Models.kt
- MainActivity.kt
- DeduplicationEngine
- PrivacyFilterTest
- ChildProfile
- GestureDescription
- DriveDeepLogger.kt
- K.I.D.S. Android Collector (PRD)
- log
- ChildProfile
- dispatchers
- Intent
- WizardStep
- DiagnosticFeedScreen

## God Nodes (most connected - your core abstractions)
1. `KidsAccessibilityService` - 113 edges
2. `GoogleDriveSharedHarvester` - 96 edges
3. `FloatingCrawlerOverlay` - 44 edges
4. `GoogleDriveClient` - 32 edges
5. `OnboardingWizardScreen()` - 25 edges
6. `DriveVaultManager` - 23 edges
7. `CrawlerTraceLogger` - 22 edges
8. `DriveAttachmentMatcherTest` - 22 edges
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

## Communities (63 total, 40 thin omitted)

### Community 0 - "KidsAccessibilityService"
Cohesion: 0.06
Nodes (6): NoticeEntity, CrawlerTraceLogger, ExtractedAttachmentDetail, KidsAccessibilityService, UnvisitedCard, VisiblePendingCard

### Community 2 - "FloatingCrawlerOverlay"
Cohesion: 0.06
Nodes (7): FloatingCrawlerOverlay, GestureResultCallback, GestureResultCallback, GestureResultCallback, GestureResultCallback, GestureResultCallback, GestureResultCallback

### Community 3 - "Query"
Cohesion: 0.07
Nodes (4): AttachmentDao, ChildProfileDao, NoticeDao, KidsDatabase

### Community 4 - "MLKitOcrParser.kt"
Cohesion: 0.07
Nodes (8): SafVaultFolders, SafVaultManager, MLKitOcrParser, OcrExtractionResult, NotificationParser, ParsedNotification, ShareTargetActivity, NotificationParserTest

### Community 5 - "Test"
Cohesion: 0.10
Nodes (4): ClassroomDateParser, ParsedDate, ClassroomDateParserTest, DriveAttachmentMatcherTest

### Community 6 - "DriveVaultManager"
Cohesion: 0.13
Nodes (6): DriveVaultManager, Failure, ProvisionStep1Result, Success, UserConsentRequired, DriveVaultManagerTest

### Community 7 - "ci_watch.py"
Cohesion: 0.07
Nodes (16): AttachmentEntity, ChildProfileEntity, NoticeFtsEntity, Converters, ChannelConfig, diagnose_failure(), get_latest_run(), main() (+8 more)

### Community 8 - "GoogleDriveClient"
Cohesion: 0.08
Nodes (4): ChannelVaultFolders, ChildVaultFolders, DriveQuotaInfo, GoogleDriveClient

### Community 9 - "StreamManifest"
Cohesion: 0.08
Nodes (9): StreamItemStatus, ALREADY_SYNCED, COMPLETED, FAILED_SKIPPED, IN_PROGRESS, PENDING, StreamManifest, StreamManifestItem (+1 more)

### Community 11 - "OnboardingWizardScreen.kt"
Cohesion: 0.10
Nodes (3): getDefaultSchoolAppList(), launchAccountPicker(), queryInstalledLauncherApps()

### Community 13 - "KotlinGraphifyEngine.kt"
Cohesion: 0.22
Nodes (7): GraphEdge, GraphNode, KnowledgeGraph, KotlinGraphifyEngine, Attachment, Notice, KnowledgeGraphBuilderTest

### Community 18 - "ContentCategory"
Cohesion: 0.14
Nodes (8): ContentClassifier, ContentCategory, ATTENDANCE, CIRCULAR, FEES, HOMEWORK, UNKNOWN, ContentClassifierTest

### Community 19 - "OnboardingWizardScreen"
Cohesion: 0.35
Nodes (3): PermissionHelper, PermissionSetupDialog(), OnboardingWizardScreen()

### Community 20 - "WhatsAppChatExportParser.kt"
Cohesion: 0.16
Nodes (4): ImportedNoticeRecord, WhatsAppChatExportParser, WhatsAppChatExportParserTest, Dual WhatsApp Catch-Up Engine

### Community 21 - "Models.kt"
Cohesion: 0.15
Nodes (11): ChannelType, FILE_IMPORT, GOOGLE_CLASSROOM, SCHOOL_ERP, WHATSAPP, CloudHealthReport, SyncStatus, DROPPED (+3 more)

### Community 22 - "MainActivity.kt"
Cohesion: 0.18
Nodes (5): AppScreen, DASHBOARD, DIAGNOSTICS, WIZARD, MainActivity

### Community 25 - "ChildProfile"
Cohesion: 0.27
Nodes (3): ChildProfile, MultiChildRouter, MultiChildAttributionTest

### Community 26 - "GestureDescription"
Cohesion: 0.27
Nodes (3): GestureResultCallback, GestureResultCallback, GestureResultCallback

### Community 27 - "DriveDeepLogger.kt"
Cohesion: 0.24
Nodes (5): DeviceInfo, DiagnosticSnapshot, DriveDeepLogger, PipelineMetrics, StepStatus

### Community 28 - "K.I.D.S. Android Collector (PRD)"
Cohesion: 0.22
Nodes (6): 5-Point Cloud Health Probe, Google Credential Manager API, Memory Boundary Privacy Filter, K.I.D.S. Android Collector (PRD), Sequential 4-Step Onboarding, Streaming PdfRenderer OCR

### Community 30 - "ChildProfile"
Cohesion: 0.28
Nodes (3): ChildCard(), ChildrenGridDashboard(), KidsTheme()

### Community 35 - "WizardStep"
Cohesion: 0.33
Nodes (6): WizardStep, STEP_0_PERMISSIONS, STEP_1_VAULT, STEP_2_CLASSROOM, STEP_3_PORTALS, STEP_4_WHATSAPP

### Community 36 - "DiagnosticFeedScreen"
Cohesion: 0.50
Nodes (3): ProbeItem, DiagnosticFeedScreen(), LogLine

## Knowledge Gaps
- **34 isolated node(s):** `CloudHealthReport`, `DeviceInfo`, `PipelineMetrics`, `StepStatus`, `NoticeFtsEntity` (+29 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 226 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **40 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `KidsAccessibilityService` connect `KidsAccessibilityService` to `assertthat`, `FloatingCrawlerOverlay`, `Intent`, `MLKitOcrParser.kt`, `OnboardingWizardScreen.kt`, `DriveVaultManager.kt`, `.matchesAttachmentChipText`, `KidsAccessibilityService.kt`, `ContentCategory`, `DeduplicationEngine`?**
  _High betweenness centrality (0.242) - this node is a cross-community bridge._
- **Why does `GoogleDriveSharedHarvester` connect `GoogleDriveSharedHarvester` to `KidsAccessibilityService`, `DriveVaultManager.kt`, `Test`, `ShareTargetActivity.kt`?**
  _High betweenness centrality (0.125) - this node is a cross-community bridge._
- **Why does `FloatingCrawlerOverlay` connect `FloatingCrawlerOverlay` to `KidsAccessibilityService`?**
  _High betweenness centrality (0.063) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `KidsAccessibilityService` (e.g. with `ContentClassifier` and `DeduplicationEngine`) actually correct?**
  _`KidsAccessibilityService` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Are the 2 inferred relationships involving `GoogleDriveSharedHarvester` (e.g. with `.runDeepCrawlLoop()` and `.startDirectDriveHarvest()`) actually correct?**
  _`GoogleDriveSharedHarvester` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `CloudHealthReport`, `DeviceInfo`, `PipelineMetrics` to the rest of the system?**
  _34 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `KidsAccessibilityService` be split into smaller, more focused modules?**
  _Cohesion score 0.06056089960709931 - nodes in this community are weakly interconnected._