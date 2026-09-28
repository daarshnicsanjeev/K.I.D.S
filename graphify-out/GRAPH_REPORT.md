# Graph Report - K.I.D.S  (2026-09-28)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 830 nodes · 1922 edges · 54 communities (33 shown, 21 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 34 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `adaaa079`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- KidsAccessibilityService
- OnboardingWizardScreen
- GoogleDriveClient
- Query
- StreamManifest
- GoogleDriveSharedHarvester
- MLKitOcrParser.kt
- ci_watch.py
- KidsAccessibilityService.kt
- FloatingCrawlerOverlay
- SafVaultManager.kt
- GestureDescription
- OnboardingWizardScreen.kt
- ChildrenGridDashboard.kt
- .log
- DriveVaultManager.kt
- .matchesAttachmentChipText
- FloatingCrawlerOverlay.kt
- DriveSyncWorker.kt
- WhatsAppChatExportParser.kt
- MainActivity.kt
- Test
- DeduplicationEngine
- PrivacyFilterTest
- GestureDescription
- dispatchers
- DriveDeepLogger.kt
- GoogleDriveSharedHarvester.kt
- K.I.D.S. Android Collector (PRD)
- ContentCategory
- PermissionSetupDialog.kt
- Type.kt
- Intent
- .fallbackNativeScroll
- assertthat
- WizardStep
- ContentClassifierTest
- gradlew
- java
- Bundle
- Result
- AccessibilityNodeInfo
- Context
- FloatingCrawlerOverlay
- Rect
- Volatile
- GestureDescription
- GestureResultCallback
- ChildVaultFolders
- role
- statusbarnotification

## God Nodes (most connected - your core abstractions)
1. `KidsAccessibilityService` - 97 edges
2. `FloatingCrawlerOverlay` - 42 edges
3. `GoogleDriveSharedHarvester` - 39 edges
4. `GoogleDriveClient` - 29 edges
5. `OnboardingWizardScreen()` - 23 edges
6. `ChildProfile` - 21 edges
7. `DriveVaultManager` - 18 edges
8. `NoticeDao` - 18 edges
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

## Communities (54 total, 21 thin omitted)

### Community 0 - "KidsAccessibilityService"
Cohesion: 0.08
Nodes (10): NoticeEntity, ExtractedAttachmentDetail, KidsAccessibilityService, AccessibilityNodeInfo, FloatingCrawlerOverlay, Volatile, UnvisitedCard, VisiblePendingCard (+2 more)

### Community 1 - "OnboardingWizardScreen"
Cohesion: 0.06
Nodes (34): GraphEdge, GraphNode, KnowledgeGraph, KotlinGraphifyEngine, Attachment, ChannelType, FILE_IMPORT, GOOGLE_CLASSROOM (+26 more)

### Community 2 - "GoogleDriveClient"
Cohesion: 0.08
Nodes (22): DriveVaultManager, Failure, Context, Result, ProvisionStep1Result, Success, UserConsentRequired, ChannelVaultFolders (+14 more)

### Community 3 - "Query"
Cohesion: 0.07
Nodes (17): AttachmentDao, ChildProfileDao, AttachmentEntity, NoticeEntity, NoticeDao, KidsDatabase, Context, ChildProfileEntity (+9 more)

### Community 4 - "StreamManifest"
Cohesion: 0.08
Nodes (9): StreamItemStatus, ALREADY_SYNCED, COMPLETED, FAILED_SKIPPED, IN_PROGRESS, PENDING, StreamManifest, StreamManifestItem (+1 more)

### Community 5 - "GoogleDriveSharedHarvester"
Cohesion: 0.17
Nodes (6): AccessibilityNodeInfo, DriveSharedItem, GoogleDriveSharedHarvester, AttachmentEntity, FloatingCrawlerOverlay, Volatile

### Community 6 - "MLKitOcrParser.kt"
Cohesion: 0.08
Nodes (23): MLKitOcrParser, OcrExtractionResult, Bundle, StatusBarNotification, NotificationParser, ParsedNotification, NotificationParserTest, Bitmap (+15 more)

### Community 7 - "ci_watch.py"
Cohesion: 0.09
Nodes (26): AttachmentEntity, ChildProfileEntity, NoticeFtsEntity, Converters, ChannelConfig, encodetostring, entity, fts4 (+18 more)

### Community 8 - "KidsAccessibilityService.kt"
Cohesion: 0.11
Nodes (24): AccessibilityEvent, accessibilitymanager, accessibilityserviceinfo, Activity, Rect, KidsNotificationListenerService, cancel, constraints (+16 more)

### Community 10 - "SafVaultManager.kt"
Cohesion: 0.20
Nodes (9): android, Context, Result, SafVaultFolders, SafVaultManager, ShareTargetActivity, Context, DocumentFile (+1 more)

### Community 11 - "GestureDescription"
Cohesion: 0.14
Nodes (7): GestureResultCallback, GestureResultCallback, GestureResultCallback, GestureResultCallback, GestureResultCallback, GestureDescription, GestureResultCallback

### Community 12 - "OnboardingWizardScreen.kt"
Cohesion: 0.11
Nodes (19): accountmanager, activityresultcontracts, getDefaultSchoolAppList(), Context, queryInstalledLauncherApps(), arrowback, backhandler, channelconfig (+11 more)

### Community 13 - "ChildrenGridDashboard.kt"
Cohesion: 0.16
Nodes (17): alignment, ProbeItem, DiagnosticFeedScreen(), LogLine, circleshape, clickable, clip, contentdescription (+9 more)

### Community 14 - ".log"
Cohesion: 0.20
Nodes (3): CrawlerTraceLogger, Context, Result

### Community 15 - "DriveVaultManager.kt"
Cohesion: 0.13
Nodes (14): KidsApplication, Application, CompletableDeferred, concurrentlinkedqueue, date, filewriter, googleaccountcredential, gsonfactory (+6 more)

### Community 17 - "FloatingCrawlerOverlay.kt"
Cohesion: 0.14
Nodes (13): Button, gradientdrawable, gravity, handler, LinearLayout, looper, motionevent, pixelformat (+5 more)

### Community 18 - "DriveSyncWorker.kt"
Cohesion: 0.19
Nodes (11): add, DriveSyncWorker, AttachmentEntity, NoticeEntity, buildjsonarray, buildjsonobject, CoroutineWorker, put (+3 more)

### Community 19 - "WhatsAppChatExportParser.kt"
Cohesion: 0.16
Nodes (7): ImportedNoticeRecord, WhatsAppChatExportParser, WhatsAppChatExportParserTest, Dual WhatsApp Catch-Up Engine, inputstream, pattern, simpledateformat

### Community 20 - "MainActivity.kt"
Cohesion: 0.14
Nodes (12): AppScreen, DASHBOARD, DIAGNOSTICS, WIZARD, childprofile, launch, lifecyclescope, notificationmanagercompat (+4 more)

### Community 21 - "Test"
Cohesion: 0.24
Nodes (7): ClassroomDateParser, ParsedDate, ClassroomDateParserTest, assertequals, assertnotnull, asserttrue, Test

### Community 22 - "DeduplicationEngine"
Cohesion: 0.22
Nodes (4): DeduplicationEngine, java, DeduplicationHashTest, ByteArray

### Community 24 - "GestureDescription"
Cohesion: 0.27
Nodes (5): GestureResultCallback, GestureResultCallback, GestureResultCallback, GestureDescription, GestureResultCallback

### Community 25 - "dispatchers"
Cohesion: 0.22
Nodes (8): DownloadFolderObserver, Context, MainActivity, ComponentActivity, dispatchers, environment, KidsDatabase, withcontext

### Community 26 - "DriveDeepLogger.kt"
Cohesion: 0.24
Nodes (6): DeviceInfo, DiagnosticSnapshot, DriveDeepLogger, PipelineMetrics, StepStatus, file

### Community 27 - "GoogleDriveSharedHarvester.kt"
Cohesion: 0.28
Nodes (7): AccessibilityService, calendar, CoroutineScope, delay, isactive, locale, Rect

### Community 28 - "K.I.D.S. Android Collector (PRD)"
Cohesion: 0.22
Nodes (9): AI-Native Storage (JSONL & Markdown), 5-Point Cloud Health Probe, Google Credential Manager API, Memory Boundary Privacy Filter, K.I.D.S. Android Collector (PRD), Restricted Drive Scope (drive.file), Sequential 4-Step Onboarding, Streaming PdfRenderer OCR (+1 more)

### Community 29 - "ContentCategory"
Cohesion: 0.25
Nodes (7): ContentClassifier, ContentCategory, ATTENDANCE, CIRCULAR, FEES, HOMEWORK, UNKNOWN

### Community 30 - "PermissionSetupDialog.kt"
Cohesion: 0.22
Nodes (7): background, border, dialog, lifecycle, lifecycleeventobserver, locallifecycleowner, roundedcornershape

### Community 31 - "Type.kt"
Cohesion: 0.22
Nodes (8): font, fontfamily, fontweight, googlefont, r, sp, textstyle, typography

### Community 32 - "Intent"
Cohesion: 0.36
Nodes (6): androidx, launchAccountPicker(), BootReceiver, Context, BroadcastReceiver, Intent

### Community 34 - "assertthat"
Cohesion: 0.36
Nodes (3): assertthat, beforeeach, bytearrayinputstream

### Community 35 - "WizardStep"
Cohesion: 0.33
Nodes (6): WizardStep, STEP_0_PERMISSIONS, STEP_1_VAULT, STEP_2_CLASSROOM, STEP_3_PORTALS, STEP_4_WHATSAPP

### Community 37 - "gradlew"
Cohesion: 0.83
Nodes (3): gradlew script, die(), warn()

## Knowledge Gaps
- **35 isolated node(s):** `CloudHealthReport`, `DeviceInfo`, `PipelineMetrics`, `StepStatus`, `AttachmentEntity` (+30 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 208 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **21 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `KidsAccessibilityService` connect `KidsAccessibilityService` to `assertthat`, `KidsAccessibilityService.kt`, `SafVaultManager.kt`, `OnboardingWizardScreen.kt`, `.matchesAttachmentChipText`, `DeduplicationEngine`, `GoogleDriveSharedHarvester.kt`, `ContentCategory`?**
  _High betweenness centrality (0.233) - this node is a cross-community bridge._
- **Why does `ChildProfile` connect `OnboardingWizardScreen` to `KidsAccessibilityService`, `KidsAccessibilityService.kt`, `ChildrenGridDashboard.kt`?**
  _High betweenness centrality (0.089) - this node is a cross-community bridge._
- **Why does `OnboardingWizardScreen()` connect `OnboardingWizardScreen` to `Intent`, `GoogleDriveClient`, `ci_watch.py`, `OnboardingWizardScreen.kt`, `MainActivity.kt`?**
  _High betweenness centrality (0.073) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `KidsAccessibilityService` (e.g. with `ContentClassifier` and `DeduplicationEngine`) actually correct?**
  _`KidsAccessibilityService` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Are the 6 inferred relationships involving `GoogleDriveClient` (e.g. with `.preWarmOAuthAndFolders()` and `.provisionStep1()`) actually correct?**
  _`GoogleDriveClient` has 6 INFERRED edges - model-reasoned connections that need verification._
- **What connects `CloudHealthReport`, `DeviceInfo`, `PipelineMetrics` to the rest of the system?**
  _35 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `KidsAccessibilityService` be split into smaller, more focused modules?**
  _Cohesion score 0.07737260402057036 - nodes in this community are weakly interconnected._