# Graph Report - K.I.D.S  (2026-09-22)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 576 nodes · 1126 edges · 41 communities (26 shown, 15 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 25 edges (avg confidence: 0.87)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `ba179618`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- ContentCategory
- ChildProfile
- KidsAccessibilityService
- FloatingCrawlerOverlay
- GoogleDriveClient
- NoticeDao
- MLKitOcrParser.kt
- DriveDeepLogger.kt
- .provisionStep1
- ChildrenGridDashboard.kt
- KidsAccessibilityService.kt
- OnboardingWizardScreen.kt
- DriveSyncWorker.kt
- ci_watch.py
- AttachmentDao
- NotificationParserTest.kt
- OnboardingWizardScreen
- PermissionHelper.kt
- CrawlerTraceLogger.kt
- MainActivity.kt
- DeduplicationEngine
- PermissionSetupDialog.kt
- Type.kt
- DriveVaultManager.kt
- WizardStep
- log
- GestureResultCallback
- gradlew
- java
- Bundle
- AccessibilityNodeInfo
- GestureDescription
- GestureResultCallback
- ChildVaultFolders
- provisionstep1result
- Result
- role
- statusbarnotification

## God Nodes (most connected - your core abstractions)
1. `KidsAccessibilityService` - 45 edges
2. `FloatingCrawlerOverlay` - 29 edges
3. `GoogleDriveClient` - 24 edges
4. `ChildProfile` - 20 edges
5. `OnboardingWizardScreen()` - 19 edges
6. `NoticeDao` - 16 edges
7. `AttachmentDao` - 14 edges
8. `ContentCategory` - 13 edges
9. `DriveVaultManager` - 13 edges
10. `PermissionHelper` - 12 edges

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

## Communities (41 total, 15 thin omitted)

### Community 0 - "ContentCategory"
Cohesion: 0.05
Nodes (22): ContentClassifier, PrivacyFilter, ImportedNoticeRecord, WhatsAppChatExportParser, ContentCategory, ATTENDANCE, CIRCULAR, FEES (+14 more)

### Community 1 - "ChildProfile"
Cohesion: 0.07
Nodes (29): GraphEdge, GraphNode, KnowledgeGraph, KotlinGraphifyEngine, Attachment, ChannelType, FILE_IMPORT, GOOGLE_CLASSROOM (+21 more)

### Community 2 - "KidsAccessibilityService"
Cohesion: 0.11
Nodes (7): AccessibilityEvent, AccessibilityNodeInfo, ExtractedAttachmentDetail, KidsAccessibilityService, Context, UnvisitedCard, FloatingCrawlerOverlay

### Community 3 - "FloatingCrawlerOverlay"
Cohesion: 0.07
Nodes (20): AccessibilityService, FloatingCrawlerOverlay, GestureResultCallback, AccessibilityNodeInfo, GestureDescription, GestureResultCallback, Button, gradientdrawable (+12 more)

### Community 4 - "GoogleDriveClient"
Cohesion: 0.07
Nodes (22): AI-Native Storage (JSONL & Markdown), ChannelVaultFolders, DriveQuotaInfo, GoogleDriveClient, async, bytearraycontent, bytearrayoutputstream, concurrenthashmap (+14 more)

### Community 5 - "NoticeDao"
Cohesion: 0.09
Nodes (10): ChildProfileDao, NoticeDao, KidsDatabase, Context, ChildProfileEntity, database, Flow, NoticeEntity (+2 more)

### Community 6 - "MLKitOcrParser.kt"
Cohesion: 0.14
Nodes (17): Context, Result, SafVaultFolders, SafVaultManager, MLKitOcrParser, OcrExtractionResult, Bitmap, DocumentFile (+9 more)

### Community 7 - "DriveDeepLogger.kt"
Cohesion: 0.09
Nodes (18): AttachmentEntity, ChildProfileEntity, NoticeEntity, NoticeFtsEntity, Converters, ChannelConfig, DeviceInfo, DiagnosticSnapshot (+10 more)

### Community 8 - ".provisionStep1"
Cohesion: 0.18
Nodes (13): DriveVaultManager, Failure, Context, Result, ProvisionStep1Result, Success, UserConsentRequired, ChildVaultFolders (+5 more)

### Community 9 - "ChildrenGridDashboard.kt"
Cohesion: 0.16
Nodes (17): alignment, ProbeItem, DiagnosticFeedScreen(), LogLine, background, circleshape, clickable, clip (+9 more)

### Community 10 - "KidsAccessibilityService.kt"
Cohesion: 0.16
Nodes (16): accessibilitymanager, accessibilityserviceinfo, KidsNotificationListenerService, constraints, delay, existingworkpolicy, firstornull, isactive (+8 more)

### Community 11 - "OnboardingWizardScreen.kt"
Cohesion: 0.14
Nodes (15): accountmanager, activity, activityresultcontracts, getDefaultSchoolAppList(), Context, queryInstalledLauncherApps(), arrowback, backhandler (+7 more)

### Community 12 - "DriveSyncWorker.kt"
Cohesion: 0.16
Nodes (13): Context, MainActivity, DriveSyncWorker, buildjsonobject, ComponentActivity, CoroutineWorker, dispatchers, environment (+5 more)

### Community 13 - "ci_watch.py"
Cohesion: 0.21
Nodes (14): os, re, diagnose_failure(), get_latest_run(), main(), monitor_workflow(), CI/CD Pipeline Monitor, Release Verifier & Graphify Guardian for K.I.D.S.…, Runs local Graphify AST extraction and community clustering. (+6 more)

### Community 15 - "NotificationParserTest.kt"
Cohesion: 0.20
Nodes (9): Bundle, StatusBarNotification, NotificationParser, ParsedNotification, NotificationParserTest, build, Bundle, every (+1 more)

### Community 16 - "OnboardingWizardScreen"
Cohesion: 0.37
Nodes (4): Context, PermissionHelper, PermissionSetupDialog(), OnboardingWizardScreen()

### Community 17 - "PermissionHelper.kt"
Cohesion: 0.24
Nodes (8): androidx, launchAccountPicker(), BootReceiver, Context, BroadcastReceiver, Intent, notificationmanagercompat, settings

### Community 18 - "CrawlerTraceLogger.kt"
Cohesion: 0.22
Nodes (6): CrawlerTraceLogger, Context, concurrentlinkedqueue, date, file, locale

### Community 19 - "MainActivity.kt"
Cohesion: 0.20
Nodes (9): AppScreen, DASHBOARD, DIAGNOSTICS, WIZARD, childprofile, lifecyclescope, remembersaveable, setcontent (+1 more)

### Community 20 - "DeduplicationEngine"
Cohesion: 0.25
Nodes (5): DownloadFolderObserver, DeduplicationEngine, java, ByteArray, messagedigest

### Community 21 - "PermissionSetupDialog.kt"
Cohesion: 0.22
Nodes (7): border, dialog, lifecycle, lifecycleeventobserver, localcontext, locallifecycleowner, modifier

### Community 22 - "Type.kt"
Cohesion: 0.22
Nodes (8): font, fontfamily, fontweight, googlefont, r, sp, textstyle, typography

### Community 23 - "DriveVaultManager.kt"
Cohesion: 0.25
Nodes (7): coroutinescope, googleaccountcredential, gsonfactory, launch, nethttptransport, userrecoverableauthexception, userrecoverableauthioexception

### Community 24 - "WizardStep"
Cohesion: 0.33
Nodes (6): WizardStep, STEP_0_PERMISSIONS, STEP_1_VAULT, STEP_2_CLASSROOM, STEP_3_PORTALS, STEP_4_WHATSAPP

### Community 25 - "log"
Cohesion: 0.67
Nodes (3): KidsApplication, Application, log

### Community 27 - "gradlew"
Cohesion: 0.83
Nodes (3): gradlew script, die(), warn()

## Knowledge Gaps
- **31 isolated node(s):** `CloudHealthReport`, `AttachmentEntity`, `NoticeEntity`, `NoticeFtsEntity`, `DeviceInfo` (+26 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 180 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **15 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `ChildProfile` connect `ChildProfile` to `ContentCategory`, `KidsAccessibilityService`, `ChildrenGridDashboard.kt`, `KidsAccessibilityService.kt`, `OnboardingWizardScreen`?**
  _High betweenness centrality (0.126) - this node is a cross-community bridge._
- **Why does `KidsAccessibilityService` connect `KidsAccessibilityService` to `ContentCategory`, `KidsAccessibilityService.kt`, `FloatingCrawlerOverlay`, `DeduplicationEngine`?**
  _High betweenness centrality (0.107) - this node is a cross-community bridge._
- **Why does `OnboardingWizardScreen()` connect `OnboardingWizardScreen` to `ChildProfile`, `DriveDeepLogger.kt`, `.provisionStep1`, `OnboardingWizardScreen.kt`, `PermissionHelper.kt`, `MainActivity.kt`?**
  _High betweenness centrality (0.101) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `KidsAccessibilityService` (e.g. with `ContentClassifier` and `DeduplicationEngine`) actually correct?**
  _`KidsAccessibilityService` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Are the 4 inferred relationships involving `GoogleDriveClient` (e.g. with `.provisionStep1()` and `.provisionStep2Classroom()`) actually correct?**
  _`GoogleDriveClient` has 4 INFERRED edges - model-reasoned connections that need verification._
- **Are the 3 inferred relationships involving `ChildProfile` (e.g. with `.onCreate()` and `OnboardingWizardScreen()`) actually correct?**
  _`ChildProfile` has 3 INFERRED edges - model-reasoned connections that need verification._
- **What connects `CloudHealthReport`, `AttachmentEntity`, `NoticeEntity` to the rest of the system?**
  _31 weakly-connected nodes found - possible documentation gaps or missing edges._