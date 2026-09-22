# Graph Report - K.I.D.S  (2026-09-22)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 626 nodes · 1283 edges · 44 communities (29 shown, 15 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 28 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `2be305c2`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- FloatingCrawlerOverlay
- KidsAccessibilityService
- GoogleDriveClient
- ChildProfile
- NoticeDao
- MLKitOcrParser.kt
- ci_watch.py
- K.I.D.S. Android Collector (PRD)
- OnboardingWizardScreen
- ChildrenGridDashboard.kt
- StreamManifest
- ContentCategory
- OnboardingWizardScreen.kt
- DriveSyncWorker.kt
- KidsNotificationListenerService.kt
- AttachmentDao
- NotificationParserTest.kt
- KidsAccessibilityService.kt
- log
- PermissionHelper.kt
- DeduplicationEngine
- PrivacyFilterTest
- DriveVaultManagerTest.kt
- MainActivity.kt
- DriveDeepLogger.kt
- PermissionSetupDialog.kt
- Type.kt
- DriveVaultManager.kt
- WizardStep
- GestureResultCallback
- gradlew
- AccessibilityNodeInfo
- java
- Bundle
- ChildVaultFolders
- FloatingCrawlerOverlay
- GestureDescription
- provisionstep1result
- Result
- role
- statusbarnotification

## God Nodes (most connected - your core abstractions)
1. `KidsAccessibilityService` - 56 edges
2. `FloatingCrawlerOverlay` - 37 edges
3. `GoogleDriveClient` - 24 edges
4. `ChildProfile` - 21 edges
5. `OnboardingWizardScreen()` - 19 edges
6. `NoticeDao` - 16 edges
7. `AttachmentDao` - 14 edges
8. `ContentCategory` - 13 edges
9. `DriveVaultManager` - 13 edges
10. `PermissionHelper` - 12 edges

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

## Communities (44 total, 15 thin omitted)

### Community 0 - "FloatingCrawlerOverlay"
Cohesion: 0.06
Nodes (22): AccessibilityService, FloatingCrawlerOverlay, GestureResultCallback, GestureResultCallback, GestureResultCallback, AccessibilityNodeInfo, GestureDescription, GestureResultCallback (+14 more)

### Community 1 - "KidsAccessibilityService"
Cohesion: 0.11
Nodes (5): ExtractedAttachmentDetail, KidsAccessibilityService, AccessibilityNodeInfo, Context, UnvisitedCard

### Community 2 - "GoogleDriveClient"
Cohesion: 0.07
Nodes (23): DriveVaultManager, Failure, Context, Result, ProvisionStep1Result, Success, UserConsentRequired, ChannelVaultFolders (+15 more)

### Community 3 - "ChildProfile"
Cohesion: 0.08
Nodes (24): GraphEdge, GraphNode, KnowledgeGraph, KotlinGraphifyEngine, Attachment, ChannelType, FILE_IMPORT, GOOGLE_CLASSROOM (+16 more)

### Community 4 - "NoticeDao"
Cohesion: 0.09
Nodes (10): ChildProfileDao, NoticeDao, KidsDatabase, Context, ChildProfileEntity, database, Flow, NoticeEntity (+2 more)

### Community 5 - "MLKitOcrParser.kt"
Cohesion: 0.12
Nodes (19): Activity, Context, Result, SafVaultFolders, SafVaultManager, MLKitOcrParser, OcrExtractionResult, ShareTargetActivity (+11 more)

### Community 6 - "ci_watch.py"
Cohesion: 0.08
Nodes (27): AttachmentEntity, ChildProfileEntity, NoticeEntity, NoticeFtsEntity, Converters, ChannelConfig, encodetostring, entity (+19 more)

### Community 7 - "K.I.D.S. Android Collector (PRD)"
Cohesion: 0.09
Nodes (16): AI-Native Storage (JSONL & Markdown), ImportedNoticeRecord, WhatsAppChatExportParser, WhatsAppChatExportParserTest, Dual WhatsApp Catch-Up Engine, 5-Point Cloud Health Probe, Google Credential Manager API, inputstream (+8 more)

### Community 8 - "OnboardingWizardScreen"
Cohesion: 0.22
Nodes (8): Context, PermissionHelper, PermissionSetupDialog(), KidsTheme(), OnboardingWizardScreen(), composable, lightcolorscheme, materialtheme

### Community 9 - "ChildrenGridDashboard.kt"
Cohesion: 0.16
Nodes (17): ProbeItem, DiagnosticFeedScreen(), LogLine, background, circleshape, clickable, clip, contentdescription (+9 more)

### Community 10 - "StreamManifest"
Cohesion: 0.17
Nodes (8): StreamItemStatus, ALREADY_SYNCED, COMPLETED, FAILED_SKIPPED, IN_PROGRESS, PENDING, StreamManifest, StreamManifestItem

### Community 11 - "ContentCategory"
Cohesion: 0.15
Nodes (8): ContentClassifier, ContentCategory, ATTENDANCE, CIRCULAR, FEES, HOMEWORK, UNKNOWN, ContentClassifierTest

### Community 12 - "OnboardingWizardScreen.kt"
Cohesion: 0.15
Nodes (14): accountmanager, activityresultcontracts, getDefaultSchoolAppList(), Context, queryInstalledLauncherApps(), arrowback, backhandler, channelconfig (+6 more)

### Community 13 - "DriveSyncWorker.kt"
Cohesion: 0.16
Nodes (13): Context, MainActivity, DriveSyncWorker, buildjsonobject, ComponentActivity, CoroutineWorker, dispatchers, environment (+5 more)

### Community 14 - "KidsNotificationListenerService.kt"
Cohesion: 0.17
Nodes (13): KidsNotificationListenerService, StatusBarNotification, constraints, existingworkpolicy, fileoutputstream, firstornull, networktype, NotificationListenerService (+5 more)

### Community 16 - "NotificationParserTest.kt"
Cohesion: 0.20
Nodes (9): Bundle, StatusBarNotification, NotificationParser, ParsedNotification, NotificationParserTest, build, Bundle, every (+1 more)

### Community 17 - "KidsAccessibilityService.kt"
Cohesion: 0.17
Nodes (11): AccessibilityEvent, accessibilitymanager, accessibilityserviceinfo, delay, isactive, Job, messagedigest, rect (+3 more)

### Community 18 - "log"
Cohesion: 0.19
Nodes (8): KidsApplication, CrawlerTraceLogger, Context, Application, concurrentlinkedqueue, date, locale, log

### Community 19 - "PermissionHelper.kt"
Cohesion: 0.24
Nodes (8): androidx, launchAccountPicker(), BootReceiver, Context, BroadcastReceiver, Intent, notificationmanagercompat, settings

### Community 20 - "DeduplicationEngine"
Cohesion: 0.20
Nodes (5): DownloadFolderObserver, DeduplicationEngine, java, DeduplicationHashTest, ByteArray

### Community 22 - "DriveVaultManagerTest.kt"
Cohesion: 0.27
Nodes (7): assertthat, beforeeach, bytearrayinputstream, Context, mockk, runblocking, test

### Community 23 - "MainActivity.kt"
Cohesion: 0.20
Nodes (9): AppScreen, DASHBOARD, DIAGNOSTICS, WIZARD, childprofile, lifecyclescope, remembersaveable, setcontent (+1 more)

### Community 24 - "DriveDeepLogger.kt"
Cohesion: 0.24
Nodes (6): DeviceInfo, DiagnosticSnapshot, DriveDeepLogger, PipelineMetrics, StepStatus, file

### Community 25 - "PermissionSetupDialog.kt"
Cohesion: 0.22
Nodes (7): alignment, border, dialog, dp, lifecycle, lifecycleeventobserver, locallifecycleowner

### Community 26 - "Type.kt"
Cohesion: 0.22
Nodes (8): font, fontfamily, fontweight, googlefont, r, sp, textstyle, typography

### Community 27 - "DriveVaultManager.kt"
Cohesion: 0.25
Nodes (7): coroutinescope, googleaccountcredential, gsonfactory, launch, nethttptransport, userrecoverableauthexception, userrecoverableauthioexception

### Community 28 - "WizardStep"
Cohesion: 0.33
Nodes (6): WizardStep, STEP_0_PERMISSIONS, STEP_1_VAULT, STEP_2_CLASSROOM, STEP_3_PORTALS, STEP_4_WHATSAPP

### Community 29 - "GestureResultCallback"
Cohesion: 0.50
Nodes (3): GestureResultCallback, GestureDescription, GestureResultCallback

### Community 30 - "gradlew"
Cohesion: 0.83
Nodes (3): gradlew script, die(), warn()

## Knowledge Gaps
- **36 isolated node(s):** `DeviceInfo`, `PipelineMetrics`, `StepStatus`, `CloudHealthReport`, `AttachmentEntity` (+31 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 188 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **15 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `KidsAccessibilityService` connect `KidsAccessibilityService` to `FloatingCrawlerOverlay`, `KidsAccessibilityService.kt`, `ContentCategory`, `DeduplicationEngine`?**
  _High betweenness centrality (0.152) - this node is a cross-community bridge._
- **Why does `ChildProfile` connect `ChildProfile` to `OnboardingWizardScreen`, `ChildrenGridDashboard.kt`, `KidsAccessibilityService`, `KidsNotificationListenerService.kt`?**
  _High betweenness centrality (0.116) - this node is a cross-community bridge._
- **Why does `OnboardingWizardScreen()` connect `OnboardingWizardScreen` to `GoogleDriveClient`, `ChildProfile`, `ci_watch.py`, `OnboardingWizardScreen.kt`, `PermissionHelper.kt`, `MainActivity.kt`?**
  _High betweenness centrality (0.085) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `KidsAccessibilityService` (e.g. with `ContentClassifier` and `DeduplicationEngine`) actually correct?**
  _`KidsAccessibilityService` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Are the 4 inferred relationships involving `GoogleDriveClient` (e.g. with `.provisionStep1()` and `.provisionStep2Classroom()`) actually correct?**
  _`GoogleDriveClient` has 4 INFERRED edges - model-reasoned connections that need verification._
- **Are the 4 inferred relationships involving `ChildProfile` (e.g. with `.onCreate()` and `OnboardingWizardScreen()`) actually correct?**
  _`ChildProfile` has 4 INFERRED edges - model-reasoned connections that need verification._
- **What connects `DeviceInfo`, `PipelineMetrics`, `StepStatus` to the rest of the system?**
  _36 weakly-connected nodes found - possible documentation gaps or missing edges._