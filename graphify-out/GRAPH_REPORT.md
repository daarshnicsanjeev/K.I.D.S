# Graph Report - K.I.D.S  (2026-09-22)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 658 nodes · 1363 edges · 47 communities (29 shown, 18 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 28 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `879326b5`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- ChildProfile
- KidsAccessibilityService
- ContentCategory
- GoogleDriveClient
- NoticeDao
- MLKitOcrParser.kt
- OnboardingWizardScreen
- FloatingCrawlerOverlay
- K.I.D.S. Android Collector (PRD)
- KidsAccessibilityService.kt
- OnboardingWizardScreen.kt
- ChildrenGridDashboard.kt
- StreamManifest
- .log
- GestureDescription
- DriveVaultManager.kt
- ci_watch.py
- FloatingCrawlerOverlay.kt
- AttachmentDao
- MainActivity.kt
- DriveSyncWorker.kt
- PermissionSetupDialog.kt
- DriveDeepLogger.kt
- Type.kt
- DeduplicationEngine
- .findPrimaryScrollableNode
- DownloadFolderObserver.kt
- WizardStep
- KidsTheme.kt
- GestureResultCallback
- gradlew
- AccessibilityNodeInfo
- java
- Bundle
- Context
- Result
- ChildVaultFolders
- FloatingCrawlerOverlay
- GestureDescription
- role
- statusbarnotification
- streamitemstatus
- StreamManifest
- streammanifestitem

## God Nodes (most connected - your core abstractions)
1. `KidsAccessibilityService` - 59 edges
2. `FloatingCrawlerOverlay` - 39 edges
3. `GoogleDriveClient` - 23 edges
4. `ChildProfile` - 21 edges
5. `OnboardingWizardScreen()` - 19 edges
6. `CrawlerTraceLogger` - 18 edges
7. `NoticeDao` - 16 edges
8. `StreamManifest` - 15 edges
9. `AttachmentDao` - 14 edges
10. `ContentCategory` - 13 edges

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

## Communities (47 total, 18 thin omitted)

### Community 0 - "ChildProfile"
Cohesion: 0.05
Nodes (37): AttachmentEntity, ChildProfileEntity, NoticeEntity, NoticeFtsEntity, Converters, GraphEdge, GraphNode, KnowledgeGraph (+29 more)

### Community 1 - "KidsAccessibilityService"
Cohesion: 0.11
Nodes (6): AccessibilityEvent, ExtractedAttachmentDetail, KidsAccessibilityService, AccessibilityNodeInfo, Context, UnvisitedCard

### Community 2 - "ContentCategory"
Cohesion: 0.05
Nodes (26): ContentClassifier, PrivacyFilter, ContentCategory, ATTENDANCE, CIRCULAR, FEES, HOMEWORK, UNKNOWN (+18 more)

### Community 3 - "GoogleDriveClient"
Cohesion: 0.08
Nodes (22): DriveVaultManager, Failure, Context, Result, ProvisionStep1Result, Success, UserConsentRequired, ChannelVaultFolders (+14 more)

### Community 4 - "NoticeDao"
Cohesion: 0.09
Nodes (10): ChildProfileDao, NoticeDao, KidsDatabase, Context, ChildProfileEntity, database, Flow, NoticeEntity (+2 more)

### Community 5 - "MLKitOcrParser.kt"
Cohesion: 0.12
Nodes (19): Activity, Context, Result, SafVaultFolders, SafVaultManager, MLKitOcrParser, OcrExtractionResult, ShareTargetActivity (+11 more)

### Community 6 - "OnboardingWizardScreen"
Cohesion: 0.17
Nodes (12): androidx, Context, PermissionHelper, PermissionSetupDialog(), launchAccountPicker(), OnboardingWizardScreen(), BootReceiver, Context (+4 more)

### Community 7 - "FloatingCrawlerOverlay"
Cohesion: 0.16
Nodes (3): FloatingCrawlerOverlay, View, WindowManager

### Community 8 - "K.I.D.S. Android Collector (PRD)"
Cohesion: 0.09
Nodes (16): AI-Native Storage (JSONL & Markdown), ImportedNoticeRecord, WhatsAppChatExportParser, WhatsAppChatExportParserTest, Dual WhatsApp Catch-Up Engine, 5-Point Cloud Health Probe, Google Credential Manager API, inputstream (+8 more)

### Community 9 - "KidsAccessibilityService.kt"
Cohesion: 0.14
Nodes (18): accessibilitymanager, accessibilityserviceinfo, StatusBarNotification, constraints, delay, existingworkpolicy, fileoutputstream, firstornull (+10 more)

### Community 10 - "OnboardingWizardScreen.kt"
Cohesion: 0.11
Nodes (19): accountmanager, activityresultcontracts, getDefaultSchoolAppList(), queryInstalledLauncherApps(), arrowback, backhandler, channelconfig, channeltype (+11 more)

### Community 11 - "ChildrenGridDashboard.kt"
Cohesion: 0.16
Nodes (17): alignment, ProbeItem, DiagnosticFeedScreen(), LogLine, background, circleshape, clickable, clip (+9 more)

### Community 12 - "StreamManifest"
Cohesion: 0.16
Nodes (8): StreamItemStatus, ALREADY_SYNCED, COMPLETED, FAILED_SKIPPED, IN_PROGRESS, PENDING, StreamManifest, StreamManifestItem

### Community 13 - ".log"
Cohesion: 0.20
Nodes (3): CrawlerTraceLogger, Context, Result

### Community 14 - "GestureDescription"
Cohesion: 0.16
Nodes (5): GestureResultCallback, GestureResultCallback, GestureResultCallback, GestureDescription, GestureResultCallback

### Community 15 - "DriveVaultManager.kt"
Cohesion: 0.14
Nodes (14): KidsApplication, Application, concurrentlinkedqueue, coroutinescope, date, filewriter, googleaccountcredential, gsonfactory (+6 more)

### Community 16 - "ci_watch.py"
Cohesion: 0.21
Nodes (14): os, re, diagnose_failure(), get_latest_run(), main(), monitor_workflow(), CI/CD Pipeline Monitor, Release Verifier & Graphify Guardian for K.I.D.S.…, Runs local Graphify AST extraction and community clustering. (+6 more)

### Community 17 - "FloatingCrawlerOverlay.kt"
Cohesion: 0.14
Nodes (13): AccessibilityService, Button, gradientdrawable, gravity, handler, LinearLayout, looper, motionevent (+5 more)

### Community 19 - "MainActivity.kt"
Cohesion: 0.18
Nodes (12): AppScreen, DASHBOARD, DIAGNOSTICS, WIZARD, MainActivity, childprofile, ComponentActivity, KidsDatabase (+4 more)

### Community 20 - "DriveSyncWorker.kt"
Cohesion: 0.20
Nodes (9): add, DriveSyncWorker, buildjsonarray, buildjsonobject, CoroutineWorker, put, syncstatus, withtransaction (+1 more)

### Community 21 - "PermissionSetupDialog.kt"
Cohesion: 0.20
Nodes (8): border, dialog, dp, lifecycle, lifecycleeventobserver, localcontext, locallifecycleowner, toast

### Community 22 - "DriveDeepLogger.kt"
Cohesion: 0.24
Nodes (6): DeviceInfo, DiagnosticSnapshot, DriveDeepLogger, PipelineMetrics, StepStatus, file

### Community 23 - "Type.kt"
Cohesion: 0.22
Nodes (8): font, fontfamily, fontweight, googlefont, r, sp, textstyle, typography

### Community 24 - "DeduplicationEngine"
Cohesion: 0.29
Nodes (5): DeduplicationEngine, java, KidsNotificationListenerService, ByteArray, NotificationListenerService

### Community 26 - "DownloadFolderObserver.kt"
Cohesion: 0.33
Nodes (5): DownloadFolderObserver, Context, dispatchers, environment, withcontext

### Community 27 - "WizardStep"
Cohesion: 0.33
Nodes (6): WizardStep, STEP_0_PERMISSIONS, STEP_1_VAULT, STEP_2_CLASSROOM, STEP_3_PORTALS, STEP_4_WHATSAPP

### Community 28 - "KidsTheme.kt"
Cohesion: 0.40
Nodes (4): KidsTheme(), composable, lightcolorscheme, materialtheme

### Community 29 - "GestureResultCallback"
Cohesion: 0.50
Nodes (3): GestureResultCallback, GestureDescription, GestureResultCallback

### Community 30 - "gradlew"
Cohesion: 0.83
Nodes (3): gradlew script, die(), warn()

## Knowledge Gaps
- **36 isolated node(s):** `AttachmentEntity`, `NoticeEntity`, `NoticeFtsEntity`, `CloudHealthReport`, `DeviceInfo` (+31 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 200 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **18 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `KidsAccessibilityService` connect `KidsAccessibilityService` to `ChildProfile`, `ContentCategory`, `FloatingCrawlerOverlay`, `KidsAccessibilityService.kt`, `FloatingCrawlerOverlay.kt`, `DeduplicationEngine`?**
  _High betweenness centrality (0.160) - this node is a cross-community bridge._
- **Why does `ChildProfile` connect `ChildProfile` to `KidsAccessibilityService`, `ChildrenGridDashboard.kt`, `OnboardingWizardScreen`, `KidsAccessibilityService.kt`?**
  _High betweenness centrality (0.112) - this node is a cross-community bridge._
- **Why does `OnboardingWizardScreen()` connect `OnboardingWizardScreen` to `ChildProfile`, `GoogleDriveClient`, `OnboardingWizardScreen.kt`, `MainActivity.kt`?**
  _High betweenness centrality (0.091) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `KidsAccessibilityService` (e.g. with `ContentClassifier` and `DeduplicationEngine`) actually correct?**
  _`KidsAccessibilityService` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Are the 4 inferred relationships involving `GoogleDriveClient` (e.g. with `.provisionStep1()` and `.provisionStep2Classroom()`) actually correct?**
  _`GoogleDriveClient` has 4 INFERRED edges - model-reasoned connections that need verification._
- **Are the 4 inferred relationships involving `ChildProfile` (e.g. with `.onCreate()` and `OnboardingWizardScreen()`) actually correct?**
  _`ChildProfile` has 4 INFERRED edges - model-reasoned connections that need verification._
- **What connects `AttachmentEntity`, `NoticeEntity`, `NoticeFtsEntity` to the rest of the system?**
  _36 weakly-connected nodes found - possible documentation gaps or missing edges._