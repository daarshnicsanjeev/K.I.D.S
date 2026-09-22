# Graph Report - K.I.D.S  (2026-09-23)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 681 nodes · 1423 edges · 37 communities (21 shown, 16 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 30 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `94cdae2a`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- KidsAccessibilityService
- FloatingCrawlerOverlay
- KidsAccessibilityService.kt
- ContentCategory
- ChildProfile
- NoticeDao
- GoogleDriveClient
- DriveSyncWorker.kt
- GoogleDriveClient.kt
- MLKitOcrParser.kt
- StreamManifest
- ChildrenGridDashboard.kt
- OnboardingWizardScreen.kt
- ci_watch.py
- OnboardingWizardScreen
- MainActivity.kt
- Type.kt
- Intent
- WizardStep
- GestureResultCallback
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

## Communities (37 total, 16 thin omitted)

### Community 0 - "KidsAccessibilityService"
Cohesion: 0.08
Nodes (8): AccessibilityEvent, CrawlerTraceLogger, Context, ExtractedAttachmentDetail, KidsAccessibilityService, AccessibilityNodeInfo, Context, UnvisitedCard

### Community 1 - "FloatingCrawlerOverlay"
Cohesion: 0.06
Nodes (23): AccessibilityService, FloatingCrawlerOverlay, GestureResultCallback, GestureResultCallback, GestureResultCallback, GestureResultCallback, AccessibilityNodeInfo, GestureDescription (+15 more)

### Community 2 - "KidsAccessibilityService.kt"
Cohesion: 0.05
Nodes (49): accessibilitymanager, accessibilityserviceinfo, Activity, DownloadFolderObserver, Context, DeduplicationEngine, java, KidsApplication (+41 more)

### Community 3 - "ContentCategory"
Cohesion: 0.05
Nodes (26): ContentClassifier, PrivacyFilter, ContentCategory, ATTENDANCE, CIRCULAR, FEES, HOMEWORK, UNKNOWN (+18 more)

### Community 4 - "ChildProfile"
Cohesion: 0.06
Nodes (28): GraphEdge, GraphNode, KnowledgeGraph, KotlinGraphifyEngine, Attachment, ChannelType, FILE_IMPORT, GOOGLE_CLASSROOM (+20 more)

### Community 5 - "NoticeDao"
Cohesion: 0.06
Nodes (12): AttachmentDao, ChildProfileDao, AttachmentEntity, NoticeEntity, NoticeDao, KidsDatabase, Context, ChildProfileEntity (+4 more)

### Community 6 - "GoogleDriveClient"
Cohesion: 0.11
Nodes (13): DriveVaultManager, Failure, Context, Result, ProvisionStep1Result, Success, UserConsentRequired, ChannelVaultFolders (+5 more)

### Community 7 - "DriveSyncWorker.kt"
Cohesion: 0.06
Nodes (30): add, AttachmentEntity, ChildProfileEntity, NoticeEntity, NoticeFtsEntity, Converters, ChannelConfig, DriveSyncWorker (+22 more)

### Community 8 - "GoogleDriveClient.kt"
Cohesion: 0.06
Nodes (26): AI-Native Storage (JSONL & Markdown), DriveQuotaInfo, ImportedNoticeRecord, WhatsAppChatExportParser, WhatsAppChatExportParserTest, async, bytearraycontent, bytearrayoutputstream (+18 more)

### Community 9 - "MLKitOcrParser.kt"
Cohesion: 0.11
Nodes (22): Context, Result, SafVaultFolders, SafVaultManager, MLKitOcrParser, OcrExtractionResult, Bitmap, concurrentlinkedqueue (+14 more)

### Community 10 - "StreamManifest"
Cohesion: 0.10
Nodes (9): StreamItemStatus, ALREADY_SYNCED, COMPLETED, FAILED_SKIPPED, IN_PROGRESS, PENDING, StreamManifest, StreamManifestItem (+1 more)

### Community 11 - "ChildrenGridDashboard.kt"
Cohesion: 0.12
Nodes (24): alignment, ProbeItem, DiagnosticFeedScreen(), LogLine, background, border, circleshape, clickable (+16 more)

### Community 12 - "OnboardingWizardScreen.kt"
Cohesion: 0.12
Nodes (18): accountmanager, activityresultcontracts, getDefaultSchoolAppList(), Context, queryInstalledLauncherApps(), arrowback, backhandler, channelconfig (+10 more)

### Community 13 - "ci_watch.py"
Cohesion: 0.21
Nodes (14): os, re, diagnose_failure(), get_latest_run(), main(), monitor_workflow(), CI/CD Pipeline Monitor, Release Verifier & Graphify Guardian for K.I.D.S.…, Runs local Graphify AST extraction and community clustering. (+6 more)

### Community 14 - "OnboardingWizardScreen"
Cohesion: 0.37
Nodes (4): Context, PermissionHelper, PermissionSetupDialog(), OnboardingWizardScreen()

### Community 15 - "MainActivity.kt"
Cohesion: 0.17
Nodes (10): AppScreen, DASHBOARD, DIAGNOSTICS, WIZARD, lifecyclescope, notificationmanagercompat, remembersaveable, setcontent (+2 more)

### Community 16 - "Type.kt"
Cohesion: 0.22
Nodes (8): font, fontfamily, fontweight, googlefont, r, sp, textstyle, typography

### Community 17 - "Intent"
Cohesion: 0.36
Nodes (6): androidx, launchAccountPicker(), BootReceiver, Context, BroadcastReceiver, Intent

### Community 18 - "WizardStep"
Cohesion: 0.33
Nodes (6): WizardStep, STEP_0_PERMISSIONS, STEP_1_VAULT, STEP_2_CLASSROOM, STEP_3_PORTALS, STEP_4_WHATSAPP

### Community 19 - "GestureResultCallback"
Cohesion: 0.50
Nodes (3): GestureResultCallback, GestureDescription, GestureResultCallback

### Community 20 - "gradlew"
Cohesion: 0.83
Nodes (3): gradlew script, die(), warn()

## Knowledge Gaps
- **36 isolated node(s):** `CloudHealthReport`, `AttachmentEntity`, `NoticeEntity`, `NoticeFtsEntity`, `DeviceInfo` (+31 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 205 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **16 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `KidsAccessibilityService` connect `KidsAccessibilityService` to `FloatingCrawlerOverlay`, `KidsAccessibilityService.kt`, `ContentCategory`, `ChildProfile`, `OnboardingWizardScreen.kt`?**
  _High betweenness centrality (0.200) - this node is a cross-community bridge._
- **Why does `ChildProfile` connect `ChildProfile` to `KidsAccessibilityService`, `KidsAccessibilityService.kt`, `ChildrenGridDashboard.kt`, `OnboardingWizardScreen`?**
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