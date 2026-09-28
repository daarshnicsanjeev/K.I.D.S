# Graph Report - K.I.D.S  (2026-09-28)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 820 nodes · 1878 edges · 58 communities (36 shown, 22 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 34 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `92584902`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- KidsAccessibilityService
- GoogleDriveClient
- Query
- StreamManifest
- MLKitOcrParser.kt
- GoogleDriveSharedHarvester
- KidsAccessibilityService.kt
- FloatingCrawlerOverlay
- GestureDescription
- SafVaultManager.kt
- OnboardingWizardScreen.kt
- .log
- KotlinGraphifyEngine.kt
- .matchesAttachmentChipText
- ChildrenGridDashboard.kt
- DriveVaultManager.kt
- FloatingCrawlerOverlay.kt
- ContentCategory
- MainActivity.kt
- ci_watch.py
- DriveSyncWorker.kt
- WhatsAppChatExportParser.kt
- DeduplicationEngine
- Test
- Models.kt
- assertthat
- GestureDescription
- GoogleDriveSharedHarvester.kt
- .fallbackNativeScrollBackward
- K.I.D.S. Android Collector (PRD)
- ChildProfile
- PermissionSetupDialog.kt
- Type.kt
- DriveDeepLogger.kt
- Entities.kt
- TypeConverters.kt
- MultiChildRouter
- .onNotificationPosted
- PrivacyFilterTest
- WizardStep
- CrawlerTraceLogger.kt
- gradlew
- KidsApplication.kt
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
4. `GoogleDriveSharedHarvester` - 29 edges
5. `OnboardingWizardScreen()` - 23 edges
6. `ChildProfile` - 21 edges
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

## Communities (58 total, 22 thin omitted)

### Community 0 - "KidsAccessibilityService"
Cohesion: 0.08
Nodes (11): AccessibilityEvent, NoticeEntity, ExtractedAttachmentDetail, KidsAccessibilityService, AccessibilityNodeInfo, FloatingCrawlerOverlay, Volatile, UnvisitedCard (+3 more)

### Community 1 - "GoogleDriveClient"
Cohesion: 0.06
Nodes (33): DriveVaultManager, Failure, Context, Result, ProvisionStep1Result, Success, UserConsentRequired, ChannelVaultFolders (+25 more)

### Community 2 - "Query"
Cohesion: 0.07
Nodes (17): AttachmentDao, ChildProfileDao, AttachmentEntity, NoticeEntity, NoticeDao, KidsDatabase, Context, ChildProfileEntity (+9 more)

### Community 3 - "StreamManifest"
Cohesion: 0.08
Nodes (9): StreamItemStatus, ALREADY_SYNCED, COMPLETED, FAILED_SKIPPED, IN_PROGRESS, PENDING, StreamManifest, StreamManifestItem (+1 more)

### Community 4 - "MLKitOcrParser.kt"
Cohesion: 0.08
Nodes (23): MLKitOcrParser, OcrExtractionResult, Bundle, StatusBarNotification, NotificationParser, ParsedNotification, NotificationParserTest, Bitmap (+15 more)

### Community 5 - "GoogleDriveSharedHarvester"
Cohesion: 0.22
Nodes (6): DriveSharedItem, GoogleDriveSharedHarvester, AccessibilityNodeInfo, FloatingCrawlerOverlay, Volatile, AttachmentEntity

### Community 6 - "KidsAccessibilityService.kt"
Cohesion: 0.14
Nodes (20): accessibilitymanager, accessibilityserviceinfo, Rect, KidsNotificationListenerService, cancel, constraints, existingworkpolicy, fileoutputstream (+12 more)

### Community 8 - "GestureDescription"
Cohesion: 0.13
Nodes (7): GestureResultCallback, GestureResultCallback, GestureResultCallback, GestureResultCallback, GestureResultCallback, GestureDescription, GestureResultCallback

### Community 9 - "SafVaultManager.kt"
Cohesion: 0.21
Nodes (9): Activity, android, Context, Result, SafVaultFolders, SafVaultManager, ShareTargetActivity, DocumentFile (+1 more)

### Community 10 - "OnboardingWizardScreen.kt"
Cohesion: 0.10
Nodes (21): accountmanager, activityresultcontracts, androidx, getDefaultSchoolAppList(), Context, launchAccountPicker(), queryInstalledLauncherApps(), arrowback (+13 more)

### Community 11 - ".log"
Cohesion: 0.20
Nodes (3): CrawlerTraceLogger, Context, Result

### Community 12 - "KotlinGraphifyEngine.kt"
Cohesion: 0.22
Nodes (7): GraphEdge, GraphNode, KnowledgeGraph, KotlinGraphifyEngine, Attachment, Notice, KnowledgeGraphBuilderTest

### Community 14 - "ChildrenGridDashboard.kt"
Cohesion: 0.18
Nodes (14): alignment, circleshape, clickable, clip, contentdescription, gridcells, heading, items (+6 more)

### Community 15 - "DriveVaultManager.kt"
Cohesion: 0.16
Nodes (13): BootReceiver, Context, BroadcastReceiver, CompletableDeferred, googleaccountcredential, gsonfactory, Intent, launch (+5 more)

### Community 16 - "FloatingCrawlerOverlay.kt"
Cohesion: 0.13
Nodes (14): Button, gradientdrawable, gravity, handler, LinearLayout, looper, motionevent, path (+6 more)

### Community 17 - "ContentCategory"
Cohesion: 0.14
Nodes (8): ContentClassifier, ContentCategory, ATTENDANCE, CIRCULAR, FEES, HOMEWORK, UNKNOWN, ContentClassifierTest

### Community 18 - "MainActivity.kt"
Cohesion: 0.14
Nodes (13): AppScreen, DASHBOARD, DIAGNOSTICS, WIZARD, MainActivity, childprofile, ComponentActivity, lifecyclescope (+5 more)

### Community 19 - "ci_watch.py"
Cohesion: 0.21
Nodes (14): os, re, diagnose_failure(), get_latest_run(), main(), monitor_workflow(), CI/CD Pipeline Monitor, Release Verifier & Graphify Guardian for K.I.D.S.…, Runs local Graphify AST extraction and community clustering. (+6 more)

### Community 20 - "DriveSyncWorker.kt"
Cohesion: 0.19
Nodes (11): add, DriveSyncWorker, AttachmentEntity, NoticeEntity, buildjsonarray, buildjsonobject, CoroutineWorker, put (+3 more)

### Community 21 - "WhatsAppChatExportParser.kt"
Cohesion: 0.16
Nodes (7): ImportedNoticeRecord, WhatsAppChatExportParser, WhatsAppChatExportParserTest, Dual WhatsApp Catch-Up Engine, inputstream, pattern, simpledateformat

### Community 22 - "DeduplicationEngine"
Cohesion: 0.19
Nodes (8): DownloadFolderObserver, Context, DeduplicationEngine, dispatchers, environment, KidsDatabase, messagedigest, withcontext

### Community 23 - "Test"
Cohesion: 0.24
Nodes (7): ClassroomDateParser, ParsedDate, ClassroomDateParserTest, assertequals, assertnotnull, asserttrue, Test

### Community 24 - "Models.kt"
Cohesion: 0.15
Nodes (12): ChannelType, FILE_IMPORT, GOOGLE_CLASSROOM, SCHOOL_ERP, WHATSAPP, CloudHealthReport, SyncStatus, DROPPED (+4 more)

### Community 25 - "assertthat"
Cohesion: 0.21
Nodes (4): DeduplicationHashTest, assertthat, beforeeach, bytearrayinputstream

### Community 26 - "GestureDescription"
Cohesion: 0.27
Nodes (5): GestureResultCallback, GestureResultCallback, GestureResultCallback, GestureDescription, GestureResultCallback

### Community 27 - "GoogleDriveSharedHarvester.kt"
Cohesion: 0.22
Nodes (8): AccessibilityService, Context, Rect, calendar, CoroutineScope, delay, isactive, locale

### Community 29 - "K.I.D.S. Android Collector (PRD)"
Cohesion: 0.22
Nodes (9): AI-Native Storage (JSONL & Markdown), 5-Point Cloud Health Probe, Google Credential Manager API, Memory Boundary Privacy Filter, K.I.D.S. Android Collector (PRD), Restricted Drive Scope (drive.file), Sequential 4-Step Onboarding, Streaming PdfRenderer OCR (+1 more)

### Community 30 - "ChildProfile"
Cohesion: 0.28
Nodes (7): ChildProfile, ChildCard(), ChildrenGridDashboard(), KidsTheme(), Composable, lightcolorscheme, materialtheme

### Community 31 - "PermissionSetupDialog.kt"
Cohesion: 0.22
Nodes (7): background, border, dialog, dp, lifecycle, lifecycleeventobserver, locallifecycleowner

### Community 32 - "Type.kt"
Cohesion: 0.22
Nodes (8): font, fontfamily, fontweight, googlefont, r, sp, textstyle, typography

### Community 33 - "DriveDeepLogger.kt"
Cohesion: 0.28
Nodes (5): DeviceInfo, DiagnosticSnapshot, DriveDeepLogger, PipelineMetrics, StepStatus

### Community 34 - "Entities.kt"
Cohesion: 0.25
Nodes (7): AttachmentEntity, ChildProfileEntity, NoticeFtsEntity, entity, fts4, index, primarykey

### Community 35 - "TypeConverters.kt"
Cohesion: 0.32
Nodes (5): Converters, ChannelConfig, encodetostring, json, typeconverter

### Community 39 - "WizardStep"
Cohesion: 0.33
Nodes (6): WizardStep, STEP_0_PERMISSIONS, STEP_1_VAULT, STEP_2_CLASSROOM, STEP_3_PORTALS, STEP_4_WHATSAPP

### Community 40 - "CrawlerTraceLogger.kt"
Cohesion: 0.33
Nodes (5): concurrentlinkedqueue, date, file, filewriter, printwriter

### Community 41 - "gradlew"
Cohesion: 0.83
Nodes (3): gradlew script, die(), warn()

## Knowledge Gaps
- **35 isolated node(s):** `CloudHealthReport`, `DeviceInfo`, `PipelineMetrics`, `StepStatus`, `AttachmentEntity` (+30 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 207 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **22 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `KidsAccessibilityService` connect `KidsAccessibilityService` to `GoogleDriveClient`, `.onNotificationPosted`, `KidsAccessibilityService.kt`, `OnboardingWizardScreen.kt`, `.matchesAttachmentChipText`, `ContentCategory`, `DeduplicationEngine`, `assertthat`, `GoogleDriveSharedHarvester.kt`?**
  _High betweenness centrality (0.238) - this node is a cross-community bridge._
- **Why does `ChildProfile` connect `ChildProfile` to `KidsAccessibilityService`, `GoogleDriveClient`, `MultiChildRouter`, `.onNotificationPosted`, `KidsAccessibilityService.kt`, `KotlinGraphifyEngine.kt`, `ChildrenGridDashboard.kt`, `Models.kt`?**
  _High betweenness centrality (0.090) - this node is a cross-community bridge._
- **Why does `OnboardingWizardScreen()` connect `GoogleDriveClient` to `TypeConverters.kt`, `MainActivity.kt`, `OnboardingWizardScreen.kt`, `ChildProfile`?**
  _High betweenness centrality (0.075) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `KidsAccessibilityService` (e.g. with `ContentClassifier` and `DeduplicationEngine`) actually correct?**
  _`KidsAccessibilityService` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Are the 6 inferred relationships involving `GoogleDriveClient` (e.g. with `.preWarmOAuthAndFolders()` and `.provisionStep1()`) actually correct?**
  _`GoogleDriveClient` has 6 INFERRED edges - model-reasoned connections that need verification._
- **What connects `CloudHealthReport`, `DeviceInfo`, `PipelineMetrics` to the rest of the system?**
  _35 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `KidsAccessibilityService` be split into smaller, more focused modules?**
  _Cohesion score 0.07690509583917718 - nodes in this community are weakly interconnected._