# Graph Report - K.I.D.S  (2026-09-28)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 832 nodes · 1935 edges · 59 communities (31 shown, 28 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 32 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `aa3a73ca`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- KidsAccessibilityService
- GoogleDriveClient
- Query
- MLKitOcrParser.kt
- GoogleDriveSharedHarvester
- ci_watch.py
- StreamManifest
- ChildrenGridDashboard.kt
- OnboardingWizardScreen.kt
- FloatingCrawlerOverlay
- GestureDescription
- MainActivity.kt
- .log
- KotlinGraphifyEngine.kt
- .matchesAttachmentChipText
- KidsAccessibilityService.kt
- ShareTargetActivity.kt
- FloatingCrawlerOverlay.kt
- OnboardingWizardScreen
- DriveSyncWorker.kt
- CrawlerTraceLogger.kt
- WhatsAppChatExportParser.kt
- Models.kt
- ChildProfile
- assertthat
- PrivacyFilterTest
- GestureDescription
- .fallbackNativeScrollBackward
- K.I.D.S. Android Collector (PRD)
- DriveVaultManager.kt
- ContentCategory
- Type.kt
- log
- WizardStep
- ContentClassifierTest
- DeduplicationEngine
- gradlew
- KidsApplication.kt
- java
- Bundle
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
1. `KidsAccessibilityService` - 100 edges
2. `FloatingCrawlerOverlay` - 42 edges
3. `GoogleDriveSharedHarvester` - 39 edges
4. `GoogleDriveClient` - 29 edges
5. `OnboardingWizardScreen()` - 22 edges
6. `DriveVaultManager` - 18 edges
7. `NoticeDao` - 18 edges
8. `AttachmentDao` - 17 edges
9. `StreamManifest` - 17 edges
10. `CrawlerTraceLogger` - 16 edges

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

## Communities (59 total, 28 thin omitted)

### Community 0 - "KidsAccessibilityService"
Cohesion: 0.08
Nodes (9): AccessibilityNodeInfo, NoticeEntity, ExtractedAttachmentDetail, KidsAccessibilityService, UnvisitedCard, VisiblePendingCard, FloatingCrawlerOverlay, StreamManifest (+1 more)

### Community 1 - "GoogleDriveClient"
Cohesion: 0.07
Nodes (26): DriveVaultManager, Failure, Context, Result, ProvisionStep1Result, Success, UserConsentRequired, ChannelVaultFolders (+18 more)

### Community 2 - "Query"
Cohesion: 0.07
Nodes (17): AttachmentDao, ChildProfileDao, AttachmentEntity, NoticeEntity, NoticeDao, KidsDatabase, Context, ChildProfileEntity (+9 more)

### Community 3 - "MLKitOcrParser.kt"
Cohesion: 0.07
Nodes (30): Activity, android, Context, Result, SafVaultFolders, SafVaultManager, MLKitOcrParser, OcrExtractionResult (+22 more)

### Community 4 - "GoogleDriveSharedHarvester"
Cohesion: 0.10
Nodes (11): ClassroomDateParser, ParsedDate, DriveSharedItem, GoogleDriveSharedHarvester, ClassroomDateParserTest, assertequals, assertnotnull, asserttrue (+3 more)

### Community 5 - "ci_watch.py"
Cohesion: 0.07
Nodes (31): AttachmentEntity, ChildProfileEntity, NoticeFtsEntity, Converters, ChannelConfig, DeviceInfo, DiagnosticSnapshot, DriveDeepLogger (+23 more)

### Community 6 - "StreamManifest"
Cohesion: 0.08
Nodes (9): StreamItemStatus, ALREADY_SYNCED, COMPLETED, FAILED_SKIPPED, IN_PROGRESS, PENDING, StreamManifest, StreamManifestItem (+1 more)

### Community 7 - "ChildrenGridDashboard.kt"
Cohesion: 0.11
Nodes (24): alignment, ProbeItem, DiagnosticFeedScreen(), LogLine, background, border, circleshape, clickable (+16 more)

### Community 8 - "OnboardingWizardScreen.kt"
Cohesion: 0.09
Nodes (23): accountmanager, activityresultcontracts, androidx, getDefaultSchoolAppList(), Context, launchAccountPicker(), queryInstalledLauncherApps(), arrowback (+15 more)

### Community 10 - "GestureDescription"
Cohesion: 0.13
Nodes (7): GestureResultCallback, GestureResultCallback, GestureResultCallback, GestureResultCallback, GestureResultCallback, GestureDescription, GestureResultCallback

### Community 11 - "MainActivity.kt"
Cohesion: 0.13
Nodes (18): ChildCard(), ChildrenGridDashboard(), AppScreen, DASHBOARD, DIAGNOSTICS, WIZARD, MainActivity, KidsTheme() (+10 more)

### Community 12 - ".log"
Cohesion: 0.20
Nodes (3): CrawlerTraceLogger, Context, Result

### Community 13 - "KotlinGraphifyEngine.kt"
Cohesion: 0.22
Nodes (7): GraphEdge, GraphNode, KnowledgeGraph, KotlinGraphifyEngine, Attachment, Notice, KnowledgeGraphBuilderTest

### Community 15 - "KidsAccessibilityService.kt"
Cohesion: 0.19
Nodes (13): AccessibilityEvent, accessibilitymanager, AccessibilityService, accessibilityserviceinfo, calendar, CoroutineScope, delay, intentfilter (+5 more)

### Community 16 - "ShareTargetActivity.kt"
Cohesion: 0.17
Nodes (14): KidsNotificationListenerService, cancel, constraints, existingworkpolicy, fileoutputstream, firstornull, networktype, NoticeEntity (+6 more)

### Community 17 - "FloatingCrawlerOverlay.kt"
Cohesion: 0.13
Nodes (14): Button, gradientdrawable, gravity, handler, LinearLayout, looper, motionevent, path (+6 more)

### Community 18 - "OnboardingWizardScreen"
Cohesion: 0.35
Nodes (4): Context, PermissionHelper, PermissionSetupDialog(), OnboardingWizardScreen()

### Community 19 - "DriveSyncWorker.kt"
Cohesion: 0.19
Nodes (11): add, DriveSyncWorker, AttachmentEntity, NoticeEntity, buildjsonarray, buildjsonobject, CoroutineWorker, put (+3 more)

### Community 20 - "CrawlerTraceLogger.kt"
Cohesion: 0.16
Nodes (11): DownloadFolderObserver, Context, concurrentlinkedqueue, date, dispatchers, environment, file, filewriter (+3 more)

### Community 21 - "WhatsAppChatExportParser.kt"
Cohesion: 0.16
Nodes (7): ImportedNoticeRecord, WhatsAppChatExportParser, WhatsAppChatExportParserTest, Dual WhatsApp Catch-Up Engine, inputstream, pattern, simpledateformat

### Community 22 - "Models.kt"
Cohesion: 0.15
Nodes (12): ChannelType, FILE_IMPORT, GOOGLE_CLASSROOM, SCHOOL_ERP, WHATSAPP, CloudHealthReport, SyncStatus, DROPPED (+4 more)

### Community 23 - "ChildProfile"
Cohesion: 0.24
Nodes (4): ChildProfile, MultiChildRouter, StatusBarNotification, MultiChildAttributionTest

### Community 24 - "assertthat"
Cohesion: 0.21
Nodes (4): DeduplicationHashTest, assertthat, beforeeach, bytearrayinputstream

### Community 26 - "GestureDescription"
Cohesion: 0.27
Nodes (5): GestureResultCallback, GestureResultCallback, GestureResultCallback, GestureDescription, GestureResultCallback

### Community 28 - "K.I.D.S. Android Collector (PRD)"
Cohesion: 0.22
Nodes (9): AI-Native Storage (JSONL & Markdown), 5-Point Cloud Health Probe, Google Credential Manager API, Memory Boundary Privacy Filter, K.I.D.S. Android Collector (PRD), Restricted Drive Scope (drive.file), Sequential 4-Step Onboarding, Streaming PdfRenderer OCR (+1 more)

### Community 29 - "DriveVaultManager.kt"
Cohesion: 0.22
Nodes (8): CompletableDeferred, googleaccountcredential, gsonfactory, launch, nethttptransport, userrecoverableauthexception, userrecoverableauthioexception, withtimeoutornull

### Community 30 - "ContentCategory"
Cohesion: 0.25
Nodes (7): ContentClassifier, ContentCategory, ATTENDANCE, CIRCULAR, FEES, HOMEWORK, UNKNOWN

### Community 31 - "Type.kt"
Cohesion: 0.22
Nodes (8): font, fontfamily, fontweight, googlefont, r, sp, textstyle, typography

### Community 32 - "log"
Cohesion: 0.43
Nodes (5): BootReceiver, Context, BroadcastReceiver, Intent, log

### Community 33 - "WizardStep"
Cohesion: 0.33
Nodes (6): WizardStep, STEP_0_PERMISSIONS, STEP_1_VAULT, STEP_2_CLASSROOM, STEP_3_PORTALS, STEP_4_WHATSAPP

### Community 36 - "gradlew"
Cohesion: 0.83
Nodes (3): gradlew script, die(), warn()

## Knowledge Gaps
- **34 isolated node(s):** `CloudHealthReport`, `DeviceInfo`, `PipelineMetrics`, `StepStatus`, `NoticeFtsEntity` (+29 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 208 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **28 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `KidsAccessibilityService` connect `KidsAccessibilityService` to `DeduplicationEngine`, `MLKitOcrParser.kt`, `GoogleDriveSharedHarvester`, `OnboardingWizardScreen.kt`, `MainActivity.kt`, `.matchesAttachmentChipText`, `KidsAccessibilityService.kt`, `assertthat`, `ContentCategory`?**
  _High betweenness centrality (0.258) - this node is a cross-community bridge._
- **Why does `OnboardingWizardScreen()` connect `OnboardingWizardScreen` to `GoogleDriveClient`, `ci_watch.py`, `OnboardingWizardScreen.kt`, `MainActivity.kt`, `ChildProfile`?**
  _High betweenness centrality (0.060) - this node is a cross-community bridge._
- **Why does `GoogleDriveClient` connect `GoogleDriveClient` to `.log`?**
  _High betweenness centrality (0.059) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `KidsAccessibilityService` (e.g. with `ContentClassifier` and `DeduplicationEngine`) actually correct?**
  _`KidsAccessibilityService` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Are the 6 inferred relationships involving `GoogleDriveClient` (e.g. with `.preWarmOAuthAndFolders()` and `.provisionStep1()`) actually correct?**
  _`GoogleDriveClient` has 6 INFERRED edges - model-reasoned connections that need verification._
- **What connects `CloudHealthReport`, `DeviceInfo`, `PipelineMetrics` to the rest of the system?**
  _34 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `KidsAccessibilityService` be split into smaller, more focused modules?**
  _Cohesion score 0.07732784259894761 - nodes in this community are weakly interconnected._