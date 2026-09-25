# Graph Report - K.I.D.S  (2026-09-25)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 744 nodes · 1628 edges · 53 communities (34 shown, 19 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 33 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `87398c27`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- KidsAccessibilityService
- GoogleDriveClient
- NoticeDao
- assertthat
- StreamManifest
- MLKitOcrParser.kt
- ChildrenGridDashboard.kt
- GestureDescription
- FloatingCrawlerOverlay
- K.I.D.S. Android Collector (PRD)
- SafVaultManager.kt
- OnboardingWizardScreen.kt
- FloatingCrawlerOverlay.kt
- DriveVaultManager.kt
- KotlinGraphifyEngine.kt
- .log
- MainActivity.kt
- ci_watch.py
- DriveSyncWorker.kt
- OnboardingWizardScreen
- KidsAccessibilityService.kt
- Models.kt
- KidsNotificationListenerService.kt
- .matchesAttachmentChipText
- ChildProfile
- Type.kt
- DriveDeepLogger.kt
- Entities.kt
- TypeConverters.kt
- dispatchers
- ShareTargetActivity.kt
- GestureDescription
- DeduplicationEngine
- ContentCategory
- WizardStep
- Intent
- gradlew
- KidsApplication.kt
- java
- Bundle
- AccessibilityNodeInfo
- Context
- GestureDescription
- GestureResultCallback
- ChildVaultFolders
- provisionstep1result
- Result
- role
- statusbarnotification

## God Nodes (most connected - your core abstractions)
1. `KidsAccessibilityService` - 87 edges
2. `FloatingCrawlerOverlay` - 42 edges
3. `GoogleDriveClient` - 26 edges
4. `ChildProfile` - 21 edges
5. `OnboardingWizardScreen()` - 21 edges
6. `DriveVaultManager` - 19 edges
7. `CrawlerTraceLogger` - 18 edges
8. `NoticeDao` - 16 edges
9. `StreamManifest` - 16 edges
10. `StreamManifestAndCardTest` - 16 edges

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

## Communities (53 total, 19 thin omitted)

### Community 0 - "KidsAccessibilityService"
Cohesion: 0.08
Nodes (9): AccessibilityNodeInfo, NoticeEntity, ExtractedAttachmentDetail, KidsAccessibilityService, UnvisitedCard, VisiblePendingCard, FloatingCrawlerOverlay, StreamManifest (+1 more)

### Community 1 - "GoogleDriveClient"
Cohesion: 0.07
Nodes (26): DriveVaultManager, Failure, Context, Result, ProvisionStep1Result, Success, UserConsentRequired, ChannelVaultFolders (+18 more)

### Community 2 - "NoticeDao"
Cohesion: 0.06
Nodes (12): AttachmentDao, ChildProfileDao, AttachmentEntity, NoticeEntity, NoticeDao, KidsDatabase, Context, ChildProfileEntity (+4 more)

### Community 3 - "assertthat"
Cohesion: 0.06
Nodes (17): PrivacyFilter, StreamItemStatus, ALREADY_SYNCED, COMPLETED, FAILED_SKIPPED, IN_PROGRESS, PENDING, MultiChildRouter (+9 more)

### Community 4 - "StreamManifest"
Cohesion: 0.10
Nodes (3): StreamManifest, StreamManifestItem, StreamManifestAndCardTest

### Community 5 - "MLKitOcrParser.kt"
Cohesion: 0.09
Nodes (20): MLKitOcrParser, OcrExtractionResult, Bundle, StatusBarNotification, NotificationParser, ParsedNotification, NotificationParserTest, Bitmap (+12 more)

### Community 6 - "ChildrenGridDashboard.kt"
Cohesion: 0.11
Nodes (24): alignment, ProbeItem, DiagnosticFeedScreen(), LogLine, background, border, circleshape, clickable (+16 more)

### Community 7 - "GestureDescription"
Cohesion: 0.11
Nodes (8): GestureResultCallback, GestureResultCallback, GestureResultCallback, GestureResultCallback, GestureResultCallback, GestureResultCallback, GestureDescription, GestureResultCallback

### Community 9 - "K.I.D.S. Android Collector (PRD)"
Cohesion: 0.09
Nodes (16): AI-Native Storage (JSONL & Markdown), ImportedNoticeRecord, WhatsAppChatExportParser, WhatsAppChatExportParserTest, Dual WhatsApp Catch-Up Engine, 5-Point Cloud Health Probe, Google Credential Manager API, inputstream (+8 more)

### Community 10 - "SafVaultManager.kt"
Cohesion: 0.21
Nodes (9): Activity, android, Context, Result, SafVaultFolders, SafVaultManager, ShareTargetActivity, DocumentFile (+1 more)

### Community 11 - "OnboardingWizardScreen.kt"
Cohesion: 0.10
Nodes (20): accountmanager, activityresultcontracts, androidx, getDefaultSchoolAppList(), Context, launchAccountPicker(), queryInstalledLauncherApps(), arrowback (+12 more)

### Community 12 - "FloatingCrawlerOverlay.kt"
Cohesion: 0.11
Nodes (16): AccessibilityService, AccessibilityNodeInfo, Button, gradientdrawable, gravity, handler, LinearLayout, looper (+8 more)

### Community 13 - "DriveVaultManager.kt"
Cohesion: 0.12
Nodes (16): CompletableDeferred, concurrentlinkedqueue, coroutinescope, date, file, filewriter, googleaccountcredential, gsonfactory (+8 more)

### Community 14 - "KotlinGraphifyEngine.kt"
Cohesion: 0.22
Nodes (7): GraphEdge, GraphNode, KnowledgeGraph, KotlinGraphifyEngine, Attachment, Notice, KnowledgeGraphBuilderTest

### Community 16 - "MainActivity.kt"
Cohesion: 0.14
Nodes (13): AppScreen, DASHBOARD, DIAGNOSTICS, WIZARD, MainActivity, childprofile, ComponentActivity, lifecyclescope (+5 more)

### Community 17 - "ci_watch.py"
Cohesion: 0.21
Nodes (14): os, re, diagnose_failure(), get_latest_run(), main(), monitor_workflow(), CI/CD Pipeline Monitor, Release Verifier & Graphify Guardian for K.I.D.S.…, Runs local Graphify AST extraction and community clustering. (+6 more)

### Community 18 - "DriveSyncWorker.kt"
Cohesion: 0.19
Nodes (11): add, DriveSyncWorker, AttachmentEntity, NoticeEntity, buildjsonarray, buildjsonobject, CoroutineWorker, put (+3 more)

### Community 19 - "OnboardingWizardScreen"
Cohesion: 0.37
Nodes (4): Context, PermissionHelper, PermissionSetupDialog(), OnboardingWizardScreen()

### Community 20 - "KidsAccessibilityService.kt"
Cohesion: 0.17
Nodes (11): AccessibilityEvent, accessibilitymanager, accessibilityserviceinfo, AttachmentEntity, delay, intentfilter, isactive, Job (+3 more)

### Community 21 - "Models.kt"
Cohesion: 0.15
Nodes (12): ChannelType, FILE_IMPORT, GOOGLE_CLASSROOM, SCHOOL_ERP, WHATSAPP, CloudHealthReport, SyncStatus, DROPPED (+4 more)

### Community 22 - "KidsNotificationListenerService.kt"
Cohesion: 0.20
Nodes (8): ContentClassifier, KidsNotificationListenerService, firstornull, networktype, NoticeEntity, NotificationListenerService, supervisorjob, uuid

### Community 24 - "ChildProfile"
Cohesion: 0.28
Nodes (7): ChildProfile, ChildCard(), ChildrenGridDashboard(), KidsTheme(), composable, lightcolorscheme, materialtheme

### Community 25 - "Type.kt"
Cohesion: 0.22
Nodes (8): font, fontfamily, fontweight, googlefont, r, sp, textstyle, typography

### Community 26 - "DriveDeepLogger.kt"
Cohesion: 0.28
Nodes (5): DeviceInfo, DiagnosticSnapshot, DriveDeepLogger, PipelineMetrics, StepStatus

### Community 27 - "Entities.kt"
Cohesion: 0.25
Nodes (7): AttachmentEntity, ChildProfileEntity, NoticeFtsEntity, entity, fts4, index, primarykey

### Community 28 - "TypeConverters.kt"
Cohesion: 0.32
Nodes (5): Converters, ChannelConfig, encodetostring, json, typeconverter

### Community 29 - "dispatchers"
Cohesion: 0.29
Nodes (6): DownloadFolderObserver, Context, dispatchers, environment, KidsDatabase, withcontext

### Community 30 - "ShareTargetActivity.kt"
Cohesion: 0.25
Nodes (7): cancel, constraints, existingworkpolicy, fileoutputstream, onetimeworkrequestbuilder, openablecolumns, workmanager

### Community 31 - "GestureDescription"
Cohesion: 0.36
Nodes (4): GestureResultCallback, GestureResultCallback, GestureDescription, GestureResultCallback

### Community 32 - "DeduplicationEngine"
Cohesion: 0.40
Nodes (3): DeduplicationEngine, java, ByteArray

### Community 33 - "ContentCategory"
Cohesion: 0.33
Nodes (6): ContentCategory, ATTENDANCE, CIRCULAR, FEES, HOMEWORK, UNKNOWN

### Community 34 - "WizardStep"
Cohesion: 0.33
Nodes (6): WizardStep, STEP_0_PERMISSIONS, STEP_1_VAULT, STEP_2_CLASSROOM, STEP_3_PORTALS, STEP_4_WHATSAPP

### Community 35 - "Intent"
Cohesion: 0.53
Nodes (4): BootReceiver, Context, BroadcastReceiver, Intent

### Community 36 - "gradlew"
Cohesion: 0.83
Nodes (3): gradlew script, die(), warn()

## Knowledge Gaps
- **34 isolated node(s):** `CloudHealthReport`, `DeviceInfo`, `PipelineMetrics`, `StepStatus`, `NoticeFtsEntity` (+29 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 209 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **19 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `KidsAccessibilityService` connect `KidsAccessibilityService` to `DeduplicationEngine`, `GoogleDriveClient`, `assertthat`, `OnboardingWizardScreen.kt`, `FloatingCrawlerOverlay.kt`, `KidsAccessibilityService.kt`, `KidsNotificationListenerService.kt`, `.matchesAttachmentChipText`?**
  _High betweenness centrality (0.212) - this node is a cross-community bridge._
- **Why does `ChildProfile` connect `ChildProfile` to `KidsAccessibilityService`, `assertthat`, `ChildrenGridDashboard.kt`, `KotlinGraphifyEngine.kt`, `OnboardingWizardScreen`, `Models.kt`, `KidsNotificationListenerService.kt`?**
  _High betweenness centrality (0.104) - this node is a cross-community bridge._
- **Why does `KidsDatabase` connect `NoticeDao` to `KidsAccessibilityService`?**
  _High betweenness centrality (0.080) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `KidsAccessibilityService` (e.g. with `ContentClassifier` and `DeduplicationEngine`) actually correct?**
  _`KidsAccessibilityService` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Are the 6 inferred relationships involving `GoogleDriveClient` (e.g. with `.preWarmOAuthAndFolders()` and `.provisionStep1()`) actually correct?**
  _`GoogleDriveClient` has 6 INFERRED edges - model-reasoned connections that need verification._
- **Are the 4 inferred relationships involving `ChildProfile` (e.g. with `.onCreate()` and `OnboardingWizardScreen()`) actually correct?**
  _`ChildProfile` has 4 INFERRED edges - model-reasoned connections that need verification._
- **What connects `CloudHealthReport`, `DeviceInfo`, `PipelineMetrics` to the rest of the system?**
  _34 weakly-connected nodes found - possible documentation gaps or missing edges._