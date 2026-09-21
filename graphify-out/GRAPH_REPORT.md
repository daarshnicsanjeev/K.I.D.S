# Graph Report - K.I.D.S  (2026-09-21)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 558 nodes · 1091 edges · 32 communities (21 shown, 11 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 26 edges (avg confidence: 0.87)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `f0cc54a0`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- KidsAccessibilityService.kt
- NoticeDao
- ContentCategory
- FloatingCrawlerOverlay
- ChildProfile
- ci_watch.py
- KidsAccessibilityService
- GoogleDriveClient
- K.I.D.S. Android Collector (PRD)
- .provisionStep1
- SafVaultManager.kt
- MLKitOcrParser.kt
- OnboardingWizardScreen
- ChildrenGridDashboard.kt
- OnboardingWizardScreen.kt
- PermissionHelper.kt
- MainActivity.kt
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
1. `KidsAccessibilityService` - 42 edges
2. `FloatingCrawlerOverlay` - 26 edges
3. `GoogleDriveClient` - 24 edges
4. `ChildProfile` - 20 edges
5. `OnboardingWizardScreen()` - 19 edges
6. `NoticeDao` - 15 edges
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

## Communities (32 total, 11 thin omitted)

### Community 0 - "KidsAccessibilityService.kt"
Cohesion: 0.06
Nodes (46): accessibilitymanager, accessibilityserviceinfo, DownloadFolderObserver, Context, DeduplicationEngine, java, NotificationParser, KidsApplication (+38 more)

### Community 1 - "NoticeDao"
Cohesion: 0.07
Nodes (12): AttachmentDao, ChildProfileDao, NoticeDao, KidsDatabase, Context, AttachmentEntity, ChildProfileEntity, database (+4 more)

### Community 2 - "ContentCategory"
Cohesion: 0.06
Nodes (20): ContentClassifier, PrivacyFilter, ContentCategory, ATTENDANCE, CIRCULAR, FEES, HOMEWORK, UNKNOWN (+12 more)

### Community 3 - "FloatingCrawlerOverlay"
Cohesion: 0.08
Nodes (20): AccessibilityService, FloatingCrawlerOverlay, GestureResultCallback, AccessibilityNodeInfo, Button, Context, GestureDescription, gradientdrawable (+12 more)

### Community 4 - "ChildProfile"
Cohesion: 0.08
Nodes (24): GraphEdge, GraphNode, KnowledgeGraph, KotlinGraphifyEngine, Attachment, ChannelType, FILE_IMPORT, GOOGLE_CLASSROOM (+16 more)

### Community 5 - "ci_watch.py"
Cohesion: 0.06
Nodes (33): AttachmentEntity, ChildProfileEntity, NoticeEntity, NoticeFtsEntity, Converters, ChannelConfig, DeviceInfo, DiagnosticSnapshot (+25 more)

### Community 6 - "KidsAccessibilityService"
Cohesion: 0.13
Nodes (5): AccessibilityEvent, ExtractedAttachmentDetail, KidsAccessibilityService, AccessibilityNodeInfo, UnvisitedCard

### Community 7 - "GoogleDriveClient"
Cohesion: 0.09
Nodes (14): ChannelVaultFolders, ChildVaultFolders, DriveQuotaInfo, GoogleDriveClient, async, bytearraycontent, bytearrayoutputstream, concurrenthashmap (+6 more)

### Community 8 - "K.I.D.S. Android Collector (PRD)"
Cohesion: 0.09
Nodes (16): AI-Native Storage (JSONL & Markdown), ImportedNoticeRecord, WhatsAppChatExportParser, WhatsAppChatExportParserTest, Dual WhatsApp Catch-Up Engine, 5-Point Cloud Health Probe, Google Credential Manager API, inputstream (+8 more)

### Community 9 - ".provisionStep1"
Cohesion: 0.23
Nodes (10): DriveVaultManager, Failure, Context, ProvisionStep1Result, Success, UserConsentRequired, Result, DriveVaultManagerTest (+2 more)

### Community 10 - "SafVaultManager.kt"
Cohesion: 0.19
Nodes (11): Context, Result, SafVaultFolders, SafVaultManager, CrawlerTraceLogger, Context, concurrentlinkedqueue, date (+3 more)

### Community 11 - "MLKitOcrParser.kt"
Cohesion: 0.12
Nodes (16): MLKitOcrParser, OcrExtractionResult, Bundle, StatusBarNotification, ParsedNotification, Bitmap, build, inputimage (+8 more)

### Community 12 - "OnboardingWizardScreen"
Cohesion: 0.22
Nodes (8): Context, PermissionHelper, PermissionSetupDialog(), KidsTheme(), OnboardingWizardScreen(), composable, lightcolorscheme, materialtheme

### Community 13 - "ChildrenGridDashboard.kt"
Cohesion: 0.16
Nodes (17): alignment, ProbeItem, DiagnosticFeedScreen(), LogLine, background, circleshape, clickable, clip (+9 more)

### Community 14 - "OnboardingWizardScreen.kt"
Cohesion: 0.14
Nodes (15): accountmanager, activity, activityresultcontracts, getDefaultSchoolAppList(), Context, queryInstalledLauncherApps(), arrowback, backhandler (+7 more)

### Community 15 - "PermissionHelper.kt"
Cohesion: 0.24
Nodes (8): androidx, launchAccountPicker(), BootReceiver, Context, BroadcastReceiver, Intent, notificationmanagercompat, settings

### Community 16 - "MainActivity.kt"
Cohesion: 0.20
Nodes (9): AppScreen, DASHBOARD, DIAGNOSTICS, WIZARD, childprofile, lifecyclescope, remembersaveable, setcontent (+1 more)

### Community 17 - "PermissionSetupDialog.kt"
Cohesion: 0.22
Nodes (7): border, dialog, lifecycle, lifecycleeventobserver, localcontext, locallifecycleowner, modifier

### Community 18 - "Type.kt"
Cohesion: 0.22
Nodes (8): font, fontfamily, fontweight, googlefont, r, sp, textstyle, typography

### Community 19 - "WizardStep"
Cohesion: 0.33
Nodes (6): WizardStep, STEP_0_PERMISSIONS, STEP_1_VAULT, STEP_2_CLASSROOM, STEP_3_PORTALS, STEP_4_WHATSAPP

### Community 20 - "gradlew"
Cohesion: 0.83
Nodes (3): gradlew script, die(), warn()

## Knowledge Gaps
- **29 isolated node(s):** `CloudHealthReport`, `DeviceInfo`, `PipelineMetrics`, `StepStatus`, `NoticeFtsEntity` (+24 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 172 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **11 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `KidsAccessibilityService` connect `KidsAccessibilityService` to `KidsAccessibilityService.kt`, `ContentCategory`, `FloatingCrawlerOverlay`?**
  _High betweenness centrality (0.128) - this node is a cross-community bridge._
- **Why does `ChildProfile` connect `ChildProfile` to `KidsAccessibilityService.kt`, `OnboardingWizardScreen`, `ChildrenGridDashboard.kt`, `KidsAccessibilityService`?**
  _High betweenness centrality (0.126) - this node is a cross-community bridge._
- **Why does `OnboardingWizardScreen()` connect `OnboardingWizardScreen` to `ChildProfile`, `ci_watch.py`, `.provisionStep1`, `OnboardingWizardScreen.kt`, `PermissionHelper.kt`, `MainActivity.kt`?**
  _High betweenness centrality (0.099) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `KidsAccessibilityService` (e.g. with `ContentClassifier` and `DeduplicationEngine`) actually correct?**
  _`KidsAccessibilityService` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Are the 4 inferred relationships involving `GoogleDriveClient` (e.g. with `.provisionStep1()` and `.provisionStep2Classroom()`) actually correct?**
  _`GoogleDriveClient` has 4 INFERRED edges - model-reasoned connections that need verification._
- **Are the 3 inferred relationships involving `ChildProfile` (e.g. with `.onCreate()` and `OnboardingWizardScreen()`) actually correct?**
  _`ChildProfile` has 3 INFERRED edges - model-reasoned connections that need verification._
- **What connects `CloudHealthReport`, `DeviceInfo`, `PipelineMetrics` to the rest of the system?**
  _29 weakly-connected nodes found - possible documentation gaps or missing edges._