# Graph Report - K.I.D.S  (2026-09-29)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 852 nodes · 2001 edges · 61 communities (37 shown, 24 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 34 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `6c3df5f9`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- KidsAccessibilityService
- Query
- GoogleDriveClient
- GoogleDriveSharedHarvester
- StreamManifest
- ci_watch.py
- ChildrenGridDashboard.kt
- SafVaultManager.kt
- FloatingCrawlerOverlay
- KidsAccessibilityService.kt
- ShareTargetActivity.kt
- OnboardingWizardScreen.kt
- NotificationParserTest.kt
- GestureDescription
- .log
- DriveVaultManager.kt
- KotlinGraphifyEngine.kt
- FloatingCrawlerOverlay.kt
- .matchesAttachmentChipText
- MLKitOcrParser.kt
- ContentCategory
- OnboardingWizardScreen
- DriveSyncWorker.kt
- Test
- WhatsAppChatExportParser.kt
- Intent
- PrivacyFilterTest
- ChildProfile
- GestureDescription
- GoogleDriveClient.kt
- MainActivity.kt
- DriveDeepLogger.kt
- K.I.D.S. Android Collector (PRD)
- ChildProfile
- Type.kt
- DeduplicationEngine
- Models.kt
- WizardStep
- assertthat
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
- GestureDescription
- GestureResultCallback
- Intent
- ChildVaultFolders
- role
- statusbarnotification

## God Nodes (most connected - your core abstractions)
1. `KidsAccessibilityService` - 103 edges
2. `GoogleDriveSharedHarvester` - 46 edges
3. `FloatingCrawlerOverlay` - 44 edges
4. `GoogleDriveClient` - 29 edges
5. `OnboardingWizardScreen()` - 23 edges
6. `NoticeDao` - 18 edges
7. `DriveVaultManager` - 18 edges
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

## Communities (61 total, 24 thin omitted)

### Community 0 - "KidsAccessibilityService"
Cohesion: 0.07
Nodes (9): ExtractedAttachmentDetail, KidsAccessibilityService, AccessibilityNodeInfo, FloatingCrawlerOverlay, Volatile, UnvisitedCard, VisiblePendingCard, StreamManifest (+1 more)

### Community 1 - "Query"
Cohesion: 0.07
Nodes (17): AttachmentDao, ChildProfileDao, AttachmentEntity, NoticeEntity, NoticeDao, KidsDatabase, Context, ChildProfileEntity (+9 more)

### Community 2 - "GoogleDriveClient"
Cohesion: 0.09
Nodes (17): DriveVaultManager, Failure, Context, Result, ProvisionStep1Result, Success, UserConsentRequired, ChannelVaultFolders (+9 more)

### Community 3 - "GoogleDriveSharedHarvester"
Cohesion: 0.15
Nodes (6): AccessibilityNodeInfo, DriveSharedItem, GoogleDriveSharedHarvester, AttachmentEntity, FloatingCrawlerOverlay, Volatile

### Community 4 - "StreamManifest"
Cohesion: 0.08
Nodes (9): StreamItemStatus, ALREADY_SYNCED, COMPLETED, FAILED_SKIPPED, IN_PROGRESS, PENDING, StreamManifest, StreamManifestItem (+1 more)

### Community 5 - "ci_watch.py"
Cohesion: 0.08
Nodes (27): AttachmentEntity, ChildProfileEntity, NoticeEntity, NoticeFtsEntity, Converters, ChannelConfig, encodetostring, entity (+19 more)

### Community 6 - "ChildrenGridDashboard.kt"
Cohesion: 0.11
Nodes (24): alignment, ProbeItem, DiagnosticFeedScreen(), LogLine, background, border, circleshape, clickable (+16 more)

### Community 7 - "SafVaultManager.kt"
Cohesion: 0.20
Nodes (9): android, Context, Result, SafVaultFolders, SafVaultManager, ShareTargetActivity, Context, DocumentFile (+1 more)

### Community 9 - "KidsAccessibilityService.kt"
Cohesion: 0.11
Nodes (19): AccessibilityEvent, accessibilitymanager, AccessibilityService, accessibilityserviceinfo, Rect, calendar, CoroutineScope, delay (+11 more)

### Community 10 - "ShareTargetActivity.kt"
Cohesion: 0.13
Nodes (19): Activity, MainActivity, KidsNotificationListenerService, StatusBarNotification, cancel, ComponentActivity, constraints, existingworkpolicy (+11 more)

### Community 11 - "OnboardingWizardScreen.kt"
Cohesion: 0.11
Nodes (19): accountmanager, activityresultcontracts, getDefaultSchoolAppList(), queryInstalledLauncherApps(), arrowback, backhandler, channelconfig, channeltype (+11 more)

### Community 12 - "NotificationParserTest.kt"
Cohesion: 0.14
Nodes (12): MLKitOcrParser, OcrExtractionResult, Bundle, StatusBarNotification, NotificationParser, ParsedNotification, NotificationParserTest, Bitmap (+4 more)

### Community 13 - "GestureDescription"
Cohesion: 0.16
Nodes (8): GestureResultCallback, GestureResultCallback, GestureResultCallback, GestureResultCallback, GestureResultCallback, GestureResultCallback, GestureDescription, GestureResultCallback

### Community 14 - ".log"
Cohesion: 0.20
Nodes (3): CrawlerTraceLogger, Context, Result

### Community 15 - "DriveVaultManager.kt"
Cohesion: 0.12
Nodes (15): KidsApplication, Application, CompletableDeferred, concurrentlinkedqueue, date, filewriter, googleaccountcredential, gsonfactory (+7 more)

### Community 16 - "KotlinGraphifyEngine.kt"
Cohesion: 0.22
Nodes (7): GraphEdge, GraphNode, KnowledgeGraph, KotlinGraphifyEngine, Attachment, Notice, KnowledgeGraphBuilderTest

### Community 17 - "FloatingCrawlerOverlay.kt"
Cohesion: 0.12
Nodes (15): AccessibilityNodeInfo, Button, gradientdrawable, gravity, handler, LinearLayout, looper, motionevent (+7 more)

### Community 19 - "MLKitOcrParser.kt"
Cohesion: 0.14
Nodes (13): DownloadFolderObserver, Context, dispatchers, environment, inputimage, parcelfiledescriptor, pdfrenderer, resume (+5 more)

### Community 20 - "ContentCategory"
Cohesion: 0.15
Nodes (8): ContentClassifier, ContentCategory, ATTENDANCE, CIRCULAR, FEES, HOMEWORK, UNKNOWN, ContentClassifierTest

### Community 21 - "OnboardingWizardScreen"
Cohesion: 0.35
Nodes (4): Context, PermissionHelper, PermissionSetupDialog(), OnboardingWizardScreen()

### Community 22 - "DriveSyncWorker.kt"
Cohesion: 0.19
Nodes (11): add, DriveSyncWorker, AttachmentEntity, NoticeEntity, buildjsonarray, buildjsonobject, CoroutineWorker, put (+3 more)

### Community 23 - "Test"
Cohesion: 0.23
Nodes (7): ClassroomDateParser, ParsedDate, ClassroomDateParserTest, assertequals, assertnotnull, asserttrue, Test

### Community 24 - "WhatsAppChatExportParser.kt"
Cohesion: 0.16
Nodes (7): ImportedNoticeRecord, WhatsAppChatExportParser, WhatsAppChatExportParserTest, Dual WhatsApp Catch-Up Engine, inputstream, pattern, simpledateformat

### Community 26 - "Intent"
Cohesion: 0.21
Nodes (8): androidx, launchAccountPicker(), BootReceiver, Context, BroadcastReceiver, Intent, notificationmanagercompat, settings

### Community 28 - "ChildProfile"
Cohesion: 0.26
Nodes (3): ChildProfile, MultiChildRouter, MultiChildAttributionTest

### Community 29 - "GestureDescription"
Cohesion: 0.27
Nodes (5): GestureResultCallback, GestureResultCallback, GestureResultCallback, GestureDescription, GestureResultCallback

### Community 30 - "GoogleDriveClient.kt"
Cohesion: 0.20
Nodes (9): async, bytearraycontent, bytearrayoutputstream, concurrenthashmap, Drive, filecontent, mutex, standardcharsets (+1 more)

### Community 31 - "MainActivity.kt"
Cohesion: 0.20
Nodes (9): AppScreen, DASHBOARD, DIAGNOSTICS, WIZARD, KidsAccessibilityService, lifecyclescope, remembersaveable, setcontent (+1 more)

### Community 32 - "DriveDeepLogger.kt"
Cohesion: 0.24
Nodes (6): DeviceInfo, DiagnosticSnapshot, DriveDeepLogger, PipelineMetrics, StepStatus, file

### Community 33 - "K.I.D.S. Android Collector (PRD)"
Cohesion: 0.22
Nodes (9): AI-Native Storage (JSONL & Markdown), 5-Point Cloud Health Probe, Google Credential Manager API, Memory Boundary Privacy Filter, K.I.D.S. Android Collector (PRD), Restricted Drive Scope (drive.file), Sequential 4-Step Onboarding, Streaming PdfRenderer OCR (+1 more)

### Community 34 - "ChildProfile"
Cohesion: 0.28
Nodes (8): ChildCard(), ChildrenGridDashboard(), KidsTheme(), ChildProfile, Composable, lightcolorscheme, materialtheme, OptIn

### Community 35 - "Type.kt"
Cohesion: 0.22
Nodes (8): font, fontfamily, fontweight, googlefont, r, sp, textstyle, typography

### Community 37 - "Models.kt"
Cohesion: 0.25
Nodes (7): ChannelType, FILE_IMPORT, GOOGLE_CLASSROOM, SCHOOL_ERP, WHATSAPP, CloudHealthReport, serializable

### Community 38 - "WizardStep"
Cohesion: 0.33
Nodes (6): WizardStep, STEP_0_PERMISSIONS, STEP_1_VAULT, STEP_2_CLASSROOM, STEP_3_PORTALS, STEP_4_WHATSAPP

### Community 39 - "assertthat"
Cohesion: 0.40
Nodes (3): assertthat, beforeeach, bytearrayinputstream

### Community 40 - "SyncStatus"
Cohesion: 0.40
Nodes (5): SyncStatus, DROPPED, FAILED, PENDING, SYNCED

### Community 41 - "gradlew"
Cohesion: 0.83
Nodes (3): gradlew script, die(), warn()

## Knowledge Gaps
- **35 isolated node(s):** `DeviceInfo`, `PipelineMetrics`, `StepStatus`, `CloudHealthReport`, `AttachmentEntity` (+30 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 213 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **24 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `KidsAccessibilityService` connect `KidsAccessibilityService` to `DeduplicationEngine`, `SafVaultManager.kt`, `FloatingCrawlerOverlay`, `KidsAccessibilityService.kt`, `assertthat`, `.matchesAttachmentChipText`, `ContentCategory`, `Intent`, `ChildProfile`?**
  _High betweenness centrality (0.233) - this node is a cross-community bridge._
- **Why does `ChildProfile` connect `ChildProfile` to `KidsAccessibilityService`, `Models.kt`, `assertthat`, `ShareTargetActivity.kt`, `KotlinGraphifyEngine.kt`, `OnboardingWizardScreen`?**
  _High betweenness centrality (0.078) - this node is a cross-community bridge._
- **Why does `FloatingCrawlerOverlay` connect `FloatingCrawlerOverlay` to `KidsAccessibilityService`, `FloatingCrawlerOverlay.kt`, `.stopAutoScroll`?**
  _High betweenness centrality (0.075) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `KidsAccessibilityService` (e.g. with `ContentClassifier` and `DeduplicationEngine`) actually correct?**
  _`KidsAccessibilityService` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Are the 6 inferred relationships involving `GoogleDriveClient` (e.g. with `.preWarmOAuthAndFolders()` and `.provisionStep1()`) actually correct?**
  _`GoogleDriveClient` has 6 INFERRED edges - model-reasoned connections that need verification._
- **What connects `DeviceInfo`, `PipelineMetrics`, `StepStatus` to the rest of the system?**
  _35 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `KidsAccessibilityService` be split into smaller, more focused modules?**
  _Cohesion score 0.07456140350877193 - nodes in this community are weakly interconnected._