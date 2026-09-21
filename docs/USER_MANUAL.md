# 📖 K.I.D.S. User & Parent Manual
### Kids Intelligent Dashboard System — Ambient Educational Companion

<p align="center">
  <img src="https://img.shields.io/badge/Platform-Android_8.0%2B_(Target_14%2F15)-1A365D?style=for-the-badge&logo=android" alt="Android 14+"/>
  <img src="https://img.shields.io/badge/Cost-%240.00_Cloud_Infrastructure-2ECC71?style=for-the-badge" alt="$0 Cost"/>
  <img src="https://img.shields.io/badge/Privacy-100%25_On--Device-1A365D?style=for-the-badge" alt="100% On-Device"/>
  <img src="https://img.shields.io/badge/OAuth_Scope-drive.file_only-ED8936?style=for-the-badge" alt="drive.file only"/>
  <img src="https://img.shields.io/badge/Accessibility-WCAG_2.1_AA%2FAAA-34495E?style=for-the-badge" alt="WCAG AA"/>
</p>

---

## 🌟 Welcome to K.I.D.S.

As parents, keeping up with school communications is exhausting. Homework assignments are posted in **Google Classroom**, urgent circulars arrive over **WhatsApp parent groups**, fee schedules sit in a **School ERP portal** (CampusCare, Toddle, Edunext), and exam timetables are buried inside multi-page **PDF attachments**. 

**K.I.D.S. (Kids Intelligent Dashboard System)** solves this pain point completely. It runs quietly on your Android smartphone as an ambient educational companion. It listens for incoming school announcements, crawls historical notice boards, performs optical character recognition (OCR) on circulars and worksheets, and automatically syncs everything directly into your personal **Google Drive Vault** in clean, AI-native formats (`notices.jsonl`, `MASTER_DIGEST.md`, `graph.html`, and `attachments/`).

> [!IMPORTANT]
> **Privacy Guarantee ($0 Cloud Cost & Zero Third-Party Servers):**
> K.I.D.S. does **NOT** use any cloud servers, external databases, or third-party relays. All data processing occurs 100% locally on your smartphone. Network traffic flows strictly and exclusively between your Android device and your own personal Google Drive account under the restricted `https://www.googleapis.com/auth/drive.file` privacy scope.

---

## 📋 Table of Contents

1. [System Requirements & Installation](#1-system-requirements--installation)
2. [Onboarding Wizard: Step 0 Prerequisite & 4-Step Setup](#2-onboarding-wizard-step-0-prerequisite--4-step-setup)
   - [Hardware, Gesture & TopBar Back Navigation](#hardware-gesture--topbar-back-navigation)
   - [Step 0: System Permissions & Setup (Prerequisite Gate)](#step-0-system-permissions--setup-prerequisite-gate)
     - [Android 13+ Dynamic Presentation ('Allow restricted settings')](#android-13-dynamic-presentation-allow-restricted-settings)
     - [Mandatory Accessibility Service Gate](#mandatory-accessibility-service-gate)
     - [Live UI Refresh via Lifecycle Observation](#live-ui-refresh-via-lifecycle-observation)
   - [Step 1: Cloud Vault & Child Profile](#step-1-cloud-vault--child-profile)
   - [Step 2: Google Classroom Mapping](#step-2-google-classroom-mapping)
   - [Step 3: School App & ERP Picker](#step-3-school-app--erp-picker)
   - [Step 4: WhatsApp Group Capture](#step-4-whatsapp-group-capture)
   - [Seamless Multi-Child (+ Add Child) Setup Flow](#seamless-multi-child--add-child-setup-flow)
3. [Android Permissions & Safety Guarantees](#3-android-permissions--safety-guarantees)
   - [Notification Listener Service (24/7 Passive Capture)](#notification-listener-service-247-passive-capture)
   - [Accessibility Service (Historical Backfill Assistant)](#accessibility-service-historical-backfill-assistant)
   - [Storage Access & The Anti-Clutter Staging Lifecycle](#storage-access--the-anti-clutter-staging-lifecycle)
4. [Google Classroom Deep Auto-Capture Guide](#4-google-classroom-deep-auto-capture-guide)
   - [Stream Tab vs. Classwork Tab](#stream-tab-vs-classwork-tab)
   - [The Floating K.I.D.S. Assistant Overlay & Live 2-Line Status Pill](#the-floating-kids-assistant-overlay--live-2-line-status-pill)
   - [Deep Post Traversal & Autonomous File Downloads](#deep-post-traversal--autonomous-file-downloads)
   - [Immediate Stop & Automated Drive Sync](#immediate-stop--automated-drive-sync)
   - [End-of-Stream Auto-Completion](#end-of-stream-auto-completion)
5. [WhatsApp School Group Integration](#5-whatsapp-school-group-integration)
   - [Real-Time Group Capture](#real-time-group-capture)
   - [Manual Chat Export Fallback (.txt / .zip)](#manual-chat-export-fallback-txt--zip)
6. [Accessing Your AI-Native Drive Vault](#6-accessing-your-ai-native-drive-vault)
   - [Vault Folder Structure](#vault-folder-structure)
   - [Using `MASTER_DIGEST.md` & `FAMILY_DIGEST.md`](#using-master_digestmd--family_digestmd)
   - [Exploring the Interactive Knowledge Graph (`graph.html`)](#exploring-the-interactive-knowledge-graph-graphhtml)
   - [Connecting AI Agents (Google Gemini & MCP Servers)](#connecting-ai-agents-google-gemini--mcp-servers)
7. [Troubleshooting & Diagnostic Logs](#7-troubleshooting--diagnostic-logs)
   - [Reading Diagnostic Logs on Google Drive](#reading-diagnostic-logs-on-google-drive)
   - [Xiaomi / MIUI / HyperOS Specific Setup](#xiaomi--miui--hyperos-specific-setup)
   - [Google Drive Authorization & SHA-1 Registration](#google-drive-authorization--sha-1-registration)
   - [Frequently Asked Questions (FAQ)](#frequently-asked-questions-faq)

---

## 1. System Requirements & Installation

### System Requirements
| Component | Specification | Details |
| :--- | :--- | :--- |
| **Operating System** | Android 8.0 (Oreo) or higher | Recommended: Android 14 or 15 (Target SDK 34/35) |
| **Google Account** | Personal Google Account (`@gmail.com`) | Free personal Google Drive storage (15 GB standard) |
| **Hardware** | 2 GB RAM minimum, 50 MB disk space | ML Kit runs on standard ARM64 / ARMv7 processors |
| **Network** | Wi-Fi or Mobile Data | Required only during Drive synchronization cycles |

### Downloading & Installing the App
1. Download the latest `app-debug.apk` directly from the [GitHub Releases](https://github.com/daarshnicsanjeev/K.I.D.S/releases/tag/latest) page.
2. Open the downloaded `.apk` on your Android smartphone.
3. If prompted by Android, enable **Install from Unknown Sources** for your browser or file manager.
4. Launch **K.I.D.S.** from your application drawer.

---

## 2. Onboarding Wizard: Step 0 Prerequisite & 4-Step Setup

When you first launch K.I.D.S., you are guided through a structured onboarding flow starting with a mandatory system permissions gate, followed by a 4-step sequential child setup wizard. The wizard configures Child #1 completely before returning to the multi-child dashboard. You do not have to type school passwords or configure complex cloud credentials.

```mermaid
flowchart LR
    S0["Step 0: System Permissions<br/>(Prerequisite Gate)"] --> S1["Step 1: Vault & Profile"]
    S1 --> S2["Step 2: Classroom"]
    S2 --> S3["Step 3: School ERP"]
    S3 --> S4["Step 4: WhatsApp"]
    S4 --> DASH["Children Dashboard"]
```

### Hardware, Gesture & TopBar Back Navigation

Navigating through multi-step setup is completely effortless and resilient. You are never trapped in a forward-only flow:

- **TopBar Back Button (`←`):** An accessible, prominent back arrow is positioned in the top navigation bar on every step where backward progression or cancellation is possible. It complies with WCAG 2.1 AA/AAA standards with a minimum touch target size of 48dp × 48dp.
- **Hardware & Gesture Navigation:** Swiping from the left or right screen edge (Android predictive gesture navigation) or pressing your phone's physical Back button triggers the exact same reliable backward transition.
- **Deterministic Step Sequence:**
  - **From Step 4 (WhatsApp):** Returns to **Step 3 (School App & ERP)**.
  - **From Step 3 (School App & ERP):** Returns to **Step 2 (Google Classroom)**.
  - **From Step 2 (Google Classroom):** Returns to **Step 1 (Cloud Vault & Profile)**.
  - **From Step 1 (Cloud Vault & Profile):** If Accessibility Service was revoked or missing, returns to **Step 0 (Permissions Gate)**. If you are adding a secondary child from the dashboard, pressing Back safely cancels setup and returns you to the Children Dashboard without altering existing profiles.
  - **From Step 0 (Permissions Gate):** If accessed during a multi-child session, pressing Back cleanly exits back to the Children Dashboard.

---

### Step 0: System Permissions & Setup (Prerequisite Gate)
*The critical prerequisite gate ensuring all background capture and backfill capabilities are operational before provisioning child vaults.*

#### Android 13+ Dynamic Presentation ('Allow restricted settings')
> [!IMPORTANT]
> **Dynamic Presentation Only on Android 13, 14, and 15 (API 33+):**
> Android 13 introduced an enhanced security sandbox (`APP_OPS_ACCESS_RESTRICTED_SETTINGS`) that automatically disables sensitive accessibility and notification listener toggles for sideloaded applications (installed via APK from GitHub Releases). If you try enabling them directly in phone settings, Android displays a greyed-out toggle with the notice:
> *"Restricted setting: For your security, this setting is currently unavailable."*
>
> **Clean Setup on Android 10, 11, and 12:**
> On devices running Android 10 through 12, this operating system restriction does not exist. K.I.D.S. dynamically detects your Android version and **completely hides the "Advance Permission" card on Android 10–12**, keeping your setup screen clean, uncluttered, and free of unnecessary instructions!

**The 3-Step Solution for Android 13+ Devices (DO FIRST):**
1. In Step 0, tap the primary button: **Open App Settings (⋮ → Allow restricted settings)**.
2. In the Android **App Info** screen that opens, tap the **three dots (⋮)** in the top-right corner.
3. Tap **Allow restricted settings** and authenticate using your device PIN, pattern, or fingerprint.

> [!TIP]
> **Dual Unblock:** Completing this single 3-step action unblocks **both** the Accessibility Service and Notification Listener Service simultaneously, allowing both toggles in system settings to be enabled freely.

#### Mandatory Accessibility Service Gate
- **Status:** **MANDATORY** before Step 1 can be unlocked.
- **Why it is required:** Powers the **Floating K.I.D.S. Assistant**, native list auto-scrolling, discrete post card parsing, and autonomous zero-click attachment downloads in Google Classroom and School ERP portals.
- **The Mandatory Gate:** The **"Continue to Step 1: Cloud Vault & Profile →"** button remains strictly **locked and disabled** until Accessibility Service is turned on. A prominent warning banner alerts you:
  *"⚠️ Accessibility Service is mandatory before Step 1. Please enable it above to unlock Step 1."*
- **How to enable:**
  1. Tap **Enable Accessibility Service →**.
  2. Under **Downloaded Apps** (or **Installed Services**), tap **K.I.D.S.**.
  3. Turn the switch **ON** and tap **Allow** on the system confirmation prompt.
- **Architectural Guard:** If Accessibility Service is ever disabled or revoked in phone settings at any point, K.I.D.S. automatically returns you to Step 0 until it is re-enabled.

#### Notification Listener Service (Recommended)
- **Status:** **RECOMMENDED** for 24/7 background capture.
- **What it does:** Allows K.I.D.S. to silently capture homework, circulars, and announcements from school WhatsApp groups and school app push notifications the moment they arrive.
- **How to enable:** Tap **Enable Notification Access →**, locate **K.I.D.S.** in the list, and toggle the switch to ON.

#### Storage & Downloads Access (Recommended)
- **Status:** **RECOMMENDED** for auto-syncing attachments.
- **What it does:** Allows K.I.D.S. to detect downloaded circular PDFs and worksheets in your device's public Downloads directory, move them into private vault staging, and sync them to Google Drive without cluttering your phone.
- **How to enable:** Tap **Enable Storage Access →** and grant All Files Access (`MANAGE_EXTERNAL_STORAGE`).

#### Live UI Refresh via Lifecycle Observation
You never have to tap a "Refresh" button or restart K.I.D.S. after granting permissions in phone settings:
- K.I.D.S. monitors system lifecycle transitions (`Lifecycle.Event.ON_RESUME`).
- The moment you finish granting a permission and press Back to return to K.I.D.S., the screen **instantly refreshes**.
- Permission status badges transition live from red/orange to a bright green **✓ ACTIVE** chip.
- As soon as Accessibility Service is active, the **Continue to Step 1** button instantly unlocks and turns deep navy.

---

### Step 1: Cloud Vault & Child Profile
*The foundation of your child's private data storage.*

1. **Select Google Account for Vault**:
   - Tap **Select Google Account for Vault**.
   - Pick your personal Google Account using the native Android system account picker.
   - When prompted, grant access to create files in your personal Google Drive (`drive.file` scope).
2. **Enter Child Details**:
   - **Child First Name**: e.g., `Aarav` or `Maya`.
   - **Academic Year**: Select the current academic session (e.g., `2026-2027`).
   - **Child Photo (Optional)**: Select a photo from your gallery using the secure Android Photo Picker.
3. **Vault Creation & Instant Step Transition**:
   - Tap **Save Profile & Create Vault on Drive →**.
   - K.I.D.S. communicates directly with the Google Drive REST API to provision your private folder structure:
     `Google Drive / K.I.D.S. Data / 2026-2027 / Aarav /`.
   - **Zero-Lag UI Transition:** Step 1 transitions smoothly into Step 2 in **~1.5 seconds on first creation**, and **instantly (<50ms) when cached**.
   - **Why It Is So Fast:**
     - **SharedPreferences Folder Caching:** Once created, all folder IDs (`rootKidsFolderId`, `yearFolderId`, `childFolderId`, `attachmentsFolderId`, `systemFolderId`, and `logsFolderId`) are persisted in Android `SharedPreferences`. Subsequent setup passes or profile re-edits skip all Google Drive network discovery roundtrips, completing in under 50 milliseconds.
     - **Parallel Subfolder Resolution:** On cold creation, sibling folders (`attachments/` and `_system/`) resolve concurrently in parallel over coroutines rather than sequentially.
     - **Asynchronous Background Template Seeding:** Heavy initial files—including `MASTER_DIGEST.md`, `FAMILY_DIGEST.md`, `_system/knowledge_graph.json`, `graph.html`, and diagnostic trace logs—seed quietly in the background without blocking the user interface or freezing the screen. Parents proceed directly to Step 2 without waiting.

### Step 2: Google Classroom Mapping
*Seamlessly link school assignments and circulars without school admin blockages.*

1. **Enable Google Classroom**: Toggle the switch to **On**.
2. **Select Student Account**:
   - Tap **Select Account** to choose the Google account that your child uses for Google Classroom (e.g., `student@school.edu` or a family account).
   - > [!TIP]
   - > **Zero Password Typing:** Because this account is already authenticated on your Android phone, K.I.D.S. maps notifications and classroom streams by email handle without requiring school IT administration passwords or OAuth approval!
3. **Historical Backfill Assistant & Storage Status**:
   - Because you already enabled the **Accessibility Service** and **Storage Access** in Step 0, green checkmark badges confirm their active status.
   - If either service was inadvertently switched off, quick-reconnect buttons allow instant re-enablement right within Step 2.
4. Tap **Save & Next →**.

### Step 3: School App & ERP Picker
*Capture notices from school management portals (CampusCare, Toddle, Edunext, Teams).*

1. **Enable School App Tracking**: Toggle the switch to **On**.
2. **Select Installed App**:
   - K.I.D.S. scans your phone's installed applications and displays them in a single-tap list (e.g., `CampusCare / Entab`, `Toddle Family Portal`, `Edunext Parent Portal`, `Microsoft Teams`).
   - Simply tap the app your school uses.
3. **Select Tracked Categories**:
   - Check the categories you wish to track: `Homework`, `Circulars`, `Attendance`, `Fee Receipts`.
4. Tap **Save & Next →** (or tap **Skip App Setup** if your school only uses Classroom and WhatsApp).

### Step 4: WhatsApp Group Capture
*Filter the noise and capture only official school circulars from parent WhatsApp groups.*

1. **Enable WhatsApp Group Capture**: Toggle the switch to **On**.
2. **Zero-Typing Group Selection**:
   - Select the detected school group chip from the list (e.g., `School Parents Official Group 2026-27`), or tap **Listen for Message** to auto-detect the group when the next school notification arrives.
3. Tap **Complete Setup for [Child Name] ✓**.
   - Your child's profile is initialized in the local encrypted database.
   - The initial knowledge graph (`graph.html`) and markdown digests (`MASTER_DIGEST.md` and `FAMILY_DIGEST.md`) are generated and uploaded to Google Drive.
   - You are redirected to the **Children Grid Dashboard**.

---

### Seamless Multi-Child (+ Add Child) Setup Flow
*Effortlessly manage multiple siblings across different grades, sections, or even different schools.*

Once your first child is configured, K.I.D.S. transforms into a multi-child family command center. Adding a second or third child is instant, clean, and completely isolated:

1. **Initiate Setup from Dashboard:** On the **Children Grid Dashboard**, tap the **+ Add Another Child** button.
2. **Prerequisite Step 0 Bypassed Automatically:** Because core system permissions (Accessibility, Notifications, and Storage) were already granted during the setup of Child #1, K.I.D.S. validates their active state and opens directly on **Step 1: Cloud Vault & Child Profile**.
3. **Clean Slate Guarantee (Zero Cross-Contamination):** 
   - The child name input field starts completely empty (`""`). It will **never** pre-fill or accidentally carry over the previous child's name, grade, or photo.
   - Secondary child sessions operate under a fresh session sequence (`childSequenceNumber > 1`), isolating local wizard preferences so your older child's configuration is never overwritten or mutated.
4. **Isolated Google Drive Vault:**
   - K.I.D.S. provisions an independent subfolder hierarchy on your Google Drive:
     `Google Drive / K.I.D.S. Data / {AcademicYear} / {NewChildName} /`
   - Child #2 gets their own dedicated `notices.jsonl`, `MASTER_DIGEST.md`, `graph.html`, and `attachments/` folder.
   - The top-level `FAMILY_DIGEST.md` is automatically updated to synthesize notices across all your children into one single family briefing!
5. **Sequence Visual Indicator & Cancel Safety:**
   - The top bar displays a prominent amber badge (`Child #2`, `Child #3`, etc.), ensuring you always know which child you are currently configuring.
   - If you tap the TopBar Back arrow (`←`) or use your phone's back gesture from Step 1, the wizard cleanly cancels and returns you directly to the **Children Grid Dashboard** without saving partial records or affecting your existing children.

---

## 3. Android Permissions & Safety Guarantees

Android permissions can sometimes feel intrusive. K.I.D.S. is built with strict architectural boundaries to guarantee that your personal data is never compromised.

```mermaid
flowchart TD
    subgraph Device["Android Device"]
        NOTIF["Push Notification"] --> NLS["Notification Listener"]
        NLS --> PF{"PrivacyFilter<br/>(Memory Boundary)"}
        
        PF -->|Whitelisted School App| KEEP["Multi-Child Router & Local DB"]
        PF -->|Personal Chat, Bank Alert, OTP| DROP["DROP IMMEDIATELY<br/>Zero Disk Persistence<br/>Zero Cloud Sync"]
    end
```

### Notification Listener Service (24/7 Passive Capture)
- **Android Permission:** `BIND_NOTIFICATION_LISTENER_SERVICE`
- **What it does:** Allows K.I.D.S. to receive notifications from school apps (Classroom, WhatsApp, ERP portals) the millisecond they arrive, even when the phone screen is locked.
- **Safety Guarantee:** 
  - Every notification is checked against the **`PrivacyFilter` at the memory boundary**.
  - If the notification is from a personal contact, non-whitelisted WhatsApp group, bank, or contains keywords like `OTP`, `verification code`, `debited`, or `UPI`, it is **dropped immediately from RAM**.
  - It is **never** written to local disk, never logged to any file, and never transmitted over the internet.

### Accessibility Service (Historical Backfill Assistant)
- **Android Permission:** `BIND_ACCESSIBILITY_SERVICE`
- **What it does:** Powers the **Floating K.I.D.S. Assistant** over Google Classroom. It scrolls through past announcements, extracts circulars and homework posted weeks or months ago, and auto-downloads attachments.
- **Mandatory Setup Gate:** Enforced as a strict prerequisite in Step 0 before Child Profile or Vault creation. Without it, retrospective crawling of past announcements and worksheets cannot function.
- **Safety Guarantees:**
  - **Active Only In School Apps:** The service activates only when Google Classroom or an authorized school ERP is actively displayed on your screen. It automatically hides when you navigate to your home screen or another app.
  - **Zero Keystroke Logging:** It only inspects public text views and attachment chips in educational lists. It never inspects passwords, text fields, or personal keyboards.
  - **100% On-Device Processing:** Node-tree inspection, chip detection, and click dispatch execute entirely in local memory with zero external transmission.

### Storage Access & The Anti-Clutter Staging Lifecycle
- **Android Permission:** `MANAGE_EXTERNAL_STORAGE` (All Files Access) / `READ_EXTERNAL_STORAGE`
- **Why it is needed:** When you or the assistant download a circular PDF or worksheet from Google Classroom, Android places the file in your device's public `Download/` or `Download/Classroom/` folder.

#### The Autonomous Anti-Clutter Staging Lifecycle
Without K.I.D.S., your phone's personal `Downloads` folder would quickly fill up with hundreds of school PDFs, making it impossible to find your own personal files. K.I.D.S. implements an autonomous **5-step anti-clutter lifecycle**:

```mermaid
sequenceDiagram
    participant GC as Google Classroom
    participant PUB as Public Downloads Folder
    participant OBS as DownloadFolderObserver
    participant STAGE as Private Vault Staging
    participant DRIVE as Parent Google Drive

    GC->>PUB: Downloads circular PDF
    OBS->>PUB: Scans & detects school file
    OBS->>STAGE: Moves file out of public Downloads (Anti-Clutter)
    Note over PUB: Public Downloads is kept 100% clean!
    OBS->>DRIVE: DriveSyncWorker uploads attachment to Drive
    DRIVE-->>STAGE: Upload confirmed (HTTP 200)
    STAGE->>STAGE: Staged file permanently deleted
    Note over STAGE: Zero local storage waste!
```

1. **Autonomous Detection:** When a school attachment downloads, the `DownloadFolderObserver` scans public storage (`Downloads/` and `Downloads/Classroom/`).
2. **Immediate Move to Staging:** The detected file is **immediately moved out of public Downloads** into the private sandbox staging directory:
   `Android/data/com.kids.collector/files/vault_attachments/`.
3. **Zero Clutter:** Your personal Downloads folder stays spotless. No school circulars or worksheets linger to clutter your personal files.
4. **Drive Upload & ML Kit OCR:** `DriveSyncWorker` performs offline OCR on the file and uploads it securely to `Google Drive / K.I.D.S. Data / {Year} / {Child} / attachments/`.
5. **Automatic Cleanup:** As soon as Google Drive confirms a successful upload, the file is **deleted from the private staging folder**. Local storage consumption drops back to near zero.
6. **Residual Deletion:** If an already-synced file ever lingers in public Downloads, K.I.D.S. automatically detects and removes it.

> [!NOTE]
> WhatsApp documents and images are indexed in place and are **never moved or deleted**, ensuring your WhatsApp chat media remains fully functional.

---

## 4. Google Classroom Deep Auto-Capture Guide

When setting up a child or catching up on previous weeks of schoolwork, Google Classroom contains a treasure trove of past announcements, circulars, worksheets, and syllabus PDFs. 

Rather than simply skimming visible surface summaries, K.I.D.S. features an autonomous **Deep Auto-Capture Engine**. The assistant systematically navigates into each individual post card, extracts the full announcement text, downloads every attached document directly to your device, and safely returns to the stream to continue traversing historical records.

### Stream Tab vs. Classwork Tab

Google Classroom organizes content into two distinct tabs:
1. **The Stream Tab:**
   - Contains chronological announcements, principal circulars, exam schedules, and holiday notices.
   - Attachments here are typically administrative circulars, weekly schedules, and school newsletters.
2. **The Classwork Tab:**
   - Contains subject-wise topics (e.g., *Mathematics*, *Science*, *English Literature*, *Social Studies*).
   - Contains homework assignments, practice question banks, printable worksheets, and project guidelines.

> [!TIP]
> **Recommended Workflow:**
> Run Auto-Capture **twice**: first on the **Stream** tab to capture administrative circulars, and second on the **Classwork** tab to capture all subject worksheets and study materials!

### The Floating K.I.D.S. Assistant Overlay & Live 2-Line Status Pill

When you open Google Classroom, K.I.D.S. automatically displays the **Floating Assistant** on the screen using Android's lightweight accessibility overlay layer (`TYPE_ACCESSIBILITY_OVERLAY`), requiring **zero extra permissions** like "Draw over other apps":

```
+-------------------------------------------------------+
|  K.I.D.S. Assistant         [ 14 Notices • 6 Files ]  — ✕ |
|  Status: Scanning Stream...                           |
|  "Mathematics Worksheet - Fractions Chapter 4"         |
|  +-------------------------------------------------+  |
|  |             ▶ Start Auto-Capture                |  |
|  +-------------------------------------------------+  |
+-------------------------------------------------------+
```

When active, the action button dynamically changes to a prominent red stop button:

```
+-------------------------------------------------------+
|  K.I.D.S. Assistant         [ 15 Notices • 7 Files ]  — ✕ |
|  Status: Downloading (1/2)...                         |
|  fraction_practice_sheet_grade5.pdf                   |
|  +-------------------------------------------------+  |
|  |             ⏹ Stop Capture                      |  |
|  +-------------------------------------------------+  |
+-------------------------------------------------------+
```

#### Real-Time Status & Metrics Display
The floating assistant features an informative **live 2-line status pill**:
- **Top Status Line (Active FSM State):** Reflects the exact operation the crawler is performing in real time:
  - `Status: Ready` — Idle and ready to start.
  - `Status: Scanning Stream...` — Inspecting the current screen viewport for unvisited post cards.
  - `Status: Opening Post...` — Tapping into a specific post card to view its full details.
  - `Status: Reading Detail...` — Extracting complete announcement text, author, timestamp, and attachment metadata.
  - `Status: Downloading (X/Y)...` — Disagreeing with manual clicks: autonomously downloading the $X$-th attachment out of $Y$ total files attached to the current post.
  - `Status: Opening (X/Y)...` — Tapping an attachment chip when direct download buttons are nested.
  - `Status: Returning to Stream...` — Safely pressing Navigate Up or system Back to re-anchor in the list view.
  - `Status: Scrolling Stream...` — Advancing the stream list once all visible cards have been processed.
  - `Status: Capture Complete!` — Backfill completed after end-of-stream detection.
  - `Status: Capture Stopped` — Manually stopped by the parent.
  - `Status: Paused (External App)` — Pauses immediately if an external app or dialog comes to foreground.
- **Bottom Metrics Badge (`XX Notices • YY Files`):** Kept up to date live. Displays the exact tally of unique school notices backfilled and physical attachment files (.pdf, .docx, .jpg) triggered for download during this session.
- **Detail Snippet Line:** An auto-truncating preview line that displays the exact post headline or filename currently being processed (e.g., `"Circular No. 14 - Annual Sports Day Schedule"` or `"worksheet_fractions_ch4.pdf"`).
- **— Minimize:** Collapses the assistant into a compact, floating amber **`K`** circular bubble (48dp × 48dp) that you can drag anywhere on your screen. Tap the bubble anytime to expand it back.
- **✕ Close:** Closes the assistant overlay until you reopen Classroom.

### Deep Post Traversal & Autonomous File Downloads

K.I.D.S. completely eliminates the exhausting chore of tapping into dozens of announcements, opening attachments, and downloading worksheets one by one:

```mermaid
flowchart TD
    A["Scan Stream Viewport<br/>(Exclude TopBar & Tabs)"] --> B{"Unvisited Post Found?"}
    B -->|Yes| C["Tap Post Card<br/>(Status: Opening Post...)"]
    C --> D["Verify Detail Screen<br/>(2.5s Safety Timeout)"]
    D --> E["Dismiss Soft Keyboard<br/>& Extract Full Text"]
    E --> F["Scan All Attachments<br/>(.pdf, .docx, .jpg, etc.)"]
    F --> G{"Attachments Found?"}
    G -->|Yes| H["Loop: Tap Download / Chip<br/>(800ms Calibrated Debounce)"]
    G -->|No| I["Guarded Return to Stream<br/>(Navigate Up / Back)"]
    H --> I
    I --> J["Verify Stream Restored<br/>(Stabilize 600ms)"]
    J --> A
    B -->|No| K["Native Scroll Forward<br/>(Status: Scrolling Stream...)"]
    K --> L{"New Posts Found After Scroll?<br/>(850ms Viewport Settling)"}
    L -->|Yes (Reset Counter)| A
    L -->|No (Counter + 1)| M{"2 Consecutive Empty Scrolls?"}
    M -->|No| K
    M -->|Yes| N["Status: Capture Complete!<br/>Trigger Immediate Drive Sync"]
```

1. **Deterministic Post Discovery:** The crawler scans the stream viewport, ignoring app bar chrome and bottom navigation tabs. It computes a SHA-256 fingerprint of each card's content so no post is ever processed twice or missed across scrolls.
2. **Deep Post Entry:** The crawler clicks the post card and waits up to 2,500ms to confirm transition into the post detail view.
3. **Keyboard Dismissal & Full Text Harvesting:** If the Android soft keyboard opens automatically over the "Add class comment" input box, the assistant immediately clears input focus to prevent view occlusion. It extracts the full announcement body, author, and timestamp.
4. **Autonomous Multi-File Downloading:**
   - The assistant scans the post for all educational file types: `.pdf`, `.doc`, `.docx`, `.xls`, `.xlsx`, `.ppt`, `.pptx`, `.jpg`, `.jpeg`, `.png`, and `.mp4`.
   - It iterates through each attachment sequentially, updates the status pill (`Status: Downloading (1/2)...`), taps the download icon or attachment chip, and enforces a **calibrated 800ms debounce delay** to allow Android's `DownloadManager` to enqueue the download reliably.
5. **Guarded Return to Stream:** The assistant taps Classroom's top **Navigate Up (`←`)** button (or issues `GLOBAL_ACTION_BACK`), waits up to 2,000ms to confirm the stream view has re-anchored, and pauses for 600ms to let view layouts stabilize before scanning for the next post.
6. **Anti-Clutter Public Storage Staging:** As files land in `Download/` or `Download/Classroom/`, the background `DownloadFolderObserver` instantly moves them to private vault staging (`vault_attachments/`), keeping your personal Downloads folder clean.

### Immediate Stop & Automated Drive Sync

You maintain absolute control over the crawler at all times:
- **Zero Delayed Actions:** Tapping **`⏹ Stop Capture`** immediately stops the crawler. The underlying Kotlin coroutine job is cancelled instantly—there are **no queued or lingering taps**, no delayed scrolls, and no unwanted navigation actions after you tap stop.
- **Automated Immediate Drive Sync:** The moment you tap `⏹ Stop Capture` (or when capture finishes), K.I.D.S. **automatically enqueues a background sync cycle** via AndroidX `WorkManager`. All newly harvested notices and staged attachment files are immediately synchronized to your Google Drive Vault without requiring any manual trigger from the dashboard.

### End-of-Stream Auto-Completion

You do not need to babysit your phone or guess when the crawler has reached the oldest post in the class:
- When all cards on the current screen are processed, the assistant scrolls forward and pauses for **850ms** for the new view items to bind and settle.
- If two consecutive scrolls yield **zero new unvisited cards** (`2/2`), the assistant recognizes that the bottom of the stream or classwork list has been reached.
- The assistant displays **`Status: Capture Complete!`** with the message *"All posts backfilled"*, stops the auto-scroller, turns the button back to `▶ Start Auto-Capture`, and immediately triggers Google Drive background synchronization.

---

## 5. WhatsApp School Group Integration

Many schools rely on WhatsApp broadcast groups or parent-teacher associations (PTAs) for time-critical updates (e.g., bus delays, emergency closures, rainy day schedules).

### Real-Time Group Capture
- When an announcement is posted in your whitelisted WhatsApp group, `KidsNotificationListenerService` intercepts it immediately.
- The `PrivacyFilter` confirms that the message originates from your selected school group.
- The `MultiChildRouter` attributes the notice to the correct child based on the group name or keywords.
- The notice is classified (`CIRCULAR`, `HOMEWORK`, `ATTENDANCE`, or `FEES`), deduplicated via SHA-256 fingerprinting, and scheduled for Drive synchronization.

### Manual Chat Export Fallback (.txt / .zip)
If you missed notifications while your phone was switched off or you recently joined the school group:
1. Open the school group in **WhatsApp**.
2. Tap the three dots (⋮) in the top-right corner → **More** → **Export chat**.
3. Choose **Without Media** (or **Include Media** if you wish to import past photos and PDF circulars).
4. In the Android share sheet, select **K.I.D.S. Importer**.
5. K.I.D.S. parses the chat transcript, extracts past announcements, links attachments, and updates your child's Google Drive Vault.

---

## 6. Accessing Your AI-Native Drive Vault

All collected communications are synchronized to your personal Google Drive in open, standardized, human-readable and machine-readable formats.

### Vault Folder Structure
In your Google Drive, navigate to **My Drive** → **K.I.D.S. Data**:

```
My Drive/
└── K.I.D.S. Data/
    └── 2026-2027/
        ├── FAMILY_DIGEST.md                     <-- High-level overview of all children
        └── Aarav/
            ├── notices.jsonl                    <-- AI-native streaming notice records
            ├── MASTER_DIGEST.md                 <-- Complete categorized Markdown briefing
            ├── graph.html                       <-- Interactive visual knowledge graph
            ├── attachments/                     <-- Downloaded circular PDFs & worksheets
            │   ├── Annual_Sports_Day_Circular.pdf
            │   └── Math_Worksheet_Ch4.pdf
            ├── Google Classroom/                <-- Dedicated channel subfolder
            │   ├── notices.jsonl
            │   ├── CLASSROOM_DIGEST.md
            │   └── attachments/
            └── _system/
                ├── knowledge_graph.json         <-- GraphRAG schema index
                └── logs/
                    ├── sync_timeline.log        <-- Synchronization audit log
                    ├── crawler_trace.log        <-- Step-by-step assistant crawler log
                    └── diagnostic_snapshot.json <-- Device state & health probe
```

### Using `MASTER_DIGEST.md` & `FAMILY_DIGEST.md`
- **`MASTER_DIGEST.md`:** Opens in any Markdown reader, text editor, or Google Docs. It provides a structured summary organized into:
  - 📚 **Homework & Assignments:** Sorted by due date and subject.
  - 📢 **Circulars & Schedules:** School policies, event invitations, and exam dates.
  - 💳 **Fees & Administrative Reminders:** Due dates and payment details.
  - 🔍 **Indexed OCR Excerpts:** Full searchable text extracted from multi-page PDF circulars.
- **`FAMILY_DIGEST.md`:** Perfect for parents with multiple children. It provides a consolidated cross-child dashboard comparing notices, upcoming deadlines, and recent announcements across all enrolled kids.

### Exploring the Interactive Knowledge Graph (`graph.html`)
- Open `graph.html` directly in any web browser (Chrome, Edge, Safari, Firefox).
- The file is completely self-contained and renders an interactive **D3.js Force-Directed Graph**:
  - **Blue Nodes:** The Child profile.
  - **Orange Nodes:** Homework & Assignments.
  - **Light Blue Nodes:** Circulars & Newsletters.
  - **Green Nodes:** Teachers & Senders.
  - **Grey Nodes:** Attachments & Worksheets.
- You can zoom, pan, and drag nodes to visualize connections between subjects, teachers, and assignments!

### Connecting AI Agents (Google Gemini & MCP Servers)
Because K.I.D.S. stores your data in AI-native formats (`notices.jsonl` and `MASTER_DIGEST.md`), you can easily use modern AI tools to query your child's school life:
- **Google Gemini / Claude / ChatGPT:** Upload `MASTER_DIGEST.md` and ask:
  - *"What homework does Aarav have due this Thursday?"*
  - *"Summarize the dress code guidelines from the Sports Day circular."*
  - *"Are there any school fee payments due before the end of this month?"*
- **Model Context Protocol (MCP):** Connect an MCP-compatible agent directly to your Google Drive `notices.jsonl` file for automated real-time calendar reminders and briefing digests.

---

## 7. Troubleshooting & Diagnostic Logs

### Reading Diagnostic Logs on Google Drive
If you ever wonder why a notice was or wasn't captured, check the `_system/logs/` folder in your child's Google Drive vault:
1. **`crawler_trace.log`:** A granular, millisecond-by-millisecond execution trace of the crawler assistant. Look for lines like:
   - `[SCROLLER_CARDS] Identified 5 discrete post cards on active screen`
   - `[ATTACHMENT_AUTO_TAP] Autonomously tapping attachment chip: "Math_Unit_3.pdf"`
   - `[DOWNLOAD_MOVE] Moved "Math_Unit_3.pdf" out of public Downloads into private vault staging`
2. **`sync_timeline.log`:** A chronological record of every Google Drive upload cycle:
   - `[NOTICE BATCH SYNC] Synced 4 notices`
   - `[ATTACHMENT BATCH SYNC] Uploaded 2 physical files to attachments/`

### Xiaomi / MIUI / HyperOS Specific Setup
Devices running Xiaomi MIUI or HyperOS enforce aggressive background restrictions. To ensure seamless operation:
1. Go to **Settings** → **Apps** → **Manage Apps** → **K.I.D.S.**.
2. Enable **Autostart**.
3. Set **Battery Saver** to **No restrictions**.
4. Tap **Other permissions** and ensure **Display pop-up windows while running in the background** is allowed. This allows the Floating Assistant overlay to appear over Google Classroom.

### Google Drive Authorization & SHA-1 Registration
If Step 1 of the wizard displays an authorization error (*"Additional consent required"* or *"API access blocked"*):
1. Note the SHA-1 certificate fingerprint displayed in the error card:
   `D7:6F:AA:F1:98:E2:88:E8:AB:79:17:5B:65:13:BA:84:9F:E1:6E:88`
2. Package Name: `com.kids.collector.debug` (or `com.kids.collector`)
3. Tap **Copy SHA-1** and open your [Google Cloud Console Credentials](https://console.cloud.google.com/apis/credentials).
4. Add the Android OAuth client ID with your package name and SHA-1 fingerprint.

### Frequently Asked Questions (FAQ)

**Q: Does K.I.D.S. drain my smartphone's battery?**
*A: No. The Notification Listener is event-driven and consumes 0% battery while waiting. The Accessibility Assistant only runs when you actively trigger Auto-Capture in Google Classroom, and Drive uploads are batched efficiently via Android's WorkManager.*

**Q: Will my personal Downloads folder be filled with school files?**
*A: Never. K.I.D.S. features an autonomous anti-clutter staging engine. As soon as a school PDF is downloaded, it is moved out of public Downloads into private vault staging, uploaded to Google Drive, and then deleted locally. Your Downloads folder remains completely clean.*

**Q: Can I set up multiple children in different schools?**
*A: Yes! After completing the setup for Child #1, tap **Add Another Child** on the Children Grid Dashboard. Each child gets their own isolated Google Drive vault folder and tailored channel configurations.*

**Q: What happens if I lose internet connection?**
*A: All captured notices and local files are safely stored in your smartphone's encrypted offline SQLite Room database. Once your device reconnects to Wi-Fi or mobile data, WorkManager automatically resumes synchronization to Google Drive.*

**Q: Why does Step 1 ('Save Profile & Create Vault on Drive') finish so quickly?**
*A: K.I.D.S. is engineered with zero-lag background seeding. When you tap **Save Profile & Create Vault on Drive →**, the wizard advances to Step 2 in ~1.5 seconds on first creation, and in <50ms if the vault was previously configured and cached in local SharedPreferences. Heavy template uploads (like `MASTER_DIGEST.md`, `FAMILY_DIGEST.md`, `knowledge_graph.json`, and `graph.html`) run asynchronously in the background so you never have to wait on a loading spinner.*

---

*Thank you for trusting K.I.D.S. to protect your privacy and organize your child's educational journey!*
