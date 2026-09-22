# Graph Report - K.I.D.S  (2026-09-22)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 590 nodes · 1195 edges · 42 communities (29 shown, 13 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 28 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `75a499a9`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- GoogleDriveClient
- KidsAccessibilityService
- NoticeDao
- ChildProfile
- ContentCategory
- FloatingCrawlerOverlay
- DriveDeepLogger.kt
- K.I.D.S. Android Collector (PRD)
- ChildrenGridDashboard.kt
- SafVaultManager.kt
- KidsAccessibilityService.kt
- OnboardingWizardScreen.kt
- ci_watch.py
- OnboardingWizardScreen
- NotificationParser.kt
- PermissionHelper.kt
- MainActivity.kt
- MLKitOcrParser.kt
- DriveVaultManager.kt
- PermissionSetupDialog.kt
- Type.kt
- DriveSyncWorker.kt
- log
- DeduplicationEngine
- KidsNotificationListenerService.kt
- WizardStep
- GestureResultCallback
- gradlew
- KidsDatabase
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
1. `KidsAccessibilityService` - 51 edges
2. `FloatingCrawlerOverlay` - 32 edges
3. `GoogleDriveClient` - 24 edges
4. `ChildProfile` - 21 edges
5. `OnboardingWizardScreen()` - 19 edges
6. `NoticeDao` - 16 edges
7. `AttachmentDao` - 14 edges
8. `DriveVaultManager` - 13 edges
9. `ContentCategory` - 13 edges
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

## Communities (42 total, 13 thin omitted)

### Community 0 - "GoogleDriveClient"
Cohesion: 0.06
Nodes (27): DriveVaultManager, Failure, Context, Result, ProvisionStep1Result, Success, UserConsentRequired, ChannelVaultFolders (+19 more)

### Community 1 - "KidsAccessibilityService"
Cohesion: 0.11
Nodes (6): AccessibilityEvent, ExtractedAttachmentDetail, KidsAccessibilityService, AccessibilityNodeInfo, Context, UnvisitedCard

### Community 2 - "NoticeDao"
Cohesion: 0.06
Nodes (12): AttachmentDao, ChildProfileDao, NoticeDao, KidsDatabase, Context, AttachmentEntity, ChildProfileEntity, database (+4 more)

### Community 3 - "ChildProfile"
Cohesion: 0.07
Nodes (29): GraphEdge, GraphNode, KnowledgeGraph, KotlinGraphifyEngine, Attachment, ChannelType, FILE_IMPORT, GOOGLE_CLASSROOM (+21 more)

### Community 4 - "ContentCategory"
Cohesion: 0.06
Nodes (21): ContentClassifier, PrivacyFilter, ContentCategory, ATTENDANCE, CIRCULAR, FEES, HOMEWORK, UNKNOWN (+13 more)

### Community 5 - "FloatingCrawlerOverlay"
Cohesion: 0.07
Nodes (20): AccessibilityService, FloatingCrawlerOverlay, GestureResultCallback, AccessibilityNodeInfo, GestureDescription, GestureResultCallback, Button, gradientdrawable (+12 more)

### Community 6 - "DriveDeepLogger.kt"
Cohesion: 0.09
Nodes (18): AttachmentEntity, ChildProfileEntity, NoticeEntity, NoticeFtsEntity, Converters, ChannelConfig, DeviceInfo, DiagnosticSnapshot (+10 more)

### Community 7 - "K.I.D.S. Android Collector (PRD)"
Cohesion: 0.09
Nodes (16): AI-Native Storage (JSONL & Markdown), ImportedNoticeRecord, WhatsAppChatExportParser, WhatsAppChatExportParserTest, Dual WhatsApp Catch-Up Engine, 5-Point Cloud Health Probe, Google Credential Manager API, inputstream (+8 more)

### Community 8 - "ChildrenGridDashboard.kt"
Cohesion: 0.16
Nodes (17): alignment, ProbeItem, DiagnosticFeedScreen(), LogLine, circleshape, clickable, clip, contentdescription (+9 more)

### Community 9 - "SafVaultManager.kt"
Cohesion: 0.27
Nodes (8): Activity, Context, Result, SafVaultFolders, SafVaultManager, ShareTargetActivity, DocumentFile, Uri

### Community 10 - "KidsAccessibilityService.kt"
Cohesion: 0.16
Nodes (14): accessibilitymanager, accessibilityserviceinfo, constraints, delay, existingworkpolicy, fileoutputstream, isactive, Job (+6 more)

### Community 11 - "OnboardingWizardScreen.kt"
Cohesion: 0.15
Nodes (14): accountmanager, activityresultcontracts, getDefaultSchoolAppList(), Context, queryInstalledLauncherApps(), arrowback, backhandler, channelconfig (+6 more)

### Community 12 - "ci_watch.py"
Cohesion: 0.21
Nodes (14): os, re, diagnose_failure(), get_latest_run(), main(), monitor_workflow(), CI/CD Pipeline Monitor, Release Verifier & Graphify Guardian for K.I.D.S.…, Runs local Graphify AST extraction and community clustering. (+6 more)

### Community 13 - "OnboardingWizardScreen"
Cohesion: 0.37
Nodes (4): Context, PermissionHelper, PermissionSetupDialog(), OnboardingWizardScreen()

### Community 14 - "NotificationParser.kt"
Cohesion: 0.21
Nodes (8): MLKitOcrParser, OcrExtractionResult, Bundle, StatusBarNotification, ParsedNotification, Bitmap, build, notification

### Community 15 - "PermissionHelper.kt"
Cohesion: 0.24
Nodes (8): androidx, launchAccountPicker(), BootReceiver, Context, BroadcastReceiver, Intent, notificationmanagercompat, settings

### Community 16 - "MainActivity.kt"
Cohesion: 0.18
Nodes (10): AppScreen, DASHBOARD, DIAGNOSTICS, WIZARD, childprofile, launch, lifecyclescope, remembersaveable (+2 more)

### Community 17 - "MLKitOcrParser.kt"
Cohesion: 0.20
Nodes (9): inputimage, parcelfiledescriptor, pdfrenderer, resume, resumewithexception, suspendcancellablecoroutine, textrecognition, textrecognizeroptions (+1 more)

### Community 18 - "DriveVaultManager.kt"
Cohesion: 0.22
Nodes (8): coroutinescope, date, googleaccountcredential, gsonfactory, locale, nethttptransport, userrecoverableauthexception, userrecoverableauthioexception

### Community 19 - "PermissionSetupDialog.kt"
Cohesion: 0.22
Nodes (7): background, border, dialog, lifecycle, lifecycleeventobserver, localcontext, locallifecycleowner

### Community 20 - "Type.kt"
Cohesion: 0.22
Nodes (8): font, fontfamily, fontweight, googlefont, r, sp, textstyle, typography

### Community 21 - "DriveSyncWorker.kt"
Cohesion: 0.29
Nodes (7): DriveSyncWorker, buildjsonobject, CoroutineWorker, dispatchers, put, syncstatus, workerparameters

### Community 22 - "log"
Cohesion: 0.38
Nodes (5): Context, concurrentlinkedqueue, environment, file, log

### Community 23 - "DeduplicationEngine"
Cohesion: 0.33
Nodes (4): DownloadFolderObserver, DeduplicationEngine, java, ByteArray

### Community 24 - "KidsNotificationListenerService.kt"
Cohesion: 0.38
Nodes (6): NotificationParser, KidsNotificationListenerService, firstornull, NotificationListenerService, supervisorjob, uuid

### Community 25 - "WizardStep"
Cohesion: 0.33
Nodes (6): WizardStep, STEP_0_PERMISSIONS, STEP_1_VAULT, STEP_2_CLASSROOM, STEP_3_PORTALS, STEP_4_WHATSAPP

### Community 26 - "GestureResultCallback"
Cohesion: 0.50
Nodes (3): GestureResultCallback, GestureDescription, GestureResultCallback

### Community 27 - "gradlew"
Cohesion: 0.83
Nodes (3): gradlew script, die(), warn()

### Community 28 - "KidsDatabase"
Cohesion: 0.67
Nodes (3): MainActivity, ComponentActivity, KidsDatabase

## Knowledge Gaps
- **31 isolated node(s):** `CloudHealthReport`, `AttachmentEntity`, `NoticeFtsEntity`, `DeviceInfo`, `PipelineMetrics` (+26 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 181 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **13 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `KidsAccessibilityService` connect `KidsAccessibilityService` to `KidsAccessibilityService.kt`, `ContentCategory`, `FloatingCrawlerOverlay`, `DeduplicationEngine`?**
  _High betweenness centrality (0.148) - this node is a cross-community bridge._
- **Why does `ChildProfile` connect `ChildProfile` to `KidsAccessibilityService`, `ContentCategory`, `ChildrenGridDashboard.kt`, `OnboardingWizardScreen`, `KidsNotificationListenerService.kt`?**
  _High betweenness centrality (0.124) - this node is a cross-community bridge._
- **Why does `OnboardingWizardScreen()` connect `OnboardingWizardScreen` to `GoogleDriveClient`, `ChildProfile`, `DriveDeepLogger.kt`, `OnboardingWizardScreen.kt`, `PermissionHelper.kt`, `MainActivity.kt`?**
  _High betweenness centrality (0.094) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `KidsAccessibilityService` (e.g. with `ContentClassifier` and `DeduplicationEngine`) actually correct?**
  _`KidsAccessibilityService` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Are the 4 inferred relationships involving `GoogleDriveClient` (e.g. with `.provisionStep1()` and `.provisionStep2Classroom()`) actually correct?**
  _`GoogleDriveClient` has 4 INFERRED edges - model-reasoned connections that need verification._
- **Are the 4 inferred relationships involving `ChildProfile` (e.g. with `.onCreate()` and `OnboardingWizardScreen()`) actually correct?**
  _`ChildProfile` has 4 INFERRED edges - model-reasoned connections that need verification._
- **What connects `CloudHealthReport`, `AttachmentEntity`, `NoticeFtsEntity` to the rest of the system?**
  _31 weakly-connected nodes found - possible documentation gaps or missing edges._