# Graph Report - K.I.D.S  (2026-09-22)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 571 nodes · 1124 edges · 36 communities (22 shown, 14 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 25 edges (avg confidence: 0.87)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `8bfa12f1`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- KidsAccessibilityService.kt
- GoogleDriveClient
- FloatingCrawlerOverlay
- KidsAccessibilityService
- ChildProfile
- NoticeDao
- ci_watch.py
- MLKitOcrParser.kt
- K.I.D.S. Android Collector (PRD)
- OnboardingWizardScreen
- ChildrenGridDashboard.kt
- OnboardingWizardScreen.kt
- ContentCategory
- AttachmentDao
- NotificationParserTest.kt
- MainActivity.kt
- PermissionHelper.kt
- PrivacyFilterTest
- DriveVaultManagerTest.kt
- PermissionSetupDialog.kt
- Type.kt
- .onCreate
- WizardStep
- DeduplicationHashTest
- gradlew
- java
- Bundle
- AccessibilityNodeInfo
- ChildVaultFolders
- provisionstep1result
- Result
- role
- statusbarnotification

## God Nodes (most connected - your core abstractions)
1. `KidsAccessibilityService` - 45 edges
2. `FloatingCrawlerOverlay` - 29 edges
3. `GoogleDriveClient` - 24 edges
4. `ChildProfile` - 20 edges
5. `OnboardingWizardScreen()` - 19 edges
6. `NoticeDao` - 15 edges
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

## Communities (36 total, 14 thin omitted)

### Community 0 - "KidsAccessibilityService.kt"
Cohesion: 0.05
Nodes (50): accessibilitymanager, accessibilityserviceinfo, DownloadFolderObserver, Context, DeduplicationEngine, java, DriveSyncWorker, KidsNotificationListenerService (+42 more)

### Community 1 - "GoogleDriveClient"
Cohesion: 0.08
Nodes (22): DriveVaultManager, Failure, Context, Result, ProvisionStep1Result, Success, UserConsentRequired, ChannelVaultFolders (+14 more)

### Community 2 - "FloatingCrawlerOverlay"
Cohesion: 0.07
Nodes (20): AccessibilityService, FloatingCrawlerOverlay, GestureResultCallback, AccessibilityNodeInfo, GestureResultCallback, Button, GestureDescription, gradientdrawable (+12 more)

### Community 3 - "KidsAccessibilityService"
Cohesion: 0.11
Nodes (7): AccessibilityEvent, AccessibilityNodeInfo, ExtractedAttachmentDetail, KidsAccessibilityService, Context, UnvisitedCard, FloatingCrawlerOverlay

### Community 4 - "ChildProfile"
Cohesion: 0.08
Nodes (25): GraphEdge, GraphNode, KnowledgeGraph, KotlinGraphifyEngine, Attachment, ChannelType, FILE_IMPORT, GOOGLE_CLASSROOM (+17 more)

### Community 5 - "NoticeDao"
Cohesion: 0.09
Nodes (10): ChildProfileDao, NoticeDao, KidsDatabase, Context, ChildProfileEntity, database, Flow, NoticeEntity (+2 more)

### Community 6 - "ci_watch.py"
Cohesion: 0.08
Nodes (27): AttachmentEntity, ChildProfileEntity, NoticeEntity, NoticeFtsEntity, Converters, ChannelConfig, encodetostring, entity (+19 more)

### Community 7 - "MLKitOcrParser.kt"
Cohesion: 0.14
Nodes (17): Context, Result, SafVaultFolders, SafVaultManager, MLKitOcrParser, OcrExtractionResult, Bitmap, DocumentFile (+9 more)

### Community 8 - "K.I.D.S. Android Collector (PRD)"
Cohesion: 0.09
Nodes (16): AI-Native Storage (JSONL & Markdown), ImportedNoticeRecord, WhatsAppChatExportParser, WhatsAppChatExportParserTest, Dual WhatsApp Catch-Up Engine, 5-Point Cloud Health Probe, Google Credential Manager API, inputstream (+8 more)

### Community 9 - "OnboardingWizardScreen"
Cohesion: 0.22
Nodes (8): Context, PermissionHelper, PermissionSetupDialog(), KidsTheme(), OnboardingWizardScreen(), composable, lightcolorscheme, materialtheme

### Community 10 - "ChildrenGridDashboard.kt"
Cohesion: 0.16
Nodes (17): alignment, ProbeItem, DiagnosticFeedScreen(), LogLine, circleshape, clickable, clip, contentdescription (+9 more)

### Community 11 - "OnboardingWizardScreen.kt"
Cohesion: 0.14
Nodes (15): accountmanager, activity, activityresultcontracts, getDefaultSchoolAppList(), Context, queryInstalledLauncherApps(), arrowback, backhandler (+7 more)

### Community 12 - "ContentCategory"
Cohesion: 0.15
Nodes (8): ContentClassifier, ContentCategory, ATTENDANCE, CIRCULAR, FEES, HOMEWORK, UNKNOWN, ContentClassifierTest

### Community 14 - "NotificationParserTest.kt"
Cohesion: 0.20
Nodes (9): Bundle, StatusBarNotification, NotificationParser, ParsedNotification, NotificationParserTest, build, Bundle, every (+1 more)

### Community 15 - "MainActivity.kt"
Cohesion: 0.18
Nodes (11): AppScreen, DASHBOARD, DIAGNOSTICS, WIZARD, MainActivity, childprofile, ComponentActivity, lifecyclescope (+3 more)

### Community 16 - "PermissionHelper.kt"
Cohesion: 0.24
Nodes (8): androidx, launchAccountPicker(), BootReceiver, Context, BroadcastReceiver, Intent, notificationmanagercompat, settings

### Community 18 - "DriveVaultManagerTest.kt"
Cohesion: 0.27
Nodes (7): assertthat, beforeeach, bytearrayinputstream, Context, mockk, runblocking, test

### Community 19 - "PermissionSetupDialog.kt"
Cohesion: 0.22
Nodes (7): background, border, dialog, lifecycle, lifecycleeventobserver, localcontext, locallifecycleowner

### Community 20 - "Type.kt"
Cohesion: 0.22
Nodes (8): font, fontfamily, fontweight, googlefont, r, sp, textstyle, typography

### Community 21 - ".onCreate"
Cohesion: 0.29
Nodes (4): KidsApplication, CrawlerTraceLogger, Context, Application

### Community 22 - "WizardStep"
Cohesion: 0.33
Nodes (6): WizardStep, STEP_0_PERMISSIONS, STEP_1_VAULT, STEP_2_CLASSROOM, STEP_3_PORTALS, STEP_4_WHATSAPP

### Community 24 - "gradlew"
Cohesion: 0.83
Nodes (3): gradlew script, die(), warn()

## Knowledge Gaps
- **31 isolated node(s):** `DeviceInfo`, `PipelineMetrics`, `StepStatus`, `CloudHealthReport`, `AttachmentEntity` (+26 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 177 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **14 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `ChildProfile` connect `ChildProfile` to `KidsAccessibilityService.kt`, `OnboardingWizardScreen`, `ChildrenGridDashboard.kt`, `KidsAccessibilityService`?**
  _High betweenness centrality (0.126) - this node is a cross-community bridge._
- **Why does `KidsAccessibilityService` connect `KidsAccessibilityService` to `KidsAccessibilityService.kt`, `FloatingCrawlerOverlay`, `ContentCategory`?**
  _High betweenness centrality (0.106) - this node is a cross-community bridge._
- **Why does `OnboardingWizardScreen()` connect `OnboardingWizardScreen` to `GoogleDriveClient`, `ChildProfile`, `ci_watch.py`, `OnboardingWizardScreen.kt`, `MainActivity.kt`, `PermissionHelper.kt`?**
  _High betweenness centrality (0.102) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `KidsAccessibilityService` (e.g. with `ContentClassifier` and `DeduplicationEngine`) actually correct?**
  _`KidsAccessibilityService` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Are the 4 inferred relationships involving `GoogleDriveClient` (e.g. with `.provisionStep1()` and `.provisionStep2Classroom()`) actually correct?**
  _`GoogleDriveClient` has 4 INFERRED edges - model-reasoned connections that need verification._
- **Are the 3 inferred relationships involving `ChildProfile` (e.g. with `.onCreate()` and `OnboardingWizardScreen()`) actually correct?**
  _`ChildProfile` has 3 INFERRED edges - model-reasoned connections that need verification._
- **What connects `DeviceInfo`, `PipelineMetrics`, `StepStatus` to the rest of the system?**
  _31 weakly-connected nodes found - possible documentation gaps or missing edges._