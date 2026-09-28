# Graph Report - K.I.D.S  (2026-09-28)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 768 nodes · 1722 edges · 50 communities (33 shown, 17 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 33 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `b71cf689`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- KidsAccessibilityService
- Query
- NotificationParserTest.kt
- MLKitOcrParser.kt
- OnboardingWizardScreen
- GoogleDriveClient
- StreamManifest
- FloatingCrawlerOverlay
- KidsAccessibilityService.kt
- K.I.D.S. Android Collector (PRD)
- OnboardingWizardScreen.kt
- GestureDescription
- ChildrenGridDashboard.kt
- .log
- KotlinGraphifyEngine.kt
- FloatingCrawlerOverlay.kt
- .matchesAttachmentChipText
- DriveVaultManager.kt
- ci_watch.py
- DriveSyncWorker.kt
- MainActivity.kt
- Models.kt
- DeduplicationEngine
- log
- ChildProfile
- PermissionSetupDialog.kt
- Type.kt
- .fallbackNativeScroll
- DriveDeepLogger.kt
- Entities.kt
- TypeConverters.kt
- GestureDescription
- ContentCategory
- WizardStep
- ContentClassifier
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
6. `NoticeDao` - 18 edges
7. `DriveVaultManager` - 18 edges
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

## Communities (50 total, 17 thin omitted)

### Community 0 - "KidsAccessibilityService"
Cohesion: 0.08
Nodes (10): AccessibilityNodeInfo, NoticeEntity, ExtractedAttachmentDetail, KidsAccessibilityService, UnvisitedCard, VisiblePendingCard, FloatingCrawlerOverlay, StreamManifest (+2 more)

### Community 1 - "Query"
Cohesion: 0.07
Nodes (17): AttachmentDao, ChildProfileDao, AttachmentEntity, NoticeEntity, NoticeDao, KidsDatabase, Context, ChildProfileEntity (+9 more)

### Community 2 - "NotificationParserTest.kt"
Cohesion: 0.05
Nodes (21): PrivacyFilter, Bundle, StatusBarNotification, NotificationParser, ParsedNotification, MultiChildRouter, StatusBarNotification, ContentClassifierTest (+13 more)

### Community 3 - "MLKitOcrParser.kt"
Cohesion: 0.09
Nodes (22): Activity, android, Context, Result, SafVaultFolders, SafVaultManager, MLKitOcrParser, OcrExtractionResult (+14 more)

### Community 4 - "OnboardingWizardScreen"
Cohesion: 0.14
Nodes (14): DriveVaultManager, Failure, Context, Result, ProvisionStep1Result, Success, UserConsentRequired, ChildVaultFolders (+6 more)

### Community 5 - "GoogleDriveClient"
Cohesion: 0.09
Nodes (15): ChannelVaultFolders, DriveQuotaInfo, GoogleDriveClient, java, async, ByteArray, bytearraycontent, bytearrayoutputstream (+7 more)

### Community 6 - "StreamManifest"
Cohesion: 0.08
Nodes (9): StreamItemStatus, ALREADY_SYNCED, COMPLETED, FAILED_SKIPPED, IN_PROGRESS, PENDING, StreamManifest, StreamManifestItem (+1 more)

### Community 8 - "KidsAccessibilityService.kt"
Cohesion: 0.11
Nodes (22): AccessibilityEvent, accessibilitymanager, accessibilityserviceinfo, AttachmentEntity, cancel, constraints, delay, existingworkpolicy (+14 more)

### Community 9 - "K.I.D.S. Android Collector (PRD)"
Cohesion: 0.09
Nodes (16): AI-Native Storage (JSONL & Markdown), ImportedNoticeRecord, WhatsAppChatExportParser, WhatsAppChatExportParserTest, Dual WhatsApp Catch-Up Engine, 5-Point Cloud Health Probe, Google Credential Manager API, inputstream (+8 more)

### Community 10 - "OnboardingWizardScreen.kt"
Cohesion: 0.10
Nodes (21): accountmanager, activityresultcontracts, androidx, getDefaultSchoolAppList(), Context, launchAccountPicker(), queryInstalledLauncherApps(), arrowback (+13 more)

### Community 11 - "GestureDescription"
Cohesion: 0.15
Nodes (7): GestureResultCallback, GestureResultCallback, GestureResultCallback, GestureResultCallback, GestureResultCallback, GestureDescription, GestureResultCallback

### Community 12 - "ChildrenGridDashboard.kt"
Cohesion: 0.16
Nodes (17): alignment, ProbeItem, DiagnosticFeedScreen(), LogLine, circleshape, clickable, clip, contentdescription (+9 more)

### Community 13 - ".log"
Cohesion: 0.20
Nodes (3): CrawlerTraceLogger, Context, Result

### Community 14 - "KotlinGraphifyEngine.kt"
Cohesion: 0.22
Nodes (7): GraphEdge, GraphNode, KnowledgeGraph, KotlinGraphifyEngine, Attachment, Notice, KnowledgeGraphBuilderTest

### Community 15 - "FloatingCrawlerOverlay.kt"
Cohesion: 0.12
Nodes (15): AccessibilityService, Button, gradientdrawable, gravity, handler, LinearLayout, looper, motionevent (+7 more)

### Community 17 - "DriveVaultManager.kt"
Cohesion: 0.13
Nodes (14): CompletableDeferred, concurrentlinkedqueue, coroutinescope, date, file, filewriter, googleaccountcredential, gsonfactory (+6 more)

### Community 18 - "ci_watch.py"
Cohesion: 0.21
Nodes (14): os, re, diagnose_failure(), get_latest_run(), main(), monitor_workflow(), CI/CD Pipeline Monitor, Release Verifier & Graphify Guardian for K.I.D.S.…, Runs local Graphify AST extraction and community clustering. (+6 more)

### Community 19 - "DriveSyncWorker.kt"
Cohesion: 0.19
Nodes (11): add, DriveSyncWorker, AttachmentEntity, NoticeEntity, buildjsonarray, buildjsonobject, CoroutineWorker, put (+3 more)

### Community 20 - "MainActivity.kt"
Cohesion: 0.16
Nodes (13): AppScreen, DASHBOARD, DIAGNOSTICS, WIZARD, MainActivity, childprofile, ComponentActivity, KidsDatabase (+5 more)

### Community 21 - "Models.kt"
Cohesion: 0.15
Nodes (12): ChannelType, FILE_IMPORT, GOOGLE_CLASSROOM, SCHOOL_ERP, WHATSAPP, CloudHealthReport, SyncStatus, DROPPED (+4 more)

### Community 22 - "DeduplicationEngine"
Cohesion: 0.21
Nodes (7): DownloadFolderObserver, Context, DeduplicationEngine, dispatchers, environment, messagedigest, withcontext

### Community 23 - "log"
Cohesion: 0.27
Nodes (7): BootReceiver, Context, BroadcastReceiver, Intent, log, notificationmanagercompat, settings

### Community 24 - "ChildProfile"
Cohesion: 0.28
Nodes (7): ChildProfile, ChildCard(), ChildrenGridDashboard(), KidsTheme(), Composable, lightcolorscheme, materialtheme

### Community 25 - "PermissionSetupDialog.kt"
Cohesion: 0.22
Nodes (7): background, border, dialog, lifecycle, lifecycleeventobserver, localcontext, locallifecycleowner

### Community 26 - "Type.kt"
Cohesion: 0.22
Nodes (8): font, fontfamily, fontweight, googlefont, r, sp, textstyle, typography

### Community 28 - "DriveDeepLogger.kt"
Cohesion: 0.28
Nodes (5): DeviceInfo, DiagnosticSnapshot, DriveDeepLogger, PipelineMetrics, StepStatus

### Community 29 - "Entities.kt"
Cohesion: 0.25
Nodes (7): AttachmentEntity, ChildProfileEntity, NoticeFtsEntity, entity, fts4, index, primarykey

### Community 30 - "TypeConverters.kt"
Cohesion: 0.32
Nodes (5): Converters, ChannelConfig, encodetostring, json, typeconverter

### Community 31 - "GestureDescription"
Cohesion: 0.36
Nodes (4): GestureResultCallback, GestureResultCallback, GestureDescription, GestureResultCallback

### Community 32 - "ContentCategory"
Cohesion: 0.33
Nodes (6): ContentCategory, ATTENDANCE, CIRCULAR, FEES, HOMEWORK, UNKNOWN

### Community 33 - "WizardStep"
Cohesion: 0.33
Nodes (6): WizardStep, STEP_0_PERMISSIONS, STEP_1_VAULT, STEP_2_CLASSROOM, STEP_3_PORTALS, STEP_4_WHATSAPP

### Community 34 - "ContentClassifier"
Cohesion: 0.40
Nodes (3): ContentClassifier, KidsNotificationListenerService, NotificationListenerService

### Community 35 - "gradlew"
Cohesion: 0.83
Nodes (3): gradlew script, die(), warn()

## Knowledge Gaps
- **34 isolated node(s):** `CloudHealthReport`, `DeviceInfo`, `PipelineMetrics`, `StepStatus`, `NoticeFtsEntity` (+29 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 202 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **17 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `KidsAccessibilityService` connect `KidsAccessibilityService` to `ContentClassifier`, `MLKitOcrParser.kt`, `NotificationParserTest.kt`, `KidsAccessibilityService.kt`, `OnboardingWizardScreen.kt`, `FloatingCrawlerOverlay.kt`, `.matchesAttachmentChipText`, `DeduplicationEngine`?**
  _High betweenness centrality (0.246) - this node is a cross-community bridge._
- **Why does `ChildProfile` connect `ChildProfile` to `KidsAccessibilityService`, `NotificationParserTest.kt`, `OnboardingWizardScreen`, `KidsAccessibilityService.kt`, `ChildrenGridDashboard.kt`, `KotlinGraphifyEngine.kt`, `Models.kt`?**
  _High betweenness centrality (0.099) - this node is a cross-community bridge._
- **Why does `OnboardingWizardScreen()` connect `OnboardingWizardScreen` to `ChildProfile`, `OnboardingWizardScreen.kt`, `MainActivity.kt`, `TypeConverters.kt`?**
  _High betweenness centrality (0.083) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `KidsAccessibilityService` (e.g. with `ContentClassifier` and `DeduplicationEngine`) actually correct?**
  _`KidsAccessibilityService` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Are the 6 inferred relationships involving `GoogleDriveClient` (e.g. with `.preWarmOAuthAndFolders()` and `.provisionStep1()`) actually correct?**
  _`GoogleDriveClient` has 6 INFERRED edges - model-reasoned connections that need verification._
- **What connects `CloudHealthReport`, `DeviceInfo`, `PipelineMetrics` to the rest of the system?**
  _34 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `KidsAccessibilityService` be split into smaller, more focused modules?**
  _Cohesion score 0.08171603677221655 - nodes in this community are weakly interconnected._