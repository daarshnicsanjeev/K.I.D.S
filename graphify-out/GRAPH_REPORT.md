# Graph Report - K.I.D.S  (2026-09-28)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 835 nodes · 1940 edges · 63 communities (37 shown, 26 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 34 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `a51dc207`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- KidsAccessibilityService
- GoogleDriveClient
- Query
- MLKitOcrParser.kt
- ci_watch.py
- StreamManifest
- GoogleDriveSharedHarvester
- ChildrenGridDashboard.kt
- OnboardingWizardScreen.kt
- FloatingCrawlerOverlay
- KotlinGraphifyEngine.kt
- .log
- GestureDescription
- KidsAccessibilityService.kt
- .matchesAttachmentChipText
- ContentCategory
- MainActivity.kt
- ShareTargetActivity.kt
- FloatingCrawlerOverlay.kt
- WhatsAppChatExportParser.kt
- OnboardingWizardScreen
- DriveVaultManager.kt
- SafVaultManager
- Test
- .fallbackNativeScroll
- ChildProfile
- log
- PrivacyFilterTest
- GestureDescription
- assertthat
- DriveSyncWorker.kt
- K.I.D.S. Android Collector (PRD)
- Type.kt
- WizardStep
- Intent
- DeduplicationEngine
- ChannelType
- SyncStatus
- DriveSyncWorker
- AppScreen
- gradlew
- KidsApplication.kt
- .onUnbind
- java
- Bundle
- Result
- AccessibilityNodeInfo
- Context
- FloatingCrawlerOverlay
- Rect
- Volatile
- AccessibilityNodeInfo
- FloatingCrawlerOverlay
- GestureDescription
- GestureResultCallback
- Rect
- Volatile
- ChildVaultFolders
- role
- statusbarnotification

## God Nodes (most connected - your core abstractions)
1. `KidsAccessibilityService` - 101 edges
2. `FloatingCrawlerOverlay` - 42 edges
3. `GoogleDriveSharedHarvester` - 39 edges
4. `GoogleDriveClient` - 29 edges
5. `OnboardingWizardScreen()` - 22 edges
6. `DriveVaultManager` - 18 edges
7. `NoticeDao` - 18 edges
8. `AttachmentDao` - 17 edges
9. `ChildProfile` - 17 edges
10. `StreamManifest` - 17 edges

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

## Communities (63 total, 26 thin omitted)

### Community 0 - "KidsAccessibilityService"
Cohesion: 0.08
Nodes (9): AccessibilityNodeInfo, NoticeEntity, ExtractedAttachmentDetail, KidsAccessibilityService, UnvisitedCard, VisiblePendingCard, FloatingCrawlerOverlay, StreamManifest (+1 more)

### Community 1 - "GoogleDriveClient"
Cohesion: 0.07
Nodes (28): DriveVaultManager, Failure, Context, Result, ProvisionStep1Result, Success, UserConsentRequired, ChannelVaultFolders (+20 more)

### Community 2 - "Query"
Cohesion: 0.07
Nodes (17): AttachmentDao, ChildProfileDao, AttachmentEntity, NoticeEntity, NoticeDao, KidsDatabase, Context, ChildProfileEntity (+9 more)

### Community 3 - "MLKitOcrParser.kt"
Cohesion: 0.08
Nodes (24): Activity, android, MLKitOcrParser, OcrExtractionResult, Bundle, StatusBarNotification, NotificationParser, ParsedNotification (+16 more)

### Community 4 - "ci_watch.py"
Cohesion: 0.07
Nodes (31): AttachmentEntity, ChildProfileEntity, NoticeFtsEntity, Converters, ChannelConfig, DeviceInfo, DiagnosticSnapshot, DriveDeepLogger (+23 more)

### Community 5 - "StreamManifest"
Cohesion: 0.08
Nodes (9): StreamItemStatus, ALREADY_SYNCED, COMPLETED, FAILED_SKIPPED, IN_PROGRESS, PENDING, StreamManifest, StreamManifestItem (+1 more)

### Community 6 - "GoogleDriveSharedHarvester"
Cohesion: 0.16
Nodes (4): DriveSharedItem, GoogleDriveSharedHarvester, AttachmentEntity, Volatile

### Community 7 - "ChildrenGridDashboard.kt"
Cohesion: 0.11
Nodes (24): alignment, ProbeItem, DiagnosticFeedScreen(), LogLine, background, border, circleshape, clickable (+16 more)

### Community 8 - "OnboardingWizardScreen.kt"
Cohesion: 0.09
Nodes (24): accountmanager, activityresultcontracts, androidx, getDefaultSchoolAppList(), Context, Intent, launchAccountPicker(), queryInstalledLauncherApps() (+16 more)

### Community 10 - "KotlinGraphifyEngine.kt"
Cohesion: 0.18
Nodes (9): GraphEdge, GraphNode, KnowledgeGraph, KotlinGraphifyEngine, Attachment, CloudHealthReport, Notice, KnowledgeGraphBuilderTest (+1 more)

### Community 11 - ".log"
Cohesion: 0.20
Nodes (3): CrawlerTraceLogger, Context, Result

### Community 12 - "GestureDescription"
Cohesion: 0.16
Nodes (6): GestureResultCallback, GestureResultCallback, GestureResultCallback, GestureResultCallback, GestureDescription, GestureResultCallback

### Community 13 - "KidsAccessibilityService.kt"
Cohesion: 0.18
Nodes (14): AccessibilityEvent, accessibilitymanager, AccessibilityService, accessibilityserviceinfo, calendar, CoroutineScope, delay, intentfilter (+6 more)

### Community 15 - "ContentCategory"
Cohesion: 0.15
Nodes (8): ContentClassifier, ContentCategory, ATTENDANCE, CIRCULAR, FEES, HOMEWORK, UNKNOWN, ContentClassifierTest

### Community 16 - "MainActivity.kt"
Cohesion: 0.17
Nodes (14): ChildCard(), ChildrenGridDashboard(), MainActivity, KidsTheme(), ChildProfile, ComponentActivity, Composable, lifecyclescope (+6 more)

### Community 17 - "ShareTargetActivity.kt"
Cohesion: 0.17
Nodes (14): KidsNotificationListenerService, cancel, constraints, existingworkpolicy, fileoutputstream, firstornull, networktype, NoticeEntity (+6 more)

### Community 18 - "FloatingCrawlerOverlay.kt"
Cohesion: 0.13
Nodes (14): Button, gradientdrawable, gravity, handler, LinearLayout, looper, motionevent, path (+6 more)

### Community 19 - "WhatsAppChatExportParser.kt"
Cohesion: 0.16
Nodes (7): ImportedNoticeRecord, WhatsAppChatExportParser, WhatsAppChatExportParserTest, bytearrayinputstream, Dual WhatsApp Catch-Up Engine, inputstream, pattern

### Community 20 - "OnboardingWizardScreen"
Cohesion: 0.35
Nodes (4): Context, PermissionHelper, PermissionSetupDialog(), OnboardingWizardScreen()

### Community 21 - "DriveVaultManager.kt"
Cohesion: 0.19
Nodes (11): date, dispatchers, googleaccountcredential, gsonfactory, launch, nethttptransport, simpledateformat, userrecoverableauthexception (+3 more)

### Community 22 - "SafVaultManager"
Cohesion: 0.37
Nodes (6): Context, Result, SafVaultFolders, SafVaultManager, Context, DocumentFile

### Community 23 - "Test"
Cohesion: 0.24
Nodes (7): ClassroomDateParser, ParsedDate, ClassroomDateParserTest, assertequals, assertnotnull, asserttrue, Test

### Community 24 - ".fallbackNativeScroll"
Cohesion: 0.18
Nodes (3): GestureResultCallback, GestureResultCallback, AccessibilityNodeInfo

### Community 25 - "ChildProfile"
Cohesion: 0.24
Nodes (4): ChildProfile, MultiChildRouter, StatusBarNotification, MultiChildAttributionTest

### Community 26 - "log"
Cohesion: 0.24
Nodes (8): DownloadFolderObserver, Context, concurrentlinkedqueue, environment, file, filewriter, log, printwriter

### Community 28 - "GestureDescription"
Cohesion: 0.27
Nodes (5): GestureResultCallback, GestureResultCallback, GestureResultCallback, GestureDescription, GestureResultCallback

### Community 29 - "assertthat"
Cohesion: 0.24
Nodes (3): DeduplicationHashTest, assertthat, beforeeach

### Community 30 - "DriveSyncWorker.kt"
Cohesion: 0.22
Nodes (8): add, AttachmentEntity, buildjsonarray, buildjsonobject, put, syncstatus, withtransaction, workerparameters

### Community 31 - "K.I.D.S. Android Collector (PRD)"
Cohesion: 0.22
Nodes (9): AI-Native Storage (JSONL & Markdown), 5-Point Cloud Health Probe, Google Credential Manager API, Memory Boundary Privacy Filter, K.I.D.S. Android Collector (PRD), Restricted Drive Scope (drive.file), Sequential 4-Step Onboarding, Streaming PdfRenderer OCR (+1 more)

### Community 32 - "Type.kt"
Cohesion: 0.22
Nodes (8): font, fontfamily, fontweight, googlefont, r, sp, textstyle, typography

### Community 33 - "WizardStep"
Cohesion: 0.33
Nodes (6): WizardStep, STEP_0_PERMISSIONS, STEP_1_VAULT, STEP_2_CLASSROOM, STEP_3_PORTALS, STEP_4_WHATSAPP

### Community 34 - "Intent"
Cohesion: 0.53
Nodes (4): BootReceiver, Context, BroadcastReceiver, Intent

### Community 36 - "ChannelType"
Cohesion: 0.40
Nodes (5): ChannelType, FILE_IMPORT, GOOGLE_CLASSROOM, SCHOOL_ERP, WHATSAPP

### Community 37 - "SyncStatus"
Cohesion: 0.40
Nodes (5): SyncStatus, DROPPED, FAILED, PENDING, SYNCED

### Community 38 - "DriveSyncWorker"
Cohesion: 0.50
Nodes (3): DriveSyncWorker, NoticeEntity, CoroutineWorker

### Community 39 - "AppScreen"
Cohesion: 0.50
Nodes (4): AppScreen, DASHBOARD, DIAGNOSTICS, WIZARD

### Community 40 - "gradlew"
Cohesion: 0.83
Nodes (3): gradlew script, die(), warn()

## Knowledge Gaps
- **34 isolated node(s):** `CloudHealthReport`, `DeviceInfo`, `PipelineMetrics`, `StepStatus`, `NoticeFtsEntity` (+29 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 207 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **26 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `KidsAccessibilityService` connect `KidsAccessibilityService` to `DeduplicationEngine`, `GoogleDriveSharedHarvester`, `OnboardingWizardScreen.kt`, `.onUnbind`, `KidsAccessibilityService.kt`, `.matchesAttachmentChipText`, `ContentCategory`, `MainActivity.kt`, `SafVaultManager`, `assertthat`?**
  _High betweenness centrality (0.259) - this node is a cross-community bridge._
- **Why does `ChildProfile` connect `ChildProfile` to `KidsAccessibilityService`, `KotlinGraphifyEngine.kt`, `ShareTargetActivity.kt`, `OnboardingWizardScreen`, `assertthat`?**
  _High betweenness centrality (0.074) - this node is a cross-community bridge._
- **Why does `OnboardingWizardScreen()` connect `OnboardingWizardScreen` to `GoogleDriveClient`, `ci_watch.py`, `OnboardingWizardScreen.kt`, `MainActivity.kt`, `ChildProfile`?**
  _High betweenness centrality (0.061) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `KidsAccessibilityService` (e.g. with `ContentClassifier` and `DeduplicationEngine`) actually correct?**
  _`KidsAccessibilityService` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Are the 6 inferred relationships involving `GoogleDriveClient` (e.g. with `.preWarmOAuthAndFolders()` and `.provisionStep1()`) actually correct?**
  _`GoogleDriveClient` has 6 INFERRED edges - model-reasoned connections that need verification._
- **What connects `CloudHealthReport`, `DeviceInfo`, `PipelineMetrics` to the rest of the system?**
  _34 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `KidsAccessibilityService` be split into smaller, more focused modules?**
  _Cohesion score 0.07732784259894761 - nodes in this community are weakly interconnected._