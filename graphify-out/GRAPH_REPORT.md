# Graph Report - K.I.D.S  (2026-09-21)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 515 nodes · 990 edges · 23 communities (15 shown, 8 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 14 edges (avg confidence: 0.88)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `8e16acc9`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- GoogleDriveClient
- OnboardingWizardScreen.kt
- NoticeDao
- ChildProfile
- KidsAccessibilityService.kt
- MainActivity.kt
- NotificationParserTest.kt
- FloatingCrawlerOverlay
- DriveDeepLogger.kt
- KidsAccessibilityService
- SafVaultManager.kt
- K.I.D.S. Android Collector (PRD)
- MLKitOcrParser.kt
- ci_watch.py
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

## Communities (23 total, 8 thin omitted)

### Community 0 - "GoogleDriveClient"
Cohesion: 0.07
Nodes (26): DriveVaultManager, Failure, Context, Result, ProvisionStep1Result, Success, UserConsentRequired, ChannelVaultFolders (+18 more)

### Community 1 - "OnboardingWizardScreen.kt"
Cohesion: 0.06
Nodes (48): accountmanager, activity, activityresultcontracts, alignment, ProbeItem, DiagnosticFeedScreen(), LogLine, getDefaultSchoolAppList() (+40 more)

### Community 2 - "NoticeDao"
Cohesion: 0.07
Nodes (12): AttachmentDao, ChildProfileDao, NoticeDao, KidsDatabase, Context, AttachmentEntity, ChildProfileEntity, database (+4 more)

### Community 3 - "ChildProfile"
Cohesion: 0.08
Nodes (24): GraphEdge, GraphNode, KnowledgeGraph, KotlinGraphifyEngine, Attachment, ChannelType, FILE_IMPORT, GOOGLE_CLASSROOM (+16 more)

### Community 4 - "KidsAccessibilityService.kt"
Cohesion: 0.08
Nodes (36): accessibilitymanager, accessibilityserviceinfo, DownloadFolderObserver, ContentClassifier, DeduplicationEngine, java, SyncStatus, DROPPED (+28 more)

### Community 5 - "MainActivity.kt"
Cohesion: 0.08
Nodes (28): androidx, ChildCard(), ChildrenGridDashboard(), AppScreen, DASHBOARD, DIAGNOSTICS, WIZARD, Bundle (+20 more)

### Community 6 - "NotificationParserTest.kt"
Cohesion: 0.07
Nodes (14): PrivacyFilter, ContentClassifierTest, DeduplicationHashTest, NotificationParserTest, PrivacyFilterTest, assertthat, beforeeach, Bundle (+6 more)

### Community 7 - "FloatingCrawlerOverlay"
Cohesion: 0.10
Nodes (18): AccessibilityService, FloatingCrawlerOverlay, GestureResultCallback, AccessibilityNodeInfo, Button, GestureDescription, gradientdrawable, gravity (+10 more)

### Community 8 - "DriveDeepLogger.kt"
Cohesion: 0.09
Nodes (19): AttachmentEntity, ChildProfileEntity, NoticeEntity, NoticeFtsEntity, Converters, ChannelConfig, DeviceInfo, DiagnosticSnapshot (+11 more)

### Community 9 - "KidsAccessibilityService"
Cohesion: 0.16
Nodes (6): AccessibilityEvent, Context, ExtractedAttachment, KidsAccessibilityService, AccessibilityNodeInfo, Context

### Community 10 - "SafVaultManager.kt"
Cohesion: 0.16
Nodes (13): Context, Result, SafVaultFolders, SafVaultManager, KidsApplication, CrawlerTraceLogger, Context, Application (+5 more)

### Community 11 - "K.I.D.S. Android Collector (PRD)"
Cohesion: 0.09
Nodes (16): AI-Native Storage (JSONL & Markdown), ImportedNoticeRecord, WhatsAppChatExportParser, WhatsAppChatExportParserTest, Dual WhatsApp Catch-Up Engine, 5-Point Cloud Health Probe, Google Credential Manager API, inputstream (+8 more)

### Community 12 - "MLKitOcrParser.kt"
Cohesion: 0.12
Nodes (16): MLKitOcrParser, OcrExtractionResult, Bundle, StatusBarNotification, ParsedNotification, Bitmap, build, inputimage (+8 more)

### Community 13 - "ci_watch.py"
Cohesion: 0.21
Nodes (14): os, re, diagnose_failure(), get_latest_run(), main(), monitor_workflow(), CI/CD Pipeline Monitor, Release Verifier & Graphify Guardian for K.I.D.S.…, Runs local Graphify AST extraction and community clustering. (+6 more)

### Community 14 - "gradlew"
Cohesion: 0.83
Nodes (3): gradlew script, die(), warn()

## Knowledge Gaps
- **31 isolated node(s):** `CloudHealthReport`, `DeviceInfo`, `PipelineMetrics`, `StepStatus`, `AttachmentEntity` (+26 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 168 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **8 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `ChildProfile` connect `ChildProfile` to `GoogleDriveClient`, `OnboardingWizardScreen.kt`, `KidsAccessibilityService.kt`, `MainActivity.kt`, `KidsAccessibilityService`?**
  _High betweenness centrality (0.184) - this node is a cross-community bridge._
- **Why does `KidsAccessibilityService` connect `KidsAccessibilityService` to `OnboardingWizardScreen.kt`, `KidsAccessibilityService.kt`, `MainActivity.kt`, `FloatingCrawlerOverlay`?**
  _High betweenness centrality (0.124) - this node is a cross-community bridge._
- **Are the 4 inferred relationships involving `GoogleDriveClient` (e.g. with `.provisionStep1()` and `.provisionStep2Classroom()`) actually correct?**
  _`GoogleDriveClient` has 4 INFERRED edges - model-reasoned connections that need verification._
- **What connects `CloudHealthReport`, `DeviceInfo`, `PipelineMetrics` to the rest of the system?**
  _31 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `GoogleDriveClient` be split into smaller, more focused modules?**
  _Cohesion score 0.06936026936026936 - nodes in this community are weakly interconnected._
- **Should `OnboardingWizardScreen.kt` be split into smaller, more focused modules?**
  _Cohesion score 0.058001397624039136 - nodes in this community are weakly interconnected._
- **Should `NoticeDao` be split into smaller, more focused modules?**
  _Cohesion score 0.06560283687943262 - nodes in this community are weakly interconnected._