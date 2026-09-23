# Graph Report - K.I.D.S  (2026-09-23)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 700 nodes · 1481 edges · 52 communities (33 shown, 19 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 30 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `95fc25e4`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- .log
- KidsAccessibilityService
- GoogleDriveClient
- ChildProfile
- NoticeDao
- StreamManifest
- SafVaultManager.kt
- KidsAccessibilityService.kt
- OnboardingWizardScreen.kt
- ChildrenGridDashboard.kt
- OnboardingWizardScreen
- MLKitOcrParser.kt
- ci_watch.py
- DriveSyncWorker.kt
- WhatsAppChatExportParser.kt
- NotificationParserTest.kt
- assertthat
- PermissionHelper.kt
- PrivacyFilterTest
- MainActivity.kt
- DriveVaultManager.kt
- DriveDeepLogger.kt
- K.I.D.S. Android Collector (PRD)
- dispatchers
- ContentCategory
- PermissionSetupDialog.kt
- Type.kt
- GestureDescription
- .onNotificationPosted
- DeduplicationEngine
- WizardStep
- ContentClassifierTest
- MultiChildAttributionTest
- log
- DriveVaultManagerTest.kt
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

## Communities (52 total, 19 thin omitted)

### Community 0 - ".log"
Cohesion: 0.05
Nodes (25): AccessibilityService, CrawlerTraceLogger, Context, FloatingCrawlerOverlay, GestureResultCallback, GestureResultCallback, GestureResultCallback, GestureResultCallback (+17 more)

### Community 1 - "KidsAccessibilityService"
Cohesion: 0.10
Nodes (4): ExtractedAttachmentDetail, KidsAccessibilityService, AccessibilityNodeInfo, UnvisitedCard

### Community 2 - "GoogleDriveClient"
Cohesion: 0.08
Nodes (23): DriveVaultManager, Failure, Context, Result, ProvisionStep1Result, Success, UserConsentRequired, ChannelVaultFolders (+15 more)

### Community 3 - "ChildProfile"
Cohesion: 0.06
Nodes (39): AttachmentEntity, ChildProfileEntity, NoticeEntity, NoticeFtsEntity, Converters, GraphEdge, GraphNode, KnowledgeGraph (+31 more)

### Community 4 - "NoticeDao"
Cohesion: 0.06
Nodes (12): AttachmentDao, ChildProfileDao, AttachmentEntity, NoticeEntity, NoticeDao, KidsDatabase, Context, ChildProfileEntity (+4 more)

### Community 5 - "StreamManifest"
Cohesion: 0.08
Nodes (9): StreamItemStatus, ALREADY_SYNCED, COMPLETED, FAILED_SKIPPED, IN_PROGRESS, PENDING, StreamManifest, StreamManifestItem (+1 more)

### Community 6 - "SafVaultManager.kt"
Cohesion: 0.17
Nodes (13): Activity, Context, Result, SafVaultFolders, SafVaultManager, ShareTargetActivity, concurrentlinkedqueue, date (+5 more)

### Community 7 - "KidsAccessibilityService.kt"
Cohesion: 0.13
Nodes (20): AccessibilityEvent, accessibilitymanager, accessibilityserviceinfo, AttachmentEntity, constraints, delay, existingworkpolicy, fileoutputstream (+12 more)

### Community 8 - "OnboardingWizardScreen.kt"
Cohesion: 0.12
Nodes (18): accountmanager, activityresultcontracts, getDefaultSchoolAppList(), Context, queryInstalledLauncherApps(), arrowback, backhandler, channelconfig (+10 more)

### Community 9 - "ChildrenGridDashboard.kt"
Cohesion: 0.16
Nodes (17): alignment, ProbeItem, DiagnosticFeedScreen(), LogLine, background, circleshape, clickable, clip (+9 more)

### Community 10 - "OnboardingWizardScreen"
Cohesion: 0.30
Nodes (5): Context, PermissionHelper, PermissionSetupDialog(), OnboardingWizardScreen(), Context

### Community 11 - "MLKitOcrParser.kt"
Cohesion: 0.17
Nodes (11): MLKitOcrParser, OcrExtractionResult, Bitmap, inputimage, parcelfiledescriptor, pdfrenderer, resume, resumewithexception (+3 more)

### Community 12 - "ci_watch.py"
Cohesion: 0.21
Nodes (14): os, re, diagnose_failure(), get_latest_run(), main(), monitor_workflow(), CI/CD Pipeline Monitor, Release Verifier & Graphify Guardian for K.I.D.S.…, Runs local Graphify AST extraction and community clustering. (+6 more)

### Community 13 - "DriveSyncWorker.kt"
Cohesion: 0.19
Nodes (11): add, DriveSyncWorker, AttachmentEntity, NoticeEntity, buildjsonarray, buildjsonobject, CoroutineWorker, put (+3 more)

### Community 14 - "WhatsAppChatExportParser.kt"
Cohesion: 0.16
Nodes (7): ImportedNoticeRecord, WhatsAppChatExportParser, WhatsAppChatExportParserTest, Dual WhatsApp Catch-Up Engine, inputstream, pattern, simpledateformat

### Community 15 - "NotificationParserTest.kt"
Cohesion: 0.20
Nodes (9): Bundle, StatusBarNotification, NotificationParser, ParsedNotification, NotificationParserTest, build, Bundle, every (+1 more)

### Community 16 - "assertthat"
Cohesion: 0.26
Nodes (5): DeduplicationHashTest, assertthat, beforeeach, bytearrayinputstream, test

### Community 17 - "PermissionHelper.kt"
Cohesion: 0.24
Nodes (8): androidx, launchAccountPicker(), BootReceiver, Context, BroadcastReceiver, Intent, notificationmanagercompat, settings

### Community 19 - "MainActivity.kt"
Cohesion: 0.18
Nodes (10): AppScreen, DASHBOARD, DIAGNOSTICS, WIZARD, childprofile, launch, lifecyclescope, remembersaveable (+2 more)

### Community 20 - "DriveVaultManager.kt"
Cohesion: 0.20
Nodes (9): CompletableDeferred, coroutinescope, googleaccountcredential, gsonfactory, nethttptransport, userrecoverableauthexception, userrecoverableauthioexception, withcontext (+1 more)

### Community 21 - "DriveDeepLogger.kt"
Cohesion: 0.24
Nodes (6): DeviceInfo, DiagnosticSnapshot, DriveDeepLogger, PipelineMetrics, StepStatus, file

### Community 22 - "K.I.D.S. Android Collector (PRD)"
Cohesion: 0.22
Nodes (9): AI-Native Storage (JSONL & Markdown), 5-Point Cloud Health Probe, Google Credential Manager API, Memory Boundary Privacy Filter, K.I.D.S. Android Collector (PRD), Restricted Drive Scope (drive.file), Sequential 4-Step Onboarding, Streaming PdfRenderer OCR (+1 more)

### Community 23 - "dispatchers"
Cohesion: 0.25
Nodes (7): DownloadFolderObserver, Context, MainActivity, ComponentActivity, dispatchers, environment, KidsDatabase

### Community 24 - "ContentCategory"
Cohesion: 0.25
Nodes (7): ContentClassifier, ContentCategory, ATTENDANCE, CIRCULAR, FEES, HOMEWORK, UNKNOWN

### Community 25 - "PermissionSetupDialog.kt"
Cohesion: 0.22
Nodes (7): border, dialog, lifecycle, lifecycleeventobserver, locallifecycleowner, modifier, roundedcornershape

### Community 26 - "Type.kt"
Cohesion: 0.22
Nodes (8): font, fontfamily, fontweight, googlefont, r, sp, textstyle, typography

### Community 27 - "GestureDescription"
Cohesion: 0.36
Nodes (4): GestureResultCallback, GestureResultCallback, GestureDescription, GestureResultCallback

### Community 28 - ".onNotificationPosted"
Cohesion: 0.29
Nodes (4): MultiChildRouter, KidsNotificationListenerService, StatusBarNotification, NotificationListenerService

### Community 29 - "DeduplicationEngine"
Cohesion: 0.40
Nodes (3): DeduplicationEngine, java, ByteArray

### Community 30 - "WizardStep"
Cohesion: 0.33
Nodes (6): WizardStep, STEP_0_PERMISSIONS, STEP_1_VAULT, STEP_2_CLASSROOM, STEP_3_PORTALS, STEP_4_WHATSAPP

### Community 33 - "log"
Cohesion: 0.67
Nodes (3): KidsApplication, Application, log

### Community 34 - "DriveVaultManagerTest.kt"
Cohesion: 0.50
Nodes (3): Context, mockk, runblocking

### Community 35 - "gradlew"
Cohesion: 0.83
Nodes (3): gradlew script, die(), warn()

## Knowledge Gaps
- **36 isolated node(s):** `DeviceInfo`, `PipelineMetrics`, `StepStatus`, `AttachmentEntity`, `NoticeEntity` (+31 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 210 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **19 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `KidsAccessibilityService` connect `KidsAccessibilityService` to `.log`, `KidsAccessibilityService.kt`, `OnboardingWizardScreen.kt`, `OnboardingWizardScreen`, `ContentCategory`, `DeduplicationEngine`?**
  _High betweenness centrality (0.207) - this node is a cross-community bridge._
- **Why does `ChildProfile` connect `ChildProfile` to `MultiChildAttributionTest`, `KidsAccessibilityService`, `KidsAccessibilityService.kt`, `ChildrenGridDashboard.kt`, `OnboardingWizardScreen`, `assertthat`, `.onNotificationPosted`?**
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