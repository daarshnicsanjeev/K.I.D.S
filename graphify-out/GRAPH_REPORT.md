# Graph Report - K.I.D.S  (2026-09-23)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 717 nodes · 1535 edges · 51 communities (32 shown, 19 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 33 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `cbd9b449`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- KidsAccessibilityService
- ChildProfile
- NoticeDao
- OnboardingWizardScreen
- StreamManifest
- GoogleDriveClient
- MLKitOcrParser.kt
- FloatingCrawlerOverlay
- KidsAccessibilityService.kt
- DriveSyncWorker.kt
- OnboardingWizardScreen.kt
- ChildrenGridDashboard.kt
- DriveVaultManager.kt
- GestureDescription
- .log
- ContentCategory
- ci_watch.py
- FloatingCrawlerOverlay.kt
- MainActivity.kt
- assertthat
- Intent
- SafVaultManager
- PrivacyFilterTest
- Uri
- K.I.D.S. Android Collector (PRD)
- WhatsAppChatExportParser.kt
- PermissionSetupDialog.kt
- Type.kt
- DeduplicationEngine
- .findPrimaryScrollableNode
- GestureDescription
- dispatchers
- WizardStep
- SyncStatus
- WhatsAppChatExportParserTest
- gradlew
- KidsApplication.kt
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
1. `KidsAccessibilityService` - 75 edges
2. `FloatingCrawlerOverlay` - 40 edges
3. `GoogleDriveClient` - 26 edges
4. `ChildProfile` - 21 edges
5. `OnboardingWizardScreen()` - 21 edges
6. `DriveVaultManager` - 19 edges
7. `CrawlerTraceLogger` - 18 edges
8. `NoticeDao` - 16 edges
9. `StreamManifest` - 16 edges
10. `StreamManifestAndCardTest` - 16 edges

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

## Communities (51 total, 19 thin omitted)

### Community 0 - "KidsAccessibilityService"
Cohesion: 0.09
Nodes (8): AccessibilityEvent, AccessibilityNodeInfo, ExtractedAttachmentDetail, KidsAccessibilityService, UnvisitedCard, FloatingCrawlerOverlay, StreamManifest, StreamManifestItem

### Community 1 - "ChildProfile"
Cohesion: 0.05
Nodes (36): AttachmentEntity, ChildProfileEntity, NoticeEntity, NoticeFtsEntity, Converters, GraphEdge, GraphNode, KnowledgeGraph (+28 more)

### Community 2 - "NoticeDao"
Cohesion: 0.06
Nodes (12): AttachmentDao, ChildProfileDao, AttachmentEntity, NoticeEntity, NoticeDao, KidsDatabase, Context, ChildProfileEntity (+4 more)

### Community 3 - "OnboardingWizardScreen"
Cohesion: 0.12
Nodes (17): DriveVaultManager, Failure, Context, Result, ProvisionStep1Result, Success, UserConsentRequired, ChildVaultFolders (+9 more)

### Community 4 - "StreamManifest"
Cohesion: 0.08
Nodes (9): StreamItemStatus, ALREADY_SYNCED, COMPLETED, FAILED_SKIPPED, IN_PROGRESS, PENDING, StreamManifest, StreamManifestItem (+1 more)

### Community 5 - "GoogleDriveClient"
Cohesion: 0.09
Nodes (13): ChannelVaultFolders, DriveQuotaInfo, GoogleDriveClient, async, bytearraycontent, bytearrayoutputstream, concurrenthashmap, Drive (+5 more)

### Community 6 - "MLKitOcrParser.kt"
Cohesion: 0.09
Nodes (20): MLKitOcrParser, OcrExtractionResult, Bundle, StatusBarNotification, NotificationParser, ParsedNotification, NotificationParserTest, Bitmap (+12 more)

### Community 7 - "FloatingCrawlerOverlay"
Cohesion: 0.15
Nodes (3): FloatingCrawlerOverlay, View, WindowManager

### Community 8 - "KidsAccessibilityService.kt"
Cohesion: 0.12
Nodes (22): accessibilitymanager, accessibilityserviceinfo, StatusBarNotification, AttachmentEntity, cancel, constraints, delay, existingworkpolicy (+14 more)

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
Cohesion: 0.14
Nodes (16): CompletableDeferred, concurrentlinkedqueue, coroutinescope, date, filewriter, googleaccountcredential, gsonfactory, launch (+8 more)

### Community 13 - "GestureDescription"
Cohesion: 0.16
Nodes (6): GestureResultCallback, GestureResultCallback, GestureResultCallback, GestureResultCallback, GestureDescription, GestureResultCallback

### Community 15 - "ContentCategory"
Cohesion: 0.15
Nodes (8): ContentClassifier, ContentCategory, ATTENDANCE, CIRCULAR, FEES, HOMEWORK, UNKNOWN, ContentClassifierTest

### Community 16 - "ci_watch.py"
Cohesion: 0.21
Nodes (14): os, re, diagnose_failure(), get_latest_run(), main(), monitor_workflow(), CI/CD Pipeline Monitor, Release Verifier & Graphify Guardian for K.I.D.S.…, Runs local Graphify AST extraction and community clustering. (+6 more)

### Community 17 - "FloatingCrawlerOverlay.kt"
Cohesion: 0.14
Nodes (13): AccessibilityService, Button, gradientdrawable, gravity, handler, LinearLayout, looper, motionevent (+5 more)

### Community 18 - "MainActivity.kt"
Cohesion: 0.18
Nodes (12): AppScreen, DASHBOARD, DIAGNOSTICS, WIZARD, MainActivity, childprofile, ComponentActivity, KidsDatabase (+4 more)

### Community 19 - "assertthat"
Cohesion: 0.26
Nodes (5): DeduplicationHashTest, assertthat, beforeeach, bytearrayinputstream, test

### Community 20 - "Intent"
Cohesion: 0.24
Nodes (8): androidx, launchAccountPicker(), BootReceiver, Context, BroadcastReceiver, Intent, notificationmanagercompat, settings

### Community 21 - "SafVaultManager"
Cohesion: 0.49
Nodes (5): Context, Result, SafVaultFolders, SafVaultManager, DocumentFile

### Community 23 - "Uri"
Cohesion: 0.33
Nodes (4): Activity, android, ShareTargetActivity, Uri

### Community 24 - "K.I.D.S. Android Collector (PRD)"
Cohesion: 0.22
Nodes (9): AI-Native Storage (JSONL & Markdown), 5-Point Cloud Health Probe, Google Credential Manager API, Memory Boundary Privacy Filter, K.I.D.S. Android Collector (PRD), Restricted Drive Scope (drive.file), Sequential 4-Step Onboarding, Streaming PdfRenderer OCR (+1 more)

### Community 25 - "WhatsAppChatExportParser.kt"
Cohesion: 0.28
Nodes (5): ImportedNoticeRecord, WhatsAppChatExportParser, Dual WhatsApp Catch-Up Engine, inputstream, pattern

### Community 26 - "PermissionSetupDialog.kt"
Cohesion: 0.22
Nodes (7): border, dialog, dp, lifecycle, lifecycleeventobserver, locallifecycleowner, modifier

### Community 27 - "Type.kt"
Cohesion: 0.22
Nodes (8): font, fontfamily, fontweight, googlefont, r, sp, textstyle, typography

### Community 28 - "DeduplicationEngine"
Cohesion: 0.29
Nodes (5): DeduplicationEngine, java, KidsNotificationListenerService, ByteArray, NotificationListenerService

### Community 30 - "GestureDescription"
Cohesion: 0.36
Nodes (4): GestureResultCallback, GestureResultCallback, GestureDescription, GestureResultCallback

### Community 31 - "dispatchers"
Cohesion: 0.33
Nodes (5): DownloadFolderObserver, Context, dispatchers, environment, withcontext

### Community 32 - "WizardStep"
Cohesion: 0.33
Nodes (6): WizardStep, STEP_0_PERMISSIONS, STEP_1_VAULT, STEP_2_CLASSROOM, STEP_3_PORTALS, STEP_4_WHATSAPP

### Community 33 - "SyncStatus"
Cohesion: 0.40
Nodes (5): SyncStatus, DROPPED, FAILED, PENDING, SYNCED

### Community 35 - "gradlew"
Cohesion: 0.83
Nodes (3): gradlew script, die(), warn()

## Knowledge Gaps
- **34 isolated node(s):** `NoticeFtsEntity`, `CloudHealthReport`, `DeviceInfo`, `PipelineMetrics`, `StepStatus` (+29 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 209 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **19 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `KidsAccessibilityService` connect `KidsAccessibilityService` to `ChildProfile`, `OnboardingWizardScreen`, `KidsAccessibilityService.kt`, `OnboardingWizardScreen.kt`, `ContentCategory`, `FloatingCrawlerOverlay.kt`, `DeduplicationEngine`?**
  _High betweenness centrality (0.168) - this node is a cross-community bridge._
- **Why does `ChildProfile` connect `ChildProfile` to `OnboardingWizardScreen`, `KidsAccessibilityService`, `ChildrenGridDashboard.kt`, `KidsAccessibilityService.kt`?**
  _High betweenness centrality (0.112) - this node is a cross-community bridge._
- **Why does `KidsDatabase` connect `NoticeDao` to `ChildProfile`?**
  _High betweenness centrality (0.082) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `KidsAccessibilityService` (e.g. with `ContentClassifier` and `DeduplicationEngine`) actually correct?**
  _`KidsAccessibilityService` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Are the 6 inferred relationships involving `GoogleDriveClient` (e.g. with `.preWarmOAuthAndFolders()` and `.provisionStep1()`) actually correct?**
  _`GoogleDriveClient` has 6 INFERRED edges - model-reasoned connections that need verification._
- **Are the 4 inferred relationships involving `ChildProfile` (e.g. with `.onCreate()` and `OnboardingWizardScreen()`) actually correct?**
  _`ChildProfile` has 4 INFERRED edges - model-reasoned connections that need verification._
- **What connects `NoticeFtsEntity`, `CloudHealthReport`, `DeviceInfo` to the rest of the system?**
  _34 weakly-connected nodes found - possible documentation gaps or missing edges._