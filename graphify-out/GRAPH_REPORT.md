# Graph Report - K.I.D.S  (2026-10-19)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 1834 nodes · 5171 edges · 116 communities (42 shown, 74 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 15 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `74ab2af7`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- GoogleDriveSharedHarvester
- ClassroomBrowserExtractor
- DriveAttachmentMatcherTest
- personalDriveService.ts
- PersonalDriveService
- android/app/src/main/java/com/kids/collector/presentation/wizard/OnboardingWizardScreen.kt
- GoogleDriveSearchHarvester
- DriveVaultManager
- .syncClassroomAttachments
- GasProvisionerService
- wizard.ts
- android/app/src/main/java/com/kids/collector/service/KidsAccessibilityService.kt
- package.json
- .getActiveProfile
- StreamManifestAndCardTest
- android/app/src/main/java/com/kids/collector/service/FloatingCrawlerOverlay.kt
- GoogleDriveClient
- KidsAccessibilityService
- extension/manifest.json
- public/manifest.json
- AiNormalizerService
- NoticeEntity
- OnboardingWizardScreen
- triggerLifecycleAndFastExit.test.ts
- .collectQuickText
- AttachmentEntity
- android/app/src/main/java/com/kids/collector/data/drive/GoogleDriveClient.kt
- android/app/src/main/java/com/kids/collector/presentation/MainActivity.kt
- handleMessage
- ContentCategory
- GestureDescription
- harvest_detail_attachments_v2.py
- KnowledgeGraphBuilder
- xml_etree_elementtree
- .matchesAttachmentChipText
- ChildProfileEntity
- .findMatchingNoticeForAttachment
- CrawlerTraceLogger
- android/app/src/main/java/com/kids/collector/data/ocr/MLKitOcrParser.kt
- ChannelConfig
- FloatingCrawlerOverlay
- StreamManifest
- android/app/src/main/java/com/kids/collector/data/drive/DriveVaultManager.kt
- android/app/src/main/java/com/kids/collector/data/drive/SafVaultManager.kt
- DeduplicationEngine
- .parse
- PrivacyFilter
- ChildProfile
- .runInitialSchoolDataSync
- harvest_stream_runs.py
- android/app/src/main/java/com/kids/collector/domain/graph/KotlinGraphifyEngine.kt
- json
- run_full_detail_traversal.py
- WhatsAppChatExportParser
- DriveSyncWorker
- .mirrorAllInternalDataToDrive
- compilerOptions
- subprocess
- time
- .processSingleUri
- KidsDatabase
- android/app/src/main/java/com/kids/collector/telemetry/DriveDeepLogger.kt
- verify_zero_hardcode.py
- K.I.D.S. Android Collector (PRD)
- log
- whatsappExtractor.ts
- PreFlightValidator
- platformStoreConnector.test.ts
- android/app/src/test/java/com/kids/collector/KnowledgeGraphBuilderTest.kt
- WhatsAppExportParser
- .fallbackNativeScrollBackward
- SanitizerService
- popupDomIntegrity.test.ts
- harvest_classroom_stream.py
- harvest_drive_shared.py
- android/app/src/main/java/com/kids/collector/data/db/TypeConverters.kt
- WizardStep
- GestureResultCallback
- ErrorHasher
- universalDomExtractor.ts
- DaytimeDate

## God Nodes (most connected - your core abstractions)
1. `KidsAccessibilityService` - 132 edges
2. `GoogleDriveSharedHarvester` - 126 edges
3. `PersonalDriveService` - 102 edges
4. `GasProvisionerService` - 60 edges
5. `handleMessage()` - 54 edges
6. `FloatingCrawlerOverlay` - 47 edges
7. `vitest` - 43 edges
8. `NoticeEntity` - 40 edges
9. `GoogleDriveClient` - 39 edges
10. `AttachmentEntity` - 39 edges

## Surprising Connections (you probably didn't know these)
- `KidsAccessibilityService` --calls--> `ScreenWakeLockManager`  [INFERRED]
  android/app/src/main/java/com/kids/collector/service/KidsAccessibilityService.kt → android/app/src/main/java/com/kids/collector/service/ScreenWakeLockManager.kt
- `GoogleDriveSharedHarvester` --references--> `KidsDatabase`  [EXTRACTED]
  android/app/src/main/java/com/kids/collector/service/GoogleDriveSharedHarvester.kt → android/app/src/main/java/com/kids/collector/data/db/KidsDatabase.kt
- `GoogleDriveSharedHarvester` --references--> `FloatingCrawlerOverlay`  [EXTRACTED]
  android/app/src/main/java/com/kids/collector/service/GoogleDriveSharedHarvester.kt → android/app/src/main/java/com/kids/collector/service/FloatingCrawlerOverlay.kt
- `KidsNotificationListenerService` --calls--> `ContentClassifier`  [EXTRACTED]
  android/app/src/main/java/com/kids/collector/service/KidsNotificationListenerService.kt → android/app/src/main/java/com/kids/collector/domain/classifier/ContentClassifier.kt
- `KidsNotificationListenerService` --calls--> `DeduplicationEngine`  [EXTRACTED]
  android/app/src/main/java/com/kids/collector/service/KidsNotificationListenerService.kt → android/app/src/main/java/com/kids/collector/domain/dedupe/DeduplicationEngine.kt

## Import Cycles
- None detected.

## Communities (116 total, 74 thin omitted)

### Community 1 - "ClassroomBrowserExtractor"
Cohesion: 0.05
Nodes (5): ClassroomBrowserExtractor, MockNode, MockNode, MockDOMNode, MockDOMNode2

### Community 2 - "DriveAttachmentMatcherTest"
Cohesion: 0.06
Nodes (6): NotificationParser, ParsedNotification, DriveAttachmentMatcherTest, DriveVaultManagerTest, GoogleDriveSearchHarvesterTest, NotificationParserTest

### Community 3 - "personalDriveService.ts"
Cohesion: 0.07
Nodes (28): DEFAULT_STATE, StorageState, CachedTokenInfo, AdvisoryResult, BridgeAdvisor, ChildProfile, ClassroomExtractionProgress, ExtractedAnnouncement (+20 more)

### Community 5 - "android/app/src/main/java/com/kids/collector/presentation/wizard/OnboardingWizardScreen.kt"
Cohesion: 0.07
Nodes (4): LogLine, getDefaultSchoolAppList(), launchAccountPicker(), queryInstalledLauncherApps()

### Community 7 - "DriveVaultManager"
Cohesion: 0.21
Nodes (3): DriveVaultManager, ChildVaultFolders, DiagnosticFeedScreen()

### Community 11 - "wizard.ts"
Cohesion: 0.16
Nodes (25): checkStep1ApiStatus(), checkStep2ApiStatus(), closeModal(), dismissRestoringOverlay(), executeSchoolWorkerDeployment(), openModal(), populateStep1ForEditing(), renderFamilyDashboardProfiles() (+17 more)

### Community 13 - "package.json"
Cohesion: 0.07
Nodes (27): description, devDependencies, chokidar-cli, @types/chrome, @types/node, typescript, vite, vitest (+19 more)

### Community 15 - "StreamManifestAndCardTest"
Cohesion: 0.13
Nodes (7): StreamItemStatus, ALREADY_SYNCED, COMPLETED, FAILED_SKIPPED, IN_PROGRESS, PENDING, StreamManifestAndCardTest

### Community 19 - "extension/manifest.json"
Cohesion: 0.07
Nodes (26): action, default_icon, default_popup, default_title, background, service_worker, type, content_scripts (+18 more)

### Community 20 - "public/manifest.json"
Cohesion: 0.07
Nodes (26): action, default_icon, default_popup, default_title, background, service_worker, type, content_scripts (+18 more)

### Community 21 - "AiNormalizerService"
Cohesion: 0.15
Nodes (6): RawChatDump, UniversalPlatformExtractor, AiAvailabilityStatus, AiNormalizerService, NormalizedNoticeMessage, RawChatTurn

### Community 24 - "OnboardingWizardScreen"
Cohesion: 0.17
Nodes (3): PermissionHelper, PermissionSetupDialog(), OnboardingWizardScreen()

### Community 25 - "triggerLifecycleAndFastExit.test.ts"
Cohesion: 0.12
Nodes (4): fs, getAllFiles(), loadDeployedGasFiles(), loadDeployedGasFiles()

### Community 28 - "android/app/src/main/java/com/kids/collector/data/drive/GoogleDriveClient.kt"
Cohesion: 0.10
Nodes (3): DownloadFolderObserver, ChannelVaultFolders, DriveQuotaInfo

### Community 29 - "android/app/src/main/java/com/kids/collector/presentation/MainActivity.kt"
Cohesion: 0.11
Nodes (8): ChildCard(), ChildrenGridDashboard(), AppScreen, DASHBOARD, DIAGNOSTICS, WIZARD, MainActivity, KidsTheme()

### Community 30 - "handleMessage"
Cohesion: 0.18
Nodes (3): handleMessage(), refreshDiagnosticLogs(), SyncLifecycleManager

### Community 31 - "ContentCategory"
Cohesion: 0.15
Nodes (9): ContentClassifier, ImportedNoticeRecord, ContentCategory, ATTENDANCE, CIRCULAR, FEES, HOMEWORK, UNKNOWN (+1 more)

### Community 32 - "GestureDescription"
Cohesion: 0.15
Nodes (5): GestureResultCallback, GestureResultCallback, GestureResultCallback, GestureResultCallback, GestureResultCallback

### Community 33 - "harvest_detail_attachments_v2.py"
Cohesion: 0.22
Nodes (12): classify_screen(), compare_harvest_runs(), dump_ui(), enforce_portrait(), extract_attachments(), get_current_screen_type(), harvest_detail_run(), main() (+4 more)

### Community 34 - "KnowledgeGraphBuilder"
Cohesion: 0.20
Nodes (5): GraphEdge, GraphNode, KnowledgeGraphBuilder, SchoolKnowledgeGraph, DaytimeDate

### Community 35 - "xml_etree_elementtree"
Cohesion: 0.25
Nodes (13): compare_harvest_runs(), dump_ui(), enforce_portrait(), ensure_stream_view(), harvest_detail_run(), is_detail_view(), is_stream_view(), main() (+5 more)

### Community 37 - "ChildProfileEntity"
Cohesion: 0.15
Nodes (3): ChildProfileDao, ChildProfileEntity, NoticeFtsEntity

### Community 42 - "ChannelConfig"
Cohesion: 0.17
Nodes (14): Attachment, ChannelConfig, ChannelType, FILE_IMPORT, GOOGLE_CLASSROOM, SCHOOL_ERP, WHATSAPP, CloudHealthReport (+6 more)

### Community 46 - "android/app/src/main/java/com/kids/collector/data/drive/DriveVaultManager.kt"
Cohesion: 0.14
Nodes (4): Failure, ProvisionStep1Result, Success, UserConsentRequired

### Community 49 - ".parse"
Cohesion: 0.24
Nodes (3): ClassroomDateParser, ParsedDate, ClassroomDateParserTest

### Community 51 - "ChildProfile"
Cohesion: 0.25
Nodes (3): ChildProfile, MultiChildRouter, MultiChildAttributionTest

### Community 54 - "harvest_stream_runs.py"
Cohesion: 0.33
Nodes (8): dump_ui_xml(), enforce_portrait(), ensure_classroom_stream(), main(), parse_classroom_cards(), rewind_to_top(), run_adb(), run_single_harvest()

### Community 55 - "android/app/src/main/java/com/kids/collector/domain/graph/KotlinGraphifyEngine.kt"
Cohesion: 0.37
Nodes (5): GraphEdge, GraphNode, KnowledgeGraph, KotlinGraphifyEngine, Notice

### Community 56 - "json"
Cohesion: 0.21
Nodes (3): main(), main(), parse_run_xmls()

### Community 57 - "run_full_detail_traversal.py"
Cohesion: 0.28
Nodes (8): enforce_portrait(), ensure_back_to_stream(), is_attachment(), is_stream_feed(), main(), run_adb(), run_single_traversal(), setup_stream_top()

### Community 61 - "compilerOptions"
Cohesion: 0.17
Nodes (11): compilerOptions, esModuleInterop, forceConsistentCasingInFileNames, module, moduleResolution, outDir, skipLibCheck, strict (+3 more)

### Community 62 - "subprocess"
Cohesion: 0.33
Nodes (7): diagnose_failure(), get_latest_run(), main(), monitor_workflow(), run_cmd(), sync_local_graph(), verify_release()

### Community 63 - "time"
Cohesion: 0.39
Nodes (7): dump_stream_raw_run(), enforce_portrait(), ensure_classroom_stream(), extract_raw_nodes(), main(), rewind_to_top(), run_adb()

### Community 66 - "android/app/src/main/java/com/kids/collector/telemetry/DriveDeepLogger.kt"
Cohesion: 0.35
Nodes (5): DeviceInfo, DiagnosticSnapshot, DriveDeepLogger, PipelineMetrics, StepStatus

### Community 67 - "verify_zero_hardcode.py"
Cohesion: 0.24
Nodes (4): check_file(), load_central_exemptions(), main(), validate_exemption()

### Community 68 - "K.I.D.S. Android Collector (PRD)"
Cohesion: 0.20
Nodes (7): Dual WhatsApp Catch-Up Engine, 5-Point Cloud Health Probe, Google Credential Manager API, Memory Boundary Privacy Filter, K.I.D.S. Android Collector (PRD), Sequential 4-Step Onboarding, Streaming PdfRenderer OCR

### Community 70 - "whatsappExtractor.ts"
Cohesion: 0.31
Nodes (4): TrackedWhatsAppChat, WhatsAppChatSummary, WhatsAppExtractor, WhatsAppMessage

### Community 71 - "PreFlightValidator"
Cohesion: 0.27
Nodes (4): EndpointSpec, PreFlightResult, PreFlightValidator, ValidationStageResult

### Community 73 - "platformStoreConnector.test.ts"
Cohesion: 0.36
Nodes (3): PlatformStoreConnector, RawStoreMessage, StoreExtractionResult

### Community 79 - "harvest_classroom_stream.py"
Cohesion: 0.52
Nodes (4): dump_ui_xml(), harvest_entire_classroom(), parse_classroom_cards(), run_adb()

### Community 80 - "harvest_drive_shared.py"
Cohesion: 0.52
Nodes (4): dump_ui_xml(), harvest_entire_drive_shared(), parse_drive_shared_items(), run_adb()

### Community 82 - "WizardStep"
Cohesion: 0.33
Nodes (6): WizardStep, STEP_0_PERMISSIONS, STEP_1_VAULT, STEP_2_CLASSROOM, STEP_3_PORTALS, STEP_4_WHATSAPP

## Knowledge Gaps
- **37 isolated node(s):** `chokidar-cli`, `@types/chrome`, `@types/node`, `typescript`, `webstore-lint` (+32 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 381 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **74 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `KidsAccessibilityService` connect `KidsAccessibilityService` to `GoogleDriveSharedHarvester`, `KidsDatabase`, `.matchesAttachmentChipText`, `android/app/src/main/java/com/kids/collector/presentation/wizard/OnboardingWizardScreen.kt`, `DriveVaultManager`, `AccessibilityNodeInfo`, `.runDeepCrawlLoop`, `FloatingCrawlerOverlay`, `android/app/src/main/java/com/kids/collector/service/KidsAccessibilityService.kt`, `.automateViewerShareOrDownload`, `DeduplicationEngine`, `android/app/src/main/java/com/kids/collector/service/FloatingCrawlerOverlay.kt`, `OnboardingWizardScreen`, `.collectQuickText`, `android/app/src/main/java/com/kids/collector/presentation/MainActivity.kt`, `ContentCategory`?**
  _High betweenness centrality (0.099) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `GoogleDriveSharedHarvester` (e.g. with `.runDeepCrawlLoop()` and `.startDirectDriveHarvest()`) actually correct?**
  _`GoogleDriveSharedHarvester` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `chokidar-cli`, `@types/chrome`, `@types/node` to the rest of the system?**
  _37 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `GoogleDriveSharedHarvester` be split into smaller, more focused modules?**
  _Cohesion score 0.06503183850426772 - nodes in this community are weakly interconnected._
- **Why does `GoogleDriveSharedHarvester` connect `GoogleDriveSharedHarvester` to `KidsDatabase`, `DriveAttachmentMatcherTest`, `.runDeepCrawlLoop`, `FloatingCrawlerOverlay`, `android/app/src/main/java/com/kids/collector/service/KidsAccessibilityService.kt`?**
  _High betweenness centrality (0.071) - this node is a cross-community bridge._
- **Should `ClassroomBrowserExtractor` be split into smaller, more focused modules?**
  _Cohesion score 0.05096153846153846 - nodes in this community are weakly interconnected._
- **Why does `KidsDatabase` connect `KidsDatabase` to `GoogleDriveSharedHarvester`, `ChildProfileEntity`, `.findMatchingNoticeForAttachment`, `DriveVaultManager`, `android/app/src/main/java/com/kids/collector/presentation/wizard/OnboardingWizardScreen.kt`, `DriveSyncWorker`, `ChannelConfig`, `GoogleDriveSearchHarvester`, `android/app/src/main/java/com/kids/collector/service/KidsAccessibilityService.kt`, `.runDeepCrawlLoop`, `.mirrorAllInternalDataToDrive`, `android/app/src/main/java/com/kids/collector/data/db/TypeConverters.kt`, `android/app/src/main/java/com/kids/collector/telemetry/InternalAppDiagnosticsMirror.kt`, `NoticeEntity`, `AttachmentEntity`, `android/app/src/main/java/com/kids/collector/data/drive/GoogleDriveClient.kt`, `android/app/src/main/java/com/kids/collector/presentation/MainActivity.kt`?**
  _High betweenness centrality (0.057) - this node is a cross-community bridge._