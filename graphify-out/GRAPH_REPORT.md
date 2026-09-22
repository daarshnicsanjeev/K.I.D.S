# Graph Report - K.I.D.S  (2026-09-22)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 618 nodes · 1266 edges · 46 communities (28 shown, 18 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 28 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `f05ff181`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- KidsAccessibilityService
- FloatingCrawlerOverlay
- GoogleDriveClient
- KotlinGraphifyEngine.kt
- NoticeDao
- ChildProfile
- MLKitOcrParser.kt
- KidsAccessibilityService.kt
- ChildrenGridDashboard.kt
- SafVaultManager.kt
- StreamManifest
- DriveSyncWorker.kt
- OnboardingWizardScreen.kt
- NotificationParserTest.kt
- ci_watch.py
- AttachmentDao
- DriveVaultManager.kt
- log
- MainActivity.kt
- PermissionHelper.kt
- PrivacyFilterTest
- ContentCategory
- WhatsAppChatExportParser.kt
- K.I.D.S. Android Collector (PRD)
- DeduplicationEngine
- PermissionSetupDialog.kt
- Type.kt
- WizardStep
- ContentClassifierTest
- GestureResultCallback
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

## God Nodes (most connected - your core abstractions)
1. `KidsAccessibilityService` - 56 edges
2. `FloatingCrawlerOverlay` - 35 edges
3. `GoogleDriveClient` - 24 edges
4. `ChildProfile` - 21 edges
5. `OnboardingWizardScreen()` - 19 edges
6. `NoticeDao` - 16 edges
7. `AttachmentDao` - 14 edges
8. `DriveVaultManager` - 13 edges
9. `ContentCategory` - 13 edges
10. `StreamManifest` - 12 edges

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

## Communities (46 total, 18 thin omitted)

### Community 0 - "KidsAccessibilityService"
Cohesion: 0.11
Nodes (5): ExtractedAttachmentDetail, KidsAccessibilityService, AccessibilityNodeInfo, Context, UnvisitedCard

### Community 1 - "FloatingCrawlerOverlay"
Cohesion: 0.07
Nodes (21): AccessibilityService, FloatingCrawlerOverlay, GestureResultCallback, GestureResultCallback, AccessibilityNodeInfo, GestureDescription, GestureResultCallback, Button (+13 more)

### Community 2 - "GoogleDriveClient"
Cohesion: 0.07
Nodes (23): DriveVaultManager, Failure, Context, Result, ProvisionStep1Result, Success, UserConsentRequired, ChannelVaultFolders (+15 more)

### Community 3 - "KotlinGraphifyEngine.kt"
Cohesion: 0.06
Nodes (32): AttachmentEntity, ChildProfileEntity, NoticeEntity, NoticeFtsEntity, Converters, GraphEdge, GraphNode, KnowledgeGraph (+24 more)

### Community 4 - "NoticeDao"
Cohesion: 0.09
Nodes (10): ChildProfileDao, NoticeDao, KidsDatabase, Context, ChildProfileEntity, database, Flow, NoticeEntity (+2 more)

### Community 5 - "ChildProfile"
Cohesion: 0.11
Nodes (14): ChildProfile, MultiChildRouter, ChildCard(), ChildrenGridDashboard(), Context, PermissionHelper, PermissionSetupDialog(), KidsTheme() (+6 more)

### Community 6 - "MLKitOcrParser.kt"
Cohesion: 0.10
Nodes (18): MLKitOcrParser, OcrExtractionResult, Bundle, StatusBarNotification, NotificationParser, ParsedNotification, NotificationParserTest, Bitmap (+10 more)

### Community 7 - "KidsAccessibilityService.kt"
Cohesion: 0.14
Nodes (18): AccessibilityEvent, accessibilitymanager, accessibilityserviceinfo, constraints, delay, existingworkpolicy, fileoutputstream, firstornull (+10 more)

### Community 8 - "ChildrenGridDashboard.kt"
Cohesion: 0.16
Nodes (17): alignment, ProbeItem, DiagnosticFeedScreen(), LogLine, circleshape, clickable, clip, contentdescription (+9 more)

### Community 9 - "SafVaultManager.kt"
Cohesion: 0.27
Nodes (8): Activity, Context, Result, SafVaultFolders, SafVaultManager, ShareTargetActivity, DocumentFile, Uri

### Community 10 - "StreamManifest"
Cohesion: 0.17
Nodes (8): StreamItemStatus, ALREADY_SYNCED, COMPLETED, FAILED_SKIPPED, IN_PROGRESS, PENDING, StreamManifest, StreamManifestItem

### Community 11 - "DriveSyncWorker.kt"
Cohesion: 0.15
Nodes (12): DriveSyncWorker, DeviceInfo, DiagnosticSnapshot, DriveDeepLogger, PipelineMetrics, StepStatus, buildjsonobject, CoroutineWorker (+4 more)

### Community 12 - "OnboardingWizardScreen.kt"
Cohesion: 0.15
Nodes (14): accountmanager, activityresultcontracts, getDefaultSchoolAppList(), Context, queryInstalledLauncherApps(), arrowback, backhandler, channelconfig (+6 more)

### Community 13 - "NotificationParserTest.kt"
Cohesion: 0.23
Nodes (9): assertthat, beforeeach, Bundle, bytearrayinputstream, Context, every, mockk, runblocking (+1 more)

### Community 14 - "ci_watch.py"
Cohesion: 0.21
Nodes (14): os, re, diagnose_failure(), get_latest_run(), main(), monitor_workflow(), CI/CD Pipeline Monitor, Release Verifier & Graphify Guardian for K.I.D.S.…, Runs local Graphify AST extraction and community clustering. (+6 more)

### Community 16 - "DriveVaultManager.kt"
Cohesion: 0.17
Nodes (11): Context, coroutinescope, dispatchers, environment, googleaccountcredential, gsonfactory, launch, nethttptransport (+3 more)

### Community 17 - "log"
Cohesion: 0.19
Nodes (8): KidsApplication, CrawlerTraceLogger, Context, Application, concurrentlinkedqueue, date, locale, log

### Community 18 - "MainActivity.kt"
Cohesion: 0.18
Nodes (12): AppScreen, DASHBOARD, DIAGNOSTICS, WIZARD, MainActivity, childprofile, ComponentActivity, KidsDatabase (+4 more)

### Community 19 - "PermissionHelper.kt"
Cohesion: 0.24
Nodes (8): androidx, launchAccountPicker(), BootReceiver, Context, BroadcastReceiver, Intent, notificationmanagercompat, settings

### Community 21 - "ContentCategory"
Cohesion: 0.24
Nodes (7): ContentClassifier, ContentCategory, ATTENDANCE, CIRCULAR, FEES, HOMEWORK, UNKNOWN

### Community 22 - "WhatsAppChatExportParser.kt"
Cohesion: 0.24
Nodes (6): ImportedNoticeRecord, WhatsAppChatExportParser, Dual WhatsApp Catch-Up Engine, inputstream, pattern, simpledateformat

### Community 23 - "K.I.D.S. Android Collector (PRD)"
Cohesion: 0.22
Nodes (9): AI-Native Storage (JSONL & Markdown), 5-Point Cloud Health Probe, Google Credential Manager API, Memory Boundary Privacy Filter, K.I.D.S. Android Collector (PRD), Restricted Drive Scope (drive.file), Sequential 4-Step Onboarding, Streaming PdfRenderer OCR (+1 more)

### Community 24 - "DeduplicationEngine"
Cohesion: 0.25
Nodes (6): DownloadFolderObserver, DeduplicationEngine, java, KidsNotificationListenerService, ByteArray, NotificationListenerService

### Community 25 - "PermissionSetupDialog.kt"
Cohesion: 0.22
Nodes (7): background, border, dialog, lifecycle, lifecycleeventobserver, locallifecycleowner, roundedcornershape

### Community 26 - "Type.kt"
Cohesion: 0.22
Nodes (8): font, fontfamily, fontweight, googlefont, r, sp, textstyle, typography

### Community 27 - "WizardStep"
Cohesion: 0.33
Nodes (6): WizardStep, STEP_0_PERMISSIONS, STEP_1_VAULT, STEP_2_CLASSROOM, STEP_3_PORTALS, STEP_4_WHATSAPP

### Community 29 - "GestureResultCallback"
Cohesion: 0.50
Nodes (3): GestureResultCallback, GestureDescription, GestureResultCallback

### Community 32 - "gradlew"
Cohesion: 0.83
Nodes (3): gradlew script, die(), warn()

## Knowledge Gaps
- **36 isolated node(s):** `DeviceInfo`, `PipelineMetrics`, `StepStatus`, `CloudHealthReport`, `AttachmentEntity` (+31 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 186 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **18 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `KidsAccessibilityService` connect `KidsAccessibilityService` to `DeduplicationEngine`, `FloatingCrawlerOverlay`, `ContentCategory`, `KidsAccessibilityService.kt`?**
  _High betweenness centrality (0.160) - this node is a cross-community bridge._
- **Why does `ChildProfile` connect `ChildProfile` to `KidsAccessibilityService`, `KotlinGraphifyEngine.kt`, `KidsAccessibilityService.kt`, `ChildrenGridDashboard.kt`, `NotificationParserTest.kt`?**
  _High betweenness centrality (0.118) - this node is a cross-community bridge._
- **Why does `OnboardingWizardScreen()` connect `ChildProfile` to `GoogleDriveClient`, `KotlinGraphifyEngine.kt`, `OnboardingWizardScreen.kt`, `MainActivity.kt`, `PermissionHelper.kt`?**
  _High betweenness centrality (0.088) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `KidsAccessibilityService` (e.g. with `ContentClassifier` and `DeduplicationEngine`) actually correct?**
  _`KidsAccessibilityService` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Are the 4 inferred relationships involving `GoogleDriveClient` (e.g. with `.provisionStep1()` and `.provisionStep2Classroom()`) actually correct?**
  _`GoogleDriveClient` has 4 INFERRED edges - model-reasoned connections that need verification._
- **Are the 4 inferred relationships involving `ChildProfile` (e.g. with `.onCreate()` and `OnboardingWizardScreen()`) actually correct?**
  _`ChildProfile` has 4 INFERRED edges - model-reasoned connections that need verification._
- **What connects `DeviceInfo`, `PipelineMetrics`, `StepStatus` to the rest of the system?**
  _36 weakly-connected nodes found - possible documentation gaps or missing edges._