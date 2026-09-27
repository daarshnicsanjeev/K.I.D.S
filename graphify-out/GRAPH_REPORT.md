# Graph Report - K.I.D.S  (2026-09-27)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 763 nodes · 1702 edges · 54 communities (34 shown, 20 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 33 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `a921e0b4`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- KidsAccessibilityService
- GoogleDriveClient
- Query
- MLKitOcrParser.kt
- StreamManifest
- ChildrenGridDashboard.kt
- FloatingCrawlerOverlay
- KidsAccessibilityService.kt
- OnboardingWizardScreen.kt
- DriveVaultManager.kt
- .log
- FloatingCrawlerOverlay.kt
- MainActivity.kt
- KidsNotificationListenerService.kt
- .matchesAttachmentChipText
- GestureDescription
- OnboardingWizardScreen
- ci_watch.py
- DriveSyncWorker.kt
- ChildProfile
- Models.kt
- NotificationParserTest.kt
- Entities.kt
- KotlinGraphifyEngine.kt
- PrivacyFilterTest
- KnowledgeGraphBuilderTest.kt
- DriveDeepLogger.kt
- assertthat
- dispatchers
- WhatsAppChatExportParser
- log
- Type.kt
- .onCreate
- .fallbackNativeScroll
- GestureDescription
- ContentCategory
- WizardStep
- .fallbackNativeScrollBackward
- ContentClassifierTest
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

## Communities (54 total, 20 thin omitted)

### Community 0 - "KidsAccessibilityService"
Cohesion: 0.09
Nodes (9): AccessibilityNodeInfo, ExtractedAttachmentDetail, KidsAccessibilityService, UnvisitedCard, VisiblePendingCard, FloatingCrawlerOverlay, StreamManifest, StreamManifestItem (+1 more)

### Community 1 - "GoogleDriveClient"
Cohesion: 0.06
Nodes (33): AI-Native Storage (JSONL & Markdown), DriveVaultManager, Failure, Context, Result, ProvisionStep1Result, Success, UserConsentRequired (+25 more)

### Community 2 - "Query"
Cohesion: 0.08
Nodes (17): AttachmentDao, ChildProfileDao, AttachmentEntity, NoticeEntity, NoticeDao, KidsDatabase, Context, ChildProfileEntity (+9 more)

### Community 3 - "MLKitOcrParser.kt"
Cohesion: 0.10
Nodes (21): android, Context, Result, SafVaultFolders, SafVaultManager, MLKitOcrParser, OcrExtractionResult, ShareTargetActivity (+13 more)

### Community 4 - "StreamManifest"
Cohesion: 0.08
Nodes (9): StreamItemStatus, ALREADY_SYNCED, COMPLETED, FAILED_SKIPPED, IN_PROGRESS, PENDING, StreamManifest, StreamManifestItem (+1 more)

### Community 5 - "ChildrenGridDashboard.kt"
Cohesion: 0.11
Nodes (24): alignment, ProbeItem, DiagnosticFeedScreen(), LogLine, background, border, circleshape, clickable (+16 more)

### Community 7 - "KidsAccessibilityService.kt"
Cohesion: 0.11
Nodes (20): AccessibilityEvent, accessibilitymanager, accessibilityserviceinfo, Activity, AttachmentEntity, cancel, constraints, delay (+12 more)

### Community 8 - "OnboardingWizardScreen.kt"
Cohesion: 0.11
Nodes (19): accountmanager, activityresultcontracts, getDefaultSchoolAppList(), Context, queryInstalledLauncherApps(), arrowback, backhandler, channelconfig (+11 more)

### Community 9 - "DriveVaultManager.kt"
Cohesion: 0.11
Nodes (17): CompletableDeferred, concurrentlinkedqueue, coroutinescope, date, Dual WhatsApp Catch-Up Engine, filewriter, googleaccountcredential, gsonfactory (+9 more)

### Community 10 - ".log"
Cohesion: 0.20
Nodes (3): CrawlerTraceLogger, Context, Result

### Community 11 - "FloatingCrawlerOverlay.kt"
Cohesion: 0.12
Nodes (15): AccessibilityService, Button, gradientdrawable, gravity, handler, LinearLayout, looper, motionevent (+7 more)

### Community 12 - "MainActivity.kt"
Cohesion: 0.12
Nodes (15): androidx, AppScreen, DASHBOARD, DIAGNOSTICS, WIZARD, launchAccountPicker(), childprofile, Intent (+7 more)

### Community 13 - "KidsNotificationListenerService.kt"
Cohesion: 0.15
Nodes (11): ContentClassifier, DeduplicationEngine, java, KidsNotificationListenerService, StatusBarNotification, ByteArray, firstornull, NoticeEntity (+3 more)

### Community 15 - "GestureDescription"
Cohesion: 0.19
Nodes (7): GestureResultCallback, GestureResultCallback, GestureResultCallback, GestureResultCallback, GestureResultCallback, GestureDescription, GestureResultCallback

### Community 16 - "OnboardingWizardScreen"
Cohesion: 0.33
Nodes (5): Context, PermissionHelper, PermissionSetupDialog(), OnboardingWizardScreen(), OptIn

### Community 17 - "ci_watch.py"
Cohesion: 0.21
Nodes (14): os, re, diagnose_failure(), get_latest_run(), main(), monitor_workflow(), CI/CD Pipeline Monitor, Release Verifier & Graphify Guardian for K.I.D.S.…, Runs local Graphify AST extraction and community clustering. (+6 more)

### Community 18 - "DriveSyncWorker.kt"
Cohesion: 0.19
Nodes (11): add, DriveSyncWorker, AttachmentEntity, NoticeEntity, buildjsonarray, buildjsonobject, CoroutineWorker, put (+3 more)

### Community 19 - "ChildProfile"
Cohesion: 0.22
Nodes (5): ChildProfile, MultiChildRouter, ChildCard(), ChildrenGridDashboard(), MultiChildAttributionTest

### Community 20 - "Models.kt"
Cohesion: 0.15
Nodes (12): ChannelType, FILE_IMPORT, GOOGLE_CLASSROOM, SCHOOL_ERP, WHATSAPP, CloudHealthReport, SyncStatus, DROPPED (+4 more)

### Community 21 - "NotificationParserTest.kt"
Cohesion: 0.22
Nodes (8): Bundle, StatusBarNotification, NotificationParser, ParsedNotification, NotificationParserTest, build, every, notification

### Community 22 - "Entities.kt"
Cohesion: 0.18
Nodes (9): AttachmentEntity, NoticeEntity, NoticeFtsEntity, Converters, ChannelConfig, entity, fts4, index (+1 more)

### Community 23 - "KotlinGraphifyEngine.kt"
Cohesion: 0.27
Nodes (7): GraphEdge, GraphNode, KnowledgeGraph, KotlinGraphifyEngine, encodetostring, json, typeconverter

### Community 25 - "KnowledgeGraphBuilderTest.kt"
Cohesion: 0.29
Nodes (3): Attachment, Notice, KnowledgeGraphBuilderTest

### Community 26 - "DriveDeepLogger.kt"
Cohesion: 0.24
Nodes (6): DeviceInfo, DiagnosticSnapshot, DriveDeepLogger, PipelineMetrics, StepStatus, file

### Community 27 - "assertthat"
Cohesion: 0.40
Nodes (4): assertthat, beforeeach, bytearrayinputstream, test

### Community 28 - "dispatchers"
Cohesion: 0.25
Nodes (7): DownloadFolderObserver, Context, MainActivity, ComponentActivity, dispatchers, environment, KidsDatabase

### Community 29 - "WhatsAppChatExportParser"
Cohesion: 0.25
Nodes (3): ImportedNoticeRecord, WhatsAppChatExportParser, WhatsAppChatExportParserTest

### Community 30 - "log"
Cohesion: 0.31
Nodes (6): KidsApplication, BootReceiver, Context, Application, BroadcastReceiver, log

### Community 31 - "Type.kt"
Cohesion: 0.22
Nodes (8): font, fontfamily, fontweight, googlefont, r, sp, textstyle, typography

### Community 32 - ".onCreate"
Cohesion: 0.25
Nodes (6): ChildProfileEntity, KidsTheme(), Bundle, Composable, lightcolorscheme, materialtheme

### Community 34 - "GestureDescription"
Cohesion: 0.36
Nodes (4): GestureResultCallback, GestureResultCallback, GestureDescription, GestureResultCallback

### Community 35 - "ContentCategory"
Cohesion: 0.33
Nodes (6): ContentCategory, ATTENDANCE, CIRCULAR, FEES, HOMEWORK, UNKNOWN

### Community 36 - "WizardStep"
Cohesion: 0.33
Nodes (6): WizardStep, STEP_0_PERMISSIONS, STEP_1_VAULT, STEP_2_CLASSROOM, STEP_3_PORTALS, STEP_4_WHATSAPP

### Community 40 - "gradlew"
Cohesion: 0.83
Nodes (3): gradlew script, die(), warn()

## Knowledge Gaps
- **34 isolated node(s):** `CloudHealthReport`, `NoticeFtsEntity`, `DeviceInfo`, `PipelineMetrics`, `StepStatus` (+29 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 203 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **20 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `KidsAccessibilityService` connect `KidsAccessibilityService` to `MLKitOcrParser.kt`, `KidsAccessibilityService.kt`, `OnboardingWizardScreen.kt`, `FloatingCrawlerOverlay.kt`, `KidsNotificationListenerService.kt`, `.matchesAttachmentChipText`, `ChildProfile`, `assertthat`?**
  _High betweenness centrality (0.250) - this node is a cross-community bridge._
- **Why does `ChildProfile` connect `ChildProfile` to `.onCreate`, `KidsAccessibilityService`, `ChildrenGridDashboard.kt`, `KidsNotificationListenerService.kt`, `OnboardingWizardScreen`, `Models.kt`, `KotlinGraphifyEngine.kt`, `KnowledgeGraphBuilderTest.kt`?**
  _High betweenness centrality (0.102) - this node is a cross-community bridge._
- **Why does `OnboardingWizardScreen()` connect `OnboardingWizardScreen` to `.onCreate`, `GoogleDriveClient`, `OnboardingWizardScreen.kt`, `MainActivity.kt`, `ChildProfile`, `Entities.kt`?**
  _High betweenness centrality (0.089) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `KidsAccessibilityService` (e.g. with `ContentClassifier` and `DeduplicationEngine`) actually correct?**
  _`KidsAccessibilityService` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Are the 6 inferred relationships involving `GoogleDriveClient` (e.g. with `.preWarmOAuthAndFolders()` and `.provisionStep1()`) actually correct?**
  _`GoogleDriveClient` has 6 INFERRED edges - model-reasoned connections that need verification._
- **What connects `CloudHealthReport`, `NoticeFtsEntity`, `DeviceInfo` to the rest of the system?**
  _34 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `KidsAccessibilityService` be split into smaller, more focused modules?**
  _Cohesion score 0.08599439775910364 - nodes in this community are weakly interconnected._