# Graph Report - K.I.D.S  (2026-09-23)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 697 nodes · 1475 edges · 45 communities (29 shown, 16 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 30 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `7a609a42`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- .log
- KidsAccessibilityService
- GoogleDriveClient
- NoticeDao
- KidsAccessibilityService.kt
- ChildProfile
- assertthat
- StreamManifest
- ci_watch.py
- NotificationParserTest.kt
- OnboardingWizardScreen.kt
- ChildrenGridDashboard.kt
- DriveVaultManager.kt
- DriveSyncWorker.kt
- SafVaultManager.kt
- OnboardingWizardScreen
- PermissionHelper.kt
- MainActivity.kt
- GoogleDriveClient.kt
- DriveDeepLogger.kt
- K.I.D.S. Android Collector (PRD)
- MLKitOcrParser.kt
- PermissionSetupDialog.kt
- Type.kt
- GestureDescription
- dispatchers
- WizardStep
- WhatsAppChatExportParser.kt
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
- streamitemstatus
- StreamManifest
- streammanifestitem

## God Nodes (most connected - your core abstractions)
1. `KidsAccessibilityService` - 69 edges
2. `FloatingCrawlerOverlay` - 39 edges
3. `GoogleDriveClient` - 26 edges
4. `ChildProfile` - 21 edges
5. `OnboardingWizardScreen()` - 21 edges
6. `DriveVaultManager` - 19 edges
7. `StreamManifest` - 19 edges
8. `CrawlerTraceLogger` - 18 edges
9. `NoticeDao` - 16 edges
10. `AttachmentDao` - 14 edges

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

## Communities (45 total, 16 thin omitted)

### Community 0 - ".log"
Cohesion: 0.05
Nodes (25): AccessibilityService, CrawlerTraceLogger, Context, FloatingCrawlerOverlay, GestureResultCallback, GestureResultCallback, GestureResultCallback, GestureResultCallback (+17 more)

### Community 1 - "KidsAccessibilityService"
Cohesion: 0.10
Nodes (4): ExtractedAttachmentDetail, KidsAccessibilityService, AccessibilityNodeInfo, UnvisitedCard

### Community 2 - "GoogleDriveClient"
Cohesion: 0.09
Nodes (16): DriveVaultManager, Failure, Context, Result, ProvisionStep1Result, Success, UserConsentRequired, ChannelVaultFolders (+8 more)

### Community 3 - "NoticeDao"
Cohesion: 0.06
Nodes (12): AttachmentDao, ChildProfileDao, AttachmentEntity, NoticeEntity, NoticeDao, KidsDatabase, Context, ChildProfileEntity (+4 more)

### Community 4 - "KidsAccessibilityService.kt"
Cohesion: 0.07
Nodes (33): AccessibilityEvent, accessibilitymanager, accessibilityserviceinfo, Activity, ContentClassifier, DeduplicationEngine, java, MultiChildRouter (+25 more)

### Community 5 - "ChildProfile"
Cohesion: 0.07
Nodes (32): GraphEdge, GraphNode, KnowledgeGraph, KotlinGraphifyEngine, Attachment, ChannelType, FILE_IMPORT, GOOGLE_CLASSROOM (+24 more)

### Community 6 - "assertthat"
Cohesion: 0.06
Nodes (12): PrivacyFilter, ImportedNoticeRecord, WhatsAppChatExportParser, ContentClassifierTest, DeduplicationHashTest, MultiChildAttributionTest, PrivacyFilterTest, WhatsAppChatExportParserTest (+4 more)

### Community 7 - "StreamManifest"
Cohesion: 0.08
Nodes (9): StreamItemStatus, ALREADY_SYNCED, COMPLETED, FAILED_SKIPPED, IN_PROGRESS, PENDING, StreamManifest, StreamManifestItem (+1 more)

### Community 8 - "ci_watch.py"
Cohesion: 0.08
Nodes (27): AttachmentEntity, ChildProfileEntity, NoticeEntity, NoticeFtsEntity, Converters, ChannelConfig, encodetostring, entity (+19 more)

### Community 9 - "NotificationParserTest.kt"
Cohesion: 0.14
Nodes (12): MLKitOcrParser, OcrExtractionResult, Bundle, StatusBarNotification, NotificationParser, ParsedNotification, NotificationParserTest, Bitmap (+4 more)

### Community 10 - "OnboardingWizardScreen.kt"
Cohesion: 0.12
Nodes (18): accountmanager, activityresultcontracts, getDefaultSchoolAppList(), Context, queryInstalledLauncherApps(), arrowback, backhandler, channelconfig (+10 more)

### Community 11 - "ChildrenGridDashboard.kt"
Cohesion: 0.16
Nodes (17): alignment, ProbeItem, DiagnosticFeedScreen(), LogLine, background, circleshape, clickable, clip (+9 more)

### Community 12 - "DriveVaultManager.kt"
Cohesion: 0.12
Nodes (16): KidsApplication, Application, CompletableDeferred, concurrentlinkedqueue, coroutinescope, date, filewriter, googleaccountcredential (+8 more)

### Community 13 - "DriveSyncWorker.kt"
Cohesion: 0.15
Nodes (12): add, DriveSyncWorker, AttachmentEntity, NoticeEntity, Result, buildjsonarray, buildjsonobject, CoroutineWorker (+4 more)

### Community 14 - "SafVaultManager.kt"
Cohesion: 0.34
Nodes (7): Context, Result, SafVaultFolders, SafVaultManager, Context, DocumentFile, Uri

### Community 15 - "OnboardingWizardScreen"
Cohesion: 0.37
Nodes (4): Context, PermissionHelper, PermissionSetupDialog(), OnboardingWizardScreen()

### Community 16 - "PermissionHelper.kt"
Cohesion: 0.24
Nodes (8): androidx, launchAccountPicker(), BootReceiver, Context, BroadcastReceiver, Intent, notificationmanagercompat, settings

### Community 17 - "MainActivity.kt"
Cohesion: 0.18
Nodes (10): AppScreen, DASHBOARD, DIAGNOSTICS, WIZARD, childprofile, launch, lifecyclescope, remembersaveable (+2 more)

### Community 18 - "GoogleDriveClient.kt"
Cohesion: 0.20
Nodes (9): async, bytearraycontent, bytearrayoutputstream, concurrenthashmap, Drive, filecontent, mutex, standardcharsets (+1 more)

### Community 19 - "DriveDeepLogger.kt"
Cohesion: 0.24
Nodes (6): DeviceInfo, DiagnosticSnapshot, DriveDeepLogger, PipelineMetrics, StepStatus, file

### Community 20 - "K.I.D.S. Android Collector (PRD)"
Cohesion: 0.22
Nodes (9): AI-Native Storage (JSONL & Markdown), 5-Point Cloud Health Probe, Google Credential Manager API, Memory Boundary Privacy Filter, K.I.D.S. Android Collector (PRD), Restricted Drive Scope (drive.file), Sequential 4-Step Onboarding, Streaming PdfRenderer OCR (+1 more)

### Community 21 - "MLKitOcrParser.kt"
Cohesion: 0.22
Nodes (8): inputimage, parcelfiledescriptor, pdfrenderer, resume, resumewithexception, suspendcancellablecoroutine, textrecognition, textrecognizeroptions

### Community 22 - "PermissionSetupDialog.kt"
Cohesion: 0.22
Nodes (7): border, dialog, lifecycle, lifecycleeventobserver, localcontext, locallifecycleowner, roundedcornershape

### Community 23 - "Type.kt"
Cohesion: 0.22
Nodes (8): font, fontfamily, fontweight, googlefont, r, sp, textstyle, typography

### Community 24 - "GestureDescription"
Cohesion: 0.36
Nodes (4): GestureResultCallback, GestureResultCallback, GestureDescription, GestureResultCallback

### Community 25 - "dispatchers"
Cohesion: 0.33
Nodes (5): DownloadFolderObserver, Context, dispatchers, environment, withcontext

### Community 26 - "WizardStep"
Cohesion: 0.33
Nodes (6): WizardStep, STEP_0_PERMISSIONS, STEP_1_VAULT, STEP_2_CLASSROOM, STEP_3_PORTALS, STEP_4_WHATSAPP

### Community 27 - "WhatsAppChatExportParser.kt"
Cohesion: 0.40
Nodes (4): Dual WhatsApp Catch-Up Engine, inputstream, pattern, simpledateformat

### Community 28 - "gradlew"
Cohesion: 0.83
Nodes (3): gradlew script, die(), warn()

## Knowledge Gaps
- **36 isolated node(s):** `DeviceInfo`, `PipelineMetrics`, `StepStatus`, `CloudHealthReport`, `AttachmentEntity` (+31 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 208 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **16 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `KidsAccessibilityService` connect `KidsAccessibilityService` to `.log`, `OnboardingWizardScreen.kt`, `KidsAccessibilityService.kt`, `SafVaultManager.kt`?**
  _High betweenness centrality (0.209) - this node is a cross-community bridge._
- **Why does `ChildProfile` connect `ChildProfile` to `KidsAccessibilityService`, `KidsAccessibilityService.kt`, `assertthat`, `ChildrenGridDashboard.kt`, `OnboardingWizardScreen`?**
  _High betweenness centrality (0.100) - this node is a cross-community bridge._
- **Why does `KidsDatabase` connect `NoticeDao` to `KidsAccessibilityService`?**
  _High betweenness centrality (0.083) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `KidsAccessibilityService` (e.g. with `ContentClassifier` and `DeduplicationEngine`) actually correct?**
  _`KidsAccessibilityService` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Are the 6 inferred relationships involving `GoogleDriveClient` (e.g. with `.preWarmOAuthAndFolders()` and `.provisionStep1()`) actually correct?**
  _`GoogleDriveClient` has 6 INFERRED edges - model-reasoned connections that need verification._
- **Are the 4 inferred relationships involving `ChildProfile` (e.g. with `.onCreate()` and `OnboardingWizardScreen()`) actually correct?**
  _`ChildProfile` has 4 INFERRED edges - model-reasoned connections that need verification._
- **What connects `DeviceInfo`, `PipelineMetrics`, `StepStatus` to the rest of the system?**
  _36 weakly-connected nodes found - possible documentation gaps or missing edges._