# Graph Report - K.I.D.S  (2026-09-24)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 719 nodes · 1542 edges · 51 communities (31 shown, 20 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 30 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `b29712bf`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- KidsAccessibilityService
- FloatingCrawlerOverlay
- GoogleDriveClient
- NoticeDao
- ChildProfile
- StreamManifest
- DriveDeepLogger.kt
- KidsAccessibilityService.kt
- K.I.D.S. Android Collector (PRD)
- OnboardingWizardScreen
- SafVaultManager.kt
- OnboardingWizardScreen.kt
- ChildrenGridDashboard.kt
- DriveVaultManager.kt
- MLKitOcrParser.kt
- ci_watch.py
- DriveSyncWorker.kt
- NotificationParserTest.kt
- Intent
- PrivacyFilterTest
- MainActivity.kt
- dispatchers
- PermissionSetupDialog.kt
- Type.kt
- assertthat
- ShareTargetActivity.kt
- DeduplicationEngine
- GestureDescription
- WizardStep
- ContentClassifierTest
- log
- DeduplicationHashTest
- DriveVaultManagerTest.kt
- gradlew
- AccessibilityNodeInfo
- java
- Bundle
- ChildVaultFolders
- FloatingCrawlerOverlay
- GestureDescription
- GestureResultCallback
- provisionstep1result
- Result
- role
- statusbarnotification
- streamitemstatus
- StreamManifest
- StreamManifestItem

## God Nodes (most connected - your core abstractions)
1. `KidsAccessibilityService` - 76 edges
2. `FloatingCrawlerOverlay` - 42 edges
3. `GoogleDriveClient` - 26 edges
4. `ChildProfile` - 21 edges
5. `OnboardingWizardScreen()` - 21 edges
6. `DriveVaultManager` - 19 edges
7. `StreamManifest` - 19 edges
8. `CrawlerTraceLogger` - 18 edges
9. `NoticeDao` - 16 edges
10. `StreamManifestAndCardTest` - 16 edges

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

## Communities (51 total, 20 thin omitted)

### Community 0 - "KidsAccessibilityService"
Cohesion: 0.08
Nodes (6): CrawlerTraceLogger, Context, ExtractedAttachmentDetail, KidsAccessibilityService, AccessibilityNodeInfo, UnvisitedCard

### Community 1 - "FloatingCrawlerOverlay"
Cohesion: 0.05
Nodes (24): AccessibilityService, FloatingCrawlerOverlay, GestureResultCallback, GestureResultCallback, GestureResultCallback, GestureResultCallback, GestureResultCallback, AccessibilityNodeInfo (+16 more)

### Community 2 - "GoogleDriveClient"
Cohesion: 0.08
Nodes (23): DriveVaultManager, Failure, Context, Result, ProvisionStep1Result, Success, UserConsentRequired, ChannelVaultFolders (+15 more)

### Community 3 - "NoticeDao"
Cohesion: 0.06
Nodes (12): AttachmentDao, ChildProfileDao, AttachmentEntity, NoticeEntity, NoticeDao, KidsDatabase, Context, ChildProfileEntity (+4 more)

### Community 4 - "ChildProfile"
Cohesion: 0.07
Nodes (30): GraphEdge, GraphNode, KnowledgeGraph, KotlinGraphifyEngine, Attachment, ChannelType, FILE_IMPORT, GOOGLE_CLASSROOM (+22 more)

### Community 5 - "StreamManifest"
Cohesion: 0.08
Nodes (9): StreamItemStatus, ALREADY_SYNCED, COMPLETED, FAILED_SKIPPED, IN_PROGRESS, PENDING, StreamManifest, StreamManifestItem (+1 more)

### Community 6 - "DriveDeepLogger.kt"
Cohesion: 0.09
Nodes (18): AttachmentEntity, ChildProfileEntity, NoticeEntity, NoticeFtsEntity, Converters, ChannelConfig, DeviceInfo, DiagnosticSnapshot (+10 more)

### Community 7 - "KidsAccessibilityService.kt"
Cohesion: 0.12
Nodes (19): AccessibilityEvent, accessibilitymanager, accessibilityserviceinfo, ContentClassifier, KidsNotificationListenerService, StatusBarNotification, AttachmentEntity, constraints (+11 more)

### Community 8 - "K.I.D.S. Android Collector (PRD)"
Cohesion: 0.09
Nodes (16): AI-Native Storage (JSONL & Markdown), ImportedNoticeRecord, WhatsAppChatExportParser, WhatsAppChatExportParserTest, Dual WhatsApp Catch-Up Engine, 5-Point Cloud Health Probe, Google Credential Manager API, inputstream (+8 more)

### Community 9 - "OnboardingWizardScreen"
Cohesion: 0.19
Nodes (9): Context, PermissionHelper, PermissionSetupDialog(), KidsTheme(), OnboardingWizardScreen(), Context, composable, lightcolorscheme (+1 more)

### Community 10 - "SafVaultManager.kt"
Cohesion: 0.23
Nodes (8): android, Context, Result, SafVaultFolders, SafVaultManager, ShareTargetActivity, DocumentFile, Uri

### Community 11 - "OnboardingWizardScreen.kt"
Cohesion: 0.12
Nodes (18): accountmanager, activityresultcontracts, getDefaultSchoolAppList(), Context, queryInstalledLauncherApps(), arrowback, backhandler, channelconfig (+10 more)

### Community 12 - "ChildrenGridDashboard.kt"
Cohesion: 0.16
Nodes (17): alignment, ProbeItem, DiagnosticFeedScreen(), LogLine, background, circleshape, clickable, clip (+9 more)

### Community 13 - "DriveVaultManager.kt"
Cohesion: 0.13
Nodes (14): CompletableDeferred, concurrentlinkedqueue, coroutinescope, date, file, filewriter, googleaccountcredential, gsonfactory (+6 more)

### Community 14 - "MLKitOcrParser.kt"
Cohesion: 0.17
Nodes (11): MLKitOcrParser, OcrExtractionResult, Bitmap, inputimage, parcelfiledescriptor, pdfrenderer, resume, resumewithexception (+3 more)

### Community 15 - "ci_watch.py"
Cohesion: 0.21
Nodes (14): os, re, diagnose_failure(), get_latest_run(), main(), monitor_workflow(), CI/CD Pipeline Monitor, Release Verifier & Graphify Guardian for K.I.D.S.…, Runs local Graphify AST extraction and community clustering. (+6 more)

### Community 16 - "DriveSyncWorker.kt"
Cohesion: 0.19
Nodes (11): add, DriveSyncWorker, AttachmentEntity, NoticeEntity, buildjsonarray, buildjsonobject, CoroutineWorker, put (+3 more)

### Community 17 - "NotificationParserTest.kt"
Cohesion: 0.20
Nodes (9): Bundle, StatusBarNotification, NotificationParser, ParsedNotification, NotificationParserTest, build, Bundle, every (+1 more)

### Community 18 - "Intent"
Cohesion: 0.24
Nodes (8): androidx, launchAccountPicker(), BootReceiver, Context, BroadcastReceiver, Intent, notificationmanagercompat, settings

### Community 20 - "MainActivity.kt"
Cohesion: 0.18
Nodes (10): AppScreen, DASHBOARD, DIAGNOSTICS, WIZARD, childprofile, launch, lifecyclescope, remembersaveable (+2 more)

### Community 21 - "dispatchers"
Cohesion: 0.22
Nodes (8): DownloadFolderObserver, Context, MainActivity, ComponentActivity, dispatchers, environment, KidsDatabase, withcontext

### Community 22 - "PermissionSetupDialog.kt"
Cohesion: 0.22
Nodes (7): border, dialog, lifecycle, lifecycleeventobserver, locallifecycleowner, modifier, roundedcornershape

### Community 23 - "Type.kt"
Cohesion: 0.22
Nodes (8): font, fontfamily, fontweight, googlefont, r, sp, textstyle, typography

### Community 24 - "assertthat"
Cohesion: 0.44
Nodes (4): assertthat, beforeeach, bytearrayinputstream, test

### Community 25 - "ShareTargetActivity.kt"
Cohesion: 0.25
Nodes (7): Activity, cancel, existingworkpolicy, fileoutputstream, networktype, openablecolumns, workmanager

### Community 26 - "DeduplicationEngine"
Cohesion: 0.29
Nodes (4): DeduplicationEngine, java, ByteArray, messagedigest

### Community 27 - "GestureDescription"
Cohesion: 0.36
Nodes (4): GestureResultCallback, GestureResultCallback, GestureDescription, GestureResultCallback

### Community 28 - "WizardStep"
Cohesion: 0.33
Nodes (6): WizardStep, STEP_0_PERMISSIONS, STEP_1_VAULT, STEP_2_CLASSROOM, STEP_3_PORTALS, STEP_4_WHATSAPP

### Community 30 - "log"
Cohesion: 0.67
Nodes (3): KidsApplication, Application, log

### Community 32 - "DriveVaultManagerTest.kt"
Cohesion: 0.50
Nodes (3): Context, mockk, runblocking

### Community 33 - "gradlew"
Cohesion: 0.83
Nodes (3): gradlew script, die(), warn()

## Knowledge Gaps
- **36 isolated node(s):** `CloudHealthReport`, `DeviceInfo`, `PipelineMetrics`, `StepStatus`, `AttachmentEntity` (+31 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 213 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **20 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `KidsAccessibilityService` connect `KidsAccessibilityService` to `FloatingCrawlerOverlay`, `KidsAccessibilityService.kt`, `OnboardingWizardScreen`, `OnboardingWizardScreen.kt`, `DeduplicationEngine`?**
  _High betweenness centrality (0.216) - this node is a cross-community bridge._
- **Why does `ChildProfile` connect `ChildProfile` to `KidsAccessibilityService`, `OnboardingWizardScreen`, `ChildrenGridDashboard.kt`, `KidsAccessibilityService.kt`?**
  _High betweenness centrality (0.098) - this node is a cross-community bridge._
- **Why does `FloatingCrawlerOverlay` connect `FloatingCrawlerOverlay` to `KidsAccessibilityService`?**
  _High betweenness centrality (0.083) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `KidsAccessibilityService` (e.g. with `ContentClassifier` and `DeduplicationEngine`) actually correct?**
  _`KidsAccessibilityService` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Are the 6 inferred relationships involving `GoogleDriveClient` (e.g. with `.preWarmOAuthAndFolders()` and `.provisionStep1()`) actually correct?**
  _`GoogleDriveClient` has 6 INFERRED edges - model-reasoned connections that need verification._
- **Are the 4 inferred relationships involving `ChildProfile` (e.g. with `.onCreate()` and `OnboardingWizardScreen()`) actually correct?**
  _`ChildProfile` has 4 INFERRED edges - model-reasoned connections that need verification._
- **What connects `CloudHealthReport`, `DeviceInfo`, `PipelineMetrics` to the rest of the system?**
  _36 weakly-connected nodes found - possible documentation gaps or missing edges._