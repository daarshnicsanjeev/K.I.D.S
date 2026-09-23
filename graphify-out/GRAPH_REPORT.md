# Graph Report - K.I.D.S  (2026-09-23)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 708 nodes · 1513 edges · 47 communities (29 shown, 18 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 33 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `94fa695e`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- KidsAccessibilityService
- FloatingCrawlerOverlay
- ChildProfile
- NoticeDao
- NotificationParserTest.kt
- OnboardingWizardScreen
- StreamManifest
- KidsAccessibilityService.kt
- SafVaultManager.kt
- OnboardingWizardScreen.kt
- ChildrenGridDashboard.kt
- DriveVaultManager.kt
- MLKitOcrParser.kt
- ci_watch.py
- DriveSyncWorker.kt
- GoogleDriveClient
- GoogleDriveClient.kt
- Intent
- MainActivity.kt
- .onNotificationPosted
- WhatsAppChatExportParser.kt
- DriveDeepLogger.kt
- K.I.D.S. Android Collector (PRD)
- PermissionSetupDialog.kt
- Type.kt
- GestureDescription
- dispatchers
- DeduplicationEngine
- WizardStep
- .getOrCreateFolder
- WhatsAppChatExportParserTest
- gradlew
- .uploadAttachment
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

## Communities (47 total, 18 thin omitted)

### Community 0 - "KidsAccessibilityService"
Cohesion: 0.07
Nodes (9): NoticeEntity, CrawlerTraceLogger, Context, ExtractedAttachmentDetail, KidsAccessibilityService, AccessibilityNodeInfo, UnvisitedCard, StreamManifest (+1 more)

### Community 1 - "FloatingCrawlerOverlay"
Cohesion: 0.06
Nodes (23): AccessibilityService, FloatingCrawlerOverlay, GestureResultCallback, GestureResultCallback, GestureResultCallback, GestureResultCallback, AccessibilityNodeInfo, GestureDescription (+15 more)

### Community 2 - "ChildProfile"
Cohesion: 0.05
Nodes (44): AttachmentEntity, ChildProfileEntity, NoticeFtsEntity, Converters, GraphEdge, GraphNode, KnowledgeGraph, KotlinGraphifyEngine (+36 more)

### Community 3 - "NoticeDao"
Cohesion: 0.06
Nodes (12): AttachmentDao, ChildProfileDao, AttachmentEntity, NoticeEntity, NoticeDao, KidsDatabase, Context, ChildProfileEntity (+4 more)

### Community 4 - "NotificationParserTest.kt"
Cohesion: 0.06
Nodes (17): PrivacyFilter, Bundle, StatusBarNotification, NotificationParser, ParsedNotification, ContentClassifierTest, DeduplicationHashTest, MultiChildAttributionTest (+9 more)

### Community 5 - "OnboardingWizardScreen"
Cohesion: 0.12
Nodes (17): DriveVaultManager, Failure, Context, Result, ProvisionStep1Result, Success, UserConsentRequired, ChildVaultFolders (+9 more)

### Community 6 - "StreamManifest"
Cohesion: 0.08
Nodes (9): StreamItemStatus, ALREADY_SYNCED, COMPLETED, FAILED_SKIPPED, IN_PROGRESS, PENDING, StreamManifest, StreamManifestItem (+1 more)

### Community 7 - "KidsAccessibilityService.kt"
Cohesion: 0.11
Nodes (24): AccessibilityEvent, accessibilitymanager, accessibilityserviceinfo, MainActivity, AttachmentEntity, ComponentActivity, constraints, delay (+16 more)

### Community 8 - "SafVaultManager.kt"
Cohesion: 0.20
Nodes (10): Activity, android, Context, Result, SafVaultFolders, SafVaultManager, ShareTargetActivity, Bundle (+2 more)

### Community 9 - "OnboardingWizardScreen.kt"
Cohesion: 0.12
Nodes (18): accountmanager, activityresultcontracts, getDefaultSchoolAppList(), Context, queryInstalledLauncherApps(), arrowback, backhandler, channelconfig (+10 more)

### Community 10 - "ChildrenGridDashboard.kt"
Cohesion: 0.16
Nodes (17): alignment, ProbeItem, DiagnosticFeedScreen(), LogLine, background, circleshape, clickable, clip (+9 more)

### Community 11 - "DriveVaultManager.kt"
Cohesion: 0.12
Nodes (16): KidsApplication, Application, CompletableDeferred, concurrentlinkedqueue, coroutinescope, date, filewriter, googleaccountcredential (+8 more)

### Community 12 - "MLKitOcrParser.kt"
Cohesion: 0.17
Nodes (11): MLKitOcrParser, OcrExtractionResult, Bitmap, inputimage, parcelfiledescriptor, pdfrenderer, resume, resumewithexception (+3 more)

### Community 13 - "ci_watch.py"
Cohesion: 0.21
Nodes (14): os, re, diagnose_failure(), get_latest_run(), main(), monitor_workflow(), CI/CD Pipeline Monitor, Release Verifier & Graphify Guardian for K.I.D.S.…, Runs local Graphify AST extraction and community clustering. (+6 more)

### Community 14 - "DriveSyncWorker.kt"
Cohesion: 0.19
Nodes (11): add, DriveSyncWorker, AttachmentEntity, NoticeEntity, buildjsonarray, buildjsonobject, CoroutineWorker, put (+3 more)

### Community 16 - "GoogleDriveClient.kt"
Cohesion: 0.17
Nodes (10): DriveQuotaInfo, async, bytearraycontent, bytearrayoutputstream, concurrenthashmap, Drive, filecontent, mutex (+2 more)

### Community 17 - "Intent"
Cohesion: 0.24
Nodes (8): androidx, launchAccountPicker(), BootReceiver, Context, BroadcastReceiver, Intent, notificationmanagercompat, settings

### Community 18 - "MainActivity.kt"
Cohesion: 0.18
Nodes (10): AppScreen, DASHBOARD, DIAGNOSTICS, WIZARD, childprofile, launch, lifecyclescope, remembersaveable (+2 more)

### Community 19 - ".onNotificationPosted"
Cohesion: 0.20
Nodes (5): ContentClassifier, MultiChildRouter, KidsNotificationListenerService, StatusBarNotification, NotificationListenerService

### Community 20 - "WhatsAppChatExportParser.kt"
Cohesion: 0.24
Nodes (6): ImportedNoticeRecord, WhatsAppChatExportParser, Dual WhatsApp Catch-Up Engine, inputstream, pattern, simpledateformat

### Community 21 - "DriveDeepLogger.kt"
Cohesion: 0.24
Nodes (6): DeviceInfo, DiagnosticSnapshot, DriveDeepLogger, PipelineMetrics, StepStatus, file

### Community 22 - "K.I.D.S. Android Collector (PRD)"
Cohesion: 0.22
Nodes (9): AI-Native Storage (JSONL & Markdown), 5-Point Cloud Health Probe, Google Credential Manager API, Memory Boundary Privacy Filter, K.I.D.S. Android Collector (PRD), Restricted Drive Scope (drive.file), Sequential 4-Step Onboarding, Streaming PdfRenderer OCR (+1 more)

### Community 23 - "PermissionSetupDialog.kt"
Cohesion: 0.22
Nodes (7): border, dialog, lifecycle, lifecycleeventobserver, locallifecycleowner, modifier, roundedcornershape

### Community 24 - "Type.kt"
Cohesion: 0.22
Nodes (8): font, fontfamily, fontweight, googlefont, r, sp, textstyle, typography

### Community 25 - "GestureDescription"
Cohesion: 0.36
Nodes (4): GestureResultCallback, GestureResultCallback, GestureDescription, GestureResultCallback

### Community 26 - "dispatchers"
Cohesion: 0.33
Nodes (5): DownloadFolderObserver, Context, dispatchers, environment, withcontext

### Community 27 - "DeduplicationEngine"
Cohesion: 0.40
Nodes (3): DeduplicationEngine, java, ByteArray

### Community 28 - "WizardStep"
Cohesion: 0.33
Nodes (6): WizardStep, STEP_0_PERMISSIONS, STEP_1_VAULT, STEP_2_CLASSROOM, STEP_3_PORTALS, STEP_4_WHATSAPP

### Community 31 - "gradlew"
Cohesion: 0.83
Nodes (3): gradlew script, die(), warn()

## Knowledge Gaps
- **34 isolated node(s):** `NoticeFtsEntity`, `CloudHealthReport`, `DeviceInfo`, `PipelineMetrics`, `StepStatus` (+29 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 208 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **18 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `KidsAccessibilityService` connect `KidsAccessibilityService` to `FloatingCrawlerOverlay`, `OnboardingWizardScreen`, `KidsAccessibilityService.kt`, `OnboardingWizardScreen.kt`, `.onNotificationPosted`, `DeduplicationEngine`?**
  _High betweenness centrality (0.211) - this node is a cross-community bridge._
- **Why does `ChildProfile` connect `ChildProfile` to `KidsAccessibilityService`, `NotificationParserTest.kt`, `OnboardingWizardScreen`, `KidsAccessibilityService.kt`, `ChildrenGridDashboard.kt`, `.onNotificationPosted`?**
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