# Graph Report - K.I.D.S  (2026-09-29)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 854 nodes · 2010 edges · 55 communities (32 shown, 23 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 32 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `5ec76379`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- KidsAccessibilityService
- FloatingCrawlerOverlay
- ChildProfile
- .log
- GoogleDriveClient
- Query
- StreamManifest
- ChildrenGridDashboard.kt
- DriveVaultManager.kt
- KidsAccessibilityService.kt
- OnboardingWizardScreen.kt
- ShareTargetActivity.kt
- .matchesAttachmentChipText
- MLKitOcrParser.kt
- ContentCategory
- NotificationParserTest.kt
- OnboardingWizardScreen
- ci_watch.py
- Test
- DriveSyncWorker.kt
- WhatsAppChatExportParser.kt
- SafVaultManager.kt
- PrivacyFilterTest
- MainActivity.kt
- GestureDescription
- Uri
- DeduplicationEngine
- K.I.D.S. Android Collector (PRD)
- Intent
- ChildProfile
- Type.kt
- assertthat
- WizardStep
- gradlew
- java
- Bundle
- Context
- Intent
- AttachmentEntity
- NoticeEntity
- Result
- AccessibilityNodeInfo
- Context
- FloatingCrawlerOverlay
- GestureDescription
- GestureResultCallback
- Intent
- Rect
- Volatile
- ChildVaultFolders
- role
- statusbarnotification

## God Nodes (most connected - your core abstractions)
1. `KidsAccessibilityService` - 103 edges
2. `GoogleDriveSharedHarvester` - 48 edges
3. `FloatingCrawlerOverlay` - 44 edges
4. `GoogleDriveClient` - 28 edges
5. `OnboardingWizardScreen()` - 23 edges
6. `ChildProfile` - 18 edges
7. `DriveVaultManager` - 18 edges
8. `NoticeDao` - 18 edges
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

## Communities (55 total, 23 thin omitted)

### Community 0 - "KidsAccessibilityService"
Cohesion: 0.07
Nodes (9): AccessibilityNodeInfo, ExtractedAttachmentDetail, KidsAccessibilityService, UnvisitedCard, VisiblePendingCard, FloatingCrawlerOverlay, StreamManifest, StreamManifestItem (+1 more)

### Community 1 - "FloatingCrawlerOverlay"
Cohesion: 0.05
Nodes (24): FloatingCrawlerOverlay, GestureResultCallback, GestureResultCallback, GestureResultCallback, GestureResultCallback, GestureResultCallback, GestureResultCallback, AccessibilityNodeInfo (+16 more)

### Community 2 - "ChildProfile"
Cohesion: 0.05
Nodes (35): AttachmentEntity, ChildProfileEntity, NoticeEntity, NoticeFtsEntity, Converters, GraphEdge, GraphNode, KnowledgeGraph (+27 more)

### Community 3 - ".log"
Cohesion: 0.10
Nodes (9): CrawlerTraceLogger, Context, DriveSharedItem, GoogleDriveSharedHarvester, AccessibilityNodeInfo, FloatingCrawlerOverlay, Volatile, AttachmentEntity (+1 more)

### Community 4 - "GoogleDriveClient"
Cohesion: 0.07
Nodes (24): DriveVaultManager, Failure, Context, Result, ProvisionStep1Result, Success, UserConsentRequired, ChannelVaultFolders (+16 more)

### Community 5 - "Query"
Cohesion: 0.07
Nodes (17): AttachmentDao, ChildProfileDao, AttachmentEntity, NoticeEntity, NoticeDao, KidsDatabase, Context, ChildProfileEntity (+9 more)

### Community 6 - "StreamManifest"
Cohesion: 0.08
Nodes (9): StreamItemStatus, ALREADY_SYNCED, COMPLETED, FAILED_SKIPPED, IN_PROGRESS, PENDING, StreamManifest, StreamManifestItem (+1 more)

### Community 7 - "ChildrenGridDashboard.kt"
Cohesion: 0.11
Nodes (24): alignment, ProbeItem, DiagnosticFeedScreen(), LogLine, background, border, circleshape, clickable (+16 more)

### Community 8 - "DriveVaultManager.kt"
Cohesion: 0.10
Nodes (22): DownloadFolderObserver, Context, KidsApplication, Application, CompletableDeferred, concurrentlinkedqueue, date, dispatchers (+14 more)

### Community 9 - "KidsAccessibilityService.kt"
Cohesion: 0.11
Nodes (21): AccessibilityEvent, accessibilitymanager, AccessibilityService, accessibilityserviceinfo, Context, Rect, calendar, CoroutineScope (+13 more)

### Community 10 - "OnboardingWizardScreen.kt"
Cohesion: 0.10
Nodes (20): accountmanager, activityresultcontracts, getDefaultSchoolAppList(), queryInstalledLauncherApps(), arrowback, backhandler, channelconfig, channeltype (+12 more)

### Community 11 - "ShareTargetActivity.kt"
Cohesion: 0.11
Nodes (20): Activity, SyncStatus, DROPPED, FAILED, PENDING, SYNCED, KidsNotificationListenerService, StatusBarNotification (+12 more)

### Community 13 - "MLKitOcrParser.kt"
Cohesion: 0.16
Nodes (11): MLKitOcrParser, OcrExtractionResult, Context, inputimage, parcelfiledescriptor, pdfrenderer, resume, resumewithexception (+3 more)

### Community 14 - "ContentCategory"
Cohesion: 0.14
Nodes (8): ContentClassifier, ContentCategory, ATTENDANCE, CIRCULAR, FEES, HOMEWORK, UNKNOWN, ContentClassifierTest

### Community 15 - "NotificationParserTest.kt"
Cohesion: 0.19
Nodes (10): Bundle, StatusBarNotification, NotificationParser, ParsedNotification, NotificationParserTest, Bitmap, build, Bundle (+2 more)

### Community 16 - "OnboardingWizardScreen"
Cohesion: 0.35
Nodes (4): Context, PermissionHelper, PermissionSetupDialog(), OnboardingWizardScreen()

### Community 17 - "ci_watch.py"
Cohesion: 0.21
Nodes (14): os, re, diagnose_failure(), get_latest_run(), main(), monitor_workflow(), CI/CD Pipeline Monitor, Release Verifier & Graphify Guardian for K.I.D.S.…, Runs local Graphify AST extraction and community clustering. (+6 more)

### Community 18 - "Test"
Cohesion: 0.23
Nodes (7): ClassroomDateParser, ParsedDate, ClassroomDateParserTest, assertequals, assertnotnull, asserttrue, Test

### Community 19 - "DriveSyncWorker.kt"
Cohesion: 0.19
Nodes (10): add, DriveSyncWorker, buildjsonarray, buildjsonobject, CoroutineWorker, NoticeEntity, put, syncstatus (+2 more)

### Community 20 - "WhatsAppChatExportParser.kt"
Cohesion: 0.18
Nodes (6): ImportedNoticeRecord, WhatsAppChatExportParser, WhatsAppChatExportParserTest, Dual WhatsApp Catch-Up Engine, inputstream, pattern

### Community 21 - "SafVaultManager.kt"
Cohesion: 0.47
Nodes (5): Context, Result, SafVaultFolders, SafVaultManager, DocumentFile

### Community 23 - "MainActivity.kt"
Cohesion: 0.18
Nodes (11): AppScreen, DASHBOARD, DIAGNOSTICS, WIZARD, MainActivity, ComponentActivity, KidsAccessibilityService, lifecyclescope (+3 more)

### Community 24 - "GestureDescription"
Cohesion: 0.27
Nodes (5): GestureResultCallback, GestureResultCallback, GestureResultCallback, GestureDescription, GestureResultCallback

### Community 25 - "Uri"
Cohesion: 0.40
Nodes (3): android, ShareTargetActivity, Uri

### Community 26 - "DeduplicationEngine"
Cohesion: 0.22
Nodes (4): DeduplicationEngine, java, DeduplicationHashTest, ByteArray

### Community 27 - "K.I.D.S. Android Collector (PRD)"
Cohesion: 0.22
Nodes (9): AI-Native Storage (JSONL & Markdown), 5-Point Cloud Health Probe, Google Credential Manager API, Memory Boundary Privacy Filter, K.I.D.S. Android Collector (PRD), Restricted Drive Scope (drive.file), Sequential 4-Step Onboarding, Streaming PdfRenderer OCR (+1 more)

### Community 28 - "Intent"
Cohesion: 0.31
Nodes (6): androidx, launchAccountPicker(), BootReceiver, Context, BroadcastReceiver, Intent

### Community 29 - "ChildProfile"
Cohesion: 0.28
Nodes (8): ChildCard(), ChildrenGridDashboard(), KidsTheme(), ChildProfile, Composable, lightcolorscheme, materialtheme, OptIn

### Community 30 - "Type.kt"
Cohesion: 0.22
Nodes (8): font, fontfamily, fontweight, googlefont, r, sp, textstyle, typography

### Community 31 - "assertthat"
Cohesion: 0.38
Nodes (3): assertthat, beforeeach, bytearrayinputstream

### Community 32 - "WizardStep"
Cohesion: 0.33
Nodes (6): WizardStep, STEP_0_PERMISSIONS, STEP_1_VAULT, STEP_2_CLASSROOM, STEP_3_PORTALS, STEP_4_WHATSAPP

### Community 33 - "gradlew"
Cohesion: 0.83
Nodes (3): gradlew script, die(), warn()

## Knowledge Gaps
- **35 isolated node(s):** `DeviceInfo`, `PipelineMetrics`, `StepStatus`, `CloudHealthReport`, `AttachmentEntity` (+30 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 215 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **23 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `KidsAccessibilityService` connect `KidsAccessibilityService` to `FloatingCrawlerOverlay`, `ChildProfile`, `KidsAccessibilityService.kt`, `.matchesAttachmentChipText`, `MLKitOcrParser.kt`, `ContentCategory`, `DeduplicationEngine`, `Intent`, `assertthat`?**
  _High betweenness centrality (0.239) - this node is a cross-community bridge._
- **Why does `ChildProfile` connect `ChildProfile` to `OnboardingWizardScreen`, `KidsAccessibilityService`, `ShareTargetActivity.kt`?**
  _High betweenness centrality (0.080) - this node is a cross-community bridge._
- **Why does `FloatingCrawlerOverlay` connect `FloatingCrawlerOverlay` to `KidsAccessibilityService`?**
  _High betweenness centrality (0.077) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `KidsAccessibilityService` (e.g. with `ContentClassifier` and `DeduplicationEngine`) actually correct?**
  _`KidsAccessibilityService` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Are the 6 inferred relationships involving `GoogleDriveClient` (e.g. with `.preWarmOAuthAndFolders()` and `.provisionStep1()`) actually correct?**
  _`GoogleDriveClient` has 6 INFERRED edges - model-reasoned connections that need verification._
- **What connects `DeviceInfo`, `PipelineMetrics`, `StepStatus` to the rest of the system?**
  _35 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `KidsAccessibilityService` be split into smaller, more focused modules?**
  _Cohesion score 0.07456140350877193 - nodes in this community are weakly interconnected._