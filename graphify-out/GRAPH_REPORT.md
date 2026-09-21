# Graph Report - K.I.D.S  (2026-09-21)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 510 nodes · 981 edges · 24 communities (15 shown, 9 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 14 edges (avg confidence: 0.88)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `99ffa73d`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- ContentCategory
- OnboardingWizardScreen.kt
- KidsAccessibilityService.kt
- MainActivity.kt
- GoogleDriveClient
- FloatingCrawlerOverlay
- NoticeDao
- DriveVaultManager.kt
- MLKitOcrParser.kt
- ci_watch.py
- SafVaultManager.kt
- KotlinGraphifyEngine.kt
- KidsAccessibilityService
- DriveSyncWorker.kt
- AttachmentDao
- gradlew
- AccessibilityNodeInfo
- java
- Result
- role
- statusbarnotification

## God Nodes (most connected - your core abstractions)
1. `KidsAccessibilityService` - 26 edges
2. `ChildProfile` - 24 edges
3. `GoogleDriveClient` - 23 edges
4. `FloatingCrawlerOverlay` - 21 edges
5. `OnboardingWizardScreen()` - 16 edges
6. `NoticeDao` - 15 edges
7. `AttachmentDao` - 14 edges
8. `ContentCategory` - 13 edges
9. `PermissionHelper` - 13 edges
10. `DeduplicationEngine` - 12 edges

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

## Communities (24 total, 9 thin omitted)

### Community 0 - "ContentCategory"
Cohesion: 0.05
Nodes (21): PrivacyFilter, ImportedNoticeRecord, WhatsAppChatExportParser, ContentCategory, ATTENDANCE, CIRCULAR, FEES, HOMEWORK (+13 more)

### Community 1 - "OnboardingWizardScreen.kt"
Cohesion: 0.06
Nodes (45): accountmanager, activity, activityresultcontracts, alignment, getDefaultSchoolAppList(), Context, queryInstalledLauncherApps(), WizardStep (+37 more)

### Community 2 - "KidsAccessibilityService.kt"
Cohesion: 0.07
Nodes (34): accessibilitymanager, accessibilityserviceinfo, DownloadFolderObserver, ContentClassifier, DeduplicationEngine, java, ChildProfile, SyncStatus (+26 more)

### Community 3 - "MainActivity.kt"
Cohesion: 0.07
Nodes (32): androidx, ProbeItem, ChildCard(), ChildrenGridDashboard(), AppScreen, DASHBOARD, DIAGNOSTICS, WIZARD (+24 more)

### Community 4 - "GoogleDriveClient"
Cohesion: 0.08
Nodes (19): AI-Native Storage (JSONL & Markdown), ChannelVaultFolders, DriveQuotaInfo, GoogleDriveClient, java, bytearraycontent, bytearrayoutputstream, filecontent (+11 more)

### Community 5 - "FloatingCrawlerOverlay"
Cohesion: 0.10
Nodes (18): AccessibilityService, FloatingCrawlerOverlay, GestureResultCallback, AccessibilityNodeInfo, Button, GestureDescription, gradientdrawable, gravity (+10 more)

### Community 6 - "NoticeDao"
Cohesion: 0.09
Nodes (10): ChildProfileDao, NoticeDao, KidsDatabase, Context, ChildProfileEntity, database, Flow, NoticeEntity (+2 more)

### Community 7 - "DriveVaultManager.kt"
Cohesion: 0.13
Nodes (18): DriveVaultManager, Failure, Context, Result, ProvisionStep1Result, Success, UserConsentRequired, ChildVaultFolders (+10 more)

### Community 8 - "MLKitOcrParser.kt"
Cohesion: 0.09
Nodes (20): MLKitOcrParser, OcrExtractionResult, Bundle, StatusBarNotification, ParsedNotification, NotificationParserTest, Bitmap, build (+12 more)

### Community 9 - "ci_watch.py"
Cohesion: 0.09
Nodes (22): AttachmentEntity, ChildProfileEntity, NoticeEntity, NoticeFtsEntity, Converters, ChannelConfig, encodetostring, entity (+14 more)

### Community 10 - "SafVaultManager.kt"
Cohesion: 0.16
Nodes (13): Context, Result, SafVaultFolders, SafVaultManager, KidsApplication, CrawlerTraceLogger, Context, Application (+5 more)

### Community 11 - "KotlinGraphifyEngine.kt"
Cohesion: 0.13
Nodes (14): GraphEdge, GraphNode, KnowledgeGraph, KotlinGraphifyEngine, Attachment, ChannelType, FILE_IMPORT, GOOGLE_CLASSROOM (+6 more)

### Community 12 - "KidsAccessibilityService"
Cohesion: 0.17
Nodes (5): AccessibilityEvent, Context, ExtractedAttachment, KidsAccessibilityService, AccessibilityNodeInfo

### Community 13 - "DriveSyncWorker.kt"
Cohesion: 0.15
Nodes (12): DriveSyncWorker, DeviceInfo, DiagnosticSnapshot, DriveDeepLogger, PipelineMetrics, StepStatus, buildjsonobject, CoroutineWorker (+4 more)

### Community 15 - "gradlew"
Cohesion: 0.83
Nodes (3): gradlew script, die(), warn()

## Knowledge Gaps
- **31 isolated node(s):** `CloudHealthReport`, `DeviceInfo`, `PipelineMetrics`, `StepStatus`, `AttachmentEntity` (+26 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 166 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **9 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `ChildProfile` connect `KidsAccessibilityService.kt` to `ContentCategory`, `OnboardingWizardScreen.kt`, `MainActivity.kt`, `DriveVaultManager.kt`, `KotlinGraphifyEngine.kt`, `KidsAccessibilityService`?**
  _High betweenness centrality (0.180) - this node is a cross-community bridge._
- **Why does `KidsAccessibilityService` connect `KidsAccessibilityService` to `OnboardingWizardScreen.kt`, `KidsAccessibilityService.kt`, `MainActivity.kt`, `FloatingCrawlerOverlay`?**
  _High betweenness centrality (0.126) - this node is a cross-community bridge._
- **Why does `GoogleDriveClient` connect `GoogleDriveClient` to `DriveVaultManager.kt`?**
  _High betweenness centrality (0.074) - this node is a cross-community bridge._
- **Are the 4 inferred relationships involving `GoogleDriveClient` (e.g. with `.provisionStep1()` and `.provisionStep2Classroom()`) actually correct?**
  _`GoogleDriveClient` has 4 INFERRED edges - model-reasoned connections that need verification._
- **What connects `CloudHealthReport`, `DeviceInfo`, `PipelineMetrics` to the rest of the system?**
  _31 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `ContentCategory` be split into smaller, more focused modules?**
  _Cohesion score 0.05052790346907994 - nodes in this community are weakly interconnected._
- **Should `OnboardingWizardScreen.kt` be split into smaller, more focused modules?**
  _Cohesion score 0.0611764705882353 - nodes in this community are weakly interconnected._