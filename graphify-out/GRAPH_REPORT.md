# Graph Report - K.I.D.S  (2026-09-22)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 621 nodes · 1266 edges · 40 communities (26 shown, 14 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 28 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `a80055de`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- OnboardingWizardScreen.kt
- GoogleDriveClient
- KidsAccessibilityService
- FloatingCrawlerOverlay
- NoticeDao
- ci_watch.py
- MLKitOcrParser.kt
- OnboardingWizardScreen
- KidsAccessibilityService.kt
- K.I.D.S. Android Collector (PRD)
- DriveVaultManager.kt
- SafVaultManager.kt
- KotlinGraphifyEngine.kt
- StreamManifest
- ContentCategory
- AttachmentDao
- .onNotificationPosted
- Models.kt
- MainActivity.kt
- DriveSyncWorker.kt
- ChildProfile
- assertthat
- DriveDeepLogger.kt
- DeduplicationEngine
- .onCreate
- GestureResultCallback
- gradlew
- AccessibilityNodeInfo
- java
- Bundle
- ChildVaultFolders
- FloatingCrawlerOverlay
- GestureDescription
- provisionstep1result
- Result
- role
- statusbarnotification

## God Nodes (most connected - your core abstractions)
1. `KidsAccessibilityService` - 56 edges
2. `FloatingCrawlerOverlay` - 35 edges
3. `GoogleDriveClient` - 24 edges
4. `ChildProfile` - 21 edges
5. `OnboardingWizardScreen()` - 19 edges
6. `NoticeDao` - 16 edges
7. `AttachmentDao` - 14 edges
8. `DriveVaultManager` - 13 edges
9. `ContentCategory` - 13 edges
10. `PermissionHelper` - 12 edges

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

## Communities (40 total, 14 thin omitted)

### Community 0 - "OnboardingWizardScreen.kt"
Cohesion: 0.05
Nodes (53): accountmanager, activityresultcontracts, alignment, ProbeItem, DiagnosticFeedScreen(), LogLine, getDefaultSchoolAppList(), Context (+45 more)

### Community 1 - "GoogleDriveClient"
Cohesion: 0.07
Nodes (26): DriveVaultManager, Failure, Context, Result, ProvisionStep1Result, Success, UserConsentRequired, ChannelVaultFolders (+18 more)

### Community 2 - "KidsAccessibilityService"
Cohesion: 0.11
Nodes (6): AccessibilityEvent, ExtractedAttachmentDetail, KidsAccessibilityService, AccessibilityNodeInfo, Context, UnvisitedCard

### Community 3 - "FloatingCrawlerOverlay"
Cohesion: 0.07
Nodes (21): AccessibilityService, FloatingCrawlerOverlay, GestureResultCallback, GestureResultCallback, AccessibilityNodeInfo, GestureDescription, GestureResultCallback, Button (+13 more)

### Community 4 - "NoticeDao"
Cohesion: 0.09
Nodes (10): ChildProfileDao, NoticeDao, KidsDatabase, Context, ChildProfileEntity, database, Flow, NoticeEntity (+2 more)

### Community 5 - "ci_watch.py"
Cohesion: 0.08
Nodes (27): AttachmentEntity, ChildProfileEntity, NoticeEntity, NoticeFtsEntity, Converters, ChannelConfig, encodetostring, entity (+19 more)

### Community 6 - "MLKitOcrParser.kt"
Cohesion: 0.09
Nodes (20): MLKitOcrParser, OcrExtractionResult, Bundle, StatusBarNotification, NotificationParser, ParsedNotification, NotificationParserTest, Bitmap (+12 more)

### Community 7 - "OnboardingWizardScreen"
Cohesion: 0.17
Nodes (12): androidx, Context, PermissionHelper, PermissionSetupDialog(), launchAccountPicker(), OnboardingWizardScreen(), BootReceiver, Context (+4 more)

### Community 8 - "KidsAccessibilityService.kt"
Cohesion: 0.13
Nodes (20): accessibilitymanager, accessibilityserviceinfo, constraints, delay, existingworkpolicy, fileoutputstream, firstornull, isactive (+12 more)

### Community 9 - "K.I.D.S. Android Collector (PRD)"
Cohesion: 0.09
Nodes (16): AI-Native Storage (JSONL & Markdown), ImportedNoticeRecord, WhatsAppChatExportParser, WhatsAppChatExportParserTest, Dual WhatsApp Catch-Up Engine, 5-Point Cloud Health Probe, Google Credential Manager API, inputstream (+8 more)

### Community 10 - "DriveVaultManager.kt"
Cohesion: 0.13
Nodes (14): KidsApplication, CrawlerTraceLogger, Context, Application, concurrentlinkedqueue, coroutinescope, date, googleaccountcredential (+6 more)

### Community 11 - "SafVaultManager.kt"
Cohesion: 0.27
Nodes (8): Activity, Context, Result, SafVaultFolders, SafVaultManager, ShareTargetActivity, DocumentFile, Uri

### Community 12 - "KotlinGraphifyEngine.kt"
Cohesion: 0.22
Nodes (7): GraphEdge, GraphNode, KnowledgeGraph, KotlinGraphifyEngine, Attachment, Notice, KnowledgeGraphBuilderTest

### Community 13 - "StreamManifest"
Cohesion: 0.17
Nodes (8): StreamItemStatus, ALREADY_SYNCED, COMPLETED, FAILED_SKIPPED, IN_PROGRESS, PENDING, StreamManifest, StreamManifestItem

### Community 14 - "ContentCategory"
Cohesion: 0.15
Nodes (8): ContentClassifier, ContentCategory, ATTENDANCE, CIRCULAR, FEES, HOMEWORK, UNKNOWN, ContentClassifierTest

### Community 16 - ".onNotificationPosted"
Cohesion: 0.17
Nodes (3): PrivacyFilter, StatusBarNotification, PrivacyFilterTest

### Community 17 - "Models.kt"
Cohesion: 0.15
Nodes (12): ChannelType, FILE_IMPORT, GOOGLE_CLASSROOM, SCHOOL_ERP, WHATSAPP, CloudHealthReport, SyncStatus, DROPPED (+4 more)

### Community 18 - "MainActivity.kt"
Cohesion: 0.18
Nodes (12): AppScreen, DASHBOARD, DIAGNOSTICS, WIZARD, MainActivity, childprofile, ComponentActivity, KidsDatabase (+4 more)

### Community 19 - "DriveSyncWorker.kt"
Cohesion: 0.20
Nodes (10): Context, DriveSyncWorker, buildjsonobject, CoroutineWorker, dispatchers, environment, put, syncstatus (+2 more)

### Community 20 - "ChildProfile"
Cohesion: 0.24
Nodes (5): ChildProfile, MultiChildRouter, ChildCard(), ChildrenGridDashboard(), MultiChildAttributionTest

### Community 21 - "assertthat"
Cohesion: 0.25
Nodes (5): DeduplicationHashTest, assertthat, beforeeach, bytearrayinputstream, test

### Community 22 - "DriveDeepLogger.kt"
Cohesion: 0.24
Nodes (6): DeviceInfo, DiagnosticSnapshot, DriveDeepLogger, PipelineMetrics, StepStatus, file

### Community 23 - "DeduplicationEngine"
Cohesion: 0.25
Nodes (6): DownloadFolderObserver, DeduplicationEngine, java, KidsNotificationListenerService, ByteArray, NotificationListenerService

### Community 24 - ".onCreate"
Cohesion: 0.33
Nodes (4): KidsTheme(), composable, lightcolorscheme, materialtheme

### Community 25 - "GestureResultCallback"
Cohesion: 0.50
Nodes (3): GestureResultCallback, GestureDescription, GestureResultCallback

### Community 26 - "gradlew"
Cohesion: 0.83
Nodes (3): gradlew script, die(), warn()

## Knowledge Gaps
- **36 isolated node(s):** `CloudHealthReport`, `DeviceInfo`, `PipelineMetrics`, `StepStatus`, `AttachmentEntity` (+31 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 188 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **14 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `KidsAccessibilityService` connect `KidsAccessibilityService` to `KidsAccessibilityService.kt`, `FloatingCrawlerOverlay`, `ContentCategory`, `DeduplicationEngine`?**
  _High betweenness centrality (0.153) - this node is a cross-community bridge._
- **Why does `ChildProfile` connect `ChildProfile` to `OnboardingWizardScreen.kt`, `KidsAccessibilityService`, `OnboardingWizardScreen`, `KidsAccessibilityService.kt`, `KotlinGraphifyEngine.kt`, `.onNotificationPosted`, `Models.kt`, `.onCreate`?**
  _High betweenness centrality (0.115) - this node is a cross-community bridge._
- **Why does `OnboardingWizardScreen()` connect `OnboardingWizardScreen` to `OnboardingWizardScreen.kt`, `GoogleDriveClient`, `ci_watch.py`, `MainActivity.kt`, `ChildProfile`, `.onCreate`?**
  _High betweenness centrality (0.086) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `KidsAccessibilityService` (e.g. with `ContentClassifier` and `DeduplicationEngine`) actually correct?**
  _`KidsAccessibilityService` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Are the 4 inferred relationships involving `GoogleDriveClient` (e.g. with `.provisionStep1()` and `.provisionStep2Classroom()`) actually correct?**
  _`GoogleDriveClient` has 4 INFERRED edges - model-reasoned connections that need verification._
- **Are the 4 inferred relationships involving `ChildProfile` (e.g. with `.onCreate()` and `OnboardingWizardScreen()`) actually correct?**
  _`ChildProfile` has 4 INFERRED edges - model-reasoned connections that need verification._
- **What connects `CloudHealthReport`, `DeviceInfo`, `PipelineMetrics` to the rest of the system?**
  _36 weakly-connected nodes found - possible documentation gaps or missing edges._