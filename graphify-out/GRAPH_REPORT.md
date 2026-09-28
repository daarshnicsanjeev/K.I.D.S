# Graph Report - K.I.D.S  (2026-09-28)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 815 nodes · 1849 edges · 53 communities (34 shown, 19 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 33 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `6edbb62c`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- KidsAccessibilityService
- GoogleDriveClient
- Query
- KotlinGraphifyEngine.kt
- ContentCategory
- StreamManifest
- MLKitOcrParser.kt
- ChildrenGridDashboard.kt
- FloatingCrawlerOverlay
- OnboardingWizardScreen.kt
- SafVaultManager.kt
- GestureDescription
- .log
- GoogleDriveSharedHarvester
- KidsAccessibilityService.kt
- DriveSyncWorker.kt
- FloatingCrawlerOverlay.kt
- .matchesAttachmentChipText
- OnboardingWizardScreen
- ci_watch.py
- assertthat
- Test
- MainActivity.kt
- PrivacyFilterTest
- KidsNotificationListenerService.kt
- GestureDescription
- Entities.kt
- DeduplicationEngine
- DriveVaultManager.kt
- CrawlerTraceLogger.kt
- ChildProfile
- Type.kt
- ShareTargetActivity.kt
- .fallbackNativeScroll
- log
- WizardStep
- DriveSyncWorker
- gradlew
- AccessibilityNodeInfo
- java
- Bundle
- Result
- GestureDescription
- GestureResultCallback
- ChildVaultFolders
- FloatingCrawlerOverlay
- Rect
- role
- statusbarnotification
- Volatile

## God Nodes (most connected - your core abstractions)
1. `KidsAccessibilityService` - 97 edges
2. `FloatingCrawlerOverlay` - 42 edges
3. `GoogleDriveClient` - 29 edges
4. `GoogleDriveSharedHarvester` - 24 edges
5. `OnboardingWizardScreen()` - 23 edges
6. `ChildProfile` - 21 edges
7. `DriveVaultManager` - 18 edges
8. `NoticeDao` - 18 edges
9. `AttachmentDao` - 17 edges
10. `StreamManifest` - 17 edges

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

## Communities (53 total, 19 thin omitted)

### Community 0 - "KidsAccessibilityService"
Cohesion: 0.08
Nodes (9): ExtractedAttachmentDetail, KidsAccessibilityService, AccessibilityNodeInfo, FloatingCrawlerOverlay, Volatile, UnvisitedCard, VisiblePendingCard, StreamManifest (+1 more)

### Community 1 - "GoogleDriveClient"
Cohesion: 0.08
Nodes (22): DriveVaultManager, Failure, Context, Result, ProvisionStep1Result, Success, UserConsentRequired, ChannelVaultFolders (+14 more)

### Community 2 - "Query"
Cohesion: 0.07
Nodes (17): AttachmentDao, ChildProfileDao, AttachmentEntity, NoticeEntity, NoticeDao, KidsDatabase, Context, ChildProfileEntity (+9 more)

### Community 3 - "KotlinGraphifyEngine.kt"
Cohesion: 0.07
Nodes (29): Converters, GraphEdge, GraphNode, KnowledgeGraph, KotlinGraphifyEngine, Attachment, ChannelConfig, ChannelType (+21 more)

### Community 4 - "ContentCategory"
Cohesion: 0.06
Nodes (25): AI-Native Storage (JSONL & Markdown), ContentClassifier, ImportedNoticeRecord, WhatsAppChatExportParser, ContentCategory, ATTENDANCE, CIRCULAR, FEES (+17 more)

### Community 5 - "StreamManifest"
Cohesion: 0.08
Nodes (9): StreamItemStatus, ALREADY_SYNCED, COMPLETED, FAILED_SKIPPED, IN_PROGRESS, PENDING, StreamManifest, StreamManifestItem (+1 more)

### Community 6 - "MLKitOcrParser.kt"
Cohesion: 0.08
Nodes (23): MLKitOcrParser, OcrExtractionResult, Bundle, StatusBarNotification, NotificationParser, ParsedNotification, NotificationParserTest, Bitmap (+15 more)

### Community 7 - "ChildrenGridDashboard.kt"
Cohesion: 0.12
Nodes (24): alignment, ProbeItem, DiagnosticFeedScreen(), LogLine, background, border, circleshape, clickable (+16 more)

### Community 9 - "OnboardingWizardScreen.kt"
Cohesion: 0.09
Nodes (23): accountmanager, activityresultcontracts, androidx, getDefaultSchoolAppList(), Context, launchAccountPicker(), queryInstalledLauncherApps(), arrowback (+15 more)

### Community 10 - "SafVaultManager.kt"
Cohesion: 0.18
Nodes (10): Activity, android, Context, Result, SafVaultFolders, SafVaultManager, ShareTargetActivity, Context (+2 more)

### Community 11 - "GestureDescription"
Cohesion: 0.13
Nodes (8): GestureResultCallback, GestureResultCallback, GestureResultCallback, GestureResultCallback, GestureResultCallback, GestureResultCallback, GestureDescription, GestureResultCallback

### Community 12 - ".log"
Cohesion: 0.17
Nodes (5): KidsApplication, CrawlerTraceLogger, Context, Application, Result

### Community 13 - "GoogleDriveSharedHarvester"
Cohesion: 0.25
Nodes (6): DriveSharedItem, GoogleDriveSharedHarvester, AccessibilityNodeInfo, FloatingCrawlerOverlay, Volatile, AttachmentEntity

### Community 14 - "KidsAccessibilityService.kt"
Cohesion: 0.15
Nodes (14): AccessibilityEvent, accessibilitymanager, AccessibilityService, accessibilityserviceinfo, Context, Rect, Rect, CoroutineScope (+6 more)

### Community 15 - "DriveSyncWorker.kt"
Cohesion: 0.14
Nodes (14): add, DownloadFolderObserver, Context, buildjsonarray, buildjsonobject, CoroutineWorker, dispatchers, environment (+6 more)

### Community 16 - "FloatingCrawlerOverlay.kt"
Cohesion: 0.12
Nodes (14): Button, gradientdrawable, gravity, handler, LinearLayout, looper, motionevent, path (+6 more)

### Community 18 - "OnboardingWizardScreen"
Cohesion: 0.33
Nodes (5): Context, PermissionHelper, PermissionSetupDialog(), OnboardingWizardScreen(), OptIn

### Community 19 - "ci_watch.py"
Cohesion: 0.21
Nodes (14): os, re, diagnose_failure(), get_latest_run(), main(), monitor_workflow(), CI/CD Pipeline Monitor, Release Verifier & Graphify Guardian for K.I.D.S.…, Runs local Graphify AST extraction and community clustering. (+6 more)

### Community 20 - "assertthat"
Cohesion: 0.19
Nodes (4): MultiChildRouter, MultiChildAttributionTest, assertthat, beforeeach

### Community 21 - "Test"
Cohesion: 0.24
Nodes (7): ClassroomDateParser, ParsedDate, ClassroomDateParserTest, assertequals, assertnotnull, asserttrue, Test

### Community 22 - "MainActivity.kt"
Cohesion: 0.18
Nodes (11): AppScreen, DASHBOARD, DIAGNOSTICS, WIZARD, MainActivity, childprofile, ComponentActivity, lifecyclescope (+3 more)

### Community 24 - "KidsNotificationListenerService.kt"
Cohesion: 0.22
Nodes (8): KidsNotificationListenerService, StatusBarNotification, firstornull, NoticeEntity, NotificationListenerService, supervisorjob, uuid, workmanager

### Community 25 - "GestureDescription"
Cohesion: 0.27
Nodes (5): GestureResultCallback, GestureResultCallback, GestureResultCallback, GestureDescription, GestureResultCallback

### Community 26 - "Entities.kt"
Cohesion: 0.20
Nodes (8): AttachmentEntity, ChildProfileEntity, NoticeEntity, NoticeFtsEntity, entity, fts4, index, primarykey

### Community 27 - "DeduplicationEngine"
Cohesion: 0.22
Nodes (4): DeduplicationEngine, java, DeduplicationHashTest, ByteArray

### Community 28 - "DriveVaultManager.kt"
Cohesion: 0.22
Nodes (8): CompletableDeferred, googleaccountcredential, gsonfactory, launch, nethttptransport, userrecoverableauthexception, userrecoverableauthioexception, withtimeoutornull

### Community 29 - "CrawlerTraceLogger.kt"
Cohesion: 0.22
Nodes (7): calendar, concurrentlinkedqueue, date, file, filewriter, locale, printwriter

### Community 30 - "ChildProfile"
Cohesion: 0.28
Nodes (7): ChildProfile, ChildCard(), ChildrenGridDashboard(), KidsTheme(), Composable, lightcolorscheme, materialtheme

### Community 31 - "Type.kt"
Cohesion: 0.22
Nodes (8): font, fontfamily, fontweight, googlefont, r, sp, textstyle, typography

### Community 32 - "ShareTargetActivity.kt"
Cohesion: 0.25
Nodes (7): cancel, constraints, existingworkpolicy, fileoutputstream, networktype, onetimeworkrequestbuilder, openablecolumns

### Community 34 - "log"
Cohesion: 0.43
Nodes (5): BootReceiver, Context, BroadcastReceiver, Intent, log

### Community 35 - "WizardStep"
Cohesion: 0.33
Nodes (6): WizardStep, STEP_0_PERMISSIONS, STEP_1_VAULT, STEP_2_CLASSROOM, STEP_3_PORTALS, STEP_4_WHATSAPP

### Community 36 - "DriveSyncWorker"
Cohesion: 0.50
Nodes (3): DriveSyncWorker, AttachmentEntity, NoticeEntity

### Community 37 - "gradlew"
Cohesion: 0.83
Nodes (3): gradlew script, die(), warn()

## Knowledge Gaps
- **35 isolated node(s):** `AttachmentEntity`, `NoticeFtsEntity`, `DeviceInfo`, `PipelineMetrics`, `StepStatus` (+30 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 208 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **19 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `KidsAccessibilityService` connect `KidsAccessibilityService` to `ContentCategory`, `OnboardingWizardScreen.kt`, `SafVaultManager.kt`, `KidsAccessibilityService.kt`, `.matchesAttachmentChipText`, `assertthat`, `Entities.kt`, `DeduplicationEngine`?**
  _High betweenness centrality (0.242) - this node is a cross-community bridge._
- **Why does `ChildProfile` connect `ChildProfile` to `KidsAccessibilityService`, `KotlinGraphifyEngine.kt`, `ChildrenGridDashboard.kt`, `OnboardingWizardScreen`, `assertthat`, `KidsNotificationListenerService.kt`, `Entities.kt`?**
  _High betweenness centrality (0.091) - this node is a cross-community bridge._
- **Why does `OnboardingWizardScreen()` connect `OnboardingWizardScreen` to `GoogleDriveClient`, `KotlinGraphifyEngine.kt`, `OnboardingWizardScreen.kt`, `MainActivity.kt`, `ChildProfile`?**
  _High betweenness centrality (0.076) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `KidsAccessibilityService` (e.g. with `ContentClassifier` and `DeduplicationEngine`) actually correct?**
  _`KidsAccessibilityService` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Are the 6 inferred relationships involving `GoogleDriveClient` (e.g. with `.preWarmOAuthAndFolders()` and `.provisionStep1()`) actually correct?**
  _`GoogleDriveClient` has 6 INFERRED edges - model-reasoned connections that need verification._
- **What connects `AttachmentEntity`, `NoticeFtsEntity`, `DeviceInfo` to the rest of the system?**
  _35 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `KidsAccessibilityService` be split into smaller, more focused modules?**
  _Cohesion score 0.0796092796092796 - nodes in this community are weakly interconnected._