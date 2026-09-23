# Graph Report - K.I.D.S  (2026-09-23)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 697 nodes · 1475 edges · 45 communities (29 shown, 16 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 30 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `9973274e`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- .log
- KidsAccessibilityService
- GoogleDriveClient
- NoticeDao
- ChildProfile
- assertthat
- StreamManifest
- ci_watch.py
- MLKitOcrParser.kt
- DriveSyncWorker.kt
- K.I.D.S. Android Collector (PRD)
- OnboardingWizardScreen.kt
- ChildrenGridDashboard.kt
- SafVaultManager.kt
- KidsAccessibilityService.kt
- KidsNotificationListenerService.kt
- OnboardingWizardScreen
- DeduplicationEngine
- PermissionHelper.kt
- MainActivity.kt
- dispatchers
- GoogleDriveClient.kt
- DriveVaultManager.kt
- PermissionSetupDialog.kt
- Type.kt
- GestureDescription
- WizardStep
- log
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

### Community 4 - "ChildProfile"
Cohesion: 0.07
Nodes (32): GraphEdge, GraphNode, KnowledgeGraph, KotlinGraphifyEngine, Attachment, ChannelType, FILE_IMPORT, GOOGLE_CLASSROOM (+24 more)

### Community 5 - "assertthat"
Cohesion: 0.07
Nodes (9): PrivacyFilter, ContentClassifierTest, DeduplicationHashTest, MultiChildAttributionTest, PrivacyFilterTest, assertthat, beforeeach, bytearrayinputstream (+1 more)

### Community 6 - "StreamManifest"
Cohesion: 0.08
Nodes (9): StreamItemStatus, ALREADY_SYNCED, COMPLETED, FAILED_SKIPPED, IN_PROGRESS, PENDING, StreamManifest, StreamManifestItem (+1 more)

### Community 7 - "ci_watch.py"
Cohesion: 0.08
Nodes (27): AttachmentEntity, ChildProfileEntity, NoticeEntity, NoticeFtsEntity, Converters, ChannelConfig, encodetostring, entity (+19 more)

### Community 8 - "MLKitOcrParser.kt"
Cohesion: 0.09
Nodes (20): MLKitOcrParser, OcrExtractionResult, Bundle, StatusBarNotification, NotificationParser, ParsedNotification, NotificationParserTest, Bitmap (+12 more)

### Community 9 - "DriveSyncWorker.kt"
Cohesion: 0.10
Nodes (18): add, DriveSyncWorker, AttachmentEntity, NoticeEntity, Result, DeviceInfo, DiagnosticSnapshot, DriveDeepLogger (+10 more)

### Community 10 - "K.I.D.S. Android Collector (PRD)"
Cohesion: 0.09
Nodes (16): AI-Native Storage (JSONL & Markdown), ImportedNoticeRecord, WhatsAppChatExportParser, WhatsAppChatExportParserTest, Dual WhatsApp Catch-Up Engine, 5-Point Cloud Health Probe, Google Credential Manager API, inputstream (+8 more)

### Community 11 - "OnboardingWizardScreen.kt"
Cohesion: 0.12
Nodes (18): accountmanager, activityresultcontracts, getDefaultSchoolAppList(), Context, queryInstalledLauncherApps(), arrowback, backhandler, channelconfig (+10 more)

### Community 12 - "ChildrenGridDashboard.kt"
Cohesion: 0.16
Nodes (17): alignment, ProbeItem, DiagnosticFeedScreen(), LogLine, background, circleshape, clickable, clip (+9 more)

### Community 13 - "SafVaultManager.kt"
Cohesion: 0.24
Nodes (11): Context, Result, SafVaultFolders, SafVaultManager, concurrentlinkedqueue, date, DocumentFile, filewriter (+3 more)

### Community 14 - "KidsAccessibilityService.kt"
Cohesion: 0.14
Nodes (15): AccessibilityEvent, accessibilitymanager, accessibilityserviceinfo, AttachmentEntity, constraints, delay, existingworkpolicy, fileoutputstream (+7 more)

### Community 15 - "KidsNotificationListenerService.kt"
Cohesion: 0.16
Nodes (10): ContentClassifier, MultiChildRouter, KidsNotificationListenerService, StatusBarNotification, firstornull, networktype, NoticeEntity, NotificationListenerService (+2 more)

### Community 16 - "OnboardingWizardScreen"
Cohesion: 0.30
Nodes (5): Context, PermissionHelper, PermissionSetupDialog(), OnboardingWizardScreen(), Context

### Community 17 - "DeduplicationEngine"
Cohesion: 0.24
Nodes (5): Activity, DeduplicationEngine, java, ShareTargetActivity, ByteArray

### Community 18 - "PermissionHelper.kt"
Cohesion: 0.24
Nodes (8): androidx, launchAccountPicker(), BootReceiver, Context, BroadcastReceiver, Intent, notificationmanagercompat, settings

### Community 19 - "MainActivity.kt"
Cohesion: 0.18
Nodes (10): AppScreen, DASHBOARD, DIAGNOSTICS, WIZARD, childprofile, launch, lifecyclescope, remembersaveable (+2 more)

### Community 20 - "dispatchers"
Cohesion: 0.22
Nodes (8): DownloadFolderObserver, Context, MainActivity, ComponentActivity, dispatchers, environment, KidsDatabase, withcontext

### Community 21 - "GoogleDriveClient.kt"
Cohesion: 0.20
Nodes (9): async, bytearraycontent, bytearrayoutputstream, concurrenthashmap, Drive, filecontent, mutex, standardcharsets (+1 more)

### Community 22 - "DriveVaultManager.kt"
Cohesion: 0.22
Nodes (8): CompletableDeferred, coroutinescope, googleaccountcredential, gsonfactory, nethttptransport, userrecoverableauthexception, userrecoverableauthioexception, withtimeoutornull

### Community 23 - "PermissionSetupDialog.kt"
Cohesion: 0.22
Nodes (7): border, dialog, lifecycle, lifecycleeventobserver, locallifecycleowner, modifier, roundedcornershape

### Community 24 - "Type.kt"
Cohesion: 0.22
Nodes (8): font, fontfamily, fontweight, googlefont, r, sp, textstyle, typography

### Community 25 - "GestureDescription"
Cohesion: 0.36
Nodes (4): GestureResultCallback, GestureResultCallback, GestureDescription, GestureResultCallback

### Community 26 - "WizardStep"
Cohesion: 0.33
Nodes (6): WizardStep, STEP_0_PERMISSIONS, STEP_1_VAULT, STEP_2_CLASSROOM, STEP_3_PORTALS, STEP_4_WHATSAPP

### Community 27 - "log"
Cohesion: 0.67
Nodes (3): KidsApplication, Application, log

### Community 28 - "gradlew"
Cohesion: 0.83
Nodes (3): gradlew script, die(), warn()

## Knowledge Gaps
- **36 isolated node(s):** `CloudHealthReport`, `AttachmentEntity`, `NoticeEntity`, `NoticeFtsEntity`, `DeviceInfo` (+31 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 208 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **16 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `KidsAccessibilityService` connect `KidsAccessibilityService` to `.log`, `OnboardingWizardScreen.kt`, `KidsAccessibilityService.kt`, `KidsNotificationListenerService.kt`, `OnboardingWizardScreen`, `DeduplicationEngine`?**
  _High betweenness centrality (0.209) - this node is a cross-community bridge._
- **Why does `ChildProfile` connect `ChildProfile` to `KidsAccessibilityService`, `assertthat`, `ChildrenGridDashboard.kt`, `KidsNotificationListenerService.kt`, `OnboardingWizardScreen`?**
  _High betweenness centrality (0.100) - this node is a cross-community bridge._
- **Why does `KidsDatabase` connect `NoticeDao` to `KidsAccessibilityService`?**
  _High betweenness centrality (0.083) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `KidsAccessibilityService` (e.g. with `ContentClassifier` and `DeduplicationEngine`) actually correct?**
  _`KidsAccessibilityService` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Are the 6 inferred relationships involving `GoogleDriveClient` (e.g. with `.preWarmOAuthAndFolders()` and `.provisionStep1()`) actually correct?**
  _`GoogleDriveClient` has 6 INFERRED edges - model-reasoned connections that need verification._
- **Are the 4 inferred relationships involving `ChildProfile` (e.g. with `.onCreate()` and `OnboardingWizardScreen()`) actually correct?**
  _`ChildProfile` has 4 INFERRED edges - model-reasoned connections that need verification._
- **What connects `CloudHealthReport`, `AttachmentEntity`, `NoticeEntity` to the rest of the system?**
  _36 weakly-connected nodes found - possible documentation gaps or missing edges._