# Graph Report - K.I.D.S  (2026-09-27)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 757 nodes · 1669 edges · 50 communities (30 shown, 20 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 33 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `917eca95`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- KidsAccessibilityService
- GoogleDriveClient
- NoticeDao
- ci_watch.py
- StreamManifest
- MLKitOcrParser.kt
- GestureDescription
- KidsAccessibilityService.kt
- FloatingCrawlerOverlay
- OnboardingWizardScreen
- K.I.D.S. Android Collector (PRD)
- SafVaultManager.kt
- OnboardingWizardScreen.kt
- FloatingCrawlerOverlay.kt
- ChildrenGridDashboard.kt
- KotlinGraphifyEngine.kt
- .log
- .matchesAttachmentChipText
- DriveVaultManager.kt
- ContentCategory
- ChildProfile
- DriveSyncWorker.kt
- MainActivity.kt
- Models.kt
- assertthat
- PrivacyFilterTest
- log
- PermissionSetupDialog.kt
- Type.kt
- DeduplicationEngine
- GestureDescription
- dispatchers
- WizardStep
- gradlew
- KidsApplication.kt
- java
- Bundle
- AttachmentEntity
- NoticeEntity
- AccessibilityNodeInfo
- GestureDescription
- GestureResultCallback
- ChildVaultFolders
- Result
- role
- statusbarnotification

## God Nodes (most connected - your core abstractions)
1. `KidsAccessibilityService` - 91 edges
2. `FloatingCrawlerOverlay` - 42 edges
3. `GoogleDriveClient` - 28 edges
4. `OnboardingWizardScreen()` - 23 edges
5. `ChildProfile` - 21 edges
6. `DriveVaultManager` - 18 edges
7. `CrawlerTraceLogger` - 17 edges
8. `StreamManifest` - 17 edges
9. `AttachmentChipMatcherTest` - 16 edges
10. `NoticeDao` - 16 edges

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

## Communities (50 total, 20 thin omitted)

### Community 0 - "KidsAccessibilityService"
Cohesion: 0.08
Nodes (10): AccessibilityNodeInfo, NoticeEntity, ExtractedAttachmentDetail, KidsAccessibilityService, UnvisitedCard, VisiblePendingCard, FloatingCrawlerOverlay, StreamManifest (+2 more)

### Community 1 - "GoogleDriveClient"
Cohesion: 0.08
Nodes (23): DriveVaultManager, Failure, Context, Result, ProvisionStep1Result, Success, UserConsentRequired, ChannelVaultFolders (+15 more)

### Community 2 - "NoticeDao"
Cohesion: 0.06
Nodes (12): AttachmentDao, ChildProfileDao, AttachmentEntity, NoticeEntity, NoticeDao, KidsDatabase, Context, ChildProfileEntity (+4 more)

### Community 3 - "ci_watch.py"
Cohesion: 0.07
Nodes (31): AttachmentEntity, ChildProfileEntity, NoticeFtsEntity, Converters, ChannelConfig, DeviceInfo, DiagnosticSnapshot, DriveDeepLogger (+23 more)

### Community 4 - "StreamManifest"
Cohesion: 0.08
Nodes (9): StreamItemStatus, ALREADY_SYNCED, COMPLETED, FAILED_SKIPPED, IN_PROGRESS, PENDING, StreamManifest, StreamManifestItem (+1 more)

### Community 5 - "MLKitOcrParser.kt"
Cohesion: 0.08
Nodes (23): MLKitOcrParser, OcrExtractionResult, Bundle, StatusBarNotification, NotificationParser, ParsedNotification, NotificationParserTest, Bitmap (+15 more)

### Community 6 - "GestureDescription"
Cohesion: 0.11
Nodes (8): GestureResultCallback, GestureResultCallback, GestureResultCallback, GestureResultCallback, GestureResultCallback, GestureResultCallback, GestureDescription, GestureResultCallback

### Community 7 - "KidsAccessibilityService.kt"
Cohesion: 0.12
Nodes (21): AccessibilityEvent, accessibilitymanager, accessibilityserviceinfo, cancel, constraints, delay, existingworkpolicy, fileoutputstream (+13 more)

### Community 9 - "OnboardingWizardScreen"
Cohesion: 0.16
Nodes (12): androidx, Context, PermissionHelper, PermissionSetupDialog(), KidsTheme(), launchAccountPicker(), OnboardingWizardScreen(), Context (+4 more)

### Community 10 - "K.I.D.S. Android Collector (PRD)"
Cohesion: 0.09
Nodes (16): AI-Native Storage (JSONL & Markdown), ImportedNoticeRecord, WhatsAppChatExportParser, WhatsAppChatExportParserTest, Dual WhatsApp Catch-Up Engine, 5-Point Cloud Health Probe, Google Credential Manager API, inputstream (+8 more)

### Community 11 - "SafVaultManager.kt"
Cohesion: 0.21
Nodes (9): Activity, android, Context, Result, SafVaultFolders, SafVaultManager, ShareTargetActivity, DocumentFile (+1 more)

### Community 12 - "OnboardingWizardScreen.kt"
Cohesion: 0.11
Nodes (19): accountmanager, activityresultcontracts, getDefaultSchoolAppList(), Context, queryInstalledLauncherApps(), arrowback, backhandler, channelconfig (+11 more)

### Community 13 - "FloatingCrawlerOverlay.kt"
Cohesion: 0.11
Nodes (16): AccessibilityService, AccessibilityNodeInfo, Button, gradientdrawable, gravity, handler, LinearLayout, looper (+8 more)

### Community 14 - "ChildrenGridDashboard.kt"
Cohesion: 0.16
Nodes (17): alignment, ProbeItem, DiagnosticFeedScreen(), LogLine, background, circleshape, clickable, clip (+9 more)

### Community 15 - "KotlinGraphifyEngine.kt"
Cohesion: 0.24
Nodes (7): GraphEdge, GraphNode, KnowledgeGraph, KotlinGraphifyEngine, Attachment, Notice, KnowledgeGraphBuilderTest

### Community 18 - "DriveVaultManager.kt"
Cohesion: 0.13
Nodes (14): CompletableDeferred, concurrentlinkedqueue, coroutinescope, date, file, filewriter, googleaccountcredential, gsonfactory (+6 more)

### Community 19 - "ContentCategory"
Cohesion: 0.15
Nodes (8): ContentClassifier, ContentCategory, ATTENDANCE, CIRCULAR, FEES, HOMEWORK, UNKNOWN, ContentClassifierTest

### Community 20 - "ChildProfile"
Cohesion: 0.19
Nodes (6): ChildProfile, MultiChildRouter, ChildCard(), ChildrenGridDashboard(), StatusBarNotification, MultiChildAttributionTest

### Community 21 - "DriveSyncWorker.kt"
Cohesion: 0.19
Nodes (11): add, DriveSyncWorker, AttachmentEntity, buildjsonarray, buildjsonobject, CoroutineWorker, NoticeEntity, put (+3 more)

### Community 22 - "MainActivity.kt"
Cohesion: 0.16
Nodes (13): AppScreen, DASHBOARD, DIAGNOSTICS, WIZARD, MainActivity, childprofile, ComponentActivity, KidsDatabase (+5 more)

### Community 23 - "Models.kt"
Cohesion: 0.15
Nodes (12): ChannelType, FILE_IMPORT, GOOGLE_CLASSROOM, SCHOOL_ERP, WHATSAPP, CloudHealthReport, SyncStatus, DROPPED (+4 more)

### Community 24 - "assertthat"
Cohesion: 0.24
Nodes (5): DeduplicationHashTest, assertthat, beforeeach, bytearrayinputstream, test

### Community 26 - "log"
Cohesion: 0.27
Nodes (7): BootReceiver, Context, BroadcastReceiver, Intent, log, notificationmanagercompat, settings

### Community 27 - "PermissionSetupDialog.kt"
Cohesion: 0.22
Nodes (7): border, dialog, dp, lifecycle, lifecycleeventobserver, locallifecycleowner, roundedcornershape

### Community 28 - "Type.kt"
Cohesion: 0.22
Nodes (8): font, fontfamily, fontweight, googlefont, r, sp, textstyle, typography

### Community 29 - "DeduplicationEngine"
Cohesion: 0.29
Nodes (5): DeduplicationEngine, java, KidsNotificationListenerService, ByteArray, NotificationListenerService

### Community 30 - "GestureDescription"
Cohesion: 0.36
Nodes (4): GestureResultCallback, GestureResultCallback, GestureDescription, GestureResultCallback

### Community 31 - "dispatchers"
Cohesion: 0.33
Nodes (5): DownloadFolderObserver, Context, dispatchers, environment, withcontext

### Community 32 - "WizardStep"
Cohesion: 0.33
Nodes (6): WizardStep, STEP_0_PERMISSIONS, STEP_1_VAULT, STEP_2_CLASSROOM, STEP_3_PORTALS, STEP_4_WHATSAPP

### Community 33 - "gradlew"
Cohesion: 0.83
Nodes (3): gradlew script, die(), warn()

## Knowledge Gaps
- **34 isolated node(s):** `CloudHealthReport`, `NoticeFtsEntity`, `DeviceInfo`, `PipelineMetrics`, `StepStatus` (+29 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 210 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **20 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `KidsAccessibilityService` connect `KidsAccessibilityService` to `KidsAccessibilityService.kt`, `OnboardingWizardScreen`, `OnboardingWizardScreen.kt`, `FloatingCrawlerOverlay.kt`, `.matchesAttachmentChipText`, `ContentCategory`, `assertthat`, `DeduplicationEngine`?**
  _High betweenness centrality (0.261) - this node is a cross-community bridge._
- **Why does `ChildProfile` connect `ChildProfile` to `KidsAccessibilityService`, `KidsAccessibilityService.kt`, `OnboardingWizardScreen`, `ChildrenGridDashboard.kt`, `KotlinGraphifyEngine.kt`, `Models.kt`?**
  _High betweenness centrality (0.101) - this node is a cross-community bridge._
- **Why does `KidsDatabase` connect `NoticeDao` to `KidsAccessibilityService`?**
  _High betweenness centrality (0.083) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `KidsAccessibilityService` (e.g. with `ContentClassifier` and `DeduplicationEngine`) actually correct?**
  _`KidsAccessibilityService` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Are the 6 inferred relationships involving `GoogleDriveClient` (e.g. with `.preWarmOAuthAndFolders()` and `.provisionStep1()`) actually correct?**
  _`GoogleDriveClient` has 6 INFERRED edges - model-reasoned connections that need verification._
- **Are the 2 inferred relationships involving `OnboardingWizardScreen()` (e.g. with `ChannelConfig` and `ChildProfile`) actually correct?**
  _`OnboardingWizardScreen()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `CloudHealthReport`, `NoticeFtsEntity`, `DeviceInfo` to the rest of the system?**
  _34 weakly-connected nodes found - possible documentation gaps or missing edges._