# Graph Report - K.I.D.S  (2026-09-21)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 521 nodes · 1000 edges · 26 communities (16 shown, 10 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 14 edges (avg confidence: 0.88)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `d7d31039`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- OnboardingWizardScreen.kt
- MainActivity.kt
- ChildProfile
- GoogleDriveClient
- KidsAccessibilityService.kt
- FloatingCrawlerOverlay
- DriveSyncWorker.kt
- NotificationParserTest.kt
- NoticeDao
- DriveVaultManager.kt
- SafVaultManager.kt
- KidsAccessibilityService
- MLKitOcrParser.kt
- ci_watch.py
- AttachmentDao
- WhatsAppChatExportParser.kt
- gradlew
- AccessibilityNodeInfo
- Context
- java
- Result
- role
- statusbarnotification

## God Nodes (most connected - your core abstractions)
1. `KidsAccessibilityService` - 26 edges
2. `GoogleDriveClient` - 24 edges
3. `ChildProfile` - 23 edges
4. `FloatingCrawlerOverlay` - 21 edges
5. `OnboardingWizardScreen()` - 16 edges
6. `NoticeDao` - 15 edges
7. `AttachmentDao` - 14 edges
8. `PermissionHelper` - 13 edges
9. `ContentCategory` - 13 edges
10. `DriveVaultManager` - 13 edges

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

## Communities (26 total, 10 thin omitted)

### Community 0 - "OnboardingWizardScreen.kt"
Cohesion: 0.06
Nodes (46): accountmanager, activity, activityresultcontracts, alignment, getDefaultSchoolAppList(), Context, queryInstalledLauncherApps(), WizardStep (+38 more)

### Community 1 - "MainActivity.kt"
Cohesion: 0.07
Nodes (31): androidx, ProbeItem, ChildCard(), ChildrenGridDashboard(), AppScreen, DASHBOARD, DIAGNOSTICS, WIZARD (+23 more)

### Community 2 - "ChildProfile"
Cohesion: 0.08
Nodes (24): GraphEdge, GraphNode, KnowledgeGraph, KotlinGraphifyEngine, Attachment, ChannelType, FILE_IMPORT, GOOGLE_CLASSROOM (+16 more)

### Community 3 - "GoogleDriveClient"
Cohesion: 0.07
Nodes (21): AI-Native Storage (JSONL & Markdown), ChannelVaultFolders, DriveQuotaInfo, GoogleDriveClient, async, bytearraycontent, bytearrayoutputstream, concurrenthashmap (+13 more)

### Community 4 - "KidsAccessibilityService.kt"
Cohesion: 0.09
Nodes (30): accessibilitymanager, accessibilityserviceinfo, DownloadFolderObserver, ContentClassifier, DeduplicationEngine, java, SyncStatus, DROPPED (+22 more)

### Community 5 - "FloatingCrawlerOverlay"
Cohesion: 0.10
Nodes (18): AccessibilityService, FloatingCrawlerOverlay, GestureResultCallback, AccessibilityNodeInfo, Button, GestureDescription, gradientdrawable, gravity (+10 more)

### Community 6 - "DriveSyncWorker.kt"
Cohesion: 0.07
Nodes (26): AttachmentEntity, ChildProfileEntity, NoticeEntity, NoticeFtsEntity, Converters, ChannelConfig, DriveSyncWorker, DeviceInfo (+18 more)

### Community 7 - "NotificationParserTest.kt"
Cohesion: 0.07
Nodes (11): PrivacyFilter, ContentClassifierTest, DeduplicationHashTest, NotificationParserTest, PrivacyFilterTest, assertthat, beforeeach, Bundle (+3 more)

### Community 8 - "NoticeDao"
Cohesion: 0.09
Nodes (10): ChildProfileDao, NoticeDao, KidsDatabase, Context, ChildProfileEntity, database, Flow, NoticeEntity (+2 more)

### Community 9 - "DriveVaultManager.kt"
Cohesion: 0.14
Nodes (18): DriveVaultManager, Failure, Result, ProvisionStep1Result, Success, UserConsentRequired, ChildVaultFolders, Result (+10 more)

### Community 10 - "SafVaultManager.kt"
Cohesion: 0.16
Nodes (13): Context, Result, SafVaultFolders, SafVaultManager, KidsApplication, CrawlerTraceLogger, Context, Application (+5 more)

### Community 11 - "KidsAccessibilityService"
Cohesion: 0.17
Nodes (5): AccessibilityEvent, Context, ExtractedAttachment, KidsAccessibilityService, AccessibilityNodeInfo

### Community 12 - "MLKitOcrParser.kt"
Cohesion: 0.12
Nodes (16): MLKitOcrParser, OcrExtractionResult, Bundle, StatusBarNotification, ParsedNotification, Bitmap, build, inputimage (+8 more)

### Community 13 - "ci_watch.py"
Cohesion: 0.21
Nodes (14): os, re, diagnose_failure(), get_latest_run(), main(), monitor_workflow(), CI/CD Pipeline Monitor, Release Verifier & Graphify Guardian for K.I.D.S.…, Runs local Graphify AST extraction and community clustering. (+6 more)

### Community 15 - "WhatsAppChatExportParser.kt"
Cohesion: 0.16
Nodes (7): ImportedNoticeRecord, WhatsAppChatExportParser, WhatsAppChatExportParserTest, Dual WhatsApp Catch-Up Engine, inputstream, pattern, simpledateformat

### Community 16 - "gradlew"
Cohesion: 0.83
Nodes (3): gradlew script, die(), warn()

## Knowledge Gaps
- **31 isolated node(s):** `CloudHealthReport`, `AttachmentEntity`, `ChildProfileEntity`, `NoticeEntity`, `NoticeFtsEntity` (+26 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 173 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **10 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `ChildProfile` connect `ChildProfile` to `OnboardingWizardScreen.kt`, `MainActivity.kt`, `KidsAccessibilityService`, `KidsAccessibilityService.kt`?**
  _High betweenness centrality (0.166) - this node is a cross-community bridge._
- **Why does `KidsAccessibilityService` connect `KidsAccessibilityService` to `OnboardingWizardScreen.kt`, `MainActivity.kt`, `KidsAccessibilityService.kt`, `FloatingCrawlerOverlay`?**
  _High betweenness centrality (0.120) - this node is a cross-community bridge._
- **Why does `GoogleDriveClient` connect `GoogleDriveClient` to `DriveVaultManager.kt`?**
  _High betweenness centrality (0.074) - this node is a cross-community bridge._
- **Are the 4 inferred relationships involving `GoogleDriveClient` (e.g. with `.provisionStep1()` and `.provisionStep2Classroom()`) actually correct?**
  _`GoogleDriveClient` has 4 INFERRED edges - model-reasoned connections that need verification._
- **What connects `CloudHealthReport`, `AttachmentEntity`, `ChildProfileEntity` to the rest of the system?**
  _31 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `OnboardingWizardScreen.kt` be split into smaller, more focused modules?**
  _Cohesion score 0.06033182503770739 - nodes in this community are weakly interconnected._
- **Should `MainActivity.kt` be split into smaller, more focused modules?**
  _Cohesion score 0.07400555041628122 - nodes in this community are weakly interconnected._