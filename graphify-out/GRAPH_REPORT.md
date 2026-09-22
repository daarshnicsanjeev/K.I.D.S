# Graph Report - K.I.D.S  (2026-09-22)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 651 nodes · 1356 edges · 52 communities (31 shown, 21 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 28 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `14261e2f`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- KidsAccessibilityService
- OnboardingWizardScreen.kt
- GoogleDriveClient
- NoticeDao
- MLKitOcrParser.kt
- FloatingCrawlerOverlay
- OnboardingWizardScreen
- KidsAccessibilityService.kt
- MainActivity.kt
- DriveVaultManager.kt
- KotlinGraphifyEngine.kt
- .log
- ContentCategory
- GestureDescription
- ci_watch.py
- FloatingCrawlerOverlay.kt
- ChildProfile
- Models.kt
- StreamManifest
- NotificationParserTest.kt
- DeduplicationEngine
- assertthat
- PrivacyFilterTest
- WhatsAppChatExportParser.kt
- DriveSyncWorker.kt
- K.I.D.S. Android Collector (PRD)
- Entities.kt
- DriveDeepLogger.kt
- TypeConverters.kt
- .findPrimaryScrollableNode
- StreamItemStatus
- KidsTheme.kt
- GestureResultCallback
- DriveVaultManagerTest.kt
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
- streamitemstatus
- StreamManifest
- streammanifestitem

## God Nodes (most connected - your core abstractions)
1. `KidsAccessibilityService` - 59 edges
2. `FloatingCrawlerOverlay` - 39 edges
3. `GoogleDriveClient` - 24 edges
4. `ChildProfile` - 21 edges
5. `OnboardingWizardScreen()` - 19 edges
6. `CrawlerTraceLogger` - 18 edges
7. `NoticeDao` - 16 edges
8. `StreamManifest` - 15 edges
9. `AttachmentDao` - 14 edges
10. `ContentCategory` - 13 edges

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

## Communities (52 total, 21 thin omitted)

### Community 0 - "KidsAccessibilityService"
Cohesion: 0.11
Nodes (6): AccessibilityEvent, ExtractedAttachmentDetail, KidsAccessibilityService, AccessibilityNodeInfo, Context, UnvisitedCard

### Community 1 - "OnboardingWizardScreen.kt"
Cohesion: 0.06
Nodes (52): accountmanager, activityresultcontracts, alignment, ProbeItem, DiagnosticFeedScreen(), LogLine, getDefaultSchoolAppList(), Context (+44 more)

### Community 2 - "GoogleDriveClient"
Cohesion: 0.07
Nodes (23): DriveVaultManager, Failure, Context, Result, ProvisionStep1Result, Success, UserConsentRequired, ChannelVaultFolders (+15 more)

### Community 3 - "NoticeDao"
Cohesion: 0.06
Nodes (12): AttachmentDao, ChildProfileDao, NoticeDao, KidsDatabase, Context, AttachmentEntity, ChildProfileEntity, database (+4 more)

### Community 4 - "MLKitOcrParser.kt"
Cohesion: 0.14
Nodes (17): Context, Result, SafVaultFolders, SafVaultManager, MLKitOcrParser, OcrExtractionResult, Bitmap, DocumentFile (+9 more)

### Community 5 - "FloatingCrawlerOverlay"
Cohesion: 0.15
Nodes (3): FloatingCrawlerOverlay, View, WindowManager

### Community 6 - "OnboardingWizardScreen"
Cohesion: 0.17
Nodes (12): androidx, Context, PermissionHelper, PermissionSetupDialog(), launchAccountPicker(), OnboardingWizardScreen(), BootReceiver, Context (+4 more)

### Community 7 - "KidsAccessibilityService.kt"
Cohesion: 0.14
Nodes (19): accessibilitymanager, accessibilityserviceinfo, KidsNotificationListenerService, constraints, delay, existingworkpolicy, fileoutputstream, firstornull (+11 more)

### Community 8 - "MainActivity.kt"
Cohesion: 0.13
Nodes (17): DownloadFolderObserver, Context, AppScreen, DASHBOARD, DIAGNOSTICS, WIZARD, MainActivity, childprofile (+9 more)

### Community 9 - "DriveVaultManager.kt"
Cohesion: 0.12
Nodes (16): KidsApplication, Application, concurrentlinkedqueue, coroutinescope, date, file, filewriter, googleaccountcredential (+8 more)

### Community 10 - "KotlinGraphifyEngine.kt"
Cohesion: 0.22
Nodes (7): GraphEdge, GraphNode, KnowledgeGraph, KotlinGraphifyEngine, Attachment, Notice, KnowledgeGraphBuilderTest

### Community 12 - "ContentCategory"
Cohesion: 0.15
Nodes (8): ContentClassifier, ContentCategory, ATTENDANCE, CIRCULAR, FEES, HOMEWORK, UNKNOWN, ContentClassifierTest

### Community 13 - "GestureDescription"
Cohesion: 0.19
Nodes (5): GestureResultCallback, GestureResultCallback, GestureResultCallback, GestureDescription, GestureResultCallback

### Community 14 - "ci_watch.py"
Cohesion: 0.21
Nodes (14): os, re, diagnose_failure(), get_latest_run(), main(), monitor_workflow(), CI/CD Pipeline Monitor, Release Verifier & Graphify Guardian for K.I.D.S.…, Runs local Graphify AST extraction and community clustering. (+6 more)

### Community 15 - "FloatingCrawlerOverlay.kt"
Cohesion: 0.14
Nodes (13): AccessibilityService, Button, gradientdrawable, gravity, handler, LinearLayout, looper, motionevent (+5 more)

### Community 16 - "ChildProfile"
Cohesion: 0.20
Nodes (6): ChildProfile, MultiChildRouter, ChildCard(), ChildrenGridDashboard(), StatusBarNotification, MultiChildAttributionTest

### Community 17 - "Models.kt"
Cohesion: 0.15
Nodes (12): ChannelType, FILE_IMPORT, GOOGLE_CLASSROOM, SCHOOL_ERP, WHATSAPP, CloudHealthReport, SyncStatus, DROPPED (+4 more)

### Community 19 - "NotificationParserTest.kt"
Cohesion: 0.22
Nodes (8): Bundle, StatusBarNotification, NotificationParser, ParsedNotification, NotificationParserTest, build, every, notification

### Community 20 - "DeduplicationEngine"
Cohesion: 0.21
Nodes (6): Activity, DeduplicationEngine, java, ShareTargetActivity, Bundle, ByteArray

### Community 21 - "assertthat"
Cohesion: 0.26
Nodes (5): DeduplicationHashTest, assertthat, beforeeach, bytearrayinputstream, test

### Community 23 - "WhatsAppChatExportParser.kt"
Cohesion: 0.24
Nodes (6): ImportedNoticeRecord, WhatsAppChatExportParser, Dual WhatsApp Catch-Up Engine, inputstream, pattern, simpledateformat

### Community 24 - "DriveSyncWorker.kt"
Cohesion: 0.25
Nodes (8): add, DriveSyncWorker, buildjsonarray, buildjsonobject, CoroutineWorker, put, syncstatus, workerparameters

### Community 25 - "K.I.D.S. Android Collector (PRD)"
Cohesion: 0.22
Nodes (9): AI-Native Storage (JSONL & Markdown), 5-Point Cloud Health Probe, Google Credential Manager API, Memory Boundary Privacy Filter, K.I.D.S. Android Collector (PRD), Restricted Drive Scope (drive.file), Sequential 4-Step Onboarding, Streaming PdfRenderer OCR (+1 more)

### Community 26 - "Entities.kt"
Cohesion: 0.22
Nodes (8): AttachmentEntity, ChildProfileEntity, NoticeEntity, NoticeFtsEntity, entity, fts4, index, primarykey

### Community 27 - "DriveDeepLogger.kt"
Cohesion: 0.28
Nodes (5): DeviceInfo, DiagnosticSnapshot, DriveDeepLogger, PipelineMetrics, StepStatus

### Community 28 - "TypeConverters.kt"
Cohesion: 0.32
Nodes (5): Converters, ChannelConfig, encodetostring, json, typeconverter

### Community 30 - "StreamItemStatus"
Cohesion: 0.33
Nodes (6): StreamItemStatus, ALREADY_SYNCED, COMPLETED, FAILED_SKIPPED, IN_PROGRESS, PENDING

### Community 31 - "KidsTheme.kt"
Cohesion: 0.40
Nodes (4): KidsTheme(), composable, lightcolorscheme, materialtheme

### Community 32 - "GestureResultCallback"
Cohesion: 0.50
Nodes (3): GestureResultCallback, GestureDescription, GestureResultCallback

### Community 33 - "DriveVaultManagerTest.kt"
Cohesion: 0.50
Nodes (3): Context, mockk, runblocking

### Community 35 - "gradlew"
Cohesion: 0.83
Nodes (3): gradlew script, die(), warn()

## Knowledge Gaps
- **36 isolated node(s):** `CloudHealthReport`, `AttachmentEntity`, `NoticeFtsEntity`, `NoticeEntity`, `DeviceInfo` (+31 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 194 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **21 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `KidsAccessibilityService` connect `KidsAccessibilityService` to `FloatingCrawlerOverlay`, `KidsAccessibilityService.kt`, `ContentCategory`, `FloatingCrawlerOverlay.kt`, `DeduplicationEngine`?**
  _High betweenness centrality (0.158) - this node is a cross-community bridge._
- **Why does `ChildProfile` connect `ChildProfile` to `KidsAccessibilityService`, `OnboardingWizardScreen.kt`, `OnboardingWizardScreen`, `KidsAccessibilityService.kt`, `KotlinGraphifyEngine.kt`, `Models.kt`, `assertthat`?**
  _High betweenness centrality (0.114) - this node is a cross-community bridge._
- **Why does `FloatingCrawlerOverlay` connect `FloatingCrawlerOverlay` to `KidsAccessibilityService`, `.findPrimaryScrollableNode`, `GestureDescription`, `FloatingCrawlerOverlay.kt`?**
  _High betweenness centrality (0.085) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `KidsAccessibilityService` (e.g. with `ContentClassifier` and `DeduplicationEngine`) actually correct?**
  _`KidsAccessibilityService` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Are the 4 inferred relationships involving `GoogleDriveClient` (e.g. with `.provisionStep1()` and `.provisionStep2Classroom()`) actually correct?**
  _`GoogleDriveClient` has 4 INFERRED edges - model-reasoned connections that need verification._
- **Are the 4 inferred relationships involving `ChildProfile` (e.g. with `.onCreate()` and `OnboardingWizardScreen()`) actually correct?**
  _`ChildProfile` has 4 INFERRED edges - model-reasoned connections that need verification._
- **What connects `CloudHealthReport`, `AttachmentEntity`, `NoticeFtsEntity` to the rest of the system?**
  _36 weakly-connected nodes found - possible documentation gaps or missing edges._