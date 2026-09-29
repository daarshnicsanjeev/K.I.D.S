# Graph Report - K.I.D.S  (2026-09-29)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 844 nodes · 1962 edges · 64 communities (36 shown, 28 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 35 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `933e4098`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- KidsAccessibilityService
- GoogleDriveClient
- Query
- GoogleDriveSharedHarvester
- StreamManifest
- ci_watch.py
- KidsAccessibilityService.kt
- FloatingCrawlerOverlay
- OnboardingWizardScreen.kt
- SafVaultManager.kt
- NotificationParserTest.kt
- GestureDescription
- ChildrenGridDashboard.kt
- .log
- ShareTargetActivity.kt
- ContentCategory
- KotlinGraphifyEngine.kt
- DriveVaultManager.kt
- FloatingCrawlerOverlay.kt
- .matchesAttachmentChipText
- WhatsAppChatExportParser.kt
- OnboardingWizardScreen
- DriveSyncWorker.kt
- DeduplicationEngine
- PrivacyFilterTest
- Models.kt
- ChildProfile
- GestureDescription
- MainActivity.kt
- DriveDeepLogger.kt
- K.I.D.S. Android Collector (PRD)
- MLKitOcrParser.kt
- ChildProfile
- Intent
- PermissionSetupDialog.kt
- Type.kt
- WizardStep
- DeduplicationHashTest.kt
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
- AccessibilityNodeInfo
- Context
- FloatingCrawlerOverlay
- GestureDescription
- GestureResultCallback
- Intent
- Rect
- Volatile
- ChildVaultFolders
- role
- statusbarnotification

## God Nodes (most connected - your core abstractions)
1. `KidsAccessibilityService` - 103 edges
2. `FloatingCrawlerOverlay` - 44 edges
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

## Communities (64 total, 28 thin omitted)

### Community 0 - "KidsAccessibilityService"
Cohesion: 0.08
Nodes (8): AccessibilityNodeInfo, ExtractedAttachmentDetail, KidsAccessibilityService, UnvisitedCard, VisiblePendingCard, FloatingCrawlerOverlay, StreamManifest, StreamManifestItem

### Community 1 - "GoogleDriveClient"
Cohesion: 0.07
Nodes (26): DriveVaultManager, Failure, Context, Result, ProvisionStep1Result, Success, UserConsentRequired, ChannelVaultFolders (+18 more)

### Community 2 - "Query"
Cohesion: 0.07
Nodes (17): AttachmentDao, ChildProfileDao, AttachmentEntity, NoticeEntity, NoticeDao, KidsDatabase, Context, ChildProfileEntity (+9 more)

### Community 3 - "GoogleDriveSharedHarvester"
Cohesion: 0.10
Nodes (11): ClassroomDateParser, ParsedDate, DriveSharedItem, GoogleDriveSharedHarvester, ClassroomDateParserTest, assertequals, assertnotnull, asserttrue (+3 more)

### Community 4 - "StreamManifest"
Cohesion: 0.08
Nodes (9): StreamItemStatus, ALREADY_SYNCED, COMPLETED, FAILED_SKIPPED, IN_PROGRESS, PENDING, StreamManifest, StreamManifestItem (+1 more)

### Community 5 - "ci_watch.py"
Cohesion: 0.08
Nodes (27): AttachmentEntity, ChildProfileEntity, NoticeEntity, NoticeFtsEntity, Converters, ChannelConfig, encodetostring, entity (+19 more)

### Community 6 - "KidsAccessibilityService.kt"
Cohesion: 0.11
Nodes (20): AccessibilityEvent, accessibilitymanager, AccessibilityService, accessibilityserviceinfo, calendar, Context, delay, existingworkpolicy (+12 more)

### Community 8 - "OnboardingWizardScreen.kt"
Cohesion: 0.10
Nodes (21): accountmanager, activityresultcontracts, androidx, getDefaultSchoolAppList(), launchAccountPicker(), queryInstalledLauncherApps(), arrowback, backhandler (+13 more)

### Community 9 - "SafVaultManager.kt"
Cohesion: 0.23
Nodes (8): android, Context, Result, SafVaultFolders, SafVaultManager, ShareTargetActivity, DocumentFile, Uri

### Community 10 - "NotificationParserTest.kt"
Cohesion: 0.14
Nodes (12): MLKitOcrParser, OcrExtractionResult, Bundle, StatusBarNotification, NotificationParser, ParsedNotification, NotificationParserTest, Bitmap (+4 more)

### Community 11 - "GestureDescription"
Cohesion: 0.16
Nodes (8): GestureResultCallback, GestureResultCallback, GestureResultCallback, GestureResultCallback, GestureResultCallback, GestureResultCallback, GestureDescription, GestureResultCallback

### Community 12 - "ChildrenGridDashboard.kt"
Cohesion: 0.16
Nodes (17): alignment, ProbeItem, DiagnosticFeedScreen(), LogLine, circleshape, clickable, clip, contentdescription (+9 more)

### Community 13 - ".log"
Cohesion: 0.20
Nodes (3): CrawlerTraceLogger, Context, Result

### Community 14 - "ShareTargetActivity.kt"
Cohesion: 0.17
Nodes (16): Activity, KidsNotificationListenerService, StatusBarNotification, cancel, constraints, CoroutineScope, dispatchers, fileoutputstream (+8 more)

### Community 15 - "ContentCategory"
Cohesion: 0.13
Nodes (9): ContentClassifier, ContentCategory, ATTENDANCE, CIRCULAR, FEES, HOMEWORK, UNKNOWN, ContentClassifierTest (+1 more)

### Community 16 - "KotlinGraphifyEngine.kt"
Cohesion: 0.22
Nodes (7): GraphEdge, GraphNode, KnowledgeGraph, KotlinGraphifyEngine, Attachment, Notice, KnowledgeGraphBuilderTest

### Community 17 - "DriveVaultManager.kt"
Cohesion: 0.13
Nodes (14): KidsApplication, Application, CompletableDeferred, concurrentlinkedqueue, date, filewriter, googleaccountcredential, gsonfactory (+6 more)

### Community 18 - "FloatingCrawlerOverlay.kt"
Cohesion: 0.12
Nodes (15): AccessibilityNodeInfo, Button, gradientdrawable, gravity, handler, LinearLayout, looper, motionevent (+7 more)

### Community 20 - "WhatsAppChatExportParser.kt"
Cohesion: 0.15
Nodes (8): ImportedNoticeRecord, WhatsAppChatExportParser, WhatsAppChatExportParserTest, bytearrayinputstream, Dual WhatsApp Catch-Up Engine, inputstream, pattern, simpledateformat

### Community 21 - "OnboardingWizardScreen"
Cohesion: 0.35
Nodes (4): Context, PermissionHelper, PermissionSetupDialog(), OnboardingWizardScreen()

### Community 22 - "DriveSyncWorker.kt"
Cohesion: 0.19
Nodes (11): add, DriveSyncWorker, AttachmentEntity, NoticeEntity, buildjsonarray, buildjsonobject, CoroutineWorker, put (+3 more)

### Community 23 - "DeduplicationEngine"
Cohesion: 0.18
Nodes (9): DownloadFolderObserver, Context, DeduplicationEngine, MainActivity, ComponentActivity, environment, KidsDatabase, messagedigest (+1 more)

### Community 25 - "PrivacyFilterTest"
Cohesion: 0.18
Nodes (3): PrivacyFilter, PrivacyFilterTest, beforeeach

### Community 26 - "Models.kt"
Cohesion: 0.15
Nodes (12): ChannelType, FILE_IMPORT, GOOGLE_CLASSROOM, SCHOOL_ERP, WHATSAPP, CloudHealthReport, SyncStatus, DROPPED (+4 more)

### Community 27 - "ChildProfile"
Cohesion: 0.26
Nodes (3): ChildProfile, MultiChildRouter, MultiChildAttributionTest

### Community 28 - "GestureDescription"
Cohesion: 0.27
Nodes (5): GestureResultCallback, GestureResultCallback, GestureResultCallback, GestureDescription, GestureResultCallback

### Community 29 - "MainActivity.kt"
Cohesion: 0.20
Nodes (9): AppScreen, DASHBOARD, DIAGNOSTICS, WIZARD, KidsAccessibilityService, lifecyclescope, remembersaveable, setcontent (+1 more)

### Community 30 - "DriveDeepLogger.kt"
Cohesion: 0.24
Nodes (6): DeviceInfo, DiagnosticSnapshot, DriveDeepLogger, PipelineMetrics, StepStatus, file

### Community 31 - "K.I.D.S. Android Collector (PRD)"
Cohesion: 0.22
Nodes (9): AI-Native Storage (JSONL & Markdown), 5-Point Cloud Health Probe, Google Credential Manager API, Memory Boundary Privacy Filter, K.I.D.S. Android Collector (PRD), Restricted Drive Scope (drive.file), Sequential 4-Step Onboarding, Streaming PdfRenderer OCR (+1 more)

### Community 32 - "MLKitOcrParser.kt"
Cohesion: 0.22
Nodes (8): inputimage, parcelfiledescriptor, pdfrenderer, resume, resumewithexception, suspendcancellablecoroutine, textrecognition, textrecognizeroptions

### Community 33 - "ChildProfile"
Cohesion: 0.28
Nodes (8): ChildCard(), ChildrenGridDashboard(), KidsTheme(), ChildProfile, Composable, lightcolorscheme, materialtheme, OptIn

### Community 34 - "Intent"
Cohesion: 0.31
Nodes (5): BootReceiver, Context, BroadcastReceiver, Intent, notificationmanagercompat

### Community 35 - "PermissionSetupDialog.kt"
Cohesion: 0.22
Nodes (7): background, border, dialog, lifecycle, lifecycleeventobserver, localcontext, locallifecycleowner

### Community 36 - "Type.kt"
Cohesion: 0.22
Nodes (8): font, fontfamily, fontweight, googlefont, r, sp, textstyle, typography

### Community 37 - "WizardStep"
Cohesion: 0.33
Nodes (6): WizardStep, STEP_0_PERMISSIONS, STEP_1_VAULT, STEP_2_CLASSROOM, STEP_3_PORTALS, STEP_4_WHATSAPP

### Community 39 - "gradlew"
Cohesion: 0.83
Nodes (3): gradlew script, die(), warn()

## Knowledge Gaps
- **34 isolated node(s):** `CloudHealthReport`, `DeviceInfo`, `PipelineMetrics`, `StepStatus`, `NoticeFtsEntity` (+29 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 214 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **28 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `KidsAccessibilityService` connect `KidsAccessibilityService` to `Intent`, `GoogleDriveSharedHarvester`, `KidsAccessibilityService.kt`, `FloatingCrawlerOverlay`, `ContentCategory`, `.matchesAttachmentChipText`, `DeduplicationEngine`, `ChildProfile`?**
  _High betweenness centrality (0.228) - this node is a cross-community bridge._
- **Why does `ChildProfile` connect `ChildProfile` to `KidsAccessibilityService`, `ShareTargetActivity.kt`, `KotlinGraphifyEngine.kt`, `OnboardingWizardScreen`, `Models.kt`?**
  _High betweenness centrality (0.079) - this node is a cross-community bridge._
- **Why does `FloatingCrawlerOverlay` connect `FloatingCrawlerOverlay` to `.stopAutoScroll`, `KidsAccessibilityService`, `FloatingCrawlerOverlay.kt`?**
  _High betweenness centrality (0.075) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `KidsAccessibilityService` (e.g. with `ContentClassifier` and `DeduplicationEngine`) actually correct?**
  _`KidsAccessibilityService` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Are the 6 inferred relationships involving `GoogleDriveClient` (e.g. with `.preWarmOAuthAndFolders()` and `.provisionStep1()`) actually correct?**
  _`GoogleDriveClient` has 6 INFERRED edges - model-reasoned connections that need verification._
- **What connects `CloudHealthReport`, `DeviceInfo`, `PipelineMetrics` to the rest of the system?**
  _34 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `KidsAccessibilityService` be split into smaller, more focused modules?**
  _Cohesion score 0.07592385218365062 - nodes in this community are weakly interconnected._