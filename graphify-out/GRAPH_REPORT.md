# Graph Report - K.I.D.S  (2026-09-23)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 692 nodes · 1450 edges · 45 communities (25 shown, 20 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 30 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `d775b821`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- .log
- OnboardingWizardScreen.kt
- KidsAccessibilityService
- GoogleDriveClient
- NoticeDao
- ChildProfile
- StreamManifest
- ci_watch.py
- DriveSyncWorker.kt
- OnboardingWizardScreen
- SafVaultManager.kt
- K.I.D.S. Android Collector (PRD)
- KidsAccessibilityService.kt
- MLKitOcrParser.kt
- KidsNotificationListenerService.kt
- NotificationParserTest.kt
- MainActivity.kt
- PrivacyFilterTest
- DriveVaultManager.kt
- assertthat
- GestureDescription
- dispatchers
- DeduplicationEngine
- ContentClassifierTest
- MultiChildAttributionTest
- log
- DeduplicationHashTest
- DriveVaultManagerTest.kt
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
1. `KidsAccessibilityService` - 64 edges
2. `FloatingCrawlerOverlay` - 39 edges
3. `GoogleDriveClient` - 26 edges
4. `ChildProfile` - 21 edges
5. `OnboardingWizardScreen()` - 21 edges
6. `DriveVaultManager` - 19 edges
7. `StreamManifest` - 19 edges
8. `CrawlerTraceLogger` - 18 edges
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

## Communities (45 total, 20 thin omitted)

### Community 0 - ".log"
Cohesion: 0.05
Nodes (25): AccessibilityService, CrawlerTraceLogger, Context, FloatingCrawlerOverlay, GestureResultCallback, GestureResultCallback, GestureResultCallback, GestureResultCallback (+17 more)

### Community 1 - "OnboardingWizardScreen.kt"
Cohesion: 0.05
Nodes (56): accountmanager, activityresultcontracts, alignment, ProbeItem, DiagnosticFeedScreen(), LogLine, getDefaultSchoolAppList(), Context (+48 more)

### Community 2 - "KidsAccessibilityService"
Cohesion: 0.10
Nodes (5): ExtractedAttachmentDetail, KidsAccessibilityService, AccessibilityNodeInfo, Context, UnvisitedCard

### Community 3 - "GoogleDriveClient"
Cohesion: 0.08
Nodes (22): DriveVaultManager, Failure, Context, Result, ProvisionStep1Result, Success, UserConsentRequired, ChannelVaultFolders (+14 more)

### Community 4 - "NoticeDao"
Cohesion: 0.06
Nodes (12): AttachmentDao, ChildProfileDao, AttachmentEntity, NoticeEntity, NoticeDao, KidsDatabase, Context, ChildProfileEntity (+4 more)

### Community 5 - "ChildProfile"
Cohesion: 0.07
Nodes (32): GraphEdge, GraphNode, KnowledgeGraph, KotlinGraphifyEngine, Attachment, ChannelType, FILE_IMPORT, GOOGLE_CLASSROOM (+24 more)

### Community 6 - "StreamManifest"
Cohesion: 0.08
Nodes (9): StreamItemStatus, ALREADY_SYNCED, COMPLETED, FAILED_SKIPPED, IN_PROGRESS, PENDING, StreamManifest, StreamManifestItem (+1 more)

### Community 7 - "ci_watch.py"
Cohesion: 0.08
Nodes (27): AttachmentEntity, ChildProfileEntity, NoticeEntity, NoticeFtsEntity, Converters, ChannelConfig, encodetostring, entity (+19 more)

### Community 8 - "DriveSyncWorker.kt"
Cohesion: 0.10
Nodes (18): add, DriveSyncWorker, AttachmentEntity, NoticeEntity, Result, DeviceInfo, DiagnosticSnapshot, DriveDeepLogger (+10 more)

### Community 9 - "OnboardingWizardScreen"
Cohesion: 0.17
Nodes (12): androidx, Context, PermissionHelper, PermissionSetupDialog(), launchAccountPicker(), OnboardingWizardScreen(), BootReceiver, Context (+4 more)

### Community 10 - "SafVaultManager.kt"
Cohesion: 0.18
Nodes (13): Activity, Context, Result, SafVaultFolders, SafVaultManager, ShareTargetActivity, concurrentlinkedqueue, date (+5 more)

### Community 11 - "K.I.D.S. Android Collector (PRD)"
Cohesion: 0.09
Nodes (16): AI-Native Storage (JSONL & Markdown), ImportedNoticeRecord, WhatsAppChatExportParser, WhatsAppChatExportParserTest, Dual WhatsApp Catch-Up Engine, 5-Point Cloud Health Probe, Google Credential Manager API, inputstream (+8 more)

### Community 12 - "KidsAccessibilityService.kt"
Cohesion: 0.14
Nodes (16): AccessibilityEvent, accessibilitymanager, accessibilityserviceinfo, AttachmentEntity, constraints, delay, existingworkpolicy, fileoutputstream (+8 more)

### Community 13 - "MLKitOcrParser.kt"
Cohesion: 0.17
Nodes (11): MLKitOcrParser, OcrExtractionResult, Bitmap, inputimage, parcelfiledescriptor, pdfrenderer, resume, resumewithexception (+3 more)

### Community 14 - "KidsNotificationListenerService.kt"
Cohesion: 0.17
Nodes (9): ContentClassifier, MultiChildRouter, KidsNotificationListenerService, StatusBarNotification, firstornull, NoticeEntity, NotificationListenerService, supervisorjob (+1 more)

### Community 15 - "NotificationParserTest.kt"
Cohesion: 0.20
Nodes (9): Bundle, StatusBarNotification, NotificationParser, ParsedNotification, NotificationParserTest, build, Bundle, every (+1 more)

### Community 16 - "MainActivity.kt"
Cohesion: 0.18
Nodes (12): AppScreen, DASHBOARD, DIAGNOSTICS, WIZARD, MainActivity, childprofile, ComponentActivity, KidsDatabase (+4 more)

### Community 18 - "DriveVaultManager.kt"
Cohesion: 0.20
Nodes (9): CompletableDeferred, coroutinescope, googleaccountcredential, gsonfactory, launch, nethttptransport, userrecoverableauthexception, userrecoverableauthioexception (+1 more)

### Community 19 - "assertthat"
Cohesion: 0.42
Nodes (4): assertthat, beforeeach, bytearrayinputstream, test

### Community 20 - "GestureDescription"
Cohesion: 0.36
Nodes (4): GestureResultCallback, GestureResultCallback, GestureDescription, GestureResultCallback

### Community 21 - "dispatchers"
Cohesion: 0.33
Nodes (5): DownloadFolderObserver, Context, dispatchers, environment, withcontext

### Community 22 - "DeduplicationEngine"
Cohesion: 0.40
Nodes (3): DeduplicationEngine, java, ByteArray

### Community 25 - "log"
Cohesion: 0.67
Nodes (3): KidsApplication, Application, log

### Community 27 - "DriveVaultManagerTest.kt"
Cohesion: 0.50
Nodes (3): Context, mockk, runblocking

### Community 28 - "gradlew"
Cohesion: 0.83
Nodes (3): gradlew script, die(), warn()

## Knowledge Gaps
- **36 isolated node(s):** `CloudHealthReport`, `AttachmentEntity`, `NoticeEntity`, `NoticeFtsEntity`, `DeviceInfo` (+31 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 208 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **20 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `KidsAccessibilityService` connect `KidsAccessibilityService` to `.log`, `OnboardingWizardScreen.kt`, `KidsAccessibilityService.kt`, `KidsNotificationListenerService.kt`, `DeduplicationEngine`?**
  _High betweenness centrality (0.202) - this node is a cross-community bridge._
- **Why does `ChildProfile` connect `ChildProfile` to `OnboardingWizardScreen.kt`, `KidsAccessibilityService`, `OnboardingWizardScreen`, `KidsNotificationListenerService.kt`, `assertthat`, `MultiChildAttributionTest`?**
  _High betweenness centrality (0.101) - this node is a cross-community bridge._
- **Why does `KidsDatabase` connect `NoticeDao` to `KidsAccessibilityService`?**
  _High betweenness centrality (0.084) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `KidsAccessibilityService` (e.g. with `ContentClassifier` and `DeduplicationEngine`) actually correct?**
  _`KidsAccessibilityService` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Are the 6 inferred relationships involving `GoogleDriveClient` (e.g. with `.preWarmOAuthAndFolders()` and `.provisionStep1()`) actually correct?**
  _`GoogleDriveClient` has 6 INFERRED edges - model-reasoned connections that need verification._
- **Are the 4 inferred relationships involving `ChildProfile` (e.g. with `.onCreate()` and `OnboardingWizardScreen()`) actually correct?**
  _`ChildProfile` has 4 INFERRED edges - model-reasoned connections that need verification._
- **What connects `CloudHealthReport`, `AttachmentEntity`, `NoticeEntity` to the rest of the system?**
  _36 weakly-connected nodes found - possible documentation gaps or missing edges._