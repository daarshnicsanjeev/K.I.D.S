# Graph Report - K.I.D.S  (2026-09-22)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 655 nodes · 1360 edges · 46 communities (25 shown, 21 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 28 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `a4c68ef9`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- KidsAccessibilityService
- KidsAccessibilityService.kt
- FloatingCrawlerOverlay
- GoogleDriveClient
- ChildProfile
- NoticeDao
- OnboardingWizardScreen
- MLKitOcrParser.kt
- OnboardingWizardScreen.kt
- ChildrenGridDashboard.kt
- StreamManifest
- SafVaultManager.kt
- ci_watch.py
- PermissionHelper.kt
- PrivacyFilterTest
- ContentCategory
- WhatsAppChatExportParser.kt
- MainActivity.kt
- K.I.D.S. Android Collector (PRD)
- PermissionSetupDialog.kt
- Type.kt
- .onCreate
- assertthat
- WizardStep
- ContentClassifierTest
- GestureResultCallback
- MultiChildAttributionTest
- DeduplicationHashTest
- WhatsAppChatExportParserTest
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
- streamitemstatus
- StreamManifest
- streammanifestitem

## God Nodes (most connected - your core abstractions)
1. `KidsAccessibilityService` - 60 edges
2. `FloatingCrawlerOverlay` - 39 edges
3. `GoogleDriveClient` - 24 edges
4. `ChildProfile` - 21 edges
5. `OnboardingWizardScreen()` - 19 edges
6. `CrawlerTraceLogger` - 18 edges
7. `NoticeDao` - 16 edges
8. `StreamManifest` - 15 edges
9. `AttachmentDao` - 14 edges
10. `ContentCategory` - 13 edges

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

## Communities (46 total, 21 thin omitted)

### Community 0 - "KidsAccessibilityService"
Cohesion: 0.09
Nodes (7): AccessibilityEvent, MultiChildRouter, CrawlerTraceLogger, ExtractedAttachmentDetail, KidsAccessibilityService, AccessibilityNodeInfo, UnvisitedCard

### Community 1 - "KidsAccessibilityService.kt"
Cohesion: 0.05
Nodes (52): accessibilitymanager, accessibilityserviceinfo, add, DownloadFolderObserver, Context, DeduplicationEngine, java, DriveSyncWorker (+44 more)

### Community 2 - "FloatingCrawlerOverlay"
Cohesion: 0.06
Nodes (23): AccessibilityService, FloatingCrawlerOverlay, GestureResultCallback, GestureResultCallback, GestureResultCallback, GestureResultCallback, AccessibilityNodeInfo, GestureDescription (+15 more)

### Community 3 - "GoogleDriveClient"
Cohesion: 0.07
Nodes (25): DriveVaultManager, Failure, Context, Result, ProvisionStep1Result, Success, UserConsentRequired, ChannelVaultFolders (+17 more)

### Community 4 - "ChildProfile"
Cohesion: 0.06
Nodes (32): Converters, GraphEdge, GraphNode, KnowledgeGraph, KotlinGraphifyEngine, Attachment, ChannelConfig, ChannelType (+24 more)

### Community 5 - "NoticeDao"
Cohesion: 0.06
Nodes (12): AttachmentDao, ChildProfileDao, NoticeDao, KidsDatabase, Context, AttachmentEntity, ChildProfileEntity, database (+4 more)

### Community 6 - "OnboardingWizardScreen"
Cohesion: 0.10
Nodes (20): AttachmentEntity, ChildProfileEntity, NoticeEntity, NoticeFtsEntity, MainActivity, Context, PermissionHelper, PermissionSetupDialog() (+12 more)

### Community 7 - "MLKitOcrParser.kt"
Cohesion: 0.10
Nodes (19): MLKitOcrParser, OcrExtractionResult, Bundle, StatusBarNotification, NotificationParser, ParsedNotification, NotificationParserTest, Bitmap (+11 more)

### Community 8 - "OnboardingWizardScreen.kt"
Cohesion: 0.12
Nodes (18): accountmanager, activityresultcontracts, getDefaultSchoolAppList(), Context, queryInstalledLauncherApps(), arrowback, backhandler, channelconfig (+10 more)

### Community 9 - "ChildrenGridDashboard.kt"
Cohesion: 0.16
Nodes (17): ProbeItem, DiagnosticFeedScreen(), LogLine, circleshape, clickable, clip, contentdescription, dp (+9 more)

### Community 10 - "StreamManifest"
Cohesion: 0.16
Nodes (8): StreamItemStatus, ALREADY_SYNCED, COMPLETED, FAILED_SKIPPED, IN_PROGRESS, PENDING, StreamManifest, StreamManifestItem

### Community 11 - "SafVaultManager.kt"
Cohesion: 0.27
Nodes (8): Activity, Context, Result, SafVaultFolders, SafVaultManager, ShareTargetActivity, DocumentFile, Uri

### Community 12 - "ci_watch.py"
Cohesion: 0.21
Nodes (14): os, re, diagnose_failure(), get_latest_run(), main(), monitor_workflow(), CI/CD Pipeline Monitor, Release Verifier & Graphify Guardian for K.I.D.S.…, Runs local Graphify AST extraction and community clustering. (+6 more)

### Community 13 - "PermissionHelper.kt"
Cohesion: 0.24
Nodes (8): androidx, launchAccountPicker(), BootReceiver, Context, BroadcastReceiver, Intent, notificationmanagercompat, settings

### Community 15 - "ContentCategory"
Cohesion: 0.24
Nodes (7): ContentClassifier, ContentCategory, ATTENDANCE, CIRCULAR, FEES, HOMEWORK, UNKNOWN

### Community 16 - "WhatsAppChatExportParser.kt"
Cohesion: 0.24
Nodes (6): ImportedNoticeRecord, WhatsAppChatExportParser, Dual WhatsApp Catch-Up Engine, inputstream, pattern, simpledateformat

### Community 17 - "MainActivity.kt"
Cohesion: 0.20
Nodes (9): AppScreen, DASHBOARD, DIAGNOSTICS, WIZARD, childprofile, lifecyclescope, remembersaveable, setcontent (+1 more)

### Community 18 - "K.I.D.S. Android Collector (PRD)"
Cohesion: 0.22
Nodes (9): AI-Native Storage (JSONL & Markdown), 5-Point Cloud Health Probe, Google Credential Manager API, Memory Boundary Privacy Filter, K.I.D.S. Android Collector (PRD), Restricted Drive Scope (drive.file), Sequential 4-Step Onboarding, Streaming PdfRenderer OCR (+1 more)

### Community 19 - "PermissionSetupDialog.kt"
Cohesion: 0.22
Nodes (7): alignment, background, border, dialog, lifecycle, lifecycleeventobserver, locallifecycleowner

### Community 20 - "Type.kt"
Cohesion: 0.22
Nodes (8): font, fontfamily, fontweight, googlefont, r, sp, textstyle, typography

### Community 21 - ".onCreate"
Cohesion: 0.32
Nodes (3): KidsApplication, Context, Application

### Community 22 - "assertthat"
Cohesion: 0.46
Nodes (4): assertthat, beforeeach, bytearrayinputstream, test

### Community 23 - "WizardStep"
Cohesion: 0.33
Nodes (6): WizardStep, STEP_0_PERMISSIONS, STEP_1_VAULT, STEP_2_CLASSROOM, STEP_3_PORTALS, STEP_4_WHATSAPP

### Community 25 - "GestureResultCallback"
Cohesion: 0.50
Nodes (3): GestureResultCallback, GestureDescription, GestureResultCallback

### Community 29 - "gradlew"
Cohesion: 0.83
Nodes (3): gradlew script, die(), warn()

## Knowledge Gaps
- **36 isolated node(s):** `CloudHealthReport`, `DeviceInfo`, `PipelineMetrics`, `StepStatus`, `AttachmentEntity` (+31 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 198 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **21 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `KidsAccessibilityService` connect `KidsAccessibilityService` to `KidsAccessibilityService.kt`, `FloatingCrawlerOverlay`, `OnboardingWizardScreen`, `OnboardingWizardScreen.kt`, `ContentCategory`?**
  _High betweenness centrality (0.204) - this node is a cross-community bridge._
- **Why does `ChildProfile` connect `ChildProfile` to `KidsAccessibilityService`, `KidsAccessibilityService.kt`, `OnboardingWizardScreen`, `ChildrenGridDashboard.kt`, `assertthat`, `MultiChildAttributionTest`?**
  _High betweenness centrality (0.109) - this node is a cross-community bridge._
- **Why does `FloatingCrawlerOverlay` connect `FloatingCrawlerOverlay` to `KidsAccessibilityService`?**
  _High betweenness centrality (0.088) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `KidsAccessibilityService` (e.g. with `ContentClassifier` and `DeduplicationEngine`) actually correct?**
  _`KidsAccessibilityService` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Are the 4 inferred relationships involving `GoogleDriveClient` (e.g. with `.provisionStep1()` and `.provisionStep2Classroom()`) actually correct?**
  _`GoogleDriveClient` has 4 INFERRED edges - model-reasoned connections that need verification._
- **Are the 4 inferred relationships involving `ChildProfile` (e.g. with `.onCreate()` and `OnboardingWizardScreen()`) actually correct?**
  _`ChildProfile` has 4 INFERRED edges - model-reasoned connections that need verification._
- **What connects `CloudHealthReport`, `DeviceInfo`, `PipelineMetrics` to the rest of the system?**
  _36 weakly-connected nodes found - possible documentation gaps or missing edges._