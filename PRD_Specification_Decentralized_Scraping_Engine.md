# Product Requirements Document (PRD) & Technical Specification

**Project Name:** Decentralized Cross-Device Scraping & Aggregation Engine  
**Version:** 1.0.0  
**Target Architecture:** Zero-Server, Decentralized Mobile-Desktop Hybrid Engine  
**Author:** Engineering Architecture  

---

## 1. Executive Summary & Core Vision
The **Decentralized Cross-Device Scraping & Aggregation Engine** is a zero-cost, zero-configuration data capture and intelligence platform designed to extract, aggregate, and query account-authenticated personal data from arbitrary web portals, Single-Page Applications (SPAs), Learning Management Systems (LMS/Google Classroom), messaging streams, and media dashboards (e.g., YouTube Kids, gaming profiles).

The platform eliminates the need for dedicated cloud servers, external databases, or paid SaaS scraper infrastructure by utilizing **Google Drive** as a transactional message bus and decentralized datastore. 

It implements an **opportunistic two-tier ingestion model**:
1. **Desktop Tier (Chrome Extension):** Handles initial zero-prompt onboarding, bulk historical crawling, autonomous internal JSON API sniffing, and primary notification-triggered execution when active.
2. **Mobile Tier (Android App):** Captures real-time notifications via `NotificationListenerService`, opportunistically delegates scraping jobs to the desktop, and executes targeted fallback scrapes via an off-screen, asset-blocked headless WebView or direct API replay when the laptop is offline.

All aggregated data is mapped into **5 Universal UI Primitives** on a Dynamic Schema-Driven Dashboard and made searchable via an embedded **On-Device Conversational Agent** powered by Chrome's local **Gemini Nano** and **EmbeddingGemma 2**.

---

## 2. Architectural Pillars & Core Constraints
* **Zero Central Infrastructure ($0 Operating Cost):** No hosted databases, web servers, or proxy relays. State, queues, authentication tokens, and scraped records persist entirely within the user's private Google Drive (`drive.file` / `drive.appdata` scopes).
* **Zero User Configuration:** Non-technical users never write code, regexes, or natural language prompts. Scraping rules and backend API endpoints are discovered autonomously.
* **Opportunistic Processing Handoff:** Computationally expensive DOM rendering and data extraction are offloaded to AC-powered desktop Chrome instances whenever available. Mobile execution is reserved strictly for targeted incremental updates during desktop offline windows.
* **100% On-Device AI & Privacy:** Gemini Nano runs natively via the Chrome Prompt API for CSS/ARIA selector synthesis and dashboard query synthesis. EmbeddingGemma 2 runs via LiteRT on Android (<200MB RAM) for semantic notification routing and local vector indexing. Personal student and account data never leaves local device memory.

---

## 3. End-to-End System Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                        LAPTOP: CHROME EXTENSION                        │
│                                                                        │
│  [Visual Element Inspector]        [Autonomous API Interceptor]        │
│  (Zero-Prompt Hover/Click)         (chrome.debugger / CDP Sniffing)    │
│              │                                     │                   │
│              ▼                                     ▼                   │
│  [Gemini Nano Selector Engine]    [Direct JSON REST/GraphQL Discovery] │
│              │                                     │                   │
│              └──────────────────┬──────────────────┘                   │
│                                 │                                      │
│                  Emits Declarative Recipe JSON                         │
│                  Executes Bulk Baseline Crawl                          │
└─────────────────────────────────┼──────────────────────────────────────┘
                                  │
                                  ▼
┌────────────────────────────────────────────────────────────────────────┐
│                 SHARED STORAGE LAYER: GOOGLE DRIVE                     │
│                                                                        │
│  • /config/recipes/recipe_<id>.json (Selectors & API contracts)        │
│  • /config/auth/session_auth.json (Cookies, Storage, User-Agent)       │
│  • /queue/task_<timestamp>.json (Transactional Lock Bus)               │
│  • /data/baseline/history_<id>.json (Historical data & Watermarks)     │
│  • /data/updates/delta_<timestamp>.json (Incremental records)          │
│  • /ui/layout_manifest.json (Dynamic dashboard configuration)          │
└─────────────────────────────────▲──────────────────────────────────────┘
                                  │
                                  │ Reads Queues / Writes Deltas
                                  │
┌─────────────────────────────────┴──────────────────────────────────────┐
│                        MOBILE: ANDROID APPLICATION                     │
│                                                                        │
│  [NotificationListenerService] ──► Status bar alert intercepted        │
│                │                                                       │
│                ▼                                                       │
│  [EmbeddingGemma 2 on LiteRT]  ──► Cosine routing & Deduplication      │
│                │                                                       │
│                ▼                                                       │
│  [Opportunistic Dispatcher]    ──► Pushes task.json (PENDING) to Drive │
│                │                   Schedules 90s Fallback Worker       │
│                ▼                                                       │
│  [Fallback Scraper Engine]     ──► OkHttp API Replay OR                │
│                                    Headless Asset-Blocked WebView      │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Ingestion Lifecycle & Data Synchronization

### 4.1 Phase 1: Bulk Baseline Capture (Desktop-Bound)
* **Scope & Restrictions:** Restricted strictly to the Chrome Extension on desktop. Mobile execution for baseline crawling is prohibited to avoid battery drain, memory throttling, and carrier data spikes.
* **Traversal Mechanics:**
  * Iterates across paginated lists, multi-term selectors, or automated virtual-scroll containers until DOM exhaustion or configured historical time boundaries (e.g., past 6 months).
  * Resolves external attachment URLs (circulars, assignment PDFs) and indexes their metadata without storing multi-megabyte binary blobs on mobile storage.
* **Watermark Generation:**
  * Establishes a synchronization watermark written to `/data/baseline/history_<id>.json`.
  * Watermark attributes: `last_synced_timestamp`, `highest_numerical_id`, and a bloom/hash set of `seen_entity_hashes`.

### 4.2 Phase 2: Incremental Delta Capture (Opportunistic Hybrid)
* **Trigger:** Intercepted notification on Android via `NotificationListenerService`.
* **Execution Scope:** Strictly scoped to the novel item. Does not crawl historical records.
* **Deduplication:** The notification text is embedded via on-device **EmbeddingGemma 2**. If the semantic similarity to an item captured within the last 6 hours exceeds `0.92`, the fetch is aborted to prevent duplicate captures caused by teacher edits or reminder notifications.
* **Watermark Reconciliation:** Extracted items are validated against the active watermark. If confirmed novel, the record is written to `/data/updates/delta_<timestamp>.json`, and the watermark advances.

---

## 5. Autonomous "API-First" Interception vs. Dynamic DOM Scraping

Web portals and SPAs rarely hardcode dynamic content into static HTML. The Chrome Extension runs a background passive network sniffer during initial user navigation to detect backend endpoints.

```
                         [ User Visits Portal ]
                                   │
                                   ▼
                   [ Passive Network Sniffer (CDP) ]
                                   │
             Is structured JSON returned from an internal API?
                                   │
                  ┌────────────────┴────────────────┐
                  │                                 │
               [ YES ]                            [ NO ]
                  │                                 │
                  ▼                                 ▼
     ┌───────────────────────────┐     ┌───────────────────────────┐
     │   Strategy A: Direct API  │     │   Strategy B: DOM Scrape  │
     │                           │     │                           │
     │ • Captures endpoint URL   │     │ • Gemini Nano ARIA recipe │
     │ • Replays auth headers    │     │ • Asset-blocked WebView   │
     │ • Immune to DOM changes   │     │ • Evaluates rendered DOM  │
     │ • Sub-300ms execution     │     │ • High resilience ladder  │
     └───────────────────────────┘     └───────────────────────────┘
```

### Strategy A: Autonomous Direct API Replay (Primary)
* **Capture:** Uses `chrome.debugger` to observe responses where `Content-Type == application/json`. When a response contains array structures with keys like `id`, `title`, `date`, `assignment`, or `score`, the endpoint schema and required authentication headers (`Authorization`, `X-CSRF-Token`, custom session cookies) are recorded into `recipe_<id>.json`.
* **Execution:** Both Chrome Extension and Android app bypass all browser/DOM overhead. Android executes a raw HTTP request via `OkHttp` using cached headers and cookies:
  * Zero DOM rendering overhead.
  * Memory footprint remains under 15MB.
  * Completely immune to frontend CSS/HTML redesigns.

### Strategy B: Dynamic DOM Extraction (Fallback)
* Used only when the application is server-side rendered (SSR) or utilizes binary serialization (e.g., Protobuf/gRPC-Web).
* **Gemini Nano** analyzes the DOM hierarchy of clicked elements and generates an **Attribute Hierarchy Ladder**:
  1. Dedicated test identifiers (`data-testid`, `data-id`).
  2. Accessibility roles (`role="article"`, `role="listitem"`, `aria-label`).
  3. Semantic HTML5 tags (`<time>`, `<h3>`, `<article>`).
  4. Human-readable class names (filtering out dynamic build hashes matching regex `^[a-zA-Z0-9_-]{8,}$`).
* **Android Headless Execution:** Evaluates the selector recipe inside an off-screen Android `WebView` configured to block images, fonts, styles, and analytics trackers via `shouldInterceptRequest`.

---

## 6. Real-Time Transactional Handoff Protocol

To coordinate between Android and Chrome without a central broker server, Google Drive acts as a transactional lock manager:

```
Android Intercepts Notification
               │
               ▼
Creates /queue/task_<id>.json ("status": "PENDING")
Enqueues WorkManager task (90-second initial delay)
               │
               ├─────────────────────────────────────────┐
               ▼                                         ▼
    [ Laptop Online & Active ]               [ Laptop Offline / Asleep ]
Reads task.json within 90s window            No desktop claim recorded
Updates "status": "CLAIMED"                              │
Executes scrape (API / Tab)                              ▼
Saves result to /data/updates/               Android WorkManager fires
Updates "status": "COMPLETED"                Sees "status" is still "PENDING"
               │                             Executes local fallback scrape
               ▼                             Saves result to /data/updates/
Android WorkManager fires (90s)              Updates "status": "COMPLETED_BY_MOBILE"
Sees "CLAIMED" / "COMPLETED"
Aborts local scrape & exits cleanly
```

---

## 7. Universal Schema-Driven UI & The 5 Atomic Primitives

The presentation layer makes no assumptions regarding the domain. All data streams—whether academic assignments, YouTube Kids history, or gaming dashboards—are classified into **5 Universal Primitives**:

| Primitive Type | Detection Heuristics | Real-World Use Cases | Native UI Rendering |
| :--- | :--- | :--- | :--- |
| **`TIMELINE_ACTION`** | Contains future date strings, ISO timestamps, or due date keywords. | Homework deadlines, exam schedules, fee due dates. | Urgency cards with "Days Remaining" pills and countdown banners. |
| **`MEDIA_CARD`** | Contains image URLs (`.jpg`, `.webp`, `ytimg.com`) alongside titles. | YouTube Kids watch history, gaming skins, avatar badges. | Media grid with responsive image thumbnails and subtitle tags. |
| **`STAT_METRIC`** | Scalar numbers, currency symbols, or units (`coins`, `pts`, `hrs`, `XP`). | Roblox Robux balances, attendance percentages, rankings. | Hero KPI metric cards displaying bold values with subtext. |
| **`PROGRESS_GAUGE`** | Fractions (`current/max`) or percentage patterns (`85%`). | Battle Pass tiers, syllabus completion, attendance rates. | Linear or circular progress indicators. |
| **`EVENT_STREAM`** / **`DATA_GRID`** | Uniform arrays of $\ge 2$ columns or chronological text records. | Grade reports, general circulars, chat history, match logs. | Sortable data tables or expandable chronological card streams. |

### Dynamic UI Composition (`layout_manifest.json`)
An automated layout evaluator inspects the active records on Google Drive and writes `layout_manifest.json`. Native renderers (Jetpack Compose on Android, Web Components in Chrome) mount and order these widgets dynamically:
* If items exist with `due_date - now() <= 48h`, `TIMELINE_ACTION` is pinned to priority 1 with a warning banner.
* If YouTube history is updated, `MEDIA_CARD` mounts in the active stream.
* If no deadlines exist, administrative circulars take priority.

---

## 8. Embedded On-Device Conversational Agent (Local RAG)
Alongside the dashboard, both platforms embed an interactive assistant:
* **Vector Index:** Post titles, circular bodies, and dashboard summaries are embedded using **EmbeddingGemma 2** into a compact 256-dimensional MRL index synced via Drive.
* **Local Synthesis:** When a user queries the system (*"What tests are scheduled for next week?"* or *"How much YouTube Kids was watched today?"*), the top matching records are retrieved and passed to **Gemini Nano**.
* **Zero-Hallucination Guardrails:** The model is constrained to answer strictly from the retrieved JSON context, attaching timestamps and source citations to every factual claim.

---

## 9. Non-Functional Requirements & Safety Specifications
1. **Security & Session Hygiene:** Session tokens stored in `session_auth.json` on Drive must be AES-256 encrypted using an encryption key derived from the user's primary Google Account ID.
2. **Android Lifecycle & OOM Prevention:** Off-screen WebViews must be instantiated strictly on the main thread, execute extraction scripts within a 15-second hard timeout, and call `webView.destroy()` immediately upon data extraction.
3. **Self-Healing Recipe Lifecycle:** If a scraper returns 0 items following a valid notification, the recipe status is flagged as `STALE`. On the next user session in Chrome, the extension prompts a 1-click re-inspection or uses Gemini Nano to re-anchor selectors.
