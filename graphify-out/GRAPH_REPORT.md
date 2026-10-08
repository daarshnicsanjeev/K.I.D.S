# Graph Report - K.I.D.S  (2026-10-08)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 1206 nodes · 3182 edges · 74 communities (22 shown, 52 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 34 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `b479c107`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- KidsAccessibilityService
- GoogleDriveSharedHarvester
- json
- GoogleDriveClient
- Query
- StreamManifest
- CrawlerTraceLogger
- DriveAttachmentMatcherTest
- GoogleDriveSearchHarvester
- KidsAccessibilityService.kt
- InternalAppDiagnosticsMirror.kt
- ChildrenGridDashboard.kt
- KotlinGraphifyEngine.kt
- .processSingleUri
- StreamManifestAndCardTest
- OnboardingWizardScreen.kt
- OnboardingWizardScreen
- GoogleDriveClient.kt
- ContentCategory
- GestureDescription
- MainActivity.kt
- FloatingCrawlerOverlay
- AttachmentChipMatcherTest
- Context
- MLKitOcrParser.kt
- NotificationParserTest.kt
- .parse
- ScreenWakeLockManager.kt
- PrivacyFilterTest
- ChildProfile
- Entities.kt
- K.I.D.S. Android Collector (PRD)
- Intent
- WhatsAppChatExportParser
- .fallbackNativeScroll
- TypeConverters.kt
- WizardStep
- ContentClassifierTest
- ChannelType
- log
- GestureResultCallback

## God Nodes (most connected - your core abstractions)
1. `KidsAccessibilityService` - 131 edges
2. `GoogleDriveSharedHarvester` - 125 edges
3. `FloatingCrawlerOverlay` - 44 edges
4. `GoogleDriveClient` - 39 edges
5. `GoogleDriveSearchHarvester` - 36 edges
6. `OnboardingWizardScreen()` - 24 edges
7. `DriveVaultManager` - 23 edges
8. `CrawlerTraceLogger` - 23 edges
9. `AttachmentDao` - 22 edges
10. `NoticeDao` - 22 edges

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

## Communities (74 total, 52 thin omitted)

### Community 0 - "KidsAccessibilityService"
Cohesion: 0.06
Nodes (4): ExtractedAttachmentDetail, KidsAccessibilityService, UnvisitedCard, VisiblePendingCard

### Community 2 - "json"
Cohesion: 0.07
Nodes (36): diagnose_failure(), get_latest_run(), main(), monitor_workflow(), run_cmd(), sync_local_graph(), verify_release(), main() (+28 more)

### Community 3 - "GoogleDriveClient"
Cohesion: 0.08
Nodes (10): DriveVaultManager, Failure, ProvisionStep1Result, Success, UserConsentRequired, ChildVaultFolders, DriveQuotaInfo, GoogleDriveClient (+2 more)

### Community 4 - "Query"
Cohesion: 0.06
Nodes (4): AttachmentDao, ChildProfileDao, NoticeDao, KidsDatabase

### Community 5 - "StreamManifest"
Cohesion: 0.08
Nodes (10): StreamItemStatus, ALREADY_SYNCED, COMPLETED, FAILED_SKIPPED, IN_PROGRESS, PENDING, StreamManifest, StreamManifestItem (+2 more)

### Community 6 - "CrawlerTraceLogger"
Cohesion: 0.07
Nodes (4): CrawlerTraceLogger, DriveSyncWorker, DiagnosticSnapshot, DriveDeepLogger

### Community 9 - "KidsAccessibilityService.kt"
Cohesion: 0.09
Nodes (3): ContentClassifier, DeduplicationEngine, KidsNotificationListenerService

### Community 10 - "InternalAppDiagnosticsMirror.kt"
Cohesion: 0.08
Nodes (4): DeviceInfo, PipelineMetrics, StepStatus, Dual WhatsApp Catch-Up Engine

### Community 12 - "KotlinGraphifyEngine.kt"
Cohesion: 0.13
Nodes (14): GraphEdge, GraphNode, KnowledgeGraph, KotlinGraphifyEngine, Attachment, CloudHealthReport, Notice, ProbeItem (+6 more)

### Community 13 - ".processSingleUri"
Cohesion: 0.21
Nodes (3): SafVaultFolders, SafVaultManager, ShareTargetActivity

### Community 17 - "OnboardingWizardScreen"
Cohesion: 0.21
Nodes (4): PermissionHelper, PermissionSetupDialog(), KidsTheme(), OnboardingWizardScreen()

### Community 19 - "ContentCategory"
Cohesion: 0.14
Nodes (7): ContentCategory, ATTENDANCE, CIRCULAR, FEES, HOMEWORK, UNKNOWN, DeduplicationHashTest

### Community 20 - "GestureDescription"
Cohesion: 0.16
Nodes (5): GestureResultCallback, GestureResultCallback, GestureResultCallback, GestureResultCallback, GestureResultCallback

### Community 21 - "MainActivity.kt"
Cohesion: 0.13
Nodes (7): ChildCard(), ChildrenGridDashboard(), AppScreen, DASHBOARD, DIAGNOSTICS, WIZARD, MainActivity

### Community 26 - "NotificationParserTest.kt"
Cohesion: 0.18
Nodes (3): NotificationParser, ParsedNotification, NotificationParserTest

### Community 27 - ".parse"
Cohesion: 0.24
Nodes (3): ClassroomDateParser, ParsedDate, ClassroomDateParserTest

### Community 31 - "ChildProfile"
Cohesion: 0.24
Nodes (3): ChildProfile, MultiChildRouter, MultiChildAttributionTest

### Community 33 - "Entities.kt"
Cohesion: 0.42
Nodes (4): AttachmentEntity, ChildProfileEntity, NoticeEntity, NoticeFtsEntity

### Community 34 - "K.I.D.S. Android Collector (PRD)"
Cohesion: 0.22
Nodes (6): 5-Point Cloud Health Probe, Google Credential Manager API, Memory Boundary Privacy Filter, K.I.D.S. Android Collector (PRD), Sequential 4-Step Onboarding, Streaming PdfRenderer OCR

### Community 36 - "WhatsAppChatExportParser"
Cohesion: 0.25
Nodes (3): ImportedNoticeRecord, WhatsAppChatExportParser, WhatsAppChatExportParserTest

### Community 40 - "WizardStep"
Cohesion: 0.33
Nodes (6): WizardStep, STEP_0_PERMISSIONS, STEP_1_VAULT, STEP_2_CLASSROOM, STEP_3_PORTALS, STEP_4_WHATSAPP

### Community 42 - "ChannelType"
Cohesion: 0.40
Nodes (5): ChannelType, FILE_IMPORT, GOOGLE_CLASSROOM, SCHOOL_ERP, WHATSAPP

## Knowledge Gaps
- **33 isolated node(s):** `DeviceInfo`, `PipelineMetrics`, `StepStatus`, `CloudHealthReport`, `DROPPED` (+28 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 231 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **52 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `KidsAccessibilityService` connect `KidsAccessibilityService` to `Intent`, `KidsAccessibilityService.kt`, `DriveVaultManager.kt`, `ContentCategory`, `MainActivity.kt`, `FloatingCrawlerOverlay`, `Context`, `ScreenWakeLockManager.kt`?**
  _High betweenness centrality (0.227) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `KidsAccessibilityService` (e.g. with `ContentClassifier` and `DeduplicationEngine`) actually correct?**
  _`KidsAccessibilityService` has 3 INFERRED edges - model-reasoned connections that need verification._
- **What connects `DeviceInfo`, `PipelineMetrics`, `StepStatus` to the rest of the system?**
  _33 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `KidsAccessibilityService` be split into smaller, more focused modules?**
  _Cohesion score 0.05754838709677419 - nodes in this community are weakly interconnected._
- **Why does `GoogleDriveSharedHarvester` connect `GoogleDriveSharedHarvester` to `KidsAccessibilityService`, `DriveAttachmentMatcherTest`, `DriveVaultManager.kt`?**
  _High betweenness centrality (0.104) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `GoogleDriveSharedHarvester` (e.g. with `.runDeepCrawlLoop()` and `.startDirectDriveHarvest()`) actually correct?**
  _`GoogleDriveSharedHarvester` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Should `GoogleDriveSharedHarvester` be split into smaller, more focused modules?**
  _Cohesion score 0.06666666666666667 - nodes in this community are weakly interconnected._