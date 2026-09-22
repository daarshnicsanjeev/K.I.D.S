# Graph Report - K.I.D.S  (2026-09-22)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 681 nodes · 1423 edges · 54 communities (34 shown, 20 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 30 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `2619593c`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- KidsAccessibilityService
- FloatingCrawlerOverlay
- GoogleDriveClient
- NoticeDao
- MLKitOcrParser.kt
- ChildrenGridDashboard.kt
- KidsAccessibilityService.kt
- K.I.D.S. Android Collector (PRD)
- OnboardingWizardScreen.kt
- SafVaultManager.kt
- ChildProfile
- ContentCategory
- ci_watch.py
- DriveSyncWorker.kt
- OnboardingWizardScreen
- Models.kt
- StreamManifest
- Entities.kt
- KotlinGraphifyEngine.kt
- MainActivity.kt
- PrivacyFilterTest
- dispatchers
- DriveVaultManager.kt
- KnowledgeGraphBuilderTest.kt
- DriveDeepLogger.kt
- StreamManifestAndCardTest
- Type.kt
- Intent
- DeduplicationEngine
- assertthat
- .onCreate
- ShareTargetActivity
- StreamItemStatus
- WizardStep
- GestureResultCallback
- log
- DeduplicationHashTest
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
1. `KidsAccessibilityService` - 61 edges
2. `FloatingCrawlerOverlay` - 39 edges
3. `GoogleDriveClient` - 26 edges
4. `ChildProfile` - 21 edges
5. `OnboardingWizardScreen()` - 21 edges
6. `DriveVaultManager` - 19 edges
7. `CrawlerTraceLogger` - 18 edges
8. `StreamManifest` - 17 edges
9. `NoticeDao` - 16 edges
10. `AttachmentDao` - 14 edges

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

## Communities (54 total, 20 thin omitted)

### Community 0 - "KidsAccessibilityService"
Cohesion: 0.08
Nodes (8): AccessibilityEvent, CrawlerTraceLogger, Context, ExtractedAttachmentDetail, KidsAccessibilityService, AccessibilityNodeInfo, Context, UnvisitedCard

### Community 1 - "FloatingCrawlerOverlay"
Cohesion: 0.06
Nodes (23): AccessibilityService, FloatingCrawlerOverlay, GestureResultCallback, GestureResultCallback, GestureResultCallback, GestureResultCallback, AccessibilityNodeInfo, GestureDescription (+15 more)

### Community 2 - "GoogleDriveClient"
Cohesion: 0.07
Nodes (26): DriveVaultManager, Failure, Context, Result, ProvisionStep1Result, Success, UserConsentRequired, ChannelVaultFolders (+18 more)

### Community 3 - "NoticeDao"
Cohesion: 0.06
Nodes (12): AttachmentDao, ChildProfileDao, AttachmentEntity, NoticeEntity, NoticeDao, KidsDatabase, Context, ChildProfileEntity (+4 more)

### Community 4 - "MLKitOcrParser.kt"
Cohesion: 0.10
Nodes (19): MLKitOcrParser, OcrExtractionResult, Bundle, StatusBarNotification, NotificationParser, ParsedNotification, NotificationParserTest, Bitmap (+11 more)

### Community 5 - "ChildrenGridDashboard.kt"
Cohesion: 0.12
Nodes (24): alignment, ProbeItem, DiagnosticFeedScreen(), LogLine, background, border, circleshape, clickable (+16 more)

### Community 6 - "KidsAccessibilityService.kt"
Cohesion: 0.12
Nodes (21): accessibilitymanager, accessibilityserviceinfo, StatusBarNotification, AttachmentEntity, childprofile, constraints, delay, existingworkpolicy (+13 more)

### Community 7 - "K.I.D.S. Android Collector (PRD)"
Cohesion: 0.09
Nodes (16): AI-Native Storage (JSONL & Markdown), ImportedNoticeRecord, WhatsAppChatExportParser, WhatsAppChatExportParserTest, Dual WhatsApp Catch-Up Engine, 5-Point Cloud Health Probe, Google Credential Manager API, inputstream (+8 more)

### Community 8 - "OnboardingWizardScreen.kt"
Cohesion: 0.12
Nodes (18): accountmanager, activityresultcontracts, getDefaultSchoolAppList(), Context, queryInstalledLauncherApps(), arrowback, backhandler, channelconfig (+10 more)

### Community 9 - "SafVaultManager.kt"
Cohesion: 0.24
Nodes (11): Context, Result, SafVaultFolders, SafVaultManager, concurrentlinkedqueue, date, DocumentFile, filewriter (+3 more)

### Community 10 - "ChildProfile"
Cohesion: 0.19
Nodes (5): ChildProfile, MultiChildRouter, ChildCard(), ChildrenGridDashboard(), MultiChildAttributionTest

### Community 11 - "ContentCategory"
Cohesion: 0.15
Nodes (8): ContentClassifier, ContentCategory, ATTENDANCE, CIRCULAR, FEES, HOMEWORK, UNKNOWN, ContentClassifierTest

### Community 12 - "ci_watch.py"
Cohesion: 0.21
Nodes (14): os, re, diagnose_failure(), get_latest_run(), main(), monitor_workflow(), CI/CD Pipeline Monitor, Release Verifier & Graphify Guardian for K.I.D.S.…, Runs local Graphify AST extraction and community clustering. (+6 more)

### Community 13 - "DriveSyncWorker.kt"
Cohesion: 0.19
Nodes (11): add, DriveSyncWorker, AttachmentEntity, NoticeEntity, buildjsonarray, buildjsonobject, CoroutineWorker, put (+3 more)

### Community 14 - "OnboardingWizardScreen"
Cohesion: 0.37
Nodes (4): Context, PermissionHelper, PermissionSetupDialog(), OnboardingWizardScreen()

### Community 15 - "Models.kt"
Cohesion: 0.15
Nodes (12): ChannelType, FILE_IMPORT, GOOGLE_CLASSROOM, SCHOOL_ERP, WHATSAPP, CloudHealthReport, SyncStatus, DROPPED (+4 more)

### Community 17 - "Entities.kt"
Cohesion: 0.18
Nodes (9): AttachmentEntity, NoticeEntity, NoticeFtsEntity, Converters, ChannelConfig, entity, fts4, index (+1 more)

### Community 18 - "KotlinGraphifyEngine.kt"
Cohesion: 0.27
Nodes (7): GraphEdge, GraphNode, KnowledgeGraph, KotlinGraphifyEngine, encodetostring, json, typeconverter

### Community 19 - "MainActivity.kt"
Cohesion: 0.17
Nodes (10): AppScreen, DASHBOARD, DIAGNOSTICS, WIZARD, lifecyclescope, notificationmanagercompat, remembersaveable, setcontent (+2 more)

### Community 21 - "dispatchers"
Cohesion: 0.22
Nodes (8): DownloadFolderObserver, Context, MainActivity, ComponentActivity, dispatchers, environment, KidsDatabase, withcontext

### Community 22 - "DriveVaultManager.kt"
Cohesion: 0.20
Nodes (9): CompletableDeferred, coroutinescope, googleaccountcredential, gsonfactory, launch, nethttptransport, userrecoverableauthexception, userrecoverableauthioexception (+1 more)

### Community 23 - "KnowledgeGraphBuilderTest.kt"
Cohesion: 0.29
Nodes (3): Attachment, Notice, KnowledgeGraphBuilderTest

### Community 24 - "DriveDeepLogger.kt"
Cohesion: 0.24
Nodes (6): DeviceInfo, DiagnosticSnapshot, DriveDeepLogger, PipelineMetrics, StepStatus, file

### Community 26 - "Type.kt"
Cohesion: 0.22
Nodes (8): font, fontfamily, fontweight, googlefont, r, sp, textstyle, typography

### Community 27 - "Intent"
Cohesion: 0.36
Nodes (6): androidx, launchAccountPicker(), BootReceiver, Context, BroadcastReceiver, Intent

### Community 28 - "DeduplicationEngine"
Cohesion: 0.29
Nodes (5): DeduplicationEngine, java, KidsNotificationListenerService, ByteArray, NotificationListenerService

### Community 29 - "assertthat"
Cohesion: 0.46
Nodes (4): assertthat, beforeeach, bytearrayinputstream, test

### Community 30 - ".onCreate"
Cohesion: 0.29
Nodes (5): ChildProfileEntity, KidsTheme(), composable, lightcolorscheme, materialtheme

### Community 31 - "ShareTargetActivity"
Cohesion: 0.47
Nodes (3): Activity, ShareTargetActivity, Bundle

### Community 32 - "StreamItemStatus"
Cohesion: 0.33
Nodes (6): StreamItemStatus, ALREADY_SYNCED, COMPLETED, FAILED_SKIPPED, IN_PROGRESS, PENDING

### Community 33 - "WizardStep"
Cohesion: 0.33
Nodes (6): WizardStep, STEP_0_PERMISSIONS, STEP_1_VAULT, STEP_2_CLASSROOM, STEP_3_PORTALS, STEP_4_WHATSAPP

### Community 34 - "GestureResultCallback"
Cohesion: 0.50
Nodes (3): GestureResultCallback, GestureDescription, GestureResultCallback

### Community 35 - "log"
Cohesion: 0.67
Nodes (3): KidsApplication, Application, log

### Community 37 - "gradlew"
Cohesion: 0.83
Nodes (3): gradlew script, die(), warn()

## Knowledge Gaps
- **36 isolated node(s):** `CloudHealthReport`, `AttachmentEntity`, `NoticeEntity`, `NoticeFtsEntity`, `DeviceInfo` (+31 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 205 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **20 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `KidsAccessibilityService` connect `KidsAccessibilityService` to `FloatingCrawlerOverlay`, `KidsAccessibilityService.kt`, `OnboardingWizardScreen.kt`, `ChildProfile`, `ContentCategory`, `DeduplicationEngine`?**
  _High betweenness centrality (0.200) - this node is a cross-community bridge._
- **Why does `ChildProfile` connect `ChildProfile` to `KidsAccessibilityService`, `ChildrenGridDashboard.kt`, `KidsAccessibilityService.kt`, `OnboardingWizardScreen`, `Models.kt`, `KotlinGraphifyEngine.kt`, `KnowledgeGraphBuilderTest.kt`, `.onCreate`?**
  _High betweenness centrality (0.102) - this node is a cross-community bridge._
- **Why does `KidsDatabase` connect `NoticeDao` to `ChildProfile`?**
  _High betweenness centrality (0.085) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `KidsAccessibilityService` (e.g. with `ContentClassifier` and `DeduplicationEngine`) actually correct?**
  _`KidsAccessibilityService` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Are the 6 inferred relationships involving `GoogleDriveClient` (e.g. with `.preWarmOAuthAndFolders()` and `.provisionStep1()`) actually correct?**
  _`GoogleDriveClient` has 6 INFERRED edges - model-reasoned connections that need verification._
- **Are the 4 inferred relationships involving `ChildProfile` (e.g. with `.onCreate()` and `OnboardingWizardScreen()`) actually correct?**
  _`ChildProfile` has 4 INFERRED edges - model-reasoned connections that need verification._
- **What connects `CloudHealthReport`, `AttachmentEntity`, `NoticeEntity` to the rest of the system?**
  _36 weakly-connected nodes found - possible documentation gaps or missing edges._