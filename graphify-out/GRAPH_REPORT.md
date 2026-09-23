# Graph Report - K.I.D.S  (2026-09-23)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 683 nodes · 1425 edges · 59 communities (38 shown, 21 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 30 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `539af72c`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- KidsAccessibilityService
- KidsAccessibilityService.kt
- NoticeDao
- GoogleDriveClient
- StreamManifest
- ChildrenGridDashboard.kt
- FloatingCrawlerOverlay
- OnboardingWizardScreen.kt
- SafVaultManager.kt
- MainActivity.kt
- .log
- GestureDescription
- DriveVaultManager.kt
- MLKitOcrParser.kt
- ci_watch.py
- FloatingCrawlerOverlay.kt
- DriveSyncWorker.kt
- OnboardingWizardScreen
- Models.kt
- assertthat
- GoogleDriveClient.kt
- PrivacyFilterTest
- DriveDeepLogger.kt
- NotificationParserTest.kt
- K.I.D.S. Android Collector (PRD)
- Entities.kt
- KotlinGraphifyEngine.kt
- KnowledgeGraphBuilderTest.kt
- WhatsAppChatExportParser
- Type.kt
- KotlinGraphifyEngine
- .findPrimaryScrollableNode
- dispatchers
- ContentCategory
- WizardStep
- ContentClassifierTest
- WhatsAppChatExportParser.kt
- KidsTheme.kt
- BootReceiver.kt
- DeduplicationHashTest.kt
- ChildProfile
- log
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
8. `StreamManifest` - 18 edges
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

## Communities (59 total, 21 thin omitted)

### Community 0 - "KidsAccessibilityService"
Cohesion: 0.11
Nodes (5): ExtractedAttachmentDetail, KidsAccessibilityService, AccessibilityNodeInfo, Context, UnvisitedCard

### Community 1 - "KidsAccessibilityService.kt"
Cohesion: 0.05
Nodes (40): AccessibilityEvent, accessibilitymanager, accessibilityserviceinfo, ContentClassifier, DeduplicationEngine, java, Bundle, StatusBarNotification (+32 more)

### Community 2 - "NoticeDao"
Cohesion: 0.06
Nodes (12): AttachmentDao, ChildProfileDao, AttachmentEntity, NoticeEntity, NoticeDao, KidsDatabase, Context, ChildProfileEntity (+4 more)

### Community 3 - "GoogleDriveClient"
Cohesion: 0.11
Nodes (13): DriveVaultManager, Failure, Context, Result, ProvisionStep1Result, Success, UserConsentRequired, ChannelVaultFolders (+5 more)

### Community 4 - "StreamManifest"
Cohesion: 0.09
Nodes (9): StreamItemStatus, ALREADY_SYNCED, COMPLETED, FAILED_SKIPPED, IN_PROGRESS, PENDING, StreamManifest, StreamManifestItem (+1 more)

### Community 5 - "ChildrenGridDashboard.kt"
Cohesion: 0.11
Nodes (24): alignment, ProbeItem, DiagnosticFeedScreen(), LogLine, background, border, circleshape, clickable (+16 more)

### Community 6 - "FloatingCrawlerOverlay"
Cohesion: 0.15
Nodes (3): FloatingCrawlerOverlay, View, WindowManager

### Community 7 - "OnboardingWizardScreen.kt"
Cohesion: 0.12
Nodes (18): accountmanager, activityresultcontracts, getDefaultSchoolAppList(), Context, queryInstalledLauncherApps(), arrowback, backhandler, channelconfig (+10 more)

### Community 8 - "SafVaultManager.kt"
Cohesion: 0.27
Nodes (8): Activity, Context, Result, SafVaultFolders, SafVaultManager, ShareTargetActivity, DocumentFile, Uri

### Community 9 - "MainActivity.kt"
Cohesion: 0.12
Nodes (15): androidx, AppScreen, DASHBOARD, DIAGNOSTICS, WIZARD, launchAccountPicker(), childprofile, Intent (+7 more)

### Community 11 - "GestureDescription"
Cohesion: 0.19
Nodes (5): GestureResultCallback, GestureResultCallback, GestureResultCallback, GestureDescription, GestureResultCallback

### Community 12 - "DriveVaultManager.kt"
Cohesion: 0.14
Nodes (13): CompletableDeferred, concurrentlinkedqueue, coroutinescope, date, filewriter, googleaccountcredential, gsonfactory, locale (+5 more)

### Community 13 - "MLKitOcrParser.kt"
Cohesion: 0.17
Nodes (11): MLKitOcrParser, OcrExtractionResult, Bitmap, inputimage, parcelfiledescriptor, pdfrenderer, resume, resumewithexception (+3 more)

### Community 14 - "ci_watch.py"
Cohesion: 0.21
Nodes (14): os, re, diagnose_failure(), get_latest_run(), main(), monitor_workflow(), CI/CD Pipeline Monitor, Release Verifier & Graphify Guardian for K.I.D.S.…, Runs local Graphify AST extraction and community clustering. (+6 more)

### Community 15 - "FloatingCrawlerOverlay.kt"
Cohesion: 0.14
Nodes (13): AccessibilityService, Button, gradientdrawable, gravity, handler, LinearLayout, looper, motionevent (+5 more)

### Community 16 - "DriveSyncWorker.kt"
Cohesion: 0.19
Nodes (11): add, DriveSyncWorker, AttachmentEntity, NoticeEntity, buildjsonarray, buildjsonobject, CoroutineWorker, put (+3 more)

### Community 17 - "OnboardingWizardScreen"
Cohesion: 0.37
Nodes (4): Context, PermissionHelper, PermissionSetupDialog(), OnboardingWizardScreen()

### Community 18 - "Models.kt"
Cohesion: 0.15
Nodes (12): ChannelType, FILE_IMPORT, GOOGLE_CLASSROOM, SCHOOL_ERP, WHATSAPP, CloudHealthReport, SyncStatus, DROPPED (+4 more)

### Community 19 - "assertthat"
Cohesion: 0.23
Nodes (5): MultiChildAttributionTest, assertthat, beforeeach, bytearrayinputstream, test

### Community 20 - "GoogleDriveClient.kt"
Cohesion: 0.17
Nodes (10): DriveQuotaInfo, async, bytearraycontent, bytearrayoutputstream, concurrenthashmap, Drive, filecontent, mutex (+2 more)

### Community 22 - "DriveDeepLogger.kt"
Cohesion: 0.24
Nodes (6): DeviceInfo, DiagnosticSnapshot, DriveDeepLogger, PipelineMetrics, StepStatus, file

### Community 23 - "NotificationParserTest.kt"
Cohesion: 0.20
Nodes (6): NotificationParserTest, Bundle, Context, every, mockk, runblocking

### Community 24 - "K.I.D.S. Android Collector (PRD)"
Cohesion: 0.22
Nodes (9): AI-Native Storage (JSONL & Markdown), 5-Point Cloud Health Probe, Google Credential Manager API, Memory Boundary Privacy Filter, K.I.D.S. Android Collector (PRD), Restricted Drive Scope (drive.file), Sequential 4-Step Onboarding, Streaming PdfRenderer OCR (+1 more)

### Community 25 - "Entities.kt"
Cohesion: 0.22
Nodes (8): AttachmentEntity, ChildProfileEntity, NoticeEntity, NoticeFtsEntity, entity, fts4, index, primarykey

### Community 26 - "KotlinGraphifyEngine.kt"
Cohesion: 0.31
Nodes (5): Converters, ChannelConfig, encodetostring, json, typeconverter

### Community 27 - "KnowledgeGraphBuilderTest.kt"
Cohesion: 0.33
Nodes (3): Attachment, Notice, KnowledgeGraphBuilderTest

### Community 28 - "WhatsAppChatExportParser"
Cohesion: 0.25
Nodes (3): ImportedNoticeRecord, WhatsAppChatExportParser, WhatsAppChatExportParserTest

### Community 29 - "Type.kt"
Cohesion: 0.22
Nodes (8): font, fontfamily, fontweight, googlefont, r, sp, textstyle, typography

### Community 30 - "KotlinGraphifyEngine"
Cohesion: 0.36
Nodes (4): GraphEdge, GraphNode, KnowledgeGraph, KotlinGraphifyEngine

### Community 32 - "dispatchers"
Cohesion: 0.33
Nodes (5): DownloadFolderObserver, Context, dispatchers, environment, withcontext

### Community 33 - "ContentCategory"
Cohesion: 0.33
Nodes (6): ContentCategory, ATTENDANCE, CIRCULAR, FEES, HOMEWORK, UNKNOWN

### Community 34 - "WizardStep"
Cohesion: 0.33
Nodes (6): WizardStep, STEP_0_PERMISSIONS, STEP_1_VAULT, STEP_2_CLASSROOM, STEP_3_PORTALS, STEP_4_WHATSAPP

### Community 36 - "WhatsAppChatExportParser.kt"
Cohesion: 0.40
Nodes (4): Dual WhatsApp Catch-Up Engine, inputstream, pattern, simpledateformat

### Community 37 - "KidsTheme.kt"
Cohesion: 0.40
Nodes (4): KidsTheme(), composable, lightcolorscheme, materialtheme

### Community 38 - "BootReceiver.kt"
Cohesion: 0.60
Nodes (3): BootReceiver, Context, BroadcastReceiver

### Community 40 - "ChildProfile"
Cohesion: 0.83
Nodes (3): ChildProfile, ChildCard(), ChildrenGridDashboard()

### Community 41 - "log"
Cohesion: 0.67
Nodes (3): KidsApplication, Application, log

### Community 42 - "gradlew"
Cohesion: 0.83
Nodes (3): gradlew script, die(), warn()

## Knowledge Gaps
- **36 isolated node(s):** `CloudHealthReport`, `DeviceInfo`, `PipelineMetrics`, `StepStatus`, `AttachmentEntity` (+31 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 206 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **21 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `KidsAccessibilityService` connect `KidsAccessibilityService` to `KidsAccessibilityService.kt`, `FloatingCrawlerOverlay.kt`, `FloatingCrawlerOverlay`, `OnboardingWizardScreen.kt`?**
  _High betweenness centrality (0.198) - this node is a cross-community bridge._
- **Why does `ChildProfile` connect `ChildProfile` to `KidsAccessibilityService`, `KidsAccessibilityService.kt`, `ChildrenGridDashboard.kt`, `OnboardingWizardScreen`, `Models.kt`, `assertthat`, `KotlinGraphifyEngine.kt`, `KnowledgeGraphBuilderTest.kt`, `KotlinGraphifyEngine`?**
  _High betweenness centrality (0.102) - this node is a cross-community bridge._
- **Why does `KidsDatabase` connect `NoticeDao` to `KidsAccessibilityService`?**
  _High betweenness centrality (0.085) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `KidsAccessibilityService` (e.g. with `ContentClassifier` and `DeduplicationEngine`) actually correct?**
  _`KidsAccessibilityService` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Are the 6 inferred relationships involving `GoogleDriveClient` (e.g. with `.preWarmOAuthAndFolders()` and `.provisionStep1()`) actually correct?**
  _`GoogleDriveClient` has 6 INFERRED edges - model-reasoned connections that need verification._
- **Are the 4 inferred relationships involving `ChildProfile` (e.g. with `.onCreate()` and `OnboardingWizardScreen()`) actually correct?**
  _`ChildProfile` has 4 INFERRED edges - model-reasoned connections that need verification._
- **What connects `CloudHealthReport`, `DeviceInfo`, `PipelineMetrics` to the rest of the system?**
  _36 weakly-connected nodes found - possible documentation gaps or missing edges._