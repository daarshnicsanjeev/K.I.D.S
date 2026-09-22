# Graph Report - K.I.D.S  (2026-09-22)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 669 nodes · 1401 edges · 51 communities (31 shown, 20 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 30 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `0f746826`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- KidsAccessibilityService
- ChildProfile
- NoticeDao
- GoogleDriveClient
- DriveSyncWorker.kt
- GoogleDriveClient.kt
- FloatingCrawlerOverlay
- OnboardingWizardScreen
- KidsAccessibilityService.kt
- SafVaultManager.kt
- OnboardingWizardScreen.kt
- ChildrenGridDashboard.kt
- StreamManifest
- .log
- GestureDescription
- MLKitOcrParser.kt
- ContentCategory
- ci_watch.py
- FloatingCrawlerOverlay.kt
- NotificationParserTest.kt
- MainActivity.kt
- PrivacyFilterTest
- DriveVaultManager.kt
- PermissionSetupDialog.kt
- Type.kt
- DeduplicationEngine
- .findPrimaryScrollableNode
- assertthat
- dispatchers
- WizardStep
- GestureResultCallback
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
8. `NoticeDao` - 16 edges
9. `StreamManifest` - 15 edges
10. `AttachmentDao` - 14 edges

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
Cohesion: 0.11
Nodes (6): AccessibilityEvent, ExtractedAttachmentDetail, KidsAccessibilityService, AccessibilityNodeInfo, Context, UnvisitedCard

### Community 1 - "ChildProfile"
Cohesion: 0.07
Nodes (28): GraphEdge, GraphNode, KnowledgeGraph, KotlinGraphifyEngine, Attachment, ChannelType, FILE_IMPORT, GOOGLE_CLASSROOM (+20 more)

### Community 2 - "NoticeDao"
Cohesion: 0.06
Nodes (12): AttachmentDao, ChildProfileDao, AttachmentEntity, NoticeEntity, NoticeDao, KidsDatabase, Context, ChildProfileEntity (+4 more)

### Community 3 - "GoogleDriveClient"
Cohesion: 0.11
Nodes (13): DriveVaultManager, Failure, Context, Result, ProvisionStep1Result, Success, UserConsentRequired, ChannelVaultFolders (+5 more)

### Community 4 - "DriveSyncWorker.kt"
Cohesion: 0.06
Nodes (30): add, AttachmentEntity, ChildProfileEntity, NoticeEntity, NoticeFtsEntity, Converters, ChannelConfig, DriveSyncWorker (+22 more)

### Community 5 - "GoogleDriveClient.kt"
Cohesion: 0.06
Nodes (26): AI-Native Storage (JSONL & Markdown), DriveQuotaInfo, ImportedNoticeRecord, WhatsAppChatExportParser, WhatsAppChatExportParserTest, async, bytearraycontent, bytearrayoutputstream (+18 more)

### Community 6 - "FloatingCrawlerOverlay"
Cohesion: 0.15
Nodes (3): FloatingCrawlerOverlay, View, WindowManager

### Community 7 - "OnboardingWizardScreen"
Cohesion: 0.17
Nodes (12): androidx, Context, PermissionHelper, PermissionSetupDialog(), launchAccountPicker(), OnboardingWizardScreen(), BootReceiver, Context (+4 more)

### Community 8 - "KidsAccessibilityService.kt"
Cohesion: 0.13
Nodes (20): accessibilitymanager, accessibilityserviceinfo, StatusBarNotification, AttachmentEntity, constraints, delay, existingworkpolicy, fileoutputstream (+12 more)

### Community 9 - "SafVaultManager.kt"
Cohesion: 0.18
Nodes (13): Activity, Context, Result, SafVaultFolders, SafVaultManager, ShareTargetActivity, concurrentlinkedqueue, date (+5 more)

### Community 10 - "OnboardingWizardScreen.kt"
Cohesion: 0.12
Nodes (18): accountmanager, activityresultcontracts, getDefaultSchoolAppList(), Context, queryInstalledLauncherApps(), arrowback, backhandler, channelconfig (+10 more)

### Community 11 - "ChildrenGridDashboard.kt"
Cohesion: 0.16
Nodes (17): alignment, ProbeItem, DiagnosticFeedScreen(), LogLine, background, circleshape, clickable, clip (+9 more)

### Community 12 - "StreamManifest"
Cohesion: 0.16
Nodes (8): StreamItemStatus, ALREADY_SYNCED, COMPLETED, FAILED_SKIPPED, IN_PROGRESS, PENDING, StreamManifest, StreamManifestItem

### Community 14 - "GestureDescription"
Cohesion: 0.19
Nodes (5): GestureResultCallback, GestureResultCallback, GestureResultCallback, GestureDescription, GestureResultCallback

### Community 15 - "MLKitOcrParser.kt"
Cohesion: 0.17
Nodes (11): MLKitOcrParser, OcrExtractionResult, Bitmap, inputimage, parcelfiledescriptor, pdfrenderer, resume, resumewithexception (+3 more)

### Community 16 - "ContentCategory"
Cohesion: 0.14
Nodes (8): ContentClassifier, ContentCategory, ATTENDANCE, CIRCULAR, FEES, HOMEWORK, UNKNOWN, ContentClassifierTest

### Community 17 - "ci_watch.py"
Cohesion: 0.21
Nodes (14): os, re, diagnose_failure(), get_latest_run(), main(), monitor_workflow(), CI/CD Pipeline Monitor, Release Verifier & Graphify Guardian for K.I.D.S.…, Runs local Graphify AST extraction and community clustering. (+6 more)

### Community 18 - "FloatingCrawlerOverlay.kt"
Cohesion: 0.14
Nodes (13): AccessibilityService, Button, gradientdrawable, gravity, handler, LinearLayout, looper, motionevent (+5 more)

### Community 19 - "NotificationParserTest.kt"
Cohesion: 0.20
Nodes (9): Bundle, StatusBarNotification, NotificationParser, ParsedNotification, NotificationParserTest, build, Bundle, every (+1 more)

### Community 20 - "MainActivity.kt"
Cohesion: 0.20
Nodes (11): AppScreen, DASHBOARD, DIAGNOSTICS, WIZARD, MainActivity, childprofile, ComponentActivity, KidsDatabase (+3 more)

### Community 22 - "DriveVaultManager.kt"
Cohesion: 0.20
Nodes (9): CompletableDeferred, coroutinescope, googleaccountcredential, gsonfactory, launch, nethttptransport, userrecoverableauthexception, userrecoverableauthioexception (+1 more)

### Community 23 - "PermissionSetupDialog.kt"
Cohesion: 0.20
Nodes (8): border, dialog, lifecycle, lifecycleeventobserver, localcontext, locallifecycleowner, modifier, toast

### Community 24 - "Type.kt"
Cohesion: 0.22
Nodes (8): font, fontfamily, fontweight, googlefont, r, sp, textstyle, typography

### Community 25 - "DeduplicationEngine"
Cohesion: 0.29
Nodes (5): DeduplicationEngine, java, KidsNotificationListenerService, ByteArray, NotificationListenerService

### Community 27 - "assertthat"
Cohesion: 0.46
Nodes (4): assertthat, beforeeach, bytearrayinputstream, test

### Community 28 - "dispatchers"
Cohesion: 0.33
Nodes (5): DownloadFolderObserver, Context, dispatchers, environment, withcontext

### Community 29 - "WizardStep"
Cohesion: 0.33
Nodes (6): WizardStep, STEP_0_PERMISSIONS, STEP_1_VAULT, STEP_2_CLASSROOM, STEP_3_PORTALS, STEP_4_WHATSAPP

### Community 30 - "GestureResultCallback"
Cohesion: 0.50
Nodes (3): GestureResultCallback, GestureDescription, GestureResultCallback

### Community 31 - "log"
Cohesion: 0.67
Nodes (3): KidsApplication, Application, log

### Community 33 - "DriveVaultManagerTest.kt"
Cohesion: 0.50
Nodes (3): Context, mockk, runblocking

### Community 34 - "gradlew"
Cohesion: 0.83
Nodes (3): gradlew script, die(), warn()

## Knowledge Gaps
- **36 isolated node(s):** `CloudHealthReport`, `AttachmentEntity`, `NoticeEntity`, `NoticeFtsEntity`, `DeviceInfo` (+31 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 201 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **20 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `KidsAccessibilityService` connect `KidsAccessibilityService` to `ChildProfile`, `FloatingCrawlerOverlay`, `KidsAccessibilityService.kt`, `OnboardingWizardScreen.kt`, `ContentCategory`, `FloatingCrawlerOverlay.kt`, `DeduplicationEngine`?**
  _High betweenness centrality (0.201) - this node is a cross-community bridge._
- **Why does `ChildProfile` connect `ChildProfile` to `KidsAccessibilityService`, `KidsAccessibilityService.kt`, `ChildrenGridDashboard.kt`, `OnboardingWizardScreen`?**
  _High betweenness centrality (0.106) - this node is a cross-community bridge._
- **Why does `OnboardingWizardScreen()` connect `OnboardingWizardScreen` to `ChildProfile`, `GoogleDriveClient`, `DriveSyncWorker.kt`, `OnboardingWizardScreen.kt`, `MainActivity.kt`?**
  _High betweenness centrality (0.086) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `KidsAccessibilityService` (e.g. with `ContentClassifier` and `DeduplicationEngine`) actually correct?**
  _`KidsAccessibilityService` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Are the 6 inferred relationships involving `GoogleDriveClient` (e.g. with `.preWarmOAuthAndFolders()` and `.provisionStep1()`) actually correct?**
  _`GoogleDriveClient` has 6 INFERRED edges - model-reasoned connections that need verification._
- **Are the 4 inferred relationships involving `ChildProfile` (e.g. with `.onCreate()` and `OnboardingWizardScreen()`) actually correct?**
  _`ChildProfile` has 4 INFERRED edges - model-reasoned connections that need verification._
- **What connects `CloudHealthReport`, `AttachmentEntity`, `NoticeEntity` to the rest of the system?**
  _36 weakly-connected nodes found - possible documentation gaps or missing edges._