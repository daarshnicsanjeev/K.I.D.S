# Graph Report - K.I.D.S  (2026-09-24)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 723 nodes · 1566 edges · 53 communities (33 shown, 20 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 30 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `d54fd942`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- KidsAccessibilityService
- .log
- NoticeDao
- GoogleDriveClient
- MLKitOcrParser.kt
- StreamManifest
- GoogleDriveClient.kt
- ChildrenGridDashboard.kt
- OnboardingWizardScreen.kt
- KotlinGraphifyEngine.kt
- ShareTargetActivity.kt
- DriveVaultManager.kt
- ContentCategory
- FloatingCrawlerOverlay.kt
- ci_watch.py
- DriveSyncWorker.kt
- NotificationParserTest.kt
- OnboardingWizardScreen
- assertthat
- Entities.kt
- DriveDeepLogger.kt
- Models.kt
- KidsAccessibilityService.kt
- Intent
- PrivacyFilterTest
- MainActivity.kt
- dispatchers
- ChildProfile
- Type.kt
- GestureDescription
- DeduplicationEngine
- WizardStep
- .onNotificationPosted
- DeduplicationHashTest
- DriveVaultManagerTest.kt
- gradlew
- AccessibilityNodeInfo
- java
- Bundle
- ChildVaultFolders
- FloatingCrawlerOverlay
- GestureDescription
- GestureResultCallback
- provisionstep1result
- Result
- role
- statusbarnotification
- streamitemstatus
- StreamManifest
- StreamManifestItem

## God Nodes (most connected - your core abstractions)
1. `KidsAccessibilityService` - 80 edges
2. `FloatingCrawlerOverlay` - 42 edges
3. `GoogleDriveClient` - 26 edges
4. `ChildProfile` - 21 edges
5. `OnboardingWizardScreen()` - 21 edges
6. `StreamManifest` - 20 edges
7. `DriveVaultManager` - 19 edges
8. `CrawlerTraceLogger` - 18 edges
9. `NoticeDao` - 16 edges
10. `StreamManifestAndCardTest` - 16 edges

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

## Communities (53 total, 20 thin omitted)

### Community 0 - "KidsAccessibilityService"
Cohesion: 0.09
Nodes (5): ExtractedAttachmentDetail, KidsAccessibilityService, AccessibilityNodeInfo, UnvisitedCard, VisiblePendingCard

### Community 1 - ".log"
Cohesion: 0.06
Nodes (14): KidsApplication, CrawlerTraceLogger, Context, FloatingCrawlerOverlay, GestureResultCallback, GestureResultCallback, GestureResultCallback, GestureResultCallback (+6 more)

### Community 2 - "NoticeDao"
Cohesion: 0.06
Nodes (12): AttachmentDao, ChildProfileDao, AttachmentEntity, NoticeEntity, NoticeDao, KidsDatabase, Context, ChildProfileEntity (+4 more)

### Community 3 - "GoogleDriveClient"
Cohesion: 0.11
Nodes (13): DriveVaultManager, Failure, Context, Result, ProvisionStep1Result, Success, UserConsentRequired, ChannelVaultFolders (+5 more)

### Community 4 - "MLKitOcrParser.kt"
Cohesion: 0.10
Nodes (21): android, Context, Result, SafVaultFolders, SafVaultManager, MLKitOcrParser, OcrExtractionResult, ShareTargetActivity (+13 more)

### Community 5 - "StreamManifest"
Cohesion: 0.08
Nodes (9): StreamItemStatus, ALREADY_SYNCED, COMPLETED, FAILED_SKIPPED, IN_PROGRESS, PENDING, StreamManifest, StreamManifestItem (+1 more)

### Community 6 - "GoogleDriveClient.kt"
Cohesion: 0.06
Nodes (26): AI-Native Storage (JSONL & Markdown), DriveQuotaInfo, ImportedNoticeRecord, WhatsAppChatExportParser, WhatsAppChatExportParserTest, async, bytearraycontent, bytearrayoutputstream (+18 more)

### Community 7 - "ChildrenGridDashboard.kt"
Cohesion: 0.11
Nodes (25): alignment, ProbeItem, DiagnosticFeedScreen(), LogLine, background, border, circleshape, clickable (+17 more)

### Community 8 - "OnboardingWizardScreen.kt"
Cohesion: 0.12
Nodes (18): accountmanager, activityresultcontracts, getDefaultSchoolAppList(), Context, queryInstalledLauncherApps(), arrowback, backhandler, channelconfig (+10 more)

### Community 9 - "KotlinGraphifyEngine.kt"
Cohesion: 0.22
Nodes (7): GraphEdge, GraphNode, KnowledgeGraph, KotlinGraphifyEngine, Attachment, Notice, KnowledgeGraphBuilderTest

### Community 10 - "ShareTargetActivity.kt"
Cohesion: 0.15
Nodes (15): Activity, KidsNotificationListenerService, cancel, constraints, existingworkpolicy, fileoutputstream, firstornull, networktype (+7 more)

### Community 11 - "DriveVaultManager.kt"
Cohesion: 0.14
Nodes (14): CompletableDeferred, concurrentlinkedqueue, coroutinescope, date, filewriter, googleaccountcredential, gsonfactory, locale (+6 more)

### Community 12 - "ContentCategory"
Cohesion: 0.15
Nodes (8): ContentClassifier, ContentCategory, ATTENDANCE, CIRCULAR, FEES, HOMEWORK, UNKNOWN, ContentClassifierTest

### Community 13 - "FloatingCrawlerOverlay.kt"
Cohesion: 0.13
Nodes (14): AccessibilityService, Button, gradientdrawable, gravity, handler, LinearLayout, looper, motionevent (+6 more)

### Community 14 - "ci_watch.py"
Cohesion: 0.21
Nodes (14): os, re, diagnose_failure(), get_latest_run(), main(), monitor_workflow(), CI/CD Pipeline Monitor, Release Verifier & Graphify Guardian for K.I.D.S.…, Runs local Graphify AST extraction and community clustering. (+6 more)

### Community 15 - "DriveSyncWorker.kt"
Cohesion: 0.19
Nodes (11): add, DriveSyncWorker, AttachmentEntity, NoticeEntity, buildjsonarray, buildjsonobject, CoroutineWorker, put (+3 more)

### Community 16 - "NotificationParserTest.kt"
Cohesion: 0.20
Nodes (9): Bundle, StatusBarNotification, NotificationParser, ParsedNotification, NotificationParserTest, build, Bundle, every (+1 more)

### Community 17 - "OnboardingWizardScreen"
Cohesion: 0.37
Nodes (4): Context, PermissionHelper, PermissionSetupDialog(), OnboardingWizardScreen()

### Community 18 - "assertthat"
Cohesion: 0.23
Nodes (5): MultiChildAttributionTest, assertthat, beforeeach, bytearrayinputstream, test

### Community 19 - "Entities.kt"
Cohesion: 0.17
Nodes (10): AttachmentEntity, ChildProfileEntity, NoticeEntity, NoticeFtsEntity, Converters, ChannelConfig, entity, fts4 (+2 more)

### Community 20 - "DriveDeepLogger.kt"
Cohesion: 0.19
Nodes (8): DeviceInfo, DiagnosticSnapshot, DriveDeepLogger, PipelineMetrics, StepStatus, encodetostring, json, typeconverter

### Community 21 - "Models.kt"
Cohesion: 0.15
Nodes (12): ChannelType, FILE_IMPORT, GOOGLE_CLASSROOM, SCHOOL_ERP, WHATSAPP, CloudHealthReport, SyncStatus, DROPPED (+4 more)

### Community 22 - "KidsAccessibilityService.kt"
Cohesion: 0.18
Nodes (10): AccessibilityEvent, accessibilitymanager, accessibilityserviceinfo, AttachmentEntity, delay, intentfilter, isactive, Job (+2 more)

### Community 23 - "Intent"
Cohesion: 0.24
Nodes (8): androidx, launchAccountPicker(), BootReceiver, Context, BroadcastReceiver, Intent, notificationmanagercompat, settings

### Community 25 - "MainActivity.kt"
Cohesion: 0.18
Nodes (10): AppScreen, DASHBOARD, DIAGNOSTICS, WIZARD, childprofile, launch, lifecyclescope, remembersaveable (+2 more)

### Community 26 - "dispatchers"
Cohesion: 0.22
Nodes (8): DownloadFolderObserver, Context, MainActivity, ComponentActivity, dispatchers, environment, file, KidsDatabase

### Community 27 - "ChildProfile"
Cohesion: 0.28
Nodes (7): ChildProfile, ChildCard(), ChildrenGridDashboard(), KidsTheme(), composable, lightcolorscheme, materialtheme

### Community 28 - "Type.kt"
Cohesion: 0.25
Nodes (7): font, fontfamily, googlefont, r, sp, textstyle, typography

### Community 29 - "GestureDescription"
Cohesion: 0.36
Nodes (4): GestureResultCallback, GestureResultCallback, GestureDescription, GestureResultCallback

### Community 30 - "DeduplicationEngine"
Cohesion: 0.40
Nodes (3): DeduplicationEngine, java, ByteArray

### Community 31 - "WizardStep"
Cohesion: 0.33
Nodes (6): WizardStep, STEP_0_PERMISSIONS, STEP_1_VAULT, STEP_2_CLASSROOM, STEP_3_PORTALS, STEP_4_WHATSAPP

### Community 34 - "DriveVaultManagerTest.kt"
Cohesion: 0.50
Nodes (3): Context, mockk, runblocking

### Community 35 - "gradlew"
Cohesion: 0.83
Nodes (3): gradlew script, die(), warn()

## Knowledge Gaps
- **36 isolated node(s):** `AttachmentEntity`, `NoticeFtsEntity`, `NoticeEntity`, `DeviceInfo`, `PipelineMetrics` (+31 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 213 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **20 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `KidsAccessibilityService` connect `KidsAccessibilityService` to `.log`, `MLKitOcrParser.kt`, `OnboardingWizardScreen.kt`, `ContentCategory`, `FloatingCrawlerOverlay.kt`, `KidsAccessibilityService.kt`, `DeduplicationEngine`?**
  _High betweenness centrality (0.221) - this node is a cross-community bridge._
- **Why does `ChildProfile` connect `ChildProfile` to `.onNotificationPosted`, `KidsAccessibilityService`, `ChildrenGridDashboard.kt`, `KotlinGraphifyEngine.kt`, `ShareTargetActivity.kt`, `OnboardingWizardScreen`, `assertthat`, `Models.kt`?**
  _High betweenness centrality (0.098) - this node is a cross-community bridge._
- **Why does `FloatingCrawlerOverlay` connect `.log` to `KidsAccessibilityService`, `FloatingCrawlerOverlay.kt`?**
  _High betweenness centrality (0.083) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `KidsAccessibilityService` (e.g. with `ContentClassifier` and `DeduplicationEngine`) actually correct?**
  _`KidsAccessibilityService` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Are the 6 inferred relationships involving `GoogleDriveClient` (e.g. with `.preWarmOAuthAndFolders()` and `.provisionStep1()`) actually correct?**
  _`GoogleDriveClient` has 6 INFERRED edges - model-reasoned connections that need verification._
- **Are the 4 inferred relationships involving `ChildProfile` (e.g. with `.onCreate()` and `OnboardingWizardScreen()`) actually correct?**
  _`ChildProfile` has 4 INFERRED edges - model-reasoned connections that need verification._
- **What connects `AttachmentEntity`, `NoticeFtsEntity`, `NoticeEntity` to the rest of the system?**
  _36 weakly-connected nodes found - possible documentation gaps or missing edges._