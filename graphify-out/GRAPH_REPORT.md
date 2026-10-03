# Graph Report - K.I.D.S  (2026-10-03)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 989 nodes · 2505 edges · 60 communities (21 shown, 39 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 37 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `f354b2f3`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- KidsAccessibilityService
- GoogleDriveSharedHarvester
- FloatingCrawlerOverlay
- GoogleDriveClient
- Test
- Query
- ci_watch.py
- MLKitOcrParser.kt
- StreamManifest
- OnboardingWizardScreen.kt
- SafVaultManager.kt
- ChildrenGridDashboard.kt
- KotlinGraphifyEngine.kt
- .matchesAttachmentChipText
- DriveSyncWorker.kt
- MainActivity.kt
- OnboardingWizardScreen
- ShareTargetActivity.kt
- ContentCategory
- WhatsAppChatExportParser.kt
- CrawlerTraceLogger.kt
- Models.kt
- ChildProfile
- DeduplicationEngine
- log
- GestureDescription
- ChildProfile
- Intent
- WizardStep
- ContentClassifierTest

## God Nodes (most connected - your core abstractions)
1. `KidsAccessibilityService` - 113 edges
2. `GoogleDriveSharedHarvester` - 112 edges
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
- `ShareTargetActivity` --calls--> `DeduplicationEngine`  [INFERRED]
  app/src/main/java/com/kids/collector/presentation/share/ShareTargetActivity.kt → app/src/main/java/com/kids/collector/domain/dedupe/DeduplicationEngine.kt
- `DiagnosticFeedScreen()` --calls--> `ProbeItem`  [INFERRED]
  app/src/main/java/com/kids/collector/presentation/telemetry/DiagnosticFeedScreen.kt → app/src/main/java/com/kids/collector/domain/model/Models.kt
- `DriveSyncWorker` --calls--> `KotlinGraphifyEngine`  [INFERRED]
  app/src/main/java/com/kids/collector/service/DriveSyncWorker.kt → app/src/main/java/com/kids/collector/domain/graph/KotlinGraphifyEngine.kt

## Import Cycles
- None detected.

## Communities (60 total, 39 thin omitted)

### Community 0 - "KidsAccessibilityService"
Cohesion: 0.06
Nodes (6): NoticeEntity, CrawlerTraceLogger, ExtractedAttachmentDetail, KidsAccessibilityService, UnvisitedCard, VisiblePendingCard

### Community 2 - "FloatingCrawlerOverlay"
Cohesion: 0.06
Nodes (7): FloatingCrawlerOverlay, GestureResultCallback, GestureResultCallback, GestureResultCallback, GestureResultCallback, GestureResultCallback, GestureResultCallback

### Community 3 - "GoogleDriveClient"
Cohesion: 0.08
Nodes (10): DriveVaultManager, Failure, ProvisionStep1Result, Success, UserConsentRequired, ChannelVaultFolders, ChildVaultFolders, DriveQuotaInfo (+2 more)

### Community 4 - "Test"
Cohesion: 0.06
Nodes (6): ClassroomDateParser, ParsedDate, PrivacyFilter, ClassroomDateParserTest, DriveAttachmentMatcherTest, PrivacyFilterTest

### Community 5 - "Query"
Cohesion: 0.07
Nodes (4): AttachmentDao, ChildProfileDao, NoticeDao, KidsDatabase

### Community 6 - "ci_watch.py"
Cohesion: 0.05
Nodes (21): AttachmentEntity, ChildProfileEntity, NoticeFtsEntity, Converters, ChannelConfig, DeviceInfo, DiagnosticSnapshot, DriveDeepLogger (+13 more)

### Community 7 - "MLKitOcrParser.kt"
Cohesion: 0.07
Nodes (11): MLKitOcrParser, OcrExtractionResult, NotificationParser, ParsedNotification, NotificationParserTest, 5-Point Cloud Health Probe, Google Credential Manager API, Memory Boundary Privacy Filter (+3 more)

### Community 8 - "StreamManifest"
Cohesion: 0.08
Nodes (9): StreamItemStatus, ALREADY_SYNCED, COMPLETED, FAILED_SKIPPED, IN_PROGRESS, PENDING, StreamManifest, StreamManifestItem (+1 more)

### Community 9 - "OnboardingWizardScreen.kt"
Cohesion: 0.09
Nodes (3): getDefaultSchoolAppList(), launchAccountPicker(), queryInstalledLauncherApps()

### Community 10 - "SafVaultManager.kt"
Cohesion: 0.18
Nodes (3): SafVaultFolders, SafVaultManager, ShareTargetActivity

### Community 11 - "ChildrenGridDashboard.kt"
Cohesion: 0.14
Nodes (3): ProbeItem, DiagnosticFeedScreen(), LogLine

### Community 13 - "KotlinGraphifyEngine.kt"
Cohesion: 0.22
Nodes (7): GraphEdge, GraphNode, KnowledgeGraph, KotlinGraphifyEngine, Attachment, Notice, KnowledgeGraphBuilderTest

### Community 17 - "MainActivity.kt"
Cohesion: 0.14
Nodes (5): AppScreen, DASHBOARD, DIAGNOSTICS, WIZARD, MainActivity

### Community 18 - "OnboardingWizardScreen"
Cohesion: 0.35
Nodes (3): PermissionHelper, PermissionSetupDialog(), OnboardingWizardScreen()

### Community 20 - "ContentCategory"
Cohesion: 0.19
Nodes (7): ContentClassifier, ContentCategory, ATTENDANCE, CIRCULAR, FEES, HOMEWORK, UNKNOWN

### Community 21 - "WhatsAppChatExportParser.kt"
Cohesion: 0.16
Nodes (4): ImportedNoticeRecord, WhatsAppChatExportParser, WhatsAppChatExportParserTest, Dual WhatsApp Catch-Up Engine

### Community 23 - "Models.kt"
Cohesion: 0.15
Nodes (11): ChannelType, FILE_IMPORT, GOOGLE_CLASSROOM, SCHOOL_ERP, WHATSAPP, CloudHealthReport, SyncStatus, DROPPED (+3 more)

### Community 24 - "ChildProfile"
Cohesion: 0.24
Nodes (3): ChildProfile, MultiChildRouter, MultiChildAttributionTest

### Community 28 - "GestureDescription"
Cohesion: 0.27
Nodes (3): GestureResultCallback, GestureResultCallback, GestureResultCallback

### Community 29 - "ChildProfile"
Cohesion: 0.28
Nodes (3): ChildCard(), ChildrenGridDashboard(), KidsTheme()

### Community 32 - "WizardStep"
Cohesion: 0.33
Nodes (6): WizardStep, STEP_0_PERMISSIONS, STEP_1_VAULT, STEP_2_CLASSROOM, STEP_3_PORTALS, STEP_4_WHATSAPP

## Knowledge Gaps
- **35 isolated node(s):** `CloudHealthReport`, `AttachmentEntity`, `NoticeFtsEntity`, `DeviceInfo`, `PipelineMetrics` (+30 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 227 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **39 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `KidsAccessibilityService` connect `KidsAccessibilityService` to `FloatingCrawlerOverlay`, `Test`, `OnboardingWizardScreen.kt`, `SafVaultManager.kt`, `DriveVaultManager.kt`, `.matchesAttachmentChipText`, `KidsAccessibilityService.kt`, `ContentCategory`, `DeduplicationEngine`, `Intent`?**
  _High betweenness centrality (0.237) - this node is a cross-community bridge._
- **Why does `GoogleDriveSharedHarvester` connect `GoogleDriveSharedHarvester` to `KidsAccessibilityService`, `ShareTargetActivity.kt`, `DriveVaultManager.kt`, `Test`?**
  _High betweenness centrality (0.153) - this node is a cross-community bridge._
- **Why does `FloatingCrawlerOverlay` connect `FloatingCrawlerOverlay` to `KidsAccessibilityService`?**
  _High betweenness centrality (0.061) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `KidsAccessibilityService` (e.g. with `ContentClassifier` and `DeduplicationEngine`) actually correct?**
  _`KidsAccessibilityService` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Are the 2 inferred relationships involving `GoogleDriveSharedHarvester` (e.g. with `.runDeepCrawlLoop()` and `.startDirectDriveHarvest()`) actually correct?**
  _`GoogleDriveSharedHarvester` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `CloudHealthReport`, `AttachmentEntity`, `NoticeFtsEntity` to the rest of the system?**
  _35 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `KidsAccessibilityService` be split into smaller, more focused modules?**
  _Cohesion score 0.06056089960709931 - nodes in this community are weakly interconnected._