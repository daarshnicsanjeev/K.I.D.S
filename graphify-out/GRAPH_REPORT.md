# Graph Report - K.I.D.S  (2026-09-29)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 837 nodes · 1951 edges · 64 communities (32 shown, 32 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 35 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `a9eac945`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- KidsAccessibilityService
- GoogleDriveClient
- Query
- .log
- ci_watch.py
- StreamManifest
- MLKitOcrParser.kt
- ChildrenGridDashboard.kt
- OnboardingWizardScreen.kt
- SafVaultManager.kt
- GestureDescription
- KidsAccessibilityService.kt
- FloatingCrawlerOverlay
- KotlinGraphifyEngine.kt
- .matchesAttachmentChipText
- ContentCategory
- ShareTargetActivity.kt
- FloatingCrawlerOverlay.kt
- log
- OnboardingWizardScreen
- DriveSyncWorker.kt
- WhatsAppChatExportParser.kt
- Test
- DeduplicationEngine
- Models.kt
- ChildProfile
- PrivacyFilterTest
- MainActivity.kt
- K.I.D.S. Android Collector (PRD)
- DriveVaultManager.kt
- ChildProfile
- Type.kt
- .fallbackNativeScroll
- WizardStep
- Intent
- .fallbackNativeScrollBackward
- ContentClassifierTest
- gradlew
- java
- Bundle
- Context
- Intent
- Result
- AccessibilityNodeInfo
- GestureDescription
- GestureResultCallback
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
1. `KidsAccessibilityService` - 99 edges
2. `FloatingCrawlerOverlay` - 44 edges
3. `GoogleDriveSharedHarvester` - 39 edges
4. `GoogleDriveClient` - 29 edges
5. `OnboardingWizardScreen()` - 23 edges
6. `DriveVaultManager` - 18 edges
7. `NoticeDao` - 18 edges
8. `ChildProfile` - 18 edges
9. `AttachmentDao` - 17 edges
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

## Communities (64 total, 32 thin omitted)

### Community 0 - "KidsAccessibilityService"
Cohesion: 0.08
Nodes (8): AccessibilityNodeInfo, ExtractedAttachmentDetail, KidsAccessibilityService, UnvisitedCard, VisiblePendingCard, FloatingCrawlerOverlay, StreamManifest, StreamManifestItem

### Community 1 - "GoogleDriveClient"
Cohesion: 0.07
Nodes (24): DriveVaultManager, Failure, Context, Result, ProvisionStep1Result, Success, UserConsentRequired, ChannelVaultFolders (+16 more)

### Community 2 - "Query"
Cohesion: 0.07
Nodes (17): AttachmentDao, ChildProfileDao, AttachmentEntity, NoticeEntity, NoticeDao, KidsDatabase, Context, ChildProfileEntity (+9 more)

### Community 3 - ".log"
Cohesion: 0.09
Nodes (9): KidsApplication, CrawlerTraceLogger, Context, DriveSharedItem, GoogleDriveSharedHarvester, Application, AttachmentEntity, Result (+1 more)

### Community 4 - "ci_watch.py"
Cohesion: 0.06
Nodes (32): AttachmentEntity, ChildProfileEntity, NoticeEntity, NoticeFtsEntity, Converters, ChannelConfig, DeviceInfo, DiagnosticSnapshot (+24 more)

### Community 5 - "StreamManifest"
Cohesion: 0.08
Nodes (9): StreamItemStatus, ALREADY_SYNCED, COMPLETED, FAILED_SKIPPED, IN_PROGRESS, PENDING, StreamManifest, StreamManifestItem (+1 more)

### Community 6 - "MLKitOcrParser.kt"
Cohesion: 0.09
Nodes (20): MLKitOcrParser, OcrExtractionResult, Bundle, StatusBarNotification, NotificationParser, ParsedNotification, NotificationParserTest, Bitmap (+12 more)

### Community 7 - "ChildrenGridDashboard.kt"
Cohesion: 0.11
Nodes (24): alignment, ProbeItem, DiagnosticFeedScreen(), LogLine, background, border, circleshape, clickable (+16 more)

### Community 8 - "OnboardingWizardScreen.kt"
Cohesion: 0.09
Nodes (23): accountmanager, activityresultcontracts, androidx, getDefaultSchoolAppList(), launchAccountPicker(), queryInstalledLauncherApps(), arrowback, backhandler (+15 more)

### Community 9 - "SafVaultManager.kt"
Cohesion: 0.18
Nodes (10): Activity, android, Context, Result, SafVaultFolders, SafVaultManager, ShareTargetActivity, Context (+2 more)

### Community 10 - "GestureDescription"
Cohesion: 0.14
Nodes (9): GestureResultCallback, GestureResultCallback, GestureResultCallback, GestureResultCallback, GestureResultCallback, GestureResultCallback, GestureResultCallback, GestureDescription (+1 more)

### Community 11 - "KidsAccessibilityService.kt"
Cohesion: 0.16
Nodes (14): AccessibilityEvent, accessibilitymanager, AccessibilityService, accessibilityserviceinfo, Intent, calendar, CoroutineScope, delay (+6 more)

### Community 13 - "KotlinGraphifyEngine.kt"
Cohesion: 0.22
Nodes (7): GraphEdge, GraphNode, KnowledgeGraph, KotlinGraphifyEngine, Attachment, Notice, KnowledgeGraphBuilderTest

### Community 15 - "ContentCategory"
Cohesion: 0.17
Nodes (10): ContentClassifier, ContentCategory, ATTENDANCE, CIRCULAR, FEES, HOMEWORK, UNKNOWN, assertthat (+2 more)

### Community 16 - "ShareTargetActivity.kt"
Cohesion: 0.17
Nodes (14): KidsNotificationListenerService, cancel, constraints, existingworkpolicy, fileoutputstream, firstornull, networktype, NoticeEntity (+6 more)

### Community 17 - "FloatingCrawlerOverlay.kt"
Cohesion: 0.13
Nodes (14): Button, gradientdrawable, gravity, handler, LinearLayout, looper, motionevent, path (+6 more)

### Community 18 - "log"
Cohesion: 0.16
Nodes (12): DownloadFolderObserver, Context, concurrentlinkedqueue, date, dispatchers, environment, file, filewriter (+4 more)

### Community 19 - "OnboardingWizardScreen"
Cohesion: 0.35
Nodes (4): Context, PermissionHelper, PermissionSetupDialog(), OnboardingWizardScreen()

### Community 20 - "DriveSyncWorker.kt"
Cohesion: 0.19
Nodes (11): add, DriveSyncWorker, AttachmentEntity, NoticeEntity, buildjsonarray, buildjsonobject, CoroutineWorker, put (+3 more)

### Community 21 - "WhatsAppChatExportParser.kt"
Cohesion: 0.16
Nodes (7): ImportedNoticeRecord, WhatsAppChatExportParser, WhatsAppChatExportParserTest, Dual WhatsApp Catch-Up Engine, inputstream, pattern, simpledateformat

### Community 22 - "Test"
Cohesion: 0.24
Nodes (7): ClassroomDateParser, ParsedDate, ClassroomDateParserTest, assertequals, assertnotnull, asserttrue, Test

### Community 23 - "DeduplicationEngine"
Cohesion: 0.18
Nodes (5): DeduplicationEngine, java, DeduplicationHashTest, ByteArray, messagedigest

### Community 24 - "Models.kt"
Cohesion: 0.15
Nodes (12): ChannelType, FILE_IMPORT, GOOGLE_CLASSROOM, SCHOOL_ERP, WHATSAPP, CloudHealthReport, SyncStatus, DROPPED (+4 more)

### Community 25 - "ChildProfile"
Cohesion: 0.23
Nodes (4): ChildProfile, MultiChildRouter, StatusBarNotification, MultiChildAttributionTest

### Community 28 - "MainActivity.kt"
Cohesion: 0.18
Nodes (11): AppScreen, DASHBOARD, DIAGNOSTICS, WIZARD, MainActivity, ComponentActivity, KidsAccessibilityService, lifecyclescope (+3 more)

### Community 29 - "K.I.D.S. Android Collector (PRD)"
Cohesion: 0.22
Nodes (9): AI-Native Storage (JSONL & Markdown), 5-Point Cloud Health Probe, Google Credential Manager API, Memory Boundary Privacy Filter, K.I.D.S. Android Collector (PRD), Restricted Drive Scope (drive.file), Sequential 4-Step Onboarding, Streaming PdfRenderer OCR (+1 more)

### Community 30 - "DriveVaultManager.kt"
Cohesion: 0.22
Nodes (8): CompletableDeferred, googleaccountcredential, gsonfactory, launch, nethttptransport, userrecoverableauthexception, userrecoverableauthioexception, withtimeoutornull

### Community 31 - "ChildProfile"
Cohesion: 0.28
Nodes (8): ChildCard(), ChildrenGridDashboard(), KidsTheme(), ChildProfile, Composable, lightcolorscheme, materialtheme, OptIn

### Community 32 - "Type.kt"
Cohesion: 0.22
Nodes (8): font, fontfamily, fontweight, googlefont, r, sp, textstyle, typography

### Community 34 - "WizardStep"
Cohesion: 0.33
Nodes (6): WizardStep, STEP_0_PERMISSIONS, STEP_1_VAULT, STEP_2_CLASSROOM, STEP_3_PORTALS, STEP_4_WHATSAPP

### Community 35 - "Intent"
Cohesion: 0.53
Nodes (4): BootReceiver, Context, BroadcastReceiver, Intent

### Community 38 - "gradlew"
Cohesion: 0.83
Nodes (3): gradlew script, die(), warn()

## Knowledge Gaps
- **34 isolated node(s):** `CloudHealthReport`, `NoticeFtsEntity`, `DeviceInfo`, `PipelineMetrics`, `StepStatus` (+29 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 212 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **32 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `KidsAccessibilityService` connect `KidsAccessibilityService` to `.log`, `SafVaultManager.kt`, `KidsAccessibilityService.kt`, `.matchesAttachmentChipText`, `ContentCategory`, `DeduplicationEngine`, `ChildProfile`?**
  _High betweenness centrality (0.177) - this node is a cross-community bridge._
- **Why does `ChildProfile` connect `ChildProfile` to `KidsAccessibilityService`, `KotlinGraphifyEngine.kt`, `ContentCategory`, `ShareTargetActivity.kt`, `OnboardingWizardScreen`, `Models.kt`?**
  _High betweenness centrality (0.079) - this node is a cross-community bridge._
- **Why does `OnboardingWizardScreen()` connect `OnboardingWizardScreen` to `GoogleDriveClient`, `ci_watch.py`, `OnboardingWizardScreen.kt`, `ChildProfile`, `MainActivity.kt`, `ChildProfile`?**
  _High betweenness centrality (0.072) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `KidsAccessibilityService` (e.g. with `ContentClassifier` and `DeduplicationEngine`) actually correct?**
  _`KidsAccessibilityService` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Are the 6 inferred relationships involving `GoogleDriveClient` (e.g. with `.preWarmOAuthAndFolders()` and `.provisionStep1()`) actually correct?**
  _`GoogleDriveClient` has 6 INFERRED edges - model-reasoned connections that need verification._
- **What connects `CloudHealthReport`, `NoticeFtsEntity`, `DeviceInfo` to the rest of the system?**
  _34 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `KidsAccessibilityService` be split into smaller, more focused modules?**
  _Cohesion score 0.07955088389870998 - nodes in this community are weakly interconnected._