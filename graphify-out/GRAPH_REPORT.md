# Graph Report - K.I.D.S  (2026-10-01)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 908 nodes · 2187 edges · 66 communities (23 shown, 43 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 35 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `b8c965f0`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- KidsAccessibilityService
- GoogleDriveClient
- GoogleDriveSharedHarvester
- Query
- Test
- StreamManifest
- ChildrenGridDashboard.kt
- SafVaultManager.kt
- FloatingCrawlerOverlay
- GestureDescription
- OnboardingWizardScreen.kt
- ShareTargetActivity.kt
- NotificationParserTest.kt
- .log
- KotlinGraphifyEngine.kt
- MainActivity.kt
- .matchesAttachmentChipText
- DriveSyncWorker.kt
- OnboardingWizardScreen
- ci_watch.py
- Models.kt
- ChildProfile
- assertthat
- log
- PrivacyFilterTest
- GestureDescription
- WhatsAppChatExportParser.kt
- K.I.D.S. Android Collector (PRD)
- Entities.kt
- ContentCategory
- ChildProfile
- DriveDeepLogger.kt
- TypeConverters.kt
- WizardStep
- ContentClassifierTest
- DeduplicationEngine
- BootReceiver.kt
- WhatsAppChatExportParserTest
- KidsApplication.kt

## God Nodes (most connected - your core abstractions)
1. `KidsAccessibilityService` - 106 edges
2. `GoogleDriveSharedHarvester` - 72 edges
3. `FloatingCrawlerOverlay` - 44 edges
4. `GoogleDriveClient` - 30 edges
5. `OnboardingWizardScreen()` - 23 edges
6. `DriveAttachmentMatcherTest` - 20 edges
7. `DriveVaultManager` - 18 edges
8. `CrawlerTraceLogger` - 18 edges
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
- `OnboardingWizardScreen()` --calls--> `ChildProfile`  [INFERRED]
  app/src/main/java/com/kids/collector/presentation/wizard/OnboardingWizardScreen.kt → app/src/main/java/com/kids/collector/domain/model/Models.kt

## Import Cycles
- None detected.

## Communities (66 total, 43 thin omitted)

### Community 0 - "KidsAccessibilityService"
Cohesion: 0.07
Nodes (4): ExtractedAttachmentDetail, KidsAccessibilityService, UnvisitedCard, VisiblePendingCard

### Community 1 - "GoogleDriveClient"
Cohesion: 0.07
Nodes (10): DriveVaultManager, Failure, ProvisionStep1Result, Success, UserConsentRequired, ChannelVaultFolders, ChildVaultFolders, DriveQuotaInfo (+2 more)

### Community 3 - "Query"
Cohesion: 0.07
Nodes (4): AttachmentDao, ChildProfileDao, NoticeDao, KidsDatabase

### Community 4 - "Test"
Cohesion: 0.10
Nodes (4): ClassroomDateParser, ParsedDate, ClassroomDateParserTest, DriveAttachmentMatcherTest

### Community 5 - "StreamManifest"
Cohesion: 0.08
Nodes (9): StreamItemStatus, ALREADY_SYNCED, COMPLETED, FAILED_SKIPPED, IN_PROGRESS, PENDING, StreamManifest, StreamManifestItem (+1 more)

### Community 6 - "ChildrenGridDashboard.kt"
Cohesion: 0.11
Nodes (3): ProbeItem, DiagnosticFeedScreen(), LogLine

### Community 8 - "SafVaultManager.kt"
Cohesion: 0.20
Nodes (3): SafVaultFolders, SafVaultManager, ShareTargetActivity

### Community 10 - "GestureDescription"
Cohesion: 0.14
Nodes (6): GestureResultCallback, GestureResultCallback, GestureResultCallback, GestureResultCallback, GestureResultCallback, GestureResultCallback

### Community 13 - "NotificationParserTest.kt"
Cohesion: 0.14
Nodes (5): MLKitOcrParser, OcrExtractionResult, NotificationParser, ParsedNotification, NotificationParserTest

### Community 15 - "KotlinGraphifyEngine.kt"
Cohesion: 0.22
Nodes (7): GraphEdge, GraphNode, KnowledgeGraph, KotlinGraphifyEngine, Attachment, Notice, KnowledgeGraphBuilderTest

### Community 16 - "MainActivity.kt"
Cohesion: 0.12
Nodes (5): AppScreen, DASHBOARD, DIAGNOSTICS, WIZARD, launchAccountPicker()

### Community 20 - "OnboardingWizardScreen"
Cohesion: 0.35
Nodes (3): PermissionHelper, PermissionSetupDialog(), OnboardingWizardScreen()

### Community 21 - "ci_watch.py"
Cohesion: 0.21
Nodes (7): diagnose_failure(), get_latest_run(), main(), monitor_workflow(), run_cmd(), sync_local_graph(), verify_release()

### Community 23 - "Models.kt"
Cohesion: 0.15
Nodes (11): ChannelType, FILE_IMPORT, GOOGLE_CLASSROOM, SCHOOL_ERP, WHATSAPP, CloudHealthReport, SyncStatus, DROPPED (+3 more)

### Community 24 - "ChildProfile"
Cohesion: 0.26
Nodes (3): ChildProfile, MultiChildRouter, MultiChildAttributionTest

### Community 28 - "GestureDescription"
Cohesion: 0.27
Nodes (3): GestureResultCallback, GestureResultCallback, GestureResultCallback

### Community 31 - "WhatsAppChatExportParser.kt"
Cohesion: 0.24
Nodes (3): ImportedNoticeRecord, WhatsAppChatExportParser, Dual WhatsApp Catch-Up Engine

### Community 32 - "K.I.D.S. Android Collector (PRD)"
Cohesion: 0.22
Nodes (6): 5-Point Cloud Health Probe, Google Credential Manager API, Memory Boundary Privacy Filter, K.I.D.S. Android Collector (PRD), Sequential 4-Step Onboarding, Streaming PdfRenderer OCR

### Community 33 - "Entities.kt"
Cohesion: 0.22
Nodes (4): AttachmentEntity, ChildProfileEntity, NoticeEntity, NoticeFtsEntity

### Community 34 - "ContentCategory"
Cohesion: 0.25
Nodes (7): ContentClassifier, ContentCategory, ATTENDANCE, CIRCULAR, FEES, HOMEWORK, UNKNOWN

### Community 35 - "ChildProfile"
Cohesion: 0.28
Nodes (3): ChildCard(), ChildrenGridDashboard(), KidsTheme()

### Community 37 - "DriveDeepLogger.kt"
Cohesion: 0.28
Nodes (5): DeviceInfo, DiagnosticSnapshot, DriveDeepLogger, PipelineMetrics, StepStatus

### Community 39 - "WizardStep"
Cohesion: 0.33
Nodes (6): WizardStep, STEP_0_PERMISSIONS, STEP_1_VAULT, STEP_2_CLASSROOM, STEP_3_PORTALS, STEP_4_WHATSAPP

## Knowledge Gaps
- **35 isolated node(s):** `CloudHealthReport`, `AttachmentEntity`, `NoticeFtsEntity`, `DeviceInfo`, `PipelineMetrics` (+30 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 214 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **43 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `KidsAccessibilityService` connect `KidsAccessibilityService` to `ContentCategory`, `KidsAccessibilityService.kt`, `SafVaultManager.kt`, `FloatingCrawlerOverlay`, `DeduplicationEngine`, `MainActivity.kt`, `.matchesAttachmentChipText`, `ChildProfile`, `assertthat`?**
  _High betweenness centrality (0.225) - this node is a cross-community bridge._
- **Why does `GoogleDriveSharedHarvester` connect `GoogleDriveSharedHarvester` to `KidsAccessibilityService`, `ShareTargetActivity.kt`, `Test`, `KidsAccessibilityService.kt`?**
  _High betweenness centrality (0.115) - this node is a cross-community bridge._
- **Why does `ChildProfile` connect `ChildProfile` to `KidsAccessibilityService`, `ShareTargetActivity.kt`, `KotlinGraphifyEngine.kt`, `OnboardingWizardScreen`, `Models.kt`?**
  _High betweenness centrality (0.074) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `KidsAccessibilityService` (e.g. with `ContentClassifier` and `DeduplicationEngine`) actually correct?**
  _`KidsAccessibilityService` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Are the 2 inferred relationships involving `GoogleDriveSharedHarvester` (e.g. with `.runDeepCrawlLoop()` and `.startDirectDriveHarvest()`) actually correct?**
  _`GoogleDriveSharedHarvester` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `CloudHealthReport`, `AttachmentEntity`, `NoticeFtsEntity` to the rest of the system?**
  _35 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `KidsAccessibilityService` be split into smaller, more focused modules?**
  _Cohesion score 0.07338693052978768 - nodes in this community are weakly interconnected._