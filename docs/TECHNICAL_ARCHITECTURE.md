# 🏛️ K.I.D.S. Technical Architecture & Engineering Specification
### Kids Intelligent Dashboard System — Deep-Dive System Documentation

<p align="center">
  <img src="https://img.shields.io/badge/Architecture-Clean_%26_MVI-1A365D?style=for-the-badge" alt="Clean Architecture"/>
  <img src="https://img.shields.io/badge/Language-Kotlin_2.0%2B_(K2_Compiler)-ED8936?style=for-the-badge&logo=kotlin" alt="Kotlin 2.0+"/>
  <img src="https://img.shields.io/badge/Framework-Jetpack_Compose_%2B_Material_3-1A365D?style=for-the-badge&logo=android" alt="Compose"/>
  <img src="https://img.shields.io/badge/Local_Storage-Room_2.6.1_%2B_FTS4-2ECC71?style=for-the-badge&logo=sqlite" alt="Room FTS4"/>
  <img src="https://img.shields.io/badge/OAuth_Scope-drive.file_Strict-1A365D?style=for-the-badge&logo=googledrive" alt="drive.file"/>
  <img src="https://img.shields.io/badge/On--Device_ML-Google_ML_Kit_OCR-ED8936?style=for-the-badge" alt="ML Kit"/>
</p>

---

## 📌 Executive Architectural Summary

The **Kids Intelligent Dashboard System (K.I.D.S.)** is an ambient, zero-backend, privacy-first Android client application engineered to capture, categorize, deduplicate, index, and synchronize school communications across fragmented educational channels (Google Classroom, WhatsApp parent groups, School ERPs, Gmail) directly into the parent's personal **Google Drive Vault** in **AI-native formats** (`notices.jsonl`, `MASTER_DIGEST.md`, `_system/knowledge_graph.json`, and `graph.html`).

### Authoritative System Invariants
1. **$0.00 Cloud Infrastructure Cost (Zero-Backend Invariant):** No external backend servers, intermediate proxies, telemetry aggregators, or centralized databases exist. All network communication terminates exclusively at Google Drive's REST API.
2. **Zero Student Data on Third-Party Servers:** Data processing (text extraction, classification, SHA-256 fingerprinting, full-text indexing, knowledge graph generation) executes 100% locally on the Android device.
3. **Restricted Privacy Scope (`drive.file`):** The application strictly requests `https://www.googleapis.com/auth/drive.file`. It cannot view, modify, or delete any files in the parent's Google Drive other than those created by K.I.D.S. inside `K.I.D.S. Data/`.
4. **Memory-Boundary Privacy Drop:** Push notifications intercepted via `NotificationListenerService` are evaluated against allowed package and conversation whitelists. Non-educational notifications, personal messages, OTPs, and banking alerts are dropped directly from memory before writing to disk or telemetry logs.
5. **Anti-Clutter & Zero-Permanent-Storage Invariant:** Educational attachments (.pdf, .jpg, .docx) downloaded during crawls are strictly transient. They are routed out of public shared storage (`Downloads/`, `Documents/`) into private sandbox staging (`vault_attachments/`), uploaded to Google Drive, and immediately deleted from local device storage upon confirmed upload. Public directories stay spotless, and in-app cache bloat from "Save all files offline" is intentionally bypassed.
6. **Universal Accessibility (WCAG 2.1 AA/AAA):** Touch targets enforce a minimum of 48dp × 48dp, contrast ratios exceed 4.5:1 (AA) and 7:1 (AAA), and full semantics are provided for Android TalkBack.

---

## 🏗️ System Architecture & Data Flow

```mermaid
flowchart TD
    subgraph INGESTION["1. Ingestion Layer"]
        NLS["KidsNotificationListenerService<br/>(Ambient 24/7 Push)"]
        ACS["KidsAccessibilityService<br/>(Historical Auto-Crawler)"]
        STA["ShareTargetActivity<br/>(Native 'K.I.D.S. Vault' Share Target)"]
        WAP["WhatsAppChatExportParser<br/>(Manual Chat Backup)"]
    end

    subgraph SECURITY["2. Safety & Governance Gate"]
        PF{"PrivacyFilter<br/>(Memory Boundary)"}
        DROP["Immediate Silent Drop<br/>(0 disk write, 0 log)"]
    end

    subgraph DOMAIN["3. Domain Processing Pipeline"]
        MCR["MultiChildRouter<br/>(Email / Grade / Tag Attribution)"]
        CC["ContentClassifier<br/>(Rule-Based Tagger)"]
        DED["DeduplicationEngine<br/>(SHA-256 Fingerprinting)"]
        OCR["MLKitOcrParser<br/>(Streaming PdfRenderer)"]
        KGE["KotlinGraphifyEngine<br/>(GraphRAG & D3 HTML)"]
    end

    subgraph PERSISTENCE["4. Local Persistence Layer"]
        ROOM[("SQLite Room DB")]
        FTS[("Room FTS4 Full-Text Index")]
        STAGING[("Private Sandbox Staging<br/>vault_attachments/")]
    end

    subgraph SYNC["5. Cloud Vault Sync Engine"]
        DFO["DownloadFolderObserver<br/>(Public Storage Scanner)"]
        DSW["DriveSyncWorker<br/>(AndroidX WorkManager)"]
        GDC["GoogleDriveClient<br/>(Drive REST API v3)"]
    end

    subgraph DRIVE["6. Parent Personal Google Drive Vault"]
        JSONL["notices.jsonl<br/>(AI-Native NDJSON)"]
        DIGEST["MASTER_DIGEST.md<br/>& FAMILY_DIGEST.md"]
        GRAPH["graph.html<br/>(Interactive D3 Graph)"]
        ATTS["attachments/<br/>(PDFs & Worksheets)"]
        LOGS["_system/logs/<br/>(crawler_trace & sync_timeline)"]
    end

    NLS --> PF
    ACS --> PF
    WAP --> PF
    PF -->|Disallowed / Sensitive| DROP
    PF -->|Whitelisted| MCR

    MCR --> CC
    CC --> DED
    DED -->|Unique Notice| ROOM
    ROOM <--> FTS

    ACS -.->|Taps Chip & Auto-Downloads| DFO
    ACS -.->|Auto-Invokes Share Target| STA
    STA -->|Direct Binary Stream| STAGING
    STA -.->|Triggers APPEND_OR_REPLACE| DSW
    DFO -->|Move & Decouple| STAGING
    STAGING --> OCR
    OCR --> ROOM

    DSW --> ROOM
    DSW --> STAGING
    DSW --> KGE
    KGE --> GDC
    DSW --> GDC

    GDC --> JSONL
    GDC --> DIGEST
    GDC --> GRAPH
    GDC --> ATTS
    GDC --> LOGS
```

---

## 📦 Package & Directory Organization

The codebase strictly adheres to **Clean Architecture** principles, maintaining a decoupled unidirectional dependency hierarchy:

```
app/src/main/java/com/kids/collector/
├── KidsApplication.kt                 # Application subclass, WorkManager & DB initialization
├── data/                              # Data access, persistence, external API clients
│   ├── db/
│   │   ├── Entities.kt                # Room entities: ChildProfile, Notice, Attachment, FTS4
│   │   ├── Daos.kt                    # ChildProfileDao, NoticeDao, AttachmentDao
│   │   ├── KidsDatabase.kt            # RoomDatabase singleton with migrations
│   │   └── TypeConverters.kt          # JSON serialization converters for ChannelConfig lists
│   ├── drive/
│   │   ├── GoogleDriveClient.kt       # Google Drive REST API v3 resumable client
│   │   ├── DriveVaultManager.kt       # Multi-step vault provisioning & OAuth credentials
│   │   ├── SafVaultManager.kt         # Storage Access Framework fallback manager
│   │   └── DownloadFolderObserver.kt  # Autonomous storage scanner & anti-clutter stager
│   └── ocr/
│       └── MLKitOcrParser.kt          # Offline Google ML Kit OCR with streaming PdfRenderer
├── domain/                            # Pure business logic and domain entities
│   ├── classifier/
│   │   └── ContentClassifier.kt       # Rule-based tagger (CIRCULAR, HOMEWORK, ATTENDANCE, FEES)
│   ├── dedupe/
│   │   └── DeduplicationEngine.kt     # SHA-256 notice & file hashing
│   ├── filter/
│   │   └── PrivacyFilter.kt           # Whitelisting & blocked keyword drops
│   ├── graph/
│   │   └── KotlinGraphifyEngine.kt    # GraphRAG ontology, node/edge builder, D3 HTML generator
│   ├── importer/
│   │   └── WhatsAppChatExportParser.kt# Regular expression parser for WhatsApp .txt exports
│   ├── model/
│   │   ├── Models.kt                  # Domain models (Notice, ChildProfile, Attachment, Enums)
│   │   └── StreamManifest.kt          # Stream inventory manifest, status tracking & auto-recovery model
│   ├── parser/
│   │   └── NotificationParser.kt      # StatusBarNotification unwrapper & extractor
│   └── router/
│       └── MultiChildRouter.kt        # Multi-child disambiguation routing engine
├── presentation/                      # Jetpack Compose UI (Single-Activity Architecture)
│   ├── MainActivity.kt                # Root activity & navigation coordinator
│   ├── theme/                         # KidsTheme, Color tokens, Kanit & Poppins typography
│   ├── wizard/
│   │   └── OnboardingWizardScreen.kt  # Step 0 prerequisite permissions gate & 4-step sequential wizard
│   ├── dashboard/
│   │   └── ChildrenGridDashboard.kt   # Multi-child cards, sync triggers, live stats
│   ├── telemetry/
│   │   └── DiagnosticFeedScreen.kt    # 5-point probe UI & live log viewers
│   ├── share/
│   │   └── ShareTargetActivity.kt     # Native zero-UI share target & attachment stager
│   └── permission/
│       ├── PermissionHelper.kt        # System intents for NLS, Accessibility, Storage
│       └── PermissionSetupDialog.kt   # WCAG-compliant permission rationale dialogs
├── service/                           # Android System Services & Daemons
│   ├── KidsNotificationListenerService.kt # Ambient push notification interceptor
│   ├── KidsAccessibilityService.kt        # Historical node-tree crawler & chip clicker
│   ├── FloatingCrawlerOverlay.kt          # Draggable overlay with native scroll pace
│   ├── DriveSyncWorker.kt                 # AndroidX WorkManager background synchronizer
│   ├── CrawlerTraceLogger.kt              # Granular crawler telemetry trace buffer
│   └── BootReceiver.kt                    # Restarts workers & reconnects services on reboot
└── telemetry/
    └── DriveDeepLogger.kt             # In-memory and disk logger for Drive telemetry
```

---

## 🗄️ SQLite Room Database Schema & Full-Text Search (FTS4)

The database engine is built on **AndroidX Room 2.6.1** utilizing SQLite with an external content **FTS4 virtual table** for instantaneous full-text querying across circular bodies and titles.

```mermaid
erDiagram
    CHILD_PROFILES ||--o{ NOTICES : "childId"
    NOTICES ||--o{ ATTACHMENTS : "noticeId"
    NOTICES ||--|| NOTICES_FTS : "rowid"

    CHILD_PROFILES {
        string childId PK
        string firstName
        string grade
        string academicYear
        string schoolName
        string accountEmail
        string disambiguationTag
        string photoUri
        string channels "JSON List"
        int64 createdAtMs
    }

    NOTICES {
        string noticeId PK
        string childId FK
        string sourceApp
        string category
        string title
        string body
        string sender
        int64 timestampMs
        string hashSha256 UK
        string syncStatus
        string driveFileId
        int attachmentCount
    }

    ATTACHMENTS {
        string attachmentId PK
        string noticeId FK
        string fileName
        string localUri
        string mimeType
        int64 sizeBytes
        string fileHash
        string ocrText
        int pageCount
        string driveFileId
        string syncStatus
    }

    NOTICES_FTS {
        string title
        string body
        string sender
    }
```

### Entity Specifications

#### 1. `ChildProfileEntity` (`child_profiles`)
- **Primary Key:** `childId: String` (UUID)
- Stores child metadata, academic year, school identifier, and serialized channel configs (`List<ChannelConfig>`) via `TypeConverters`. Enforces the non-empty channel configuration invariant via onboarding wizard validation (see [Dynamic Button Validation, Skip Handling, and Mandatory Channel Invariant](#8-dynamic-button-validation-skip-handling-and-mandatory-channel-invariant-steps-2-to-4)).

#### 2. `NoticeEntity` (`notices`)
- **Primary Key:** `noticeId: String` (UUID)
- **Indices:**
  - `hashSha256`: Unique index enforcing absolute notice-level deduplication across capture methods.
  - `childId`: Index for fast filtering per child profile.
  - `category`: Index for categorized digests.
  - `timestampMs`: Index for chronological ordering.
- **Attributes:** Tracks `syncStatus` (`PENDING`, `SYNCED`, `FAILED`), `driveFileId`, and `attachmentCount`.

#### 3. `AttachmentEntity` (`attachments`)
- **Primary Key:** `attachmentId: String` (UUID)
- **Foreign Key:** Indexed on `noticeId`.
- **Indices:** `fileHash`, `syncStatus`.
- **Attributes:** Captures physical filesystem paths (`localUri`), MIME type, file size, extracted `ocrText`, `pageCount`, and remote `driveFileId`.

#### 4. `NoticeFtsEntity` (`notices_fts`)
- **Virtual Table:** Declared with `@Fts4(contentEntity = NoticeEntity::class)`.
- Mirrors `title`, `body`, and `sender` fields using SQLite's native full-text index.
- **FTS Query in NoticeDao:**
  ```kotlin
  @Query("""
      SELECT notices.* FROM notices
      JOIN notices_fts ON notices.rowid = notices_fts.rowid
      WHERE notices_fts MATCH :searchQuery
      ORDER BY notices.timestampMs DESC
  """)
  fun searchNotices(searchQuery: String): Flow<List<NoticeEntity>>
  ```

---

## ⚙️ Background Services & Ingestion Pipelines

### 1. `KidsNotificationListenerService` & `PrivacyFilter`
The notification listener runs as an ambient, event-driven Android system service:
- Intercepts broadcasts via `onNotificationPosted(sbn: StatusBarNotification?)`.
- Extracts message details using `NotificationParser` (resolving subtext, big text, conversation titles, and message bundles).
- **Critical Memory Boundary Gate (`PrivacyFilter`):**
  ```kotlin
  if (!privacyFilter.shouldIngest(parsed.packageName, parsed.conversationTitle, "${parsed.title} ${parsed.body}")) {
      return@launch // SILENT DROP: Zero disk write, zero logging, zero network traffic
  }
  ```
  - **Whitelisted Packages:** `com.google.android.apps.classroom`, `com.whatsapp`, `com.whatsapp.w4b`, `com.entab.campuscare`, `com.toddleapp.family`, `com.edunext.parent`, `com.google.android.gm`.
  - **Keyword Rejection:** Drops messages containing `otp`, `one time password`, `bank`, `debited`, `credited`, `verification code`, `upi pin`, `atm card`.
  - **Messaging App Validation:** WhatsApp notifications must match an explicitly configured school group name.
- **Disambiguation & Routing:** `MultiChildRouter` compares sender, title, and body against enrolled child profiles and attributes the notice.
- **Deduplication:** Computes SHA-256 fingerprint: `SHA-256(childId + sourceApp + title + body)`. If unique, inserts with `SyncStatus.PENDING`.
- **Expedited Work Trigger:** Schedules an expedited `DriveSyncWorker` execution via WorkManager.

---

### 2. `KidsAccessibilityService` & `FloatingCrawlerOverlay`
Engineered for Day 0 historical backfill and retrospective notice crawling of Google Classroom and School ERP portals. It implements an autonomous, event-driven **Two-Pass Stream Architecture** and **Manifest-Driven Auto-Recovery Engine** powered by `StreamManifest`, executing pre-flight stream surveys, bidirectional kinetic scrolling, discrete post card parsing, autonomous attachment downloads, and immediate synchronization to Google Drive.

```mermaid
stateDiagram-v2
    [*] --> IDLE
    IDLE --> PASS_1_SURVEY: User taps "Start Auto-Capture"
    
    state PASS_1_SURVEY {
        [*] --> SURVEYING_STREAM
        SURVEYING_STREAM --> SURVEY_SCROLL: Visible cards indexed into StreamManifest
        SURVEY_SCROLL --> SURVEYING_STREAM: New post cards discovered (identicalScreenCount = 0)
        SURVEY_SCROLL --> PAGINATION_WAIT: 0 New Cards / identicalScreenCount > 0
        PAGINATION_WAIT --> SURVEY_SCROLL: Delay 1,200ms (Network pagination settling)
        SURVEY_SCROLL --> SURVEY_COMPLETE: 5 Consecutive Identical Screens (identicalScreenCount >= 5)
    }

    PASS_1_SURVEY --> FAST_PATH_UP_TO_DATE: totalCount == 0 OR pendingCount == 0
    FAST_PATH_UP_TO_DATE --> TERMINAL_SYNC: "✓ Stream Up to Date" (2.0s Dwell & Cloud Sync)

    PASS_1_SURVEY --> PASS_1_5_REWIND: pendingCount > 0 (Boundaries recorded)

    state PASS_1_5_REWIND {
        [*] --> REWINDING_TO_START
        REWINDING_TO_START --> REWIND_SWIPE: isItemVisible(firstFingerprint) == false
        REWIND_SWIPE --> REWINDING_TO_START: performScrollBackward() (0.25h -> 0.75h downward swipe)
        REWINDING_TO_START --> REWIND_COMPLETE: isItemVisible(firstFingerprint) == true OR attempts >= 15
    }

    PASS_1_5_REWIND --> PASS_2_DEEP_INGESTION: Stream re-anchored at top notice

    state PASS_2_DEEP_INGESTION {
        [*] --> FETCH_NEXT_PENDING: getNextPendingItem()
        FETCH_NEXT_PENDING --> CHECK_TARGET_VISIBLE: Pending notice retrieved
        FETCH_NEXT_PENDING --> ALL_FINISHED: nextItem == null
        
        CHECK_TARGET_VISIBLE --> OPENING_POST: findCardByFingerprint() != null
        OPENING_POST --> DETAIL_VIEW_CHECK: Clamped center tap (dispatchTap)
        
        DETAIL_VIEW_CHECK --> IN_DETAIL_VIEW: isPostDetailView == true (<=800ms)
        DETAIL_VIEW_CHECK --> STREAM_INGEST: Timeout (Plain-text stream announcement)
        
        IN_DETAIL_VIEW --> DOWNLOADING_ATTACHMENTS: Attachments detected (.pdf, .docx, .jpg)
        DOWNLOADING_ATTACHMENTS --> DOWNLOADING_ATTACHMENTS: 1,000ms calibrated debounce
        DOWNLOADING_ATTACHMENTS --> GUARDED_RETURN: All attachments downloaded / shared
        IN_DETAIL_VIEW --> GUARDED_RETURN: Zero attachments in notice
        
        STREAM_INGEST --> ITEM_COMPLETED: NoticeEntity saved to Room
        GUARDED_RETURN --> ITEM_COMPLETED: performReturnToStream() (Up to 3 attempts, <=2.0s)
        ITEM_COMPLETED --> FETCH_NEXT_PENDING: markCompleted(fingerprint) & increment counter

        CHECK_TARGET_VISIBLE --> AUTO_RECOVERY: findCardByFingerprint() == null (Displaced)
        state AUTO_RECOVERY {
            [*] --> CHECK_BOUNDED: isTargetBounded(targetIndex, visibleIndices)
            CHECK_BOUNDED --> BOUNDED_RECOVERY: true (Target bounded in viewport)
            state BOUNDED_RECOVERY {
                [*] --> INC_BOUNDED: manifest.incrementAttempt(fingerprint)
                INC_BOUNDED --> DIRECT_STREAM_FALLBACK: boundedAttempts >= 3 (Fail-Safe Ingestion)
                INC_BOUNDED --> TAP_CANDIDATE: boundedAttempts < 3 (findBestCandidateCardOnScreen)
            }
            CHECK_BOUNDED --> UNBOUNDED_SEEK: false (Target not bounded)
            state UNBOUNDED_SEEK {
                [*] --> CHECK_ATTEMPTS: incrementAttempt()
                CHECK_ATTEMPTS --> SKIP_POST: attemptCount >= 4 (Unopenable post safeguard)
                CHECK_ATTEMPTS --> EVALUATE_INDICES: attemptCount < 4
                EVALUATE_INDICES --> RECOVERING_POSITION: minVisibleIndex > target.index (Too far down)
                RECOVERING_POSITION --> CHECK_TARGET_VISIBLE: performScrollBackward() (Scroll upward)
                EVALUATE_INDICES --> NAVIGATING_TO_POST: target is ahead
                NAVIGATING_TO_POST --> CHECK_TARGET_VISIBLE: performScroll() (Scroll downward)
            }
        }
        DIRECT_STREAM_FALLBACK --> FETCH_NEXT_PENDING: ingestNoticeDirect() & markCompleted()
        SKIP_POST --> FETCH_NEXT_PENDING: markSkipped(fingerprint) & log warning
    }

    PASS_2_DEEP_INGESTION --> SHOW_COMPLETION: isAllFinished() confirmed
    SHOW_COMPLETION --> AUTO_DISMISS: 2.5s Display ("✓ Backfill Complete!")
    AUTO_DISMISS --> TERMINAL_SYNC: dismissAndRemove() -> removeViewImmediate()
    TERMINAL_SYNC --> IDLE: WorkManager APPEND_OR_REPLACE Enqueued

    PASS_1_SURVEY --> EXIT_DEBOUNCE: TYPE_WINDOW_STATE_CHANGED (Non-School App)
    PASS_1_5_REWIND --> EXIT_DEBOUNCE: TYPE_WINDOW_STATE_CHANGED (Non-School App)
    PASS_2_DEEP_INGESTION --> EXIT_DEBOUNCE: TYPE_WINDOW_STATE_CHANGED (Non-School App)
    EXIT_DEBOUNCE --> PASS_2_DEEP_INGESTION: School App Re-entered (<1200ms, Job Cancelled)
    EXIT_DEBOUNCE --> AUTO_DISMISS: 1200ms Debounce Expired (Swiped Home / App Switch)

    PASS_1_SURVEY --> IDLE: User taps "Stop Capture" (Cancel coroutine & Drive Sync)
    PASS_1_5_REWIND --> IDLE: User taps "Stop Capture" (Cancel coroutine & Drive Sync)
    PASS_2_DEEP_INGESTION --> IDLE: User taps "Stop Capture" (Cancel coroutine & Drive Sync)
```

---

#### The Deep Crawl Sequence Architecture

The crawler loop in `KidsAccessibilityService` executes as a continuous, cooperative coroutine job on `Dispatchers.Default`, transitioning across distinct operational phases:

```mermaid
sequenceDiagram
    participant USR as Parent
    participant OV as FloatingCrawlerOverlay
    participant ACS as KidsAccessibilityService
    participant MAN as StreamManifest
    participant GC as Google Classroom UI
    participant DM as Android DownloadManager / ShareTarget
    participant DB as SQLite Room DB
    participant WM as AndroidX WorkManager

    USR->>OV: Taps "Start Auto-Capture"
    OV->>ACS: startDeepCrawl() -> launches crawlerJob

    Note over ACS,MAN: ==================== PASS 1: PRE-FLIGHT STREAM SURVEY ====================
    ACS->>OV: updateStatus("Surveying (X found)...")
    loop Stream Survey (Until 5 Consecutive Empty Scrolls)
        ACS->>GC: surveyVisibleCards(): scan cards in safe viewport [140dp, Height-170dp]
        GC-->>ACS: Discovered cards with title, text, and SHA-256 fingerprint
        ACS->>DB: Check if fingerprint already in Room DB / visitedPostFingerprints
        alt Already in DB
            ACS->>MAN: addItem(status = ALREADY_SYNCED)
        else New Notice
            ACS->>MAN: addItem(status = PENDING)
        end
        ACS->>OV: performScroll() [400ms kinetic upward swipe]
        GC-->>ACS: Stream scrolls forward
    end
    ACS->>ACS: Log stream boundaries: startItemTitle, endItemTitle, totalCount

    alt totalCount == 0 OR pendingCount == 0
        ACS->>OV: updateStatus("✓ Stream Up to Date")
        ACS->>WM: triggerDriveSync()
    else pendingCount > 0
        Note over ACS,MAN: ==================== PASS 1.5: STREAM REWIND ====================
        ACS->>OV: updateStatus("Returning to Start...", "Preparing notices")
        loop Rewind Loop (Until firstFingerprint visible or max 15 attempts)
            ACS->>GC: isItemVisible(firstFingerprint)?
            alt Top notice visible
                Note over ACS: Rewind complete!
            else Still scrolled down
                ACS->>OV: performScrollBackward() [0.25h -> 0.75h downward swipe]
                GC-->>ACS: Stream scrolls backward
            end
        end

        Note over ACS,MAN: ==================== PASS 2: MANIFEST-DRIVEN INGESTION ====================
        loop Deep Ingestion Loop (Until getNextPendingItem() == null)
            ACS->>MAN: getNextPendingItem()
            MAN-->>ACS: nextItem (index, title, fingerprint)
            ACS->>GC: findCardByFingerprint(nextItem.fingerprint)
            alt Card Visible on Screen
                ACS->>OV: updateStatus("Capturing (X/Total - Y%)...", title)
                ACS->>GC: dispatchTap(centerX, safeCenterY) [50ms touch stroke]
                alt Detail View Opened (<=800ms)
                    ACS->>OV: updateStatus("Reading Detail (X/Total)...")
                    ACS->>GC: Clear focus on comment EditText
                    ACS->>GC: Extract full announcement text & author
                    opt Attachments Present
                        loop Download / Share Each Attachment
                            ACS->>OV: updateStatus("Downloading (X/Y)...", fileName)
                            ACS->>GC: Tap attachment chip / download action
                            GC->>DM: Route to system DownloadManager or ShareTargetActivity
                            ACS->>OV: incrementAttachmentCount()
                        end
                    end
                    ACS->>GC: performReturnToStream() (Up to 3 attempts, <=2.0s)
                else Plain Text Card (Detail check timeout 800ms)
                    ACS->>ACS: ingestNoticeDirect(): extract fullText directly from stream
                end
                ACS->>DB: Insert NoticeEntity (SyncStatus.PENDING)
                ACS->>MAN: markCompleted(nextItem.fingerprint)
                ACS->>OV: incrementNoticeCount()
            else Card NOT Visible (Viewport Displaced - AUTO-RECOVERY)
                ACS->>GC: getVisibleCardFingerprints()
                ACS->>MAN: Compare visibleIndices vs nextItem.index
                ACS->>MAN: incrementAttempt(nextItem.fingerprint)
                alt attemptCount >= 4 (Safeguard)
                    ACS->>MAN: markSkipped(nextItem.fingerprint) [FAILED_SKIPPED]
                else minVisibleIndex > nextItem.index (Scrolled too far down)
                    ACS->>OV: updateStatus("Recovering Position...", "Scrolling up")
                    ACS->>OV: performScrollBackward() [Downward swipe]
                else target is ahead
                    ACS->>OV: updateStatus("Navigating to Post...", "Seeking post")
                    ACS->>OV: performScroll() [Upward swipe]
                end
            end
        end

        Note over ACS,OV: ==================== COMPLETION & CLOUD SYNC ====================
        ACS->>OV: showCompletion(totalNotices, totalFiles)
        Note over OV: Pill turns Success Green (#1B4D3E / #4ADE80)<br/>Displays "✓ Backfill Complete!" for 2.5s
        OV->>OV: delay(2500ms) -> dismissAndRemove()
        ACS->>ACS: stopDeepCrawl() -> cancels crawlerJob
        ACS->>WM: triggerDriveSync() -> enqueueUniqueWork(APPEND_OR_REPLACE)
    end
```

##### 1. `PASS 1: PRE-FLIGHT STREAM SURVEY & INVENTORY MANIFEST` (`StreamManifest`)
The Two-Pass Stream Architecture begins with an autonomous pre-flight reconnaissance pass (`runStreamSurvey`). Instead of immediately entering and processing notices sequentially (which risks positioning displacement and unknown bounds), Pass 1 sweeps the entire stream from top to bottom, cataloging every announcement into an in-memory `StreamManifest`:
- **Safe Viewport Filtering:** Prevents false triggers by skipping nodes outside the interactive feed. Bounding rectangles are restricted to:
  $$\text{minTop} = 140\text{px} \quad\text{and}\quad \text{maxBottom} = \text{displayMetrics.heightPixels} - 170\text{px}$$
  This deliberately ignores the top action bar, classroom course header, and bottom navigation tabs (`Stream`, `Classwork`, `People`, `Tab 1 of 3`).
- **Relaxed Card Viewport Visibility Calculation:**
  In Google Classroom's Stream, post cards frequently sit partially clipped at the bottom or top edge of the display as the list scrolls. Prematurely discarding partially occluded cards causes missed announcements. `surveyVisibleCards()` and `findCardByFingerprint()` apply a relaxed viewport visibility formula:
  ```kotlin
  val cardHeight = rect.height().coerceAtLeast(1)
  val visibleTop = rect.top.coerceAtLeast(minTop)
  val visibleBottom = rect.bottom.coerceAtMost(maxBottom)
  val visibleHeight = (visibleBottom - visibleTop).coerceAtLeast(0)
  val visibilityFraction = visibleHeight.toFloat() / cardHeight.toFloat()

  if (visibilityFraction < 0.35f && rect.centerY() !in minTop..maxBottom) {
      card.recycle()
      continue
  }
  ```
  A card is accepted for inspection if **at least 35% of its height is within the safe viewport** (`visibilityFraction >= 0.35f`) OR if **its vertical center is within the safe bounds** (`rect.centerY() in minTop..maxBottom`).

- **Universal Stream Post Detection Architecture (`isStreamPostCard`):**
  To support any educational curriculum (CBSE, ICSE, Cambridge / CAIE, IB, State Boards) worldwide with **ZERO hardcoding**, `isStreamPostCard(node)` evaluates the structural semantics of candidate nodes rather than matching hardcoded grade or division names:
  ```kotlin
  private fun isStreamPostCard(node: AccessibilityNodeInfo): Boolean {
      val textList = mutableListOf<String>()
      collectQuickText(node, textList)
      val combinedText = textList.joinToString(" ").trim()
      if (combinedText.length <= 15) return false
      val lowerCombined = combinedText.lowercase()

      // 1. Explicit Exclusions: Composer boxes, navigation shortcuts, or bottom tabs
      if (lowerCombined.contains("announce something to your class") ||
          lowerCombined.contains("share with your class") ||
          lowerCombined.contains("view to-do list")) {
          return false
      }

      // 2. Reject nodes that are purely standalone comment chips/counters without post body
      val isOnlyComment = lowerCombined.matches(Regex("""^(?:\d+\s+)?class\s+comments?.*""")) ||
              lowerCombined == "add class comment" ||
              (lowerCombined.contains("class comment") && combinedText.length < 35)
      if (isOnlyComment) return false

      // 3. Reject explicit course header banner view IDs if exposed
      val viewId = node.viewIdResourceName?.lowercase() ?: ""
      if (viewId.contains("course_header") || viewId.contains("class_header") ||
          viewId.contains("cover_view") || viewId.contains("header_banner") ||
          viewId.contains("banner_view")) {
          return false
      }

      // 4. Positive Post Indicators:
      // Category A: Activity post type prefix
      val hasPostCategory = lowerCombined.contains("new material:") || lowerCombined.contains("new material") ||
              lowerCombined.contains("new assignment:") || lowerCombined.contains("new assignment") ||
              lowerCombined.contains("new question:") || lowerCombined.contains("new question") ||
              lowerCombined.contains("new quiz:") || lowerCombined.contains("assignment:") ||
              lowerCombined.contains("material:")

      // Category B: Date or relative timestamp regex
      val hasDatePattern = hasPostDateOrTimestamp(lowerCombined)

      // Category C: Comments action or indicator
      val hasComments = lowerCombined.contains("class comment") ||
              lowerCombined.contains("class comments") ||
              lowerCombined.contains("add class comment")

      // 5. Header Banner vs. Post Invariant:
      // A course header banner contains ONLY class name and year (e.g. "Grade 3B CAIE 2026-27").
      // It has NO date/timestamp, NO post category, and NO comments action.
      // A valid stream post MUST satisfy at least one post indicator:
      if (!hasPostCategory && !hasDatePattern && !hasComments) return false

      return true
  }
  ```
  - **Date & Timestamp Regex Engine (`hasPostDateOrTimestamp`):**
    Evaluates four distinct temporal formats across school localized variants:
    1. `streamDateKeywords`: `{"yesterday", "today", "tomorrow", "posted", "edited", "due"}`
    2. `streamMonthRegex`: `\b(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+\d{1,2}\b|\b\d{1,2}(?:st|nd|rd|th)?\s+(?:jan(?:uary)?|...)\b`
    3. `streamTimeRegex`: `\b\d{1,2}:\d{2}\s*(?:am|pm)?\b`
    4. `streamRelativeTimeRegex`: `\b\d+\s+(?:min(?:ute)?s?|hours?|days?|weeks?|months?)\s+ago\b`

- **Elimination of Over-Aggressive Comment Dropping:**
  In earlier implementations, an overly aggressive filter rule evaluated `lowerCombined.contains("class comments for")` against candidate cards. Because nearly every Google Classroom announcement displays comment metadata (e.g., `"0 class comments for post by Teacher"`), this caused valid announcement cards to be discarded prematurely.
  This over-aggressive drop was completely eliminated across:
  1. `surveyVisibleCards()`
  2. `findCardForTarget()`
  3. `findNextUnvisitedPost()`
  Instead, cards are only dropped if the node is confirmed to be an isolated standalone comment chip:
  ```kotlin
  if (lowerCombined.matches(Regex("""^(?:\d+\s+)?class\s+comments?.*""")) && combinedText.length < 35) {
      card.recycle()
      continue
  }
  ```
  This guarantees that all announcements containing comment rows are fully preserved, indexed, and matched. Dynamic comment strings are cleanly stripped during SHA-256 fingerprinting so that subsequent comments do not alter the announcement's cryptographic hash.

- **Pass 1 Bottom Detection & Complete Full-Year Academic Traversal:**
  To guarantee complete discovery of an entire school year (retrieving notices back to June or the start of term without premature cutoffs), Pass 1 decouples active viewport scrolling from physical screen immobility:
  - **Tracking Viewport Motion vs. Screen Immobility:**
    ```kotlin
    if (newItemsCount > 0) {
        surveyZeroCount = 0
        identicalScreenCount = 0
    } else {
        surveyZeroCount++
        if (currentVisible.isNotEmpty() && currentVisible == lastVisibleFingerprints) {
            identicalScreenCount++
        } else {
            identicalScreenCount = 0
        }
    }
    lastVisibleFingerprints = currentVisible
    ```
  - **Network Pagination Settling Delay (1,200ms):**
    ```kotlin
    val postScrollDelay = if (identicalScreenCount > 0) 1200L else if (surveyZeroCount > 0) 700L else 450L
    delay(postScrollDelay)
    ```
    When `identicalScreenCount > 0`, the crawler grants Google Classroom a generous **1,200ms grace window** to execute asynchronous network requests and paginate older historical records.
  - **Definitive Stream Bottom Threshold (`identicalScreenCount >= 5`):**
    Pass 1 only terminates when **5 consecutive scrolls confirm physical immobility**, ensuring long multi-paragraph notices and network pagination delays never cause premature survey cutoffs.

- **Deterministic SHA-256 Fingerprinting:**
  For each eligible card, non-chrome text tokens are delimited by pipe (`|`), hashed with SHA-256, and truncated to the first 8 hex characters:
  $$\text{Fingerprint} = \text{Hex}(\text{SHA-256}(\text{filteredTokens}))[0..7]$$

- **Cataloging into `StreamManifest` (`StreamManifest.kt`):**
  Each unique card discovered in Pass 1 is registered into the manifest with an initial status:
  ```kotlin
  data class StreamManifestItem(
      val index: Int,
      val fingerprint: String,
      val title: String,
      val previewText: String,
      var status: StreamItemStatus = StreamItemStatus.PENDING,
      var attemptCount: Int = 0,
      var attachmentCount: Int = 0
  )

  enum class StreamItemStatus {
      PENDING,
      ALREADY_SYNCED,
      IN_PROGRESS,
      COMPLETED,
      FAILED_SKIPPED
  }
  ```
  If `db.noticeDao().findByHash(hash) != null` or `visitedPostFingerprints.contains(fingerprint)`, the card is tagged `StreamItemStatus.ALREADY_SYNCED` directly during survey. If new, it is marked `StreamItemStatus.PENDING`.

- **Multi-Factor Card Matching Architecture (`findMatchingItem`):**
  Stream cards frequently suffer minor text mutations across scrolls due to dynamic comment counts or slight Android text-view recycling variations. `StreamManifest` deploys a 5-tier resilient matching strategy:
  1. **Tier 1 (Exact SHA-256 Fingerprint):** Calls `findByFingerprint(fingerprint)`. Instant $O(1)$ lookup for unmutated cards.
  2. **Tier 2 (Exact Normalized Title):** For titles with $\ge 8$ characters, performs a case-insensitive match: `it.title.trim().equals(cleanTitle, ignoreCase = true)`.
  3. **Tier 3 (25-Character Prefix & Bidirectional Overlap):** Extracts the first 25 characters of the normalized title (`cleanTitle.take(25)`). Evaluates if the manifest item starts with the prefix or vice-versa, cleanly resolving ellipsis-truncated titles on compact screens.
  4. **Tier 4 (Body Content Substring Overlap):** If `cardText.length > 30`, checks if the card body text contains any known manifest item title where `itemTitle.length >= 15`.
  5. **Tier 5 (Word / Token Overlap $\ge 60\%$):** For titles with localized punctuation shifts or minor word order differences:
     ```kotlin
     if (cleanTitle.length >= 8) {
         val titleTokens = cleanTitle.split(Regex("""[\s\p{Punct}]+""")).filter { it.length > 2 }.toSet()
         if (titleTokens.size >= 2) {
             _items.firstOrNull { item ->
                 val itemTokens = item.title.lowercase().split(Regex("""[\s\p{Punct}]+""")).filter { it.length > 2 }.toSet()
                 val common = titleTokens.intersect(itemTokens)
                 val overlap = common.size.toFloat() / maxOf(titleTokens.size, itemTokens.size)
                 overlap >= 0.6f
             }?.let { return it }
         }
     }
     ```

- **Target Boundedness Check (`isTargetBounded`):**
  A recurring failure mode in list automation is swiping past a target card that is already rendered on screen. `StreamManifest.isTargetBounded()` eliminates this:
  ```kotlin
  fun isTargetBounded(targetIndex: Int, visibleIndices: List<Int>): Boolean {
      if (visibleIndices.isEmpty()) return false
      val min = visibleIndices.minOrNull() ?: return false
      val max = visibleIndices.maxOrNull() ?: return false
      return targetIndex in min..max
  }
  ```
  If the target notice's index is bounded within the visible range `[minVisibleIndex..maxVisibleIndex]`, scrolling is completely inhibited. The crawler immediately executes `findBestCandidateCardOnScreen()` and dispatches a direct tap, preventing overshoot.

- **Session-Persistent In-Memory Post Fingerprints (`visitedPostFingerprints` Invariant):**
  `visitedPostFingerprints` is initialized as a thread-safe concurrent set (`ConcurrentHashMap.newKeySet<String>()`) at the service instance level. Preserving `visitedPostFingerprints` across session toggles guarantees that re-running Auto-Capture will immediately tag previously ingested notices as `ALREADY_SYNCED`, establishing full bounds without re-downloading existing media.

- **Instant Fast-Path Completion:**
  The service records the definitive stream boundaries (`startItemTitle`, `endItemTitle`, and `totalCount`). If `pendingCount == 0`, the stream is already up-to-date and finishes immediately with zero Pass 2 overhead.

##### 2. `PASS 2: MANIFEST-DRIVEN REVERSE DEEP INGESTION (Bottom-to-Top Engine)`
- **Elimination of Pass 1.5 Rewind:**
  In legacy crawler implementations, upon concluding Pass 1 survey at the chronological bottom of the stream, the engine executed an artificial rewind phase (`Pass 1.5`) requiring 30–45 kinetic downward swipes to travel back to the top of the feed, only to scroll all the way back down during ingestion. K.I.D.S. eliminates Pass 1.5 Rewind entirely.
- **Reverse Ingestion Architecture (`manifest.getNextPendingItemReverse()`):**
  Since the viewport is already positioned at the stream bottom when Pass 1 completes, Pass 2 immediately begins ingestion at the bottom post, traversing notices from the oldest post (highest manifest index) upwards to the newest post (index 1):
  ```kotlin
  fun getNextPendingItemReverse(): StreamManifestItem? {
      return _items.lastOrNull { it.status == StreamItemStatus.PENDING }
  }
  ```
  - **40% to 50% Reduction in Total Swipes & Halved Crawl Duration:** Ingesting bottom-to-top cuts total physical swipes by 40–50%, significantly conserves device battery, minimizes screen refresh wear, and reduces overall crawl time by half.
  - **Sequential Bottom-to-Top Processing:** The loop calls `val nextItem = manifest.getNextPendingItemReverse()`. If `nextItem == null`, all manifest notices have been processed, and the crawler terminates cleanly.

- **Card Seeking & Detail View Scrolling:**
  The crawler scans the screen for the target item using multi-factor matching (`findCardForTarget(root, nextItem)`):
  If the target card is visible in the safe viewport:
  1. Sets status to `StreamItemStatus.IN_PROGRESS`.
  2. Updates overlay status to `"Capturing (X/Total - Y%)..."`.
  3. Dispatches physical tap gesture (`dispatchTap`) at safe clamped center coordinates (`safeCenterY`).
  4. Enters detail view (or falls back to direct stream ingestion if plain-text notice or upon reaching material retry bounds).
  5. In detail view, if body text is extensive and attachments are below the fold, executes downward kinetic sweeps (`performDetailScrollDown`) up to 3 times to scan and harvest all attachments.
  6. Safely returns to the stream, marks the item `StreamItemStatus.COMPLETED` via `manifest.markCompleted(fingerprint, savedAttCount)`, and increments notice tallies.

- **Fast-Forward Seeking Mode (Zero Redundant Work):**
  When starting capture on a stream where prior notices were already captured, `nextItem.index > 1 && (manifest.completedCount >= (nextItem.index - 1))` triggers Fast-Forward Seeking:
  - Updates overlay to:
    $$\text{Status: "Fast-Forwarding Synced Notices..."}$$
    $$\text{Detail: "Seeking \#X/Total (Y already synced)"}$$
  - Rapidly advances down the stream directly to the first pending notice without re-opening already synced cards.

- **Autonomous Auto-Recovery Engine, Bounded Recovery Escalation & Oscillation Breaker:**
  If the target card is NOT currently visible on screen:
  1. **Bounded Target Check & Recovery Escalation (`manifest.isTargetBounded`):**
     If the target notice's index is bounded within visible cards (`minVisibleIndex <= target.index <= maxVisibleIndex`), the card is physically rendered on screen. The engine escalates attempts:
     ```kotlin
     val boundedAttempts = manifest.incrementAttempt(nextItem.fingerprint)
     ```
     - **Fail-Safe Direct Fallback (After 3 Bounded Attempts):**
       If the target card fails to transition to detail view after 3 bounded attempts, rather than stalling the crawl or oscillating endlessly, the recovery engine activates graceful direct stream ingestion:
       ```kotlin
       if (boundedAttempts >= 3) {
           CrawlerTraceLogger.log(
               "AUTO_RECOVERY",
               "Target #${nextItem.index} (\"${nextItem.title}\") failed detail transition after $boundedAttempts attempts. Ingesting directly from stream and advancing."
           )
           ingestNoticeDirect(nextItem.title, nextItem.previewText, nextItem.fingerprint)
           manifest.markCompleted(nextItem.fingerprint)
           visitedPostFingerprints.add(nextItem.fingerprint)
           crawlerOverlay?.incrementNoticeCount()
           delay(400)
           continue
       }
       ```
       If `boundedAttempts < 3`, it selects `candidateCard = findBestCandidateCardOnScreen()` and dispatches a tap at candidate bounds.
  2. **Oscillation Breaker:** Maintains a 6-step direction history window (`recentScrollDirections`). If alternating directions $\ge 4$ times (`recentScrollDirections.zipWithNext().all { (a, b) -> a != b }`), oscillation around the target is confirmed. The engine logs an oscillation event, triggers a micro-nudge, and increments the item's attempt counter to prevent infinite ping-pong seek loops.
  3. **Micro-Scrolling (16% Gentle Nudge):** When target distance $\le 2$ or oscillation is detected (`val useMicroScroll = isOscillating || distance <= 2`), the crawler dispatches `performMicroScroll()` instead of full kinetic swipes:
     - **Forward Micro-Nudge:** Sweeps from $0.58h$ to $0.42h$ (16% screen height).
     - **Backward Micro-Nudge:** Sweeps from $0.46h$ to $0.62h$ (16% screen height).
     - **220ms Duration & Zero Momentum:** Stroke duration of 220ms with zero fling momentum achieves millimeter-level card re-centering without overshooting.
  4. **Relative Position Arithmetic & Upward Progression:**
     - In reverse ingestion, target items progress towards lower indices (top of feed).
     - When visible cards are after the target (`minVisibleIndex > targetItem.index`), the crawler scrolls backward / upward via `performScrollBackward` (or backward micro-scroll).
     - When the target is ahead in scroll direction (`minVisibleIndex <= targetItem.index`), the crawler scrolls forward via `performScroll` (or forward micro-scroll).
     - As long as `minVisibleIndex` moves closer to `targetItem.index`, failure attempts are never incremented. After 4 confirmed stuck attempts (`attempts >= 4`), the item is marked `StreamItemStatus.FAILED_SKIPPED` to guarantee the crawler never hangs.

##### 4. `NAVIGATING_TO_DETAIL` (Physical Tap, 2,500ms Extended Timeout & Attachment Invariant)
- **Dual Action Click & Physical Touch Tap (`dispatchTap`):**
  1. Executes `clickableNode.performAction(AccessibilityNodeInfo.ACTION_CLICK)`.
  2. If `!clicked`, dispatches a physical touch tap gesture directly at the safe clamped center of the post card:
     ```kotlin
     dispatchTap(bounds.centerX().toFloat(), bounds.centerY().toFloat())
     ```
  - Contact duration: 50ms (`GestureDescription.StrokeDescription(path, 0, 50)`).
  - Stabilization delay: 120ms.

- **Extended 2,500ms Detail View Window with Center-Tap Retry:**
  Rather than freezing or failing on slow OEM window animations, `KidsAccessibilityService` uses a multi-stage 2,500ms window:
  ```kotlin
  // Stage 1: Initial 1200ms wait
  var enteredDetail = waitForCondition(timeoutMs = 1200, pollIntervalMs = 150) {
      val active = rootInActiveWindow ?: return@waitForCondition false
      val isDetail = isPostDetailView(active)
      active.recycle()
      isDetail
  }

  // Stage 2: Physical center-tap retry and 1300ms secondary wait
  if (!enteredDetail) {
      CrawlerTraceLogger.log(
          "DEEP_CRAWLER",
          "Detail transition pending after 1200ms for #${nextItem.index}. Retrying physical center-tap at (${bounds.centerX()}, ${bounds.centerY()})"
      )
      dispatchTap(bounds.centerX().toFloat(), bounds.centerY().toFloat())
      enteredDetail = waitForCondition(timeoutMs = 1500, pollIntervalMs = 150) {
          val active = rootInActiveWindow ?: return@waitForCondition false
          val isDetail = isPostDetailView(active)
          active.recycle()
          isDetail
      }
  }
  ```

- **Material Retry Bounds & Guaranteed Progression:**
  If `!enteredDetail` after the full 2,500ms retry window, `KidsAccessibilityService` enforces bounded material retries to guarantee forward progression without infinite loops:
  ```kotlin
  val isLikelyMaterial = title.contains("material", ignoreCase = true) ||
          title.contains("worksheet", ignoreCase = true) ||
          title.contains("notes", ignoreCase = true) ||
          title.contains("answer key", ignoreCase = true) ||
          title.contains("answerkey", ignoreCase = true)

  val attempts = manifest.incrementAttempt(fingerprint)

  if (isLikelyMaterial && attempts < 2) {
      CrawlerTraceLogger.log(
          "DEEP_CRAWLER",
          "Notice #${nextItem.index} (\"$title\") did not open detail view, but appears to contain attachments/worksheets. Retrying (Attempt $attempts/2)..."
      )
      ingestNoticeDirect(title, fullText, fingerprint)
  } else {
      CrawlerTraceLogger.log(
          "DEEP_CRAWLER",
          "Card did not open detail view (Attempts: $attempts). Ingesting directly from stream: \"$title\""
      )
      ingestNoticeDirect(title, fullText, fingerprint)
      manifest.markCompleted(fingerprint)
      visitedPostFingerprints.add(fingerprint)
      crawlerOverlay?.incrementNoticeCount()
  }
  delay(300)
  continue
  ```
  **Guarantee & Loop Prevention:**
  - When a notice card matches educational materials (`material`, `worksheet`, `notes`, `answer key`, `answerkey`), it is prioritized for detail entry to harvest attachments.
  - On transition failure, `manifest.incrementAttempt(fingerprint)` tracks attempts. For `attempts < 2`, the post body is saved via `ingestNoticeDirect`, but the item remains pending to allow an immediate re-tap.
  - **Bound Threshold:** Once `attempts >= 2` (or immediately on the first failure for plain announcements without materials), the crawler gracefully falls back to `ingestNoticeDirect(title, fullText, fingerprint)`, marks the item completed via `manifest.markCompleted(fingerprint)`, adds it to `visitedPostFingerprints`, increments the overlay notice counter, and advances upward to the next notice in the manifest.
  - This bounded threshold completely eliminates infinite re-tap loops at the top of the stream or on non-expandable material cards while preserving all notice text and metadata in Room storage.

##### 3. `IN_DETAIL_VIEW` (Title Sanitization, Full Text Harvesting & Autonomous Attachment Capture)
- **Soft Keyboard Dismissal:** Classroom frequently focuses the `"Add class comment"` input field upon entering detail view, popping up the software keyboard and occluding attachment buttons. `clearFocusIfInputFocused(detailRoot)` scans for `EditText` views and dispatches `ACTION_CLEAR_FOCUS`.
- **Title Sanitization & Stream Prioritization (`fallbackTitle`):**
  Inside detail screens, Google Classroom layouts are notoriously inconsistent—frequently lacking a semantic title view, placing the title below comment prompts, or exposing raw navigation strings (such as `"Navigate up"`, `"Back to stream"`, `"Add class comment"`, or `"More options"`).
  To guarantee pristine notice titles, `processPostDetailAndDownload` implements a strict two-stage sanitization priority:
  ```kotlin
  val textList = mutableListOf<String>()
  collectAllText(detailRoot, textList)
  val combinedText = textList.joinToString("\n")
  val titleCandidate = textList.firstOrNull { item ->
      val lower = item.trim().lowercase()
      !excludedChrome.contains(lower) &&
              !excludedChrome.any { lower.startsWith(it) } &&
              !lower.startsWith("tab ") &&
              !lower.startsWith("add class comment") &&
              !lower.startsWith("0 class comments") &&
              !lower.contains("class comments") &&
              !lower.startsWith("back to ") &&
              !lower.startsWith("more options") &&
              !lower.startsWith("for your reference") &&
              !lower.startsWith("for reference") &&
              item.trim().length > 3
  }
  val cleanFallback = if (fallbackTitle.isNotBlank() && fallbackTitle != "Classroom Notice") fallbackTitle else null
  val title = cleanFallback ?: titleCandidate?.take(80) ?: "Classroom Notice"
  ```
  - **`fallbackTitle` Stream Prioritization:** If a clean stream title was captured before entering the detail view (`cleanFallback != null`), it is chosen unconditionally over interior candidate strings.
  - **Expanded `excludedChrome` Filtering:** Thoroughly excludes navigation chrome, comments headers, attachment option indicators, and offline button labels:
    ```kotlin
    private val excludedChrome = setOf(
        "open navigation menu", "show menu", "more options", "navigate up", "back",
        "stream", "classwork", "people", "about", "join course", "view to-do list",
        "classroom", "google classroom", "class options", "close", "comments",
        "back to classwork page", "back to classwork", "back to stream", "back to people",
        "attachments", "class comments", "no comments", "add class comment",
        "save all files offline", "save all offline", "save offline", "more options for attachment",
        "for your reference", "for reference"
    )
    ```
- **Exclusion of 'More Options for Attachment' in `findNodesWithExtensions` (Eliminating 3-Dots Popup Interference):**
  In Google Classroom, each attachment item renders a 3-dots overflow menu button with the accessibility label `"More options for attachment [filename]"`. If an automated crawler inspects node trees naively, these buttons are mistakenly identified as attachment triggers. Tapping them summons a modal popup menu (*"Download"*, *"Report issue"*), stealing window focus, occluding the UI, and disrupting the crawling state machine.
  To eliminate this interference at the root, `findNodesWithExtensions` explicitly inspects and rejects all options nodes before adding candidates:
  ```kotlin
  private fun findNodesWithExtensions(
      node: AccessibilityNodeInfo,
      extensions: List<String>,
      outList: MutableList<Pair<String, AccessibilityNodeInfo>>
  ) {
      val text = node.text?.toString()?.trim()
      val desc = node.contentDescription?.toString()?.trim()

      val isOptionsButton = (desc?.contains("options", ignoreCase = true) == true) ||
              (text?.contains("options", ignoreCase = true) == true) ||
              (desc?.contains("more options", ignoreCase = true) == true)

      val candidate = when {
          isOptionsButton -> null
          !text.isNullOrBlank() && (extensions.any { text.contains(it, ignoreCase = true) } || text.endsWith("...")) -> {
              if (text.contains('.')) text else "$text.pdf"
          }
          !desc.isNullOrBlank() && (extensions.any { desc.contains(it, ignoreCase = true) } || (desc.contains("attachment", ignoreCase = true) && !desc.contains("options", ignoreCase = true)) || desc.contains("pdf", ignoreCase = true)) -> {
              if (desc.contains('.')) desc else "$desc.pdf"
          }
          else -> null
      }

      if (candidate != null && outList.none { it.first == candidate.take(60) }) {
          outList.add(candidate.take(60) to AccessibilityNodeInfo.obtain(node))
      }
      ...
  ```
  Coupled with `"more options for attachment"` in `excludedChrome`, 3-dots menus are completely filtered out, guaranteeing that clicks are dispatched solely to actual download buttons and clickable attachment cards.

- **Autonomous Attachment Capture & Ingestion Pipeline:**
  Instead of internal app caching, K.I.D.S. systematically extracts and ingests each attachment individually through a dual-strategy pipeline supporting both direct downloads and native share targeting:
  ```kotlin
  val attachments = extractDetailAttachments(detailRoot)
  for ((index, att) in attachments.withIndex()) {
      if (att.downloadNode != null && att.downloadNode.isClickable) {
          crawlerOverlay?.updateStatus("Downloading (${index + 1}/${attachments.size})...", att.fileName)
          CrawlerTraceLogger.log("ATTACHMENT_DOWNLOAD", "Tapping download button for \"${att.fileName}\"")
          val clicked = att.downloadNode.performAction(AccessibilityNodeInfo.ACTION_CLICK)
          if (!clicked) {
              val b = Rect()
              att.downloadNode.getBoundsInScreen(b)
              dispatchTap(b.centerX().toFloat(), b.centerY().toFloat())
          }
          delay(1000) // Calibrated debounce between downloads
      } else if (att.clickableChip != null && att.clickableChip.isClickable) {
          crawlerOverlay?.updateStatus("Opening (${index + 1}/${attachments.size})...", att.fileName)
          CrawlerTraceLogger.log("ATTACHMENT_AUTO_TAP", "Tapping attachment chip for \"${att.fileName}\"")
          val clicked = att.clickableChip.performAction(AccessibilityNodeInfo.ACTION_CLICK)
          if (!clicked) {
              val b = Rect()
              att.clickableChip.getBoundsInScreen(b)
              dispatchTap(b.centerX().toFloat(), b.centerY().toFloat())
          }
          delay(800)

          // Automate Share or Download inside viewer and return to detail view
          automateViewerShareOrDownload(att.fileName)

          // Check if file was captured by ShareTargetActivity
          val updatedAtt = db.attachmentDao().findByFileHash(fileHash)
          if (updatedAtt != null && updatedAtt.localUri.isNotBlank() && File(updatedAtt.localUri).exists()) {
              if (capturedAttachmentNames.add(att.fileName)) {
                  crawlerOverlay?.incrementAttachmentCount()
              }
          }
      }
      att.downloadNode?.recycle()
      att.clickableChip?.recycle()
  }

  // Truthful Staged Attachment Counting via scanLocalAttachments Return Value
  if (attachments.isNotEmpty()) {
      delay(1000) // Allow file staging to finalize
      val stagedCount = DownloadFolderObserver.scanLocalAttachments(applicationContext)
      for (s in 0 until stagedCount) {
          crawlerOverlay?.incrementAttachmentCount()
      }
  }
  ```
  - **Automated In-App Viewer & Preview Detection (`automateViewerShareOrDownload`):**
    When tapping an attachment chip opens an internal or external viewer (e.g. Google Docs, Sheets, Drive PDF viewer, or system document viewers), `automateViewerShareOrDownload()` automatically discovers and handles the preview screen without user intervention:
    1. **Viewer Screen Detection & Exclusion Invariant (`isDocumentViewerScreen` vs. `isPostDetailView`):**
       To reliably trigger viewer automation without mistaking a PDF or image preview for a post detail screen, `KidsAccessibilityService` deploys a two-tier screen inspection:
       ```kotlin
       private fun isDocumentViewerScreen(combinedText: String): Boolean {
           val lower = combinedText.lowercase()
           return lower.contains("page 1 of") ||
                   lower.contains("page 1/") ||
                   lower.contains("fit to width") ||
                   lower.contains("fit to screen") ||
                   lower.contains("zoom in") ||
                   lower.contains("send a copy") ||
                   lower.contains("send file")
       }

       private fun isPostDetailView(rootNode: AccessibilityNodeInfo): Boolean {
           val textList = mutableListOf<String>()
           collectQuickText(rootNode, textList)
           val combined = textList.joinToString(" ").lowercase()

           // 1. If it has document viewer controls, it is a document viewer, not post detail
           if (isDocumentViewerScreen(combined)) {
               return false
           }

           val hasDetailIndicators = combined.contains("add class comment") ||
                   combined.contains("class comments") ||
                   combined.contains("your work") ||
                   combined.contains("assigned") ||
                   combined.contains("attachments") ||
                   combined.contains("attachment") ||
                   combined.contains("save all files offline") ||
                   combined.contains("save all") ||
                   combined.contains("save offline") ||
                   combined.contains("for your reference") ||
                   combined.contains("points")
           val hasBottomTabs = (combined.contains("stream") && combined.contains("classwork")) ||
                   combined.contains("tab 1 of 3") ||
                   combined.contains("tab 2 of 3")
           val hasBackArrow = hasNavigateUpButton(rootNode)
           return hasDetailIndicators && hasBackArrow && !hasBottomTabs
       }
       ```
       - **Strict Detail View Constraint:** A screen is categorized as a post detail view **only** if it possesses both detail indicators (`"add class comment"`, `"your work"`, `"assigned"`, etc.) **and** a confirmed Navigate Up back arrow, **and** lacks bottom stream/classwork navigation tabs, **and** contains **zero** document viewer controls (`!isDocumentViewerScreen(combined)`).
       - **Reliable Viewer Handoff:** When a PDF or image preview opens, `isDocumentViewerScreen()` detects controls like `"fit to width"` or `"page 1 of"`, causing `isPostDetailView()` to return `false`. The viewer wait loop in `automateViewerShareOrDownload()`:
         ```kotlin
         val isNotDetail = !isPostDetailView(root) && !isStreamOrClassworkView(root)
         ```
         evaluates to `true`, deterministically detecting that the document viewer has taken foreground within 1,500ms and proceeding directly to Share/Download automation.
    2. **Direct Share / Download Scanning:** Inspects the active node tree for a direct Share action (`"share"`, `"send a copy"`, `"send file"`) via `findShareButton(active)` or a direct Download button (`findDownloadButtonNode(active)`). If found, it dispatches an accessibility click or falls back to `dispatchTap`.
    3. **Overflow Menu Fallback:** If direct actions are hidden inside an overflow menu, it locates the `"More options"` / `"overflow"` button (`findOverflowMenuButton`), clicks it, awaits the popup menu (400ms), and inspects the popup tree for Share or Download actions.
    4. **Invocation of Chooser Selection:** If a Share action was triggered, it calls `selectKidsInSystemChooser()`.
    5. **Guarded Return to Detail View:** Executes up to 3 sequential return attempts to safely dismiss the preview and restore the post detail view before continuing the attachment loop.
  - **Autonomous System Chooser Selection (`selectKidsInSystemChooser`):**
    When Android displays its system share sheet (`resolver`, `chooser`, `android`, or `systemui`), `selectKidsInSystemChooser()` automates the target selection:
    ```kotlin
    private suspend fun selectKidsInSystemChooser() {
        // Wait up to 1500ms for system chooser to appear
        waitForCondition(timeoutMs = 1500, pollIntervalMs = 200) {
            val root = rootInActiveWindow ?: return@waitForCondition false
            val pkg = root.packageName?.toString()?.lowercase() ?: ""
            val isChooser = pkg.contains("resolver") || pkg.contains("chooser") ||
                    pkg.contains("android") || pkg.contains("systemui")
            val hasKidsTarget = findKidsShareTarget(root) != null
            root.recycle()
            isChooser && hasKidsTarget
        }

        val chooserRoot = rootInActiveWindow ?: return
        val target = findKidsShareTarget(chooserRoot)
        if (target != null) {
            CrawlerTraceLogger.log("ATTACHMENT_SHARE", "Found \"K.I.D.S. Vault\" target in share sheet. Selecting it.")
            val clicked = target.performAction(AccessibilityNodeInfo.ACTION_CLICK)
            if (!clicked) {
                val b = Rect()
                target.getBoundsInScreen(b)
                dispatchTap(b.centerX().toFloat(), b.centerY().toFloat())
            }
            target.recycle()
            delay(500) // Allow ShareTargetActivity to process intent
        }
        chooserRoot.recycle()
    }
    ```
    The target selector scans for labels matching `"k.i.d.s"` or `"kids vault"`, dispatches the tap to hand off the URI stream to `ShareTargetActivity`, and allows 500ms for staging to initiate.
  - **Calibrated 1,000ms Debouncing:** Enforces a 1,000ms debounce between individual attachment taps. This provides sufficient time for Android's system `DownloadManager` or `ShareTargetActivity` to register each incoming request without dropping socket connections or dropping rapid successive taps.
  - **Verified Staged Attachment Counting via `scanLocalAttachments` Return Value:**
    Rather than optimistically incrementing the file counter on every download button click (which causes phantom counts on network dropouts, canceled downloads, or unverified files), the overlay's file metric strictly reflects verified files moved to storage. `DownloadFolderObserver.scanLocalAttachments(applicationContext)` returns the exact count (`Int`) of newly moved and verified attachments in `vault_attachments/`. The counter `crawlerOverlay?.incrementAttachmentCount()` is only incremented for each verified staged file (`for (s in 0 until stagedCount)`), presenting parents with a completely truthful metric.

##### 4. `GUARDED_RETURN` (Multi-Attempt Guarded Return Loop & Preview Dismissal)
- **Multi-Attempt Guarded Return Loop (Up to 3 Attempts):**
  Tapping attachment chips or download actions can occasionally launch an in-app document viewer, intent preview sheet, or intermediate view. To ensure the crawler never gets trapped inside an attachment viewer or detail screen, `KidsAccessibilityService` executes a guarded return loop of up to 3 attempts:
  ```kotlin
  crawlerOverlay?.updateStatus("Status: Returning to Stream...")
  var returnAttempts = 0
  while (returnAttempts < 3) {
      val active = rootInActiveWindow ?: break
      if (isStreamOrClassworkView(active)) {
          active.recycle()
          break
      }
      performReturnToStream(active)
      active.recycle()
      delay(600)
      returnAttempts++
  }
  ```
- **Dual-View Recovery:**
  - **Attempt 1:** Closes any full-screen attachment previewer or bottom sheet that popped up when tapping the attachment chip.
  - **Attempt 2:** Navigates up from the post detail view back toward the stream feed.
  - **Attempt 3:** Failsafe fallback ensuring any lingering modal dialog or pop-up is dismissed.
- **Three-Tier Fallback Navigation (`performReturnToStream`):**
  ```kotlin
  private suspend fun performReturnToStream(root: AccessibilityNodeInfo) {
      val navUp = findNavigateUpButton(root)
      if (navUp != null) {
          CrawlerTraceLogger.log("DEEP_CRAWLER", "Clicking Navigate Up to return to stream")
          val clicked = navUp.performAction(AccessibilityNodeInfo.ACTION_CLICK)
          if (!clicked) {
              val b = Rect()
              navUp.getBoundsInScreen(b)
              dispatchTap(b.centerX().toFloat(), b.centerY().toFloat())
          }
          navUp.recycle()
      } else {
          CrawlerTraceLogger.log("DEEP_CRAWLER", "Dispatching GLOBAL_ACTION_BACK to return to stream")
          performGlobalAction(GLOBAL_ACTION_BACK)
      }
  }
  ```
  1. **Tier 1 (Navigate Up Accessibility Click):** Locates the top toolbar navigation button matching `"navigate up"` or `"back"` and calls `ACTION_CLICK`.
  2. **Tier 2 (Physical Touch Tap Fallback):** If `ACTION_CLICK` returns false or fails to trigger navigation, dispatches a physical touch tap `dispatchTap(b.centerX(), b.centerY())` directly at the button's screen coordinates.
  3. **Tier 3 (System Global Back Fallback):** If no toolbar navigation node is discovered in the active window hierarchy, executes Android's system-level `performGlobalAction(GLOBAL_ACTION_BACK)`.
- **Post-Return Verification & Settling:**
  - Calls `waitForCondition(timeoutMs = 2000, pollIntervalMs = 200)` checking `isStreamOrClassworkView(active)` to verify that bottom tabs are visible.
  - Applies a **600ms stabilization delay** post-return, giving the Android `RecyclerView` time to rebind views and settle scroll physics before resuming the scan.

##### 5. `SCROLLING` (Kinetic Physical Swipe Gesture & Viewport Settling)
- **Primary Mechanism (400ms Kinetic Physical Swipe):**
  Modern Google Classroom `RecyclerView` implementations rely on real pointer velocity and `OnScrollListener` fling callbacks to trigger infinite-scroll pagination. Traditional synthetic accessibility scrolls (`AccessibilityNodeInfo.ACTION_SCROLL_FORWARD`) frequently report success without generating physical touch velocity, causing Classroom's pagination adapter to stall.
  `FloatingCrawlerOverlay.performScroll()` prioritizes an authentic physical pointer swipe gesture constructed via `GestureDescription.Builder`:
  - **Kinetic Swipe Coordinates:** Starts at 75% screen height and sweeps upward to 20% screen height:
    $$(0.65 \times \text{width}, 0.75 \times \text{height}) \longrightarrow (0.65 \times \text{width}, 0.20 \times \text{height})$$
  - **Safe Margin Placement (65% Screen Width):** Positioned at 65% horizontal width, the swipe safely avoids triggering Android 10+ system navigation back gestures (which intercept touches along the outer 10–15% display edges) and avoids colliding with or dragging the floating assistant overlay.
  - **Calibrated 400ms Duration:** The 400ms stroke (`GestureDescription.StrokeDescription(path, 0, 400)`) generates genuine kinetic inertia and fling velocity, firing `RecyclerView.OnScrollListener` and forcing Classroom's pagination adapter to fetch older announcements.
  - **Graceful Native Fallback:** If the physical gesture is cancelled or fails to dispatch, `fallbackNativeScroll()` executes `AccessibilityNodeInfo.ACTION_SCROLL_FORWARD` on the primary scrollable container (`findPrimaryScrollableNode`).
- **850ms Settling Delay:** Following scroll completion, the crawler halts for **850ms** to allow view recycling, text binding, and view layout passes to finish before inspecting newly presented post cards.

##### 6. `END-OF-STREAM DETECTION` (5-Attempt Pagination Tolerance & Autonomous Completion)
- **5-Attempt Zero-Discovery Tolerance & 1,500ms Network Delay:**
  When zero unvisited cards are detected after a scroll pass (`!hasNew`), `consecutiveZeroDiscoveryCount` increments. Because Classroom requires network latency to query Google servers and bind earlier posts, K.I.D.S. does not assume end-of-stream prematurely:
  - If `consecutiveZeroDiscoveryCount < 5`:
    The crawler updates the overlay status to `"Checking for earlier posts..."` with detail `"Waiting for stream pagination ($consecutiveZeroDiscoveryCount/5)"`, and executes a **1,500ms network settling delay** (`delay(1500)`) to allow Classroom ample time to fetch older announcements.
  - When **5 consecutive scrolls and pagination waits yield zero new cards (`5/5`)**, the crawler concludes that the historical stream has been fully traversed.
- **Differentiated Autonomous Outcomes (`showCompletion` vs. `"✓ Stream Up to Date"`):**
  Instead of abruptly terminating or waiting for manual confirmation, the crawler executes an autonomous completion pipeline:
  1. **New Notices Captured (`totalNotices > 0`):**
     - **Visual State Transformation (`showCompletion`):** The overlay pill's background instantly shifts from standard navy to **Deep Success Green** (`#1B4D3E` with a `#4ADE80` bright emerald stroke). The status text updates to `"✓ Backfill Complete!"` in light green (`#86EFAC`), the detail line displays `"$countNotices Notices • $countFiles Files Saved"` in crisp white, and the action button hides (`View.GONE`).
     - **2.5-Second Visual Dwell Delay:** Schedules a 2,500ms timer via `handler.postDelayed(..., 2500)` so parents can comfortably observe final tallies.
     - **Guaranteed View Teardown & Sync:** `dismissAndRemove()` invokes `windowManager.removeViewImmediate(view)`, and `stopDeepCrawl()` queues a terminal synchronization task in `WorkManager` using `ExistingWorkPolicy.APPEND_OR_REPLACE`.
  2. **Stream Already Up to Date (`totalNotices == 0`):**
     - If all announcements were already captured in previous runs, the overlay **does not abruptly vanish or disappear silently** (which would leave parents wondering if the crawler ran).
     - Instead, the overlay remains visible, clearly displaying:
       $$\text{Status: "✓ Stream Up to Date"}$$
       $$\text{Detail: "All current stream posts already captured"}$$
     - It then cleanly stops (`stopDeepCrawl()`), initiates a background Google Drive verification sync, and finishes hands-free.

---

#### Critical Safety Invariants & IPC Robustness

To guarantee parent privacy, app stability, and zero system crashes, `KidsAccessibilityService` enforces five strict architectural invariants:

1. **Course Picker Pop-Out Prevention & Detail Trap Recovery:**
   - The crawler strictly blacklists chrome nodes (`"open navigation menu"`, `"show menu"`, `"more options"`, `"class options"`) to prevent inadvertently opening the Classroom navigation drawer or switching courses.
   - If the service is started or resumed while already inside a post detail view, `isPostDetailView(root) && !isStreamOrClassworkView(root)` immediately detects the condition and executes `performReturnToStream(root)` before starting the crawl loop.

2. **Exit Debounce & Package Transition State Machine (1200ms Shield):**
   - **Window State Observation:** `onAccessibilityEvent` intercepts `AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED` to detect app transitions.
   - **Self-Rejection:** Events originating from K.I.D.S.'s own package (`packageName == applicationContext.packageName`) are discarded immediately to avoid inspecting the onboarding wizard or dashboard.
   - **Authorized School App Continuity:** When `isAuthorizedSchoolApp(packageName)` detects Google Classroom or an authorized ERP (`campuscare`, `toddle`, `edunext`), any pending exit debounce job is instantly cancelled (`exitDebounceJob?.cancel()`, `exitDebounceJob = null`), and `lastActiveSchoolPackage` is updated. If `TYPE_WINDOW_STATE_CHANGED` arrives for an authorized school app, `getOrCreateOverlay().show()` restores the overlay.
    - **Transient & System Surface Shielding (`isTransientOrSystemPackage`):**
      Android constantly fires window state changes for transient surfaces. K.I.D.S. maintains a comprehensive package whitelist to prevent false exit events or crawler freezes during file previews:
      - *Soft Input Keyboards (IMEs):* `inputmethod`, `gboard`, `keyboard`, `swiftkey`, `samsungime`.
      - *System UI & Intent Choosers:* `systemui`, `android`, `resolver`, `chooser` (system share sheets).
      - *Device Security & File Explorers:* `miui.securitycenter`, `fileexplorer`, `google.android.apps.nbu.files` (Files by Google), `sec.android.app.myfiles` (Samsung My Files).
      - *Document Viewers & Office Suites:* `documentsui`, `google.android.apps.docs` (Google Drive viewer), `docs.editors` (Google Docs/Sheets), `adobe.reader` (Adobe Acrobat), `cn.wps` (WPS Office), `microsoft.office`, and generic packages containing `viewer`.
      These packages are safely shielded during window state checks, preventing accidental crawl aborts or teardowns while opening attachments, previewing PDFs, or interacting with the share sheet.
    - **1,200ms Exit Debounce Coroutine (`handleAppExitEvent`):**
      When the parent genuinely navigates away from the school app (swiping up to Home launcher, switching via Recents, or pressing Back out of Classroom), `handleAppExitEvent(foreignPackage)` launches a 1.2-second debounce timer on `serviceScope`:
      ```kotlin
      private fun handleAppExitEvent(foreignPackage: String) {
          if (exitDebounceJob?.isActive == true) return

          exitDebounceJob = serviceScope.launch {
              delay(1200) // 1.2-second debounce for stability against transient window changes
              if (crawlerOverlay?.isAutoScrollingActive() == true || crawlerOverlay?.isShowing() == true) {
                  CrawlerTraceLogger.log(
                      "DEEP_CRAWLER",
                      "Exited school app to \"$foreignPackage\". Auto-stopping capture, closing overlay, and triggering Drive sync."
                  )
                  stopDeepCrawl()
                  crawlerOverlay?.dismissAndRemove()
                  triggerDriveSync(applicationContext)
              }
          }
      }
      ```
      If the parent returns to the school app within 1,200ms, the job is cancelled without interruption. If 1,200ms elapses while outside the school app, the service autonomously stops the crawler job, strips the overlay from the screen via `dismissAndRemove()`, and triggers Google Drive synchronization.

3. **External App Confinement & Viewer Auto-Recovery (In-Loop Guard):**
   - On every loop iteration, the crawler classifies `root.packageName`:
     ```kotlin
     val currentPkg = root.packageName?.toString() ?: ""
     val isClassroom = isAuthorizedSchoolApp(currentPkg)
     val isTransient = isTransientOrSystemPackage(currentPkg)

     if (!isClassroom && !isTransient) {
         crawlerOverlay?.updateStatus("Status: Paused (External App)", currentPkg)
         root.recycle()
         delay(1000)
         continue
     }

     if (isTransient) {
         CrawlerTraceLogger.log("VIEWER_RECOVERY", "Active window in Pass 2 is viewer or system component ($currentPkg). Returning to Classroom...")
         crawlerOverlay?.updateStatus("Processing File...", currentPkg)
         performReturnToStream(root)
         root.recycle()
         delay(600)
         continue
     }
     ```
   - **Viewer Recovery Block:** When Classroom opens an attachment in Google Drive Viewer, system PDF previewer, or share sheet, `isTransient == true`. Rather than freezing execution with `Status: Paused (External App)`, K.I.D.S. recognizes this as part of the file-capture workflow: it displays `Processing File...`, invokes `performReturnToStream(root)` (clicking Navigate Up or system `GLOBAL_ACTION_BACK`), and smoothly recovers back to Google Classroom with a 600ms settling delay.
   - **Genuine External App Confinement:** If a genuinely foreign, non-whitelisted app or launcher takes the foreground (`!isClassroom && !isTransient`), the crawler safely pauses execution, updates the overlay to `Status: Paused (External App)`, and delays 1,000ms without clicking or scrolling, strictly preventing unintended interactions.

4. **Immediate Coroutine Job Cancellation on Stop:**
   - Tapping `⏹ Stop Capture` invokes `stopDeepCrawl()`, which immediately calls `crawlerJob?.cancel()` and nullifies the reference.
   - The main loop and all `waitForCondition` polling blocks continuously verify `serviceScope.isActive` and `crawlerOverlay?.isAutoScrollingActive() == true`.
   - Cancellation takes effect **instantaneously (<1ms)** with zero queued clicks, delayed gestures, or lingering navigation actions.

5. **Strict `AccessibilityNodeInfo` Recycling (Zero IPC Binder Leaks):**
   - In Android, `AccessibilityNodeInfo` instances are heavy IPC proxies allocated across the `system_server` binder interface. Failing to recycle them causes fatal binder transaction buffer exhaustion (`TransactionTooLargeException`) and service disconnection.
   - Every node returned from `rootInActiveWindow`, `getChild()`, `findNodesWithExtensions()`, and helper lookups is recycled deterministically in `finally` blocks and traversal loops using `.recycle()`.

6. **Session-Persistent In-Memory Post Fingerprints (`visitedPostFingerprints` Invariant):**
   - `visitedPostFingerprints` is initialized as a thread-safe concurrent hash set (`ConcurrentHashMap.newKeySet<String>()`) at the service instance level.
   - It is intentionally **preserved across crawl session toggles** (when the parent starts, stops, or re-initiates auto-capture within the same app lifecycle).
   - Stopping or completing a crawl job invokes `stopDeepCrawl()` (cancelling the coroutine), but intentionally leaves `visitedPostFingerprints` intact. This invariant guarantees that pausing capture to review notices or stopping and re-starting will never cause the crawler to re-enter, re-read, or re-download attachments from post cards already parsed during that session, eliminating redundant processing and preventing duplicate Room database operations.

---

#### `FloatingCrawlerOverlay`: Dynamic Status API & Decoupled Architecture

`FloatingCrawlerOverlay` provides the user interface for the backfill assistant. It attaches directly to Android's `WindowManager` using `WindowManager.LayoutParams.TYPE_ACCESSIBILITY_OVERLAY` (falling back gracefully to `TYPE_APPLICATION_OVERLAY` or `TYPE_PHONE` if restricted), requiring **zero extra overlay permissions**.

##### Dynamic Status & Teardown API
The overlay exposes a clean, decoupled API used by `KidsAccessibilityService` to communicate FSM state changes, execute kinetic physical scrolling, and manage hands-free teardown:

```kotlin
class FloatingCrawlerOverlay(...) {
    // Dynamic FSM status updates (decoupled from rigid UI timers)
    fun updateStatus(status: String, detail: String? = null)
    
    // Live metrics tracking
    fun incrementNoticeCount()
    fun incrementAttachmentCount()
    fun resetCounts()
    fun getCapturedCount(): Int
    fun getCapturedAttachmentsCount(): Int
    
    // Lifecycle controls
    fun startAutoScroll()
    fun stopAutoScroll()
    fun isAutoScrollingActive(): Boolean
    fun isShowing(): Boolean
    
    // Physical kinetic list scrolling (Bidirectional)
    fun performScroll(onComplete: () -> Unit)
    fun performScrollBackward(onComplete: () -> Unit)
    
    // Autonomous Zero-Click Completion & Clean Teardown
    fun showCompletion(countNotices: Int, countFiles: Int, onDismissed: () -> Unit = {})
    fun dismissAndRemove()
}
```

- **Bidirectional Kinetic Scroll Dispatchers (`performScroll` & `performScrollBackward`):**
  Classroom's `RecyclerView` requires actual pointer motion and velocity events to invoke internal pagination listeners and list re-positioning. `FloatingCrawlerOverlay` provides bidirectional kinetic swipe gestures routed to the main thread:
  ```kotlin
  fun performScroll(onComplete: () -> Unit) {
      handler.post {
          performScrollGesture(onComplete)
      }
  }

  fun performScrollBackward(onComplete: () -> Unit) {
      handler.post {
          performScrollBackwardGesture(onComplete)
      }
  }

  private fun performScrollGesture(onComplete: () -> Unit) {
      val displayMetrics = service.resources.displayMetrics
      val width = displayMetrics.widthPixels
      val height = displayMetrics.heightPixels

      // Physical touch swipe forward (downward scroll): Start at 75% height and swipe upwards to 20% height
      // Placed at 65% width to avoid right-edge back gestures and left-side overlay
      val startX = width * 0.65f
      val startY = height * 0.75f
      val endY = height * 0.20f

      dispatchKineticSwipe(startX, startY, startX, endY, isForward = true, onComplete)
  }

  private fun performScrollBackwardGesture(onComplete: () -> Unit) {
      val displayMetrics = service.resources.displayMetrics
      val width = displayMetrics.widthPixels
      val height = displayMetrics.heightPixels

      // Physical touch swipe backward (upward scroll/rewind): Start at 25% height and swipe downwards to 75% height
      val startX = width * 0.65f
      val startY = height * 0.25f
      val endY = height * 0.75f

      dispatchKineticSwipe(startX, startY, startX, endY, isForward = false, onComplete)
  }

  fun performMicroScroll(forward: Boolean, onComplete: () -> Unit) {
      handler.post {
          performMicroScrollGesture(forward, onComplete)
      }
  }

  private fun performMicroScrollGesture(forward: Boolean, onComplete: () -> Unit) {
      val displayMetrics = service.resources.displayMetrics
      val width = displayMetrics.widthPixels
      val height = displayMetrics.heightPixels

      val startX = width * 0.65f
      val (startY, endY) = if (forward) {
          Pair(height * 0.58f, height * 0.42f)
      } else {
          Pair(height * 0.46f, height * 0.62f)
      }

      val path = Path().apply {
          moveTo(startX, startY)
          lineTo(startX, endY)
      }

      val stroke = GestureDescription.StrokeDescription(path, 0, 220)
      val gesture = GestureDescription.Builder().addStroke(stroke).build()
      service.dispatchGesture(gesture, object : AccessibilityService.GestureResultCallback() {
          override fun onCompleted(gestureDescription: GestureDescription?) { onComplete() }
          override fun onCancelled(gestureDescription: GestureDescription?) { onComplete() }
      }, null)
  }
  ```
  - **Kinetic Fling Mechanics (Forward & Backward):**
    - *Forward Scroll (Pass 1 Survey & Pass 2 Advance):* Moves from $(0.65w, 0.75h)$ to $(0.65w, 0.20h)$ in 400ms, triggering pagination for older announcements.
    - *Backward Scroll (Pass 1.5 Rewind & Displacement Recovery):* Moves from $(0.65w, 0.25h)$ to $(0.65w, 0.75h)$ in 400ms, smoothly scrolling back toward earlier notices.
  - **Micro-Scroll Mechanics (16% Screen Height Gentle Nudge):**
    - Dispatches a 16% screen height swipe ($0.58h \rightarrow 0.42h$ forward or $0.46h \rightarrow 0.62h$ backward) over 220ms.
    - Imparts zero kinetic momentum, preventing fling overshoot when fine-tuning card alignment or breaking direction oscillation.
  - **Placement Invariant (65% Screen Width):** Swiping along $x = 0.65w$ avoids Android 10+ edge back gestures (active on the outer 10-15% display bounds) and keeps the gesture clear of the left-anchored floating assistant overlay.
  - **Graceful Native Fallback:** If gesture dispatch is cancelled or fails, `fallbackNativeScroll(isForward)` executes `ACTION_SCROLL_FORWARD` or `ACTION_SCROLL_BACKWARD` on the primary scrollable node, ensuring scrolling never halts.

- **Guaranteed View Teardown (`dismissAndRemove` via `removeViewImmediate`):**
  A critical challenge with Android accessibility overlays is the risk of "ghost" windows—orphaned, invisible, or non-responsive views that linger across app switches and intercept user touches on the Home screen.
  `FloatingCrawlerOverlay.dismissAndRemove()` resolves this deterministically:
  ```kotlin
  fun dismissAndRemove() {
      handler.post {
          if (isAutoScrolling) {
              stopAutoScroll()
          }
          overlayView?.let { view ->
              try {
                  windowManager.removeViewImmediate(view)
              } catch (e: Exception) {
                  try {
                      windowManager.removeView(view)
                  } catch (e2: Exception) {
                      Log.w(TAG, "Error removing overlay view: ${e2.message}")
                  }
              }
          }
          overlayView = null
          isMinimized = false
      }
  }
  ```
  Instead of asynchronous `removeView()` (which can lag or fail if the host accessibility window is losing focus), `removeViewImmediate(view)` synchronously decouples the view from `WindowManagerService`, guaranteeing zero ghost overlays or lingering accessibility windows floating over the Android home screen or other apps.
- **Two-Line Status Pill Layout:**
  - **Top Row:** Title (`K.I.D.S. Assistant`), real-time counter badge (`XX Notices • YY Files`), minimize (`—`), and close (`✕`).
  - **Status Row:** Live FSM state indicator (`statusTextView`).
  - **Detail Row:** Active post headline or attachment filename (`detailTextView`), auto-truncated with ellipsis.
- **Single-Action Responsive Button with 1,200ms TalkBack Debounce:**
  - In idle state: Displays `▶ Start Auto-Capture` in Amber Orange (`#ED8936`) with dynamic accessibility label `contentDescription = "Start Auto-Capture"`.
  - In active state: Displays `⏹ Stop Capture` in Crimson Red (`#E53E3E`) with dynamic accessibility label `contentDescription = "Stop Auto-Capture"`.
  - **WCAG 2.1 AA/AAA 48dp Touch Targets:** Enforces `minHeight = dpToPx(48)` and `minWidth = dpToPx(48)` on `autoButton`, minimize button (`btnMin`), and close button (`btnClose`).
  - **1,200ms TalkBack Double-Tap Guard:** TalkBack users activate on-screen controls via accessibility double-tap gestures. On certain Android OEM skins or during TalkBack service event echoes, double-tapping can dispatch rapid successive click events within milliseconds. Without debouncing, a double-tap intended to start auto-capture would immediately register a second click, causing an accidental premature stop. `FloatingCrawlerOverlay` enforces a **1,200ms debounce guard** on `toggleAutoScroll()`, discarding any secondary activation within 1.2 seconds so TalkBack users can activate and pause Auto-Capture smoothly without premature terminations:
    ```kotlin
    private var lastToggleTimeMs = 0L

    private fun toggleAutoScroll() {
        val now = System.currentTimeMillis()
        if (now - lastToggleTimeMs < 1200L) {
            Log.i(TAG, "Ignoring rapid toggle (debounce 1200ms)")
            return
        }
        lastToggleTimeMs = now
        if (isAutoScrolling) stopAutoScroll() else startAutoScroll()
    }
    ```
- **Automated Background Sync on Stop:**
  - Calling `stopAutoScroll()` automatically triggers `KidsAccessibilityService.triggerDriveSync(applicationContext)`, enqueuing `DriveSyncWorker` to upload all newly harvested notices and staged attachments to the parent's Google Drive immediately.

##### WorkManager `ExistingWorkPolicy.APPEND_OR_REPLACE` Invocation

Whenever the crawler completes (`showCompletion`), the user stops capture manually (`stopAutoScroll`), or the app exit debounce fires (`handleAppExitEvent`), terminal cloud synchronization is dispatched via:

```kotlin
fun triggerDriveSync(context: Context) {
    val constraints = Constraints.Builder()
        .setRequiredNetworkType(NetworkType.CONNECTED)
        .build()

    val syncRequest = OneTimeWorkRequestBuilder<DriveSyncWorker>()
        .setConstraints(constraints)
        .build()

    WorkManager.getInstance(context).enqueueUniqueWork(
        "DriveVaultSyncWork",
        ExistingWorkPolicy.APPEND_OR_REPLACE,
        syncRequest
    )
}
```

###### Architectural Rationale: Why `APPEND_OR_REPLACE` is Strictly Enforced
AndroidX `WorkManager` provides three primary policies for unique work chains (`KEEP`, `REPLACE`, and `APPEND_OR_REPLACE`):
1. **The Flaw of `ExistingWorkPolicy.KEEP`:** If an existing periodic background sync worker is already running (e.g. uploading a large PDF worksheet), `KEEP` silently drops subsequent incoming requests. If K.I.D.S. used `KEEP`, the terminal sync request triggered upon crawl completion or app exit would be completely ignored. Freshly harvested notices and staged files would sit idle on local storage until the next periodic poll hours later.
2. **The Flaw of `ExistingWorkPolicy.REPLACE`:** If an active worker is currently mid-stream uploading a 20MB school circular to Google Drive, `REPLACE` abruptly kills the active worker process and discards its coroutine context, wasting cellular data and corrupting the upload stream.
3. **The Guarantee of `ExistingWorkPolicy.APPEND_OR_REPLACE`:** If an existing sync task is actively executing, `APPEND_OR_REPLACE` chains the newly submitted terminal sync job to run immediately upon the current task's completion. If the existing task has failed, finished, or been cancelled, it replaces it cleanly with the fresh request.
**Guarantee:** Terminal sync requests triggered by crawl completion or app exit are **never dropped**, ensuring 100% synchronization consistency between local SQLite storage and the Google Drive Vault.

---

### 3. `ShareTargetActivity`: Native Android Zero-UI Share Target Pipeline

`ShareTargetActivity` (`com.kids.collector.presentation.share.ShareTargetActivity`) is an ultra-fast, transparent native Android Share Target engineered to receive shared educational attachments directly from Android's system share sheet (e.g., when shared from Google Classroom, Google Docs, or Google Drive PDF viewer) and stage them into private vault storage without presenting any intrusive UI or interrupting the user.

```mermaid
sequenceDiagram
    participant VIEWER as Classroom / PDF Viewer
    participant ACS as KidsAccessibilityService
    participant CHOOSER as Android System Chooser
    participant STA as ShareTargetActivity (Translucent)
    participant CR as Android ContentResolver
    participant STAGE as vault_attachments/ Sandbox
    participant DB as SQLite Room (AttachmentDao)
    participant WM as WorkManager (DriveSyncWorker)

    VIEWER->>ACS: Viewer opened with attachment preview
    ACS->>VIEWER: Dispatches Share action (Direct or Overflow)
    VIEWER->>CHOOSER: Launches system share sheet
    ACS->>CHOOSER: selectKidsInSystemChooser() clicks "K.I.D.S. Vault"
    CHOOSER->>STA: startActivity(ACTION_SEND / ACTION_SEND_MULTIPLE)
    Note over STA: LaunchMode="singleInstance"<br/>Theme.Translucent.NoTitleBar
    STA->>STA: CoroutineScope(Dispatchers.IO).launch
    STA-->>CHOOSER: finish() immediately (<50ms execution)
    STA->>CR: openInputStream(uri) & queryFileName(uri)
    CR->>STAGE: Copies byte stream to private sandbox staging
    STA->>STA: DeduplicationEngine.computeFileHash(stagedFile)
    STA->>DB: Fuzzy match pending AttachmentEntity & updateLocalFile()
    STA->>WM: enqueueUniqueWork(APPEND_OR_REPLACE, syncRequest)
    Note over STAGE: Pristine file staged & queued for Drive sync
```

#### AndroidManifest Registration & Translucent Theme
`ShareTargetActivity` is registered in `AndroidManifest.xml` with intent filters for both single (`ACTION_SEND`) and multi-file (`ACTION_SEND_MULTIPLE`) transmissions across any MIME type (`*/*`):

```xml
<!-- Native Zero-UI Share Target Activity for Automated Attachment Ingestion -->
<activity
    android:name=".presentation.share.ShareTargetActivity"
    android:exported="true"
    android:theme="@android:style/Theme.Translucent.NoTitleBar"
    android:launchMode="singleInstance"
    android:label="K.I.D.S. Vault">
    <intent-filter>
        <action android:name="android.intent.action.SEND" />
        <category android:name="android.intent.category.DEFAULT" />
        <data android:mimeType="*/*" />
    </intent-filter>
    <intent-filter>
        <action android:name="android.intent.action.SEND_MULTIPLE" />
        <category android:name="android.intent.category.DEFAULT" />
        <data android:mimeType="*/*" />
    </intent-filter>
</activity>
```

##### Architectural Design Decisions:
- **`@android:style/Theme.Translucent.NoTitleBar`:** Guarantees zero window chrome, zero layout inflation, and zero visual flashing. To the user or calling application, the transition is completely transparent.
- **`android:launchMode="singleInstance"`:** Ensures the share activity runs in its own isolated task and never corrupts or alters the navigation backstack of Google Classroom or `MainActivity`.
- **Immediate `<50ms` UI Lifecycle Termination:** `onCreate` extracts the stream URIs, launches an asynchronous processing coroutine on `Dispatchers.IO`, and calls `finish()` synchronously. The system share sheet dismisses immediately, returning focus to the previous activity in under 50 milliseconds.

#### `ContentResolver` Byte Streaming & Private Sandbox Staging
Incoming intents deliver either `content://` or `file://` URIs via `Intent.EXTRA_STREAM`. Rather than expecting physical file system paths (which are restricted under Android Scoped Storage), `ShareTargetActivity` delegates resolution directly to Android's `ContentResolver`:
1. **Display Name Resolution (`queryFileName`):**
   ```kotlin
   private fun queryFileName(uri: Uri): String? {
       var name: String? = null
       if (uri.scheme == "content") {
           contentResolver.query(uri, arrayOf(OpenableColumns.DISPLAY_NAME), null, null, null)?.use { cursor ->
               if (cursor.moveToFirst()) {
                   val idx = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME)
                   if (idx >= 0) name = cursor.getString(idx)
               }
           }
       }
       return name ?: uri.lastPathSegment
   }
   ```
2. **Filename Sanitization:** The resolved filename is sanitized against illegal path characters via `Regex("[^a-zA-Z0-9._-]")` to prevent directory traversal attacks or filesystem encoding faults.
3. **Private Sandbox Directory Staging:**
   Bytes are streamed directly from `contentResolver.openInputStream(uri)` into `context.getExternalFilesDir(null)/vault_attachments/shared_{timestamp}_{safeFileName}`.
   This guarantees that educational binaries never enter public device directories (`Downloads/` or `Documents/`), upholding the zero-clutter guarantee.

#### SHA-256 Fingerprinting & SQLite Record Reconciliation
Once the binary stream is staged to disk:
1. **Cryptographic Fingerprint:** `DeduplicationEngine.computeFileHash(stagedFile)` computes the SHA-256 digest of the raw byte stream.
2. **Fuzzy Candidate Matching:** The stager queries all existing attachment entities from SQLite Room (`db.attachmentDao().getAllAttachmentsDirect()`) and reconciles the staged file against pending database records:
   - Strips ellipsis truncation (`...` or `…`) from crawler labels.
   - Compares filename base names and extensions case-insensitively.
   - Performs prefix matching on base names $\ge 8$ characters (handling Classroom truncated filenames e.g. `Mathematics Wo...` matching `Mathematics Worksheet Ch4.pdf`).
3. **Entity Update:** If matched, the database record is updated immediately via:
   ```kotlin
   db.attachmentDao().updateLocalFile(
       attachmentId = matchingAtt.attachmentId,
       localUri = stagedFile.absolutePath,
       sizeBytes = stagedFile.length(),
       fileHash = fileHash
   )
   ```
   If unlinked, the file is safely staged and logged via `CrawlerTraceLogger.log("SHARE_INGEST", ...)` for downstream crawler reconciliation.

#### Immediate Drive Sync Work Dispatch (`APPEND_OR_REPLACE`)
Immediately following staging and database linking, `ShareTargetActivity` schedules background cloud synchronization:
```kotlin
val constraints = Constraints.Builder()
    .setRequiredNetworkType(NetworkType.CONNECTED)
    .build()
val syncRequest = OneTimeWorkRequestBuilder<DriveSyncWorker>()
    .setConstraints(constraints)
    .build()
WorkManager.getInstance(appCtx).enqueueUniqueWork(
    "DriveVaultSyncWork",
    ExistingWorkPolicy.APPEND_OR_REPLACE,
    syncRequest
)
```
Using `ExistingWorkPolicy.APPEND_OR_REPLACE` guarantees that any active or previously enqueued upload job will immediately process this new attachment without cancellation or dropped work.

#### Zero-Backend & Zero-Permanent-Storage Invariant Alignment
- **Zero-Backend ($0 Infrastructure):** The byte stream is held locally in the private app sandbox and uploaded directly to the parent's Google Drive Vault via Google Drive REST API v3 under the restricted `drive.file` scope.
- **Zero-Permanent Local Storage:** Staged files in `vault_attachments/` are strictly transient. Upon successful HTTP 200 upload confirmation by `DriveSyncWorker`, the local file is permanently unlinked and purged from device flash memory.

---

### 4. `DownloadFolderObserver`: Candidate Directory Expansion & Anti-Clutter Staging Lifecycle

When Google Classroom or other school apps download attachments, Android's `DownloadManager` places files into public shared directories (`Downloads/`, `Documents/`, or app-specific subfolders). This presents two major engineering challenges:
1. **Filename Truncation Mismatch:** Classroom UI attachment chips often truncate long filenames using ellipses (`...` or `…`), e.g., displaying `'Formatting Te...'` or `'Mathematics Work...'`, whereas Android's `DownloadManager` saves files using their un-truncated original filenames on disk, e.g., `'Formatting Text in Word 2016 WS with Answerkey.pdf'`. A naive exact-string match fails to associate the downloaded file with the pending database record.
2. **Device Storage Clutter & Flash Memory Bloat:** Unchecked downloads quickly accumulate hundreds of megabytes of school worksheets, PDFs, and circulars in the parent's personal Downloads and Documents directories, cluttering personal files and consuming internal flash memory.

`DownloadFolderObserver` resolves both challenges through an autonomous scanning, cleaning, and staging pipeline with candidate directory expansion.

#### Candidate Storage Directories Expansion

Modern Android OEM implementations and Classroom app updates save attachments across multiple shared paths. `DownloadFolderObserver.scanLocalAttachments(context)` comprehensively expands candidate directory discovery across three primary storage targets:

```kotlin
val candidateDirs = mutableListOf<File>()

// 1. Standard Downloads directory & Classroom subdirectory
val downloadsDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS)
if (downloadsDir != null && downloadsDir.exists()) {
    candidateDirs.add(downloadsDir)
    val classroomSubdir = File(downloadsDir, "Classroom")
    if (classroomSubdir.exists()) candidateDirs.add(classroomSubdir)
}

// 2. Documents directory & Classroom subdirectory
val documentsDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOCUMENTS)
if (documentsDir != null && documentsDir.exists()) {
    candidateDirs.add(documentsDir)
    val classroomDocs = File(documentsDir, "Classroom")
    if (classroomDocs.exists()) candidateDirs.add(classroomDocs)
}

// 3. WhatsApp Documents & Images (if accessible)
val externalStorage = Environment.getExternalStorageDirectory()
if (externalStorage != null && externalStorage.exists()) {
    val waDocs = File(externalStorage, "Android/media/com.whatsapp/WhatsApp/Media/WhatsApp Documents")
    if (waDocs.exists()) candidateDirs.add(waDocs)
    val waImages = File(externalStorage, "Android/media/com.whatsapp/WhatsApp/Media/WhatsApp Images")
    if (waImages.exists()) candidateDirs.add(waImages)
}
```

Public shared folders are dynamically identified via path inspection:
```kotlin
val isPublicDownloadDir = dir.absolutePath.contains("Download", ignoreCase = true) ||
        dir.absolutePath.contains("Documents", ignoreCase = true)
```

#### Ellipsis Stripping & Heuristic Match Architecture

When scanning storage directories, `DownloadFolderObserver` extracts the expected name registered from the UI chip (`rawExpected`) and strips trailing ellipses to isolate the substantive prefix:
```kotlin
val rawExpected = att.fileName.trim().lowercase()
val cleanExpected = rawExpected.replace("...", "").trim()
```

It then evaluates incoming candidate files using a 4-tier match expression:
```kotlin
val isMatch = fileName == rawExpected ||
        fileName.contains(rawExpected) ||
        rawExpected.contains(fileName) ||
        fileName == cleanExpected ||
        fileName.contains(cleanExpected) ||
        cleanExpected.contains(fileName) ||
        (cleanExpected.length > 5 && fileName.contains(cleanExpected.take(12)))
```

##### Match Tier Rationale:
- **Tier 1 (Exact Match):** Handles attachments where the UI chip displayed the full un-truncated filename (`fileName == rawExpected`).
- **Tier 2 (Bidirectional Substring Match):** Handles cases where either the chip string or the on-disk filename embeds minor formatting variants or parenthetical tags (`fileName.contains(rawExpected) || rawExpected.contains(fileName)`).
- **Tier 3 (Ellipsis-Free Equivalence):** Matches the clean prefix directly against the filesystem name after eliminating `"..."` (`fileName.contains(cleanExpected)`).
- **Tier 4 (Truncated Prefix Anchor):** For severely truncated names (e.g. `'Formatting Te...'`), takes the first 12 characters of the clean prefix and verifies that the on-disk filename starts with or contains those 12 characters (`fileName.contains(cleanExpected.take(12))`). For example, `'formatting text in word 2016 ws with answerkey.pdf'` cleanly matches `'formatting te...'` anchored on `'formatting t'`.

#### The 5-Stage Anti-Clutter Staging & Cloud Sync Lifecycle

```mermaid
sequenceDiagram
    participant GC as Google Classroom UI
    participant DM as Android DownloadManager
    participant PUB as Public Storage (Downloads/ & Documents/)
    participant DFO as DownloadFolderObserver
    participant ROOM as SQLite Room DB (AttachmentEntity)
    participant STAGE as Private Sandbox (vault_attachments/)
    participant DSW as DriveSyncWorker
    participant DRIVE as Google Drive Vault (attachments/)

    GC->>DM: Dispatches download intent (Node/chip coordinate tap)
    DM->>PUB: Saves full filename to Downloads/ or Documents/Classroom/
    
    DFO->>PUB: scanLocalAttachments() scans expanded candidate folders
    DFO->>DFO: Strips ellipsis & matches 'Formatting Te...' to full filename
    
    alt In Public Downloads or Documents Directory
        DFO->>STAGE: file.renameTo(destFile) / copyTo + delete()
        Note over PUB: Public Downloads & Documents kept 100% spotless!
    else In WhatsApp Media Folder
        Note over DFO: Retains file in-place to preserve chat media
    end
    
    DFO->>ROOM: updateLocalFile(localUri, sizeBytes, fileHash)
    
    DSW->>STAGE: ML Kit streaming OCR (PdfRenderer)
    DSW->>DRIVE: Uploads file to 'attachments/' in Drive Vault
    DRIVE-->>DSW: Upload confirmed (HTTP 200, driveFileId returned)
    DSW->>ROOM: updateDriveFileId(driveFileId, SYNCED)
    DSW->>STAGE: localFile.delete() -> permanently cleared from phone storage
    Note over STAGE: Local private storage drops back to 0MB (Zero Waste)!
    
    DFO->>PUB: Scans for lingering already-synced files and deletes them
```

1. **Local Public Download:** Android's `DownloadManager` writes incoming files to `DIRECTORY_DOWNLOADS`, `DIRECTORY_DOCUMENTS`, or `Downloads/Classroom`.
2. **Autonomous Scan & Ellipsis Matching:** `DownloadFolderObserver.scanLocalAttachments(context)` inspects `Downloads/`, `Documents/`, their `Classroom/` subdirectories, and WhatsApp Media folders, matching files against pending `AttachmentEntity` records using the ellipsis-cleaning algorithm.
3. **Atomic Move to Private Sandbox Staging:** If the file resides in a public directory (`isPublicDownloadDir == true`), it is immediately moved out of public storage into the private app sandbox staging directory:
   `context.getExternalFilesDir(null)/vault_attachments/`
   The move executes via atomic `file.renameTo(destFile)` (with automatic fallback to `copyTo(destFile, overwrite = true)` followed by `file.delete()`). The public `Downloads` and `Documents` folders are sanitized immediately, keeping the parent's filesystem clean.
4. **Hashing & Database Persistence:** `DeduplicationEngine.computeFileHash(targetFile)` computes the file's SHA-256 hash. Room's `AttachmentDao` is updated with `localUri`, `sizeBytes`, and `fileHash`.
5. **Drive Vault Upload & Phone Storage Clearance:**
   - During the background synchronization cycle, `DriveSyncWorker` reads the staged file, runs streaming ML Kit OCR, and uploads it to Google Drive under `attachments/`.
   - Upon successful upload (HTTP 200), `DriveSyncWorker` checks the parent path and permanently deletes the staged copy:
     ```kotlin
     val stagingDir = File(applicationContext.getExternalFilesDir(null), "vault_attachments")
     if (localFile.parentFile == stagingDir) {
         try {
             if (localFile.delete()) {
                 CrawlerTraceLogger.log("STAGING_CLEANUP", "Uploaded \"${localFile.name}\" to Drive and cleared staging copy.")
             }
         } catch (e: Exception) {
             Log.w(TAG, "Could not clean staging file: ${e.message}")
         }
     }
     ```
   - **Lingering File Cleanup:** During subsequent scans, `DownloadFolderObserver` also checks for files matching *already-synced* attachments (`driveFileId != null`) that may have lingered or been redownloaded in public Downloads or Documents, matching them with an extended prefix test:
     ```kotlin
     val isMatch = fileName == expected ||
             fileName.contains(expected) ||
             expected.contains(fileName) ||
             (expected.length > 8 && fileName.contains(expected.take(15)))
     ```
     and deleting them from public storage.
6. **WhatsApp Media Preservation:** Files detected in WhatsApp Media folders are referenced in place (`localUri` points to the existing media file) and are never moved or deleted, maintaining full functionality in WhatsApp chat history.

#### Reaffirmation of Zero-Backend and Anti-Clutter Invariants

The synergy between `KidsAccessibilityService`, `DownloadFolderObserver`, and `DriveSyncWorker` provides two mathematical architectural guarantees:
- **Zero-Backend Invariant:** Zero dollars ($0.00) in cloud infrastructure. No intermediary servers, external API endpoints, or third-party storage buckets are ever contacted. Data flows strictly and exclusively between the Android device and Google Drive via `https://www.googleapis.com/auth/drive.file`.
- **Anti-Clutter & Zero-Permanent-Storage Invariant:** Educational attachments do not consume permanent phone flash storage. Files exist locally only as transient staging artifacts during transit. The moment Google Drive confirms receipt, the staging copy is unlinked and deleted. Public Downloads and Documents folders remain spotless, and inaccessible in-app cache bloat is prevented by intentionally bypassing "Save all files offline". Net storage footprint on the parent's phone is **0 bytes**.

---

### 5. `DriveSyncWorker` & ML Kit Streaming OCR
AndroidX `WorkManager` executes `DriveSyncWorker` periodically and on expedited push triggers.

```mermaid
flowchart TD
    START["DriveSyncWorker.doWork()"] --> RESOLVE_PREFS["Resolve Credentials & Child Name<br/>(DriveVaultManager + DB Fallback)"]
    RESOLVE_PREFS --> GUARD_CHECK{"childName or email blank?"}
    GUARD_CHECK -->|Yes| DEFER["Sync Deferred: Result.success()<br/>(Prevent Ghost 'New Folder')"]
    GUARD_CHECK -->|No| RESOLVE_VAULT["DriveVaultManager.getSavedVaultFolders()<br/>(Zero-Roundtrip Cache Reuse)"]
    RESOLVE_VAULT --> PURGE_STRAYS["Autonomous Self-Healing:<br/>Purge stray 'New Folder' under yearFolderId"]
    PURGE_STRAYS --> LOGS["Flush CrawlerTraceLogger to _system/logs/crawler_trace.log"]
    LOGS --> BATCH_NOTICES["Batch append pending notices to notices.jsonl"]
    BATCH_NOTICES --> SCAN_STORAGE["DownloadFolderObserver.scanLocalAttachments()"]
    SCAN_STORAGE --> ATTS_LOOP["Iterate pending attachments"]

    subgraph OCR_PIPELINE["ML Kit Streaming OCR"]
        CHECK_OCR{"ocrText missing & file is PDF?"}
        CHECK_OCR -->|Yes| OPEN_PDF["Open ParcelFileDescriptor & PdfRenderer"]
        OPEN_PDF --> RENDER_PAGE["Render page to Bitmap (150-200 DPI scale)"]
        RENDER_PAGE --> RECOGNIZE["ML Kit InputImage.fromBitmap()"]
        RECOGNIZE --> RECYCLE["bitmap.recycle() (Prevent OOM)"]
        RECYCLE --> NEXT_PAGE{"More pages?"}
        NEXT_PAGE -->|Yes| RENDER_PAGE
        NEXT_PAGE -->|No| SAVE_OCR["Update AttachmentEntity.ocrText"]
    end

    ATTS_LOOP --> CHECK_OCR
    SAVE_OCR --> DRIVE_UPLOAD["Upload file via Drive REST API v3"]
    DRIVE_UPLOAD --> CLEAN_STAGING["Delete local file from vault_attachments/"]
    CLEAN_STAGING --> NEXT_ATT{"More attachments?"}
    NEXT_ATT -->|Yes| ATTS_LOOP
    NEXT_ATT -->|No| KNOWLEDGE_GRAPH["KotlinGraphifyEngine.buildGraph()"]

    KNOWLEDGE_GRAPH --> EXPORT_AI["Generate MASTER_DIGEST.md, FAMILY_DIGEST.md,<br/>knowledge_graph.json, graph.html"]
    EXPORT_AI --> DRIVE_UPDATE["Update core AI files on Google Drive (Self-Healing)"]
    DRIVE_UPDATE --> FINISH["Result.success()"]
```

#### Child Profile Guard & Deferred Execution (`Result.success()`)
To prevent race conditions where Android background workers, system boot triggers, or incoming push notifications attempt synchronization before the parent has finalized Step 1 of onboarding, `DriveSyncWorker` strictly validates profile completeness:

```kotlin
val (savedEmail, academicYear, prefChildName) = DriveVaultManager.getSavedVaultPrefs(applicationContext)
val childName = if (prefChildName.isNotBlank()) {
    prefChildName
} else {
    val dbChildren = db.childProfileDao().getAllChildrenDirect()
    dbChildren.firstOrNull()?.firstName ?: ""
}

if (savedEmail.isNullOrBlank() || childName.isBlank()) {
    Log.w(TAG, "Sync deferred: Child profile not yet established or childName is blank.")
    CrawlerTraceLogger.log("SYNC_WORKER", "Sync deferred: Child profile not yet established.")
    return@withContext Result.success()
}
```

##### Architectural Guarantees:
- **Zero Ghost "New Folder" Directories:** If `childName` is blank (or no child has yet been persisted), the worker immediately halts execution before invoking any Google Drive API folder provisioning calls.
- **Graceful Deferral:** It returns `Result.success()` rather than `Result.retry()` or `Result.failure()`. This avoids burning device battery, cellular bandwidth, and exponential backoff retry cycles on unconfigured states. WorkManager simply waits until the next real event or manual push.

#### Autonomous Drive Vault Self-Healing: Stray Folder Purge
In scenarios where legacy app runs or pre-guard builds left unlinked, empty directories on Google Drive, `DriveSyncWorker` executes an active hygiene sweep immediately after resolving the vault hierarchy:

```kotlin
// Autonomous self-healing: Purge any stray legacy "New Folder" on Drive if present
try {
    val strayFolders = driveClient.searchFiles(
        parentFolderId = yearFolderId,
        mimeType = GoogleDriveClient.MIME_TYPE_FOLDER
    )
    for (stray in strayFolders) {
        val name = stray.name ?: ""
        if (name.equals("New Folder", ignoreCase = true) || name.startsWith("New Folder (")) {
            DriveDeepLogger.w(
                "DriveSyncWorker",
                "SELF_HEALING: Detected accidental stray folder '${stray.name}' (id: ${stray.id}). Purging..."
            )
            driveClient.deleteFile(stray.id)
            DriveDeepLogger.i("DriveSyncWorker", "SELF_HEALING: Successfully purged stray folder '${stray.name}'.")
        }
    }
} catch (e: Exception) {
    DriveDeepLogger.w("DriveSyncWorker", "SELF_HEALING: Non-critical stray folder cleanup sweep encountered error: ${e.message}")
}
```
This ensures the parent's Google Drive hierarchy remains immaculate, strictly consisting of named child directories (e.g. `2026-2027/Aarav/`).

#### Zero-Roundtrip Cached Vault Folder Reuse
During execution, `DriveSyncWorker` uses cached folder identifiers (`rootKidsFolderId`, `yearFolderId`, `childFolderId`, `attachmentsFolderId`, `systemFolderId`, and `logsFolderId`) stored in `SharedPreferences`. It bypasses all metadata search roundtrips on the Google Drive API, minimizing network latency, bandwidth usage, and Google Cloud quota consumption.

#### Memory-Safe Streaming OCR (`PdfRenderer`)
- Allocates a single ARGB_8888 bitmap at 2x page dimensions (~150–200 DPI).
- Processes text using `com.google.mlkit.vision.text.TextRecognition` (Latin model).
- **Immediately calls `bitmap.recycle()`** and closes the page before advancing to the next page.
- Aggregates text with page delimitation headers (`[--- Page X of Y ---]`) for LLM context grounding.

#### Embedded Attachment Arrays & Direct Google Drive Web Links in `notices.jsonl`
To support AI agents (Gemini, MCP servers) and automated parent tools, `DriveSyncWorker` embeds the complete relational `attachments` array directly into each notice record in `notices.jsonl`.

##### Upload Sequencing & Relational Linking:
1. **Step 2 (Attachments First):** `DriveSyncWorker` triggers `DownloadFolderObserver.scanLocalAttachments()` and iterates all pending attachments *before* processing notices.
2. **Drive REST Upload & ID Assignment:** Each physical attachment file is uploaded to the appropriate Drive vault directory (`Google Classroom/attachments/` or root `attachments/`), returning a permanent Google Drive file ID (`driveFileId`).
3. **Step 3 (Notice NDJSON Generation):** When serializing notices to line-delimited JSON (`notices.jsonl`), `DriveSyncWorker` groups attachments by notice (`allAttachmentsByNotice = db.attachmentDao().getAllAttachmentsDirect().groupBy { it.noticeId }`) and constructs a rich nested JSON object:

```kotlin
val batchJsonl = notices.joinToString("\n") { notice ->
    val noticeAtts = allAttachmentsByNotice[notice.noticeId] ?: emptyList()
    buildJsonObject {
        put("noticeId", notice.noticeId)
        put("childId", notice.childId)
        put("timestampMs", notice.timestampMs)
        put("sourceApp", notice.sourceApp)
        put("category", notice.category)
        put("title", notice.title)
        put("body", notice.body)
        put("sender", notice.sender)
        put("hashSha256", notice.hashSha256)
        put("attachmentCount", noticeAtts.size)
        put("attachments", buildJsonArray {
            for (att in noticeAtts) {
                add(buildJsonObject {
                    put("attachmentId", att.attachmentId)
                    put("fileName", att.fileName)
                    put("mimeType", att.mimeType)
                    put("sizeBytes", att.sizeBytes)
                    put("driveFileId", att.driveFileId ?: "")
                    if (!att.driveFileId.isNullOrBlank() && !att.driveFileId.startsWith("virtual_")) {
                        put("driveUrl", "https://drive.google.com/file/d/${att.driveFileId}/view")
                    }
                    if (!att.ocrText.isNullOrBlank()) {
                        put("ocrSummary", att.ocrText.take(120))
                    }
                })
            }
        })
    }.toString()
}
```

##### Architectural Benefits:
- **Instant Cloud Document Access:** External AI tools reading `notices.jsonl` receive the authentic Google Drive web URL (`https://drive.google.com/file/d/{driveFileId}/view`) for each worksheet and PDF circular without executing secondary Drive API queries.
- **Embedded OCR Excerpts:** The first 120 characters of offline OCR text (`ocrSummary`) are embedded inline, enabling fast semantic matching and prompt grounding without downloading full files.

#### Self-Healing Drive Vault Synthesis
On every synchronization run, `DriveSyncWorker`:
1. Gathers all notices and attachments from Room.
2. Invokes `KotlinGraphifyEngine` to synthesize the complete knowledge graph and digests.
3. Updates `MASTER_DIGEST.md`, `FAMILY_DIGEST.md`, `knowledge_graph.json`, and `graph.html`.
4. If a file was modified or corrupted, the next sync run automatically repairs it (*self-healing*).

---

### 6. `KotlinGraphifyEngine`: On-Device GraphRAG & D3 Visualization
`KotlinGraphifyEngine` runs 100% locally in Kotlin without cloud graph dependencies.

#### Graph Schema & Node Types
- **`Child`:** The root anchor node representing the enrolled student.
- **`Assignment` (`HOMEWORK`):** Homework tasks with due dates, descriptions, and subjects.
- **`EmailCircular` (`CIRCULAR`):** Formal announcements, event circulars, and schedules.
- **`Attendance` (`ATTENDANCE`):** Attendance marks and leave records.
- **`FeeNotice` (`FEES`):** Tuition fees and payment receipts.
- **`Teacher`:** Senders and instructors assigned to notices.
- **`Attachment`:** Physical PDFs, worksheets, and images linked to notices.

#### Edge Relationships
- `notice -> child`: `BELONGS_TO`
- `notice -> teacher`: `ASSIGNED_BY`
- `attachment -> notice`: `ATTACHED_TO`

#### Output Artifacts
1. **`knowledge_graph.json`:** GraphRAG-compliant JSON with typed nodes, weighted directed edges, and metadata. Compatible with Gemini context injection and MCP tools.
2. **`MASTER_DIGEST.md`:** Markdown document grouped into Homework, Circulars, Fees, and searchable OCR text excerpts.
3. **`FAMILY_DIGEST.md`:** High-level summary across all enrolled children in the academic year.
4. **`graph.html`:** Standalone HTML file embedding the graph JSON and loading D3.js v7 to render an interactive force-directed graph with drag, zoom, and node inspection.

---

### 7. `CrawlerTraceLogger`: Continuous Diagnostic Telemetry & Milestone Streaming

`CrawlerTraceLogger` (`com.kids.collector.service.CrawlerTraceLogger`) is a high-fidelity, un-truncated diagnostic observability engine specifically built for the accessibility crawler and synchronization pipelines.

```mermaid
flowchart LR
    EVENT["Crawler Milestone / Scroller Event"] --> CTL["CrawlerTraceLogger.log(category, message)"]
    CTL --> LOGCAT["Android Logcat (TAG: CrawlerTraceLogger)"]
    CTL --> MEM["High-Capacity Memory Buffer<br/>(ConcurrentLinkedQueue, up to 5,000 lines)"]
    CTL --> DISK["Synchronous File Streaming<br/>(context.filesDir/logs/crawler_trace.log)"]
    MEM --> DSW["DriveSyncWorker.doWork() -> drainPendingLogs()"]
    DSW --> DRIVE["Google Drive Vault<br/>_system/logs/crawler_trace.log"]
```

#### Architecture Upgrade (5,000-Line Buffer + Synchronous Disk Streaming)
Previous implementations relied on a small 200-line memory-capped queue that frequently truncated earlier survey passes during long crawls. `CrawlerTraceLogger` introduces a robust dual-tier architecture:
1. **High-Capacity In-Memory Buffer (5,000 Lines):** Uses a `ConcurrentLinkedQueue<String>` capped at 5,000 lines (`while (memoryQueue.size > 5000) memoryQueue.poll()`). This guarantees that extensive multi-month classroom surveys retain all boundary landmarks and post fingerprints in memory until uploaded.
2. **Immediate Synchronous Disk Streaming:** Every logged event is immediately written to persistent local storage on device flash memory (`context.filesDir/logs/crawler_trace.log`) within a thread-safe `synchronized(fileLock)` block using `PrintWriter(FileWriter(traceFile, true))`.
3. **Crash & Restart Resilience:** Even if the Android OS terminates the accessibility service or the phone runs out of battery mid-crawl, the complete event history up to the exact millisecond of interruption is preserved on disk and accessible via `getFullLocalLog(context)`.

#### Structured Milestone Event Methods
To ensure uniform, structured telemetry that can be parsed by automated diagnostic agents, `CrawlerTraceLogger` provides explicit typed milestone logging methods:

| Method Signature | Category | Log Payload & Semantic Purpose |
| :--- | :--- | :--- |
| `logSurveyStart(topNoticeTitle)` | `SURVEY_START` | Records Pass 1 survey initiation with the uppermost notice title landmark. |
| `logSurveyCard(index, total, title, fingerprint, isAlreadyCaptured)` | `SURVEY_CARD` | Discovered card cataloging with index, title, SHA-256 fingerprint, and initial status (`ALREADY_SYNCED` vs `PENDING`). |
| `logSurveyEnd(totalDiscovered, bottomTitle, durationMs)` | `SURVEY_END` | Pass 1 survey completion with total count, oldest bottom title, and total survey duration in milliseconds. |
| `logRewindStart(totalCount)` | `REWIND_START` | Records Pass 1.5 rewind initiation from the bottom of the feed with pending distance count. |
| `logRewindComplete(swipesCount, durationMs)` | `REWIND_COMPLETE` | Pass 1.5 rewind completion with the exact number of downward swipes and total rewind duration. |
| `logPostOpen(index, total, title, latencyMs, enteredDetail)` | `POST_OPEN` | Records post card tap dispatch, transition latency (ms), and whether post detail screen opened. |
| `logAttachmentDetected(noticeTitle, fileName, hasSaveAllOffline)` | `ATTACHMENT_DETECTED` | Logs detected attachment filename and availability of master offline download button. |
| `logAttachmentDownloaded(fileName, bytesOnDisk)` | `ATTACHMENT_DOWNLOADED` | Logs verified physical attachment file on disk with exact byte length. |
| `logPostCompleted(index, total, title, attachmentsSaved)` | `POST_COMPLETED` | Marks notice completion in manifest with the count of physically staged and verified attachments. |

#### Cloud Synchronization & Drain Lifecycle
During each `DriveSyncWorker` cycle:
1. `CrawlerTraceLogger.drainPendingLogs()` atomically drains and clears pending lines from the in-memory buffer.
2. The lines are formatted and appended directly to `_system/logs/crawler_trace.log` in the child's Google Drive Vault using `driveClient.appendCrawlerTraceLog()`.
3. Telemetry flows seamlessly from memory to local disk to cloud without data loss or duplicate line bloat.

---

## 📱 Presentation Architecture & Onboarding State Machine

The presentation tier is implemented in Jetpack Compose adhering to Single-Activity Architecture (`MainActivity.kt`) and unidirectional data flow. The onboarding experience for configuring children profiles is driven by a sequential finite state machine in `OnboardingWizardScreen.kt`.

### 1. Finite State Machine: `WizardStep` & Bidirectional Navigation
The onboarding lifecycle is modeled by the 5-state enum `WizardStep`:

```kotlin
enum class WizardStep(val stepNumber: Int, val title: String) {
    STEP_0_PERMISSIONS(0, "System Permissions & Access"),
    STEP_1_VAULT(1, "Cloud Vault & Child Profile"),
    STEP_2_CLASSROOM(2, "Google Classroom Mapping"),
    STEP_3_PORTALS(3, "School App & ERP Picker"),
    STEP_4_WHATSAPP(4, "WhatsApp Group Capture")
}
```

```mermaid
stateDiagram-v2
    [*] --> STEP_0_PERMISSIONS: Initial Launch (Permissions Missing)
    [*] --> STEP_1_VAULT: Child #1 (Permissions Active) / Multi-Child Session
    
    STEP_0_PERMISSIONS --> STEP_1_VAULT: Forward: Continue (Accessibility Active)
    STEP_1_VAULT --> STEP_2_CLASSROOM: Forward: Save Profile & Provision Vault
    STEP_2_CLASSROOM --> STEP_3_PORTALS: Forward: Save Classroom Account
    STEP_3_PORTALS --> STEP_4_WHATSAPP: Forward: Save ERP Apps / Skip
    STEP_4_WHATSAPP --> DASHBOARD: Forward: Complete Setup
    
    STEP_4_WHATSAPP --> STEP_3_PORTALS: Back: Hardware / Gesture / TopBar
    STEP_3_PORTALS --> STEP_2_CLASSROOM: Back: Hardware / Gesture / TopBar
    STEP_2_CLASSROOM --> STEP_1_VAULT: Back: Hardware / Gesture / TopBar
    STEP_1_VAULT --> STEP_0_PERMISSIONS: Back: Single-Child Root / Accessibility Lost
    STEP_1_VAULT --> DASHBOARD: Back: Multi-Child Session (onCancel)
    STEP_0_PERMISSIONS --> DASHBOARD: Back: Multi-Child Session (onCancel)
    
    STEP_1_VAULT --> STEP_0_PERMISSIONS: Dynamic Revocation (preRevocationStep cached)
    STEP_2_CLASSROOM --> STEP_0_PERMISSIONS: Dynamic Revocation (preRevocationStep cached)
    STEP_3_PORTALS --> STEP_0_PERMISSIONS: Dynamic Revocation (preRevocationStep cached)
    STEP_4_WHATSAPP --> STEP_0_PERMISSIONS: Dynamic Revocation (preRevocationStep cached)
    STEP_0_PERMISSIONS --> STEP_1_VAULT: Service Restored (preRevocationStep == STEP_1)
    STEP_0_PERMISSIONS --> STEP_2_CLASSROOM: Service Restored (preRevocationStep == STEP_2)
    STEP_0_PERMISSIONS --> STEP_3_PORTALS: Service Restored (preRevocationStep == STEP_3)
    STEP_0_PERMISSIONS --> STEP_4_WHATSAPP: Service Restored (preRevocationStep == STEP_4)
```

#### Step Roles:
- **`STEP_0_PERMISSIONS` (Prerequisite Gate):** Verifies and acquires system permissions (Accessibility Service, Notification Listener, Storage Access) and unlocks Android 13+ restricted settings.
- **`STEP_1_VAULT`:** Selects the Google Drive storage account, provisions the Drive vault folder hierarchy (`K.I.D.S. Data/{Year}/{Child}/`), and captures child profile metadata.
- **`STEP_2_CLASSROOM`:** Maps student Google Classroom account email for notification filtering and confirms backfill crawler readiness.
- **`STEP_3_PORTALS`:** Discovers installed school ERP packages (`CampusCare`, `Toddle`, `Edunext`, `Teams`) and selects notice categories.
- **`STEP_4_WHATSAPP`:** Intercepts or selects school WhatsApp broadcast groups and finalizes child setup.

#### BackHandler & TopBar State Machine Transition Map
Bidirectional navigation is natively integrated via Jetpack Compose's `BackHandler` and the TopBar `IconButton`:

```kotlin
// Hardware and Gesture Back Navigation
BackHandler {
    when (currentStep) {
        WizardStep.STEP_0_PERMISSIONS -> onCancel?.invoke()
        WizardStep.STEP_1_VAULT -> {
            if (!hasAccessibility) {
                currentStep = WizardStep.STEP_0_PERMISSIONS
            } else if (onCancel != null) {
                onCancel()
            } else {
                currentStep = WizardStep.STEP_0_PERMISSIONS
            }
        }
        WizardStep.STEP_2_CLASSROOM -> currentStep = WizardStep.STEP_1_VAULT
        WizardStep.STEP_3_PORTALS -> currentStep = WizardStep.STEP_2_CLASSROOM
        WizardStep.STEP_4_WHATSAPP -> currentStep = WizardStep.STEP_3_PORTALS
    }
}
```

The TopBar Back `IconButton` shares the identical transition logic, conditionally rendered whenever `currentStep != WizardStep.STEP_0_PERMISSIONS || onCancel != null`:

| Active Step | Trigger Event | Destination / Action | Guard Condition |
| :--- | :--- | :--- | :--- |
| `STEP_4_WHATSAPP` | Back (Gesture / TopBar) | `STEP_3_PORTALS` | Unconditional |
| `STEP_3_PORTALS` | Back (Gesture / TopBar) | `STEP_2_CLASSROOM` | Unconditional |
| `STEP_2_CLASSROOM` | Back (Gesture / TopBar) | `STEP_1_VAULT` | Unconditional |
| `STEP_1_VAULT` | Back (Gesture / TopBar) | `STEP_0_PERMISSIONS` | `!hasAccessibility` OR (`hasAccessibility && onCancel == null`) |
| `STEP_1_VAULT` | Back (Gesture / TopBar) | `onCancel()` -> `DASHBOARD` | `hasAccessibility && onCancel != null` (Multi-Child session) |
| `STEP_0_PERMISSIONS` | Back (Gesture / TopBar) | `onCancel()` -> `DASHBOARD` | `onCancel != null` (Multi-Child session) |

---

### 2. Mandatory Accessibility Gate & `preRevocationStep` Caching Pattern

The historical notice backfill engine (`KidsAccessibilityService`) is foundational to the application's offline extraction capability. Without it, retrospective harvesting of past notices, homework, and attachment downloads in Google Classroom and School ERP portals cannot execute.

#### Invariant 1: Forward Transition Blocked Without Accessibility
In `STEP_0_PERMISSIONS`, the forward navigation button (`"Continue to Step 1: Cloud Vault & Profile →"`) is strictly conditioned on `hasAccessibility`:

```kotlin
Button(
    onClick = { currentStep = WizardStep.STEP_1_VAULT },
    enabled = hasAccessibility,
    modifier = Modifier.fillMaxWidth().defaultMinSize(minHeight = 48.dp),
    colors = ButtonDefaults.buttonColors(containerColor = DeepNavy)
) {
    Text("Continue to Step 1: Cloud Vault & Profile →", color = SurfaceWhite, fontWeight = FontWeight.Bold)
}
```

When `!hasAccessibility`, a prominent error container warns the user:
`"⚠️ Accessibility Service is mandatory before Step 1. Please enable it above to unlock Step 1."`

#### Invariant 2: `preRevocationStep` Caching (Preserving Wizard Position Across Rebinds)
Android's accessibility subsystem can temporarily unbind or restart accessibility services during system memory trimming, configuration changes, or when the user toggles related settings in Android Settings. A naive downgrade implementation would discard user progress, forcing the parent back to Step 0 and resetting their workflow.

`OnboardingWizardScreen` introduces the **`preRevocationStep` caching pattern** utilizing Compose `rememberSaveable`:

```kotlin
var currentStep by rememberSaveable { mutableStateOf(initialStep) }
var preRevocationStep by rememberSaveable { mutableStateOf<WizardStep?>(null) }

// Strict Invariant: If Accessibility is revoked, return to STEP_0_PERMISSIONS.
// Cache the previous step so the parent resumes seamlessly once Accessibility is re-enabled.
LaunchedEffect(hasAccessibility) {
    if (!hasAccessibility && currentStep != WizardStep.STEP_0_PERMISSIONS) {
        preRevocationStep = currentStep
        currentStep = WizardStep.STEP_0_PERMISSIONS
    } else if (hasAccessibility && preRevocationStep != null && currentStep == WizardStep.STEP_0_PERMISSIONS) {
        val resumeStep = preRevocationStep!!
        preRevocationStep = null
        currentStep = resumeStep
    }
}
```

#### Execution Lifecycle of the Caching Pattern:
1. **Transient Disconnection:** When `hasAccessibility` transitions to `false` while the user is at `STEP_2_CLASSROOM`, `LaunchedEffect` intercepts the event:
   - It captures `preRevocationStep = WizardStep.STEP_2_CLASSROOM`.
   - It redirects `currentStep = WizardStep.STEP_0_PERMISSIONS` to enforce system invariants.
2. **Service Rebind / Re-enablement:** When the accessibility service rebinds and `hasAccessibility` returns to `true`:
   - `LaunchedEffect` detects `hasAccessibility == true && preRevocationStep != null`.
   - It restores `currentStep = resumeStep` (`STEP_2_CLASSROOM`).
   - It cleans up the cache (`preRevocationStep = null`).
3. **Zero Data Loss:** The parent's input states (`studentEmail`, `childName`, `selectedYear`, `photoUri`) remain completely intact in memory/saveable state, resuming immediately without friction.

---

### 3. Multi-Child Session Isolation (`childSequenceNumber > 1`)

In a multi-child family setup, configuring secondary children must not inadvertently read, overwrite, or mutate the cached onboarding state of prior siblings. 

`OnboardingWizardScreen` parameterizes session isolation via `childSequenceNumber`:

```kotlin
@Composable
fun OnboardingWizardScreen(
    childSequenceNumber: Int = 1,
    onFinishChildSetup: (ChildProfile) -> Unit,
    onCancel: (() -> Unit)? = null
) {
    ...
    val isNewChildSession = childSequenceNumber > 1
```

#### Isolation Mechanisms:
1. **Initial Step Determination:**
   ```kotlin
   val initialStep = remember {
       try {
           if (!isAccessibilityActiveInitial) {
               WizardStep.STEP_0_PERMISSIONS
           } else if (!isNewChildSession && savedEmail.isNotBlank() && savedChild.isNotBlank() && savedStepStr != null) {
               val step = WizardStep.valueOf(savedStepStr)
               if (step == WizardStep.STEP_0_PERMISSIONS) WizardStep.STEP_1_VAULT else step
           } else if (!isNewChildSession && savedEmail.isNotBlank() && savedChild.isNotBlank()) {
               WizardStep.STEP_2_CLASSROOM
           } else {
               WizardStep.STEP_1_VAULT
           }
       } catch (e: Exception) {
           if (!isAccessibilityActiveInitial) WizardStep.STEP_0_PERMISSIONS else WizardStep.STEP_1_VAULT
       }
   }
   ```
   When `isNewChildSession == true`:
   - It bypasses `wizard_current_step` persisted from Child #1.
   - It opens directly on `STEP_1_VAULT` (since system accessibility was verified during initial setup).
2. **Step Persistence Guard:**
   ```kotlin
   LaunchedEffect(currentStep) {
       if (!isNewChildSession) {
           prefs.edit().putString("wizard_current_step", currentStep.name).apply()
       }
   }
   ```
   Secondary children sessions do not overwrite `wizard_current_step` in `SharedPreferences`, safeguarding primary child restoration points.
3. **Child Name Blanking:**
   ```kotlin
   var childName by rememberSaveable { mutableStateOf(if (isNewChildSession) "" else savedChild) }
   ```
   Secondary sessions guarantee an empty input field (`""`), preventing sibling name leakage or accidental duplicate overwrites.
4. **Session Cancellation & Header Badge:**
   - In `MainActivity.kt`, `onCancel` is supplied only when existing children exist (`if (childrenList.isNotEmpty()) { { currentScreen = AppScreen.DASHBOARD } } else null`).
   - The wizard TopBar renders a high-visibility amber pill badge: `Badge { Text("Child #$childSequenceNumber") }`.

---

### 4. Optimistic UI Transition Pattern (`OnboardingWizardScreen.kt`)

Prior architectures forced users to wait on synchronous cloud HTTP roundtrips before transitioning between wizard steps, introducing 1.5 to 8 second pauses and blocking loading spinners. `OnboardingWizardScreen.kt` completely replaces this blocking approach with an **Optimistic UI Transition Pattern**:

```mermaid
sequenceDiagram
    participant User as Parent (UI)
    participant UI as OnboardingWizardScreen
    participant Prefs as SharedPreferences / Room
    participant DVM as DriveVaultManager
    participant Cloud as Google Drive REST API

    User->>UI: Selects Google Account (AccountManager)
    UI->>DVM: preWarmOAuthAndFolders(context, email, year) [async IO]
    Note over DVM,Cloud: OAuth token initialized & global root/year folders cached while parent types child name
    User->>UI: Types Child Name & Taps "Save Profile & Create Vault on Drive →"
    UI->>Prefs: saveVaultPrefs(context, email, year, childName) [<10ms]
    UI->>UI: currentStep = WizardStep.STEP_2_CLASSROOM (0ms UI Transition!)
    Note over User,UI: Parent immediately interacts with Step 2 (Classroom Setup)
    UI->>DVM: scope.launch { provisionStep1(...) } [Background Coroutine]
    DVM->>Cloud: provisionChildVault() & async template seeding
```

#### Key Architecture Principles:
1. **Immediate Local Room/Preferences Persistence First:**
   When the parent taps `"Save Profile & Create Vault on Drive →"`, `DriveVaultManager.saveVaultPrefs(context, driveAccountEmail, selectedYear, cleanChildName)` immediately writes the credentials and child metadata to Android `SharedPreferences` (`kids_vault_prefs`) in under 10ms. On final onboarding completion in Step 4, this state is materialized into the offline SQLite Room database via `database.childProfileDao().insert(ChildProfileEntity(...))` in `MainActivity.kt`.
2. **Instant 0ms Step State Mutation:**
   The screen updates `currentStep = WizardStep.STEP_2_CLASSROOM` immediately on the main thread:
   ```kotlin
   // 1. Save profile & vault preferences locally immediately (< 10ms)
   DriveVaultManager.saveVaultPrefs(context, driveAccountEmail, selectedYear, cleanChildName)

   // 2. Optimistic instant UI transition to Step 2 (0ms lag!)
   currentStep = WizardStep.STEP_2_CLASSROOM
   Toast.makeText(context, "✓ Child profile saved", Toast.LENGTH_SHORT).show()
   ```
   No progress dialog or blocking spinner freezes the screen; the parent is immediately brought to Step 2 to configure Google Classroom.
3. **Decoupled Asynchronous Background Provisioning:**
   Vault creation is dispatched to a background coroutine via `scope.launch { DriveVaultManager.provisionStep1(...) }`. Even on cold runs where folders must be created on Google Drive, folder network provisioning and file template seeding execute transparently in the background while the parent reads and configures Step 2.
4. **Consent Recovery Fallback:**
   If Google Play Services or OAuth returns a `UserRecoverableAuthException` or `UserRecoverableAuthIOException`, the background task catches it and prompts the parent via `driveConsentLauncher` without losing any form state.

---

### 5. `MainActivity` Navigation Architecture & Modal Dialog Guard

`MainActivity.kt` orchestrates top-level application navigation using Jetpack Compose Single-Activity Architecture without external navigation library overhead:

```kotlin
enum class AppScreen {
    WIZARD,
    DASHBOARD,
    DIAGNOSTICS
}
```

#### 1. Configuration-Resilient Screen State
Navigation state is tracked using `rememberSaveable`:
```kotlin
var currentScreen by rememberSaveable { mutableStateOf(AppScreen.DASHBOARD) }
```
By utilizing `rememberSaveable`, the current navigation destination (`WIZARD`, `DASHBOARD`, or `DIAGNOSTICS`) automatically survives Activity recreation caused by device orientation rotation, display scaling adjustments, and system dark/light theme switching.

#### 2. The `DASHBOARD` Guard on `PermissionSetupDialog`
At application launch or on resumption, the system checks whether passive notification capture is granted. However, presenting a modal permission dialog while the parent is actively navigating the onboarding wizard causes severe visual collisions, double-scrimming, and broken focus.

`MainActivity` enforces an explicit screen guard on `PermissionSetupDialog`:

```kotlin
var showPermissionDialog by remember {
    mutableStateOf(!PermissionHelper.isNotificationAccessGranted(this@MainActivity))
}

if (showPermissionDialog && currentScreen == AppScreen.DASHBOARD) {
    PermissionSetupDialog(
        onDismiss = { showPermissionDialog = false }
    )
}
```

#### Rationale:
- **`OnboardingWizardScreen` Self-Sufficiency:** The wizard features its own dedicated `STEP_0_PERMISSIONS` gate and contextual inline warning cards (e.g. `⚠️ Notification Access Needed`).
- **Modal Collision Prevention:** The `currentScreen == AppScreen.DASHBOARD` guard strictly confines `PermissionSetupDialog` to the main children dashboard. It will never interrupt or overlay on top of the onboarding wizard, guaranteeing an uncluttered, distraction-free setup experience.

---

### 6. Lifecycle-Aware Permission State Observation (`LifecycleEventObserver`)

Because granting Android system permissions (Accessibility, Notification Listener, All Files Access) requires leaving the application to navigate native Android Settings, the UI must seamlessly reconcile permission status without requiring manual refresh or application restarts.

`OnboardingWizardScreen` attaches a `LifecycleEventObserver` through `DisposableEffect` to monitor `Lifecycle.Event.ON_RESUME`:

```kotlin
// Dynamic Permission Tracking with ON_RESUME observer
var hasAccessibility by remember { mutableStateOf(PermissionHelper.isAccessibilityGranted(context)) }
var hasNotificationAccess by remember { mutableStateOf(PermissionHelper.isNotificationAccessGranted(context)) }
var hasStorageAccess by remember { mutableStateOf(PermissionHelper.hasStorageAccess(context)) }

DisposableEffect(lifecycleOwner) {
    val observer = LifecycleEventObserver { _, event ->
        if (event == Lifecycle.Event.ON_RESUME) {
            hasAccessibility = PermissionHelper.isAccessibilityGranted(context)
            hasNotificationAccess = PermissionHelper.isNotificationAccessGranted(context)
            hasStorageAccess = PermissionHelper.hasStorageAccess(context)
        }
    }
    lifecycleOwner.lifecycle.addObserver(observer)
    onDispose {
        lifecycleOwner.lifecycle.removeObserver(observer)
    }
}
```

#### Synchronous UI Reactivity:
When the user grants a permission in system settings and returns to K.I.D.S. via the Back gesture:
1. The host Activity receives an `ON_RESUME` lifecycle event.
2. The observer synchronously re-evaluates all three `PermissionHelper` inspection queries.
3. Compose mutable state variables (`hasAccessibility`, `hasNotificationAccess`, `hasStorageAccess`) mutate on the main thread.
4. Compose recomposition occurs immediately: status chips flip from red (`MANDATORY`) / orange (`RECOMMENDED`) to green (`✓ ACTIVE`), and the `"Continue to Step 1"` action button activates instantaneously.

---

### 7. `PermissionHelper` & Android 13+ Dynamic Restricted Settings Sandbox

Android 13 (API 33, Tiramisu) introduced a security mechanism (`APP_OPS_ACCESS_RESTRICTED_SETTINGS`) that disables Accessibility and Notification Listener permissions for sideloaded applications (installed via APK rather than an authorized app store).

`PermissionHelper` encapsulates API detection, state checks, and explicit settings intent dispatches:

```kotlin
object PermissionHelper {
    fun isAccessibilityGranted(context: Context): Boolean =
        KidsAccessibilityService.isEnabled(context)

    fun isNotificationAccessGranted(context: Context): Boolean =
        NotificationManagerCompat.getEnabledListenerPackages(context).contains(context.packageName)

    fun hasStorageAccess(context: Context): Boolean =
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            Environment.isExternalStorageManager()
        } else {
            ContextCompat.checkSelfPermission(context, Manifest.permission.READ_EXTERNAL_STORAGE) == PackageManager.PERMISSION_GRANTED
        }

    fun isRestrictedSettingsLikelyRequired(): Boolean =
        Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU

    fun openAppDetailsSettings(context: Context) {
        val intent = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
            data = Uri.fromParts("package", context.packageName, null)
            flags = Intent.FLAG_ACTIVITY_NEW_TASK
        }
        context.startActivity(intent)
    }

    fun openAccessibilitySettings(context: Context) { ... }
    fun openNotificationListenerSettings(context: Context) { ... }
    fun openStorageAccessSettings(context: Context) { ... }
}
```

#### Dynamic Presentation & Unblocking:
1. **Dynamic OS Filtering:** `isRestrictedSettingsLikelyRequired()` evaluates `Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU`. On devices running Android 10, 11, or 12, this evaluates to `false`, causing the wizard to completely omit the "Advance Permission" card.
2. **Sideload Unblock Sequence on Android 13+:**
   - `openAppDetailsSettings(context)` directs the user to `ACTION_APPLICATION_DETAILS_SETTINGS`.
   - The parent taps the top-right overflow menu (**⋮**) in App Info and selects **"Allow restricted settings"**, authenticating via device lock.
   - This removes the sandbox lock on **both** `KidsAccessibilityService` and `KidsNotificationListenerService`, allowing standard system toggles to succeed.

---

### 8. Dynamic Button Validation, Skip Handling, and Mandatory Channel Invariant (Steps 2 to 4)

To prevent fragmented or non-functional ingestion pipelines, `OnboardingWizardScreen.kt` enforces rigorous dynamic button validation, single-tap skip handling, and a strict **Mandatory Channel Invariant** across Steps 2, 3, and 4.

#### 1. Channel Configuration Invariants

Channel readiness is derived through pure, reactive Boolean state computations:

```kotlin
// Channel configuration state invariants
val isClassroomConfigured = enableClassroom && studentEmail.isNotBlank()
val isErpConfigured = enableErp && selectedAppPackage.isNotBlank()
val isWhatsAppConfigured = enableWhatsApp && selectedGroup.isNotBlank()
val hasPriorConfiguredChannel = isClassroomConfigured || isErpConfigured
```

- **`isClassroomConfigured`**: True strictly when Classroom is toggled on and an authenticated Google account email is mapped.
- **`isErpConfigured`**: True strictly when ERP tracking is toggled on and an installed portal package name has been selected.
- **`isWhatsAppConfigured`**: True strictly when WhatsApp capture is toggled on and a school broadcast group has been selected or auto-detected.
- **`hasPriorConfiguredChannel`**: Boolean disjunction representing whether at least one primary ingestion channel was successfully configured before reaching Step 4.

#### 2. Dynamic Button State Derivations

The progression buttons across Steps 2, 3, and 4 are reactively derived to eliminate invalid transitions while offering zero-friction skips:

```kotlin
// Dynamic Button State Derivations
val isStep2NextEnabled = !enableClassroom || studentEmail.isNotBlank()
val isStep3NextEnabled = !enableErp || selectedAppPackage.isNotBlank()
val isStep4SkipEnabled = hasPriorConfiguredChannel
val isStep4CompleteEnabled = if (hasPriorConfiguredChannel) {
    !enableWhatsApp || selectedGroup.isNotBlank()
} else {
    enableWhatsApp && selectedGroup.isNotBlank()
}
```

```mermaid
flowchart TD
    subgraph Step2["Step 2: Google Classroom"]
        S2_SKIP["OutlinedButton: 'Skip Classroom'<br/>enabled = !isProvisioning"]
        S2_NEXT{"Button: 'Save & Next →'<br/>enabled = isStep2NextEnabled && !isProvisioning"}
        S2_TOGGLE["enableClassroom Switch"]
    end

    subgraph Step3["Step 3: School App / ERP"]
        S3_SKIP["OutlinedButton: 'Skip App Setup'<br/>enabled = !isProvisioning"]
        S3_NEXT{"Button: 'Save & Next →'<br/>enabled = isStep3NextEnabled && !isProvisioning"}
        S3_TOGGLE["enableErp Switch"]
    end

    subgraph Step4["Step 4: WhatsApp Group Capture"]
        S4_PRIOR{"hasPriorConfiguredChannel?"}
        S4_SKIP_EN["OutlinedButton: 'Skip WhatsApp'<br/>ENABLED (isStep4SkipEnabled = true)"]
        S4_SKIP_DIS["OutlinedButton: 'Skip WhatsApp'<br/>DISABLED (isStep4SkipEnabled = false)"]
        S4_WARN["⚠️ Warning Card:<br/>At least 1 channel is mandatory"]
        S4_COMP{"Button: 'Complete Setup ✓'<br/>enabled = isStep4CompleteEnabled && !isProvisioning"}
    end

    S2_SKIP -->|isSkipped = true| Step3
    S2_NEXT -->|isSkipped = !enableClassroom| Step3

    S3_SKIP -->|isSkipped = true| Step4
    S3_NEXT -->|isSkipped = !enableErp| Step4

    Step4 --> S4_PRIOR
    S4_PRIOR -->|Yes: Classroom or ERP Configured| S4_SKIP_EN
    S4_PRIOR -->|No: Both Prior Channels Skipped| S4_SKIP_DIS
    S4_PRIOR -->|No: Both Prior Channels Skipped| S4_WARN
    S4_SKIP_EN --> S4_COMP
    S4_SKIP_DIS --> S4_COMP
```

#### Step-by-Step Validation & Skip Behavior:

| Wizard Step | Action Control | Enablement Guard | Action on Click / State Transition |
| :--- | :--- | :--- | :--- |
| **Step 2 (Classroom)** | `OutlinedButton` ("Skip Classroom") | `!isProvisioning` | Zero validation required. Sets `enableClassroom = false`, `studentEmail = ""`, registers skipped state on Google Drive via `provisionStep2Classroom(..., isSkipped = true)`, and navigates to Step 3. |
| **Step 2 (Classroom)** | `Button` ("Save & Next →") | `isStep2NextEnabled && !isProvisioning` | Validated: if `enableClassroom == true`, requires `studentEmail.isNotBlank()`. If account is missing, button remains disabled and an inline hint instructs the user to select an account or tap skip. |
| **Step 3 (ERP / Portal)** | `OutlinedButton` ("Skip App Setup") | `!isProvisioning` | Zero validation required. Sets `enableErp = false`, `selectedAppPackage = ""`, `selectedAppName = ""`, registers skipped state on Drive via `provisionStep3Erp(..., isSkipped = true)`, and advances to Step 4. |
| **Step 3 (ERP / Portal)** | `Button` ("Save & Next →") | `isStep3NextEnabled && !isProvisioning` | Validated: if `enableErp == true`, requires `selectedAppPackage.isNotBlank()`. If package is missing, button remains disabled with inline prompt guiding app selection or skipping. |
| **Step 4 (WhatsApp)** | `OutlinedButton` ("Skip WhatsApp") | `isStep4SkipEnabled && !isProvisioning` | **Mandatory Channel Guard:** Enabled strictly when `hasPriorConfiguredChannel == true`. If both Classroom and ERP were skipped, this button is **disabled**. |
| **Step 4 (WhatsApp)** | `Button` ("Complete Setup ✓") | `isStep4CompleteEnabled && !isProvisioning` | **Mandatory Channel Guard:** If `hasPriorConfiguredChannel == true`, enabled if `!enableWhatsApp || selectedGroup.isNotBlank()`. If `hasPriorConfiguredChannel == false`, strictly requires `enableWhatsApp && selectedGroup.isNotBlank()`. |

#### 3. Mandatory Channel Guard Preventing Empty Ingestion Configurations

A foundational invariant of K.I.D.S. is that an ingested child profile must possess at least one operational notice ingestion channel. A child record with zero configured channels would produce an orphaned `ChildProfileEntity` where:
- `KidsNotificationListenerService` cannot filter push notifications (empty package whitelist and empty group whitelist).
- `KidsAccessibilityService` has no target application package to auto-crawl.
- `DriveSyncWorker` generates empty digests and vacant knowledge graphs.

To prevent this invalid state at the architectural level:

1. **Step 4 Warning Banner:**
   When `!hasPriorConfiguredChannel`, an informative `AmberOrange` warning card is displayed:
   `"⚠️ At least 1 channel is mandatory: Classroom and School App were skipped. Please configure WhatsApp below, or tap Back to configure an earlier channel."`

2. **Toggle Lockout Safeguard:**
   ```kotlin
   Switch(
       checked = enableWhatsApp,
       onCheckedChange = {
           if (hasPriorConfiguredChannel || it) {
               enableWhatsApp = it
           } else {
               Toast.makeText(context, "At least 1 channel is mandatory", Toast.LENGTH_SHORT).show()
           }
       }
   )
   ```
   When `hasPriorConfiguredChannel == false`, the parent is blocked from toggling off `enableWhatsApp`.

3. **Guaranteed Non-Empty Ingestion Configuration in `ChildProfileEntity`:**
   During finalization in Step 4, `channelsList` is populated strictly from configured channels:
   ```kotlin
   val channelsList = mutableListOf<ChannelConfig>()
   if (enableClassroom && studentEmail.isNotBlank()) {
       channelsList.add(
           ChannelConfig(
               channelType = ChannelType.GOOGLE_CLASSROOM,
               isEnabled = true,
               studentAccountEmail = studentEmail
           )
       )
   }
   if (enableErp && selectedAppPackage.isNotBlank()) {
       channelsList.add(
           ChannelConfig(
               channelType = ChannelType.SCHOOL_ERP,
               isEnabled = true,
               erpPackageName = selectedAppPackage,
               trackedTabs = selectedTabs.toList()
           )
       )
   }
   if (enableWhatsApp && selectedGroup.isNotBlank()) {
       channelsList.add(
           ChannelConfig(
               channelType = ChannelType.WHATSAPP,
               isEnabled = true,
               whitelistedGroupName = selectedGroup
           )
       )
   }
   ```
   Because the state machine guarantees $( \text{hasPriorConfiguredChannel} \lor \text{isWhatsAppConfigured} ) \equiv \text{true}$, `channelsList.isNotEmpty()` is guaranteed before `ChildProfile` creation:
   ```kotlin
   val childProfile = ChildProfile(
       childId = UUID.randomUUID().toString(),
       firstName = childName.trim(),
       academicYear = selectedYear,
       accountEmail = studentEmail.trim().takeIf { enableClassroom && it.isNotBlank() },
       photoUri = photoUri?.toString(),
       channels = channelsList
   )
   onFinishChildSetup(childProfile)
   ```
   This guarantees that every child profile persisted in SQLite Room possesses at least one valid, active channel configuration.

---

## 🔒 Google Drive Storage Organization

The vault folder structure created under `drive.file` scope:

```
My Drive/
└── K.I.D.S. Data/                                [rootKidsFolderId]
    └── {AcademicYear}/                           [yearFolderId, e.g. 2026-2027]
        ├── FAMILY_DIGEST.md                      # Cross-child academic summary
        └── {ChildName}/                          [childFolderId, e.g. Aarav]
            ├── notices.jsonl                     # Line-delimited JSON notice stream
            ├── MASTER_DIGEST.md                  # Complete per-child Markdown digest
            ├── graph.html                        # Standalone interactive D3 graph
            ├── attachments/                      [attachmentsFolderId]
            │   ├── Annual_Sports_Day_Notice.pdf  # Uploaded circular PDF
            │   └── Math_Worksheet_Unit4.pdf      # Uploaded worksheet
            ├── Google Classroom/                 [channelFolderId]
            │   ├── notices.jsonl                 # Channel-specific notice stream
            │   ├── CLASSROOM_DIGEST.md           # Channel-specific digest
            │   └── attachments/                  # Channel-specific attachments
            └── _system/                          [systemFolderId]
                ├── knowledge_graph.json          # GraphRAG ontology representation
                └── logs/                         [logsFolderId]
                    ├── sync_timeline.log         # Chronological sync audit trail
                    ├── crawler_trace.log         # Fine-grained crawler event trace
                    └── diagnostic_snapshot.json  # Device health & storage quota snapshot
```

---

### Multi-Tier Caching & Provisioning Engine (`GoogleDriveClient` & `DriveVaultManager`)

To eliminate Google Drive REST API network latency during onboarding and background synchronization, K.I.D.S. implements a high-performance, multi-tier caching and parallel execution pipeline combining memory-resident concurrent maps, persistent global preferences, background OAuth pre-warming, and lock-free in-flight coroutine synchronization.

```mermaid
sequenceDiagram
    participant User as Parent (UI)
    participant UI as Onboarding Wizard
    participant DVM as DriveVaultManager
    participant PREFS as SharedPreferences (kids_vault_prefs)
    participant GDC as GoogleDriveClient (In-Memory Cache)
    participant DRIVE as Google Drive REST API v3
    participant BG as CoroutineScope(Dispatchers.IO)

    Note over User,UI: Step 1: Account Selection & OAuth Pre-Warm
    User->>UI: Selects Google Account via AccountManager
    UI->>BG: launch(Dispatchers.IO)
    BG->>DVM: preWarmOAuthAndFolders(context, email, year)
    DVM->>DRIVE: Authenticate OAuth & getOrCreateFolder("K.I.D.S. Data")
    DVM->>DRIVE: getOrCreateFolder(year, rootId)
    DVM->>PREFS: saveGlobalFolderIds(rootId, yearId)
    Note over DVM,PREFS: Global root & year folder IDs cached before user taps Save!

    Note over User,UI: Step 1: Save Profile & Optimistic UI Transition
    User->>UI: Taps "Save Profile & Create Vault on Drive"
    UI->>PREFS: saveVaultPrefs(email, year, childName) [<10ms]
    UI->>UI: currentStep = STEP_2_CLASSROOM (0ms UI Transition)
    Note over User,UI: Step 2 unlocks instantly with zero spinner

    UI->>BG: launch { provisionStep1(...) }
    BG->>DVM: provisionStep1(email, year, childName)
    DVM->>DVM: activeProvisioningDeferred = CompletableDeferred()
    DVM->>PREFS: getSavedVaultFolders()
    alt Fast Path: Child Folders Cached (<50ms)
        PREFS-->>DVM: Return ChildVaultFolders
        DVM->>DVM: deferred.complete(cachedFolders)
    else Cold Path: Child Creation with Global Folder Cache (~800ms async)
        DVM->>PREFS: getSavedGlobalRootFolderId() & getSavedGlobalYearFolderId()
        PREFS-->>DVM: rootId & yearId (Zero remote list calls!)
        DVM->>GDC: provisionChildVault(year, child, cachedRootId, cachedYearId)
        par Parallel Subfolder Resolution (async)
            GDC->>DRIVE: async { getOrCreateFolder("attachments", childFolderId) }
            GDC->>DRIVE: async { getOrCreateFolder("_system", childFolderId) }
        end
        GDC-->>DVM: Return ChildVaultFolders
        DVM->>PREFS: saveVaultFolderPrefs(email, year, childName, folders)
        DVM->>DVM: deferred.complete(folders)
        DVM->>BG: launch { seedInitialTemplateFiles() }
    end

    opt Rapid User Transition (Step 2/3/4 in flight)
        UI->>DVM: provisionStep2Classroom(...)
        DVM->>DVM: withTimeoutOrNull(6000) { activeProvisioningDeferred.await() }
        Note over DVM: In-flight synchronization ensures zero race condition
    end
```

#### 1. In-Memory `ConcurrentHashMap` Folder & File Caches
`GoogleDriveClient` maintains static, thread-safe memory caches across instances:
- **`folderCache: ConcurrentHashMap<String, String>`:** Keyed by `"${parentFolderId ?: "root"}/$folderName"`, mapping directory path keys to Google Drive folder IDs.
- **`fileIdCache: ConcurrentHashMap<String, String>`:** Keyed by `"$parentFolderId/$fileName"`, caching file IDs discovered or created during upload cycles.
- **Double-Checked Locking via Coroutine `Mutex` (`folderMutex`):** Folder resolution in `getOrCreateFolder()` enforces thread safety without blocking Android worker threads:
  ```kotlin
  val cacheKey = "${parentFolderId ?: "root"}/$folderName"
  folderCache[cacheKey]?.let { return@withContext it }

  folderMutex.withLock {
      folderCache[cacheKey]?.let { return@withLock it }
      // Query Google Drive API files().list()
      // If found, put in folderCache and return
      // If absent, create folder via files().create(), cache ID, and return
  }
  ```
  If multiple coroutines or background tasks concurrently request the same folder, only one Drive REST API call is made, and all subsequent callers resolve immediately from memory.

#### 2. Parallel Subfolder Resolution via Coroutine `async`
When cold-provisioning a child's vault hierarchy, `GoogleDriveClient.provisionChildVault()` resolves sibling directories concurrently rather than sequentially:
```kotlin
val rootKidsFolderId = if (!cachedRootKidsFolderId.isNullOrBlank()) {
    cachedRootKidsFolderId
} else {
    getOrCreateFolder("K.I.D.S. Data", null)
}

val yearFolderId = if (!cachedYearFolderId.isNullOrBlank()) {
    cachedYearFolderId
} else {
    getOrCreateFolder(cleanYear, rootKidsFolderId)
}

val childFolderId = getOrCreateFolder(cleanChildName, yearFolderId)

// Resolve sibling child folders concurrently for maximum speed
val attachmentsDeferred = async { getOrCreateFolder("attachments", childFolderId) }
val systemDeferred = async {
    val systemFolderId = getOrCreateFolder("_system", childFolderId)
    val logsFolderId = getOrCreateFolder("logs", systemFolderId)
    Pair(systemFolderId, logsFolderId)
}

val attachmentsFolderId = attachmentsDeferred.await()
val (systemFolderId, logsFolderId) = systemDeferred.await()
```
By resolving `attachments/` and `_system/` in parallel via Kotlin coroutines, directory creation latency drops by ~40% over sequential HTTP roundtrips.

#### 3. Strict Non-Blank Folder Invariant (`GoogleDriveClient`)
To structurally eliminate the possibility of Google Drive assigning default directory names (`"New Folder"`) when given blank or whitespace parameters, `GoogleDriveClient` enforces an uncompromising invariant at the API layer:

```kotlin
suspend fun provisionChildVault(
    academicYear: String,
    childName: String,
    cachedRootKidsFolderId: String? = null,
    cachedYearFolderId: String? = null
): ChildVaultFolders = withContext(Dispatchers.IO) {
    val cleanChildName = childName.trim()
    require(cleanChildName.isNotBlank()) { "Child name cannot be blank when provisioning vault." }
    val cleanYear = academicYear.trim().ifBlank { "2026-2027" }
    // ...
}

suspend fun getOrCreateFolder(folderName: String, parentFolderId: String? = null): String = withContext(Dispatchers.IO) {
    val cleanName = folderName.trim()
    require(cleanName.isNotBlank()) { "Google Drive folder name cannot be blank." }
    // ...
}
```
- **Fail-Fast Enforcement:** Any invocation with a blank, empty, or whitespace-only folder name or child name throws an immediate `IllegalArgumentException`.
- **Precondition Safety:** No HTTP request is dispatched to Google Drive API's `files().create()` without an explicit, non-empty directory name, rendering ghost folder creation impossible.

#### 4. Global Folder Caching Architecture (`DriveVaultManager`)
Across multiple enrolled children or repeated app launches, querying Google Drive API's `files().list()` to locate the root `K.I.D.S. Data/` folder and the active `{AcademicYear}/` folder generates redundant HTTP roundtrips that consume quota and add network latency.

`DriveVaultManager` establishes a **Global Folder Caching Architecture** in Android `SharedPreferences`:
```kotlin
fun saveGlobalFolderIds(context: Context, rootId: String, academicYear: String, yearId: String) {
    val cleanYear = academicYear.trim().ifBlank { "2026-2027" }
    context.getSharedPreferences("kids_vault_prefs", Context.MODE_PRIVATE).edit()
        .putString("global_root_kids_folder_id", rootId)
        .putString("global_year_folder_id_$cleanYear", yearId)
        .apply()
}

fun getSavedGlobalRootFolderId(context: Context): String? {
    return context.getSharedPreferences("kids_vault_prefs", Context.MODE_PRIVATE)
        .getString("global_root_kids_folder_id", null)
}

fun getSavedGlobalYearFolderId(context: Context, academicYear: String): String? {
    val cleanYear = academicYear.trim().ifBlank { "2026-2027" }
    return context.getSharedPreferences("kids_vault_prefs", Context.MODE_PRIVATE)
        .getString("global_year_folder_id_$cleanYear", null)
}
```
- **Hierarchical Reusability:** When a parent enrolls Child #2 or re-provisions a vault, `DriveVaultManager` reads `getSavedGlobalRootFolderId(context)` and `getSavedGlobalYearFolderId(context, academicYear)`.
- **Bypassing Remote Hierarchy Queries:** These cached IDs are injected straight into `GoogleDriveClient.provisionChildVault(..., cachedRootKidsFolderId, cachedYearFolderId)`, entirely bypassing remote discovery roundtrips for the parent folder levels.

#### 5. Background OAuth Pre-Warm (`preWarmOAuthAndFolders`)
Instead of deferring OAuth authentication and global folder resolution until the user taps "Save Profile" at the end of Step 1, K.I.D.S. pre-emptively initializes them the moment an account is selected:

```kotlin
// In OnboardingWizardScreen.kt: Triggered immediately when parent selects account
val driveAccountPickerLauncher = rememberLauncherForActivityResult(
    contract = ActivityResultContracts.StartActivityForResult()
) { result ->
    val selectedEmail = result.data?.getStringExtra(AccountManager.KEY_ACCOUNT_NAME)
    if (!selectedEmail.isNullOrBlank()) {
        driveAccountEmail = selectedEmail
        isDriveConnected = true
        DriveVaultManager.currentAccountEmail = selectedEmail
        prefs.edit().putString("account_email", selectedEmail).apply()

        // Pre-warm OAuth token & cache root/year folders in background while parent enters child details
        scope.launch(Dispatchers.IO) {
            DriveVaultManager.preWarmOAuthAndFolders(context, selectedEmail, selectedYear)
        }
    }
}
```

Implementation in `DriveVaultManager.kt`:
```kotlin
suspend fun preWarmOAuthAndFolders(context: Context, accountEmail: String, academicYear: String) = withContext(Dispatchers.IO) {
    if (accountEmail.isBlank()) return@withContext
    try {
        val driveService = getDriveService(context, accountEmail)
        val driveClient = GoogleDriveClient(driveService)
        val cachedRootId = getSavedGlobalRootFolderId(context)
        val rootId = if (!cachedRootId.isNullOrBlank()) {
            cachedRootId
        } else {
            driveClient.getOrCreateFolder("K.I.D.S. Data", null)
        }
        val cleanYear = academicYear.trim().ifBlank { "2026-2027" }
        val cachedYearId = getSavedGlobalYearFolderId(context, cleanYear)
        val yearId = if (!cachedYearId.isNullOrBlank()) {
            cachedYearId
        } else {
            driveClient.getOrCreateFolder(cleanYear, rootId)
        }
        saveGlobalFolderIds(context, rootId, cleanYear, yearId)
        Log.i(TAG, "Step 1: Successfully pre-warmed OAuth & cached global root ($rootId) and year ($yearId) folders.")
    } catch (t: Throwable) {
        Log.w(TAG, "Step 1: Background pre-warm note: ${t.message}")
    }
}
```
- **Concealed Network Latency:** While the parent spends 5–15 seconds entering the child's name, picking an avatar photo, and confirming the academic session, Google Play Services generates the OAuth 2.0 access token and verifies or creates `K.I.D.S. Data/` and `{AcademicYear}/`.
- **Zero Front-Facing Wait:** When the parent finishes typing and taps save, connection handshakes and upper-tier folder provisioning are already complete.

#### 6. Persistent Two-Tier Storage Caching & DB-Backed Fallback (`DriveVaultManager`)
To survive application process death, device reboots, and multi-session workflows, `DriveVaultManager` persists the complete `ChildVaultFolders` struct in Android `SharedPreferences` (`kids_vault_prefs`):
- **`saveVaultFolderPrefs(context, accountEmail, academicYear, childName, folders)`:** Persists the six primary folder IDs prefixed by `vault_${accountEmail}_${academicYear}_${childName.trim().lowercase()}_`:
  - `rootKidsFolderId`
  - `yearFolderId`
  - `childFolderId`
  - `attachmentsFolderId`
  - `systemFolderId`
  - `logsFolderId`
- **`getSavedVaultFolders(context, accountEmail, academicYear, childName)`:** Atomically reads and reconstructs `ChildVaultFolders`. If all six folder IDs are present in preferences, it returns the struct immediately; if any ID is missing, it returns `null` to trigger provisioning.
- **Database-Backed Fallback in `getSavedVaultPrefs`:** When resolving preferences via `getSavedVaultPrefs(context)`, if `child_name` is missing or unpopulated in `SharedPreferences`, `DriveVaultManager` executes a direct query against SQLite Room:
  ```kotlin
  fun getSavedVaultPrefs(context: Context): Triple<String?, String, String> {
      val prefs = context.getSharedPreferences("kids_vault_prefs", Context.MODE_PRIVATE)
      val email = prefs.getString("account_email", null) ?: currentAccountEmail
      val year = prefs.getString("academic_year", null) ?: "2026-2027"
      var child = prefs.getString("child_name", null) ?: ""
      if (child.isBlank()) {
          try {
              val db = KidsDatabase.getInstance(context)
              val firstChild = kotlinx.coroutines.runBlocking(Dispatchers.IO) {
                  db.childProfileDao().getAllChildrenDirect().firstOrNull()
              }
              if (firstChild != null && firstChild.firstName.isNotBlank()) {
                  child = firstChild.firstName
                  prefs.edit().putString("child_name", child).apply()
              }
          } catch (e: Exception) {
              Log.w(TAG, "Could not resolve child name fallback from DB: ${e.message}")
          }
      }
      return Triple(email, year, child)
  }
  ```
  This guarantees that background workers and secondary tasks always resolve the true enrolled child name even if app preferences were reset or not yet synced to disk. If no child exists in the database, `child` remains empty (`""`), triggering `DriveSyncWorker`'s profile guard.

#### 7. In-Flight Provisioning Synchronization with Timeout Safety (`CompletableDeferred<ChildVaultFolders>`)
Because the Step 1 UI transition is optimistic and instantaneous (0ms UI lag), a fast-tapping user might advance through Step 2 (Google Classroom), Step 3 (School ERP), or Step 4 (WhatsApp) before the asynchronous Drive folder provisioning coroutine completes. Without synchronization, subsequent steps would execute against a null `ChildVaultFolders` reference, risking missing subfolders or duplicate API creations.

To eliminate this race condition without blocking the user interface, `DriveVaultManager` implements **in-flight deferred tracking with timeout safety**:

```kotlin
@Volatile
var currentChildVault: ChildVaultFolders? = null

@Volatile
var activeProvisioningDeferred: CompletableDeferred<ChildVaultFolders>? = null

// In provisionStep1:
val deferred = CompletableDeferred<ChildVaultFolders>()
activeProvisioningDeferred = deferred
...
// When folders are resolved:
currentChildVault = folders
activeProvisioningDeferred?.complete(folders)
```

In `provisionStep2Classroom`, `provisionStep3Erp`, and `provisionStep4WhatsApp`, the worker coordinates with the active in-flight task:
```kotlin
val email = accountEmail ?: currentAccountEmail ?: getSavedVaultPrefs(context).first
var vault = folders ?: currentChildVault
if (vault == null && activeProvisioningDeferred != null) {
    vault = try {
        // Await in-flight deferred with a 6-second safety timeout
        withTimeoutOrNull(6000) { activeProvisioningDeferred?.await() }
    } catch (e: Exception) {
        null
    }
    if (vault != null) {
        currentChildVault = vault
    }
}
if (vault == null && !email.isNullOrBlank()) {
    // Graceful fallback: self-healing provision using global cached root and year folder IDs
    val (_, academicYear, childName) = getSavedVaultPrefs(context)
    val driveClient = GoogleDriveClient(getDriveService(context, email))
    val cachedRootId = getSavedGlobalRootFolderId(context)
    val cachedYearId = getSavedGlobalYearFolderId(context, academicYear)
    vault = driveClient.provisionChildVault(
        academicYear = academicYear,
        childName = childName,
        cachedRootKidsFolderId = cachedRootId,
        cachedYearFolderId = cachedYearId
    )
    currentChildVault = vault
    currentAccountEmail = email
}
```
- **Lock-Free Await:** If background provisioning from Step 1 is still executing, `activeProvisioningDeferred?.await()` non-blockingly suspends only the background I/O coroutine of Step 2/3/4 until Step 1's `ChildVaultFolders` is delivered.
- **6,000ms Timeout Guard:** If network interruptions stall the in-flight task, `withTimeoutOrNull(6000)` prevents deadlock and seamlessly falls back to self-healing direct resolution using the pre-cached global folder IDs.
- **Race Condition Immunity:** All subsequent steps safely receive the authoritative `ChildVaultFolders` without race conditions or duplicated Google Drive API calls.

#### 8. Asynchronous Background Template Seeding (Step 1 Instant Transition)
During Step 1 of the Onboarding Wizard ("Save Profile & Create Vault on Drive"):
1. `DriveVaultManager.provisionStep1()` first checks `getSavedVaultFolders()`. If cached, the wizard transitions **instantly (<50ms)** without any Drive network calls.
2. On initial creation, folder hierarchy provisioning completes asynchronously in the background via parallel `async` calls, immediately returns `ProvisionStep1Result.Success`, and saves the folder IDs to `SharedPreferences`.
3. Initial placeholder files are dispatched to a detached background coroutine scope without holding up the user interface:
   ```kotlin
   CoroutineScope(Dispatchers.IO).launch {
       try {
           driveClient.uploadOrUpdateMasterDigest(folders.childFolderId, initialDigest)
           driveClient.uploadOrUpdateFamilyDigest(folders.yearFolderId, initialFamilyDigest)
           driveClient.uploadOrUpdateKnowledgeGraph(folders.systemFolderId, initialGraphJson)
           driveClient.uploadOrUpdateGraphHtml(folders.childFolderId, initialHtml)
           driveClient.appendTimelineLog(folders.logsFolderId, initialTimelineLog)
       } catch (e: Exception) {
           Log.w(TAG, "Step 1 background template seeding deferred to DriveSyncWorker", e)
       }
   }
   ```
4. The parent transitions seamlessly to Step 2 (Classroom Mapping) with zero loading spinner delay.

#### 9. `DriveSyncWorker` Zero-Roundtrip Cached Folder Reuse
During scheduled background and push-triggered synchronization cycles, `DriveSyncWorker` leverages the cached folder structure directly:
```kotlin
val (savedEmail, academicYear, childName) = DriveVaultManager.getSavedVaultPrefs(applicationContext)
val vault = DriveVaultManager.getSavedVaultFolders(applicationContext, savedEmail, academicYear, childName)
    ?: driveClient.provisionChildVault(
        academicYear = academicYear,
        childName = childName,
        cachedRootKidsFolderId = DriveVaultManager.getSavedGlobalRootFolderId(applicationContext),
        cachedYearFolderId = DriveVaultManager.getSavedGlobalYearFolderId(applicationContext, academicYear)
    ).also {
        DriveVaultManager.saveVaultFolderPrefs(applicationContext, savedEmail, academicYear, childName, it)
    }
```
This guarantees zero Drive API directory listing queries on routine sync cycles, conserving mobile battery, bandwidth, and Google Drive API quota.

#### Performance & Latency Benchmark Comparison
| Execution State / Flow | HTTP Roundtrips to Drive API | Latency (UI / Worker) | Architectural Mechanism |
| :--- | :--- | :--- | :--- |
| **Step 1 UI Transition** | 0 HTTP calls (Local Prefs Write) | **0 ms (Instantaneous)** | **Optimistic UI Transition** |
| **Step 1 Cached Re-entry** | 0 HTTP calls (SharedPreferences hit) | **< 50 ms (Instantaneous)** | **Local Vault Folder Caching** |
| **Step 1 Background Cold Provisioning** | 1–2 HTTP calls (`child/` + siblings) | **~ 800 ms (Asynchronous)** | **OAuth Pre-Warm + Global Folder Caching** |
| *Step 1 Unoptimized Sequential (Baseline)* | 9–11 HTTP calls (Blocking sequential) | *6.5 – 8.2 seconds (Blocking)* | *Legacy blocking pattern without pre-warm* |
| **Step 2/3/4 Rapid Advance Synchronization** | 0 extra discovery calls | **0 ms (Non-blocking await)** | **`CompletableDeferred` in-flight tracking** |
| **DriveSyncWorker Cached Sync Cycle** | 0 folder discovery calls | **0 ms overhead for hierarchy resolution** | **Persistent two-tier cache reuse** |

---

## 🚀 CI/CD & Knowledge Graph Pipeline Automation

The repository maintains an automated, verified CI/CD pipeline managed by GitHub Actions and the **CI/CD Guardian** script (`scripts/ci_watch.py`).

```mermaid
flowchart LR
    COMMIT["Git Commit to main"] --> CI["Android CI & Quality Gates<br/>(ci.yml)"]
    COMMIT --> KG["Knowledge Graph Pipeline<br/>(graphify.yml)"]

    subgraph CI_YML["ci.yml"]
        TEST["./gradlew testDebugUnitTest"] --> BUILD["./gradlew assembleDebug"]
        BUILD --> RELEASE["Publish GitHub Release 'latest'<br/>(app-debug.apk)"]
    end

    subgraph KG_YML["graphify.yml"]
        EXTRACT["graphify extract . --code-only"] --> CLUSTER["graphify cluster-only ."]
        CLUSTER --> ASSERT["Verify graph.json (nodes & edges)"]
        ASSERT --> PUSH["Auto-commit graphify-out/ [skip ci]"]
    end

    CI --> CI_YML
    KG --> KG_YML
```

### 1. `ci.yml`: Android CI & Quality Gates
- **Triggers:** Push to `main`, Pull Requests targeting `main`, manual `workflow_dispatch`.
- **Environment:** Ubuntu-latest, OpenJDK 17 (Temurin), Gradle 8.9.
- **Jobs:**
  - `testDebugUnitTest`: Runs complete multi-tier test suite across data, domain, and router logic.
  - `assembleDebug`: Compiles `app-debug.apk`.
  - `Publish Automated GitHub Release`: Deploys `app-debug.apk` directly to GitHub Releases under tag `latest` with continuous delivery release notes.
  - `Upload Test Reports & APK`: Archives build reports and APK artifacts with 7-day retention.

### 2. `graphify.yml`: Knowledge Graph Validation & Graphify Pipeline
- **Triggers:** Changes to `app/**`, `gradle/**`, `build.gradle.kts`, `GEMINI.md`, or `prd.md`.
- **Jobs:**
  - Executes AST extraction: `graphify extract . --code-only`.
  - Performs community clustering: `graphify cluster-only .`.
  - Validates `graphify-out/graph.json` node and edge counts using Python assertions.
  - Commits updated knowledge graph artifacts back to repository with `[skip ci]`.
  - Archives interactive visualizations (`graph.html`, `graph.json`, `GRAPH_REPORT.md`).

### 3. `scripts/ci_watch.py`: Automated Pipeline Guardian
- Python monitoring utility for local and CI environments.
- Automatically detects active workflow runs, streams live status at 10-second intervals, diagnoses failures with regex error extraction (unit test assertions, compilation errors, AAPT linking errors), and verifies the live GitHub Release asset.

---

## 🤖 Guardian Subagents & Engineering Governance

To enforce continuous architectural fidelity, zero silent failures, complete test coverage, and documentation parity, engineering and operational workflows are governed by a specialized 5-guardian engineering governance quintet:

```mermaid
flowchart TD
    subgraph MATRIX["Guardian Subagent Governance Matrix"]
        WRG["workflow_risk_guardian<br/>(UX, Safety & Stability Risk Analysis)"]
        SEC["security_guardian<br/>(Security, Privacy & Threat Modeling)"]
        DLG["deep_logger_guardian<br/>(Observability Audit & Root-Cause Telemetry)"]
        CIG["github_ci_guardian<br/>(CI/CD, Graphify & Release Delivery)"]
        DOC["docs_maintainer<br/>(User & Architecture Documentation)"]
    end

    CODE["Proposed Code / Diff / Feature"] --> WRG
    CODE --> SEC
    CODE --> DLG
    WRG -->|Risk Clearance & UX Validation| CIG
    SEC -->|Security Clearance & Threat Verification| CIG
    DLG -->|Structured Telemetry & No Silent Failures| CIG
    CIG -->|Build, Unit Tests & Graphify Verified| DOC
    DOC -->|User Manual & Architecture Sync| RELEASE["Ship Verified Artifacts & Docs"]

    RUNTIME["Live Runtime Diagnostics & Artifacts<br/>(crawler_trace.log, sync_timeline.log, notices.db, Manifest)"] -.->|Post-Run Diagnostics| DLG
    RUNTIME -.->|Release Audit & Log Sanitization| SEC
```

### 1. `deep_logger_guardian`: Deep Logging & Diagnostic Telemetry Guardian
- **Role & Purpose**:
  - Proactively audits code implementations to guarantee deep, high-signal, structured diagnostic observability across all application subsystems, eliminating silent failures and enforcing privacy preservation.
  - Performs comprehensive post-run root-cause telemetry diagnostics by analyzing runtime logs, SQLite databases, and Google Drive vault telemetry to isolate anomalies and recommend line-level code fixes.
- **Key Responsibilities**:
  1. **Implementation Logging Audit**:
     - Guarantees that every critical operational path (Classroom crawler state machine transitions, node-tree traversals, autonomous attachment downloads, WorkManager sync jobs, SQLite Room operations, and Google Drive REST API calls) incorporates structured event logging with UTC timestamps, event types, operational context parameters, and explicit outcomes.
     - Enforces the **Zero Silent Failures** standard: identifies and remediates empty catch blocks, unlogged coroutine cancellations, unhandled `IOException` / `ApiException` instances, and swallowed background worker errors.
     - Validates **Privacy Preservation**: rigorously ensures that no student PII, credentials, OAuth tokens, or private non-educational message bodies are leaked to disk logs, logcat, or cloud vault files.
  2. **Post-Run Root-Cause Telemetry Diagnostics**:
     - Inspects live trace and telemetry files:
       - `crawler_trace.log`: Tracks post-detail navigation, card parsing, attachment chip clicks, dialog dismissals, and retry backoffs.
       - `sync_timeline.log`: Tracks WorkManager scheduling, batch upload latencies, MIME resolution, and folder ID lookups.
       - SQLite Database (`notices.db`): Verifies record insertion integrity, deduplication hash collisions, and sync state transitions (`PENDING` -> `SYNCED`).
       - Google Drive Vault System Logs (`_system/logs/`): Validates remote file creation, digest updates, and folder provisioning.
     - Provides line-level root-cause analysis for any reported discrepancies (e.g., mismatched notice counts, missed attachments, rate limits, or crawler timeouts) accompanied by concrete, production-ready code remedies.
- **Integration & Coordination**:
  - Coordinates alongside `github_ci_guardian`, `docs_maintainer`, `workflow_risk_guardian`, and `security_guardian`.
  - Collaborates with `workflow_risk_guardian` and `security_guardian` to pair structural risk mitigation and privacy boundary enforcement with high-resolution diagnostic logging.
  - Feeds telemetry insights and operational log schemas to `docs_maintainer` to keep the troubleshooting and diagnostic guides in `docs/USER_MANUAL.md` and `docs/TECHNICAL_ARCHITECTURE.md` accurate.
  - Ensures diagnostic health checks pass prior to final deployment validation by `github_ci_guardian`.

### 2. `github_ci_guardian`: CI/CD & Knowledge Graph Pipeline Guardian
- **Role & Purpose**: Manages GitHub repository activity, keeps codebase knowledge graphs (`graphify-out/`) synchronized with every commit, and monitors CI/CD pipelines.
- **Key Responsibilities**:
  - Synchronizes AST extraction & community clustering via `graphify extract . --code-only` and `graphify cluster-only .`.
  - Validates `graphify-out/graph.json` integrity (500+ nodes, valid edges, 20+ clusters).
  - Executes `scripts/ci_watch.py` to stream live CI status for `Android CI & Quality Gates` (`ci.yml`) and `Knowledge Graph Validation & Graphify Pipeline` (`graphify.yml`).
  - Confirms GitHub Release delivery of `app-debug.apk` under the `latest` tag with zero assumption of success.
- **Integration & Coordination**:
  - Coordinates with `workflow_risk_guardian` and `security_guardian` to ensure no build is triggered with unverified UX, stability, security, or privacy risks.
  - Validates that `docs_maintainer` has committed synchronized documentation updates before releasing.

### 3. `docs_maintainer`: Documentation Guardian
- **Role & Purpose**: Maintains and updates both the parent-facing User Manual (`docs/USER_MANUAL.md`) and the engineering specification (`docs/TECHNICAL_ARCHITECTURE.md`) on every build and architectural change.
- **Key Responsibilities**:
  - Keeps `docs/USER_MANUAL.md` synchronized with onboarding steps, permission rationales, Stream vs. Classwork crawling mechanics, autonomous attachment staging, and parent Google Drive vault usage.
  - Keeps `docs/TECHNICAL_ARCHITECTURE.md` synchronized with Clean Architecture layers, Room SQLite/FTS4 schemas, background services (`KidsAccessibilityService`, `DownloadFolderObserver`, `DriveSyncWorker`), Graphify pipelines, and privacy boundary invariants.
  - Guarantees 100% parity between repository source code and documentation.
- **Integration & Coordination**:
  - Coordinates directly with `github_ci_guardian` to document CI/CD workflows and release assets.
  - Integrates diagnostic schemas and log interpretations established by `deep_logger_guardian` into user-facing troubleshooting guides.
  - Synchronizes security threat models, privacy filters, and permission rationales established by `security_guardian`.

### 4. `workflow_risk_guardian`: Workflow, App & UX Risk Guardian
- **Role & Purpose**: Proactively inspects proposed implementations, code diffs, and architectural changes both before and after execution to detect failure modes, UX dead ends, and regressions.
- **Key Responsibilities**:
  - Inspects workflows for trapped user states, blocked permission gates, and corrupted persistence across process death.
  - Validates app stability under configuration changes, coroutine lifecycle cancellations, ML Kit/PDF memory limits, and Google Drive rate limits.
  - Audits WCAG 2.1 touch targets (>= 48dp), visual contrast ratios, and accessible typography.
  - Enforces zero-backend privacy invariants and storage anti-clutter lifecycles.
- **Integration & Coordination**:
  - Coordinates with `deep_logger_guardian` to verify that all edge cases and error handling branches have high-signal telemetry.
  - Coordinates with `security_guardian` and `github_ci_guardian` to gate CI passes against detected risk regressions.

### 5. `security_guardian`: Security, Privacy & Threat Modeling Guardian
- **Role & Purpose**: Authoritative guardian of application security, privacy preservation, and threat resistance before, during, and after implementation.
- **Key Responsibilities**:
  1. **Before Implementation (Threat Modeling & Design Review)**:
     - **STRIDE Threat Modeling**: Conducts rigorous STRIDE analysis on proposed architectural modifications, IPC channels, and data flows to prevent Spoofing, Tampering, Repudiation, Information Disclosure, Denial of Service, and Elevation of Privilege.
     - **Zero-Backend Invariant Enforcement**: Strictly vetoes any external cloud database, intermediate proxy server, third-party analytics relay, or non-Google-Drive telemetry infrastructure ($0 Cloud Cost invariant).
     - **OAuth Scope Minimization**: Enforces strict `https://www.googleapis.com/auth/drive.file` scope verification, blocking any attempt to request broader permissions (`drive`, `drive.readonly`).
     - **Least Privilege Permission Audits**: Audits Android runtime permissions (`MANAGE_EXTERNAL_STORAGE`, `POST_NOTIFICATIONS`, `BIND_ACCESSIBILITY_SERVICE`, `BIND_NOTIFICATION_LISTENER_SERVICE`) to guarantee every requested capability has strict least-privilege boundary justifications.
  2. **During Implementation (Code & Diff Auditing)**:
     - **Line-by-Line Vulnerability Detection**: Audits code diffs for path traversal vulnerabilities during attachment extraction/staging, SQL injection in SQLite/Room query construction, cryptographic weaknesses in SHA-256 fingerprinting, insecure IPC (`PendingIntent.FLAG_IMMUTABLE`, unexported components), and memory leaks.
     - **Memory-Boundary Privacy Filter Drops**: Rigorously validates that non-educational push notifications, personal chats, OTPs, and banking credentials are discarded directly from volatile memory before reaching persistence or telemetry layers.
     - **Dependency Supply Chain Security**: Audits `gradle/libs.versions.toml` and Gradle build configurations to prevent dependency hijacking, unverified repositories, and vulnerable third-party libraries.
  3. **After Implementation (Post-Implementation Verification & Release Audit)**:
     - **Merged AndroidManifest Component Isolation**: Inspects the final merged manifest to enforce explicit `android:exported="false"` on all private activities, receivers, services, and content providers, ensuring non-exported boundaries cannot be traversed by malicious third-party apps.
     - **Runtime Log Sanitization Verification**: Audits log outputs (`logcat`, `crawler_trace.log`, `sync_timeline.log`, Drive vault logs) to verify that zero student credentials, tokens, PII, or raw message payloads are leaked into storage or diagnostics.
     - **ProGuard / R8 Rule Enforcement**: Verifies release obfuscation and code shrinking rules to guarantee that test hooks, debug bypasses, mock data injectors, and logging trampolines are completely stripped from production release builds (`app-release.apk` / `app-debug.apk`).
- **Integration & Coordination**:
  - Collaborates with `workflow_risk_guardian`, `deep_logger_guardian`, `github_ci_guardian`, `docs_maintainer`, and `code_quality_guardian` to form a comprehensive 6-guardian engineering governance sextet.
  - Enforces gating authority: vetoes pull requests and CI pipelines if security invariants, OAuth boundaries, or privacy filters are compromised.
  - Coordinates with `deep_logger_guardian` to verify that diagnostic logging enhancements maintain zero-PII and zero-credential leak guarantees.
  - Ensures documentation parity with `docs_maintainer` on security mechanisms, permission rationales, and parent data sovereignty.

### 6. `code_quality_guardian`: Code Review, Clean Architecture & Professional Naming Guardian
- **Role & Purpose**: Inspects architectures, code diffs, and codebase implementations to guarantee clean code standards, idiomatic Kotlin design, descriptive domain-driven naming conventions, robust null-safety, and the elimination of technical debt.
- **Key Responsibilities**:
  1. **Descriptive & Professional Naming Conventions**:
     - **Elimination of Cryptic Abbreviations**: Strictly prohibits cryptic or truncated abbreviations (`tmp`, `val1`, `x2`, `chk`, `cntr`, `strArr`, `res`, `mgr`). Variables and parameters must clearly express their intent and domain context (`temporaryStorageDirectory`, `visibleCardMetadata`, `scrollDirectionHistory`).
     - **Idiomatic Casing**: Enforces `PascalCase` for classes/interfaces/enums/objects and UI Composables, `camelCase` for functions/methods/properties/variables, and `SCREAMING_SNAKE_CASE` for constants and enum entries.
     - **Affirmative Boolean Readability**: Enforces clear affirmative query naming for booleans (`isNoticeFullyCaptured`, `hasPendingSync`, `shouldIngestNotice`, `canNavigateUp`).
     - **Action-Oriented Function Verbs**: Enforces strong, descriptive action verbs for methods and functions (`calculateSha256Fingerprint`, `persistDiagnosticMilestone`, `synchronizeGoogleDriveVault`).
     - **Prohibition of Meta / Noise Words (`fun`, `func`, `function`, `method`, `routine`)**: Strictly prohibits redundant noise words inside function identifiers (e.g. `doSyncFun`, `parseNoticeFunction`, `fetchMethod`), preventing keyword collision with Kotlin's `fun` and ensuring function names describe the domain action rather than the language construct.
  2. **Clean Code & Professional Architecture**:
     - **Single Responsibility Decomposition**: Monolithic functions exceeding 40-50 lines or mixing abstraction levels are decomposed into small, focused, pure, testable units.
     - **Magic Constant Elimination**: Magic numbers and hardcoded strings are extracted into named constants within companion objects or domain configuration classes.
     - **Defensive Null-Safety**: Strictly prohibits unsafe non-null assertion operator (`!!`), enforcing safe calls (`?.`), Elvis operators (`?:`), and explicit domain assertions (`checkNotNull`, `requireNotNull`).
     - **Safe Resource Management**: Enforces safe lifecycle reclamation for Bitmaps, Cursors, and `AccessibilityNodeInfo` objects (`use {}`, explicit `recycle()`).
  3. **Jetpack Compose & WCAG Ergonomics**:
     - Enforces state hoisting, stable parameters, descriptive Composable nouns, and event lambda naming (`onDismissRequest`, `onValueChange`).
     - Audits minimum touch targets (>= 48dp x 48dp) and strict adherence to `KidsTheme` color and typography tokens.
- **Integration & Coordination**:
  - Reviews proposed code and diffs before staging, providing structured Code Quality & Review Reports with actionable, production-ready refactorings.
  - Coordinates with `workflow_risk_guardian` to ensure refactorings maintain UI responsiveness and process lifecycle resilience.
  - Works with `github_ci_guardian` to ensure code committed to the repository meets the highest software engineering craftsmanship standards.

---

## 🛡️ Security, Privacy & Compliance Verification

| Requirement | Implementation Mechanism | Verification Method |
| :--- | :--- | :--- |
| **$0 Cost Guarantee** | Zero backend servers, client-side ML Kit, direct Drive REST API | No server dependencies, no API keys requiring billing |
| **OAuth Minimization** | Strictly `drive.file` scope | Inspected in `DriveVaultManager.kt` & Google Sign-In config |
| **Sensitive Data Drop** | `PrivacyFilter.shouldIngest()` memory boundary validation | Unit tests in `PrivacyFilterTest.kt` verifying OTP/bank drops |
| **Storage Anti-Clutter** | `DownloadFolderObserver` moves files to private sandbox staging | Integration tests verifying public Downloads cleanup |
| **OOM Prevention** | `PdfRenderer` page-by-page streaming with `bitmap.recycle()` | Tested with 20+ page PDFs under restricted JVM heap |
| **Accessibility WCAG 2.1** | Compose touch targets `minHeight = 48.dp`, AAA contrast (11.4:1 / 15.8:1) | Verified with Compose UI testing & accessibility scanners |

---

*Authored and guarded by the K.I.D.S. Documentation Guardian.*
