# Graph Report - K.I.D.S  (2026-09-23)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 683 nodes · 1425 edges · 57 communities (35 shown, 22 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 30 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `c44782f4`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- GoogleDriveClient
- KidsAccessibilityService.kt
- KidsAccessibilityService
- NoticeDao
- StreamManifest
- FloatingCrawlerOverlay
- DriveSyncWorker.kt
- OnboardingWizardScreen.kt
- ChildrenGridDashboard.kt
- DriveVaultManager.kt
- .log
- GestureDescription
- MLKitOcrParser.kt
- ci_watch.py
- FloatingCrawlerOverlay.kt
- K.I.D.S. Android Collector (PRD)
- Models.kt
- assertthat
- GoogleDriveClient.kt
- SafVaultManager
- PrivacyFilterTest
- PermissionHelper.kt
- MainActivity.kt
- NotificationParserTest.kt
- Entities.kt
- KotlinGraphifyEngine.kt
- KnowledgeGraphBuilderTest.kt
- WhatsAppChatExportParser
- PermissionSetupDialog.kt
- Type.kt
- KotlinGraphifyEngine
- .findPrimaryScrollableNode
- dispatchers
- ContentCategory
- WizardStep
- ContentClassifierTest
- KidsTheme.kt
- DeduplicationHashTest.kt
- ChildProfile
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

## Communities (57 total, 22 thin omitted)

### Community 0 - "GoogleDriveClient"
Cohesion: 0.08
Nodes (18): DriveVaultManager, Failure, Context, Result, ProvisionStep1Result, Success, UserConsentRequired, ChannelVaultFolders (+10 more)

### Community 1 - "KidsAccessibilityService.kt"
Cohesion: 0.05
Nodes (42): AccessibilityEvent, accessibilitymanager, accessibilityserviceinfo, Activity, ContentClassifier, DeduplicationEngine, java, Bundle (+34 more)

### Community 2 - "KidsAccessibilityService"
Cohesion: 0.11
Nodes (4): ExtractedAttachmentDetail, KidsAccessibilityService, AccessibilityNodeInfo, UnvisitedCard

### Community 3 - "NoticeDao"
Cohesion: 0.06
Nodes (12): AttachmentDao, ChildProfileDao, AttachmentEntity, NoticeEntity, NoticeDao, KidsDatabase, Context, ChildProfileEntity (+4 more)

### Community 4 - "StreamManifest"
Cohesion: 0.09
Nodes (9): StreamItemStatus, ALREADY_SYNCED, COMPLETED, FAILED_SKIPPED, IN_PROGRESS, PENDING, StreamManifest, StreamManifestItem (+1 more)

### Community 5 - "FloatingCrawlerOverlay"
Cohesion: 0.15
Nodes (3): FloatingCrawlerOverlay, View, WindowManager

### Community 6 - "DriveSyncWorker.kt"
Cohesion: 0.11
Nodes (17): add, DriveSyncWorker, AttachmentEntity, NoticeEntity, DeviceInfo, DiagnosticSnapshot, DriveDeepLogger, PipelineMetrics (+9 more)

### Community 7 - "OnboardingWizardScreen.kt"
Cohesion: 0.12
Nodes (18): accountmanager, activityresultcontracts, getDefaultSchoolAppList(), Context, queryInstalledLauncherApps(), arrowback, backhandler, channelconfig (+10 more)

### Community 8 - "ChildrenGridDashboard.kt"
Cohesion: 0.16
Nodes (17): alignment, ProbeItem, DiagnosticFeedScreen(), LogLine, background, circleshape, clickable, clip (+9 more)

### Community 9 - "DriveVaultManager.kt"
Cohesion: 0.15
Nodes (15): CompletableDeferred, concurrentlinkedqueue, coroutinescope, date, filewriter, googleaccountcredential, gsonfactory, locale (+7 more)

### Community 11 - "GestureDescription"
Cohesion: 0.19
Nodes (5): GestureResultCallback, GestureResultCallback, GestureResultCallback, GestureDescription, GestureResultCallback

### Community 12 - "MLKitOcrParser.kt"
Cohesion: 0.17
Nodes (11): MLKitOcrParser, OcrExtractionResult, Bitmap, inputimage, parcelfiledescriptor, pdfrenderer, resume, resumewithexception (+3 more)

### Community 13 - "ci_watch.py"
Cohesion: 0.21
Nodes (14): os, re, diagnose_failure(), get_latest_run(), main(), monitor_workflow(), CI/CD Pipeline Monitor, Release Verifier & Graphify Guardian for K.I.D.S.…, Runs local Graphify AST extraction and community clustering. (+6 more)

### Community 14 - "FloatingCrawlerOverlay.kt"
Cohesion: 0.14
Nodes (13): AccessibilityService, Button, gradientdrawable, gravity, handler, LinearLayout, looper, motionevent (+5 more)

### Community 15 - "K.I.D.S. Android Collector (PRD)"
Cohesion: 0.15
Nodes (12): AI-Native Storage (JSONL & Markdown), Dual WhatsApp Catch-Up Engine, 5-Point Cloud Health Probe, Google Credential Manager API, inputstream, Memory Boundary Privacy Filter, pattern, K.I.D.S. Android Collector (PRD) (+4 more)

### Community 16 - "Models.kt"
Cohesion: 0.15
Nodes (12): ChannelType, FILE_IMPORT, GOOGLE_CLASSROOM, SCHOOL_ERP, WHATSAPP, CloudHealthReport, SyncStatus, DROPPED (+4 more)

### Community 17 - "assertthat"
Cohesion: 0.23
Nodes (5): MultiChildAttributionTest, assertthat, beforeeach, bytearrayinputstream, test

### Community 18 - "GoogleDriveClient.kt"
Cohesion: 0.17
Nodes (10): DriveQuotaInfo, async, bytearraycontent, bytearrayoutputstream, concurrenthashmap, Drive, filecontent, mutex (+2 more)

### Community 19 - "SafVaultManager"
Cohesion: 0.44
Nodes (6): Context, Result, SafVaultFolders, SafVaultManager, DocumentFile, Uri

### Community 21 - "PermissionHelper.kt"
Cohesion: 0.24
Nodes (8): androidx, launchAccountPicker(), BootReceiver, Context, BroadcastReceiver, Intent, notificationmanagercompat, settings

### Community 22 - "MainActivity.kt"
Cohesion: 0.18
Nodes (10): AppScreen, DASHBOARD, DIAGNOSTICS, WIZARD, childprofile, launch, lifecyclescope, remembersaveable (+2 more)

### Community 23 - "NotificationParserTest.kt"
Cohesion: 0.20
Nodes (6): NotificationParserTest, Bundle, Context, every, mockk, runblocking

### Community 24 - "Entities.kt"
Cohesion: 0.22
Nodes (8): AttachmentEntity, ChildProfileEntity, NoticeEntity, NoticeFtsEntity, entity, fts4, index, primarykey

### Community 25 - "KotlinGraphifyEngine.kt"
Cohesion: 0.31
Nodes (5): Converters, ChannelConfig, encodetostring, json, typeconverter

### Community 26 - "KnowledgeGraphBuilderTest.kt"
Cohesion: 0.33
Nodes (3): Attachment, Notice, KnowledgeGraphBuilderTest

### Community 27 - "WhatsAppChatExportParser"
Cohesion: 0.25
Nodes (3): ImportedNoticeRecord, WhatsAppChatExportParser, WhatsAppChatExportParserTest

### Community 28 - "PermissionSetupDialog.kt"
Cohesion: 0.22
Nodes (7): border, dialog, lifecycle, lifecycleeventobserver, locallifecycleowner, modifier, roundedcornershape

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

### Community 36 - "KidsTheme.kt"
Cohesion: 0.40
Nodes (4): KidsTheme(), composable, lightcolorscheme, materialtheme

### Community 38 - "ChildProfile"
Cohesion: 0.83
Nodes (3): ChildProfile, ChildCard(), ChildrenGridDashboard()

### Community 39 - "gradlew"
Cohesion: 0.83
Nodes (3): gradlew script, die(), warn()

## Knowledge Gaps
- **36 isolated node(s):** `CloudHealthReport`, `AttachmentEntity`, `NoticeEntity`, `NoticeFtsEntity`, `DeviceInfo` (+31 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 206 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **22 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `KidsAccessibilityService` connect `KidsAccessibilityService` to `GoogleDriveClient`, `KidsAccessibilityService.kt`, `FloatingCrawlerOverlay`, `OnboardingWizardScreen.kt`, `FloatingCrawlerOverlay.kt`?**
  _High betweenness centrality (0.198) - this node is a cross-community bridge._
- **Why does `ChildProfile` connect `ChildProfile` to `GoogleDriveClient`, `KidsAccessibilityService.kt`, `KidsAccessibilityService`, `ChildrenGridDashboard.kt`, `Models.kt`, `assertthat`, `KotlinGraphifyEngine.kt`, `KnowledgeGraphBuilderTest.kt`, `KotlinGraphifyEngine`?**
  _High betweenness centrality (0.102) - this node is a cross-community bridge._
- **Why does `KidsDatabase` connect `NoticeDao` to `KidsAccessibilityService`?**
  _High betweenness centrality (0.085) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `KidsAccessibilityService` (e.g. with `ContentClassifier` and `DeduplicationEngine`) actually correct?**
  _`KidsAccessibilityService` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Are the 6 inferred relationships involving `GoogleDriveClient` (e.g. with `.preWarmOAuthAndFolders()` and `.provisionStep1()`) actually correct?**
  _`GoogleDriveClient` has 6 INFERRED edges - model-reasoned connections that need verification._
- **Are the 4 inferred relationships involving `ChildProfile` (e.g. with `.onCreate()` and `OnboardingWizardScreen()`) actually correct?**
  _`ChildProfile` has 4 INFERRED edges - model-reasoned connections that need verification._
- **What connects `CloudHealthReport`, `AttachmentEntity`, `NoticeEntity` to the rest of the system?**
  _36 weakly-connected nodes found - possible documentation gaps or missing edges._