# Graph Report - K.I.D.S  (2026-10-19)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 1262 nodes · 3357 edges · 84 communities (27 shown, 57 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 34 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `f0a0eef2`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- KidsAccessibilityService
- GoogleDriveSharedHarvester
- GoogleDriveClient
- Query
- GoogleDriveSearchHarvester
- DriveAttachmentMatcherTest
- ChildrenGridDashboard.kt
- DriveSyncWorker.kt
- .findMatchingNoticeForAttachment
- K.I.D.S. Android Collector (PRD)
- StreamManifest
- StreamManifestAndCardTest
- OnboardingWizardScreen.kt
- OnboardingWizardScreen
- harvest_detail_attachments_v2.py
- xml_etree_elementtree
- ContentCategory
- GestureDescription
- DeduplicationEngine
- ChildProfile
- MainActivity.kt
- FloatingCrawlerOverlay
- AttachmentChipMatcherTest
- Context
- MLKitOcrParser.kt
- .parse
- Models.kt
- NotificationParserTest.kt
- harvest_stream_runs.py
- json
- run_full_detail_traversal.py
- .processSingleUri
- ScreenWakeLockManager.kt
- SafVaultManager.kt
- PrivacyFilterTest
- subprocess
- time
- verify_zero_hardcode.py
- Entities.kt
- Intent
- DriveDeepLogger.kt
- Context
- .fallbackNativeScroll
- TypeConverters.kt
- harvest_classroom_stream.py
- harvest_drive_shared.py
- WizardStep
- ContentClassifierTest
- MultiChildAttributionTest
- GestureResultCallback

## God Nodes (most connected - your core abstractions)
1. `KidsAccessibilityService` - 131 edges
2. `GoogleDriveSharedHarvester` - 125 edges
3. `FloatingCrawlerOverlay` - 44 edges
4. `GoogleDriveClient` - 39 edges
5. `GoogleDriveSearchHarvester` - 36 edges
6. `OnboardingWizardScreen()` - 24 edges
7. `CrawlerTraceLogger` - 23 edges
8. `DriveVaultManager` - 23 edges
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
- `ShareTargetActivity` --calls--> `DeduplicationEngine`  [INFERRED]
  app/src/main/java/com/kids/collector/presentation/share/ShareTargetActivity.kt → app/src/main/java/com/kids/collector/domain/dedupe/DeduplicationEngine.kt

## Import Cycles
- None detected.

## Communities (84 total, 57 thin omitted)

### Community 0 - "KidsAccessibilityService"
Cohesion: 0.05
Nodes (5): CrawlerTraceLogger, ExtractedAttachmentDetail, KidsAccessibilityService, UnvisitedCard, VisiblePendingCard

### Community 2 - "GoogleDriveClient"
Cohesion: 0.06
Nodes (11): DriveVaultManager, Failure, ProvisionStep1Result, Success, UserConsentRequired, ChannelVaultFolders, ChildVaultFolders, DriveQuotaInfo (+3 more)

### Community 3 - "Query"
Cohesion: 0.06
Nodes (4): AttachmentDao, ChildProfileDao, NoticeDao, KidsDatabase

### Community 11 - "K.I.D.S. Android Collector (PRD)"
Cohesion: 0.09
Nodes (10): ImportedNoticeRecord, WhatsAppChatExportParser, WhatsAppChatExportParserTest, Dual WhatsApp Catch-Up Engine, 5-Point Cloud Health Probe, Google Credential Manager API, Memory Boundary Privacy Filter, K.I.D.S. Android Collector (PRD) (+2 more)

### Community 12 - "StreamManifest"
Cohesion: 0.14
Nodes (8): StreamItemStatus, ALREADY_SYNCED, COMPLETED, FAILED_SKIPPED, IN_PROGRESS, PENDING, StreamManifest, StreamManifestItem

### Community 15 - "OnboardingWizardScreen"
Cohesion: 0.21
Nodes (4): PermissionHelper, PermissionSetupDialog(), KidsTheme(), OnboardingWizardScreen()

### Community 16 - "harvest_detail_attachments_v2.py"
Cohesion: 0.22
Nodes (12): classify_screen(), compare_harvest_runs(), dump_ui(), enforce_portrait(), extract_attachments(), get_current_screen_type(), harvest_detail_run(), main() (+4 more)

### Community 17 - "xml_etree_elementtree"
Cohesion: 0.25
Nodes (13): compare_harvest_runs(), dump_ui(), enforce_portrait(), ensure_stream_view(), harvest_detail_run(), is_detail_view(), is_stream_view(), main() (+5 more)

### Community 18 - "ContentCategory"
Cohesion: 0.14
Nodes (7): ContentCategory, ATTENDANCE, CIRCULAR, FEES, HOMEWORK, UNKNOWN, DeduplicationHashTest

### Community 19 - "GestureDescription"
Cohesion: 0.16
Nodes (5): GestureResultCallback, GestureResultCallback, GestureResultCallback, GestureResultCallback, GestureResultCallback

### Community 20 - "DeduplicationEngine"
Cohesion: 0.11
Nodes (5): DownloadFolderObserver, ContentClassifier, DeduplicationEngine, MultiChildRouter, KidsNotificationListenerService

### Community 21 - "ChildProfile"
Cohesion: 0.24
Nodes (8): GraphEdge, GraphNode, KnowledgeGraph, KotlinGraphifyEngine, Attachment, ChildProfile, Notice, KnowledgeGraphBuilderTest

### Community 22 - "MainActivity.kt"
Cohesion: 0.13
Nodes (7): ChildCard(), ChildrenGridDashboard(), AppScreen, DASHBOARD, DIAGNOSTICS, WIZARD, MainActivity

### Community 27 - ".parse"
Cohesion: 0.24
Nodes (3): ClassroomDateParser, ParsedDate, ClassroomDateParserTest

### Community 28 - "Models.kt"
Cohesion: 0.14
Nodes (12): ChannelType, FILE_IMPORT, GOOGLE_CLASSROOM, SCHOOL_ERP, WHATSAPP, CloudHealthReport, ProbeItem, SyncStatus (+4 more)

### Community 29 - "NotificationParserTest.kt"
Cohesion: 0.20
Nodes (3): NotificationParser, ParsedNotification, NotificationParserTest

### Community 31 - "harvest_stream_runs.py"
Cohesion: 0.33
Nodes (8): dump_ui_xml(), enforce_portrait(), ensure_classroom_stream(), main(), parse_classroom_cards(), rewind_to_top(), run_adb(), run_single_harvest()

### Community 32 - "json"
Cohesion: 0.21
Nodes (3): main(), main(), parse_run_xmls()

### Community 33 - "run_full_detail_traversal.py"
Cohesion: 0.28
Nodes (8): enforce_portrait(), ensure_back_to_stream(), is_attachment(), is_stream_feed(), main(), run_adb(), run_single_traversal(), setup_stream_top()

### Community 39 - "subprocess"
Cohesion: 0.33
Nodes (7): diagnose_failure(), get_latest_run(), main(), monitor_workflow(), run_cmd(), sync_local_graph(), verify_release()

### Community 40 - "time"
Cohesion: 0.39
Nodes (7): dump_stream_raw_run(), enforce_portrait(), ensure_classroom_stream(), extract_raw_nodes(), main(), rewind_to_top(), run_adb()

### Community 41 - "verify_zero_hardcode.py"
Cohesion: 0.24
Nodes (4): check_file(), load_central_exemptions(), main(), validate_exemption()

### Community 42 - "Entities.kt"
Cohesion: 0.42
Nodes (4): AttachmentEntity, ChildProfileEntity, NoticeEntity, NoticeFtsEntity

### Community 45 - "DriveDeepLogger.kt"
Cohesion: 0.28
Nodes (5): DeviceInfo, DiagnosticSnapshot, DriveDeepLogger, PipelineMetrics, StepStatus

### Community 49 - "harvest_classroom_stream.py"
Cohesion: 0.52
Nodes (4): dump_ui_xml(), harvest_entire_classroom(), parse_classroom_cards(), run_adb()

### Community 50 - "harvest_drive_shared.py"
Cohesion: 0.52
Nodes (4): dump_ui_xml(), harvest_entire_drive_shared(), parse_drive_shared_items(), run_adb()

### Community 51 - "WizardStep"
Cohesion: 0.33
Nodes (6): WizardStep, STEP_0_PERMISSIONS, STEP_1_VAULT, STEP_2_CLASSROOM, STEP_3_PORTALS, STEP_4_WHATSAPP

## Knowledge Gaps
- **29 isolated node(s):** `ALREADY_SYNCED`, `COMPLETED`, `FAILED_SKIPPED`, `IN_PROGRESS`, `PENDING` (+24 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 246 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **57 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `KidsAccessibilityService` connect `KidsAccessibilityService` to `GoogleDriveSharedHarvester`, `ScreenWakeLockManager.kt`, `KidsAccessibilityService.kt`, `Intent`, `ContentCategory`, `DeduplicationEngine`, `MainActivity.kt`, `FloatingCrawlerOverlay`, `Context`?**
  _High betweenness centrality (0.210) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `KidsAccessibilityService` (e.g. with `ContentClassifier` and `DeduplicationEngine`) actually correct?**
  _`KidsAccessibilityService` has 3 INFERRED edges - model-reasoned connections that need verification._
- **What connects `ALREADY_SYNCED`, `COMPLETED`, `FAILED_SKIPPED` to the rest of the system?**
  _29 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `KidsAccessibilityService` be split into smaller, more focused modules?**
  _Cohesion score 0.05399313009875483 - nodes in this community are weakly interconnected._
- **Why does `GoogleDriveSharedHarvester` connect `GoogleDriveSharedHarvester` to `KidsAccessibilityService`, `DriveAttachmentMatcherTest`?**
  _High betweenness centrality (0.107) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `GoogleDriveSharedHarvester` (e.g. with `.runDeepCrawlLoop()` and `.startDirectDriveHarvest()`) actually correct?**
  _`GoogleDriveSharedHarvester` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Should `GoogleDriveSharedHarvester` be split into smaller, more focused modules?**
  _Cohesion score 0.058666666666666666 - nodes in this community are weakly interconnected._