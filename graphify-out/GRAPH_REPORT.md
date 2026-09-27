# Graph Report - K.I.D.S  (2026-09-27)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 763 nodes · 1699 edges · 51 communities (32 shown, 19 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 30 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `582470b4`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- KidsAccessibilityService
- GoogleDriveClient
- Query
- MLKitOcrParser.kt
- StreamManifest
- ci_watch.py
- KidsAccessibilityService.kt
- FloatingCrawlerOverlay
- ChildrenGridDashboard.kt
- OnboardingWizardScreen.kt
- .log
- FloatingCrawlerOverlay.kt
- MainActivity.kt
- KotlinGraphifyEngine.kt
- .matchesAttachmentChipText
- GestureDescription
- DriveVaultManager.kt
- ContentCategory
- OnboardingWizardScreen
- DriveSyncWorker.kt
- WhatsAppChatExportParser.kt
- Models.kt
- ChildProfile
- assertthat
- PrivacyFilterTest
- DriveDeepLogger.kt
- K.I.D.S. Android Collector (PRD)
- dispatchers
- .onCreate
- log
- Type.kt
- DeduplicationEngine
- .fallbackNativeScroll
- GestureDescription
- WizardStep
- .fallbackNativeScrollBackward
- DeduplicationHashTest
- gradlew
- java
- Bundle
- Result
- AccessibilityNodeInfo
- Context
- GestureDescription
- GestureResultCallback
- ChildVaultFolders
- role
- statusbarnotification

## God Nodes (most connected - your core abstractions)
1. `KidsAccessibilityService` - 91 edges
2. `FloatingCrawlerOverlay` - 42 edges
3. `GoogleDriveClient` - 27 edges
4. `OnboardingWizardScreen()` - 23 edges
5. `ChildProfile` - 21 edges
6. `DriveVaultManager` - 18 edges
7. `CrawlerTraceLogger` - 17 edges
8. `NoticeDao` - 17 edges
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

## Communities (51 total, 19 thin omitted)

### Community 0 - "KidsAccessibilityService"
Cohesion: 0.09
Nodes (9): AccessibilityNodeInfo, ExtractedAttachmentDetail, KidsAccessibilityService, UnvisitedCard, VisiblePendingCard, FloatingCrawlerOverlay, StreamManifest, StreamManifestItem (+1 more)

### Community 1 - "GoogleDriveClient"
Cohesion: 0.07
Nodes (24): DriveVaultManager, Failure, Context, Result, ProvisionStep1Result, Success, UserConsentRequired, ChannelVaultFolders (+16 more)

### Community 2 - "Query"
Cohesion: 0.08
Nodes (17): AttachmentDao, ChildProfileDao, AttachmentEntity, NoticeEntity, NoticeDao, KidsDatabase, Context, ChildProfileEntity (+9 more)

### Community 3 - "MLKitOcrParser.kt"
Cohesion: 0.07
Nodes (30): android, Context, Result, SafVaultFolders, SafVaultManager, MLKitOcrParser, OcrExtractionResult, Bundle (+22 more)

### Community 4 - "StreamManifest"
Cohesion: 0.08
Nodes (9): StreamItemStatus, ALREADY_SYNCED, COMPLETED, FAILED_SKIPPED, IN_PROGRESS, PENDING, StreamManifest, StreamManifestItem (+1 more)

### Community 5 - "ci_watch.py"
Cohesion: 0.08
Nodes (27): AttachmentEntity, ChildProfileEntity, NoticeEntity, NoticeFtsEntity, Converters, ChannelConfig, encodetostring, entity (+19 more)

### Community 6 - "KidsAccessibilityService.kt"
Cohesion: 0.10
Nodes (26): AccessibilityEvent, accessibilitymanager, accessibilityserviceinfo, Activity, KidsNotificationListenerService, StatusBarNotification, AttachmentEntity, cancel (+18 more)

### Community 8 - "ChildrenGridDashboard.kt"
Cohesion: 0.13
Nodes (21): alignment, background, border, circleshape, clickable, clip, contentdescription, dialog (+13 more)

### Community 9 - "OnboardingWizardScreen.kt"
Cohesion: 0.11
Nodes (19): accountmanager, activityresultcontracts, getDefaultSchoolAppList(), Context, queryInstalledLauncherApps(), arrowback, backhandler, channelconfig (+11 more)

### Community 10 - ".log"
Cohesion: 0.20
Nodes (3): CrawlerTraceLogger, Context, Result

### Community 11 - "FloatingCrawlerOverlay.kt"
Cohesion: 0.12
Nodes (15): AccessibilityService, Button, gradientdrawable, gravity, handler, LinearLayout, looper, motionevent (+7 more)

### Community 12 - "MainActivity.kt"
Cohesion: 0.12
Nodes (15): androidx, AppScreen, DASHBOARD, DIAGNOSTICS, WIZARD, launchAccountPicker(), childprofile, Intent (+7 more)

### Community 13 - "KotlinGraphifyEngine.kt"
Cohesion: 0.22
Nodes (7): GraphEdge, GraphNode, KnowledgeGraph, KotlinGraphifyEngine, Attachment, Notice, KnowledgeGraphBuilderTest

### Community 15 - "GestureDescription"
Cohesion: 0.19
Nodes (7): GestureResultCallback, GestureResultCallback, GestureResultCallback, GestureResultCallback, GestureResultCallback, GestureDescription, GestureResultCallback

### Community 16 - "DriveVaultManager.kt"
Cohesion: 0.14
Nodes (13): CompletableDeferred, concurrentlinkedqueue, coroutinescope, date, filewriter, googleaccountcredential, gsonfactory, locale (+5 more)

### Community 17 - "ContentCategory"
Cohesion: 0.14
Nodes (8): ContentClassifier, ContentCategory, ATTENDANCE, CIRCULAR, FEES, HOMEWORK, UNKNOWN, ContentClassifierTest

### Community 18 - "OnboardingWizardScreen"
Cohesion: 0.33
Nodes (5): Context, PermissionHelper, PermissionSetupDialog(), OnboardingWizardScreen(), OptIn

### Community 19 - "DriveSyncWorker.kt"
Cohesion: 0.19
Nodes (11): add, DriveSyncWorker, AttachmentEntity, NoticeEntity, buildjsonarray, buildjsonobject, CoroutineWorker, put (+3 more)

### Community 20 - "WhatsAppChatExportParser.kt"
Cohesion: 0.16
Nodes (7): ImportedNoticeRecord, WhatsAppChatExportParser, WhatsAppChatExportParserTest, Dual WhatsApp Catch-Up Engine, inputstream, pattern, simpledateformat

### Community 21 - "Models.kt"
Cohesion: 0.15
Nodes (12): ChannelType, FILE_IMPORT, GOOGLE_CLASSROOM, SCHOOL_ERP, WHATSAPP, CloudHealthReport, SyncStatus, DROPPED (+4 more)

### Community 22 - "ChildProfile"
Cohesion: 0.22
Nodes (5): ChildProfile, MultiChildRouter, ChildCard(), ChildrenGridDashboard(), MultiChildAttributionTest

### Community 23 - "assertthat"
Cohesion: 0.36
Nodes (4): assertthat, beforeeach, bytearrayinputstream, test

### Community 25 - "DriveDeepLogger.kt"
Cohesion: 0.24
Nodes (6): DeviceInfo, DiagnosticSnapshot, DriveDeepLogger, PipelineMetrics, StepStatus, file

### Community 26 - "K.I.D.S. Android Collector (PRD)"
Cohesion: 0.22
Nodes (9): AI-Native Storage (JSONL & Markdown), 5-Point Cloud Health Probe, Google Credential Manager API, Memory Boundary Privacy Filter, K.I.D.S. Android Collector (PRD), Restricted Drive Scope (drive.file), Sequential 4-Step Onboarding, Streaming PdfRenderer OCR (+1 more)

### Community 27 - "dispatchers"
Cohesion: 0.25
Nodes (7): DownloadFolderObserver, Context, MainActivity, ComponentActivity, dispatchers, environment, KidsDatabase

### Community 28 - ".onCreate"
Cohesion: 0.22
Nodes (7): ProbeItem, DiagnosticFeedScreen(), LogLine, KidsTheme(), Composable, lightcolorscheme, materialtheme

### Community 29 - "log"
Cohesion: 0.31
Nodes (6): KidsApplication, BootReceiver, Context, Application, BroadcastReceiver, log

### Community 30 - "Type.kt"
Cohesion: 0.22
Nodes (8): font, fontfamily, fontweight, googlefont, r, sp, textstyle, typography

### Community 31 - "DeduplicationEngine"
Cohesion: 0.29
Nodes (4): DeduplicationEngine, java, ByteArray, messagedigest

### Community 33 - "GestureDescription"
Cohesion: 0.36
Nodes (4): GestureResultCallback, GestureResultCallback, GestureDescription, GestureResultCallback

### Community 34 - "WizardStep"
Cohesion: 0.33
Nodes (6): WizardStep, STEP_0_PERMISSIONS, STEP_1_VAULT, STEP_2_CLASSROOM, STEP_3_PORTALS, STEP_4_WHATSAPP

### Community 37 - "gradlew"
Cohesion: 0.83
Nodes (3): gradlew script, die(), warn()

## Knowledge Gaps
- **36 isolated node(s):** `CloudHealthReport`, `DeviceInfo`, `PipelineMetrics`, `StepStatus`, `NoticeEntity` (+31 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 205 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **19 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `KidsAccessibilityService` connect `KidsAccessibilityService` to `MLKitOcrParser.kt`, `KidsAccessibilityService.kt`, `OnboardingWizardScreen.kt`, `FloatingCrawlerOverlay.kt`, `.matchesAttachmentChipText`, `ContentCategory`, `ChildProfile`, `assertthat`, `DeduplicationEngine`?**
  _High betweenness centrality (0.249) - this node is a cross-community bridge._
- **Why does `ChildProfile` connect `ChildProfile` to `KidsAccessibilityService`, `KidsAccessibilityService.kt`, `ChildrenGridDashboard.kt`, `KotlinGraphifyEngine.kt`, `OnboardingWizardScreen`, `Models.kt`, `assertthat`, `.onCreate`?**
  _High betweenness centrality (0.103) - this node is a cross-community bridge._
- **Why does `OnboardingWizardScreen()` connect `OnboardingWizardScreen` to `GoogleDriveClient`, `ci_watch.py`, `OnboardingWizardScreen.kt`, `MainActivity.kt`, `ChildProfile`, `.onCreate`?**
  _High betweenness centrality (0.094) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `KidsAccessibilityService` (e.g. with `ContentClassifier` and `DeduplicationEngine`) actually correct?**
  _`KidsAccessibilityService` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Are the 6 inferred relationships involving `GoogleDriveClient` (e.g. with `.preWarmOAuthAndFolders()` and `.provisionStep1()`) actually correct?**
  _`GoogleDriveClient` has 6 INFERRED edges - model-reasoned connections that need verification._
- **What connects `CloudHealthReport`, `DeviceInfo`, `PipelineMetrics` to the rest of the system?**
  _36 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `KidsAccessibilityService` be split into smaller, more focused modules?**
  _Cohesion score 0.08599439775910364 - nodes in this community are weakly interconnected._