# Graph Report - K.I.D.S  (2026-09-27)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 768 nodes · 1719 edges · 50 communities (30 shown, 20 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 30 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `6aebd3fb`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- KidsAccessibilityService
- GoogleDriveClient
- Query
- MLKitOcrParser.kt
- ci_watch.py
- StreamManifest
- FloatingCrawlerOverlay
- KidsAccessibilityService.kt
- K.I.D.S. Android Collector (PRD)
- OnboardingWizardScreen
- GestureDescription
- OnboardingWizardScreen.kt
- ChildrenGridDashboard.kt
- .log
- FloatingCrawlerOverlay.kt
- KotlinGraphifyEngine.kt
- .matchesAttachmentChipText
- DriveVaultManager.kt
- DriveSyncWorker.kt
- MainActivity.kt
- Models.kt
- ChildProfile
- DeduplicationEngine
- assertthat
- PrivacyFilterTest
- log
- PermissionSetupDialog.kt
- Type.kt
- .fallbackNativeScroll
- GestureDescription
- ContentCategory
- WizardStep
- ContentClassifierTest
- ContentClassifier
- DeduplicationHashTest
- gradlew
- KidsApplication.kt
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
1. `KidsAccessibilityService` - 93 edges
2. `FloatingCrawlerOverlay` - 42 edges
3. `GoogleDriveClient` - 29 edges
4. `OnboardingWizardScreen()` - 23 edges
5. `ChildProfile` - 21 edges
6. `DriveVaultManager` - 18 edges
7. `NoticeDao` - 18 edges
8. `AttachmentDao` - 17 edges
9. `StreamManifest` - 17 edges
10. `CrawlerTraceLogger` - 16 edges

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

## Communities (50 total, 20 thin omitted)

### Community 0 - "KidsAccessibilityService"
Cohesion: 0.08
Nodes (9): AccessibilityNodeInfo, ExtractedAttachmentDetail, KidsAccessibilityService, UnvisitedCard, VisiblePendingCard, FloatingCrawlerOverlay, StreamManifest, StreamManifestItem (+1 more)

### Community 1 - "GoogleDriveClient"
Cohesion: 0.07
Nodes (26): DriveVaultManager, Failure, Context, Result, ProvisionStep1Result, Success, UserConsentRequired, ChannelVaultFolders (+18 more)

### Community 2 - "Query"
Cohesion: 0.07
Nodes (17): AttachmentDao, ChildProfileDao, AttachmentEntity, NoticeEntity, NoticeDao, KidsDatabase, Context, ChildProfileEntity (+9 more)

### Community 3 - "MLKitOcrParser.kt"
Cohesion: 0.07
Nodes (30): Activity, android, Context, Result, SafVaultFolders, SafVaultManager, MLKitOcrParser, OcrExtractionResult (+22 more)

### Community 4 - "ci_watch.py"
Cohesion: 0.06
Nodes (32): AttachmentEntity, ChildProfileEntity, NoticeEntity, NoticeFtsEntity, Converters, ChannelConfig, DeviceInfo, DiagnosticSnapshot (+24 more)

### Community 5 - "StreamManifest"
Cohesion: 0.08
Nodes (9): StreamItemStatus, ALREADY_SYNCED, COMPLETED, FAILED_SKIPPED, IN_PROGRESS, PENDING, StreamManifest, StreamManifestItem (+1 more)

### Community 7 - "KidsAccessibilityService.kt"
Cohesion: 0.11
Nodes (22): AccessibilityEvent, accessibilitymanager, accessibilityserviceinfo, AttachmentEntity, cancel, constraints, delay, existingworkpolicy (+14 more)

### Community 8 - "K.I.D.S. Android Collector (PRD)"
Cohesion: 0.09
Nodes (16): AI-Native Storage (JSONL & Markdown), ImportedNoticeRecord, WhatsAppChatExportParser, WhatsAppChatExportParserTest, Dual WhatsApp Catch-Up Engine, 5-Point Cloud Health Probe, Google Credential Manager API, inputstream (+8 more)

### Community 9 - "OnboardingWizardScreen"
Cohesion: 0.18
Nodes (11): androidx, Context, PermissionHelper, PermissionSetupDialog(), KidsTheme(), launchAccountPicker(), OnboardingWizardScreen(), Composable (+3 more)

### Community 10 - "GestureDescription"
Cohesion: 0.15
Nodes (7): GestureResultCallback, GestureResultCallback, GestureResultCallback, GestureResultCallback, GestureResultCallback, GestureDescription, GestureResultCallback

### Community 11 - "OnboardingWizardScreen.kt"
Cohesion: 0.11
Nodes (19): accountmanager, activityresultcontracts, getDefaultSchoolAppList(), Context, queryInstalledLauncherApps(), arrowback, backhandler, channelconfig (+11 more)

### Community 12 - "ChildrenGridDashboard.kt"
Cohesion: 0.16
Nodes (17): alignment, ProbeItem, DiagnosticFeedScreen(), LogLine, background, circleshape, clickable, clip (+9 more)

### Community 13 - ".log"
Cohesion: 0.20
Nodes (3): CrawlerTraceLogger, Context, Result

### Community 14 - "FloatingCrawlerOverlay.kt"
Cohesion: 0.12
Nodes (15): AccessibilityService, Button, gradientdrawable, gravity, handler, LinearLayout, looper, motionevent (+7 more)

### Community 15 - "KotlinGraphifyEngine.kt"
Cohesion: 0.22
Nodes (7): GraphEdge, GraphNode, KnowledgeGraph, KotlinGraphifyEngine, Attachment, Notice, KnowledgeGraphBuilderTest

### Community 17 - "DriveVaultManager.kt"
Cohesion: 0.13
Nodes (14): CompletableDeferred, concurrentlinkedqueue, coroutinescope, date, file, filewriter, googleaccountcredential, gsonfactory (+6 more)

### Community 18 - "DriveSyncWorker.kt"
Cohesion: 0.19
Nodes (11): add, DriveSyncWorker, AttachmentEntity, NoticeEntity, buildjsonarray, buildjsonobject, CoroutineWorker, put (+3 more)

### Community 19 - "MainActivity.kt"
Cohesion: 0.16
Nodes (13): AppScreen, DASHBOARD, DIAGNOSTICS, WIZARD, MainActivity, childprofile, ComponentActivity, KidsDatabase (+5 more)

### Community 20 - "Models.kt"
Cohesion: 0.15
Nodes (12): ChannelType, FILE_IMPORT, GOOGLE_CLASSROOM, SCHOOL_ERP, WHATSAPP, CloudHealthReport, SyncStatus, DROPPED (+4 more)

### Community 21 - "ChildProfile"
Cohesion: 0.21
Nodes (6): ChildProfile, MultiChildRouter, ChildCard(), ChildrenGridDashboard(), StatusBarNotification, MultiChildAttributionTest

### Community 22 - "DeduplicationEngine"
Cohesion: 0.21
Nodes (7): DownloadFolderObserver, Context, DeduplicationEngine, dispatchers, environment, messagedigest, withcontext

### Community 23 - "assertthat"
Cohesion: 0.36
Nodes (4): assertthat, beforeeach, bytearrayinputstream, test

### Community 25 - "log"
Cohesion: 0.27
Nodes (7): BootReceiver, Context, BroadcastReceiver, Intent, log, notificationmanagercompat, settings

### Community 26 - "PermissionSetupDialog.kt"
Cohesion: 0.22
Nodes (7): border, dialog, dp, lifecycle, lifecycleeventobserver, locallifecycleowner, roundedcornershape

### Community 27 - "Type.kt"
Cohesion: 0.22
Nodes (8): font, fontfamily, fontweight, googlefont, r, sp, textstyle, typography

### Community 29 - "GestureDescription"
Cohesion: 0.36
Nodes (4): GestureResultCallback, GestureResultCallback, GestureDescription, GestureResultCallback

### Community 30 - "ContentCategory"
Cohesion: 0.33
Nodes (6): ContentCategory, ATTENDANCE, CIRCULAR, FEES, HOMEWORK, UNKNOWN

### Community 31 - "WizardStep"
Cohesion: 0.33
Nodes (6): WizardStep, STEP_0_PERMISSIONS, STEP_1_VAULT, STEP_2_CLASSROOM, STEP_3_PORTALS, STEP_4_WHATSAPP

### Community 33 - "ContentClassifier"
Cohesion: 0.40
Nodes (3): ContentClassifier, KidsNotificationListenerService, NotificationListenerService

### Community 35 - "gradlew"
Cohesion: 0.83
Nodes (3): gradlew script, die(), warn()

## Knowledge Gaps
- **36 isolated node(s):** `CloudHealthReport`, `AttachmentEntity`, `NoticeFtsEntity`, `DeviceInfo`, `PipelineMetrics` (+31 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 204 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **20 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `KidsAccessibilityService` connect `KidsAccessibilityService` to `ContentClassifier`, `MLKitOcrParser.kt`, `KidsAccessibilityService.kt`, `OnboardingWizardScreen.kt`, `FloatingCrawlerOverlay.kt`, `.matchesAttachmentChipText`, `DeduplicationEngine`, `assertthat`?**
  _High betweenness centrality (0.245) - this node is a cross-community bridge._
- **Why does `ChildProfile` connect `ChildProfile` to `KidsAccessibilityService`, `KidsAccessibilityService.kt`, `OnboardingWizardScreen`, `ChildrenGridDashboard.kt`, `KotlinGraphifyEngine.kt`, `Models.kt`, `assertthat`?**
  _High betweenness centrality (0.100) - this node is a cross-community bridge._
- **Why does `OnboardingWizardScreen()` connect `OnboardingWizardScreen` to `GoogleDriveClient`, `ci_watch.py`, `OnboardingWizardScreen.kt`, `MainActivity.kt`, `ChildProfile`?**
  _High betweenness centrality (0.088) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `KidsAccessibilityService` (e.g. with `ContentClassifier` and `DeduplicationEngine`) actually correct?**
  _`KidsAccessibilityService` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Are the 6 inferred relationships involving `GoogleDriveClient` (e.g. with `.preWarmOAuthAndFolders()` and `.provisionStep1()`) actually correct?**
  _`GoogleDriveClient` has 6 INFERRED edges - model-reasoned connections that need verification._
- **What connects `CloudHealthReport`, `AttachmentEntity`, `NoticeFtsEntity` to the rest of the system?**
  _36 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `KidsAccessibilityService` be split into smaller, more focused modules?**
  _Cohesion score 0.08307210031347963 - nodes in this community are weakly interconnected._