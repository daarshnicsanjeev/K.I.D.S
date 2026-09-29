# Graph Report - K.I.D.S  (2026-09-29)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 854 nodes · 2013 edges · 59 communities (37 shown, 22 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 34 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `991815bb`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- KidsAccessibilityService
- Query
- OnboardingWizardScreen
- GoogleDriveSharedHarvester
- MLKitOcrParser.kt
- StreamManifest
- GoogleDriveClient
- ci_watch.py
- KidsAccessibilityService.kt
- FloatingCrawlerOverlay
- SafVaultManager.kt
- OnboardingWizardScreen.kt
- GestureDescription
- .log
- ShareTargetActivity.kt
- KotlinGraphifyEngine.kt
- FloatingCrawlerOverlay.kt
- .matchesAttachmentChipText
- ChildrenGridDashboard.kt
- ContentCategory
- DriveSyncWorker.kt
- WhatsAppChatExportParser.kt
- .parse
- Models.kt
- MainActivity.kt
- DeduplicationEngine
- PrivacyFilterTest
- ChildProfile
- GestureDescription
- Test
- dispatchers
- DriveDeepLogger.kt
- DriveVaultManager.kt
- log
- ChildProfile
- PermissionSetupDialog.kt
- Type.kt
- Intent
- WizardStep
- gradlew
- AccessibilityNodeInfo
- java
- Bundle
- Context
- Intent
- Result
- GestureDescription
- GestureResultCallback
- Intent
- ChildVaultFolders
- FloatingCrawlerOverlay
- Rect
- role
- statusbarnotification
- Volatile

## God Nodes (most connected - your core abstractions)
1. `KidsAccessibilityService` - 103 edges
2. `GoogleDriveSharedHarvester` - 48 edges
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

## Communities (59 total, 22 thin omitted)

### Community 0 - "KidsAccessibilityService"
Cohesion: 0.07
Nodes (9): ExtractedAttachmentDetail, KidsAccessibilityService, AccessibilityNodeInfo, FloatingCrawlerOverlay, Volatile, UnvisitedCard, VisiblePendingCard, StreamManifest (+1 more)

### Community 1 - "Query"
Cohesion: 0.07
Nodes (17): AttachmentDao, ChildProfileDao, AttachmentEntity, NoticeEntity, NoticeDao, KidsDatabase, Context, ChildProfileEntity (+9 more)

### Community 2 - "OnboardingWizardScreen"
Cohesion: 0.11
Nodes (21): androidx, DriveVaultManager, Failure, Context, Result, ProvisionStep1Result, Success, UserConsentRequired (+13 more)

### Community 3 - "GoogleDriveSharedHarvester"
Cohesion: 0.15
Nodes (6): DriveSharedItem, GoogleDriveSharedHarvester, AccessibilityNodeInfo, FloatingCrawlerOverlay, Volatile, AttachmentEntity

### Community 4 - "MLKitOcrParser.kt"
Cohesion: 0.07
Nodes (29): AI-Native Storage (JSONL & Markdown), MLKitOcrParser, OcrExtractionResult, Bundle, StatusBarNotification, NotificationParser, ParsedNotification, NotificationParserTest (+21 more)

### Community 5 - "StreamManifest"
Cohesion: 0.08
Nodes (9): StreamItemStatus, ALREADY_SYNCED, COMPLETED, FAILED_SKIPPED, IN_PROGRESS, PENDING, StreamManifest, StreamManifestItem (+1 more)

### Community 6 - "GoogleDriveClient"
Cohesion: 0.10
Nodes (13): ChannelVaultFolders, DriveQuotaInfo, GoogleDriveClient, async, bytearraycontent, bytearrayoutputstream, concurrenthashmap, Drive (+5 more)

### Community 7 - "ci_watch.py"
Cohesion: 0.08
Nodes (27): AttachmentEntity, ChildProfileEntity, NoticeEntity, NoticeFtsEntity, Converters, ChannelConfig, encodetostring, entity (+19 more)

### Community 8 - "KidsAccessibilityService.kt"
Cohesion: 0.11
Nodes (20): AccessibilityEvent, accessibilitymanager, AccessibilityService, accessibilityserviceinfo, Context, Rect, Rect, calendar (+12 more)

### Community 10 - "SafVaultManager.kt"
Cohesion: 0.23
Nodes (8): android, Context, Result, SafVaultFolders, SafVaultManager, ShareTargetActivity, DocumentFile, Uri

### Community 11 - "OnboardingWizardScreen.kt"
Cohesion: 0.11
Nodes (19): accountmanager, activityresultcontracts, getDefaultSchoolAppList(), queryInstalledLauncherApps(), arrowback, backhandler, channelconfig, channeltype (+11 more)

### Community 12 - "GestureDescription"
Cohesion: 0.16
Nodes (8): GestureResultCallback, GestureResultCallback, GestureResultCallback, GestureResultCallback, GestureResultCallback, GestureResultCallback, GestureDescription, GestureResultCallback

### Community 13 - ".log"
Cohesion: 0.20
Nodes (3): CrawlerTraceLogger, Context, Result

### Community 14 - "ShareTargetActivity.kt"
Cohesion: 0.15
Nodes (16): Activity, KidsNotificationListenerService, StatusBarNotification, cancel, constraints, existingworkpolicy, fileoutputstream, firstornull (+8 more)

### Community 15 - "KotlinGraphifyEngine.kt"
Cohesion: 0.22
Nodes (7): GraphEdge, GraphNode, KnowledgeGraph, KotlinGraphifyEngine, Attachment, Notice, KnowledgeGraphBuilderTest

### Community 16 - "FloatingCrawlerOverlay.kt"
Cohesion: 0.12
Nodes (15): AccessibilityNodeInfo, Button, gradientdrawable, gravity, handler, LinearLayout, looper, motionevent (+7 more)

### Community 18 - "ChildrenGridDashboard.kt"
Cohesion: 0.18
Nodes (14): alignment, background, circleshape, clickable, clip, contentdescription, gridcells, heading (+6 more)

### Community 19 - "ContentCategory"
Cohesion: 0.14
Nodes (8): ContentClassifier, ContentCategory, ATTENDANCE, CIRCULAR, FEES, HOMEWORK, UNKNOWN, ContentClassifierTest

### Community 20 - "DriveSyncWorker.kt"
Cohesion: 0.19
Nodes (11): add, DriveSyncWorker, AttachmentEntity, NoticeEntity, buildjsonarray, buildjsonobject, CoroutineWorker, put (+3 more)

### Community 21 - "WhatsAppChatExportParser.kt"
Cohesion: 0.16
Nodes (7): ImportedNoticeRecord, WhatsAppChatExportParser, WhatsAppChatExportParserTest, Dual WhatsApp Catch-Up Engine, inputstream, pattern, simpledateformat

### Community 23 - ".parse"
Cohesion: 0.22
Nodes (6): ClassroomDateParser, ParsedDate, ClassroomDateParserTest, assertequals, assertnotnull, asserttrue

### Community 24 - "Models.kt"
Cohesion: 0.15
Nodes (12): ChannelType, FILE_IMPORT, GOOGLE_CLASSROOM, SCHOOL_ERP, WHATSAPP, CloudHealthReport, SyncStatus, DROPPED (+4 more)

### Community 25 - "MainActivity.kt"
Cohesion: 0.15
Nodes (11): AppScreen, DASHBOARD, DIAGNOSTICS, WIZARD, KidsAccessibilityService, lifecyclescope, notificationmanagercompat, remembersaveable (+3 more)

### Community 26 - "DeduplicationEngine"
Cohesion: 0.22
Nodes (4): DeduplicationEngine, java, DeduplicationHashTest, ByteArray

### Community 28 - "ChildProfile"
Cohesion: 0.25
Nodes (3): ChildProfile, MultiChildRouter, MultiChildAttributionTest

### Community 29 - "GestureDescription"
Cohesion: 0.27
Nodes (5): GestureResultCallback, GestureResultCallback, GestureResultCallback, GestureDescription, GestureResultCallback

### Community 30 - "Test"
Cohesion: 0.38
Nodes (4): assertthat, beforeeach, bytearrayinputstream, Test

### Community 31 - "dispatchers"
Cohesion: 0.22
Nodes (8): DownloadFolderObserver, Context, MainActivity, ComponentActivity, dispatchers, environment, KidsDatabase, withcontext

### Community 32 - "DriveDeepLogger.kt"
Cohesion: 0.24
Nodes (6): DeviceInfo, DiagnosticSnapshot, DriveDeepLogger, PipelineMetrics, StepStatus, file

### Community 33 - "DriveVaultManager.kt"
Cohesion: 0.22
Nodes (8): CompletableDeferred, googleaccountcredential, gsonfactory, launch, nethttptransport, userrecoverableauthexception, userrecoverableauthioexception, withtimeoutornull

### Community 34 - "log"
Cohesion: 0.25
Nodes (7): KidsApplication, Application, concurrentlinkedqueue, date, filewriter, log, printwriter

### Community 35 - "ChildProfile"
Cohesion: 0.28
Nodes (8): ChildCard(), ChildrenGridDashboard(), KidsTheme(), ChildProfile, Composable, lightcolorscheme, materialtheme, OptIn

### Community 36 - "PermissionSetupDialog.kt"
Cohesion: 0.22
Nodes (7): border, dialog, dp, lifecycle, lifecycleeventobserver, locallifecycleowner, roundedcornershape

### Community 37 - "Type.kt"
Cohesion: 0.22
Nodes (8): font, fontfamily, fontweight, googlefont, r, sp, textstyle, typography

### Community 38 - "Intent"
Cohesion: 0.43
Nodes (4): BootReceiver, Context, BroadcastReceiver, Intent

### Community 39 - "WizardStep"
Cohesion: 0.33
Nodes (6): WizardStep, STEP_0_PERMISSIONS, STEP_1_VAULT, STEP_2_CLASSROOM, STEP_3_PORTALS, STEP_4_WHATSAPP

### Community 40 - "gradlew"
Cohesion: 0.83
Nodes (3): gradlew script, die(), warn()

## Knowledge Gaps
- **35 isolated node(s):** `CloudHealthReport`, `DeviceInfo`, `PipelineMetrics`, `StepStatus`, `AttachmentEntity` (+30 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 212 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **22 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `KidsAccessibilityService` connect `KidsAccessibilityService` to `OnboardingWizardScreen`, `Intent`, `KidsAccessibilityService.kt`, `FloatingCrawlerOverlay`, `.matchesAttachmentChipText`, `ContentCategory`, `DeduplicationEngine`, `ChildProfile`, `Test`?**
  _High betweenness centrality (0.234) - this node is a cross-community bridge._
- **Why does `ChildProfile` connect `ChildProfile` to `KidsAccessibilityService`, `OnboardingWizardScreen`, `ShareTargetActivity.kt`, `KotlinGraphifyEngine.kt`, `Models.kt`, `Test`?**
  _High betweenness centrality (0.079) - this node is a cross-community bridge._
- **Why does `FloatingCrawlerOverlay` connect `FloatingCrawlerOverlay` to `FloatingCrawlerOverlay.kt`, `KidsAccessibilityService`, `.stopAutoScroll`?**
  _High betweenness centrality (0.076) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `KidsAccessibilityService` (e.g. with `ContentClassifier` and `DeduplicationEngine`) actually correct?**
  _`KidsAccessibilityService` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Are the 6 inferred relationships involving `GoogleDriveClient` (e.g. with `.preWarmOAuthAndFolders()` and `.provisionStep1()`) actually correct?**
  _`GoogleDriveClient` has 6 INFERRED edges - model-reasoned connections that need verification._
- **What connects `CloudHealthReport`, `DeviceInfo`, `PipelineMetrics` to the rest of the system?**
  _35 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `KidsAccessibilityService` be split into smaller, more focused modules?**
  _Cohesion score 0.07456140350877193 - nodes in this community are weakly interconnected._