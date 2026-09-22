# Graph Report - K.I.D.S  (2026-09-22)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 576 nodes · 1130 edges · 35 communities (21 shown, 14 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 27 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `6182c71a`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- DriveVaultManager.kt
- ContentCategory
- FloatingCrawlerOverlay
- KidsAccessibilityService
- GoogleDriveClient
- KidsAccessibilityService.kt
- ChildProfile
- NoticeDao
- DriveDeepLogger.kt
- OnboardingWizardScreen
- K.I.D.S. Android Collector (PRD)
- ChildrenGridDashboard.kt
- OnboardingWizardScreen.kt
- ci_watch.py
- AttachmentDao
- MainActivity.kt
- PermissionSetupDialog.kt
- Type.kt
- .onCreate
- WizardStep
- KidsTheme.kt
- gradlew
- AccessibilityNodeInfo
- java
- Bundle
- ChildVaultFolders
- FloatingCrawlerOverlay
- GestureDescription
- provisionstep1result
- Result
- role
- statusbarnotification

## God Nodes (most connected - your core abstractions)
1. `KidsAccessibilityService` - 45 edges
2. `FloatingCrawlerOverlay` - 31 edges
3. `GoogleDriveClient` - 24 edges
4. `ChildProfile` - 21 edges
5. `OnboardingWizardScreen()` - 19 edges
6. `NoticeDao` - 16 edges
7. `AttachmentDao` - 14 edges
8. `ContentCategory` - 13 edges
9. `DriveVaultManager` - 13 edges
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

## Communities (35 total, 14 thin omitted)

### Community 0 - "DriveVaultManager.kt"
Cohesion: 0.06
Nodes (48): Context, Context, Result, SafVaultFolders, SafVaultManager, MLKitOcrParser, OcrExtractionResult, DriveSyncWorker (+40 more)

### Community 1 - "ContentCategory"
Cohesion: 0.06
Nodes (25): ContentClassifier, ContentCategory, ATTENDANCE, CIRCULAR, FEES, HOMEWORK, UNKNOWN, Bundle (+17 more)

### Community 2 - "FloatingCrawlerOverlay"
Cohesion: 0.07
Nodes (20): AccessibilityService, FloatingCrawlerOverlay, GestureResultCallback, AccessibilityNodeInfo, GestureDescription, GestureResultCallback, Button, gradientdrawable (+12 more)

### Community 3 - "KidsAccessibilityService"
Cohesion: 0.12
Nodes (6): AccessibilityEvent, ExtractedAttachmentDetail, KidsAccessibilityService, AccessibilityNodeInfo, Context, UnvisitedCard

### Community 4 - "GoogleDriveClient"
Cohesion: 0.10
Nodes (14): DriveVaultManager, Failure, Context, Result, ProvisionStep1Result, Success, UserConsentRequired, ChannelVaultFolders (+6 more)

### Community 5 - "KidsAccessibilityService.kt"
Cohesion: 0.07
Nodes (27): accessibilitymanager, accessibilityserviceinfo, DownloadFolderObserver, DeduplicationEngine, java, PrivacyFilter, MultiChildRouter, GestureResultCallback (+19 more)

### Community 6 - "ChildProfile"
Cohesion: 0.08
Nodes (23): GraphEdge, GraphNode, KnowledgeGraph, KotlinGraphifyEngine, Attachment, ChannelType, FILE_IMPORT, GOOGLE_CLASSROOM (+15 more)

### Community 7 - "NoticeDao"
Cohesion: 0.09
Nodes (10): ChildProfileDao, NoticeDao, KidsDatabase, Context, ChildProfileEntity, database, Flow, NoticeEntity (+2 more)

### Community 8 - "DriveDeepLogger.kt"
Cohesion: 0.09
Nodes (18): AttachmentEntity, ChildProfileEntity, NoticeEntity, NoticeFtsEntity, Converters, ChannelConfig, DeviceInfo, DiagnosticSnapshot (+10 more)

### Community 9 - "OnboardingWizardScreen"
Cohesion: 0.17
Nodes (12): androidx, Context, PermissionHelper, PermissionSetupDialog(), launchAccountPicker(), OnboardingWizardScreen(), BootReceiver, Context (+4 more)

### Community 10 - "K.I.D.S. Android Collector (PRD)"
Cohesion: 0.09
Nodes (16): AI-Native Storage (JSONL & Markdown), ImportedNoticeRecord, WhatsAppChatExportParser, WhatsAppChatExportParserTest, Dual WhatsApp Catch-Up Engine, 5-Point Cloud Health Probe, Google Credential Manager API, inputstream (+8 more)

### Community 11 - "ChildrenGridDashboard.kt"
Cohesion: 0.16
Nodes (17): alignment, ProbeItem, DiagnosticFeedScreen(), LogLine, background, circleshape, clickable, clip (+9 more)

### Community 12 - "OnboardingWizardScreen.kt"
Cohesion: 0.14
Nodes (15): accountmanager, activity, activityresultcontracts, getDefaultSchoolAppList(), Context, queryInstalledLauncherApps(), arrowback, backhandler (+7 more)

### Community 13 - "ci_watch.py"
Cohesion: 0.21
Nodes (14): os, re, diagnose_failure(), get_latest_run(), main(), monitor_workflow(), CI/CD Pipeline Monitor, Release Verifier & Graphify Guardian for K.I.D.S.…, Runs local Graphify AST extraction and community clustering. (+6 more)

### Community 15 - "MainActivity.kt"
Cohesion: 0.16
Nodes (13): AppScreen, DASHBOARD, DIAGNOSTICS, WIZARD, MainActivity, Bundle, childprofile, ComponentActivity (+5 more)

### Community 16 - "PermissionSetupDialog.kt"
Cohesion: 0.22
Nodes (7): border, dialog, lifecycle, lifecycleeventobserver, localcontext, locallifecycleowner, roundedcornershape

### Community 17 - "Type.kt"
Cohesion: 0.22
Nodes (8): font, fontfamily, fontweight, googlefont, r, sp, textstyle, typography

### Community 18 - ".onCreate"
Cohesion: 0.29
Nodes (4): KidsApplication, CrawlerTraceLogger, Context, Application

### Community 19 - "WizardStep"
Cohesion: 0.33
Nodes (6): WizardStep, STEP_0_PERMISSIONS, STEP_1_VAULT, STEP_2_CLASSROOM, STEP_3_PORTALS, STEP_4_WHATSAPP

### Community 20 - "KidsTheme.kt"
Cohesion: 0.40
Nodes (4): KidsTheme(), composable, lightcolorscheme, materialtheme

### Community 21 - "gradlew"
Cohesion: 0.83
Nodes (3): gradlew script, die(), warn()

## Knowledge Gaps
- **31 isolated node(s):** `CloudHealthReport`, `AttachmentEntity`, `NoticeEntity`, `NoticeFtsEntity`, `DeviceInfo` (+26 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 181 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **14 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `KidsAccessibilityService` connect `KidsAccessibilityService` to `ContentCategory`, `FloatingCrawlerOverlay`, `KidsAccessibilityService.kt`?**
  _High betweenness centrality (0.138) - this node is a cross-community bridge._
- **Why does `ChildProfile` connect `ChildProfile` to `ContentCategory`, `KidsAccessibilityService`, `KidsAccessibilityService.kt`, `OnboardingWizardScreen`, `ChildrenGridDashboard.kt`?**
  _High betweenness centrality (0.132) - this node is a cross-community bridge._
- **Why does `OnboardingWizardScreen()` connect `OnboardingWizardScreen` to `GoogleDriveClient`, `ChildProfile`, `DriveDeepLogger.kt`, `OnboardingWizardScreen.kt`, `MainActivity.kt`?**
  _High betweenness centrality (0.100) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `KidsAccessibilityService` (e.g. with `ContentClassifier` and `DeduplicationEngine`) actually correct?**
  _`KidsAccessibilityService` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Are the 4 inferred relationships involving `GoogleDriveClient` (e.g. with `.provisionStep1()` and `.provisionStep2Classroom()`) actually correct?**
  _`GoogleDriveClient` has 4 INFERRED edges - model-reasoned connections that need verification._
- **Are the 4 inferred relationships involving `ChildProfile` (e.g. with `.onCreate()` and `OnboardingWizardScreen()`) actually correct?**
  _`ChildProfile` has 4 INFERRED edges - model-reasoned connections that need verification._
- **What connects `CloudHealthReport`, `AttachmentEntity`, `NoticeEntity` to the rest of the system?**
  _31 weakly-connected nodes found - possible documentation gaps or missing edges._