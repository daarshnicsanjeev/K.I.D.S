# Graph Report - K.I.D.S  (2026-09-23)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 682 nodes · 1427 edges · 47 communities (29 shown, 18 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 30 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `efd3087a`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- KidsAccessibilityService
- NotificationParserTest.kt
- NoticeDao
- ChildProfile
- GoogleDriveClient
- GoogleDriveClient.kt
- MLKitOcrParser.kt
- ci_watch.py
- StreamManifest
- DriveSyncWorker.kt
- ChildrenGridDashboard.kt
- FloatingCrawlerOverlay
- .log
- OnboardingWizardScreen.kt
- FloatingCrawlerOverlay.kt
- KidsNotificationListenerService.kt
- OnboardingWizardScreen
- GestureDescription
- KidsAccessibilityService.kt
- MainActivity.kt
- DriveVaultManager.kt
- Type.kt
- Intent
- dispatchers
- ShareTargetActivity.kt
- .fallbackNativeScroll
- DeduplicationEngine
- WizardStep
- GestureResultCallback
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

## Communities (47 total, 18 thin omitted)

### Community 0 - "KidsAccessibilityService"
Cohesion: 0.11
Nodes (5): ExtractedAttachmentDetail, KidsAccessibilityService, AccessibilityNodeInfo, Context, UnvisitedCard

### Community 1 - "NotificationParserTest.kt"
Cohesion: 0.05
Nodes (21): PrivacyFilter, Bundle, StatusBarNotification, NotificationParser, ParsedNotification, ContentClassifierTest, DeduplicationHashTest, MultiChildAttributionTest (+13 more)

### Community 2 - "NoticeDao"
Cohesion: 0.06
Nodes (12): AttachmentDao, ChildProfileDao, AttachmentEntity, NoticeEntity, NoticeDao, KidsDatabase, Context, ChildProfileEntity (+4 more)

### Community 3 - "ChildProfile"
Cohesion: 0.07
Nodes (32): GraphEdge, GraphNode, KnowledgeGraph, KotlinGraphifyEngine, Attachment, ChannelType, FILE_IMPORT, GOOGLE_CLASSROOM (+24 more)

### Community 4 - "GoogleDriveClient"
Cohesion: 0.11
Nodes (12): DriveVaultManager, Failure, Context, Result, ProvisionStep1Result, Success, UserConsentRequired, ChannelVaultFolders (+4 more)

### Community 5 - "GoogleDriveClient.kt"
Cohesion: 0.06
Nodes (26): AI-Native Storage (JSONL & Markdown), DriveQuotaInfo, ImportedNoticeRecord, WhatsAppChatExportParser, WhatsAppChatExportParserTest, async, bytearraycontent, bytearrayoutputstream (+18 more)

### Community 6 - "MLKitOcrParser.kt"
Cohesion: 0.12
Nodes (19): Activity, Context, Result, SafVaultFolders, SafVaultManager, MLKitOcrParser, OcrExtractionResult, ShareTargetActivity (+11 more)

### Community 7 - "ci_watch.py"
Cohesion: 0.08
Nodes (27): AttachmentEntity, ChildProfileEntity, NoticeEntity, NoticeFtsEntity, Converters, ChannelConfig, encodetostring, entity (+19 more)

### Community 8 - "StreamManifest"
Cohesion: 0.09
Nodes (9): StreamItemStatus, ALREADY_SYNCED, COMPLETED, FAILED_SKIPPED, IN_PROGRESS, PENDING, StreamManifest, StreamManifestItem (+1 more)

### Community 9 - "DriveSyncWorker.kt"
Cohesion: 0.10
Nodes (18): add, DriveSyncWorker, AttachmentEntity, NoticeEntity, Result, DeviceInfo, DiagnosticSnapshot, DriveDeepLogger (+10 more)

### Community 10 - "ChildrenGridDashboard.kt"
Cohesion: 0.12
Nodes (24): alignment, ProbeItem, DiagnosticFeedScreen(), LogLine, background, border, circleshape, clickable (+16 more)

### Community 12 - ".log"
Cohesion: 0.16
Nodes (7): CrawlerTraceLogger, Context, concurrentlinkedqueue, date, filewriter, locale, printwriter

### Community 13 - "OnboardingWizardScreen.kt"
Cohesion: 0.12
Nodes (18): accountmanager, activityresultcontracts, getDefaultSchoolAppList(), Context, queryInstalledLauncherApps(), arrowback, backhandler, channelconfig (+10 more)

### Community 14 - "FloatingCrawlerOverlay.kt"
Cohesion: 0.12
Nodes (15): AccessibilityService, Button, gradientdrawable, gravity, handler, LinearLayout, looper, motionevent (+7 more)

### Community 15 - "KidsNotificationListenerService.kt"
Cohesion: 0.19
Nodes (8): ContentClassifier, MultiChildRouter, KidsNotificationListenerService, StatusBarNotification, firstornull, NoticeEntity, NotificationListenerService, supervisorjob

### Community 16 - "OnboardingWizardScreen"
Cohesion: 0.37
Nodes (4): Context, PermissionHelper, PermissionSetupDialog(), OnboardingWizardScreen()

### Community 17 - "GestureDescription"
Cohesion: 0.21
Nodes (5): GestureResultCallback, GestureResultCallback, GestureResultCallback, GestureDescription, GestureResultCallback

### Community 18 - "KidsAccessibilityService.kt"
Cohesion: 0.17
Nodes (11): AccessibilityEvent, accessibilitymanager, accessibilityserviceinfo, AttachmentEntity, childprofile, delay, isactive, Job (+3 more)

### Community 19 - "MainActivity.kt"
Cohesion: 0.17
Nodes (10): AppScreen, DASHBOARD, DIAGNOSTICS, WIZARD, lifecyclescope, notificationmanagercompat, remembersaveable, setcontent (+2 more)

### Community 20 - "DriveVaultManager.kt"
Cohesion: 0.20
Nodes (9): CompletableDeferred, coroutinescope, googleaccountcredential, gsonfactory, launch, nethttptransport, userrecoverableauthexception, userrecoverableauthioexception (+1 more)

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

### Community 26 - "DeduplicationEngine"
Cohesion: 0.33
Nodes (4): DownloadFolderObserver, DeduplicationEngine, java, ByteArray

### Community 27 - "WizardStep"
Cohesion: 0.33
Nodes (6): WizardStep, STEP_0_PERMISSIONS, STEP_1_VAULT, STEP_2_CLASSROOM, STEP_3_PORTALS, STEP_4_WHATSAPP

### Community 28 - "GestureResultCallback"
Cohesion: 0.50
Nodes (3): GestureResultCallback, GestureDescription, GestureResultCallback

### Community 29 - "log"
Cohesion: 0.67
Nodes (3): KidsApplication, Application, log

### Community 30 - "gradlew"
Cohesion: 0.83
Nodes (3): gradlew script, die(), warn()

## Knowledge Gaps
- **36 isolated node(s):** `CloudHealthReport`, `AttachmentEntity`, `NoticeEntity`, `NoticeFtsEntity`, `DeviceInfo` (+31 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 206 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **18 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `KidsAccessibilityService` connect `KidsAccessibilityService` to `FloatingCrawlerOverlay`, `OnboardingWizardScreen.kt`, `FloatingCrawlerOverlay.kt`, `KidsNotificationListenerService.kt`, `KidsAccessibilityService.kt`, `DeduplicationEngine`?**
  _High betweenness centrality (0.194) - this node is a cross-community bridge._
- **Why does `ChildProfile` connect `ChildProfile` to `KidsAccessibilityService`, `NotificationParserTest.kt`, `ChildrenGridDashboard.kt`, `KidsNotificationListenerService.kt`, `OnboardingWizardScreen`?**
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