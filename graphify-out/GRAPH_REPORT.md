# Graph Report - K.I.D.S  (2026-09-21)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 531 nodes · 1014 edges · 28 communities (17 shown, 11 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 21 edges (avg confidence: 0.87)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `5650c598`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- OnboardingWizardScreen.kt
- KidsAccessibilityService.kt
- ChildProfile
- NotificationParserTest.kt
- FloatingCrawlerOverlay
- NoticeDao
- ci_watch.py
- GoogleDriveClient
- DriveVaultManager.kt
- KidsAccessibilityService
- SafVaultManager.kt
- K.I.D.S. Android Collector (PRD)
- MLKitOcrParser.kt
- OnboardingWizardScreen
- AttachmentDao
- Type.kt
- WizardStep
- gradlew
- AccessibilityNodeInfo
- Result
- java
- Bundle
- provisionstep1result
- role
- statusbarnotification

## God Nodes (most connected - your core abstractions)
1. `GoogleDriveClient` - 24 edges
2. `KidsAccessibilityService` - 24 edges
3. `ChildProfile` - 21 edges
4. `FloatingCrawlerOverlay` - 21 edges
5. `OnboardingWizardScreen()` - 19 edges
6. `NoticeDao` - 15 edges
7. `AttachmentDao` - 14 edges
8. `ContentCategory` - 13 edges
9. `DriveVaultManager` - 13 edges
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

## Communities (28 total, 11 thin omitted)

### Community 0 - "OnboardingWizardScreen.kt"
Cohesion: 0.05
Nodes (58): accountmanager, activity, activityresultcontracts, alignment, androidx, ProbeItem, AppScreen, DASHBOARD (+50 more)

### Community 1 - "KidsAccessibilityService.kt"
Cohesion: 0.06
Nodes (43): accessibilitymanager, accessibilityserviceinfo, DownloadFolderObserver, ContentClassifier, DeduplicationEngine, java, SyncStatus, DROPPED (+35 more)

### Community 2 - "ChildProfile"
Cohesion: 0.07
Nodes (26): GraphEdge, GraphNode, KnowledgeGraph, KotlinGraphifyEngine, Attachment, ChannelType, FILE_IMPORT, GOOGLE_CLASSROOM (+18 more)

### Community 3 - "NotificationParserTest.kt"
Cohesion: 0.07
Nodes (14): PrivacyFilter, ContentClassifierTest, DeduplicationHashTest, NotificationParserTest, PrivacyFilterTest, assertthat, beforeeach, Bundle (+6 more)

### Community 4 - "FloatingCrawlerOverlay"
Cohesion: 0.10
Nodes (18): AccessibilityService, FloatingCrawlerOverlay, GestureResultCallback, AccessibilityNodeInfo, Button, GestureDescription, gradientdrawable, gravity (+10 more)

### Community 5 - "NoticeDao"
Cohesion: 0.09
Nodes (10): ChildProfileDao, NoticeDao, KidsDatabase, Context, ChildProfileEntity, database, Flow, NoticeEntity (+2 more)

### Community 6 - "ci_watch.py"
Cohesion: 0.08
Nodes (27): AttachmentEntity, ChildProfileEntity, NoticeEntity, NoticeFtsEntity, Converters, ChannelConfig, encodetostring, entity (+19 more)

### Community 7 - "GoogleDriveClient"
Cohesion: 0.09
Nodes (13): ChannelVaultFolders, ChildVaultFolders, DriveQuotaInfo, GoogleDriveClient, async, bytearraycontent, bytearrayoutputstream, concurrenthashmap (+5 more)

### Community 8 - "DriveVaultManager.kt"
Cohesion: 0.16
Nodes (16): DriveVaultManager, Failure, Context, ProvisionStep1Result, Success, UserConsentRequired, Result, DriveVaultManagerTest (+8 more)

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

### Community 13 - "OnboardingWizardScreen"
Cohesion: 0.22
Nodes (8): Context, PermissionHelper, PermissionSetupDialog(), KidsTheme(), OnboardingWizardScreen(), composable, lightcolorscheme, materialtheme

### Community 15 - "Type.kt"
Cohesion: 0.22
Nodes (8): font, fontfamily, fontweight, googlefont, r, sp, textstyle, typography

### Community 16 - "WizardStep"
Cohesion: 0.33
Nodes (6): WizardStep, STEP_0_PERMISSIONS, STEP_1_VAULT, STEP_2_CLASSROOM, STEP_3_PORTALS, STEP_4_WHATSAPP

### Community 17 - "gradlew"
Cohesion: 0.83
Nodes (3): gradlew script, die(), warn()

## Knowledge Gaps
- **31 isolated node(s):** `DeviceInfo`, `PipelineMetrics`, `StepStatus`, `CloudHealthReport`, `AttachmentEntity` (+26 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 174 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **11 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `ChildProfile` connect `ChildProfile` to `OnboardingWizardScreen.kt`, `KidsAccessibilityService.kt`, `OnboardingWizardScreen`, `KidsAccessibilityService`?**
  _High betweenness centrality (0.142) - this node is a cross-community bridge._
- **Why does `OnboardingWizardScreen()` connect `OnboardingWizardScreen` to `OnboardingWizardScreen.kt`, `DriveVaultManager.kt`, `ChildProfile`, `ci_watch.py`?**
  _High betweenness centrality (0.108) - this node is a cross-community bridge._
- **Why does `GoogleDriveClient` connect `GoogleDriveClient` to `DriveVaultManager.kt`?**
  _High betweenness centrality (0.077) - this node is a cross-community bridge._
- **Are the 4 inferred relationships involving `GoogleDriveClient` (e.g. with `.provisionStep1()` and `.provisionStep2Classroom()`) actually correct?**
  _`GoogleDriveClient` has 4 INFERRED edges - model-reasoned connections that need verification._
- **Are the 2 inferred relationships involving `ChildProfile` (e.g. with `.onCreate()` and `OnboardingWizardScreen()`) actually correct?**
  _`ChildProfile` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Are the 2 inferred relationships involving `OnboardingWizardScreen()` (e.g. with `ChannelConfig` and `ChildProfile`) actually correct?**
  _`OnboardingWizardScreen()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `DeviceInfo`, `PipelineMetrics`, `StepStatus` to the rest of the system?**
  _31 weakly-connected nodes found - possible documentation gaps or missing edges._