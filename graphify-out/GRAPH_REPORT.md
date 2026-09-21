# Graph Report - K.I.D.S  (2026-09-21)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 564 nodes · 1105 edges · 33 communities (21 shown, 12 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 26 edges (avg confidence: 0.87)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `68c760c4`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- DriveVaultManager.kt
- NotificationParserTest.kt
- FloatingCrawlerOverlay
- KidsAccessibilityService
- ContentCategory
- KidsAccessibilityService.kt
- ChildProfile
- NoticeDao
- GoogleDriveClient
- ci_watch.py
- MLKitOcrParser.kt
- .provisionStep1
- ChildrenGridDashboard.kt
- OnboardingWizardScreen.kt
- AttachmentDao
- OnboardingWizardScreen
- MainActivity.kt
- PermissionHelper.kt
- PermissionSetupDialog.kt
- Type.kt
- WizardStep
- gradlew
- AccessibilityNodeInfo
- Result
- java
- Bundle
- Context
- provisionstep1result
- role
- statusbarnotification

## God Nodes (most connected - your core abstractions)
1. `KidsAccessibilityService` - 43 edges
2. `FloatingCrawlerOverlay` - 31 edges
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

## Communities (33 total, 12 thin omitted)

### Community 0 - "DriveVaultManager.kt"
Cohesion: 0.06
Nodes (34): DownloadFolderObserver, Context, KidsApplication, CrawlerTraceLogger, Context, DriveSyncWorker, DeviceInfo, DiagnosticSnapshot (+26 more)

### Community 1 - "NotificationParserTest.kt"
Cohesion: 0.06
Nodes (19): PrivacyFilter, Bundle, StatusBarNotification, NotificationParser, ParsedNotification, DeduplicationHashTest, MultiChildAttributionTest, NotificationParserTest (+11 more)

### Community 2 - "FloatingCrawlerOverlay"
Cohesion: 0.08
Nodes (18): FloatingCrawlerOverlay, GestureResultCallback, AccessibilityNodeInfo, Button, GestureDescription, gradientdrawable, gravity, handler (+10 more)

### Community 3 - "KidsAccessibilityService"
Cohesion: 0.13
Nodes (5): AccessibilityEvent, ExtractedAttachmentDetail, KidsAccessibilityService, AccessibilityNodeInfo, UnvisitedCard

### Community 4 - "ContentCategory"
Cohesion: 0.06
Nodes (23): AI-Native Storage (JSONL & Markdown), ContentClassifier, ImportedNoticeRecord, WhatsAppChatExportParser, ContentCategory, ATTENDANCE, CIRCULAR, FEES (+15 more)

### Community 5 - "KidsAccessibilityService.kt"
Cohesion: 0.08
Nodes (28): accessibilitymanager, AccessibilityService, accessibilityserviceinfo, DeduplicationEngine, java, SyncStatus, DROPPED, FAILED (+20 more)

### Community 6 - "ChildProfile"
Cohesion: 0.10
Nodes (21): GraphEdge, GraphNode, KnowledgeGraph, KotlinGraphifyEngine, Attachment, ChannelType, FILE_IMPORT, GOOGLE_CLASSROOM (+13 more)

### Community 7 - "NoticeDao"
Cohesion: 0.09
Nodes (10): ChildProfileDao, NoticeDao, KidsDatabase, Context, ChildProfileEntity, database, Flow, NoticeEntity (+2 more)

### Community 8 - "GoogleDriveClient"
Cohesion: 0.09
Nodes (14): ChannelVaultFolders, ChildVaultFolders, DriveQuotaInfo, GoogleDriveClient, async, bytearraycontent, bytearrayoutputstream, concurrenthashmap (+6 more)

### Community 9 - "ci_watch.py"
Cohesion: 0.09
Nodes (26): AttachmentEntity, ChildProfileEntity, NoticeEntity, NoticeFtsEntity, Converters, ChannelConfig, entity, fts4 (+18 more)

### Community 10 - "MLKitOcrParser.kt"
Cohesion: 0.13
Nodes (18): Context, Result, SafVaultFolders, SafVaultManager, MLKitOcrParser, OcrExtractionResult, Bitmap, Context (+10 more)

### Community 11 - ".provisionStep1"
Cohesion: 0.23
Nodes (10): DriveVaultManager, Failure, Context, ProvisionStep1Result, Success, UserConsentRequired, Result, DriveVaultManagerTest (+2 more)

### Community 12 - "ChildrenGridDashboard.kt"
Cohesion: 0.16
Nodes (17): ProbeItem, DiagnosticFeedScreen(), LogLine, background, circleshape, clickable, clip, contentdescription (+9 more)

### Community 13 - "OnboardingWizardScreen.kt"
Cohesion: 0.14
Nodes (15): accountmanager, activity, activityresultcontracts, getDefaultSchoolAppList(), Context, queryInstalledLauncherApps(), arrowback, backhandler (+7 more)

### Community 15 - "OnboardingWizardScreen"
Cohesion: 0.37
Nodes (4): Context, PermissionHelper, PermissionSetupDialog(), OnboardingWizardScreen()

### Community 16 - "MainActivity.kt"
Cohesion: 0.18
Nodes (12): AppScreen, DASHBOARD, DIAGNOSTICS, WIZARD, MainActivity, childprofile, ComponentActivity, KidsDatabase (+4 more)

### Community 17 - "PermissionHelper.kt"
Cohesion: 0.24
Nodes (8): androidx, launchAccountPicker(), BootReceiver, Context, BroadcastReceiver, Intent, notificationmanagercompat, settings

### Community 18 - "PermissionSetupDialog.kt"
Cohesion: 0.22
Nodes (7): alignment, border, dialog, lifecycle, lifecycleeventobserver, localcontext, locallifecycleowner

### Community 19 - "Type.kt"
Cohesion: 0.22
Nodes (8): font, fontfamily, fontweight, googlefont, r, sp, textstyle, typography

### Community 20 - "WizardStep"
Cohesion: 0.33
Nodes (6): WizardStep, STEP_0_PERMISSIONS, STEP_1_VAULT, STEP_2_CLASSROOM, STEP_3_PORTALS, STEP_4_WHATSAPP

### Community 21 - "gradlew"
Cohesion: 0.83
Nodes (3): gradlew script, die(), warn()

## Knowledge Gaps
- **29 isolated node(s):** `DeviceInfo`, `PipelineMetrics`, `StepStatus`, `CloudHealthReport`, `NoticeFtsEntity` (+24 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 176 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **12 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `KidsAccessibilityService` connect `KidsAccessibilityService` to `FloatingCrawlerOverlay`, `MLKitOcrParser.kt`, `ContentCategory`, `KidsAccessibilityService.kt`?**
  _High betweenness centrality (0.136) - this node is a cross-community bridge._
- **Why does `ChildProfile` connect `ChildProfile` to `NotificationParserTest.kt`, `KidsAccessibilityService`, `KidsAccessibilityService.kt`, `ChildrenGridDashboard.kt`, `OnboardingWizardScreen`?**
  _High betweenness centrality (0.125) - this node is a cross-community bridge._
- **Why does `OnboardingWizardScreen()` connect `OnboardingWizardScreen` to `ChildProfile`, `ci_watch.py`, `.provisionStep1`, `OnboardingWizardScreen.kt`, `MainActivity.kt`, `PermissionHelper.kt`?**
  _High betweenness centrality (0.098) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `KidsAccessibilityService` (e.g. with `ContentClassifier` and `DeduplicationEngine`) actually correct?**
  _`KidsAccessibilityService` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Are the 4 inferred relationships involving `GoogleDriveClient` (e.g. with `.provisionStep1()` and `.provisionStep2Classroom()`) actually correct?**
  _`GoogleDriveClient` has 4 INFERRED edges - model-reasoned connections that need verification._
- **Are the 3 inferred relationships involving `ChildProfile` (e.g. with `.onCreate()` and `OnboardingWizardScreen()`) actually correct?**
  _`ChildProfile` has 3 INFERRED edges - model-reasoned connections that need verification._
- **What connects `DeviceInfo`, `PipelineMetrics`, `StepStatus` to the rest of the system?**
  _29 weakly-connected nodes found - possible documentation gaps or missing edges._