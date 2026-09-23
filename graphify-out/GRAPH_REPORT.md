# Graph Report - K.I.D.S  (2026-09-23)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 682 nodes · 1427 edges · 50 communities (30 shown, 20 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 30 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `7f0b013a`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- .log
- KidsAccessibilityService
- NoticeDao
- ChildProfile
- GoogleDriveClient
- OnboardingWizardScreen
- SafVaultManager.kt
- ci_watch.py
- StreamManifest
- DriveSyncWorker.kt
- OnboardingWizardScreen.kt
- ChildrenGridDashboard.kt
- MLKitOcrParser.kt
- KidsNotificationListenerService.kt
- NotificationParserTest.kt
- KidsAccessibilityService.kt
- MainActivity.kt
- PrivacyFilterTest
- DriveVaultManager.kt
- assertthat
- PermissionSetupDialog.kt
- Type.kt
- Intent
- dispatchers
- ShareTargetActivity.kt
- DeduplicationEngine
- WizardStep
- ContentClassifierTest
- GestureResultCallback
- MultiChildAttributionTest
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
- provisionstep1result
- Result
- role
- statusbarnotification
- streamitemstatus
- StreamManifest
- streammanifestitem

## God Nodes (most connected - your core abstractions)
1. `KidsAccessibilityService` - 60 edges
2. `FloatingCrawlerOverlay` - 39 edges
3. `GoogleDriveClient` - 26 edges
4. `ChildProfile` - 21 edges
5. `OnboardingWizardScreen()` - 21 edges
6. `DriveVaultManager` - 19 edges
7. `CrawlerTraceLogger` - 18 edges
8. `StreamManifest` - 18 edges
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

## Communities (50 total, 20 thin omitted)

### Community 0 - ".log"
Cohesion: 0.05
Nodes (25): AccessibilityService, CrawlerTraceLogger, Context, FloatingCrawlerOverlay, GestureResultCallback, GestureResultCallback, GestureResultCallback, GestureResultCallback (+17 more)

### Community 1 - "KidsAccessibilityService"
Cohesion: 0.11
Nodes (4): ExtractedAttachmentDetail, KidsAccessibilityService, AccessibilityNodeInfo, UnvisitedCard

### Community 2 - "NoticeDao"
Cohesion: 0.06
Nodes (12): AttachmentDao, ChildProfileDao, AttachmentEntity, NoticeEntity, NoticeDao, KidsDatabase, Context, ChildProfileEntity (+4 more)

### Community 3 - "ChildProfile"
Cohesion: 0.07
Nodes (32): GraphEdge, GraphNode, KnowledgeGraph, KotlinGraphifyEngine, Attachment, ChannelType, FILE_IMPORT, GOOGLE_CLASSROOM (+24 more)

### Community 4 - "GoogleDriveClient"
Cohesion: 0.07
Nodes (22): AI-Native Storage (JSONL & Markdown), ChannelVaultFolders, DriveQuotaInfo, GoogleDriveClient, async, bytearraycontent, bytearrayoutputstream, concurrenthashmap (+14 more)

### Community 5 - "OnboardingWizardScreen"
Cohesion: 0.14
Nodes (14): DriveVaultManager, Failure, Context, Result, ProvisionStep1Result, Success, UserConsentRequired, ChildVaultFolders (+6 more)

### Community 6 - "SafVaultManager.kt"
Cohesion: 0.09
Nodes (20): Activity, Context, Result, SafVaultFolders, SafVaultManager, ImportedNoticeRecord, WhatsAppChatExportParser, ShareTargetActivity (+12 more)

### Community 7 - "ci_watch.py"
Cohesion: 0.08
Nodes (27): AttachmentEntity, ChildProfileEntity, NoticeEntity, NoticeFtsEntity, Converters, ChannelConfig, encodetostring, entity (+19 more)

### Community 8 - "StreamManifest"
Cohesion: 0.09
Nodes (9): StreamItemStatus, ALREADY_SYNCED, COMPLETED, FAILED_SKIPPED, IN_PROGRESS, PENDING, StreamManifest, StreamManifestItem (+1 more)

### Community 9 - "DriveSyncWorker.kt"
Cohesion: 0.10
Nodes (18): add, DriveSyncWorker, AttachmentEntity, NoticeEntity, Result, DeviceInfo, DiagnosticSnapshot, DriveDeepLogger (+10 more)

### Community 10 - "OnboardingWizardScreen.kt"
Cohesion: 0.12
Nodes (18): accountmanager, activityresultcontracts, getDefaultSchoolAppList(), Context, queryInstalledLauncherApps(), arrowback, backhandler, channelconfig (+10 more)

### Community 11 - "ChildrenGridDashboard.kt"
Cohesion: 0.17
Nodes (16): alignment, ProbeItem, DiagnosticFeedScreen(), LogLine, circleshape, clickable, clip, contentdescription (+8 more)

### Community 12 - "MLKitOcrParser.kt"
Cohesion: 0.17
Nodes (11): MLKitOcrParser, OcrExtractionResult, Bitmap, inputimage, parcelfiledescriptor, pdfrenderer, resume, resumewithexception (+3 more)

### Community 13 - "KidsNotificationListenerService.kt"
Cohesion: 0.19
Nodes (8): ContentClassifier, MultiChildRouter, KidsNotificationListenerService, StatusBarNotification, firstornull, NoticeEntity, NotificationListenerService, supervisorjob

### Community 14 - "NotificationParserTest.kt"
Cohesion: 0.20
Nodes (9): Bundle, StatusBarNotification, NotificationParser, ParsedNotification, NotificationParserTest, build, Bundle, every (+1 more)

### Community 15 - "KidsAccessibilityService.kt"
Cohesion: 0.17
Nodes (11): AccessibilityEvent, accessibilitymanager, accessibilityserviceinfo, AttachmentEntity, childprofile, delay, isactive, Job (+3 more)

### Community 16 - "MainActivity.kt"
Cohesion: 0.17
Nodes (10): AppScreen, DASHBOARD, DIAGNOSTICS, WIZARD, lifecyclescope, notificationmanagercompat, remembersaveable, setcontent (+2 more)

### Community 18 - "DriveVaultManager.kt"
Cohesion: 0.20
Nodes (9): CompletableDeferred, coroutinescope, googleaccountcredential, gsonfactory, launch, nethttptransport, userrecoverableauthexception, userrecoverableauthioexception (+1 more)

### Community 19 - "assertthat"
Cohesion: 0.42
Nodes (4): assertthat, beforeeach, bytearrayinputstream, test

### Community 20 - "PermissionSetupDialog.kt"
Cohesion: 0.22
Nodes (8): background, border, dialog, lifecycle, lifecycleeventobserver, localcontext, locallifecycleowner, roundedcornershape

### Community 21 - "Type.kt"
Cohesion: 0.22
Nodes (8): font, fontfamily, fontweight, googlefont, r, sp, textstyle, typography

### Community 22 - "Intent"
Cohesion: 0.36
Nodes (6): androidx, launchAccountPicker(), BootReceiver, Context, BroadcastReceiver, Intent

### Community 23 - "dispatchers"
Cohesion: 0.25
Nodes (7): Context, MainActivity, ComponentActivity, dispatchers, environment, KidsDatabase, withcontext

### Community 24 - "ShareTargetActivity.kt"
Cohesion: 0.25
Nodes (7): constraints, existingworkpolicy, fileoutputstream, networktype, onetimeworkrequestbuilder, openablecolumns, workmanager

### Community 25 - "DeduplicationEngine"
Cohesion: 0.33
Nodes (4): DownloadFolderObserver, DeduplicationEngine, java, ByteArray

### Community 26 - "WizardStep"
Cohesion: 0.33
Nodes (6): WizardStep, STEP_0_PERMISSIONS, STEP_1_VAULT, STEP_2_CLASSROOM, STEP_3_PORTALS, STEP_4_WHATSAPP

### Community 28 - "GestureResultCallback"
Cohesion: 0.50
Nodes (3): GestureResultCallback, GestureDescription, GestureResultCallback

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
- **36 isolated node(s):** `CloudHealthReport`, `AttachmentEntity`, `NoticeEntity`, `NoticeFtsEntity`, `DeviceInfo` (+31 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 206 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **20 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `KidsAccessibilityService` connect `KidsAccessibilityService` to `.log`, `OnboardingWizardScreen`, `OnboardingWizardScreen.kt`, `KidsNotificationListenerService.kt`, `KidsAccessibilityService.kt`, `DeduplicationEngine`?**
  _High betweenness centrality (0.194) - this node is a cross-community bridge._
- **Why does `ChildProfile` connect `ChildProfile` to `KidsAccessibilityService`, `OnboardingWizardScreen`, `ChildrenGridDashboard.kt`, `KidsNotificationListenerService.kt`, `assertthat`, `MultiChildAttributionTest`?**
  _High betweenness centrality (0.103) - this node is a cross-community bridge._
- **Why does `KidsDatabase` connect `NoticeDao` to `KidsAccessibilityService`?**
  _High betweenness centrality (0.085) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `KidsAccessibilityService` (e.g. with `ContentClassifier` and `DeduplicationEngine`) actually correct?**
  _`KidsAccessibilityService` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Are the 6 inferred relationships involving `GoogleDriveClient` (e.g. with `.preWarmOAuthAndFolders()` and `.provisionStep1()`) actually correct?**
  _`GoogleDriveClient` has 6 INFERRED edges - model-reasoned connections that need verification._
- **Are the 4 inferred relationships involving `ChildProfile` (e.g. with `.onCreate()` and `OnboardingWizardScreen()`) actually correct?**
  _`ChildProfile` has 4 INFERRED edges - model-reasoned connections that need verification._
- **What connects `CloudHealthReport`, `AttachmentEntity`, `NoticeEntity` to the rest of the system?**
  _36 weakly-connected nodes found - possible documentation gaps or missing edges._