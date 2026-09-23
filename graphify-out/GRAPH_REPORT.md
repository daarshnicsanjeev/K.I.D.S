# Graph Report - K.I.D.S  (2026-09-23)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 716 nodes · 1534 edges · 55 communities (35 shown, 20 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 30 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `c1daac5a`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- KidsAccessibilityService
- GoogleDriveClient
- NoticeDao
- assertthat
- StreamManifest
- MLKitOcrParser.kt
- FloatingCrawlerOverlay
- KidsAccessibilityService.kt
- K.I.D.S. Android Collector (PRD)
- OnboardingWizardScreen.kt
- SafVaultManager.kt
- GestureDescription
- ChildrenGridDashboard.kt
- OnboardingWizardScreen
- KotlinGraphifyEngine.kt
- FloatingCrawlerOverlay.kt
- .log
- ci_watch.py
- DriveSyncWorker.kt
- Models.kt
- MainActivity.kt
- DriveVaultManager.kt
- ChildProfile
- Entities.kt
- DeduplicationEngine
- PermissionSetupDialog.kt
- Type.kt
- DriveDeepLogger.kt
- TypeConverters.kt
- GestureDescription
- log
- CrawlerTraceLogger.kt
- dispatchers
- ContentCategory
- WizardStep
- .findPrimaryScrollableNode
- ContentClassifier
- gradlew
- KidsApplication.kt
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
- StreamManifestItem

## God Nodes (most connected - your core abstractions)
1. `KidsAccessibilityService` - 75 edges
2. `FloatingCrawlerOverlay` - 42 edges
3. `GoogleDriveClient` - 26 edges
4. `ChildProfile` - 21 edges
5. `OnboardingWizardScreen()` - 21 edges
6. `DriveVaultManager` - 19 edges
7. `StreamManifest` - 19 edges
8. `CrawlerTraceLogger` - 18 edges
9. `NoticeDao` - 16 edges
10. `StreamManifestAndCardTest` - 16 edges

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

## Communities (55 total, 20 thin omitted)

### Community 0 - "KidsAccessibilityService"
Cohesion: 0.09
Nodes (5): MultiChildRouter, ExtractedAttachmentDetail, KidsAccessibilityService, AccessibilityNodeInfo, UnvisitedCard

### Community 1 - "GoogleDriveClient"
Cohesion: 0.07
Nodes (26): DriveVaultManager, Failure, Context, Result, ProvisionStep1Result, Success, UserConsentRequired, ChannelVaultFolders (+18 more)

### Community 2 - "NoticeDao"
Cohesion: 0.06
Nodes (12): AttachmentDao, ChildProfileDao, AttachmentEntity, NoticeEntity, NoticeDao, KidsDatabase, Context, ChildProfileEntity (+4 more)

### Community 3 - "assertthat"
Cohesion: 0.07
Nodes (9): PrivacyFilter, ContentClassifierTest, DeduplicationHashTest, MultiChildAttributionTest, PrivacyFilterTest, assertthat, beforeeach, bytearrayinputstream (+1 more)

### Community 4 - "StreamManifest"
Cohesion: 0.08
Nodes (9): StreamItemStatus, ALREADY_SYNCED, COMPLETED, FAILED_SKIPPED, IN_PROGRESS, PENDING, StreamManifest, StreamManifestItem (+1 more)

### Community 5 - "MLKitOcrParser.kt"
Cohesion: 0.09
Nodes (20): MLKitOcrParser, OcrExtractionResult, Bundle, StatusBarNotification, NotificationParser, ParsedNotification, NotificationParserTest, Bitmap (+12 more)

### Community 7 - "KidsAccessibilityService.kt"
Cohesion: 0.12
Nodes (21): AccessibilityEvent, accessibilitymanager, accessibilityserviceinfo, StatusBarNotification, AttachmentEntity, cancel, constraints, delay (+13 more)

### Community 8 - "K.I.D.S. Android Collector (PRD)"
Cohesion: 0.09
Nodes (16): AI-Native Storage (JSONL & Markdown), ImportedNoticeRecord, WhatsAppChatExportParser, WhatsAppChatExportParserTest, Dual WhatsApp Catch-Up Engine, 5-Point Cloud Health Probe, Google Credential Manager API, inputstream (+8 more)

### Community 9 - "OnboardingWizardScreen.kt"
Cohesion: 0.10
Nodes (20): accountmanager, activityresultcontracts, getDefaultSchoolAppList(), Context, queryInstalledLauncherApps(), arrowback, backhandler, channelconfig (+12 more)

### Community 10 - "SafVaultManager.kt"
Cohesion: 0.21
Nodes (9): Activity, android, Context, Result, SafVaultFolders, SafVaultManager, ShareTargetActivity, DocumentFile (+1 more)

### Community 11 - "GestureDescription"
Cohesion: 0.15
Nodes (7): GestureResultCallback, GestureResultCallback, GestureResultCallback, GestureResultCallback, GestureResultCallback, GestureDescription, GestureResultCallback

### Community 12 - "ChildrenGridDashboard.kt"
Cohesion: 0.16
Nodes (17): alignment, ProbeItem, DiagnosticFeedScreen(), LogLine, circleshape, clickable, clip, contentdescription (+9 more)

### Community 13 - "OnboardingWizardScreen"
Cohesion: 0.25
Nodes (7): androidx, Context, PermissionHelper, PermissionSetupDialog(), launchAccountPicker(), OnboardingWizardScreen(), Context

### Community 14 - "KotlinGraphifyEngine.kt"
Cohesion: 0.22
Nodes (7): GraphEdge, GraphNode, KnowledgeGraph, KotlinGraphifyEngine, Attachment, Notice, KnowledgeGraphBuilderTest

### Community 15 - "FloatingCrawlerOverlay.kt"
Cohesion: 0.12
Nodes (15): AccessibilityService, Button, gradientdrawable, gravity, handler, LinearLayout, looper, motionevent (+7 more)

### Community 17 - "ci_watch.py"
Cohesion: 0.21
Nodes (14): os, re, diagnose_failure(), get_latest_run(), main(), monitor_workflow(), CI/CD Pipeline Monitor, Release Verifier & Graphify Guardian for K.I.D.S.…, Runs local Graphify AST extraction and community clustering. (+6 more)

### Community 18 - "DriveSyncWorker.kt"
Cohesion: 0.19
Nodes (11): add, DriveSyncWorker, AttachmentEntity, NoticeEntity, buildjsonarray, buildjsonobject, CoroutineWorker, put (+3 more)

### Community 19 - "Models.kt"
Cohesion: 0.15
Nodes (12): ChannelType, FILE_IMPORT, GOOGLE_CLASSROOM, SCHOOL_ERP, WHATSAPP, CloudHealthReport, SyncStatus, DROPPED (+4 more)

### Community 20 - "MainActivity.kt"
Cohesion: 0.18
Nodes (11): AppScreen, DASHBOARD, DIAGNOSTICS, WIZARD, MainActivity, childprofile, ComponentActivity, lifecyclescope (+3 more)

### Community 21 - "DriveVaultManager.kt"
Cohesion: 0.20
Nodes (9): CompletableDeferred, coroutinescope, googleaccountcredential, gsonfactory, launch, nethttptransport, userrecoverableauthexception, userrecoverableauthioexception (+1 more)

### Community 22 - "ChildProfile"
Cohesion: 0.24
Nodes (7): ChildProfile, ChildCard(), ChildrenGridDashboard(), KidsTheme(), composable, lightcolorscheme, materialtheme

### Community 23 - "Entities.kt"
Cohesion: 0.22
Nodes (8): AttachmentEntity, ChildProfileEntity, NoticeEntity, NoticeFtsEntity, entity, fts4, index, primarykey

### Community 24 - "DeduplicationEngine"
Cohesion: 0.25
Nodes (5): DownloadFolderObserver, DeduplicationEngine, java, ByteArray, messagedigest

### Community 25 - "PermissionSetupDialog.kt"
Cohesion: 0.22
Nodes (7): background, border, dialog, lifecycle, lifecycleeventobserver, locallifecycleowner, roundedcornershape

### Community 26 - "Type.kt"
Cohesion: 0.22
Nodes (8): font, fontfamily, fontweight, googlefont, r, sp, textstyle, typography

### Community 27 - "DriveDeepLogger.kt"
Cohesion: 0.28
Nodes (5): DeviceInfo, DiagnosticSnapshot, DriveDeepLogger, PipelineMetrics, StepStatus

### Community 28 - "TypeConverters.kt"
Cohesion: 0.32
Nodes (5): Converters, ChannelConfig, encodetostring, json, typeconverter

### Community 29 - "GestureDescription"
Cohesion: 0.36
Nodes (4): GestureResultCallback, GestureResultCallback, GestureDescription, GestureResultCallback

### Community 30 - "log"
Cohesion: 0.43
Nodes (5): BootReceiver, Context, BroadcastReceiver, Intent, log

### Community 31 - "CrawlerTraceLogger.kt"
Cohesion: 0.29
Nodes (6): concurrentlinkedqueue, date, file, filewriter, locale, printwriter

### Community 32 - "dispatchers"
Cohesion: 0.33
Nodes (5): Context, dispatchers, environment, KidsDatabase, withcontext

### Community 33 - "ContentCategory"
Cohesion: 0.33
Nodes (6): ContentCategory, ATTENDANCE, CIRCULAR, FEES, HOMEWORK, UNKNOWN

### Community 34 - "WizardStep"
Cohesion: 0.33
Nodes (6): WizardStep, STEP_0_PERMISSIONS, STEP_1_VAULT, STEP_2_CLASSROOM, STEP_3_PORTALS, STEP_4_WHATSAPP

### Community 36 - "ContentClassifier"
Cohesion: 0.40
Nodes (3): ContentClassifier, KidsNotificationListenerService, NotificationListenerService

### Community 37 - "gradlew"
Cohesion: 0.83
Nodes (3): gradlew script, die(), warn()

## Knowledge Gaps
- **36 isolated node(s):** `CloudHealthReport`, `AttachmentEntity`, `NoticeFtsEntity`, `NoticeEntity`, `DeviceInfo` (+31 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 212 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **20 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `KidsAccessibilityService` connect `KidsAccessibilityService` to `ContentClassifier`, `FloatingCrawlerOverlay`, `KidsAccessibilityService.kt`, `OnboardingWizardScreen.kt`, `OnboardingWizardScreen`, `FloatingCrawlerOverlay.kt`, `DeduplicationEngine`?**
  _High betweenness centrality (0.214) - this node is a cross-community bridge._
- **Why does `ChildProfile` connect `ChildProfile` to `KidsAccessibilityService`, `assertthat`, `KidsAccessibilityService.kt`, `ChildrenGridDashboard.kt`, `OnboardingWizardScreen`, `KotlinGraphifyEngine.kt`, `Models.kt`?**
  _High betweenness centrality (0.099) - this node is a cross-community bridge._
- **Why does `KidsDatabase` connect `NoticeDao` to `KidsAccessibilityService`?**
  _High betweenness centrality (0.082) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `KidsAccessibilityService` (e.g. with `ContentClassifier` and `DeduplicationEngine`) actually correct?**
  _`KidsAccessibilityService` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Are the 6 inferred relationships involving `GoogleDriveClient` (e.g. with `.preWarmOAuthAndFolders()` and `.provisionStep1()`) actually correct?**
  _`GoogleDriveClient` has 6 INFERRED edges - model-reasoned connections that need verification._
- **Are the 4 inferred relationships involving `ChildProfile` (e.g. with `.onCreate()` and `OnboardingWizardScreen()`) actually correct?**
  _`ChildProfile` has 4 INFERRED edges - model-reasoned connections that need verification._
- **What connects `CloudHealthReport`, `AttachmentEntity`, `NoticeFtsEntity` to the rest of the system?**
  _36 weakly-connected nodes found - possible documentation gaps or missing edges._