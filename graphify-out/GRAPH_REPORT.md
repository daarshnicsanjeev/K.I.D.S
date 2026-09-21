# Graph Report - K.I.D.S  (2026-09-22)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 570 nodes · 1121 edges · 39 communities (23 shown, 16 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 27 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `52b7bd3f`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- KidsAccessibilityService
- FloatingCrawlerOverlay
- DriveVaultManager.kt
- KidsAccessibilityService.kt
- NoticeDao
- ChildProfile
- GoogleDriveClient
- ci_watch.py
- MLKitOcrParser.kt
- OnboardingWizardScreen.kt
- .provisionStep1
- OnboardingWizardScreen
- ChildrenGridDashboard.kt
- AttachmentDao
- MainActivity.kt
- SafVaultManager.kt
- PermissionHelper.kt
- PrivacyFilterTest
- ContentCategory
- WhatsAppChatExportParser.kt
- K.I.D.S. Android Collector (PRD)
- Type.kt
- assertthat
- WizardStep
- ContentClassifierTest
- MultiChildAttributionTest
- DeduplicationHashTest
- WhatsAppChatExportParserTest
- gradlew
- Result
- java
- Bundle
- AccessibilityNodeInfo
- provisionstep1result
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

## Communities (39 total, 16 thin omitted)

### Community 0 - "KidsAccessibilityService"
Cohesion: 0.11
Nodes (7): AccessibilityEvent, AccessibilityNodeInfo, ExtractedAttachmentDetail, KidsAccessibilityService, Context, UnvisitedCard, FloatingCrawlerOverlay

### Community 1 - "FloatingCrawlerOverlay"
Cohesion: 0.07
Nodes (18): FloatingCrawlerOverlay, GestureResultCallback, AccessibilityNodeInfo, GestureResultCallback, Button, GestureDescription, gradientdrawable, gravity (+10 more)

### Community 2 - "DriveVaultManager.kt"
Cohesion: 0.07
Nodes (31): Context, KidsApplication, CrawlerTraceLogger, Context, DriveSyncWorker, DeviceInfo, DiagnosticSnapshot, DriveDeepLogger (+23 more)

### Community 3 - "KidsAccessibilityService.kt"
Cohesion: 0.08
Nodes (25): accessibilitymanager, AccessibilityService, accessibilityserviceinfo, DownloadFolderObserver, DeduplicationEngine, java, MultiChildRouter, KidsNotificationListenerService (+17 more)

### Community 4 - "NoticeDao"
Cohesion: 0.09
Nodes (10): ChildProfileDao, NoticeDao, KidsDatabase, Context, ChildProfileEntity, database, Flow, NoticeEntity (+2 more)

### Community 5 - "ChildProfile"
Cohesion: 0.11
Nodes (22): GraphEdge, GraphNode, KnowledgeGraph, KotlinGraphifyEngine, Attachment, ChannelType, FILE_IMPORT, GOOGLE_CLASSROOM (+14 more)

### Community 6 - "GoogleDriveClient"
Cohesion: 0.09
Nodes (13): ChannelVaultFolders, ChildVaultFolders, DriveQuotaInfo, GoogleDriveClient, async, bytearraycontent, bytearrayoutputstream, concurrenthashmap (+5 more)

### Community 7 - "ci_watch.py"
Cohesion: 0.09
Nodes (26): AttachmentEntity, NoticeEntity, NoticeFtsEntity, Converters, ChannelConfig, encodetostring, entity, fts4 (+18 more)

### Community 8 - "MLKitOcrParser.kt"
Cohesion: 0.10
Nodes (19): MLKitOcrParser, OcrExtractionResult, Bundle, StatusBarNotification, NotificationParser, ParsedNotification, NotificationParserTest, Bitmap (+11 more)

### Community 9 - "OnboardingWizardScreen.kt"
Cohesion: 0.10
Nodes (23): accountmanager, activity, activityresultcontracts, getDefaultSchoolAppList(), Context, queryInstalledLauncherApps(), arrowback, background (+15 more)

### Community 10 - ".provisionStep1"
Cohesion: 0.18
Nodes (13): DriveVaultManager, Failure, Context, ProvisionStep1Result, Success, UserConsentRequired, Result, DriveVaultManagerTest (+5 more)

### Community 11 - "OnboardingWizardScreen"
Cohesion: 0.19
Nodes (10): ChildProfileEntity, Context, PermissionHelper, PermissionSetupDialog(), KidsTheme(), OnboardingWizardScreen(), Bundle, composable (+2 more)

### Community 12 - "ChildrenGridDashboard.kt"
Cohesion: 0.16
Nodes (17): alignment, ProbeItem, DiagnosticFeedScreen(), LogLine, circleshape, clickable, clip, contentdescription (+9 more)

### Community 14 - "MainActivity.kt"
Cohesion: 0.16
Nodes (13): AppScreen, DASHBOARD, DIAGNOSTICS, WIZARD, MainActivity, childprofile, ComponentActivity, KidsDatabase (+5 more)

### Community 15 - "SafVaultManager.kt"
Cohesion: 0.44
Nodes (6): Context, Result, SafVaultFolders, SafVaultManager, DocumentFile, Uri

### Community 16 - "PermissionHelper.kt"
Cohesion: 0.24
Nodes (8): androidx, launchAccountPicker(), BootReceiver, Context, BroadcastReceiver, Intent, notificationmanagercompat, settings

### Community 18 - "ContentCategory"
Cohesion: 0.24
Nodes (7): ContentClassifier, ContentCategory, ATTENDANCE, CIRCULAR, FEES, HOMEWORK, UNKNOWN

### Community 19 - "WhatsAppChatExportParser.kt"
Cohesion: 0.24
Nodes (6): ImportedNoticeRecord, WhatsAppChatExportParser, Dual WhatsApp Catch-Up Engine, inputstream, pattern, simpledateformat

### Community 20 - "K.I.D.S. Android Collector (PRD)"
Cohesion: 0.22
Nodes (9): AI-Native Storage (JSONL & Markdown), 5-Point Cloud Health Probe, Google Credential Manager API, Memory Boundary Privacy Filter, K.I.D.S. Android Collector (PRD), Restricted Drive Scope (drive.file), Sequential 4-Step Onboarding, Streaming PdfRenderer OCR (+1 more)

### Community 21 - "Type.kt"
Cohesion: 0.25
Nodes (7): font, fontfamily, googlefont, r, sp, textstyle, typography

### Community 22 - "assertthat"
Cohesion: 0.46
Nodes (4): assertthat, beforeeach, bytearrayinputstream, test

### Community 23 - "WizardStep"
Cohesion: 0.33
Nodes (6): WizardStep, STEP_0_PERMISSIONS, STEP_1_VAULT, STEP_2_CLASSROOM, STEP_3_PORTALS, STEP_4_WHATSAPP

### Community 28 - "gradlew"
Cohesion: 0.83
Nodes (3): gradlew script, die(), warn()

## Knowledge Gaps
- **29 isolated node(s):** `DeviceInfo`, `PipelineMetrics`, `StepStatus`, `CloudHealthReport`, `NoticeFtsEntity` (+24 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 174 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **16 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `ChildProfile` connect `ChildProfile` to `KidsAccessibilityService`, `KidsAccessibilityService.kt`, `OnboardingWizardScreen`, `ChildrenGridDashboard.kt`, `assertthat`, `MultiChildAttributionTest`?**
  _High betweenness centrality (0.126) - this node is a cross-community bridge._
- **Why does `KidsAccessibilityService` connect `KidsAccessibilityService` to `ContentCategory`, `KidsAccessibilityService.kt`?**
  _High betweenness centrality (0.107) - this node is a cross-community bridge._
- **Why does `OnboardingWizardScreen()` connect `OnboardingWizardScreen` to `ChildProfile`, `ci_watch.py`, `OnboardingWizardScreen.kt`, `.provisionStep1`, `MainActivity.kt`, `PermissionHelper.kt`?**
  _High betweenness centrality (0.097) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `KidsAccessibilityService` (e.g. with `ContentClassifier` and `DeduplicationEngine`) actually correct?**
  _`KidsAccessibilityService` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Are the 4 inferred relationships involving `GoogleDriveClient` (e.g. with `.provisionStep1()` and `.provisionStep2Classroom()`) actually correct?**
  _`GoogleDriveClient` has 4 INFERRED edges - model-reasoned connections that need verification._
- **Are the 3 inferred relationships involving `ChildProfile` (e.g. with `.onCreate()` and `OnboardingWizardScreen()`) actually correct?**
  _`ChildProfile` has 3 INFERRED edges - model-reasoned connections that need verification._
- **What connects `DeviceInfo`, `PipelineMetrics`, `StepStatus` to the rest of the system?**
  _29 weakly-connected nodes found - possible documentation gaps or missing edges._