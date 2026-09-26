# Graph Report - K.I.D.S  (2026-09-26)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 753 nodes · 1650 edges · 58 communities (37 shown, 21 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 33 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `da4f7c6d`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- KidsAccessibilityService
- GoogleDriveClient
- NoticeDao
- MLKitOcrParser.kt
- StreamManifest
- ChildrenGridDashboard.kt
- FloatingCrawlerOverlay
- K.I.D.S. Android Collector (PRD)
- OnboardingWizardScreen.kt
- GestureDescription
- KidsAccessibilityService.kt
- KotlinGraphifyEngine.kt
- FloatingCrawlerOverlay.kt
- .log
- .matchesAttachmentChipText
- NotificationParserTest.kt
- MainActivity.kt
- ci_watch.py
- DriveSyncWorker.kt
- OnboardingWizardScreen
- assertthat
- ChildProfile
- .onNotificationPosted
- Models.kt
- DriveVaultManager.kt
- DeduplicationEngine
- .fallbackNativeScroll
- ContentCategory
- Type.kt
- DriveDeepLogger.kt
- Entities.kt
- TypeConverters.kt
- dispatchers
- GestureDescription
- ShareTargetActivity.kt
- CrawlerTraceLogger.kt
- WizardStep
- Intent
- ContentClassifierTest
- KidsTheme.kt
- log
- gradlew
- java
- Bundle
- AttachmentEntity
- NoticeEntity
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
1. `KidsAccessibilityService` - 89 edges
2. `FloatingCrawlerOverlay` - 42 edges
3. `GoogleDriveClient` - 26 edges
4. `ChildProfile` - 21 edges
5. `OnboardingWizardScreen()` - 21 edges
6. `DriveVaultManager` - 19 edges
7. `CrawlerTraceLogger` - 17 edges
8. `AttachmentChipMatcherTest` - 16 edges
9. `NoticeDao` - 16 edges
10. `StreamManifest` - 16 edges

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

## Communities (58 total, 21 thin omitted)

### Community 0 - "KidsAccessibilityService"
Cohesion: 0.09
Nodes (8): AccessibilityNodeInfo, ExtractedAttachmentDetail, KidsAccessibilityService, UnvisitedCard, VisiblePendingCard, FloatingCrawlerOverlay, StreamManifest, StreamManifestItem

### Community 1 - "GoogleDriveClient"
Cohesion: 0.08
Nodes (23): DriveVaultManager, Failure, Context, Result, ProvisionStep1Result, Success, UserConsentRequired, ChannelVaultFolders (+15 more)

### Community 2 - "NoticeDao"
Cohesion: 0.06
Nodes (12): AttachmentDao, ChildProfileDao, AttachmentEntity, NoticeEntity, NoticeDao, KidsDatabase, Context, ChildProfileEntity (+4 more)

### Community 3 - "MLKitOcrParser.kt"
Cohesion: 0.10
Nodes (21): Activity, android, Context, Result, SafVaultFolders, SafVaultManager, MLKitOcrParser, OcrExtractionResult (+13 more)

### Community 4 - "StreamManifest"
Cohesion: 0.08
Nodes (9): StreamItemStatus, ALREADY_SYNCED, COMPLETED, FAILED_SKIPPED, IN_PROGRESS, PENDING, StreamManifest, StreamManifestItem (+1 more)

### Community 5 - "ChildrenGridDashboard.kt"
Cohesion: 0.11
Nodes (24): alignment, ProbeItem, DiagnosticFeedScreen(), LogLine, background, border, circleshape, clickable (+16 more)

### Community 7 - "K.I.D.S. Android Collector (PRD)"
Cohesion: 0.09
Nodes (16): AI-Native Storage (JSONL & Markdown), ImportedNoticeRecord, WhatsAppChatExportParser, WhatsAppChatExportParserTest, Dual WhatsApp Catch-Up Engine, 5-Point Cloud Health Probe, Google Credential Manager API, inputstream (+8 more)

### Community 8 - "OnboardingWizardScreen.kt"
Cohesion: 0.10
Nodes (20): accountmanager, activityresultcontracts, androidx, getDefaultSchoolAppList(), Context, launchAccountPicker(), queryInstalledLauncherApps(), arrowback (+12 more)

### Community 9 - "GestureDescription"
Cohesion: 0.16
Nodes (7): GestureResultCallback, GestureResultCallback, GestureResultCallback, GestureResultCallback, GestureResultCallback, GestureDescription, GestureResultCallback

### Community 10 - "KidsAccessibilityService.kt"
Cohesion: 0.14
Nodes (15): AccessibilityEvent, accessibilitymanager, accessibilityserviceinfo, constraints, delay, firstornull, intentfilter, isactive (+7 more)

### Community 11 - "KotlinGraphifyEngine.kt"
Cohesion: 0.22
Nodes (7): GraphEdge, GraphNode, KnowledgeGraph, KotlinGraphifyEngine, Attachment, Notice, KnowledgeGraphBuilderTest

### Community 12 - "FloatingCrawlerOverlay.kt"
Cohesion: 0.12
Nodes (15): AccessibilityService, Button, gradientdrawable, gravity, handler, LinearLayout, looper, motionevent (+7 more)

### Community 15 - "NotificationParserTest.kt"
Cohesion: 0.17
Nodes (11): Bundle, StatusBarNotification, NotificationParser, ParsedNotification, KidsNotificationListenerService, NotificationParserTest, build, Bundle (+3 more)

### Community 16 - "MainActivity.kt"
Cohesion: 0.14
Nodes (13): AppScreen, DASHBOARD, DIAGNOSTICS, WIZARD, MainActivity, childprofile, ComponentActivity, lifecyclescope (+5 more)

### Community 17 - "ci_watch.py"
Cohesion: 0.21
Nodes (14): os, re, diagnose_failure(), get_latest_run(), main(), monitor_workflow(), CI/CD Pipeline Monitor, Release Verifier & Graphify Guardian for K.I.D.S.…, Runs local Graphify AST extraction and community clustering. (+6 more)

### Community 18 - "DriveSyncWorker.kt"
Cohesion: 0.19
Nodes (11): add, DriveSyncWorker, AttachmentEntity, buildjsonarray, buildjsonobject, CoroutineWorker, NoticeEntity, put (+3 more)

### Community 19 - "OnboardingWizardScreen"
Cohesion: 0.37
Nodes (4): Context, PermissionHelper, PermissionSetupDialog(), OnboardingWizardScreen()

### Community 20 - "assertthat"
Cohesion: 0.27
Nodes (6): assertthat, beforeeach, bytearrayinputstream, mockk, runblocking, test

### Community 21 - "ChildProfile"
Cohesion: 0.21
Nodes (6): NoticeEntity, ChildProfile, MultiChildRouter, ChildCard(), ChildrenGridDashboard(), MultiChildAttributionTest

### Community 22 - ".onNotificationPosted"
Cohesion: 0.17
Nodes (3): PrivacyFilter, StatusBarNotification, PrivacyFilterTest

### Community 23 - "Models.kt"
Cohesion: 0.15
Nodes (12): ChannelType, FILE_IMPORT, GOOGLE_CLASSROOM, SCHOOL_ERP, WHATSAPP, CloudHealthReport, SyncStatus, DROPPED (+4 more)

### Community 24 - "DriveVaultManager.kt"
Cohesion: 0.20
Nodes (9): CompletableDeferred, coroutinescope, googleaccountcredential, gsonfactory, launch, nethttptransport, userrecoverableauthexception, userrecoverableauthioexception (+1 more)

### Community 25 - "DeduplicationEngine"
Cohesion: 0.22
Nodes (4): DeduplicationEngine, java, DeduplicationHashTest, ByteArray

### Community 27 - "ContentCategory"
Cohesion: 0.25
Nodes (7): ContentClassifier, ContentCategory, ATTENDANCE, CIRCULAR, FEES, HOMEWORK, UNKNOWN

### Community 28 - "Type.kt"
Cohesion: 0.22
Nodes (8): font, fontfamily, fontweight, googlefont, r, sp, textstyle, typography

### Community 29 - "DriveDeepLogger.kt"
Cohesion: 0.28
Nodes (5): DeviceInfo, DiagnosticSnapshot, DriveDeepLogger, PipelineMetrics, StepStatus

### Community 30 - "Entities.kt"
Cohesion: 0.25
Nodes (7): AttachmentEntity, ChildProfileEntity, NoticeFtsEntity, entity, fts4, index, primarykey

### Community 31 - "TypeConverters.kt"
Cohesion: 0.32
Nodes (5): Converters, ChannelConfig, encodetostring, json, typeconverter

### Community 32 - "dispatchers"
Cohesion: 0.29
Nodes (6): DownloadFolderObserver, Context, dispatchers, environment, KidsDatabase, withcontext

### Community 33 - "GestureDescription"
Cohesion: 0.36
Nodes (4): GestureResultCallback, GestureResultCallback, GestureDescription, GestureResultCallback

### Community 34 - "ShareTargetActivity.kt"
Cohesion: 0.29
Nodes (6): cancel, existingworkpolicy, fileoutputstream, onetimeworkrequestbuilder, openablecolumns, workmanager

### Community 35 - "CrawlerTraceLogger.kt"
Cohesion: 0.29
Nodes (6): concurrentlinkedqueue, date, file, filewriter, locale, printwriter

### Community 36 - "WizardStep"
Cohesion: 0.33
Nodes (6): WizardStep, STEP_0_PERMISSIONS, STEP_1_VAULT, STEP_2_CLASSROOM, STEP_3_PORTALS, STEP_4_WHATSAPP

### Community 37 - "Intent"
Cohesion: 0.53
Nodes (4): BootReceiver, Context, BroadcastReceiver, Intent

### Community 39 - "KidsTheme.kt"
Cohesion: 0.40
Nodes (4): KidsTheme(), composable, lightcolorscheme, materialtheme

### Community 40 - "log"
Cohesion: 0.67
Nodes (3): KidsApplication, Application, log

### Community 41 - "gradlew"
Cohesion: 0.83
Nodes (3): gradlew script, die(), warn()

## Knowledge Gaps
- **34 isolated node(s):** `CloudHealthReport`, `DeviceInfo`, `PipelineMetrics`, `StepStatus`, `NoticeFtsEntity` (+29 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 210 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **21 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `KidsAccessibilityService` connect `KidsAccessibilityService` to `MLKitOcrParser.kt`, `OnboardingWizardScreen.kt`, `KidsAccessibilityService.kt`, `FloatingCrawlerOverlay.kt`, `.matchesAttachmentChipText`, `assertthat`, `ChildProfile`, `DeduplicationEngine`, `ContentCategory`?**
  _High betweenness centrality (0.227) - this node is a cross-community bridge._
- **Why does `ChildProfile` connect `ChildProfile` to `KidsAccessibilityService`, `ChildrenGridDashboard.kt`, `KidsAccessibilityService.kt`, `KotlinGraphifyEngine.kt`, `OnboardingWizardScreen`, `assertthat`, `.onNotificationPosted`, `Models.kt`?**
  _High betweenness centrality (0.103) - this node is a cross-community bridge._
- **Why does `KidsDatabase` connect `NoticeDao` to `KidsAccessibilityService`?**
  _High betweenness centrality (0.079) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `KidsAccessibilityService` (e.g. with `ContentClassifier` and `DeduplicationEngine`) actually correct?**
  _`KidsAccessibilityService` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Are the 6 inferred relationships involving `GoogleDriveClient` (e.g. with `.preWarmOAuthAndFolders()` and `.provisionStep1()`) actually correct?**
  _`GoogleDriveClient` has 6 INFERRED edges - model-reasoned connections that need verification._
- **Are the 4 inferred relationships involving `ChildProfile` (e.g. with `.onCreate()` and `OnboardingWizardScreen()`) actually correct?**
  _`ChildProfile` has 4 INFERRED edges - model-reasoned connections that need verification._
- **What connects `CloudHealthReport`, `DeviceInfo`, `PipelineMetrics` to the rest of the system?**
  _34 weakly-connected nodes found - possible documentation gaps or missing edges._