# Graph Report - K.I.D.S  (2026-09-22)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 588 nodes · 1190 edges · 42 communities (26 shown, 16 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 28 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `c4c04eb9`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- KidsAccessibilityService.kt
- KidsAccessibilityService
- ContentCategory
- FloatingCrawlerOverlay
- OnboardingWizardScreen
- NoticeDao
- GoogleDriveClient
- K.I.D.S. Android Collector (PRD)
- SafVaultManager.kt
- KotlinGraphifyEngine.kt
- ChildrenGridDashboard.kt
- OnboardingWizardScreen.kt
- MLKitOcrParser.kt
- ci_watch.py
- AttachmentDao
- Entities.kt
- DriveDeepLogger.kt
- Models.kt
- MainActivity.kt
- PermissionHelper.kt
- PrivacyFilterTest
- PermissionSetupDialog.kt
- Type.kt
- .onCreate
- WizardStep
- ChildProfile
- KidsTheme.kt
- GestureResultCallback
- gradlew
- java
- Bundle
- AccessibilityNodeInfo
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
8. `ContentCategory` - 13 edges
9. `DriveVaultManager` - 13 edges
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

## Communities (42 total, 16 thin omitted)

### Community 0 - "KidsAccessibilityService.kt"
Cohesion: 0.06
Nodes (47): accessibilitymanager, accessibilityserviceinfo, DownloadFolderObserver, Context, DeduplicationEngine, java, DriveSyncWorker, KidsNotificationListenerService (+39 more)

### Community 1 - "KidsAccessibilityService"
Cohesion: 0.11
Nodes (7): AccessibilityEvent, AccessibilityNodeInfo, MultiChildRouter, ExtractedAttachmentDetail, KidsAccessibilityService, UnvisitedCard, FloatingCrawlerOverlay

### Community 2 - "ContentCategory"
Cohesion: 0.06
Nodes (25): ContentClassifier, ContentCategory, ATTENDANCE, CIRCULAR, FEES, HOMEWORK, UNKNOWN, Bundle (+17 more)

### Community 3 - "FloatingCrawlerOverlay"
Cohesion: 0.07
Nodes (20): AccessibilityService, FloatingCrawlerOverlay, GestureResultCallback, AccessibilityNodeInfo, GestureDescription, GestureResultCallback, Button, gradientdrawable (+12 more)

### Community 4 - "OnboardingWizardScreen"
Cohesion: 0.12
Nodes (18): DriveVaultManager, Failure, Context, Result, ProvisionStep1Result, Success, UserConsentRequired, ChildVaultFolders (+10 more)

### Community 5 - "NoticeDao"
Cohesion: 0.09
Nodes (10): ChildProfileDao, NoticeDao, KidsDatabase, Context, ChildProfileEntity, database, Flow, NoticeEntity (+2 more)

### Community 6 - "GoogleDriveClient"
Cohesion: 0.09
Nodes (13): ChannelVaultFolders, DriveQuotaInfo, GoogleDriveClient, async, bytearraycontent, bytearrayoutputstream, concurrenthashmap, Drive (+5 more)

### Community 7 - "K.I.D.S. Android Collector (PRD)"
Cohesion: 0.09
Nodes (16): AI-Native Storage (JSONL & Markdown), ImportedNoticeRecord, WhatsAppChatExportParser, WhatsAppChatExportParserTest, Dual WhatsApp Catch-Up Engine, 5-Point Cloud Health Probe, Google Credential Manager API, inputstream (+8 more)

### Community 8 - "SafVaultManager.kt"
Cohesion: 0.25
Nodes (9): Activity, Context, Result, SafVaultFolders, SafVaultManager, ShareTargetActivity, Bundle, DocumentFile (+1 more)

### Community 9 - "KotlinGraphifyEngine.kt"
Cohesion: 0.22
Nodes (7): GraphEdge, GraphNode, KnowledgeGraph, KotlinGraphifyEngine, Attachment, Notice, KnowledgeGraphBuilderTest

### Community 10 - "ChildrenGridDashboard.kt"
Cohesion: 0.18
Nodes (14): alignment, circleshape, clickable, clip, contentdescription, gridcells, heading, items (+6 more)

### Community 11 - "OnboardingWizardScreen.kt"
Cohesion: 0.15
Nodes (14): accountmanager, activityresultcontracts, getDefaultSchoolAppList(), Context, queryInstalledLauncherApps(), arrowback, backhandler, channelconfig (+6 more)

### Community 12 - "MLKitOcrParser.kt"
Cohesion: 0.17
Nodes (11): MLKitOcrParser, OcrExtractionResult, Bitmap, inputimage, parcelfiledescriptor, pdfrenderer, resume, resumewithexception (+3 more)

### Community 13 - "ci_watch.py"
Cohesion: 0.21
Nodes (14): os, re, diagnose_failure(), get_latest_run(), main(), monitor_workflow(), CI/CD Pipeline Monitor, Release Verifier & Graphify Guardian for K.I.D.S.…, Runs local Graphify AST extraction and community clustering. (+6 more)

### Community 15 - "Entities.kt"
Cohesion: 0.17
Nodes (10): AttachmentEntity, ChildProfileEntity, NoticeEntity, NoticeFtsEntity, Converters, ChannelConfig, entity, fts4 (+2 more)

### Community 16 - "DriveDeepLogger.kt"
Cohesion: 0.19
Nodes (8): DeviceInfo, DiagnosticSnapshot, DriveDeepLogger, PipelineMetrics, StepStatus, encodetostring, json, typeconverter

### Community 17 - "Models.kt"
Cohesion: 0.15
Nodes (12): ChannelType, FILE_IMPORT, GOOGLE_CLASSROOM, SCHOOL_ERP, WHATSAPP, CloudHealthReport, SyncStatus, DROPPED (+4 more)

### Community 18 - "MainActivity.kt"
Cohesion: 0.18
Nodes (11): AppScreen, DASHBOARD, DIAGNOSTICS, WIZARD, MainActivity, childprofile, ComponentActivity, lifecyclescope (+3 more)

### Community 19 - "PermissionHelper.kt"
Cohesion: 0.24
Nodes (8): androidx, launchAccountPicker(), BootReceiver, Context, BroadcastReceiver, Intent, notificationmanagercompat, settings

### Community 21 - "PermissionSetupDialog.kt"
Cohesion: 0.22
Nodes (7): background, border, dialog, dp, lifecycle, lifecycleeventobserver, locallifecycleowner

### Community 22 - "Type.kt"
Cohesion: 0.22
Nodes (8): font, fontfamily, fontweight, googlefont, r, sp, textstyle, typography

### Community 23 - ".onCreate"
Cohesion: 0.29
Nodes (4): KidsApplication, CrawlerTraceLogger, Context, Application

### Community 24 - "WizardStep"
Cohesion: 0.33
Nodes (6): WizardStep, STEP_0_PERMISSIONS, STEP_1_VAULT, STEP_2_CLASSROOM, STEP_3_PORTALS, STEP_4_WHATSAPP

### Community 25 - "ChildProfile"
Cohesion: 0.60
Nodes (3): ChildProfile, ChildCard(), ChildrenGridDashboard()

### Community 26 - "KidsTheme.kt"
Cohesion: 0.40
Nodes (4): KidsTheme(), composable, lightcolorscheme, materialtheme

### Community 28 - "gradlew"
Cohesion: 0.83
Nodes (3): gradlew script, die(), warn()

## Knowledge Gaps
- **31 isolated node(s):** `NoticeEntity`, `AttachmentEntity`, `NoticeFtsEntity`, `DeviceInfo`, `PipelineMetrics` (+26 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 180 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **16 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `ChildProfile` connect `ChildProfile` to `KidsAccessibilityService.kt`, `KidsAccessibilityService`, `ContentCategory`, `OnboardingWizardScreen`, `KotlinGraphifyEngine.kt`, `ChildrenGridDashboard.kt`, `Models.kt`?**
  _High betweenness centrality (0.123) - this node is a cross-community bridge._
- **Why does `KidsAccessibilityService` connect `KidsAccessibilityService` to `KidsAccessibilityService.kt`, `ContentCategory`, `FloatingCrawlerOverlay`, `OnboardingWizardScreen`?**
  _High betweenness centrality (0.109) - this node is a cross-community bridge._
- **Why does `OnboardingWizardScreen()` connect `OnboardingWizardScreen` to `OnboardingWizardScreen.kt`, `Entities.kt`, `MainActivity.kt`, `PermissionHelper.kt`, `ChildProfile`?**
  _High betweenness centrality (0.096) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `KidsAccessibilityService` (e.g. with `ContentClassifier` and `DeduplicationEngine`) actually correct?**
  _`KidsAccessibilityService` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Are the 4 inferred relationships involving `GoogleDriveClient` (e.g. with `.provisionStep1()` and `.provisionStep2Classroom()`) actually correct?**
  _`GoogleDriveClient` has 4 INFERRED edges - model-reasoned connections that need verification._
- **Are the 4 inferred relationships involving `ChildProfile` (e.g. with `.onCreate()` and `OnboardingWizardScreen()`) actually correct?**
  _`ChildProfile` has 4 INFERRED edges - model-reasoned connections that need verification._
- **What connects `NoticeEntity`, `AttachmentEntity`, `NoticeFtsEntity` to the rest of the system?**
  _31 weakly-connected nodes found - possible documentation gaps or missing edges._