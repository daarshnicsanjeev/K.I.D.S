# Graph Report - K.I.D.S  (2026-09-24)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 721 nodes · 1556 edges · 57 communities (34 shown, 23 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 33 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `d66142e1`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- KidsAccessibilityService
- GoogleDriveClient
- NoticeDao
- MLKitOcrParser.kt
- StreamManifest
- KidsAccessibilityService.kt
- OnboardingWizardScreen.kt
- FloatingCrawlerOverlay
- GestureDescription
- ChildrenGridDashboard.kt
- DriveVaultManager.kt
- FloatingCrawlerOverlay.kt
- KotlinGraphifyEngine
- .log
- MainActivity.kt
- ChildProfile
- ci_watch.py
- DriveSyncWorker.kt
- OnboardingWizardScreen
- Models.kt
- SafVaultManager
- dispatchers
- DriveDeepLogger.kt
- assertthat
- K.I.D.S. Android Collector (PRD)
- KotlinGraphifyEngine.kt
- WhatsAppChatExportParser.kt
- PermissionSetupDialog.kt
- Type.kt
- Entities.kt
- .findPrimaryScrollableNode
- GestureDescription
- PrivacyFilterTest
- DeduplicationEngine
- ContentCategory
- WizardStep
- Intent
- ContentClassifierTest
- PrivacyFilter
- DeduplicationHashTest
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
1. `KidsAccessibilityService` - 78 edges
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

## Communities (57 total, 23 thin omitted)

### Community 0 - "KidsAccessibilityService"
Cohesion: 0.09
Nodes (9): AccessibilityEvent, AccessibilityNodeInfo, NoticeEntity, ExtractedAttachmentDetail, KidsAccessibilityService, UnvisitedCard, FloatingCrawlerOverlay, StreamManifest (+1 more)

### Community 1 - "GoogleDriveClient"
Cohesion: 0.07
Nodes (26): DriveVaultManager, Failure, Context, Result, ProvisionStep1Result, Success, UserConsentRequired, ChannelVaultFolders (+18 more)

### Community 2 - "NoticeDao"
Cohesion: 0.06
Nodes (12): AttachmentDao, ChildProfileDao, AttachmentEntity, NoticeEntity, NoticeDao, KidsDatabase, Context, ChildProfileEntity (+4 more)

### Community 3 - "MLKitOcrParser.kt"
Cohesion: 0.08
Nodes (23): android, MLKitOcrParser, OcrExtractionResult, Bundle, StatusBarNotification, NotificationParser, ParsedNotification, ShareTargetActivity (+15 more)

### Community 4 - "StreamManifest"
Cohesion: 0.08
Nodes (9): StreamItemStatus, ALREADY_SYNCED, COMPLETED, FAILED_SKIPPED, IN_PROGRESS, PENDING, StreamManifest, StreamManifestItem (+1 more)

### Community 5 - "KidsAccessibilityService.kt"
Cohesion: 0.09
Nodes (26): accessibilitymanager, accessibilityserviceinfo, Activity, ContentClassifier, KidsNotificationListenerService, AttachmentEntity, cancel, constraints (+18 more)

### Community 6 - "OnboardingWizardScreen.kt"
Cohesion: 0.09
Nodes (22): accountmanager, activityresultcontracts, androidx, getDefaultSchoolAppList(), Context, launchAccountPicker(), queryInstalledLauncherApps(), arrowback (+14 more)

### Community 8 - "GestureDescription"
Cohesion: 0.14
Nodes (6): GestureResultCallback, GestureResultCallback, GestureResultCallback, GestureResultCallback, GestureDescription, GestureResultCallback

### Community 9 - "ChildrenGridDashboard.kt"
Cohesion: 0.16
Nodes (17): alignment, ProbeItem, DiagnosticFeedScreen(), LogLine, background, circleshape, clickable, clip (+9 more)

### Community 10 - "DriveVaultManager.kt"
Cohesion: 0.15
Nodes (15): CompletableDeferred, concurrentlinkedqueue, coroutinescope, date, filewriter, googleaccountcredential, gsonfactory, locale (+7 more)

### Community 11 - "FloatingCrawlerOverlay.kt"
Cohesion: 0.12
Nodes (15): AccessibilityService, Button, gradientdrawable, gravity, handler, LinearLayout, looper, motionevent (+7 more)

### Community 12 - "KotlinGraphifyEngine"
Cohesion: 0.21
Nodes (7): GraphEdge, GraphNode, KnowledgeGraph, KotlinGraphifyEngine, Attachment, Notice, KnowledgeGraphBuilderTest

### Community 14 - "MainActivity.kt"
Cohesion: 0.12
Nodes (14): AppScreen, DASHBOARD, DIAGNOSTICS, WIZARD, KidsTheme(), childprofile, composable, launch (+6 more)

### Community 15 - "ChildProfile"
Cohesion: 0.18
Nodes (6): ChildProfile, MultiChildRouter, ChildCard(), ChildrenGridDashboard(), StatusBarNotification, MultiChildAttributionTest

### Community 16 - "ci_watch.py"
Cohesion: 0.21
Nodes (14): os, re, diagnose_failure(), get_latest_run(), main(), monitor_workflow(), CI/CD Pipeline Monitor, Release Verifier & Graphify Guardian for K.I.D.S.…, Runs local Graphify AST extraction and community clustering. (+6 more)

### Community 17 - "DriveSyncWorker.kt"
Cohesion: 0.19
Nodes (11): add, DriveSyncWorker, AttachmentEntity, NoticeEntity, buildjsonarray, buildjsonobject, CoroutineWorker, put (+3 more)

### Community 18 - "OnboardingWizardScreen"
Cohesion: 0.37
Nodes (4): Context, PermissionHelper, PermissionSetupDialog(), OnboardingWizardScreen()

### Community 19 - "Models.kt"
Cohesion: 0.15
Nodes (12): ChannelType, FILE_IMPORT, GOOGLE_CLASSROOM, SCHOOL_ERP, WHATSAPP, CloudHealthReport, SyncStatus, DROPPED (+4 more)

### Community 20 - "SafVaultManager"
Cohesion: 0.49
Nodes (5): Context, Result, SafVaultFolders, SafVaultManager, DocumentFile

### Community 21 - "dispatchers"
Cohesion: 0.22
Nodes (8): DownloadFolderObserver, Context, MainActivity, ComponentActivity, dispatchers, environment, KidsDatabase, withcontext

### Community 22 - "DriveDeepLogger.kt"
Cohesion: 0.24
Nodes (6): DeviceInfo, DiagnosticSnapshot, DriveDeepLogger, PipelineMetrics, StepStatus, file

### Community 23 - "assertthat"
Cohesion: 0.42
Nodes (4): assertthat, beforeeach, bytearrayinputstream, test

### Community 24 - "K.I.D.S. Android Collector (PRD)"
Cohesion: 0.22
Nodes (9): AI-Native Storage (JSONL & Markdown), 5-Point Cloud Health Probe, Google Credential Manager API, Memory Boundary Privacy Filter, K.I.D.S. Android Collector (PRD), Restricted Drive Scope (drive.file), Sequential 4-Step Onboarding, Streaming PdfRenderer OCR (+1 more)

### Community 25 - "KotlinGraphifyEngine.kt"
Cohesion: 0.31
Nodes (5): Converters, ChannelConfig, encodetostring, json, typeconverter

### Community 26 - "WhatsAppChatExportParser.kt"
Cohesion: 0.28
Nodes (5): ImportedNoticeRecord, WhatsAppChatExportParser, Dual WhatsApp Catch-Up Engine, inputstream, pattern

### Community 27 - "PermissionSetupDialog.kt"
Cohesion: 0.22
Nodes (7): border, dialog, dp, lifecycle, lifecycleeventobserver, localcontext, locallifecycleowner

### Community 28 - "Type.kt"
Cohesion: 0.22
Nodes (8): font, fontfamily, fontweight, googlefont, r, sp, textstyle, typography

### Community 29 - "Entities.kt"
Cohesion: 0.25
Nodes (7): AttachmentEntity, ChildProfileEntity, NoticeFtsEntity, entity, fts4, index, primarykey

### Community 31 - "GestureDescription"
Cohesion: 0.36
Nodes (4): GestureResultCallback, GestureResultCallback, GestureDescription, GestureResultCallback

### Community 33 - "DeduplicationEngine"
Cohesion: 0.40
Nodes (3): DeduplicationEngine, java, ByteArray

### Community 34 - "ContentCategory"
Cohesion: 0.33
Nodes (6): ContentCategory, ATTENDANCE, CIRCULAR, FEES, HOMEWORK, UNKNOWN

### Community 35 - "WizardStep"
Cohesion: 0.33
Nodes (6): WizardStep, STEP_0_PERMISSIONS, STEP_1_VAULT, STEP_2_CLASSROOM, STEP_3_PORTALS, STEP_4_WHATSAPP

### Community 36 - "Intent"
Cohesion: 0.53
Nodes (4): BootReceiver, Context, BroadcastReceiver, Intent

### Community 41 - "gradlew"
Cohesion: 0.83
Nodes (3): gradlew script, die(), warn()

## Knowledge Gaps
- **34 isolated node(s):** `CloudHealthReport`, `DeviceInfo`, `PipelineMetrics`, `StepStatus`, `NoticeFtsEntity` (+29 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 209 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **23 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `KidsAccessibilityService` connect `KidsAccessibilityService` to `DeduplicationEngine`, `GoogleDriveClient`, `KidsAccessibilityService.kt`, `OnboardingWizardScreen.kt`, `FloatingCrawlerOverlay.kt`, `ChildProfile`?**
  _High betweenness centrality (0.173) - this node is a cross-community bridge._
- **Why does `ChildProfile` connect `ChildProfile` to `KidsAccessibilityService`, `KidsAccessibilityService.kt`, `ChildrenGridDashboard.kt`, `KotlinGraphifyEngine`, `OnboardingWizardScreen`, `Models.kt`, `assertthat`, `KotlinGraphifyEngine.kt`?**
  _High betweenness centrality (0.110) - this node is a cross-community bridge._
- **Why does `KidsDatabase` connect `NoticeDao` to `KidsAccessibilityService`?**
  _High betweenness centrality (0.082) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `KidsAccessibilityService` (e.g. with `ContentClassifier` and `DeduplicationEngine`) actually correct?**
  _`KidsAccessibilityService` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Are the 6 inferred relationships involving `GoogleDriveClient` (e.g. with `.preWarmOAuthAndFolders()` and `.provisionStep1()`) actually correct?**
  _`GoogleDriveClient` has 6 INFERRED edges - model-reasoned connections that need verification._
- **Are the 4 inferred relationships involving `ChildProfile` (e.g. with `.onCreate()` and `OnboardingWizardScreen()`) actually correct?**
  _`ChildProfile` has 4 INFERRED edges - model-reasoned connections that need verification._
- **What connects `CloudHealthReport`, `DeviceInfo`, `PipelineMetrics` to the rest of the system?**
  _34 weakly-connected nodes found - possible documentation gaps or missing edges._