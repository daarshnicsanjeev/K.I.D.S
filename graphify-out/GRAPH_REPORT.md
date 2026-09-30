# Graph Report - K.I.D.S  (2026-09-30)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 857 nodes · 2026 edges · 61 communities (22 shown, 39 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 34 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `4ef3ea5c`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- KidsAccessibilityService
- GoogleDriveClient
- Query
- GoogleDriveSharedHarvester
- ContentCategory
- StreamManifest
- ChildrenGridDashboard.kt
- Test
- SafVaultManager.kt
- OnboardingWizardScreen.kt
- ShareTargetActivity.kt
- NotificationParserTest.kt
- GestureDescription
- KotlinGraphifyEngine.kt
- FloatingCrawlerOverlay
- .matchesAttachmentChipText
- DriveSyncWorker.kt
- MLKitOcrParser.kt
- .log
- OnboardingWizardScreen
- ci_watch.py
- Models.kt
- MainActivity.kt
- ChildProfile
- PrivacyFilterTest
- GestureDescription
- DriveDeepLogger.kt
- Entities.kt
- log
- ChildProfile
- TypeConverters.kt
- .fallbackNativeScrollBackward
- Intent
- WizardStep

## God Nodes (most connected - your core abstractions)
1. `KidsAccessibilityService` - 103 edges
2. `GoogleDriveSharedHarvester` - 51 edges
3. `FloatingCrawlerOverlay` - 44 edges
4. `GoogleDriveClient` - 28 edges
5. `OnboardingWizardScreen()` - 23 edges
6. `DriveVaultManager` - 18 edges
7. `NoticeDao` - 18 edges
8. `ChildProfile` - 18 edges
9. `AttachmentDao` - 17 edges
10. `StreamManifest` - 17 edges

## Surprising Connections (you probably didn't know these)
- `K.I.D.S. Android Collector (PRD)` --stores_in--> `AI-Native Storage (JSONL & Markdown)`  [EXTRACTED]
  prd.md → README.md
- `K.I.D.S. Android Collector (PRD)` --backfills_with--> `Dual WhatsApp Catch-Up Engine`  [EXTRACTED]
  prd.md → README.md
- `K.I.D.S. Android Collector (PRD)` --monitored_by--> `5-Point Cloud Health Probe`  [EXTRACTED]
  prd.md → README.md
- `K.I.D.S. Android Collector (PRD)` --authenticates_via--> `Google Credential Manager API`  [EXTRACTED]
  prd.md → README.md
- `K.I.D.S. Android Collector (PRD)` --filters_with--> `Memory Boundary Privacy Filter`  [EXTRACTED]
  prd.md → GEMINI.md

## Import Cycles
- None detected.

## Communities (61 total, 39 thin omitted)

### Community 0 - "KidsAccessibilityService"
Cohesion: 0.07
Nodes (4): ExtractedAttachmentDetail, KidsAccessibilityService, UnvisitedCard, VisiblePendingCard

### Community 1 - "GoogleDriveClient"
Cohesion: 0.07
Nodes (10): DriveVaultManager, Failure, ProvisionStep1Result, Success, UserConsentRequired, ChannelVaultFolders, ChildVaultFolders, DriveQuotaInfo (+2 more)

### Community 2 - "Query"
Cohesion: 0.07
Nodes (4): AttachmentDao, ChildProfileDao, NoticeDao, KidsDatabase

### Community 4 - "ContentCategory"
Cohesion: 0.06
Nodes (18): ContentClassifier, ImportedNoticeRecord, WhatsAppChatExportParser, ContentCategory, ATTENDANCE, CIRCULAR, FEES, HOMEWORK (+10 more)

### Community 5 - "StreamManifest"
Cohesion: 0.08
Nodes (9): StreamItemStatus, ALREADY_SYNCED, COMPLETED, FAILED_SKIPPED, IN_PROGRESS, PENDING, StreamManifest, StreamManifestItem (+1 more)

### Community 6 - "ChildrenGridDashboard.kt"
Cohesion: 0.11
Nodes (3): ProbeItem, DiagnosticFeedScreen(), LogLine

### Community 7 - "Test"
Cohesion: 0.11
Nodes (5): ClassroomDateParser, ParsedDate, DeduplicationEngine, ClassroomDateParserTest, DeduplicationHashTest

### Community 9 - "SafVaultManager.kt"
Cohesion: 0.20
Nodes (3): SafVaultFolders, SafVaultManager, ShareTargetActivity

### Community 10 - "OnboardingWizardScreen.kt"
Cohesion: 0.10
Nodes (3): getDefaultSchoolAppList(), launchAccountPicker(), queryInstalledLauncherApps()

### Community 12 - "NotificationParserTest.kt"
Cohesion: 0.14
Nodes (5): MLKitOcrParser, OcrExtractionResult, NotificationParser, ParsedNotification, NotificationParserTest

### Community 13 - "GestureDescription"
Cohesion: 0.16
Nodes (5): GestureResultCallback, GestureResultCallback, GestureResultCallback, GestureResultCallback, GestureResultCallback

### Community 14 - "KotlinGraphifyEngine.kt"
Cohesion: 0.22
Nodes (7): GraphEdge, GraphNode, KnowledgeGraph, KotlinGraphifyEngine, Attachment, Notice, KnowledgeGraphBuilderTest

### Community 21 - "OnboardingWizardScreen"
Cohesion: 0.35
Nodes (3): PermissionHelper, PermissionSetupDialog(), OnboardingWizardScreen()

### Community 22 - "ci_watch.py"
Cohesion: 0.21
Nodes (7): diagnose_failure(), get_latest_run(), main(), monitor_workflow(), run_cmd(), sync_local_graph(), verify_release()

### Community 24 - "Models.kt"
Cohesion: 0.15
Nodes (11): ChannelType, FILE_IMPORT, GOOGLE_CLASSROOM, SCHOOL_ERP, WHATSAPP, CloudHealthReport, SyncStatus, DROPPED (+3 more)

### Community 25 - "MainActivity.kt"
Cohesion: 0.15
Nodes (4): AppScreen, DASHBOARD, DIAGNOSTICS, WIZARD

### Community 26 - "ChildProfile"
Cohesion: 0.26
Nodes (3): ChildProfile, MultiChildRouter, MultiChildAttributionTest

### Community 28 - "GestureDescription"
Cohesion: 0.27
Nodes (3): GestureResultCallback, GestureResultCallback, GestureResultCallback

### Community 29 - "DriveDeepLogger.kt"
Cohesion: 0.24
Nodes (5): DeviceInfo, DiagnosticSnapshot, DriveDeepLogger, PipelineMetrics, StepStatus

### Community 30 - "Entities.kt"
Cohesion: 0.22
Nodes (4): AttachmentEntity, ChildProfileEntity, NoticeEntity, NoticeFtsEntity

### Community 33 - "ChildProfile"
Cohesion: 0.28
Nodes (3): ChildCard(), ChildrenGridDashboard(), KidsTheme()

### Community 38 - "WizardStep"
Cohesion: 0.33
Nodes (6): WizardStep, STEP_0_PERMISSIONS, STEP_1_VAULT, STEP_2_CLASSROOM, STEP_3_PORTALS, STEP_4_WHATSAPP

## Knowledge Gaps
- **35 isolated node(s):** `CloudHealthReport`, `DeviceInfo`, `PipelineMetrics`, `StepStatus`, `AttachmentEntity` (+30 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 214 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **39 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `KidsAccessibilityService` connect `KidsAccessibilityService` to `ContentCategory`, `Intent`, `Test`, `KidsAccessibilityService.kt`, `SafVaultManager.kt`, `assertthat`, `FloatingCrawlerOverlay`, `.matchesAttachmentChipText`, `ChildProfile`?**
  _High betweenness centrality (0.241) - this node is a cross-community bridge._
- **Why does `ChildProfile` connect `ChildProfile` to `KidsAccessibilityService`, `assertthat`, `ShareTargetActivity.kt`, `KotlinGraphifyEngine.kt`, `OnboardingWizardScreen`, `Models.kt`?**
  _High betweenness centrality (0.081) - this node is a cross-community bridge._
- **Why does `FloatingCrawlerOverlay` connect `FloatingCrawlerOverlay` to `KidsAccessibilityService`, `.fallbackNativeScrollBackward`, `GestureDescription`, `FloatingCrawlerOverlay.kt`, `.stopAutoScroll`?**
  _High betweenness centrality (0.078) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `KidsAccessibilityService` (e.g. with `ContentClassifier` and `DeduplicationEngine`) actually correct?**
  _`KidsAccessibilityService` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Are the 6 inferred relationships involving `GoogleDriveClient` (e.g. with `.preWarmOAuthAndFolders()` and `.provisionStep1()`) actually correct?**
  _`GoogleDriveClient` has 6 INFERRED edges - model-reasoned connections that need verification._
- **What connects `CloudHealthReport`, `DeviceInfo`, `PipelineMetrics` to the rest of the system?**
  _35 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `KidsAccessibilityService` be split into smaller, more focused modules?**
  _Cohesion score 0.07456140350877193 - nodes in this community are weakly interconnected._