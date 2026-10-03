# Graph Report - K.I.D.S  (2026-10-03)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 993 nodes · 2520 edges · 73 communities (19 shown, 54 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 38 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `8b9449f1`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- AccessibilityNodeInfo
- KidsAccessibilityService
- FloatingCrawlerOverlay
- Query
- OnboardingWizardScreen
- ChildProfile
- ci_watch.py
- StreamManifest
- CrawlerTraceLogger
- Test
- SafVaultManager.kt
- OnboardingWizardScreen.kt
- ShareTargetActivity.kt
- MLKitOcrParser.kt
- .matchesAttachmentChipText
- DriveSyncWorker.kt
- WhatsAppChatExportParser.kt
- NotificationParserTest.kt
- GoogleDriveClient.kt
- .parse
- MainActivity.kt
- DeduplicationEngine
- GoogleDriveClient
- PrivacyFilterTest
- GestureDescription
- K.I.D.S. Android Collector (PRD)
- log
- ChildProfile
- Intent
- WizardStep
- ContentClassifierTest
- .getOrCreateFolder
- DeduplicationHashTest

## God Nodes (most connected - your core abstractions)
1. `GoogleDriveSharedHarvester` - 115 edges
2. `KidsAccessibilityService` - 113 edges
3. `FloatingCrawlerOverlay` - 44 edges
4. `GoogleDriveClient` - 32 edges
5. `OnboardingWizardScreen()` - 25 edges
6. `DriveVaultManager` - 23 edges
7. `CrawlerTraceLogger` - 22 edges
8. `DriveAttachmentMatcherTest` - 22 edges
9. `NoticeDao` - 19 edges
10. `ChildProfile` - 18 edges

## Surprising Connections (you probably didn't know these)
- `KidsAccessibilityService` --calls--> `ContentClassifier`  [INFERRED]
  app/src/main/java/com/kids/collector/service/KidsAccessibilityService.kt → app/src/main/java/com/kids/collector/domain/classifier/ContentClassifier.kt
- `KidsAccessibilityService` --calls--> `DeduplicationEngine`  [INFERRED]
  app/src/main/java/com/kids/collector/service/KidsAccessibilityService.kt → app/src/main/java/com/kids/collector/domain/dedupe/DeduplicationEngine.kt
- `ShareTargetActivity` --calls--> `DeduplicationEngine`  [INFERRED]
  app/src/main/java/com/kids/collector/presentation/share/ShareTargetActivity.kt → app/src/main/java/com/kids/collector/domain/dedupe/DeduplicationEngine.kt
- `DiagnosticFeedScreen()` --calls--> `ProbeItem`  [INFERRED]
  app/src/main/java/com/kids/collector/presentation/telemetry/DiagnosticFeedScreen.kt → app/src/main/java/com/kids/collector/domain/model/Models.kt
- `DriveSyncWorker` --calls--> `KotlinGraphifyEngine`  [INFERRED]
  app/src/main/java/com/kids/collector/service/DriveSyncWorker.kt → app/src/main/java/com/kids/collector/domain/graph/KotlinGraphifyEngine.kt

## Import Cycles
- None detected.

## Communities (73 total, 54 thin omitted)

### Community 1 - "KidsAccessibilityService"
Cohesion: 0.06
Nodes (5): NoticeEntity, ExtractedAttachmentDetail, KidsAccessibilityService, UnvisitedCard, VisiblePendingCard

### Community 2 - "FloatingCrawlerOverlay"
Cohesion: 0.06
Nodes (7): FloatingCrawlerOverlay, GestureResultCallback, GestureResultCallback, GestureResultCallback, GestureResultCallback, GestureResultCallback, GestureResultCallback

### Community 3 - "Query"
Cohesion: 0.07
Nodes (4): AttachmentDao, ChildProfileDao, NoticeDao, KidsDatabase

### Community 4 - "OnboardingWizardScreen"
Cohesion: 0.11
Nodes (12): DriveVaultManager, Failure, ProvisionStep1Result, Success, UserConsentRequired, ProbeItem, PermissionHelper, PermissionSetupDialog() (+4 more)

### Community 5 - "ChildProfile"
Cohesion: 0.07
Nodes (27): GraphEdge, GraphNode, KnowledgeGraph, KotlinGraphifyEngine, Attachment, ChannelType, FILE_IMPORT, GOOGLE_CLASSROOM (+19 more)

### Community 6 - "ci_watch.py"
Cohesion: 0.07
Nodes (16): AttachmentEntity, ChildProfileEntity, NoticeFtsEntity, Converters, ChannelConfig, diagnose_failure(), get_latest_run(), main() (+8 more)

### Community 7 - "StreamManifest"
Cohesion: 0.08
Nodes (9): StreamItemStatus, ALREADY_SYNCED, COMPLETED, FAILED_SKIPPED, IN_PROGRESS, PENDING, StreamManifest, StreamManifestItem (+1 more)

### Community 8 - "CrawlerTraceLogger"
Cohesion: 0.09
Nodes (4): CrawlerTraceLogger, DriveSyncWorker, DiagnosticSnapshot, DriveDeepLogger

### Community 10 - "SafVaultManager.kt"
Cohesion: 0.23
Nodes (3): SafVaultFolders, SafVaultManager, ShareTargetActivity

### Community 11 - "OnboardingWizardScreen.kt"
Cohesion: 0.12
Nodes (3): getDefaultSchoolAppList(), launchAccountPicker(), queryInstalledLauncherApps()

### Community 18 - "DriveSyncWorker.kt"
Cohesion: 0.14
Nodes (3): DeviceInfo, PipelineMetrics, StepStatus

### Community 19 - "WhatsAppChatExportParser.kt"
Cohesion: 0.16
Nodes (4): ImportedNoticeRecord, WhatsAppChatExportParser, WhatsAppChatExportParserTest, Dual WhatsApp Catch-Up Engine

### Community 20 - "NotificationParserTest.kt"
Cohesion: 0.20
Nodes (3): NotificationParser, ParsedNotification, NotificationParserTest

### Community 22 - ".parse"
Cohesion: 0.22
Nodes (3): ClassroomDateParser, ParsedDate, ClassroomDateParserTest

### Community 23 - "MainActivity.kt"
Cohesion: 0.18
Nodes (5): AppScreen, DASHBOARD, DIAGNOSTICS, WIZARD, MainActivity

### Community 28 - "GestureDescription"
Cohesion: 0.27
Nodes (3): GestureResultCallback, GestureResultCallback, GestureResultCallback

### Community 30 - "K.I.D.S. Android Collector (PRD)"
Cohesion: 0.22
Nodes (6): 5-Point Cloud Health Probe, Google Credential Manager API, Memory Boundary Privacy Filter, K.I.D.S. Android Collector (PRD), Sequential 4-Step Onboarding, Streaming PdfRenderer OCR

### Community 33 - "ChildProfile"
Cohesion: 0.28
Nodes (3): ChildCard(), ChildrenGridDashboard(), KidsTheme()

### Community 37 - "WizardStep"
Cohesion: 0.33
Nodes (6): WizardStep, STEP_0_PERMISSIONS, STEP_1_VAULT, STEP_2_CLASSROOM, STEP_3_PORTALS, STEP_4_WHATSAPP

## Knowledge Gaps
- **34 isolated node(s):** `DeviceInfo`, `PipelineMetrics`, `StepStatus`, `CloudHealthReport`, `NoticeFtsEntity` (+29 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 229 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **54 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `KidsAccessibilityService` connect `KidsAccessibilityService` to `FloatingCrawlerOverlay`, `Intent`, `OnboardingWizardScreen.kt`, `ShareTargetActivity.kt`, `DriveVaultManager.kt`, `MLKitOcrParser.kt`, `.matchesAttachmentChipText`, `KidsAccessibilityService.kt`, `assertthat`, `DeduplicationEngine`?**
  _High betweenness centrality (0.224) - this node is a cross-community bridge._
- **Why does `GoogleDriveSharedHarvester` connect `AccessibilityNodeInfo` to `KidsAccessibilityService`, `Test`, `ShareTargetActivity.kt`, `DriveVaultManager.kt`, `MLKitOcrParser.kt`, `MainActivity.kt`, `assertthat`?**
  _High betweenness centrality (0.119) - this node is a cross-community bridge._
- **Why does `ChildProfile` connect `ChildProfile` to `KidsAccessibilityService`, `OnboardingWizardScreen`, `ShareTargetActivity.kt`?**
  _High betweenness centrality (0.061) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `GoogleDriveSharedHarvester` (e.g. with `.runDeepCrawlLoop()` and `.startDirectDriveHarvest()`) actually correct?**
  _`GoogleDriveSharedHarvester` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Are the 2 inferred relationships involving `KidsAccessibilityService` (e.g. with `ContentClassifier` and `DeduplicationEngine`) actually correct?**
  _`KidsAccessibilityService` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `DeviceInfo`, `PipelineMetrics`, `StepStatus` to the rest of the system?**
  _34 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `AccessibilityNodeInfo` be split into smaller, more focused modules?**
  _Cohesion score 0.07234337140879198 - nodes in this community are weakly interconnected._