# Graph Report - K.I.D.S  (2026-10-04)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 1011 nodes · 2573 edges · 57 communities (21 shown, 36 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 33 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `ee4e6e49`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- KidsAccessibilityService
- GoogleDriveSharedHarvester
- FloatingCrawlerOverlay
- Query
- OnboardingWizardScreen
- GoogleDriveClient
- ci_watch.py
- Test
- MLKitOcrParser.kt
- StreamManifest
- SafVaultManager.kt
- OnboardingWizardScreen.kt
- DriveSyncWorker.kt
- KotlinGraphifyEngine.kt
- ShareTargetActivity.kt
- .matchesAttachmentChipText
- WhatsAppChatExportParser.kt
- Models.kt
- DeduplicationEngine
- MainActivity.kt
- ChildProfile
- assertthat
- PrivacyFilterTest
- GestureDescription
- DriveDeepLogger.kt
- ContentCategory
- log
- ChildProfile
- WizardStep
- Intent
- ContentClassifierTest
- DiagnosticFeedScreen

## God Nodes (most connected - your core abstractions)
1. `GoogleDriveSharedHarvester` - 118 edges
2. `KidsAccessibilityService` - 115 edges
3. `FloatingCrawlerOverlay` - 44 edges
4. `GoogleDriveClient` - 32 edges
5. `OnboardingWizardScreen()` - 26 edges
6. `DriveVaultManager` - 25 edges
7. `CrawlerTraceLogger` - 22 edges
8. `DriveAttachmentMatcherTest` - 22 edges
9. `AttachmentDao` - 21 edges
10. `NoticeDao` - 21 edges

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

## Communities (57 total, 36 thin omitted)

### Community 0 - "KidsAccessibilityService"
Cohesion: 0.06
Nodes (5): CrawlerTraceLogger, ExtractedAttachmentDetail, KidsAccessibilityService, UnvisitedCard, VisiblePendingCard

### Community 2 - "FloatingCrawlerOverlay"
Cohesion: 0.05
Nodes (7): FloatingCrawlerOverlay, GestureResultCallback, GestureResultCallback, GestureResultCallback, GestureResultCallback, GestureResultCallback, GestureResultCallback

### Community 3 - "Query"
Cohesion: 0.07
Nodes (4): AttachmentDao, ChildProfileDao, NoticeDao, KidsDatabase

### Community 4 - "OnboardingWizardScreen"
Cohesion: 0.10
Nodes (9): DriveVaultManager, Failure, ProvisionStep1Result, Success, UserConsentRequired, PermissionHelper, PermissionSetupDialog(), OnboardingWizardScreen() (+1 more)

### Community 5 - "GoogleDriveClient"
Cohesion: 0.08
Nodes (4): ChannelVaultFolders, ChildVaultFolders, DriveQuotaInfo, GoogleDriveClient

### Community 6 - "ci_watch.py"
Cohesion: 0.06
Nodes (17): AttachmentEntity, ChildProfileEntity, NoticeEntity, NoticeFtsEntity, Converters, ChannelConfig, diagnose_failure(), get_latest_run() (+9 more)

### Community 7 - "Test"
Cohesion: 0.10
Nodes (4): ClassroomDateParser, ParsedDate, ClassroomDateParserTest, DriveAttachmentMatcherTest

### Community 8 - "MLKitOcrParser.kt"
Cohesion: 0.06
Nodes (11): MLKitOcrParser, OcrExtractionResult, NotificationParser, ParsedNotification, NotificationParserTest, 5-Point Cloud Health Probe, Google Credential Manager API, Memory Boundary Privacy Filter (+3 more)

### Community 9 - "StreamManifest"
Cohesion: 0.08
Nodes (9): StreamItemStatus, ALREADY_SYNCED, COMPLETED, FAILED_SKIPPED, IN_PROGRESS, PENDING, StreamManifest, StreamManifestItem (+1 more)

### Community 10 - "SafVaultManager.kt"
Cohesion: 0.19
Nodes (3): SafVaultFolders, SafVaultManager, ShareTargetActivity

### Community 13 - "OnboardingWizardScreen.kt"
Cohesion: 0.10
Nodes (3): getDefaultSchoolAppList(), launchAccountPicker(), queryInstalledLauncherApps()

### Community 15 - "KotlinGraphifyEngine.kt"
Cohesion: 0.22
Nodes (7): GraphEdge, GraphNode, KnowledgeGraph, KotlinGraphifyEngine, Attachment, Notice, KnowledgeGraphBuilderTest

### Community 18 - "WhatsAppChatExportParser.kt"
Cohesion: 0.16
Nodes (4): ImportedNoticeRecord, WhatsAppChatExportParser, WhatsAppChatExportParserTest, Dual WhatsApp Catch-Up Engine

### Community 19 - "Models.kt"
Cohesion: 0.14
Nodes (12): ChannelType, FILE_IMPORT, GOOGLE_CLASSROOM, SCHOOL_ERP, WHATSAPP, CloudHealthReport, ProbeItem, SyncStatus (+4 more)

### Community 21 - "MainActivity.kt"
Cohesion: 0.18
Nodes (5): AppScreen, DASHBOARD, DIAGNOSTICS, WIZARD, MainActivity

### Community 22 - "ChildProfile"
Cohesion: 0.24
Nodes (3): ChildProfile, MultiChildRouter, MultiChildAttributionTest

### Community 26 - "GestureDescription"
Cohesion: 0.27
Nodes (3): GestureResultCallback, GestureResultCallback, GestureResultCallback

### Community 27 - "DriveDeepLogger.kt"
Cohesion: 0.24
Nodes (5): DeviceInfo, DiagnosticSnapshot, DriveDeepLogger, PipelineMetrics, StepStatus

### Community 28 - "ContentCategory"
Cohesion: 0.25
Nodes (7): ContentClassifier, ContentCategory, ATTENDANCE, CIRCULAR, FEES, HOMEWORK, UNKNOWN

### Community 30 - "ChildProfile"
Cohesion: 0.28
Nodes (3): ChildCard(), ChildrenGridDashboard(), KidsTheme()

### Community 32 - "WizardStep"
Cohesion: 0.33
Nodes (6): WizardStep, STEP_0_PERMISSIONS, STEP_1_VAULT, STEP_2_CLASSROOM, STEP_3_PORTALS, STEP_4_WHATSAPP

## Knowledge Gaps
- **37 isolated node(s):** `CloudHealthReport`, `DeviceInfo`, `PipelineMetrics`, `StepStatus`, `AttachmentEntity` (+32 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 224 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **36 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `KidsAccessibilityService` connect `KidsAccessibilityService` to `FloatingCrawlerOverlay`, `OnboardingWizardScreen`, `.onUnbind`, `KidsAccessibilityService.kt`, `OnboardingWizardScreen.kt`, `.matchesAttachmentChipText`, `DeduplicationEngine`, `MainActivity.kt`, `assertthat`, `ContentCategory`?**
  _High betweenness centrality (0.291) - this node is a cross-community bridge._
- **Why does `GoogleDriveSharedHarvester` connect `GoogleDriveSharedHarvester` to `KidsAccessibilityService`, `Test`, `KidsAccessibilityService.kt`, `ShareTargetActivity.kt`, `DriveVaultManager.kt`?**
  _High betweenness centrality (0.174) - this node is a cross-community bridge._
- **Why does `KidsDatabase` connect `Query` to `KidsAccessibilityService`?**
  _High betweenness centrality (0.112) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `GoogleDriveSharedHarvester` (e.g. with `.runDeepCrawlLoop()` and `.startDirectDriveHarvest()`) actually correct?**
  _`GoogleDriveSharedHarvester` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Are the 2 inferred relationships involving `KidsAccessibilityService` (e.g. with `ContentClassifier` and `DeduplicationEngine`) actually correct?**
  _`KidsAccessibilityService` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `CloudHealthReport`, `DeviceInfo`, `PipelineMetrics` to the rest of the system?**
  _37 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `KidsAccessibilityService` be split into smaller, more focused modules?**
  _Cohesion score 0.06064240970278555 - nodes in this community are weakly interconnected._