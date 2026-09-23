# Graph Report - K.I.D.S  (2026-09-23)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 686 nodes · 1436 edges · 57 communities (33 shown, 24 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 30 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `bea6514b`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- KidsAccessibilityService
- NoticeDao
- GoogleDriveClient
- ChildProfile
- StreamManifest
- ci_watch.py
- MLKitOcrParser.kt
- DriveSyncWorker.kt
- FloatingCrawlerOverlay
- .log
- OnboardingWizardScreen.kt
- ChildrenGridDashboard.kt
- KidsAccessibilityService.kt
- FloatingCrawlerOverlay.kt
- GestureDescription
- NotificationParserTest.kt
- OnboardingWizardScreen
- KidsNotificationListenerService.kt
- GoogleDriveClient.kt
- PermissionHelper.kt
- PrivacyFilterTest
- MainActivity.kt
- dispatchers
- WhatsAppChatExportParser.kt
- assertthat
- K.I.D.S. Android Collector (PRD)
- DriveVaultManager.kt
- ContentCategory
- PermissionSetupDialog.kt
- Type.kt
- .findPrimaryScrollableNode
- DeduplicationEngine
- WizardStep
- ContentClassifierTest
- ShareTargetActivity
- GestureResultCallback
- MultiChildAttributionTest
- log
- DeduplicationHashTest
- WhatsAppChatExportParserTest
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
1. `KidsAccessibilityService` - 61 edges
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

## Communities (57 total, 24 thin omitted)

### Community 0 - "KidsAccessibilityService"
Cohesion: 0.11
Nodes (5): ExtractedAttachmentDetail, KidsAccessibilityService, AccessibilityNodeInfo, Context, UnvisitedCard

### Community 1 - "NoticeDao"
Cohesion: 0.06
Nodes (12): AttachmentDao, ChildProfileDao, AttachmentEntity, NoticeEntity, NoticeDao, KidsDatabase, Context, ChildProfileEntity (+4 more)

### Community 2 - "GoogleDriveClient"
Cohesion: 0.10
Nodes (15): DriveVaultManager, Failure, Context, Result, ProvisionStep1Result, Success, UserConsentRequired, ChannelVaultFolders (+7 more)

### Community 3 - "ChildProfile"
Cohesion: 0.09
Nodes (26): GraphEdge, GraphNode, KnowledgeGraph, KotlinGraphifyEngine, Attachment, ChannelType, FILE_IMPORT, GOOGLE_CLASSROOM (+18 more)

### Community 4 - "StreamManifest"
Cohesion: 0.08
Nodes (9): StreamItemStatus, ALREADY_SYNCED, COMPLETED, FAILED_SKIPPED, IN_PROGRESS, PENDING, StreamManifest, StreamManifestItem (+1 more)

### Community 5 - "ci_watch.py"
Cohesion: 0.08
Nodes (27): AttachmentEntity, ChildProfileEntity, NoticeEntity, NoticeFtsEntity, Converters, ChannelConfig, encodetostring, entity (+19 more)

### Community 6 - "MLKitOcrParser.kt"
Cohesion: 0.14
Nodes (17): Context, Result, SafVaultFolders, SafVaultManager, MLKitOcrParser, OcrExtractionResult, Bitmap, DocumentFile (+9 more)

### Community 7 - "DriveSyncWorker.kt"
Cohesion: 0.10
Nodes (18): add, DriveSyncWorker, AttachmentEntity, NoticeEntity, Result, DeviceInfo, DiagnosticSnapshot, DriveDeepLogger (+10 more)

### Community 9 - ".log"
Cohesion: 0.16
Nodes (7): CrawlerTraceLogger, Context, concurrentlinkedqueue, date, filewriter, locale, printwriter

### Community 10 - "OnboardingWizardScreen.kt"
Cohesion: 0.12
Nodes (18): accountmanager, activityresultcontracts, getDefaultSchoolAppList(), Context, queryInstalledLauncherApps(), arrowback, backhandler, channelconfig (+10 more)

### Community 11 - "ChildrenGridDashboard.kt"
Cohesion: 0.16
Nodes (17): alignment, ProbeItem, DiagnosticFeedScreen(), LogLine, background, circleshape, clickable, clip (+9 more)

### Community 12 - "KidsAccessibilityService.kt"
Cohesion: 0.14
Nodes (15): AccessibilityEvent, accessibilitymanager, accessibilityserviceinfo, AttachmentEntity, delay, existingworkpolicy, fileoutputstream, isactive (+7 more)

### Community 13 - "FloatingCrawlerOverlay.kt"
Cohesion: 0.12
Nodes (15): AccessibilityService, Button, gradientdrawable, gravity, handler, LinearLayout, looper, motionevent (+7 more)

### Community 14 - "GestureDescription"
Cohesion: 0.19
Nodes (5): GestureResultCallback, GestureResultCallback, GestureResultCallback, GestureDescription, GestureResultCallback

### Community 15 - "NotificationParserTest.kt"
Cohesion: 0.20
Nodes (9): Bundle, StatusBarNotification, NotificationParser, ParsedNotification, NotificationParserTest, build, Bundle, every (+1 more)

### Community 16 - "OnboardingWizardScreen"
Cohesion: 0.37
Nodes (4): Context, PermissionHelper, PermissionSetupDialog(), OnboardingWizardScreen()

### Community 17 - "KidsNotificationListenerService.kt"
Cohesion: 0.19
Nodes (9): MultiChildRouter, KidsNotificationListenerService, StatusBarNotification, constraints, firstornull, NoticeEntity, NotificationListenerService, supervisorjob (+1 more)

### Community 18 - "GoogleDriveClient.kt"
Cohesion: 0.17
Nodes (10): DriveQuotaInfo, async, bytearraycontent, bytearrayoutputstream, concurrenthashmap, Drive, filecontent, mutex (+2 more)

### Community 19 - "PermissionHelper.kt"
Cohesion: 0.24
Nodes (8): androidx, launchAccountPicker(), BootReceiver, Context, BroadcastReceiver, Intent, notificationmanagercompat, settings

### Community 21 - "MainActivity.kt"
Cohesion: 0.18
Nodes (10): AppScreen, DASHBOARD, DIAGNOSTICS, WIZARD, childprofile, launch, lifecyclescope, remembersaveable (+2 more)

### Community 22 - "dispatchers"
Cohesion: 0.22
Nodes (8): DownloadFolderObserver, Context, MainActivity, ComponentActivity, dispatchers, environment, KidsDatabase, withcontext

### Community 23 - "WhatsAppChatExportParser.kt"
Cohesion: 0.24
Nodes (6): ImportedNoticeRecord, WhatsAppChatExportParser, Dual WhatsApp Catch-Up Engine, inputstream, pattern, simpledateformat

### Community 24 - "assertthat"
Cohesion: 0.42
Nodes (4): assertthat, beforeeach, bytearrayinputstream, test

### Community 25 - "K.I.D.S. Android Collector (PRD)"
Cohesion: 0.22
Nodes (9): AI-Native Storage (JSONL & Markdown), 5-Point Cloud Health Probe, Google Credential Manager API, Memory Boundary Privacy Filter, K.I.D.S. Android Collector (PRD), Restricted Drive Scope (drive.file), Sequential 4-Step Onboarding, Streaming PdfRenderer OCR (+1 more)

### Community 26 - "DriveVaultManager.kt"
Cohesion: 0.22
Nodes (8): CompletableDeferred, coroutinescope, googleaccountcredential, gsonfactory, nethttptransport, userrecoverableauthexception, userrecoverableauthioexception, withtimeoutornull

### Community 27 - "ContentCategory"
Cohesion: 0.25
Nodes (7): ContentClassifier, ContentCategory, ATTENDANCE, CIRCULAR, FEES, HOMEWORK, UNKNOWN

### Community 28 - "PermissionSetupDialog.kt"
Cohesion: 0.22
Nodes (7): border, dialog, lifecycle, lifecycleeventobserver, localcontext, locallifecycleowner, roundedcornershape

### Community 29 - "Type.kt"
Cohesion: 0.22
Nodes (8): font, fontfamily, fontweight, googlefont, r, sp, textstyle, typography

### Community 31 - "DeduplicationEngine"
Cohesion: 0.40
Nodes (3): DeduplicationEngine, java, ByteArray

### Community 32 - "WizardStep"
Cohesion: 0.33
Nodes (6): WizardStep, STEP_0_PERMISSIONS, STEP_1_VAULT, STEP_2_CLASSROOM, STEP_3_PORTALS, STEP_4_WHATSAPP

### Community 35 - "GestureResultCallback"
Cohesion: 0.50
Nodes (3): GestureResultCallback, GestureDescription, GestureResultCallback

### Community 37 - "log"
Cohesion: 0.67
Nodes (3): KidsApplication, Application, log

### Community 40 - "gradlew"
Cohesion: 0.83
Nodes (3): gradlew script, die(), warn()

## Knowledge Gaps
- **36 isolated node(s):** `CloudHealthReport`, `AttachmentEntity`, `NoticeFtsEntity`, `NoticeEntity`, `DeviceInfo` (+31 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 209 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **24 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `KidsAccessibilityService` connect `KidsAccessibilityService` to `FloatingCrawlerOverlay`, `OnboardingWizardScreen.kt`, `KidsAccessibilityService.kt`, `FloatingCrawlerOverlay.kt`, `ContentCategory`, `DeduplicationEngine`?**
  _High betweenness centrality (0.195) - this node is a cross-community bridge._
- **Why does `ChildProfile` connect `ChildProfile` to `KidsAccessibilityService`, `MultiChildAttributionTest`, `ChildrenGridDashboard.kt`, `OnboardingWizardScreen`, `KidsNotificationListenerService.kt`, `assertthat`?**
  _High betweenness centrality (0.102) - this node is a cross-community bridge._
- **Why does `KidsDatabase` connect `NoticeDao` to `KidsAccessibilityService`?**
  _High betweenness centrality (0.084) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `KidsAccessibilityService` (e.g. with `ContentClassifier` and `DeduplicationEngine`) actually correct?**
  _`KidsAccessibilityService` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Are the 6 inferred relationships involving `GoogleDriveClient` (e.g. with `.preWarmOAuthAndFolders()` and `.provisionStep1()`) actually correct?**
  _`GoogleDriveClient` has 6 INFERRED edges - model-reasoned connections that need verification._
- **Are the 4 inferred relationships involving `ChildProfile` (e.g. with `.onCreate()` and `OnboardingWizardScreen()`) actually correct?**
  _`ChildProfile` has 4 INFERRED edges - model-reasoned connections that need verification._
- **What connects `CloudHealthReport`, `AttachmentEntity`, `NoticeFtsEntity` to the rest of the system?**
  _36 weakly-connected nodes found - possible documentation gaps or missing edges._