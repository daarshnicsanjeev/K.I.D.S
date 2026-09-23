# Graph Report - K.I.D.S  (2026-09-23)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 709 nodes · 1514 edges · 44 communities (28 shown, 16 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 33 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `6a5aff81`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- KidsAccessibilityService
- FloatingCrawlerOverlay
- ChildProfile
- NoticeDao
- GoogleDriveClient
- StreamManifest
- GoogleDriveClient.kt
- KidsAccessibilityService.kt
- SafVaultManager.kt
- DriveSyncWorker.kt
- OnboardingWizardScreen.kt
- ChildrenGridDashboard.kt
- DriveVaultManager.kt
- MLKitOcrParser.kt
- ContentCategory
- assertthat
- ci_watch.py
- OnboardingWizardScreen
- NotificationParserTest.kt
- Intent
- PrivacyFilterTest
- MainActivity.kt
- dispatchers
- PermissionSetupDialog.kt
- Type.kt
- GestureDescription
- DeduplicationEngine
- WizardStep
- MultiChildAttributionTest
- gradlew
- AccessibilityNodeInfo
- java
- Bundle
- Context
- ChildVaultFolders
- FloatingCrawlerOverlay
- GestureDescription
- provisionstep1result
- Result
- role
- statusbarnotification

## God Nodes (most connected - your core abstractions)
1. `KidsAccessibilityService` - 73 edges
2. `FloatingCrawlerOverlay` - 40 edges
3. `GoogleDriveClient` - 26 edges
4. `ChildProfile` - 21 edges
5. `OnboardingWizardScreen()` - 21 edges
6. `DriveVaultManager` - 19 edges
7. `CrawlerTraceLogger` - 17 edges
8. `NoticeDao` - 16 edges
9. `StreamManifest` - 16 edges
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

## Communities (44 total, 16 thin omitted)

### Community 0 - "KidsAccessibilityService"
Cohesion: 0.07
Nodes (10): NoticeEntity, MultiChildRouter, CrawlerTraceLogger, Context, ExtractedAttachmentDetail, KidsAccessibilityService, AccessibilityNodeInfo, UnvisitedCard (+2 more)

### Community 1 - "FloatingCrawlerOverlay"
Cohesion: 0.06
Nodes (23): AccessibilityService, FloatingCrawlerOverlay, GestureResultCallback, GestureResultCallback, GestureResultCallback, GestureResultCallback, AccessibilityNodeInfo, GestureDescription (+15 more)

### Community 2 - "ChildProfile"
Cohesion: 0.05
Nodes (38): AttachmentEntity, ChildProfileEntity, NoticeFtsEntity, Converters, GraphEdge, GraphNode, KnowledgeGraph, KotlinGraphifyEngine (+30 more)

### Community 3 - "NoticeDao"
Cohesion: 0.06
Nodes (12): AttachmentDao, ChildProfileDao, AttachmentEntity, NoticeEntity, NoticeDao, KidsDatabase, Context, ChildProfileEntity (+4 more)

### Community 4 - "GoogleDriveClient"
Cohesion: 0.11
Nodes (13): DriveVaultManager, Failure, Context, Result, ProvisionStep1Result, Success, UserConsentRequired, ChannelVaultFolders (+5 more)

### Community 5 - "StreamManifest"
Cohesion: 0.08
Nodes (9): StreamItemStatus, ALREADY_SYNCED, COMPLETED, FAILED_SKIPPED, IN_PROGRESS, PENDING, StreamManifest, StreamManifestItem (+1 more)

### Community 6 - "GoogleDriveClient.kt"
Cohesion: 0.06
Nodes (26): AI-Native Storage (JSONL & Markdown), DriveQuotaInfo, ImportedNoticeRecord, WhatsAppChatExportParser, WhatsAppChatExportParserTest, async, bytearraycontent, bytearrayoutputstream (+18 more)

### Community 7 - "KidsAccessibilityService.kt"
Cohesion: 0.11
Nodes (24): AccessibilityEvent, accessibilitymanager, accessibilityserviceinfo, StatusBarNotification, AttachmentEntity, cancel, constraints, delay (+16 more)

### Community 8 - "SafVaultManager.kt"
Cohesion: 0.20
Nodes (10): Activity, android, Context, Result, SafVaultFolders, SafVaultManager, ShareTargetActivity, Bundle (+2 more)

### Community 9 - "DriveSyncWorker.kt"
Cohesion: 0.12
Nodes (16): add, DriveSyncWorker, AttachmentEntity, NoticeEntity, DeviceInfo, DiagnosticSnapshot, DriveDeepLogger, PipelineMetrics (+8 more)

### Community 10 - "OnboardingWizardScreen.kt"
Cohesion: 0.12
Nodes (18): accountmanager, activityresultcontracts, getDefaultSchoolAppList(), Context, queryInstalledLauncherApps(), arrowback, backhandler, channelconfig (+10 more)

### Community 11 - "ChildrenGridDashboard.kt"
Cohesion: 0.16
Nodes (17): alignment, ProbeItem, DiagnosticFeedScreen(), LogLine, background, circleshape, clickable, clip (+9 more)

### Community 12 - "DriveVaultManager.kt"
Cohesion: 0.12
Nodes (16): KidsApplication, Application, CompletableDeferred, concurrentlinkedqueue, coroutinescope, date, filewriter, googleaccountcredential (+8 more)

### Community 13 - "MLKitOcrParser.kt"
Cohesion: 0.15
Nodes (12): MLKitOcrParser, OcrExtractionResult, Bitmap, Context, inputimage, parcelfiledescriptor, pdfrenderer, resume (+4 more)

### Community 14 - "ContentCategory"
Cohesion: 0.15
Nodes (8): ContentClassifier, ContentCategory, ATTENDANCE, CIRCULAR, FEES, HOMEWORK, UNKNOWN, ContentClassifierTest

### Community 15 - "assertthat"
Cohesion: 0.20
Nodes (7): DeduplicationHashTest, assertthat, beforeeach, bytearrayinputstream, mockk, runblocking, test

### Community 16 - "ci_watch.py"
Cohesion: 0.21
Nodes (14): os, re, diagnose_failure(), get_latest_run(), main(), monitor_workflow(), CI/CD Pipeline Monitor, Release Verifier & Graphify Guardian for K.I.D.S.…, Runs local Graphify AST extraction and community clustering. (+6 more)

### Community 17 - "OnboardingWizardScreen"
Cohesion: 0.37
Nodes (4): Context, PermissionHelper, PermissionSetupDialog(), OnboardingWizardScreen()

### Community 18 - "NotificationParserTest.kt"
Cohesion: 0.22
Nodes (8): Bundle, StatusBarNotification, NotificationParser, ParsedNotification, NotificationParserTest, build, every, notification

### Community 19 - "Intent"
Cohesion: 0.24
Nodes (8): androidx, launchAccountPicker(), BootReceiver, Context, BroadcastReceiver, Intent, notificationmanagercompat, settings

### Community 21 - "MainActivity.kt"
Cohesion: 0.18
Nodes (10): AppScreen, DASHBOARD, DIAGNOSTICS, WIZARD, childprofile, launch, lifecyclescope, remembersaveable (+2 more)

### Community 22 - "dispatchers"
Cohesion: 0.22
Nodes (8): DownloadFolderObserver, Context, MainActivity, ComponentActivity, dispatchers, environment, KidsDatabase, withcontext

### Community 23 - "PermissionSetupDialog.kt"
Cohesion: 0.22
Nodes (7): border, dialog, lifecycle, lifecycleeventobserver, localcontext, locallifecycleowner, roundedcornershape

### Community 24 - "Type.kt"
Cohesion: 0.22
Nodes (8): font, fontfamily, fontweight, googlefont, r, sp, textstyle, typography

### Community 25 - "GestureDescription"
Cohesion: 0.31
Nodes (4): GestureResultCallback, GestureResultCallback, GestureDescription, GestureResultCallback

### Community 26 - "DeduplicationEngine"
Cohesion: 0.29
Nodes (5): DeduplicationEngine, java, KidsNotificationListenerService, ByteArray, NotificationListenerService

### Community 27 - "WizardStep"
Cohesion: 0.33
Nodes (6): WizardStep, STEP_0_PERMISSIONS, STEP_1_VAULT, STEP_2_CLASSROOM, STEP_3_PORTALS, STEP_4_WHATSAPP

### Community 29 - "gradlew"
Cohesion: 0.83
Nodes (3): gradlew script, die(), warn()

## Knowledge Gaps
- **34 isolated node(s):** `NoticeFtsEntity`, `CloudHealthReport`, `DeviceInfo`, `PipelineMetrics`, `StepStatus` (+29 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 209 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **16 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `KidsAccessibilityService` connect `KidsAccessibilityService` to `FloatingCrawlerOverlay`, `KidsAccessibilityService.kt`, `OnboardingWizardScreen.kt`, `MLKitOcrParser.kt`, `ContentCategory`, `GestureDescription`, `DeduplicationEngine`?**
  _High betweenness centrality (0.211) - this node is a cross-community bridge._
- **Why does `ChildProfile` connect `ChildProfile` to `KidsAccessibilityService`, `KidsAccessibilityService.kt`, `ChildrenGridDashboard.kt`, `OnboardingWizardScreen`, `MultiChildAttributionTest`?**
  _High betweenness centrality (0.111) - this node is a cross-community bridge._
- **Why does `KidsDatabase` connect `NoticeDao` to `KidsAccessibilityService`?**
  _High betweenness centrality (0.083) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `KidsAccessibilityService` (e.g. with `ContentClassifier` and `DeduplicationEngine`) actually correct?**
  _`KidsAccessibilityService` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Are the 6 inferred relationships involving `GoogleDriveClient` (e.g. with `.preWarmOAuthAndFolders()` and `.provisionStep1()`) actually correct?**
  _`GoogleDriveClient` has 6 INFERRED edges - model-reasoned connections that need verification._
- **Are the 4 inferred relationships involving `ChildProfile` (e.g. with `.onCreate()` and `OnboardingWizardScreen()`) actually correct?**
  _`ChildProfile` has 4 INFERRED edges - model-reasoned connections that need verification._
- **What connects `NoticeFtsEntity`, `CloudHealthReport`, `DeviceInfo` to the rest of the system?**
  _34 weakly-connected nodes found - possible documentation gaps or missing edges._