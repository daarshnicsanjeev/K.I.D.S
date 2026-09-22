# Graph Report - K.I.D.S  (2026-09-22)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 651 nodes · 1350 edges · 50 communities (25 shown, 25 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 31 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `05c0c911`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- KidsAccessibilityService.kt
- KidsAccessibilityService
- NoticeDao
- ChildProfile
- OnboardingWizardScreen
- MLKitOcrParser.kt
- GoogleDriveClient
- DriveDeepLogger.kt
- FloatingCrawlerOverlay
- K.I.D.S. Android Collector (PRD)
- .log
- ChildrenGridDashboard.kt
- StreamManifest
- FloatingCrawlerOverlay.kt
- GestureDescription
- OnboardingWizardScreen.kt
- ci_watch.py
- NotificationParserTest.kt
- DriveVaultManagerTest.kt
- PermissionHelper.kt
- MainActivity.kt
- PermissionSetupDialog.kt
- MultiChildRouter
- Type.kt
- .findPrimaryScrollableNode
- PrivacyFilterTest
- .onNotificationPosted
- WizardStep
- ContentClassifierTest
- GestureResultCallback
- DeduplicationHashTest
- gradlew
- KidsApplication.kt
- AccessibilityNodeInfo
- java
- Bundle
- Context
- Result
- ChildVaultFolders
- FloatingCrawlerOverlay
- GestureDescription
- provisionstep1result
- role
- statusbarnotification
- streamitemstatus
- StreamManifest
- streammanifestitem

## God Nodes (most connected - your core abstractions)
1. `KidsAccessibilityService` - 59 edges
2. `FloatingCrawlerOverlay` - 39 edges
3. `GoogleDriveClient` - 23 edges
4. `ChildProfile` - 21 edges
5. `OnboardingWizardScreen()` - 19 edges
6. `CrawlerTraceLogger` - 16 edges
7. `NoticeDao` - 16 edges
8. `StreamManifest` - 15 edges
9. `AttachmentDao` - 14 edges
10. `ContentCategory` - 13 edges

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

## Communities (50 total, 25 thin omitted)

### Community 0 - "KidsAccessibilityService.kt"
Cohesion: 0.06
Nodes (52): accessibilitymanager, accessibilityserviceinfo, add, DownloadFolderObserver, ContentClassifier, DeduplicationEngine, java, MainActivity (+44 more)

### Community 1 - "KidsAccessibilityService"
Cohesion: 0.11
Nodes (6): AccessibilityEvent, NoticeEntity, ExtractedAttachmentDetail, KidsAccessibilityService, AccessibilityNodeInfo, UnvisitedCard

### Community 2 - "NoticeDao"
Cohesion: 0.06
Nodes (12): AttachmentDao, ChildProfileDao, NoticeDao, KidsDatabase, Context, AttachmentEntity, ChildProfileEntity, database (+4 more)

### Community 3 - "ChildProfile"
Cohesion: 0.07
Nodes (32): GraphEdge, GraphNode, KnowledgeGraph, KotlinGraphifyEngine, Attachment, ChannelType, FILE_IMPORT, GOOGLE_CLASSROOM (+24 more)

### Community 4 - "OnboardingWizardScreen"
Cohesion: 0.14
Nodes (14): DriveVaultManager, Failure, Context, Result, ProvisionStep1Result, Success, UserConsentRequired, ChildVaultFolders (+6 more)

### Community 5 - "MLKitOcrParser.kt"
Cohesion: 0.11
Nodes (19): Activity, Context, Result, SafVaultFolders, SafVaultManager, MLKitOcrParser, OcrExtractionResult, ShareTargetActivity (+11 more)

### Community 6 - "GoogleDriveClient"
Cohesion: 0.09
Nodes (13): ChannelVaultFolders, DriveQuotaInfo, GoogleDriveClient, async, bytearraycontent, bytearrayoutputstream, concurrenthashmap, Drive (+5 more)

### Community 7 - "DriveDeepLogger.kt"
Cohesion: 0.10
Nodes (17): AttachmentEntity, ChildProfileEntity, NoticeFtsEntity, Converters, ChannelConfig, DeviceInfo, DiagnosticSnapshot, DriveDeepLogger (+9 more)

### Community 9 - "K.I.D.S. Android Collector (PRD)"
Cohesion: 0.10
Nodes (15): AI-Native Storage (JSONL & Markdown), ImportedNoticeRecord, WhatsAppChatExportParser, WhatsAppChatExportParserTest, Dual WhatsApp Catch-Up Engine, 5-Point Cloud Health Probe, Google Credential Manager API, inputstream (+7 more)

### Community 10 - ".log"
Cohesion: 0.18
Nodes (4): Context, CrawlerTraceLogger, Context, Result

### Community 11 - "ChildrenGridDashboard.kt"
Cohesion: 0.16
Nodes (17): alignment, ProbeItem, DiagnosticFeedScreen(), LogLine, background, circleshape, clickable, clip (+9 more)

### Community 12 - "StreamManifest"
Cohesion: 0.16
Nodes (8): StreamItemStatus, ALREADY_SYNCED, COMPLETED, FAILED_SKIPPED, IN_PROGRESS, PENDING, StreamManifest, StreamManifestItem

### Community 13 - "FloatingCrawlerOverlay.kt"
Cohesion: 0.12
Nodes (15): AccessibilityService, Button, gradientdrawable, gravity, handler, LinearLayout, looper, motionevent (+7 more)

### Community 14 - "GestureDescription"
Cohesion: 0.19
Nodes (5): GestureResultCallback, GestureResultCallback, GestureResultCallback, GestureDescription, GestureResultCallback

### Community 15 - "OnboardingWizardScreen.kt"
Cohesion: 0.15
Nodes (14): accountmanager, activityresultcontracts, getDefaultSchoolAppList(), Context, queryInstalledLauncherApps(), arrowback, backhandler, channelconfig (+6 more)

### Community 16 - "ci_watch.py"
Cohesion: 0.21
Nodes (14): os, re, diagnose_failure(), get_latest_run(), main(), monitor_workflow(), CI/CD Pipeline Monitor, Release Verifier & Graphify Guardian for K.I.D.S.…, Runs local Graphify AST extraction and community clustering. (+6 more)

### Community 17 - "NotificationParserTest.kt"
Cohesion: 0.20
Nodes (9): Bundle, StatusBarNotification, NotificationParser, ParsedNotification, NotificationParserTest, build, Bundle, every (+1 more)

### Community 18 - "DriveVaultManagerTest.kt"
Cohesion: 0.30
Nodes (6): assertthat, beforeeach, bytearrayinputstream, mockk, runblocking, test

### Community 19 - "PermissionHelper.kt"
Cohesion: 0.24
Nodes (8): androidx, launchAccountPicker(), BootReceiver, Context, BroadcastReceiver, Intent, notificationmanagercompat, settings

### Community 20 - "MainActivity.kt"
Cohesion: 0.18
Nodes (10): AppScreen, DASHBOARD, DIAGNOSTICS, WIZARD, childprofile, launch, lifecyclescope, remembersaveable (+2 more)

### Community 21 - "PermissionSetupDialog.kt"
Cohesion: 0.20
Nodes (8): border, dialog, fontweight, lifecycle, lifecycleeventobserver, localcontext, locallifecycleowner, modifier

### Community 23 - "Type.kt"
Cohesion: 0.25
Nodes (7): font, fontfamily, googlefont, r, sp, textstyle, typography

### Community 27 - "WizardStep"
Cohesion: 0.33
Nodes (6): WizardStep, STEP_0_PERMISSIONS, STEP_1_VAULT, STEP_2_CLASSROOM, STEP_3_PORTALS, STEP_4_WHATSAPP

### Community 29 - "GestureResultCallback"
Cohesion: 0.50
Nodes (3): GestureResultCallback, GestureDescription, GestureResultCallback

### Community 31 - "gradlew"
Cohesion: 0.83
Nodes (3): gradlew script, die(), warn()

## Knowledge Gaps
- **34 isolated node(s):** `CloudHealthReport`, `NoticeFtsEntity`, `DeviceInfo`, `PipelineMetrics`, `StepStatus` (+29 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 193 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **25 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `KidsAccessibilityService` connect `KidsAccessibilityService` to `KidsAccessibilityService.kt`, `FloatingCrawlerOverlay`, `OnboardingWizardScreen`, `FloatingCrawlerOverlay.kt`?**
  _High betweenness centrality (0.173) - this node is a cross-community bridge._
- **Why does `ChildProfile` connect `ChildProfile` to `KidsAccessibilityService.kt`, `KidsAccessibilityService`, `OnboardingWizardScreen`, `ChildrenGridDashboard.kt`, `DriveVaultManagerTest.kt`, `MultiChildRouter`, `.onNotificationPosted`?**
  _High betweenness centrality (0.116) - this node is a cross-community bridge._
- **Why does `FloatingCrawlerOverlay` connect `FloatingCrawlerOverlay` to `.findPrimaryScrollableNode`, `KidsAccessibilityService`, `FloatingCrawlerOverlay.kt`, `GestureDescription`?**
  _High betweenness centrality (0.089) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `KidsAccessibilityService` (e.g. with `ContentClassifier` and `DeduplicationEngine`) actually correct?**
  _`KidsAccessibilityService` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Are the 4 inferred relationships involving `GoogleDriveClient` (e.g. with `.provisionStep1()` and `.provisionStep2Classroom()`) actually correct?**
  _`GoogleDriveClient` has 4 INFERRED edges - model-reasoned connections that need verification._
- **Are the 4 inferred relationships involving `ChildProfile` (e.g. with `.onCreate()` and `OnboardingWizardScreen()`) actually correct?**
  _`ChildProfile` has 4 INFERRED edges - model-reasoned connections that need verification._
- **What connects `CloudHealthReport`, `NoticeFtsEntity`, `DeviceInfo` to the rest of the system?**
  _34 weakly-connected nodes found - possible documentation gaps or missing edges._