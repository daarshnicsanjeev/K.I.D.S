# Graph Report - K.I.D.S  (2026-09-29)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 846 nodes · 1971 edges · 53 communities (34 shown, 19 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 34 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `c329e6f1`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- KidsAccessibilityService
- FloatingCrawlerOverlay
- GoogleDriveClient
- .matchesAttachmentChipText
- Query
- .log
- StreamManifest
- ChildrenGridDashboard.kt
- OnboardingWizardScreen.kt
- SafVaultManager.kt
- K.I.D.S. Android Collector (PRD)
- KidsAccessibilityService.kt
- ShareTargetActivity.kt
- NotificationParserTest.kt
- DriveVaultManager.kt
- OnboardingWizardScreen
- ci_watch.py
- DriveSyncWorker.kt
- DeduplicationEngine
- Models.kt
- Entities.kt
- KotlinGraphifyEngine.kt
- ChildProfile
- MainActivity.kt
- GestureDescription
- MLKitOcrParser.kt
- KnowledgeGraphBuilderTest.kt
- DriveDeepLogger.kt
- ChildProfile
- Type.kt
- Intent
- ContentCategory
- WizardStep
- gradlew
- java
- Bundle
- Context
- Intent
- Result
- AccessibilityNodeInfo
- Context
- FloatingCrawlerOverlay
- Rect
- Volatile
- GestureDescription
- GestureResultCallback
- Intent
- ChildVaultFolders
- role
- statusbarnotification

## God Nodes (most connected - your core abstractions)
1. `KidsAccessibilityService` - 103 edges
2. `FloatingCrawlerOverlay` - 44 edges
3. `GoogleDriveSharedHarvester` - 41 edges
4. `GoogleDriveClient` - 29 edges
5. `OnboardingWizardScreen()` - 23 edges
6. `DriveVaultManager` - 18 edges
7. `ChildProfile` - 18 edges
8. `NoticeDao` - 18 edges
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

## Communities (53 total, 19 thin omitted)

### Community 0 - "KidsAccessibilityService"
Cohesion: 0.07
Nodes (10): NoticeEntity, ExtractedAttachmentDetail, KidsAccessibilityService, AccessibilityNodeInfo, FloatingCrawlerOverlay, Volatile, UnvisitedCard, VisiblePendingCard (+2 more)

### Community 1 - "FloatingCrawlerOverlay"
Cohesion: 0.05
Nodes (24): FloatingCrawlerOverlay, GestureResultCallback, GestureResultCallback, GestureResultCallback, GestureResultCallback, GestureResultCallback, GestureResultCallback, AccessibilityNodeInfo (+16 more)

### Community 2 - "GoogleDriveClient"
Cohesion: 0.07
Nodes (26): DriveVaultManager, Failure, Context, Result, ProvisionStep1Result, Success, UserConsentRequired, ChannelVaultFolders (+18 more)

### Community 3 - ".matchesAttachmentChipText"
Cohesion: 0.05
Nodes (15): ClassroomDateParser, ParsedDate, PrivacyFilter, AttachmentChipMatcherTest, ClassroomDateParserTest, ContentClassifierTest, DeduplicationHashTest, PrivacyFilterTest (+7 more)

### Community 4 - "Query"
Cohesion: 0.07
Nodes (17): AttachmentDao, ChildProfileDao, AttachmentEntity, NoticeEntity, NoticeDao, KidsDatabase, Context, ChildProfileEntity (+9 more)

### Community 5 - ".log"
Cohesion: 0.10
Nodes (9): AccessibilityNodeInfo, CrawlerTraceLogger, Context, DriveSharedItem, GoogleDriveSharedHarvester, AttachmentEntity, FloatingCrawlerOverlay, Result (+1 more)

### Community 6 - "StreamManifest"
Cohesion: 0.08
Nodes (9): StreamItemStatus, ALREADY_SYNCED, COMPLETED, FAILED_SKIPPED, IN_PROGRESS, PENDING, StreamManifest, StreamManifestItem (+1 more)

### Community 7 - "ChildrenGridDashboard.kt"
Cohesion: 0.11
Nodes (24): alignment, ProbeItem, DiagnosticFeedScreen(), LogLine, background, border, circleshape, clickable (+16 more)

### Community 8 - "OnboardingWizardScreen.kt"
Cohesion: 0.09
Nodes (23): accountmanager, activityresultcontracts, androidx, getDefaultSchoolAppList(), launchAccountPicker(), queryInstalledLauncherApps(), arrowback, backhandler (+15 more)

### Community 9 - "SafVaultManager.kt"
Cohesion: 0.20
Nodes (9): android, Context, Result, SafVaultFolders, SafVaultManager, ShareTargetActivity, Context, DocumentFile (+1 more)

### Community 10 - "K.I.D.S. Android Collector (PRD)"
Cohesion: 0.09
Nodes (16): AI-Native Storage (JSONL & Markdown), ImportedNoticeRecord, WhatsAppChatExportParser, WhatsAppChatExportParserTest, Dual WhatsApp Catch-Up Engine, 5-Point Cloud Health Probe, Google Credential Manager API, inputstream (+8 more)

### Community 11 - "KidsAccessibilityService.kt"
Cohesion: 0.13
Nodes (18): AccessibilityEvent, accessibilitymanager, AccessibilityService, accessibilityserviceinfo, Rect, calendar, CoroutineScope, delay (+10 more)

### Community 12 - "ShareTargetActivity.kt"
Cohesion: 0.13
Nodes (17): Activity, ContentClassifier, KidsNotificationListenerService, StatusBarNotification, cancel, constraints, existingworkpolicy, fileoutputstream (+9 more)

### Community 13 - "NotificationParserTest.kt"
Cohesion: 0.14
Nodes (12): MLKitOcrParser, OcrExtractionResult, Bundle, StatusBarNotification, NotificationParser, ParsedNotification, NotificationParserTest, Bitmap (+4 more)

### Community 14 - "DriveVaultManager.kt"
Cohesion: 0.13
Nodes (14): KidsApplication, Application, CompletableDeferred, concurrentlinkedqueue, date, filewriter, googleaccountcredential, gsonfactory (+6 more)

### Community 15 - "OnboardingWizardScreen"
Cohesion: 0.35
Nodes (4): Context, PermissionHelper, PermissionSetupDialog(), OnboardingWizardScreen()

### Community 16 - "ci_watch.py"
Cohesion: 0.21
Nodes (14): os, re, diagnose_failure(), get_latest_run(), main(), monitor_workflow(), CI/CD Pipeline Monitor, Release Verifier & Graphify Guardian for K.I.D.S.…, Runs local Graphify AST extraction and community clustering. (+6 more)

### Community 17 - "DriveSyncWorker.kt"
Cohesion: 0.19
Nodes (11): add, DriveSyncWorker, AttachmentEntity, NoticeEntity, buildjsonarray, buildjsonobject, CoroutineWorker, put (+3 more)

### Community 18 - "DeduplicationEngine"
Cohesion: 0.18
Nodes (9): DownloadFolderObserver, Context, DeduplicationEngine, MainActivity, ComponentActivity, environment, KidsDatabase, messagedigest (+1 more)

### Community 19 - "Models.kt"
Cohesion: 0.15
Nodes (12): ChannelType, FILE_IMPORT, GOOGLE_CLASSROOM, SCHOOL_ERP, WHATSAPP, CloudHealthReport, SyncStatus, DROPPED (+4 more)

### Community 20 - "Entities.kt"
Cohesion: 0.18
Nodes (9): AttachmentEntity, ChildProfileEntity, NoticeFtsEntity, Converters, ChannelConfig, entity, fts4, index (+1 more)

### Community 21 - "KotlinGraphifyEngine.kt"
Cohesion: 0.27
Nodes (7): GraphEdge, GraphNode, KnowledgeGraph, KotlinGraphifyEngine, encodetostring, json, typeconverter

### Community 22 - "ChildProfile"
Cohesion: 0.27
Nodes (3): ChildProfile, MultiChildRouter, MultiChildAttributionTest

### Community 23 - "MainActivity.kt"
Cohesion: 0.18
Nodes (10): AppScreen, DASHBOARD, DIAGNOSTICS, WIZARD, KidsAccessibilityService, launch, lifecyclescope, remembersaveable (+2 more)

### Community 24 - "GestureDescription"
Cohesion: 0.27
Nodes (5): GestureResultCallback, GestureResultCallback, GestureResultCallback, GestureDescription, GestureResultCallback

### Community 25 - "MLKitOcrParser.kt"
Cohesion: 0.20
Nodes (9): dispatchers, inputimage, parcelfiledescriptor, pdfrenderer, resume, resumewithexception, suspendcancellablecoroutine, textrecognition (+1 more)

### Community 26 - "KnowledgeGraphBuilderTest.kt"
Cohesion: 0.29
Nodes (3): Attachment, Notice, KnowledgeGraphBuilderTest

### Community 27 - "DriveDeepLogger.kt"
Cohesion: 0.24
Nodes (6): DeviceInfo, DiagnosticSnapshot, DriveDeepLogger, PipelineMetrics, StepStatus, file

### Community 28 - "ChildProfile"
Cohesion: 0.28
Nodes (8): ChildCard(), ChildrenGridDashboard(), KidsTheme(), ChildProfile, Composable, lightcolorscheme, materialtheme, OptIn

### Community 29 - "Type.kt"
Cohesion: 0.22
Nodes (8): font, fontfamily, fontweight, googlefont, r, sp, textstyle, typography

### Community 30 - "Intent"
Cohesion: 0.43
Nodes (4): BootReceiver, Context, BroadcastReceiver, Intent

### Community 31 - "ContentCategory"
Cohesion: 0.33
Nodes (6): ContentCategory, ATTENDANCE, CIRCULAR, FEES, HOMEWORK, UNKNOWN

### Community 32 - "WizardStep"
Cohesion: 0.33
Nodes (6): WizardStep, STEP_0_PERMISSIONS, STEP_1_VAULT, STEP_2_CLASSROOM, STEP_3_PORTALS, STEP_4_WHATSAPP

### Community 33 - "gradlew"
Cohesion: 0.83
Nodes (3): gradlew script, die(), warn()

## Knowledge Gaps
- **35 isolated node(s):** `CloudHealthReport`, `AttachmentEntity`, `NoticeFtsEntity`, `DeviceInfo`, `PipelineMetrics` (+30 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 213 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **19 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `KidsAccessibilityService` connect `KidsAccessibilityService` to `FloatingCrawlerOverlay`, `.matchesAttachmentChipText`, `SafVaultManager.kt`, `KidsAccessibilityService.kt`, `ShareTargetActivity.kt`, `DeduplicationEngine`, `Intent`?**
  _High betweenness centrality (0.235) - this node is a cross-community bridge._
- **Why does `ChildProfile` connect `ChildProfile` to `KidsAccessibilityService`, `ShareTargetActivity.kt`, `OnboardingWizardScreen`, `Models.kt`, `KotlinGraphifyEngine.kt`, `KnowledgeGraphBuilderTest.kt`?**
  _High betweenness centrality (0.079) - this node is a cross-community bridge._
- **Why does `FloatingCrawlerOverlay` connect `FloatingCrawlerOverlay` to `KidsAccessibilityService`?**
  _High betweenness centrality (0.076) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `KidsAccessibilityService` (e.g. with `ContentClassifier` and `DeduplicationEngine`) actually correct?**
  _`KidsAccessibilityService` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Are the 6 inferred relationships involving `GoogleDriveClient` (e.g. with `.preWarmOAuthAndFolders()` and `.provisionStep1()`) actually correct?**
  _`GoogleDriveClient` has 6 INFERRED edges - model-reasoned connections that need verification._
- **What connects `CloudHealthReport`, `AttachmentEntity`, `NoticeFtsEntity` to the rest of the system?**
  _35 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `KidsAccessibilityService` be split into smaller, more focused modules?**
  _Cohesion score 0.07258573532505785 - nodes in this community are weakly interconnected._