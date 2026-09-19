# Graph Report - K.I.D.S  (2026-09-20)

## Corpus Check
- Corpus is ~20,320 words - fits in a single context window. You may not need a graph.

## Summary
- 339 nodes · 565 edges · 19 communities (13 shown, 6 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 4 edges (avg confidence: 0.95)
- Token cost: 1,500 input · 980 output

## Community Hubs (Navigation)
- Compose UI, Wizard & Grid
- Local Graphify Engine
- Content Classification Engine
- Room DAOs & FTS4 Persistence
- ML Kit Streaming OCR
- Notification Listener & Privacy
- Google Drive Vault Client
- Sync State Machine
- WhatsApp Chat Export Importer
- SHA-256 Deduplication Engine
- Historical Accessibility Crawler
- Drive Deep-Logging Telemetry
- Brand Typography System
- Gradle Wrapper System
- Application Lifecycle & Boot

## God Nodes (most connected - your core abstractions)
1. `ChildProfile` - 21 edges
2. `GoogleDriveClient` - 14 edges
3. `NoticeDao` - 13 edges
4. `NoticeEntity` - 13 edges
5. `ContentCategory` - 13 edges
6. `AttachmentDao` - 11 edges
7. `KidsDatabase` - 11 edges
8. `DeduplicationEngine` - 10 edges
9. `KotlinGraphifyEngine` - 10 edges
10. `ContentClassifier` - 9 edges

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

## Communities (19 total, 6 thin omitted)

### Community 0 - "Compose UI, Wizard & Grid"
Cohesion: 0.07
Nodes (26): KidsDatabase, Context, ChildProfile, MultiChildRouter, ChildCard(), ChildrenGridDashboard(), AppScreen, DASHBOARD (+18 more)

### Community 1 - "Local Graphify Engine"
Cohesion: 0.07
Nodes (15): ContentClassifier, PrivacyFilter, ContentCategory, ATTENDANCE, CIRCULAR, FEES, HOMEWORK, UNKNOWN (+7 more)

### Community 2 - "Content Classification Engine"
Cohesion: 0.09
Nodes (23): AccessibilityEvent, AccessibilityNodeInfo, AccessibilityService, DeduplicationEngine, SyncStatus, DROPPED, FAILED, PENDING (+15 more)

### Community 3 - "Room DAOs & FTS4 Persistence"
Cohesion: 0.10
Nodes (10): ChildProfileDao, NoticeDao, ChildProfileEntity, NoticeEntity, NoticeFtsEntity, entity, Flow, fts4 (+2 more)

### Community 4 - "ML Kit Streaming OCR"
Cohesion: 0.12
Nodes (26): alignment, ProbeItem, DiagnosticFeedScreen(), LogLine, WizardStep, STEP_1_VAULT, STEP_2_CLASSROOM, STEP_3_PORTALS (+18 more)

### Community 5 - "Notification Listener & Privacy"
Cohesion: 0.10
Nodes (18): Converters, ChannelConfig, DriveSyncWorker, DeviceInfo, DiagnosticSnapshot, DriveDeepLogger, PipelineMetrics, StepStatus (+10 more)

### Community 6 - "Google Drive Vault Client"
Cohesion: 0.14
Nodes (14): GraphEdge, GraphNode, KnowledgeGraph, KotlinGraphifyEngine, Attachment, ChannelType, FILE_IMPORT, GOOGLE_CLASSROOM (+6 more)

### Community 7 - "Sync State Machine"
Cohesion: 0.12
Nodes (10): ChildVaultFolders, DriveQuotaInfo, GoogleDriveClient, bytearraycontent, bytearrayoutputstream, drive, filecontent, java (+2 more)

### Community 8 - "WhatsApp Chat Export Importer"
Cohesion: 0.09
Nodes (16): AI-Native Storage (JSONL & Markdown), ImportedNoticeRecord, WhatsAppChatExportParser, WhatsAppChatExportParserTest, Dual WhatsApp Catch-Up Engine, 5-Point Cloud Health Probe, Google Credential Manager API, inputstream (+8 more)

### Community 9 - "SHA-256 Deduplication Engine"
Cohesion: 0.17
Nodes (12): MLKitOcrParser, OcrExtractionResult, Bitmap, inputimage, parcelfiledescriptor, pdfrenderer, resume, resumewithexception (+4 more)

### Community 10 - "Historical Accessibility Crawler"
Cohesion: 0.18
Nodes (10): StatusBarNotification, NotificationParser, ParsedNotification, NotificationParserTest, build, Bundle, every, mockk (+2 more)

### Community 12 - "Brand Typography System"
Cohesion: 0.25
Nodes (7): KidsApplication, BootReceiver, Context, Application, BroadcastReceiver, Intent, log

### Community 13 - "Gradle Wrapper System"
Cohesion: 0.22
Nodes (8): font, fontfamily, fontweight, googlefont, r, sp, textstyle, typography

## Knowledge Gaps
- **28 isolated node(s):** `NoticeFtsEntity`, `PENDING`, `SYNCED`, `FAILED`, `DROPPED` (+23 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 130 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `ChildProfile` connect `Compose UI, Wizard & Grid` to `Local Graphify Engine`, `Content Classification Engine`, `ML Kit Streaming OCR`, `Google Drive Vault Client`?**
  _High betweenness centrality (0.193) - this node is a cross-community bridge._
- **Why does `KidsDatabase` connect `Compose UI, Wizard & Grid` to `Room DAOs & FTS4 Persistence`, `Content Classification Engine`, `Drive Deep-Logging Telemetry`, `Notification Listener & Privacy`?**
  _High betweenness centrality (0.104) - this node is a cross-community bridge._
- **Why does `NoticeEntity` connect `Room DAOs & FTS4 Persistence` to `Compose UI, Wizard & Grid`, `Content Classification Engine`?**
  _High betweenness centrality (0.088) - this node is a cross-community bridge._
- **What connects `NoticeFtsEntity`, `PENDING`, `SYNCED` to the rest of the system?**
  _28 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Compose UI, Wizard & Grid` be split into smaller, more focused modules?**
  _Cohesion score 0.0728744939271255 - nodes in this community are weakly interconnected._
- **Should `Local Graphify Engine` be split into smaller, more focused modules?**
  _Cohesion score 0.07017543859649122 - nodes in this community are weakly interconnected._
- **Should `Content Classification Engine` be split into smaller, more focused modules?**
  _Cohesion score 0.08522727272727272 - nodes in this community are weakly interconnected._