# Graph Report - K.I.D.S  (2026-09-22)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 588 nodes · 1190 edges · 47 communities (28 shown, 19 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 31 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `e61559b0`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- GoogleDriveClient
- KidsAccessibilityService
- FloatingCrawlerOverlay
- NoticeDao
- ci_watch.py
- MLKitOcrParser.kt
- K.I.D.S. Android Collector (PRD)
- KidsAccessibilityService.kt
- ChildrenGridDashboard.kt
- SafVaultManager.kt
- KotlinGraphifyEngine.kt
- DriveSyncWorker.kt
- OnboardingWizardScreen.kt
- ContentCategory
- AttachmentDao
- OnboardingWizardScreen
- Models.kt
- ChildProfile
- log
- MainActivity.kt
- PermissionHelper.kt
- DeduplicationEngine
- PrivacyFilterTest
- PermissionSetupDialog.kt
- Type.kt
- DriveVaultManager.kt
- DownloadFolderObserver.kt
- WizardStep
- ContentClassifierTest
- KidsTheme.kt
- GestureResultCallback
- DeduplicationHashTest
- gradlew
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
1. `KidsAccessibilityService` - 50 edges
2. `FloatingCrawlerOverlay` - 29 edges
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

## Communities (47 total, 19 thin omitted)

### Community 0 - "GoogleDriveClient"
Cohesion: 0.07
Nodes (26): DriveVaultManager, Failure, Context, Result, ProvisionStep1Result, Success, UserConsentRequired, ChannelVaultFolders (+18 more)

### Community 1 - "KidsAccessibilityService"
Cohesion: 0.11
Nodes (8): AccessibilityEvent, AccessibilityNodeInfo, NoticeEntity, ExtractedAttachmentDetail, KidsAccessibilityService, UnvisitedCard, StatusBarNotification, FloatingCrawlerOverlay

### Community 2 - "FloatingCrawlerOverlay"
Cohesion: 0.07
Nodes (20): AccessibilityService, FloatingCrawlerOverlay, GestureResultCallback, AccessibilityNodeInfo, GestureDescription, GestureResultCallback, Button, gradientdrawable (+12 more)

### Community 3 - "NoticeDao"
Cohesion: 0.09
Nodes (10): ChildProfileDao, NoticeDao, KidsDatabase, Context, ChildProfileEntity, database, Flow, NoticeEntity (+2 more)

### Community 4 - "ci_watch.py"
Cohesion: 0.09
Nodes (26): AttachmentEntity, ChildProfileEntity, NoticeFtsEntity, Converters, ChannelConfig, encodetostring, entity, fts4 (+18 more)

### Community 5 - "MLKitOcrParser.kt"
Cohesion: 0.09
Nodes (20): MLKitOcrParser, OcrExtractionResult, Bundle, StatusBarNotification, NotificationParser, ParsedNotification, NotificationParserTest, Bitmap (+12 more)

### Community 6 - "K.I.D.S. Android Collector (PRD)"
Cohesion: 0.09
Nodes (16): AI-Native Storage (JSONL & Markdown), ImportedNoticeRecord, WhatsAppChatExportParser, WhatsAppChatExportParserTest, Dual WhatsApp Catch-Up Engine, 5-Point Cloud Health Probe, Google Credential Manager API, inputstream (+8 more)

### Community 7 - "KidsAccessibilityService.kt"
Cohesion: 0.15
Nodes (17): accessibilitymanager, accessibilityserviceinfo, constraints, delay, existingworkpolicy, fileoutputstream, firstornull, isactive (+9 more)

### Community 8 - "ChildrenGridDashboard.kt"
Cohesion: 0.16
Nodes (17): ProbeItem, DiagnosticFeedScreen(), LogLine, background, circleshape, clickable, clip, contentdescription (+9 more)

### Community 9 - "SafVaultManager.kt"
Cohesion: 0.27
Nodes (8): Activity, Context, Result, SafVaultFolders, SafVaultManager, ShareTargetActivity, DocumentFile, Uri

### Community 10 - "KotlinGraphifyEngine.kt"
Cohesion: 0.22
Nodes (7): GraphEdge, GraphNode, KnowledgeGraph, KotlinGraphifyEngine, Attachment, Notice, KnowledgeGraphBuilderTest

### Community 11 - "DriveSyncWorker.kt"
Cohesion: 0.15
Nodes (12): DriveSyncWorker, DeviceInfo, DiagnosticSnapshot, DriveDeepLogger, PipelineMetrics, StepStatus, buildjsonobject, CoroutineWorker (+4 more)

### Community 12 - "OnboardingWizardScreen.kt"
Cohesion: 0.15
Nodes (14): accountmanager, activityresultcontracts, getDefaultSchoolAppList(), Context, queryInstalledLauncherApps(), arrowback, backhandler, channelconfig (+6 more)

### Community 13 - "ContentCategory"
Cohesion: 0.23
Nodes (10): ContentCategory, ATTENDANCE, CIRCULAR, FEES, HOMEWORK, UNKNOWN, assertthat, beforeeach (+2 more)

### Community 15 - "OnboardingWizardScreen"
Cohesion: 0.37
Nodes (4): Context, PermissionHelper, PermissionSetupDialog(), OnboardingWizardScreen()

### Community 16 - "Models.kt"
Cohesion: 0.15
Nodes (12): ChannelType, FILE_IMPORT, GOOGLE_CLASSROOM, SCHOOL_ERP, WHATSAPP, CloudHealthReport, SyncStatus, DROPPED (+4 more)

### Community 17 - "ChildProfile"
Cohesion: 0.23
Nodes (5): ChildProfile, MultiChildRouter, ChildCard(), ChildrenGridDashboard(), MultiChildAttributionTest

### Community 18 - "log"
Cohesion: 0.19
Nodes (8): KidsApplication, CrawlerTraceLogger, Context, Application, concurrentlinkedqueue, date, locale, log

### Community 19 - "MainActivity.kt"
Cohesion: 0.18
Nodes (12): AppScreen, DASHBOARD, DIAGNOSTICS, WIZARD, MainActivity, childprofile, ComponentActivity, KidsDatabase (+4 more)

### Community 20 - "PermissionHelper.kt"
Cohesion: 0.24
Nodes (8): androidx, launchAccountPicker(), BootReceiver, Context, BroadcastReceiver, Intent, notificationmanagercompat, settings

### Community 21 - "DeduplicationEngine"
Cohesion: 0.20
Nodes (6): ContentClassifier, DeduplicationEngine, java, KidsNotificationListenerService, ByteArray, NotificationListenerService

### Community 23 - "PermissionSetupDialog.kt"
Cohesion: 0.22
Nodes (7): alignment, border, dialog, lifecycle, lifecycleeventobserver, locallifecycleowner, roundedcornershape

### Community 24 - "Type.kt"
Cohesion: 0.22
Nodes (8): font, fontfamily, fontweight, googlefont, r, sp, textstyle, typography

### Community 25 - "DriveVaultManager.kt"
Cohesion: 0.25
Nodes (7): coroutinescope, googleaccountcredential, gsonfactory, launch, nethttptransport, userrecoverableauthexception, userrecoverableauthioexception

### Community 26 - "DownloadFolderObserver.kt"
Cohesion: 0.33
Nodes (5): DownloadFolderObserver, Context, dispatchers, environment, withcontext

### Community 27 - "WizardStep"
Cohesion: 0.33
Nodes (6): WizardStep, STEP_0_PERMISSIONS, STEP_1_VAULT, STEP_2_CLASSROOM, STEP_3_PORTALS, STEP_4_WHATSAPP

### Community 29 - "KidsTheme.kt"
Cohesion: 0.40
Nodes (4): KidsTheme(), composable, lightcolorscheme, materialtheme

### Community 32 - "gradlew"
Cohesion: 0.83
Nodes (3): gradlew script, die(), warn()

## Knowledge Gaps
- **29 isolated node(s):** `DeviceInfo`, `PipelineMetrics`, `StepStatus`, `CloudHealthReport`, `NoticeFtsEntity` (+24 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 179 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **19 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `ChildProfile` connect `ChildProfile` to `KidsAccessibilityService`, `KidsAccessibilityService.kt`, `ChildrenGridDashboard.kt`, `KotlinGraphifyEngine.kt`, `ContentCategory`, `OnboardingWizardScreen`, `Models.kt`?**
  _High betweenness centrality (0.121) - this node is a cross-community bridge._
- **Why does `KidsAccessibilityService` connect `KidsAccessibilityService` to `GoogleDriveClient`, `FloatingCrawlerOverlay`, `DeduplicationEngine`, `KidsAccessibilityService.kt`?**
  _High betweenness centrality (0.111) - this node is a cross-community bridge._
- **Why does `OnboardingWizardScreen()` connect `OnboardingWizardScreen` to `GoogleDriveClient`, `ci_watch.py`, `OnboardingWizardScreen.kt`, `ChildProfile`, `MainActivity.kt`, `PermissionHelper.kt`?**
  _High betweenness centrality (0.090) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `KidsAccessibilityService` (e.g. with `ContentClassifier` and `DeduplicationEngine`) actually correct?**
  _`KidsAccessibilityService` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Are the 4 inferred relationships involving `GoogleDriveClient` (e.g. with `.provisionStep1()` and `.provisionStep2Classroom()`) actually correct?**
  _`GoogleDriveClient` has 4 INFERRED edges - model-reasoned connections that need verification._
- **Are the 4 inferred relationships involving `ChildProfile` (e.g. with `.onCreate()` and `OnboardingWizardScreen()`) actually correct?**
  _`ChildProfile` has 4 INFERRED edges - model-reasoned connections that need verification._
- **What connects `DeviceInfo`, `PipelineMetrics`, `StepStatus` to the rest of the system?**
  _29 weakly-connected nodes found - possible documentation gaps or missing edges._