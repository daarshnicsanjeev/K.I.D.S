# Graph Report - K.I.D.S  (2026-09-28)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 832 nodes · 1935 edges · 58 communities (34 shown, 24 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 32 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `048a6d8b`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- KidsAccessibilityService
- FloatingCrawlerOverlay
- GoogleDriveClient
- Query
- MLKitOcrParser.kt
- .log
- StreamManifest
- ci_watch.py
- ChildrenGridDashboard.kt
- OnboardingWizardScreen.kt
- ShareTargetActivity.kt
- KotlinGraphifyEngine.kt
- KidsAccessibilityService.kt
- .matchesAttachmentChipText
- ContentCategory
- MainActivity.kt
- OnboardingWizardScreen
- DriveSyncWorker.kt
- Test
- Models.kt
- ChildProfile
- DeduplicationEngine
- PrivacyFilterTest
- GestureDescription
- WhatsAppChatExportParser.kt
- DriveDeepLogger.kt
- assertthat
- K.I.D.S. Android Collector (PRD)
- DriveVaultManager.kt
- log
- ChildrenGridDashboard
- Type.kt
- WizardStep
- Intent
- AppScreen
- gradlew
- java
- Bundle
- Context
- Result
- AccessibilityNodeInfo
- Context
- FloatingCrawlerOverlay
- Rect
- Volatile
- AccessibilityNodeInfo
- Context
- FloatingCrawlerOverlay
- GestureDescription
- GestureResultCallback
- Rect
- Volatile
- ChildVaultFolders
- role
- statusbarnotification

## God Nodes (most connected - your core abstractions)
1. `KidsAccessibilityService` - 99 edges
2. `FloatingCrawlerOverlay` - 42 edges
3. `GoogleDriveSharedHarvester` - 39 edges
4. `GoogleDriveClient` - 29 edges
5. `OnboardingWizardScreen()` - 22 edges
6. `DriveVaultManager` - 18 edges
7. `NoticeDao` - 18 edges
8. `AttachmentDao` - 17 edges
9. `StreamManifest` - 17 edges
10. `AttachmentChipMatcherTest` - 16 edges

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

## Communities (58 total, 24 thin omitted)

### Community 0 - "KidsAccessibilityService"
Cohesion: 0.08
Nodes (10): AccessibilityEvent, AccessibilityNodeInfo, NoticeEntity, ExtractedAttachmentDetail, KidsAccessibilityService, UnvisitedCard, VisiblePendingCard, FloatingCrawlerOverlay (+2 more)

### Community 1 - "FloatingCrawlerOverlay"
Cohesion: 0.05
Nodes (24): FloatingCrawlerOverlay, GestureResultCallback, GestureResultCallback, GestureResultCallback, GestureResultCallback, GestureResultCallback, GestureResultCallback, AccessibilityNodeInfo (+16 more)

### Community 2 - "GoogleDriveClient"
Cohesion: 0.07
Nodes (24): DriveVaultManager, Failure, Context, Result, ProvisionStep1Result, Success, UserConsentRequired, ChannelVaultFolders (+16 more)

### Community 3 - "Query"
Cohesion: 0.07
Nodes (17): AttachmentDao, ChildProfileDao, AttachmentEntity, NoticeEntity, NoticeDao, KidsDatabase, Context, ChildProfileEntity (+9 more)

### Community 4 - "MLKitOcrParser.kt"
Cohesion: 0.07
Nodes (29): android, Context, Result, SafVaultFolders, SafVaultManager, MLKitOcrParser, OcrExtractionResult, Bundle (+21 more)

### Community 5 - ".log"
Cohesion: 0.10
Nodes (7): CrawlerTraceLogger, Context, DriveSharedItem, GoogleDriveSharedHarvester, AttachmentEntity, Result, Volatile

### Community 6 - "StreamManifest"
Cohesion: 0.08
Nodes (9): StreamItemStatus, ALREADY_SYNCED, COMPLETED, FAILED_SKIPPED, IN_PROGRESS, PENDING, StreamManifest, StreamManifestItem (+1 more)

### Community 7 - "ci_watch.py"
Cohesion: 0.09
Nodes (26): AttachmentEntity, ChildProfileEntity, NoticeFtsEntity, Converters, ChannelConfig, encodetostring, entity, fts4 (+18 more)

### Community 8 - "ChildrenGridDashboard.kt"
Cohesion: 0.11
Nodes (24): alignment, ProbeItem, DiagnosticFeedScreen(), LogLine, background, border, circleshape, clickable (+16 more)

### Community 9 - "OnboardingWizardScreen.kt"
Cohesion: 0.09
Nodes (22): accountmanager, activityresultcontracts, androidx, getDefaultSchoolAppList(), launchAccountPicker(), queryInstalledLauncherApps(), arrowback, backhandler (+14 more)

### Community 10 - "ShareTargetActivity.kt"
Cohesion: 0.15
Nodes (16): Activity, KidsNotificationListenerService, StatusBarNotification, cancel, constraints, existingworkpolicy, fileoutputstream, firstornull (+8 more)

### Community 11 - "KotlinGraphifyEngine.kt"
Cohesion: 0.22
Nodes (7): GraphEdge, GraphNode, KnowledgeGraph, KotlinGraphifyEngine, Attachment, Notice, KnowledgeGraphBuilderTest

### Community 12 - "KidsAccessibilityService.kt"
Cohesion: 0.18
Nodes (13): accessibilitymanager, AccessibilityService, accessibilityserviceinfo, calendar, CoroutineScope, delay, intentfilter, isactive (+5 more)

### Community 14 - "ContentCategory"
Cohesion: 0.15
Nodes (8): ContentClassifier, ContentCategory, ATTENDANCE, CIRCULAR, FEES, HOMEWORK, UNKNOWN, ContentClassifierTest

### Community 15 - "MainActivity.kt"
Cohesion: 0.18
Nodes (12): DownloadFolderObserver, Context, MainActivity, ComponentActivity, dispatchers, environment, KidsDatabase, lifecyclescope (+4 more)

### Community 16 - "OnboardingWizardScreen"
Cohesion: 0.35
Nodes (4): Context, PermissionHelper, PermissionSetupDialog(), OnboardingWizardScreen()

### Community 17 - "DriveSyncWorker.kt"
Cohesion: 0.19
Nodes (11): add, DriveSyncWorker, AttachmentEntity, NoticeEntity, buildjsonarray, buildjsonobject, CoroutineWorker, put (+3 more)

### Community 18 - "Test"
Cohesion: 0.24
Nodes (7): ClassroomDateParser, ParsedDate, ClassroomDateParserTest, assertequals, assertnotnull, asserttrue, Test

### Community 19 - "Models.kt"
Cohesion: 0.15
Nodes (12): ChannelType, FILE_IMPORT, GOOGLE_CLASSROOM, SCHOOL_ERP, WHATSAPP, CloudHealthReport, SyncStatus, DROPPED (+4 more)

### Community 20 - "ChildProfile"
Cohesion: 0.24
Nodes (3): ChildProfile, MultiChildRouter, MultiChildAttributionTest

### Community 21 - "DeduplicationEngine"
Cohesion: 0.22
Nodes (4): DeduplicationEngine, java, DeduplicationHashTest, ByteArray

### Community 23 - "GestureDescription"
Cohesion: 0.27
Nodes (5): GestureResultCallback, GestureResultCallback, GestureResultCallback, GestureDescription, GestureResultCallback

### Community 24 - "WhatsAppChatExportParser.kt"
Cohesion: 0.24
Nodes (6): ImportedNoticeRecord, WhatsAppChatExportParser, Dual WhatsApp Catch-Up Engine, inputstream, pattern, simpledateformat

### Community 25 - "DriveDeepLogger.kt"
Cohesion: 0.24
Nodes (6): DeviceInfo, DiagnosticSnapshot, DriveDeepLogger, PipelineMetrics, StepStatus, file

### Community 26 - "assertthat"
Cohesion: 0.22
Nodes (4): WhatsAppChatExportParserTest, assertthat, beforeeach, bytearrayinputstream

### Community 27 - "K.I.D.S. Android Collector (PRD)"
Cohesion: 0.22
Nodes (9): AI-Native Storage (JSONL & Markdown), 5-Point Cloud Health Probe, Google Credential Manager API, Memory Boundary Privacy Filter, K.I.D.S. Android Collector (PRD), Restricted Drive Scope (drive.file), Sequential 4-Step Onboarding, Streaming PdfRenderer OCR (+1 more)

### Community 28 - "DriveVaultManager.kt"
Cohesion: 0.22
Nodes (8): CompletableDeferred, googleaccountcredential, gsonfactory, launch, nethttptransport, userrecoverableauthexception, userrecoverableauthioexception, withtimeoutornull

### Community 29 - "log"
Cohesion: 0.25
Nodes (7): KidsApplication, Application, concurrentlinkedqueue, date, filewriter, log, printwriter

### Community 30 - "ChildrenGridDashboard"
Cohesion: 0.28
Nodes (8): ChildCard(), ChildrenGridDashboard(), KidsTheme(), ChildProfile, Composable, lightcolorscheme, materialtheme, OptIn

### Community 31 - "Type.kt"
Cohesion: 0.22
Nodes (8): font, fontfamily, fontweight, googlefont, r, sp, textstyle, typography

### Community 32 - "WizardStep"
Cohesion: 0.33
Nodes (6): WizardStep, STEP_0_PERMISSIONS, STEP_1_VAULT, STEP_2_CLASSROOM, STEP_3_PORTALS, STEP_4_WHATSAPP

### Community 33 - "Intent"
Cohesion: 0.53
Nodes (4): BootReceiver, Context, BroadcastReceiver, Intent

### Community 34 - "AppScreen"
Cohesion: 0.50
Nodes (4): AppScreen, DASHBOARD, DIAGNOSTICS, WIZARD

### Community 35 - "gradlew"
Cohesion: 0.83
Nodes (3): gradlew script, die(), warn()

## Knowledge Gaps
- **34 isolated node(s):** `CloudHealthReport`, `DeviceInfo`, `PipelineMetrics`, `StepStatus`, `NoticeFtsEntity` (+29 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 209 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **24 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `KidsAccessibilityService` connect `KidsAccessibilityService` to `MLKitOcrParser.kt`, `.log`, `KidsAccessibilityService.kt`, `.matchesAttachmentChipText`, `ContentCategory`, `MainActivity.kt`, `ChildProfile`, `DeduplicationEngine`, `assertthat`?**
  _High betweenness centrality (0.220) - this node is a cross-community bridge._
- **Why does `GoogleDriveClient` connect `GoogleDriveClient` to `.log`?**
  _High betweenness centrality (0.060) - this node is a cross-community bridge._
- **Why does `OnboardingWizardScreen()` connect `OnboardingWizardScreen` to `GoogleDriveClient`, `ci_watch.py`, `OnboardingWizardScreen.kt`, `ChildProfile`, `ChildrenGridDashboard`?**
  _High betweenness centrality (0.058) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `KidsAccessibilityService` (e.g. with `ContentClassifier` and `DeduplicationEngine`) actually correct?**
  _`KidsAccessibilityService` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Are the 6 inferred relationships involving `GoogleDriveClient` (e.g. with `.preWarmOAuthAndFolders()` and `.provisionStep1()`) actually correct?**
  _`GoogleDriveClient` has 6 INFERRED edges - model-reasoned connections that need verification._
- **What connects `CloudHealthReport`, `DeviceInfo`, `PipelineMetrics` to the rest of the system?**
  _34 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `KidsAccessibilityService` be split into smaller, more focused modules?**
  _Cohesion score 0.07687028140013727 - nodes in this community are weakly interconnected._