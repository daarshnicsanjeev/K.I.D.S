# Graph Report - K.I.D.S  (2026-09-26)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 754 nodes · 1656 edges · 48 communities (28 shown, 20 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 33 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `8bc475e5`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- KidsAccessibilityService
- ChildProfile
- GoogleDriveClient
- DeduplicationEngine
- NoticeDao
- StreamManifest
- KidsAccessibilityService.kt
- MLKitOcrParser.kt
- FloatingCrawlerOverlay
- ChildrenGridDashboard.kt
- K.I.D.S. Android Collector (PRD)
- GestureDescription
- OnboardingWizardScreen.kt
- DriveVaultManager.kt
- FloatingCrawlerOverlay.kt
- .log
- .matchesAttachmentChipText
- ci_watch.py
- DriveSyncWorker.kt
- OnboardingWizardScreen
- SafVaultManager.kt
- Intent
- MainActivity.kt
- DriveDeepLogger.kt
- .fallbackNativeScroll
- .onCreate
- Type.kt
- GestureDescription
- dispatchers
- WizardStep
- SyncStatus
- gradlew
- java
- Bundle
- AttachmentEntity
- NoticeEntity
- AccessibilityNodeInfo
- Context
- GestureDescription
- GestureResultCallback
- ChildVaultFolders
- provisionstep1result
- Result
- role
- statusbarnotification

## God Nodes (most connected - your core abstractions)
1. `KidsAccessibilityService` - 90 edges
2. `FloatingCrawlerOverlay` - 42 edges
3. `GoogleDriveClient` - 28 edges
4. `ChildProfile` - 21 edges
5. `OnboardingWizardScreen()` - 21 edges
6. `DriveVaultManager` - 19 edges
7. `CrawlerTraceLogger` - 17 edges
8. `AttachmentChipMatcherTest` - 16 edges
9. `NoticeDao` - 16 edges
10. `StreamManifest` - 16 edges

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

## Communities (48 total, 20 thin omitted)

### Community 0 - "KidsAccessibilityService"
Cohesion: 0.09
Nodes (8): AccessibilityNodeInfo, ExtractedAttachmentDetail, KidsAccessibilityService, UnvisitedCard, VisiblePendingCard, FloatingCrawlerOverlay, StreamManifest, StreamManifestItem

### Community 1 - "ChildProfile"
Cohesion: 0.05
Nodes (38): AttachmentEntity, ChildProfileEntity, NoticeEntity, NoticeFtsEntity, Converters, GraphEdge, GraphNode, KnowledgeGraph (+30 more)

### Community 2 - "GoogleDriveClient"
Cohesion: 0.08
Nodes (23): DriveVaultManager, Failure, Context, Result, ProvisionStep1Result, Success, UserConsentRequired, ChannelVaultFolders (+15 more)

### Community 3 - "DeduplicationEngine"
Cohesion: 0.05
Nodes (21): DeduplicationEngine, java, PrivacyFilter, Bundle, StatusBarNotification, NotificationParser, ParsedNotification, ContentClassifierTest (+13 more)

### Community 4 - "NoticeDao"
Cohesion: 0.06
Nodes (12): AttachmentDao, ChildProfileDao, AttachmentEntity, NoticeEntity, NoticeDao, KidsDatabase, Context, ChildProfileEntity (+4 more)

### Community 5 - "StreamManifest"
Cohesion: 0.08
Nodes (9): StreamItemStatus, ALREADY_SYNCED, COMPLETED, FAILED_SKIPPED, IN_PROGRESS, PENDING, StreamManifest, StreamManifestItem (+1 more)

### Community 6 - "KidsAccessibilityService.kt"
Cohesion: 0.09
Nodes (28): AccessibilityEvent, accessibilitymanager, accessibilityserviceinfo, ContentClassifier, MainActivity, KidsNotificationListenerService, StatusBarNotification, cancel (+20 more)

### Community 7 - "MLKitOcrParser.kt"
Cohesion: 0.10
Nodes (17): Activity, android, MLKitOcrParser, OcrExtractionResult, ShareTargetActivity, Bitmap, Bundle, Context (+9 more)

### Community 9 - "ChildrenGridDashboard.kt"
Cohesion: 0.13
Nodes (21): alignment, background, border, circleshape, clickable, clip, contentdescription, dialog (+13 more)

### Community 10 - "K.I.D.S. Android Collector (PRD)"
Cohesion: 0.10
Nodes (15): AI-Native Storage (JSONL & Markdown), ImportedNoticeRecord, WhatsAppChatExportParser, WhatsAppChatExportParserTest, Dual WhatsApp Catch-Up Engine, 5-Point Cloud Health Probe, Google Credential Manager API, inputstream (+7 more)

### Community 11 - "GestureDescription"
Cohesion: 0.16
Nodes (7): GestureResultCallback, GestureResultCallback, GestureResultCallback, GestureResultCallback, GestureResultCallback, GestureDescription, GestureResultCallback

### Community 12 - "OnboardingWizardScreen.kt"
Cohesion: 0.12
Nodes (18): accountmanager, activityresultcontracts, getDefaultSchoolAppList(), Context, queryInstalledLauncherApps(), arrowback, backhandler, channelconfig (+10 more)

### Community 13 - "DriveVaultManager.kt"
Cohesion: 0.12
Nodes (16): KidsApplication, Application, CompletableDeferred, concurrentlinkedqueue, coroutinescope, date, filewriter, googleaccountcredential (+8 more)

### Community 14 - "FloatingCrawlerOverlay.kt"
Cohesion: 0.12
Nodes (15): AccessibilityService, Button, gradientdrawable, gravity, handler, LinearLayout, looper, motionevent (+7 more)

### Community 17 - "ci_watch.py"
Cohesion: 0.21
Nodes (14): os, re, diagnose_failure(), get_latest_run(), main(), monitor_workflow(), CI/CD Pipeline Monitor, Release Verifier & Graphify Guardian for K.I.D.S.…, Runs local Graphify AST extraction and community clustering. (+6 more)

### Community 18 - "DriveSyncWorker.kt"
Cohesion: 0.19
Nodes (11): add, DriveSyncWorker, AttachmentEntity, buildjsonarray, buildjsonobject, CoroutineWorker, NoticeEntity, put (+3 more)

### Community 19 - "OnboardingWizardScreen"
Cohesion: 0.37
Nodes (4): Context, PermissionHelper, PermissionSetupDialog(), OnboardingWizardScreen()

### Community 20 - "SafVaultManager.kt"
Cohesion: 0.47
Nodes (5): Context, Result, SafVaultFolders, SafVaultManager, DocumentFile

### Community 21 - "Intent"
Cohesion: 0.24
Nodes (8): androidx, launchAccountPicker(), BootReceiver, Context, BroadcastReceiver, Intent, notificationmanagercompat, settings

### Community 22 - "MainActivity.kt"
Cohesion: 0.18
Nodes (10): AppScreen, DASHBOARD, DIAGNOSTICS, WIZARD, childprofile, launch, lifecyclescope, remembersaveable (+2 more)

### Community 23 - "DriveDeepLogger.kt"
Cohesion: 0.22
Nodes (7): DeviceInfo, DiagnosticSnapshot, DriveDeepLogger, PipelineMetrics, StepStatus, file, simpledateformat

### Community 25 - ".onCreate"
Cohesion: 0.22
Nodes (7): ProbeItem, DiagnosticFeedScreen(), LogLine, KidsTheme(), composable, lightcolorscheme, materialtheme

### Community 26 - "Type.kt"
Cohesion: 0.22
Nodes (8): font, fontfamily, fontweight, googlefont, r, sp, textstyle, typography

### Community 27 - "GestureDescription"
Cohesion: 0.36
Nodes (4): GestureResultCallback, GestureResultCallback, GestureDescription, GestureResultCallback

### Community 28 - "dispatchers"
Cohesion: 0.33
Nodes (5): DownloadFolderObserver, Context, dispatchers, environment, withcontext

### Community 29 - "WizardStep"
Cohesion: 0.33
Nodes (6): WizardStep, STEP_0_PERMISSIONS, STEP_1_VAULT, STEP_2_CLASSROOM, STEP_3_PORTALS, STEP_4_WHATSAPP

### Community 30 - "SyncStatus"
Cohesion: 0.40
Nodes (5): SyncStatus, DROPPED, FAILED, PENDING, SYNCED

### Community 31 - "gradlew"
Cohesion: 0.83
Nodes (3): gradlew script, die(), warn()

## Knowledge Gaps
- **34 isolated node(s):** `CloudHealthReport`, `NoticeFtsEntity`, `DeviceInfo`, `PipelineMetrics`, `StepStatus` (+29 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 210 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **20 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `KidsAccessibilityService` connect `KidsAccessibilityService` to `ChildProfile`, `DeduplicationEngine`, `KidsAccessibilityService.kt`, `MLKitOcrParser.kt`, `OnboardingWizardScreen.kt`, `FloatingCrawlerOverlay.kt`, `.matchesAttachmentChipText`?**
  _High betweenness centrality (0.251) - this node is a cross-community bridge._
- **Why does `ChildProfile` connect `ChildProfile` to `KidsAccessibilityService`, `KidsAccessibilityService.kt`, `ChildrenGridDashboard.kt`, `OnboardingWizardScreen`, `.onCreate`?**
  _High betweenness centrality (0.099) - this node is a cross-community bridge._
- **Why does `KidsDatabase` connect `NoticeDao` to `KidsAccessibilityService`?**
  _High betweenness centrality (0.083) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `KidsAccessibilityService` (e.g. with `ContentClassifier` and `DeduplicationEngine`) actually correct?**
  _`KidsAccessibilityService` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Are the 6 inferred relationships involving `GoogleDriveClient` (e.g. with `.preWarmOAuthAndFolders()` and `.provisionStep1()`) actually correct?**
  _`GoogleDriveClient` has 6 INFERRED edges - model-reasoned connections that need verification._
- **Are the 4 inferred relationships involving `ChildProfile` (e.g. with `.onCreate()` and `OnboardingWizardScreen()`) actually correct?**
  _`ChildProfile` has 4 INFERRED edges - model-reasoned connections that need verification._
- **What connects `CloudHealthReport`, `NoticeFtsEntity`, `DeviceInfo` to the rest of the system?**
  _34 weakly-connected nodes found - possible documentation gaps or missing edges._