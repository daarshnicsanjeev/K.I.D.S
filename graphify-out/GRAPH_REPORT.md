# Graph Report - K.I.D.S  (2026-09-26)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 756 nodes · 1663 edges · 54 communities (28 shown, 26 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 33 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `2de9e930`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- KidsAccessibilityService
- OnboardingWizardScreen.kt
- NoticeDao
- OnboardingWizardScreen
- ci_watch.py
- StreamManifest
- GoogleDriveClient
- GestureDescription
- FloatingCrawlerOverlay
- SafVaultManager.kt
- K.I.D.S. Android Collector (PRD)
- MLKitOcrParser.kt
- FloatingCrawlerOverlay.kt
- KotlinGraphifyEngine.kt
- .log
- .matchesAttachmentChipText
- DriveVaultManager.kt
- ShareTargetActivity.kt
- DriveSyncWorker.kt
- ContentCategory
- ChildProfile
- MainActivity.kt
- NotificationParserTest.kt
- Models.kt
- log
- KidsAccessibilityService.kt
- DeduplicationEngine
- PrivacyFilterTest
- GestureDescription
- dispatchers
- KidsTheme.kt
- gradlew
- KidsApplication.kt
- NotificationParserTest
- java
- Bundle
- AttachmentEntity
- NoticeEntity
- AccessibilityNodeInfo
- Context
- GestureDescription
- GestureResultCallback
- ChildVaultFolders
- provisionstep1result
- Result
- role
- statusbarnotification
- streamitemstatus
- StreamManifest
- StreamManifestItem

## God Nodes (most connected - your core abstractions)
1. `KidsAccessibilityService` - 91 edges
2. `FloatingCrawlerOverlay` - 42 edges
3. `GoogleDriveClient` - 28 edges
4. `ChildProfile` - 21 edges
5. `StreamManifest` - 21 edges
6. `OnboardingWizardScreen()` - 21 edges
7. `DriveVaultManager` - 19 edges
8. `CrawlerTraceLogger` - 17 edges
9. `AttachmentChipMatcherTest` - 16 edges
10. `NoticeDao` - 16 edges

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

## Communities (54 total, 26 thin omitted)

### Community 0 - "KidsAccessibilityService"
Cohesion: 0.08
Nodes (8): AccessibilityNodeInfo, NoticeEntity, ExtractedAttachmentDetail, KidsAccessibilityService, UnvisitedCard, VisiblePendingCard, FloatingCrawlerOverlay, Volatile

### Community 1 - "OnboardingWizardScreen.kt"
Cohesion: 0.05
Nodes (56): accountmanager, activityresultcontracts, alignment, ProbeItem, DiagnosticFeedScreen(), LogLine, getDefaultSchoolAppList(), Context (+48 more)

### Community 2 - "NoticeDao"
Cohesion: 0.06
Nodes (12): AttachmentDao, ChildProfileDao, AttachmentEntity, NoticeEntity, NoticeDao, KidsDatabase, Context, ChildProfileEntity (+4 more)

### Community 3 - "OnboardingWizardScreen"
Cohesion: 0.13
Nodes (16): DriveVaultManager, Failure, Context, Result, ProvisionStep1Result, Success, UserConsentRequired, ChildVaultFolders (+8 more)

### Community 4 - "ci_watch.py"
Cohesion: 0.07
Nodes (31): AttachmentEntity, ChildProfileEntity, NoticeFtsEntity, Converters, ChannelConfig, DeviceInfo, DiagnosticSnapshot, DriveDeepLogger (+23 more)

### Community 5 - "StreamManifest"
Cohesion: 0.08
Nodes (9): StreamItemStatus, ALREADY_SYNCED, COMPLETED, FAILED_SKIPPED, IN_PROGRESS, PENDING, StreamManifest, StreamManifestItem (+1 more)

### Community 6 - "GoogleDriveClient"
Cohesion: 0.09
Nodes (13): ChannelVaultFolders, DriveQuotaInfo, GoogleDriveClient, async, bytearraycontent, bytearrayoutputstream, concurrenthashmap, Drive (+5 more)

### Community 7 - "GestureDescription"
Cohesion: 0.11
Nodes (8): GestureResultCallback, GestureResultCallback, GestureResultCallback, GestureResultCallback, GestureResultCallback, GestureResultCallback, GestureDescription, GestureResultCallback

### Community 9 - "SafVaultManager.kt"
Cohesion: 0.20
Nodes (9): Activity, android, Context, Result, SafVaultFolders, SafVaultManager, ShareTargetActivity, DocumentFile (+1 more)

### Community 10 - "K.I.D.S. Android Collector (PRD)"
Cohesion: 0.09
Nodes (16): AI-Native Storage (JSONL & Markdown), ImportedNoticeRecord, WhatsAppChatExportParser, WhatsAppChatExportParserTest, Dual WhatsApp Catch-Up Engine, 5-Point Cloud Health Probe, Google Credential Manager API, inputstream (+8 more)

### Community 11 - "MLKitOcrParser.kt"
Cohesion: 0.12
Nodes (16): MLKitOcrParser, OcrExtractionResult, Bundle, StatusBarNotification, ParsedNotification, Bitmap, build, inputimage (+8 more)

### Community 12 - "FloatingCrawlerOverlay.kt"
Cohesion: 0.11
Nodes (16): AccessibilityService, AccessibilityNodeInfo, Button, gradientdrawable, gravity, handler, LinearLayout, looper (+8 more)

### Community 13 - "KotlinGraphifyEngine.kt"
Cohesion: 0.22
Nodes (7): GraphEdge, GraphNode, KnowledgeGraph, KotlinGraphifyEngine, Attachment, Notice, KnowledgeGraphBuilderTest

### Community 16 - "DriveVaultManager.kt"
Cohesion: 0.13
Nodes (14): CompletableDeferred, concurrentlinkedqueue, coroutinescope, date, file, filewriter, googleaccountcredential, gsonfactory (+6 more)

### Community 17 - "ShareTargetActivity.kt"
Cohesion: 0.17
Nodes (14): NotificationParser, KidsNotificationListenerService, cancel, constraints, existingworkpolicy, fileoutputstream, firstornull, networktype (+6 more)

### Community 18 - "DriveSyncWorker.kt"
Cohesion: 0.17
Nodes (12): add, DriveSyncWorker, AttachmentEntity, buildjsonarray, buildjsonobject, Context, CoroutineWorker, NoticeEntity (+4 more)

### Community 19 - "ContentCategory"
Cohesion: 0.14
Nodes (8): ContentClassifier, ContentCategory, ATTENDANCE, CIRCULAR, FEES, HOMEWORK, UNKNOWN, ContentClassifierTest

### Community 20 - "ChildProfile"
Cohesion: 0.20
Nodes (6): ChildProfile, MultiChildRouter, ChildCard(), ChildrenGridDashboard(), StatusBarNotification, MultiChildAttributionTest

### Community 21 - "MainActivity.kt"
Cohesion: 0.16
Nodes (13): AppScreen, DASHBOARD, DIAGNOSTICS, WIZARD, MainActivity, childprofile, ComponentActivity, KidsDatabase (+5 more)

### Community 22 - "NotificationParserTest.kt"
Cohesion: 0.29
Nodes (6): assertthat, beforeeach, Bundle, bytearrayinputstream, every, test

### Community 23 - "Models.kt"
Cohesion: 0.15
Nodes (12): ChannelType, FILE_IMPORT, GOOGLE_CLASSROOM, SCHOOL_ERP, WHATSAPP, CloudHealthReport, SyncStatus, DROPPED (+4 more)

### Community 24 - "log"
Cohesion: 0.21
Nodes (9): androidx, launchAccountPicker(), BootReceiver, Context, BroadcastReceiver, Intent, log, notificationmanagercompat (+1 more)

### Community 25 - "KidsAccessibilityService.kt"
Cohesion: 0.20
Nodes (9): AccessibilityEvent, accessibilitymanager, accessibilityserviceinfo, delay, intentfilter, isactive, Job, messagedigest (+1 more)

### Community 26 - "DeduplicationEngine"
Cohesion: 0.22
Nodes (4): DeduplicationEngine, java, DeduplicationHashTest, ByteArray

### Community 28 - "GestureDescription"
Cohesion: 0.36
Nodes (4): GestureResultCallback, GestureResultCallback, GestureDescription, GestureResultCallback

### Community 29 - "dispatchers"
Cohesion: 0.33
Nodes (5): DownloadFolderObserver, Context, dispatchers, environment, withcontext

### Community 30 - "KidsTheme.kt"
Cohesion: 0.40
Nodes (4): KidsTheme(), composable, lightcolorscheme, materialtheme

### Community 31 - "gradlew"
Cohesion: 0.83
Nodes (3): gradlew script, die(), warn()

## Knowledge Gaps
- **34 isolated node(s):** `CloudHealthReport`, `NoticeFtsEntity`, `DeviceInfo`, `PipelineMetrics`, `StepStatus` (+29 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 213 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **26 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `KidsAccessibilityService` connect `KidsAccessibilityService` to `OnboardingWizardScreen.kt`, `SafVaultManager.kt`, `FloatingCrawlerOverlay.kt`, `.matchesAttachmentChipText`, `ContentCategory`, `NotificationParserTest.kt`, `KidsAccessibilityService.kt`, `DeduplicationEngine`?**
  _High betweenness centrality (0.239) - this node is a cross-community bridge._
- **Why does `ChildProfile` connect `ChildProfile` to `KidsAccessibilityService`, `OnboardingWizardScreen.kt`, `OnboardingWizardScreen`, `KotlinGraphifyEngine.kt`, `ShareTargetActivity.kt`, `NotificationParserTest.kt`, `Models.kt`?**
  _High betweenness centrality (0.091) - this node is a cross-community bridge._
- **Why does `KidsDatabase` connect `NoticeDao` to `KidsAccessibilityService`?**
  _High betweenness centrality (0.083) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `KidsAccessibilityService` (e.g. with `ContentClassifier` and `DeduplicationEngine`) actually correct?**
  _`KidsAccessibilityService` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Are the 6 inferred relationships involving `GoogleDriveClient` (e.g. with `.preWarmOAuthAndFolders()` and `.provisionStep1()`) actually correct?**
  _`GoogleDriveClient` has 6 INFERRED edges - model-reasoned connections that need verification._
- **Are the 4 inferred relationships involving `ChildProfile` (e.g. with `.onCreate()` and `OnboardingWizardScreen()`) actually correct?**
  _`ChildProfile` has 4 INFERRED edges - model-reasoned connections that need verification._
- **What connects `CloudHealthReport`, `NoticeFtsEntity`, `DeviceInfo` to the rest of the system?**
  _34 weakly-connected nodes found - possible documentation gaps or missing edges._