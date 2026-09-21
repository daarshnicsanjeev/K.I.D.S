# Graph Report - K.I.D.S  (2026-09-21)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 527 nodes · 1008 edges · 24 communities (15 shown, 9 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 16 edges (avg confidence: 0.88)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `4cf15b17`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- OnboardingWizardScreen.kt
- ContentCategory
- NoticeDao
- KidsAccessibilityService.kt
- MainActivity.kt
- GoogleDriveClient
- ChildProfile
- FloatingCrawlerOverlay
- DriveSyncWorker.kt
- MLKitOcrParser.kt
- .provisionStep1
- SafVaultManager.kt
- KidsAccessibilityService
- ci_watch.py
- gradlew
- AccessibilityNodeInfo
- Context
- java
- Result
- role
- statusbarnotification

## God Nodes (most connected - your core abstractions)
1. `KidsAccessibilityService` - 24 edges
2. `GoogleDriveClient` - 24 edges
3. `ChildProfile` - 22 edges
4. `FloatingCrawlerOverlay` - 21 edges
5. `OnboardingWizardScreen()` - 18 edges
6. `NoticeDao` - 15 edges
7. `AttachmentDao` - 14 edges
8. `PermissionHelper` - 14 edges
9. `ContentCategory` - 13 edges
10. `DriveVaultManager` - 12 edges

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

### Community 0 - "OnboardingWizardScreen.kt"
Cohesion: 0.05
Nodes (56): accountmanager, activity, activityresultcontracts, alignment, ProbeItem, ChildCard(), ChildrenGridDashboard(), DiagnosticFeedScreen() (+48 more)

### Community 1 - "ContentCategory"
Cohesion: 0.05
Nodes (22): ContentClassifier, PrivacyFilter, ImportedNoticeRecord, WhatsAppChatExportParser, ContentCategory, ATTENDANCE, CIRCULAR, FEES (+14 more)

### Community 2 - "NoticeDao"
Cohesion: 0.07
Nodes (12): AttachmentDao, ChildProfileDao, NoticeDao, KidsDatabase, Context, AttachmentEntity, ChildProfileEntity, database (+4 more)

### Community 3 - "KidsAccessibilityService.kt"
Cohesion: 0.07
Nodes (35): accessibilitymanager, accessibilityserviceinfo, DownloadFolderObserver, Context, DeduplicationEngine, java, SyncStatus, DROPPED (+27 more)

### Community 4 - "MainActivity.kt"
Cohesion: 0.09
Nodes (26): androidx, AppScreen, DASHBOARD, DIAGNOSTICS, WIZARD, Bundle, MainActivity, Context (+18 more)

### Community 5 - "GoogleDriveClient"
Cohesion: 0.07
Nodes (21): AI-Native Storage (JSONL & Markdown), ChannelVaultFolders, DriveQuotaInfo, GoogleDriveClient, async, bytearraycontent, bytearrayoutputstream, concurrenthashmap (+13 more)

### Community 6 - "ChildProfile"
Cohesion: 0.10
Nodes (18): GraphEdge, GraphNode, KnowledgeGraph, KotlinGraphifyEngine, Attachment, ChannelType, FILE_IMPORT, GOOGLE_CLASSROOM (+10 more)

### Community 7 - "FloatingCrawlerOverlay"
Cohesion: 0.10
Nodes (18): AccessibilityService, FloatingCrawlerOverlay, GestureResultCallback, AccessibilityNodeInfo, Button, GestureDescription, gradientdrawable, gravity (+10 more)

### Community 8 - "DriveSyncWorker.kt"
Cohesion: 0.07
Nodes (25): AttachmentEntity, ChildProfileEntity, NoticeEntity, NoticeFtsEntity, Converters, ChannelConfig, DriveSyncWorker, DeviceInfo (+17 more)

### Community 9 - "MLKitOcrParser.kt"
Cohesion: 0.09
Nodes (20): MLKitOcrParser, OcrExtractionResult, Bundle, StatusBarNotification, NotificationParser, ParsedNotification, NotificationParserTest, Bitmap (+12 more)

### Community 10 - ".provisionStep1"
Cohesion: 0.20
Nodes (12): DriveVaultManager, Failure, Result, ProvisionStep1Result, Success, UserConsentRequired, ChildVaultFolders, Result (+4 more)

### Community 11 - "SafVaultManager.kt"
Cohesion: 0.16
Nodes (13): Context, Result, SafVaultFolders, SafVaultManager, KidsApplication, CrawlerTraceLogger, Context, Application (+5 more)

### Community 12 - "KidsAccessibilityService"
Cohesion: 0.17
Nodes (5): AccessibilityEvent, ExtractedAttachment, KidsAccessibilityService, AccessibilityNodeInfo, Context

### Community 13 - "ci_watch.py"
Cohesion: 0.21
Nodes (14): os, re, diagnose_failure(), get_latest_run(), main(), monitor_workflow(), CI/CD Pipeline Monitor, Release Verifier & Graphify Guardian for K.I.D.S.…, Runs local Graphify AST extraction and community clustering. (+6 more)

### Community 14 - "gradlew"
Cohesion: 0.83
Nodes (3): gradlew script, die(), warn()

## Knowledge Gaps
- **32 isolated node(s):** `CloudHealthReport`, `AttachmentEntity`, `ChildProfileEntity`, `NoticeEntity`, `NoticeFtsEntity` (+27 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 176 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **9 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `ChildProfile` connect `ChildProfile` to `OnboardingWizardScreen.kt`, `KidsAccessibilityService.kt`, `MainActivity.kt`, `KidsAccessibilityService`?**
  _High betweenness centrality (0.162) - this node is a cross-community bridge._
- **Why does `OnboardingWizardScreen()` connect `MainActivity.kt` to `OnboardingWizardScreen.kt`, `DriveSyncWorker.kt`, `.provisionStep1`, `ChildProfile`?**
  _High betweenness centrality (0.108) - this node is a cross-community bridge._
- **Why does `GoogleDriveClient` connect `GoogleDriveClient` to `.provisionStep1`?**
  _High betweenness centrality (0.075) - this node is a cross-community bridge._
- **Are the 4 inferred relationships involving `GoogleDriveClient` (e.g. with `.provisionStep1()` and `.provisionStep2Classroom()`) actually correct?**
  _`GoogleDriveClient` has 4 INFERRED edges - model-reasoned connections that need verification._
- **Are the 2 inferred relationships involving `OnboardingWizardScreen()` (e.g. with `ChannelConfig` and `ChildProfile`) actually correct?**
  _`OnboardingWizardScreen()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `CloudHealthReport`, `AttachmentEntity`, `ChildProfileEntity` to the rest of the system?**
  _32 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `OnboardingWizardScreen.kt` be split into smaller, more focused modules?**
  _Cohesion score 0.05129561078794289 - nodes in this community are weakly interconnected._