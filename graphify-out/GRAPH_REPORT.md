# Graph Report - K.I.D.S  (2026-09-25)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 749 nodes · 1633 edges · 62 communities (39 shown, 23 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 33 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `13716e49`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- KidsAccessibilityService
- NoticeDao
- OnboardingWizardScreen
- GoogleDriveClient
- StreamManifest
- MLKitOcrParser.kt
- FloatingCrawlerOverlay
- GestureDescription
- SafVaultManager.kt
- OnboardingWizardScreen.kt
- ChildrenGridDashboard.kt
- .log
- KotlinGraphifyEngine.kt
- FloatingCrawlerOverlay.kt
- ShareTargetActivity.kt
- ContentCategory
- MainActivity.kt
- .matchesAttachmentChipText
- ci_watch.py
- WhatsAppChatExportParser.kt
- Models.kt
- ChildProfile
- KidsAccessibilityService.kt
- PrivacyFilterTest
- assertthat
- DriveSyncWorker.kt
- DriveVaultManager.kt
- K.I.D.S. Android Collector (PRD)
- PermissionSetupDialog.kt
- Type.kt
- DriveDeepLogger.kt
- Entities.kt
- TypeConverters.kt
- dispatchers
- .fallbackNativeScrollBackward
- GestureDescription
- log
- CrawlerTraceLogger.kt
- DeduplicationEngine
- StreamItemStatus
- WizardStep
- KidsTheme.kt
- DriveSyncWorker
- DeduplicationHashTest
- gradlew
- KidsApplication.kt
- java
- Bundle
- AttachmentEntity
- NoticeEntity
- Result
- AccessibilityNodeInfo
- Context
- GestureDescription
- GestureResultCallback
- ChildVaultFolders
- provisionstep1result
- role
- statusbarnotification

## God Nodes (most connected - your core abstractions)
1. `KidsAccessibilityService` - 87 edges
2. `FloatingCrawlerOverlay` - 42 edges
3. `GoogleDriveClient` - 26 edges
4. `ChildProfile` - 21 edges
5. `OnboardingWizardScreen()` - 21 edges
6. `DriveVaultManager` - 19 edges
7. `CrawlerTraceLogger` - 17 edges
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

## Communities (62 total, 23 thin omitted)

### Community 0 - "KidsAccessibilityService"
Cohesion: 0.08
Nodes (9): AccessibilityNodeInfo, NoticeEntity, ExtractedAttachmentDetail, KidsAccessibilityService, UnvisitedCard, VisiblePendingCard, FloatingCrawlerOverlay, StreamManifest (+1 more)

### Community 1 - "NoticeDao"
Cohesion: 0.06
Nodes (12): AttachmentDao, ChildProfileDao, AttachmentEntity, NoticeEntity, NoticeDao, KidsDatabase, Context, ChildProfileEntity (+4 more)

### Community 2 - "OnboardingWizardScreen"
Cohesion: 0.13
Nodes (16): DriveVaultManager, Failure, Context, Result, ProvisionStep1Result, Success, UserConsentRequired, ChildVaultFolders (+8 more)

### Community 3 - "GoogleDriveClient"
Cohesion: 0.09
Nodes (13): ChannelVaultFolders, DriveQuotaInfo, GoogleDriveClient, async, bytearraycontent, bytearrayoutputstream, concurrenthashmap, Drive (+5 more)

### Community 4 - "StreamManifest"
Cohesion: 0.10
Nodes (3): StreamManifest, StreamManifestItem, StreamManifestAndCardTest

### Community 5 - "MLKitOcrParser.kt"
Cohesion: 0.09
Nodes (20): MLKitOcrParser, OcrExtractionResult, Bundle, StatusBarNotification, NotificationParser, ParsedNotification, NotificationParserTest, Bitmap (+12 more)

### Community 7 - "GestureDescription"
Cohesion: 0.13
Nodes (8): GestureResultCallback, GestureResultCallback, GestureResultCallback, GestureResultCallback, GestureResultCallback, GestureResultCallback, GestureDescription, GestureResultCallback

### Community 8 - "SafVaultManager.kt"
Cohesion: 0.21
Nodes (9): Activity, android, Context, Result, SafVaultFolders, SafVaultManager, ShareTargetActivity, DocumentFile (+1 more)

### Community 9 - "OnboardingWizardScreen.kt"
Cohesion: 0.10
Nodes (20): accountmanager, activityresultcontracts, androidx, getDefaultSchoolAppList(), Context, launchAccountPicker(), queryInstalledLauncherApps(), arrowback (+12 more)

### Community 10 - "ChildrenGridDashboard.kt"
Cohesion: 0.16
Nodes (17): alignment, ProbeItem, DiagnosticFeedScreen(), LogLine, background, circleshape, clickable, clip (+9 more)

### Community 11 - ".log"
Cohesion: 0.20
Nodes (3): CrawlerTraceLogger, Context, Result

### Community 12 - "KotlinGraphifyEngine.kt"
Cohesion: 0.22
Nodes (7): GraphEdge, GraphNode, KnowledgeGraph, KotlinGraphifyEngine, Attachment, Notice, KnowledgeGraphBuilderTest

### Community 13 - "FloatingCrawlerOverlay.kt"
Cohesion: 0.12
Nodes (15): AccessibilityService, Button, gradientdrawable, gravity, handler, LinearLayout, looper, motionevent (+7 more)

### Community 14 - "ShareTargetActivity.kt"
Cohesion: 0.16
Nodes (13): KidsNotificationListenerService, cancel, constraints, existingworkpolicy, fileoutputstream, firstornull, networktype, NotificationListenerService (+5 more)

### Community 15 - "ContentCategory"
Cohesion: 0.14
Nodes (8): ContentClassifier, ContentCategory, ATTENDANCE, CIRCULAR, FEES, HOMEWORK, UNKNOWN, ContentClassifierTest

### Community 16 - "MainActivity.kt"
Cohesion: 0.14
Nodes (13): AppScreen, DASHBOARD, DIAGNOSTICS, WIZARD, MainActivity, childprofile, ComponentActivity, lifecyclescope (+5 more)

### Community 18 - "ci_watch.py"
Cohesion: 0.21
Nodes (14): os, re, diagnose_failure(), get_latest_run(), main(), monitor_workflow(), CI/CD Pipeline Monitor, Release Verifier & Graphify Guardian for K.I.D.S.…, Runs local Graphify AST extraction and community clustering. (+6 more)

### Community 19 - "WhatsAppChatExportParser.kt"
Cohesion: 0.16
Nodes (7): ImportedNoticeRecord, WhatsAppChatExportParser, WhatsAppChatExportParserTest, Dual WhatsApp Catch-Up Engine, inputstream, pattern, simpledateformat

### Community 20 - "Models.kt"
Cohesion: 0.15
Nodes (12): ChannelType, FILE_IMPORT, GOOGLE_CLASSROOM, SCHOOL_ERP, WHATSAPP, CloudHealthReport, SyncStatus, DROPPED (+4 more)

### Community 21 - "ChildProfile"
Cohesion: 0.21
Nodes (6): ChildProfile, MultiChildRouter, ChildCard(), ChildrenGridDashboard(), StatusBarNotification, MultiChildAttributionTest

### Community 22 - "KidsAccessibilityService.kt"
Cohesion: 0.18
Nodes (10): AccessibilityEvent, accessibilitymanager, accessibilityserviceinfo, delay, intentfilter, isactive, Job, messagedigest (+2 more)

### Community 24 - "assertthat"
Cohesion: 0.38
Nodes (4): assertthat, beforeeach, bytearrayinputstream, test

### Community 25 - "DriveSyncWorker.kt"
Cohesion: 0.20
Nodes (9): add, AttachmentEntity, buildjsonarray, buildjsonobject, NoticeEntity, put, syncstatus, withtransaction (+1 more)

### Community 26 - "DriveVaultManager.kt"
Cohesion: 0.20
Nodes (9): CompletableDeferred, coroutinescope, googleaccountcredential, gsonfactory, launch, nethttptransport, userrecoverableauthexception, userrecoverableauthioexception (+1 more)

### Community 27 - "K.I.D.S. Android Collector (PRD)"
Cohesion: 0.22
Nodes (9): AI-Native Storage (JSONL & Markdown), 5-Point Cloud Health Probe, Google Credential Manager API, Memory Boundary Privacy Filter, K.I.D.S. Android Collector (PRD), Restricted Drive Scope (drive.file), Sequential 4-Step Onboarding, Streaming PdfRenderer OCR (+1 more)

### Community 28 - "PermissionSetupDialog.kt"
Cohesion: 0.22
Nodes (7): border, dialog, lifecycle, lifecycleeventobserver, locallifecycleowner, modifier, roundedcornershape

### Community 29 - "Type.kt"
Cohesion: 0.22
Nodes (8): font, fontfamily, fontweight, googlefont, r, sp, textstyle, typography

### Community 30 - "DriveDeepLogger.kt"
Cohesion: 0.28
Nodes (5): DeviceInfo, DiagnosticSnapshot, DriveDeepLogger, PipelineMetrics, StepStatus

### Community 31 - "Entities.kt"
Cohesion: 0.25
Nodes (7): AttachmentEntity, ChildProfileEntity, NoticeFtsEntity, entity, fts4, index, primarykey

### Community 32 - "TypeConverters.kt"
Cohesion: 0.32
Nodes (5): Converters, ChannelConfig, encodetostring, json, typeconverter

### Community 33 - "dispatchers"
Cohesion: 0.29
Nodes (6): DownloadFolderObserver, Context, dispatchers, environment, KidsDatabase, withcontext

### Community 35 - "GestureDescription"
Cohesion: 0.36
Nodes (4): GestureResultCallback, GestureResultCallback, GestureDescription, GestureResultCallback

### Community 36 - "log"
Cohesion: 0.43
Nodes (5): BootReceiver, Context, BroadcastReceiver, Intent, log

### Community 37 - "CrawlerTraceLogger.kt"
Cohesion: 0.29
Nodes (6): concurrentlinkedqueue, date, file, filewriter, locale, printwriter

### Community 38 - "DeduplicationEngine"
Cohesion: 0.40
Nodes (3): DeduplicationEngine, java, ByteArray

### Community 39 - "StreamItemStatus"
Cohesion: 0.33
Nodes (6): StreamItemStatus, ALREADY_SYNCED, COMPLETED, FAILED_SKIPPED, IN_PROGRESS, PENDING

### Community 40 - "WizardStep"
Cohesion: 0.33
Nodes (6): WizardStep, STEP_0_PERMISSIONS, STEP_1_VAULT, STEP_2_CLASSROOM, STEP_3_PORTALS, STEP_4_WHATSAPP

### Community 41 - "KidsTheme.kt"
Cohesion: 0.40
Nodes (4): KidsTheme(), composable, lightcolorscheme, materialtheme

### Community 44 - "gradlew"
Cohesion: 0.83
Nodes (3): gradlew script, die(), warn()

## Knowledge Gaps
- **34 isolated node(s):** `CloudHealthReport`, `DeviceInfo`, `PipelineMetrics`, `StepStatus`, `NoticeFtsEntity` (+29 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 210 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **23 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `KidsAccessibilityService` connect `KidsAccessibilityService` to `OnboardingWizardScreen`, `DeduplicationEngine`, `OnboardingWizardScreen.kt`, `FloatingCrawlerOverlay.kt`, `ContentCategory`, `.matchesAttachmentChipText`, `KidsAccessibilityService.kt`, `assertthat`?**
  _High betweenness centrality (0.222) - this node is a cross-community bridge._
- **Why does `ChildProfile` connect `ChildProfile` to `KidsAccessibilityService`, `OnboardingWizardScreen`, `ChildrenGridDashboard.kt`, `KotlinGraphifyEngine.kt`, `ShareTargetActivity.kt`, `Models.kt`, `assertthat`?**
  _High betweenness centrality (0.104) - this node is a cross-community bridge._
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