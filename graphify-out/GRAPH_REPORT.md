# Graph Report - K.I.D.S  (2026-10-01)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 947 nodes · 2317 edges · 59 communities (22 shown, 37 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 36 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `8d620cbc`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- KidsAccessibilityService
- GoogleDriveSharedHarvester
- FloatingCrawlerOverlay
- Query
- OnboardingWizardScreen
- Test
- ci_watch.py
- GoogleDriveClient
- StreamManifest
- SafVaultManager.kt
- OnboardingWizardScreen.kt
- MainActivity.kt
- KotlinGraphifyEngine.kt
- ShareTargetActivity.kt
- assertthat
- .matchesAttachmentChipText
- MLKitOcrParser.kt
- NotificationParserTest.kt
- DriveSyncWorker.kt
- ContentCategory
- Models.kt
- ChildProfile
- WhatsAppChatExportParserTest.kt
- GestureDescription
- DriveDeepLogger.kt
- K.I.D.S. Android Collector (PRD)
- log
- ChildProfile
- Intent
- WizardStep
- ContentClassifierTest

## God Nodes (most connected - your core abstractions)
1. `KidsAccessibilityService` - 107 edges
2. `GoogleDriveSharedHarvester` - 87 edges
3. `FloatingCrawlerOverlay` - 44 edges
4. `GoogleDriveClient` - 32 edges
5. `OnboardingWizardScreen()` - 25 edges
6. `DriveVaultManager` - 23 edges
7. `DriveAttachmentMatcherTest` - 20 edges
8. `CrawlerTraceLogger` - 19 edges
9. `ChildProfile` - 18 edges
10. `NoticeDao` - 18 edges

## Surprising Connections (you probably didn't know these)
- `KidsAccessibilityService` --calls--> `ContentClassifier`  [INFERRED]
  app/src/main/java/com/kids/collector/service/KidsAccessibilityService.kt → app/src/main/java/com/kids/collector/domain/classifier/ContentClassifier.kt
- `KidsAccessibilityService` --calls--> `DeduplicationEngine`  [INFERRED]
  app/src/main/java/com/kids/collector/service/KidsAccessibilityService.kt → app/src/main/java/com/kids/collector/domain/dedupe/DeduplicationEngine.kt
- `DownloadFolderObserver` --calls--> `DeduplicationEngine`  [INFERRED]
  app/src/main/java/com/kids/collector/data/drive/DownloadFolderObserver.kt → app/src/main/java/com/kids/collector/domain/dedupe/DeduplicationEngine.kt
- `DriveSyncWorker` --calls--> `KotlinGraphifyEngine`  [INFERRED]
  app/src/main/java/com/kids/collector/service/DriveSyncWorker.kt → app/src/main/java/com/kids/collector/domain/graph/KotlinGraphifyEngine.kt
- `DriveSyncWorker` --calls--> `DriveDeepLogger`  [INFERRED]
  app/src/main/java/com/kids/collector/service/DriveSyncWorker.kt → app/src/main/java/com/kids/collector/telemetry/DriveDeepLogger.kt

## Import Cycles
- None detected.

## Communities (59 total, 37 thin omitted)

### Community 0 - "KidsAccessibilityService"
Cohesion: 0.06
Nodes (5): CrawlerTraceLogger, ExtractedAttachmentDetail, KidsAccessibilityService, UnvisitedCard, VisiblePendingCard

### Community 2 - "FloatingCrawlerOverlay"
Cohesion: 0.06
Nodes (7): FloatingCrawlerOverlay, GestureResultCallback, GestureResultCallback, GestureResultCallback, GestureResultCallback, GestureResultCallback, GestureResultCallback

### Community 3 - "Query"
Cohesion: 0.07
Nodes (4): AttachmentDao, ChildProfileDao, NoticeDao, KidsDatabase

### Community 4 - "OnboardingWizardScreen"
Cohesion: 0.09
Nodes (14): ChildProfileEntity, DriveVaultManager, Failure, ProvisionStep1Result, Success, UserConsentRequired, ChildVaultFolders, ProbeItem (+6 more)

### Community 5 - "Test"
Cohesion: 0.10
Nodes (4): ClassroomDateParser, ParsedDate, ClassroomDateParserTest, DriveAttachmentMatcherTest

### Community 6 - "ci_watch.py"
Cohesion: 0.07
Nodes (16): AttachmentEntity, NoticeEntity, NoticeFtsEntity, Converters, ChannelConfig, diagnose_failure(), get_latest_run(), main() (+8 more)

### Community 7 - "GoogleDriveClient"
Cohesion: 0.09
Nodes (3): ChannelVaultFolders, DriveQuotaInfo, GoogleDriveClient

### Community 8 - "StreamManifest"
Cohesion: 0.08
Nodes (9): StreamItemStatus, ALREADY_SYNCED, COMPLETED, FAILED_SKIPPED, IN_PROGRESS, PENDING, StreamManifest, StreamManifestItem (+1 more)

### Community 9 - "SafVaultManager.kt"
Cohesion: 0.12
Nodes (5): SafVaultFolders, SafVaultManager, DeduplicationEngine, ShareTargetActivity, DeduplicationHashTest

### Community 11 - "OnboardingWizardScreen.kt"
Cohesion: 0.10
Nodes (3): getDefaultSchoolAppList(), launchAccountPicker(), queryInstalledLauncherApps()

### Community 12 - "MainActivity.kt"
Cohesion: 0.13
Nodes (6): DownloadFolderObserver, AppScreen, DASHBOARD, DIAGNOSTICS, WIZARD, MainActivity

### Community 13 - "KotlinGraphifyEngine.kt"
Cohesion: 0.22
Nodes (7): GraphEdge, GraphNode, KnowledgeGraph, KotlinGraphifyEngine, Attachment, Notice, KnowledgeGraphBuilderTest

### Community 19 - "NotificationParserTest.kt"
Cohesion: 0.19
Nodes (3): NotificationParser, ParsedNotification, NotificationParserTest

### Community 21 - "ContentCategory"
Cohesion: 0.16
Nodes (8): ContentClassifier, ContentCategory, ATTENDANCE, CIRCULAR, FEES, HOMEWORK, UNKNOWN, Dual WhatsApp Catch-Up Engine

### Community 22 - "Models.kt"
Cohesion: 0.15
Nodes (11): ChannelType, FILE_IMPORT, GOOGLE_CLASSROOM, SCHOOL_ERP, WHATSAPP, CloudHealthReport, SyncStatus, DROPPED (+3 more)

### Community 23 - "ChildProfile"
Cohesion: 0.26
Nodes (3): ChildProfile, MultiChildRouter, MultiChildAttributionTest

### Community 25 - "WhatsAppChatExportParserTest.kt"
Cohesion: 0.22
Nodes (3): ImportedNoticeRecord, WhatsAppChatExportParser, WhatsAppChatExportParserTest

### Community 26 - "GestureDescription"
Cohesion: 0.27
Nodes (3): GestureResultCallback, GestureResultCallback, GestureResultCallback

### Community 28 - "DriveDeepLogger.kt"
Cohesion: 0.24
Nodes (5): DeviceInfo, DiagnosticSnapshot, DriveDeepLogger, PipelineMetrics, StepStatus

### Community 29 - "K.I.D.S. Android Collector (PRD)"
Cohesion: 0.22
Nodes (6): 5-Point Cloud Health Probe, Google Credential Manager API, Memory Boundary Privacy Filter, K.I.D.S. Android Collector (PRD), Sequential 4-Step Onboarding, Streaming PdfRenderer OCR

### Community 31 - "ChildProfile"
Cohesion: 0.28
Nodes (3): ChildCard(), ChildrenGridDashboard(), KidsTheme()

### Community 34 - "WizardStep"
Cohesion: 0.33
Nodes (6): WizardStep, STEP_0_PERMISSIONS, STEP_1_VAULT, STEP_2_CLASSROOM, STEP_3_PORTALS, STEP_4_WHATSAPP

## Knowledge Gaps
- **35 isolated node(s):** `CloudHealthReport`, `DeviceInfo`, `PipelineMetrics`, `StepStatus`, `AttachmentEntity` (+30 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 224 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **37 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `KidsAccessibilityService` connect `KidsAccessibilityService` to `Intent`, `FloatingCrawlerOverlay`, `OnboardingWizardScreen`, `SafVaultManager.kt`, `KidsAccessibilityService.kt`, `OnboardingWizardScreen.kt`, `assertthat`, `.matchesAttachmentChipText`, `ContentCategory`, `ChildProfile`?**
  _High betweenness centrality (0.242) - this node is a cross-community bridge._
- **Why does `GoogleDriveSharedHarvester` connect `GoogleDriveSharedHarvester` to `KidsAccessibilityService`, `Test`, `KidsAccessibilityService.kt`, `MainActivity.kt`, `ShareTargetActivity.kt`, `MLKitOcrParser.kt`?**
  _High betweenness centrality (0.122) - this node is a cross-community bridge._
- **Why does `ChildProfile` connect `ChildProfile` to `KidsAccessibilityService`, `OnboardingWizardScreen`, `KotlinGraphifyEngine.kt`, `ShareTargetActivity.kt`, `Models.kt`?**
  _High betweenness centrality (0.065) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `KidsAccessibilityService` (e.g. with `ContentClassifier` and `DeduplicationEngine`) actually correct?**
  _`KidsAccessibilityService` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Are the 2 inferred relationships involving `GoogleDriveSharedHarvester` (e.g. with `.runDeepCrawlLoop()` and `.startDirectDriveHarvest()`) actually correct?**
  _`GoogleDriveSharedHarvester` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `CloudHealthReport`, `DeviceInfo`, `PipelineMetrics` to the rest of the system?**
  _35 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `KidsAccessibilityService` be split into smaller, more focused modules?**
  _Cohesion score 0.06115531977600943 - nodes in this community are weakly interconnected._