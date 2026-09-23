# Graph Report - K.I.D.S  (2026-09-23)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 686 nodes · 1436 edges · 48 communities (27 shown, 21 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 33 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `6c93b7d7`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- .log
- ChildProfile
- KidsAccessibilityService
- NoticeDao
- GoogleDriveClient
- MLKitOcrParser.kt
- StreamManifest
- OnboardingWizardScreen
- KidsAccessibilityService.kt
- DriveSyncWorker.kt
- OnboardingWizardScreen.kt
- ChildrenGridDashboard.kt
- DriveVaultManager.kt
- MainActivity.kt
- NotificationParserTest.kt
- ContentCategory
- ci_watch.py
- GoogleDriveClient.kt
- PrivacyFilterTest
- WhatsAppChatExportParser.kt
- PermissionSetupDialog.kt
- K.I.D.S. Android Collector (PRD)
- DeduplicationEngine
- Type.kt
- dispatchers
- NotificationParser.kt
- WizardStep
- WhatsAppChatExportParserTest.kt
- GestureResultCallback
- gradlew
- NotificationParserTest
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
- streamitemstatus
- StreamManifest
- streammanifestitem

## God Nodes (most connected - your core abstractions)
1. `KidsAccessibilityService` - 61 edges
2. `FloatingCrawlerOverlay` - 37 edges
3. `GoogleDriveClient` - 26 edges
4. `ChildProfile` - 21 edges
5. `OnboardingWizardScreen()` - 21 edges
6. `DriveVaultManager` - 19 edges
7. `StreamManifest` - 19 edges
8. `CrawlerTraceLogger` - 18 edges
9. `NoticeDao` - 16 edges
10. `AttachmentDao` - 14 edges

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

## Communities (48 total, 21 thin omitted)

### Community 0 - ".log"
Cohesion: 0.05
Nodes (25): AccessibilityService, CrawlerTraceLogger, Context, FloatingCrawlerOverlay, GestureResultCallback, GestureResultCallback, GestureResultCallback, GestureResultCallback (+17 more)

### Community 1 - "ChildProfile"
Cohesion: 0.05
Nodes (37): AttachmentEntity, ChildProfileEntity, NoticeFtsEntity, Converters, GraphEdge, GraphNode, KnowledgeGraph, KotlinGraphifyEngine (+29 more)

### Community 2 - "KidsAccessibilityService"
Cohesion: 0.11
Nodes (6): AccessibilityNodeInfo, NoticeEntity, ExtractedAttachmentDetail, KidsAccessibilityService, UnvisitedCard, FloatingCrawlerOverlay

### Community 3 - "NoticeDao"
Cohesion: 0.06
Nodes (12): AttachmentDao, ChildProfileDao, AttachmentEntity, NoticeEntity, NoticeDao, KidsDatabase, Context, ChildProfileEntity (+4 more)

### Community 4 - "GoogleDriveClient"
Cohesion: 0.11
Nodes (13): DriveVaultManager, Failure, Context, Result, ProvisionStep1Result, Success, UserConsentRequired, ChannelVaultFolders (+5 more)

### Community 5 - "MLKitOcrParser.kt"
Cohesion: 0.11
Nodes (20): Activity, Context, Result, SafVaultFolders, SafVaultManager, MLKitOcrParser, OcrExtractionResult, ShareTargetActivity (+12 more)

### Community 6 - "StreamManifest"
Cohesion: 0.08
Nodes (9): StreamItemStatus, ALREADY_SYNCED, COMPLETED, FAILED_SKIPPED, IN_PROGRESS, PENDING, StreamManifest, StreamManifestItem (+1 more)

### Community 7 - "OnboardingWizardScreen"
Cohesion: 0.17
Nodes (12): androidx, Context, PermissionHelper, PermissionSetupDialog(), launchAccountPicker(), OnboardingWizardScreen(), BootReceiver, Context (+4 more)

### Community 8 - "KidsAccessibilityService.kt"
Cohesion: 0.13
Nodes (20): AccessibilityEvent, accessibilitymanager, accessibilityserviceinfo, AttachmentEntity, constraints, delay, existingworkpolicy, fileoutputstream (+12 more)

### Community 9 - "DriveSyncWorker.kt"
Cohesion: 0.11
Nodes (17): add, DriveSyncWorker, AttachmentEntity, NoticeEntity, DeviceInfo, DiagnosticSnapshot, DriveDeepLogger, PipelineMetrics (+9 more)

### Community 10 - "OnboardingWizardScreen.kt"
Cohesion: 0.12
Nodes (18): accountmanager, activityresultcontracts, getDefaultSchoolAppList(), Context, queryInstalledLauncherApps(), arrowback, backhandler, channelconfig (+10 more)

### Community 11 - "ChildrenGridDashboard.kt"
Cohesion: 0.16
Nodes (17): alignment, ProbeItem, DiagnosticFeedScreen(), LogLine, background, circleshape, clickable, clip (+9 more)

### Community 12 - "DriveVaultManager.kt"
Cohesion: 0.12
Nodes (16): KidsApplication, Application, CompletableDeferred, concurrentlinkedqueue, coroutinescope, date, filewriter, googleaccountcredential (+8 more)

### Community 13 - "MainActivity.kt"
Cohesion: 0.12
Nodes (16): AppScreen, DASHBOARD, DIAGNOSTICS, WIZARD, MainActivity, KidsTheme(), childprofile, ComponentActivity (+8 more)

### Community 14 - "NotificationParserTest.kt"
Cohesion: 0.19
Nodes (8): DeduplicationHashTest, assertthat, beforeeach, Bundle, every, mockk, runblocking, test

### Community 15 - "ContentCategory"
Cohesion: 0.15
Nodes (8): ContentClassifier, ContentCategory, ATTENDANCE, CIRCULAR, FEES, HOMEWORK, UNKNOWN, ContentClassifierTest

### Community 16 - "ci_watch.py"
Cohesion: 0.21
Nodes (14): os, re, diagnose_failure(), get_latest_run(), main(), monitor_workflow(), CI/CD Pipeline Monitor, Release Verifier & Graphify Guardian for K.I.D.S.…, Runs local Graphify AST extraction and community clustering. (+6 more)

### Community 17 - "GoogleDriveClient.kt"
Cohesion: 0.17
Nodes (10): DriveQuotaInfo, async, bytearraycontent, bytearrayoutputstream, concurrenthashmap, Drive, filecontent, mutex (+2 more)

### Community 19 - "WhatsAppChatExportParser.kt"
Cohesion: 0.24
Nodes (6): ImportedNoticeRecord, WhatsAppChatExportParser, Dual WhatsApp Catch-Up Engine, inputstream, pattern, simpledateformat

### Community 20 - "PermissionSetupDialog.kt"
Cohesion: 0.20
Nodes (8): border, dialog, lifecycle, lifecycleeventobserver, localcontext, locallifecycleowner, modifier, toast

### Community 21 - "K.I.D.S. Android Collector (PRD)"
Cohesion: 0.22
Nodes (9): AI-Native Storage (JSONL & Markdown), 5-Point Cloud Health Probe, Google Credential Manager API, Memory Boundary Privacy Filter, K.I.D.S. Android Collector (PRD), Restricted Drive Scope (drive.file), Sequential 4-Step Onboarding, Streaming PdfRenderer OCR (+1 more)

### Community 22 - "DeduplicationEngine"
Cohesion: 0.25
Nodes (6): DeduplicationEngine, java, NotificationParser, KidsNotificationListenerService, ByteArray, NotificationListenerService

### Community 23 - "Type.kt"
Cohesion: 0.22
Nodes (8): font, fontfamily, fontweight, googlefont, r, sp, textstyle, typography

### Community 24 - "dispatchers"
Cohesion: 0.33
Nodes (5): DownloadFolderObserver, Context, dispatchers, environment, withcontext

### Community 25 - "NotificationParser.kt"
Cohesion: 0.38
Nodes (5): Bundle, StatusBarNotification, ParsedNotification, build, notification

### Community 26 - "WizardStep"
Cohesion: 0.33
Nodes (6): WizardStep, STEP_0_PERMISSIONS, STEP_1_VAULT, STEP_2_CLASSROOM, STEP_3_PORTALS, STEP_4_WHATSAPP

### Community 29 - "gradlew"
Cohesion: 0.83
Nodes (3): gradlew script, die(), warn()

## Knowledge Gaps
- **34 isolated node(s):** `NoticeFtsEntity`, `CloudHealthReport`, `DeviceInfo`, `PipelineMetrics`, `StepStatus` (+29 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 207 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **21 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `KidsAccessibilityService` connect `KidsAccessibilityService` to `.log`, `MLKitOcrParser.kt`, `KidsAccessibilityService.kt`, `OnboardingWizardScreen.kt`, `ContentCategory`, `DeduplicationEngine`?**
  _High betweenness centrality (0.152) - this node is a cross-community bridge._
- **Why does `ChildProfile` connect `ChildProfile` to `KidsAccessibilityService`, `OnboardingWizardScreen`, `KidsAccessibilityService.kt`, `ChildrenGridDashboard.kt`, `NotificationParserTest.kt`?**
  _High betweenness centrality (0.101) - this node is a cross-community bridge._
- **Why does `KidsDatabase` connect `NoticeDao` to `KidsAccessibilityService`?**
  _High betweenness centrality (0.084) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `KidsAccessibilityService` (e.g. with `ContentClassifier` and `DeduplicationEngine`) actually correct?**
  _`KidsAccessibilityService` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Are the 6 inferred relationships involving `GoogleDriveClient` (e.g. with `.preWarmOAuthAndFolders()` and `.provisionStep1()`) actually correct?**
  _`GoogleDriveClient` has 6 INFERRED edges - model-reasoned connections that need verification._
- **Are the 4 inferred relationships involving `ChildProfile` (e.g. with `.onCreate()` and `OnboardingWizardScreen()`) actually correct?**
  _`ChildProfile` has 4 INFERRED edges - model-reasoned connections that need verification._
- **What connects `NoticeFtsEntity`, `CloudHealthReport`, `DeviceInfo` to the rest of the system?**
  _34 weakly-connected nodes found - possible documentation gaps or missing edges._