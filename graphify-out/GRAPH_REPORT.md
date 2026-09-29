# Graph Report - K.I.D.S  (2026-09-29)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 844 nodes · 1961 edges · 64 communities (37 shown, 27 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 35 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `e398bafd`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- KidsAccessibilityService
- GoogleDriveClient
- Query
- SafVaultManager.kt
- StreamManifest
- GoogleDriveSharedHarvester
- ci_watch.py
- ChildrenGridDashboard.kt
- OnboardingWizardScreen.kt
- FloatingCrawlerOverlay
- KidsAccessibilityService.kt
- KotlinGraphifyEngine.kt
- GestureDescription
- .log
- ShareTargetActivity.kt
- FloatingCrawlerOverlay.kt
- .matchesAttachmentChipText
- ContentCategory
- log
- MLKitOcrParser.kt
- OnboardingWizardScreen
- DriveSyncWorker.kt
- WhatsAppChatExportParser.kt
- MainActivity.kt
- Test
- DeduplicationEngine
- PrivacyFilterTest
- ChildProfile
- GestureDescription
- DriveDeepLogger.kt
- K.I.D.S. Android Collector (PRD)
- DriveVaultManager.kt
- ChildProfile
- Type.kt
- Intent
- assertthat
- WizardStep
- ChannelType
- SyncStatus
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
- Context
- FloatingCrawlerOverlay
- Intent
- Rect
- Volatile
- ChildVaultFolders
- GestureDescription
- GestureResultCallback
- role
- statusbarnotification

## God Nodes (most connected - your core abstractions)
1. `KidsAccessibilityService` - 102 edges
2. `FloatingCrawlerOverlay` - 45 edges
3. `GoogleDriveSharedHarvester` - 39 edges
4. `GoogleDriveClient` - 29 edges
5. `OnboardingWizardScreen()` - 23 edges
6. `DriveVaultManager` - 18 edges
7. `NoticeDao` - 18 edges
8. `ChildProfile` - 18 edges
9. `AttachmentDao` - 17 edges
10. `StreamManifest` - 17 edges

## Surprising Connections (you probably didn't know these)
- `K.I.D.S. Android Collector (PRD)` --backfills_with--> `Dual WhatsApp Catch-Up Engine`  [EXTRACTED]
  prd.md → README.md
- `K.I.D.S. Android Collector (PRD)` --stores_in--> `AI-Native Storage (JSONL & Markdown)`  [EXTRACTED]
  prd.md → README.md
- `K.I.D.S. Android Collector (PRD)` --monitored_by--> `5-Point Cloud Health Probe`  [EXTRACTED]
  prd.md → README.md
- `K.I.D.S. Android Collector (PRD)` --authenticates_via--> `Google Credential Manager API`  [EXTRACTED]
  prd.md → README.md
- `K.I.D.S. Android Collector (PRD)` --filters_with--> `Memory Boundary Privacy Filter`  [EXTRACTED]
  prd.md → GEMINI.md

## Import Cycles
- None detected.

## Communities (64 total, 27 thin omitted)

### Community 0 - "KidsAccessibilityService"
Cohesion: 0.07
Nodes (8): NoticeEntity, ExtractedAttachmentDetail, KidsAccessibilityService, AccessibilityNodeInfo, UnvisitedCard, VisiblePendingCard, StreamManifest, StreamManifestItem

### Community 1 - "GoogleDriveClient"
Cohesion: 0.07
Nodes (24): DriveVaultManager, Failure, Context, Result, ProvisionStep1Result, Success, UserConsentRequired, ChannelVaultFolders (+16 more)

### Community 2 - "Query"
Cohesion: 0.07
Nodes (17): AttachmentDao, ChildProfileDao, AttachmentEntity, NoticeEntity, NoticeDao, KidsDatabase, Context, ChildProfileEntity (+9 more)

### Community 3 - "SafVaultManager.kt"
Cohesion: 0.11
Nodes (18): android, Context, Result, SafVaultFolders, SafVaultManager, Bundle, StatusBarNotification, NotificationParser (+10 more)

### Community 4 - "StreamManifest"
Cohesion: 0.08
Nodes (9): StreamItemStatus, ALREADY_SYNCED, COMPLETED, FAILED_SKIPPED, IN_PROGRESS, PENDING, StreamManifest, StreamManifestItem (+1 more)

### Community 5 - "GoogleDriveSharedHarvester"
Cohesion: 0.17
Nodes (6): AccessibilityNodeInfo, DriveSharedItem, GoogleDriveSharedHarvester, AttachmentEntity, FloatingCrawlerOverlay, Volatile

### Community 6 - "ci_watch.py"
Cohesion: 0.09
Nodes (26): AttachmentEntity, ChildProfileEntity, NoticeFtsEntity, Converters, ChannelConfig, encodetostring, entity, fts4 (+18 more)

### Community 7 - "ChildrenGridDashboard.kt"
Cohesion: 0.11
Nodes (24): alignment, ProbeItem, DiagnosticFeedScreen(), LogLine, background, border, circleshape, clickable (+16 more)

### Community 8 - "OnboardingWizardScreen.kt"
Cohesion: 0.09
Nodes (23): accountmanager, activityresultcontracts, androidx, getDefaultSchoolAppList(), launchAccountPicker(), queryInstalledLauncherApps(), arrowback, backhandler (+15 more)

### Community 10 - "KidsAccessibilityService.kt"
Cohesion: 0.13
Nodes (17): AccessibilityEvent, accessibilitymanager, AccessibilityService, accessibilityserviceinfo, calendar, delay, intentfilter, isactive (+9 more)

### Community 11 - "KotlinGraphifyEngine.kt"
Cohesion: 0.19
Nodes (9): GraphEdge, GraphNode, KnowledgeGraph, KotlinGraphifyEngine, Attachment, CloudHealthReport, Notice, KnowledgeGraphBuilderTest (+1 more)

### Community 12 - "GestureDescription"
Cohesion: 0.16
Nodes (8): GestureResultCallback, GestureResultCallback, GestureResultCallback, GestureResultCallback, GestureResultCallback, GestureResultCallback, GestureDescription, GestureResultCallback

### Community 13 - ".log"
Cohesion: 0.20
Nodes (3): CrawlerTraceLogger, Context, Result

### Community 14 - "ShareTargetActivity.kt"
Cohesion: 0.15
Nodes (16): Activity, KidsNotificationListenerService, StatusBarNotification, cancel, constraints, existingworkpolicy, fileoutputstream, firstornull (+8 more)

### Community 15 - "FloatingCrawlerOverlay.kt"
Cohesion: 0.12
Nodes (15): AccessibilityNodeInfo, Button, gradientdrawable, gravity, handler, LinearLayout, looper, motionevent (+7 more)

### Community 17 - "ContentCategory"
Cohesion: 0.15
Nodes (8): ContentClassifier, ContentCategory, ATTENDANCE, CIRCULAR, FEES, HOMEWORK, UNKNOWN, ContentClassifierTest

### Community 18 - "log"
Cohesion: 0.16
Nodes (11): DownloadFolderObserver, Context, KidsApplication, Application, concurrentlinkedqueue, date, dispatchers, environment (+3 more)

### Community 19 - "MLKitOcrParser.kt"
Cohesion: 0.16
Nodes (11): MLKitOcrParser, OcrExtractionResult, inputimage, parcelfiledescriptor, pdfrenderer, resume, resumewithexception, suspendcancellablecoroutine (+3 more)

### Community 20 - "OnboardingWizardScreen"
Cohesion: 0.35
Nodes (4): Context, PermissionHelper, PermissionSetupDialog(), OnboardingWizardScreen()

### Community 21 - "DriveSyncWorker.kt"
Cohesion: 0.19
Nodes (11): add, DriveSyncWorker, AttachmentEntity, NoticeEntity, buildjsonarray, buildjsonobject, CoroutineWorker, put (+3 more)

### Community 22 - "WhatsAppChatExportParser.kt"
Cohesion: 0.16
Nodes (7): ImportedNoticeRecord, WhatsAppChatExportParser, WhatsAppChatExportParserTest, Dual WhatsApp Catch-Up Engine, inputstream, pattern, simpledateformat

### Community 23 - "MainActivity.kt"
Cohesion: 0.16
Nodes (13): AppScreen, DASHBOARD, DIAGNOSTICS, WIZARD, MainActivity, ComponentActivity, KidsAccessibilityService, KidsDatabase (+5 more)

### Community 25 - "Test"
Cohesion: 0.24
Nodes (7): ClassroomDateParser, ParsedDate, ClassroomDateParserTest, assertequals, assertnotnull, asserttrue, Test

### Community 26 - "DeduplicationEngine"
Cohesion: 0.22
Nodes (4): DeduplicationEngine, java, DeduplicationHashTest, ByteArray

### Community 28 - "ChildProfile"
Cohesion: 0.27
Nodes (3): ChildProfile, MultiChildRouter, MultiChildAttributionTest

### Community 29 - "GestureDescription"
Cohesion: 0.27
Nodes (5): GestureResultCallback, GestureResultCallback, GestureResultCallback, GestureDescription, GestureResultCallback

### Community 30 - "DriveDeepLogger.kt"
Cohesion: 0.24
Nodes (6): DeviceInfo, DiagnosticSnapshot, DriveDeepLogger, PipelineMetrics, StepStatus, file

### Community 31 - "K.I.D.S. Android Collector (PRD)"
Cohesion: 0.22
Nodes (9): AI-Native Storage (JSONL & Markdown), 5-Point Cloud Health Probe, Google Credential Manager API, Memory Boundary Privacy Filter, K.I.D.S. Android Collector (PRD), Restricted Drive Scope (drive.file), Sequential 4-Step Onboarding, Streaming PdfRenderer OCR (+1 more)

### Community 32 - "DriveVaultManager.kt"
Cohesion: 0.22
Nodes (8): CompletableDeferred, CoroutineScope, googleaccountcredential, gsonfactory, nethttptransport, userrecoverableauthexception, userrecoverableauthioexception, withtimeoutornull

### Community 33 - "ChildProfile"
Cohesion: 0.28
Nodes (8): ChildCard(), ChildrenGridDashboard(), KidsTheme(), ChildProfile, Composable, lightcolorscheme, materialtheme, OptIn

### Community 34 - "Type.kt"
Cohesion: 0.22
Nodes (8): font, fontfamily, fontweight, googlefont, r, sp, textstyle, typography

### Community 35 - "Intent"
Cohesion: 0.43
Nodes (4): BootReceiver, Context, BroadcastReceiver, Intent

### Community 36 - "assertthat"
Cohesion: 0.38
Nodes (3): assertthat, beforeeach, bytearrayinputstream

### Community 37 - "WizardStep"
Cohesion: 0.33
Nodes (6): WizardStep, STEP_0_PERMISSIONS, STEP_1_VAULT, STEP_2_CLASSROOM, STEP_3_PORTALS, STEP_4_WHATSAPP

### Community 38 - "ChannelType"
Cohesion: 0.40
Nodes (5): ChannelType, FILE_IMPORT, GOOGLE_CLASSROOM, SCHOOL_ERP, WHATSAPP

### Community 39 - "SyncStatus"
Cohesion: 0.40
Nodes (5): SyncStatus, DROPPED, FAILED, PENDING, SYNCED

### Community 40 - "gradlew"
Cohesion: 0.83
Nodes (3): gradlew script, die(), warn()

## Knowledge Gaps
- **34 isolated node(s):** `CloudHealthReport`, `DeviceInfo`, `PipelineMetrics`, `StepStatus`, `NoticeFtsEntity` (+29 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 214 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **27 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `KidsAccessibilityService` connect `KidsAccessibilityService` to `Intent`, `assertthat`, `GoogleDriveSharedHarvester`, `OnboardingWizardScreen.kt`, `FloatingCrawlerOverlay`, `KidsAccessibilityService.kt`, `.matchesAttachmentChipText`, `ContentCategory`, `DeduplicationEngine`?**
  _High betweenness centrality (0.230) - this node is a cross-community bridge._
- **Why does `ChildProfile` connect `ChildProfile` to `KidsAccessibilityService`, `KotlinGraphifyEngine.kt`, `OnboardingWizardScreen`, `ShareTargetActivity.kt`?**
  _High betweenness centrality (0.078) - this node is a cross-community bridge._
- **Why does `FloatingCrawlerOverlay` connect `FloatingCrawlerOverlay` to `.stopAutoScroll`, `KidsAccessibilityService`, `FloatingCrawlerOverlay.kt`?**
  _High betweenness centrality (0.075) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `KidsAccessibilityService` (e.g. with `ContentClassifier` and `DeduplicationEngine`) actually correct?**
  _`KidsAccessibilityService` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Are the 6 inferred relationships involving `GoogleDriveClient` (e.g. with `.preWarmOAuthAndFolders()` and `.provisionStep1()`) actually correct?**
  _`GoogleDriveClient` has 6 INFERRED edges - model-reasoned connections that need verification._
- **What connects `CloudHealthReport`, `DeviceInfo`, `PipelineMetrics` to the rest of the system?**
  _34 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `KidsAccessibilityService` be split into smaller, more focused modules?**
  _Cohesion score 0.075 - nodes in this community are weakly interconnected._