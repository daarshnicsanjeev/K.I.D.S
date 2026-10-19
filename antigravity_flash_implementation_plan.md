# Antigravity Execution Plan (Flash-Model Optimized)
## K.I.D.S. v3.0.0-PROD Upgrade: Zero-MCP, Zero-GAS, Unified Google Drive Vault & Symmetrical AI Engine

**Target Environment:** Google Antigravity IDE (Flash Model Autonomous Execution Mode)  
**Target Repositories:**
1. **Primary Upgrade Target (Desktop Chrome MV3 Extension):** `C:/Users/daars/.gemini/antigravity/scratch/school-mcp-sync-engine` ([daarshnicsanjeev/school-mcp-sync-engine](https://www.google.com/search?q=https%3A%2F%2Fgithub.com%2Fdaarshnicsanjeev%2Fschool-mcp-sync-engine))
2. **Companion Sync Target (Android Collector):** `c:/K.I.D.S` ([daarshnicsanjeev/K.I.D.S](https://www.google.com/search?q=https%3A%2F%2Fgithub.com%2Fdaarshnicsanjeev%2FK.I.D.S))

## 0. Mandatory Agent Rules for Flash Model (Read Before Every Step)

You are executing a deterministic repository upgrade from `v1.0` (MCP/Google Apps Script) to `v3.0.0-PROD` (Self-Contained Google Drive Vault + Symmetrical `EmbeddingGemma 2` + Dual-Surface UI). Follow these 8 rules strictly on every turn:

1. **ZERO MCP & ZERO GOOGLE APPS SCRIPT:** NEVER create, import, or reference `.gs` files, `script.google.com`, `GasProvisionerService`, `mcp_gas_url`, or JSON-RPC MCP servers. All storage and cross-device sync happen strictly in the parent's Google Drive (`K.I.D.S. Data/`) via the Google Drive REST v3 API (`https://www.googleapis.com/drive/v3`).
2. **RESTRICTED OAUTH SCOPES ONLY:** In `extension/manifest.json`, only request `https://www.googleapis.com/auth/drive.file`, `https://www.googleapis.com/auth/spreadsheets`, `https://www.googleapis.com/auth/userinfo.email`, and `openid`. NEVER request `gmail.readonly`, `drive.readonly`, `script.projects`, or `classroom.courses.readonly`.
3. **NEVER USE GEMINI NANO TO SEARCH GOOGLE DRIVE:** Desktop search across the Google Drive Vault MUST use the **Tri-Layer Hybrid Search Engine** (`HybridSearchEngine.ts`: Google Drive REST API `files.list` + Local IndexedDB BM25 + 256-dim `EmbeddingGemma 2` cosine similarity fused via Reciprocal Rank Fusion). Reserve `window.ai.languageModel` (Gemini Nano) strictly for DOM selector synthesis, chat normalization, and summarizing the top 3 already-retrieved snippets.
4. **PRESERVE EXISTING PASSING SERVICES:** Do NOT break or delete `SanitizerService` (`extension/src/services/sanitizer.ts`) or `ErrorHasher` (`extension/src/services/errorHasher.ts`) or their existing unit tests (`tests/sanitizer.test.ts`, `tests/errorHasher.test.ts`).
5. **100% SCREEN-READER ACCESSIBILITY (JAWS / NVDA / TALKBACK):** Every HTML input, button, select, and status container MUST use the exact `id` specified in this plan, include explicit `<label for="...">` or `aria-label`, use `aria-live="polite"` for progress counters and `role="alert"` for validation errors, and be 100% operable via keyboard (`Tab`, `Shift+Tab`, `Enter`, `Escape`) with zero mouse-hover-only pickers.
6. **ZERO HARDCODING:** Never hardcode class names (`"3B"`, `"8B"`), academic years (`"2026-2027"`), static pixel coordinates, or arbitrary loop limits. All code must pass `python scripts/verify_zero_hardcode.py`.
7. **ONE ATOMIC TASK AT A TIME:** Complete each numbered task (`Task X.Y`), write its unit test, and run the **Verification Command** listed at the bottom of that task. Do NOT proceed to the next task until `npx tsc --noEmit` and `npm test` (or `./gradlew testDebugUnitTest`) pass with zero errors.
8. **CHECKBOX TRACKING:** Mark each task `- [x]` as soon as its verification command succeeds.

## Phase 1: Purge Legacy GAS/MCP Code & Configure Manifest / Build Pipeline

**Goal:** Remove all Google Apps Script and MCP server code from `school-mcp-sync-engine` and configure `manifest.json`, `vite.config.ts`, and TypeScript types for the v3.0 Drive Vault & Offscreen WebGPU architecture.

### Task 1.1: Delete Legacy GAS & MCP Directories and Files
- [ ] **Action:** Delete the following directories and files from `C:/Users/daars/.gemini/antigravity/scratch/school-mcp-sync-engine`:
  1. `gas-mcp-server/` (entire directory: `Code.gs`, `GasTests.gs`, `PortalApiFetcher.gs`, `StorageRepository.gs`, `WorkspaceFetcher.gs`, `appsscript.json`, `.clasp.json`)
  2. `gas-error-webhook/` (entire directory)
  3. `extension/src/services/gasProvisioner.ts`
  4. `extension/src/content/autoDeployScript.ts`
- **Verification Command:**
  ```bash
  cd C:/Users/daars/.gemini/antigravity/scratch/school-mcp-sync-engine
  test ! -d gas-mcp-server && test ! -d gas-error-webhook && test ! -f extension/src/services/gasProvisioner.ts && test ! -f extension/src/content/autoDeployScript.ts
  ```

### Task 1.2: Upgrade `extension/manifest.json` & `extension/vite.config.ts`
- [ ] **Target Files:**
  - `extension/manifest.json`
  - `extension/vite.config.ts`
- **Action:**
  1. Update `extension/manifest.json` to version `"3.0.0"`, name `"K.I.D.S. School Intelligence & Drive Vault Engine"`, remove the `https://script.google.com/*` content script entry for `autoDeployScript.js`, add permissions `"offscreen"`, `"alarms"`, `"debugger"`, `"unlimitedStorage"`, and restrict `oauth2.scopes` strictly to:
     ```json
     {
       "manifest_version": 3,
       "name": "K.I.D.S. School Intelligence & Drive Vault Engine",
       "version": "3.0.0",
       "description": "Zero-Backend, 100% On-Device AI School Notice, Classroom, Gmail & ERP Aggregator synced to your personal Google Drive Vault.",
       "permissions": [
         "activeTab",
         "scripting",
         "storage",
         "cookies",
         "identity",
         "offscreen",
         "alarms",
         "debugger",
         "unlimitedStorage"
       ],
       "host_permissions": [
         "<all_urls>"
       ],
       "background": {
         "service_worker": "background.js",
         "type": "module"
       },
       "action": {
         "default_popup": "src/popup/index.html",
         "default_title": "K.I.D.S. Quick Setup & Sync"
       },
       "content_scripts": [
         {
           "matches": ["<all_urls>"],
           "js": ["interceptor.js"],
           "run_at": "document_start"
         }
       ],
       "web_accessible_resources": [
         {
           "resources": ["mainWorldInterceptor.js", "src/dashboard/dashboard.html", "src/offscreen/offscreen.html"],
           "matches": ["<all_urls>"]
         }
       ],
       "oauth2": {
         "client_id": "${OAUTH_CLIENT_ID}",
         "scopes": [
           "https://www.googleapis.com/auth/drive.file",
           "https://www.googleapis.com/auth/spreadsheets",
           "https://www.googleapis.com/auth/userinfo.email",
           "openid"
         ]
       }
     }
     ```
  2. Update `extension/vite.config.ts` `rollupOptions.input` so Vite bundles:
     - `popup`: `src/popup/index.html`
     - `dashboard`: `src/dashboard/dashboard.html`
     - `offscreen`: `src/offscreen/offscreen.html`
     - `background`: `src/background/serviceWorker.ts`
     - `interceptor`: `src/content/interceptor.ts`
     - `mainWorldInterceptor`: `src/content/mainWorldInterceptor.ts`
- **Verification Command:**
  ```bash
  cd C:/Users/daars/.gemini/antigravity/scratch/school-mcp-sync-engine/extension && npm test
  ```

### Task 1.3: Create Canonical Shared Types & Data Contracts (`extension/src/types/vaultTypes.ts`)
- [ ] **Target File:** `extension/src/types/vaultTypes.ts` (CREATE)
- **Action:** Define the exact TypeScript interfaces matching the Android `KidsDatabase` and Google Drive JSON schemas:
  ```typescript
  export type UniversalPrimitiveType =
    | 'TIMELINE_ACTION'
    | 'STAT_METRIC'
    | 'PROGRESS_GAUGE'
    | 'MEDIA_CARD'
    | 'DATA_GRID';

  export type NoticeCategory =
    | 'HOMEWORK'
    | 'CIRCULAR'
    | 'FEES'
    | 'ATTENDANCE'
    | 'EVENT'
    | 'TRANSPORT'
    | 'MEDIA_ACTIVITY'
    | 'UNKNOWN';

  export type UrgencyLevel = 'URGENT_24H' | 'WARNING_48H' | 'UPCOMING' | 'NONE';

  export interface ChildChannelConfig {
    channelType: 'GOOGLE_CLASSROOM' | 'SCHOOL_GMAIL' | 'SCHOOL_PORTAL' | 'WHATSAPP_GROUP' | 'SHADOW_TEACHER';
    isEnabled: boolean;
    identifier: string; // e.g. atharva.chaodhari@myglobal.school, prarthanasawant@littlepods.in, Grade 3B CAIE Parents
  }

  export interface ChildProfile {
    childId: string;            // e.g. "child_atharva"
    name: string;               // e.g. "Atharva"
    academicYear: string;       // e.g. "2026-2027"
    discoveredGrade: string;    // e.g. "3B"
    schoolName: string;         // e.g. "Witty International School"
    accountEmail: string;       // Parent OAuth email
    studentEmail?: string;      // e.g. "atharva.chaodhari@myglobal.school"
    shadowTeacherEmails: string[]; // e.g. ["prarthanasawant@littlepods.in"]
    whitelistedDomains: string[];  // e.g. ["myglobal.school", "wittykidsindia.com", "sjbhs.org", "littlepods.in"]
    whitelistedGroups: string[];
    photoDataUrl?: string;
    rootKidsFolderId: string;
    yearFolderId: string;
    childFolderId: string;
    attachmentsFolderId: string;
    classroomFolderId?: string;
    systemFolderId: string;
    logsFolderId: string;
    step1Confirmed: boolean;
    isRemoved: boolean;
    createdAtMs: number;
  }

  export interface NoticeAttachment {
    attachmentId: string;
    fileName: string;
    mimeType: string;
    sizeBytes: number;
    fileHash: string;
    ocrText?: string;
    pageCount?: number;
    driveFileId: string;
    driveUrl: string;
    isReconciledLocked?: boolean;
  }

  export interface NoticeRecord {
    noticeId: string;
    childId: string;
    timestampMs: number;
    dueDateMs?: number;
    urgencyLevel?: UrgencyLevel;
    sourceApp: string;
    category: NoticeCategory;
    primitiveType: UniversalPrimitiveType;
    classroomCourseId?: string;
    classroomCourseName?: string;
    classroomPostId?: string;
    gmailThreadId?: string;
    title: string;
    body: string;
    sender: string;
    senderEmail?: string;
    pointsMax?: number;
    sourceUrl?: string;
    hashSha256: string;
    attachmentCount: number;
    attachments: NoticeAttachment[];
  }

  export interface NoticeIndexEntry {
    noticeId: string;
    title: string;
    category: NoticeCategory;
    primitiveType: UniversalPrimitiveType;
    timestampMs: number;
    dueDateMs?: number;
    classroomPostId?: string;
    hashSha256: string;
    attachmentHashes: string[];
    embedding: number[]; // 256 L2-normalized floats from EmbeddingGemma 2
  }

  export interface NoticesIndexFile {
    schemaVersion: '3.0.0';
    modelId: 'embedding-gemma-2-256d-mrl';
    dimensions: 256;
    normalization: 'L2';
    updatedAtIso: string;
    totalRecords: number;
    entries: NoticeIndexEntry[];
  }

  export interface QueueTaskFile {
    schemaVersion: '3.0.0';
    taskId: string;
    childName: string;
    academicYear: string;
    packageName: string;
    sourceType: string;
    notificationTitle: string;
    notificationText: string;
    targetUrl?: string;
    recipeId?: string;
    contentSha256: string;
    status: 'PENDING' | 'CLAIMED' | 'COMPLETED' | 'CLAIMED_BY_MOBILE' | 'COMPLETED_BY_MOBILE' | 'AUTH_EXPIRED' | 'RECIPE_STALE';
    retryCount: number;
    maxRetries: number;
    createdAt: string;
    claimedBy: string | null;
    claimedAt: string | null;
    completedAt: string | null;
    errorDetails: string | null;
  }
  ```
- **Verification Command:**
  ```bash
  cd C:/Users/daars/.gemini/antigravity/scratch/school-mcp-sync-engine/extension && npx tsc --noEmit
  ```

## Phase 2: Child Profile Lifecycle, Cryptographic Vault & Google Drive Manager

**Goal:** Build `ChildManager` (9-rule validation, title-casing, lock state machine, soft-unlink), `CryptoVaultService` (PBKDF2-HMAC-SHA256 + AES-256-GCM), and `DriveVaultManager` (folder provisioning, ETag lock bus, resumable uploads).

### Task 2.1: Implement `ChildManager` (`extension/src/services/childManager.ts` & `tests/childManager.test.ts`)
- [ ] **Target Files:**
  - `extension/src/services/childManager.ts` (CREATE)
  - `extension/tests/childManager.test.ts` (CREATE)
- **Action:** Implement `ChildManager` with the following exact methods and validation rules:
  1. `static computeAcademicYears(now: Date = new Date()): { past: string; current: string; future: string }`:
     - Uses April cutoff (`now.getMonth() >= 3`, where `0 = Jan, 3 = Apr`):
     - If `month >= 3`, `startYear = now.getFullYear()`; else `startYear = now.getFullYear() - 1`.
     - Returns `past: "${startYear-1}-${startYear}"`, `current: "${startYear}-${startYear+1}"`, `future: "${startYear+1}-${startYear+2}"`.
  2. `static validateFirstName(rawName: string, academicYear: string, existingProfiles: ChildProfile[], currentChildId?: string): { valid: boolean; normalizedName: string; error?: string }`:
     - **Rule 1 (Non-Empty):** Reject blank or whitespace-only (`/^\s*$/`).
     - **Rule 2 (Filesystem Characters):** Reject `/[\/\\:*?"<>|\x00-\x1F\x7F]/`.
     - **Rule 3 (Reserved Windows/POSIX Names):** Trim and test against `/^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i`.
     - **Rule 4 (Character Whitelist):** Reject anything outside `/^[a-zA-Z\s\-']+$/` (no digits `0-9`, emojis, or symbols).
     - **Rule 5 (Boundary Hygiene):** Reject if starts or ends with `-` or `'`.
     - **Rule 6 (Alphabetic Minimum):** Require at least 2 ASCII letters (`(trimmed.match(/[a-zA-Z]/g) || []).length >= 2`).
     - **Rule 7 (Length Bounds):** After collapsing consecutive spaces (`\s+` $\rightarrow$ `' '`) and hyphens (`-+` $\rightarrow$ `'-'`), length must be $\ge 2$ and $\le 30$.
     - **Rule 8 (Smart Title-Casing):** Capitalize the first letter of each word segment separated by space, `-`, or `'` (e.g. `"mary-jane"` $\rightarrow$ `"Mary-Jane"`, `"o'connor"` $\rightarrow$ `"O'Connor"`, `"anvesha"` $\rightarrow$ `"Anvesha"`).
     - **Rule 9 (Sibling Collision Check):** Reject if another active (`!isRemoved`) profile in `existingProfiles` (with `childId !== currentChildId` and `academicYear === academicYear`) has the same `name.toLowerCase()`.
  3. `static softRemoveChild(childId: string, profiles: ChildProfile[]): { updatedProfiles: ChildProfile[]; nextActiveChild: ChildProfile | null }`:
     - Sets `isRemoved = true` on the matching profile (NEVER deletes Google Drive files) and returns the first remaining active profile (`!p.isRemoved`) or `null`.
- **Verification Command:**
  ```bash
  cd C:/Users/daars/.gemini/antigravity/scratch/school-mcp-sync-engine/extension && npx vitest run tests/childManager.test.ts
  ```

### Task 2.2: Implement `CryptoVaultService` (`extension/src/services/cryptoVault.ts` & `tests/cryptoVault.test.ts`)
- [ ] **Target Files:**
  - `extension/src/services/cryptoVault.ts` (CREATE)
  - `extension/tests/cryptoVault.test.ts` (CREATE)
- **Action:** Implement WebCrypto `PBKDF2-HMAC-SHA256` (`600,000` iterations) + `AES-256-GCM` encryption/decryption for `/_system/config/auth/session_auth.json`:
  - `deriveKey(parentGoogleSub: string, rootFolderCreatedTimeIso: string, salt: Uint8Array): Promise<CryptoKey>`
  - `encryptSessionPayload(payload: Record<string, unknown>, parentGoogleSub: string, rootFolderCreatedTimeIso: string): Promise<SessionAuthEnvelope>`
  - `decryptSessionPayload(envelope: SessionAuthEnvelope, parentGoogleSub: string, rootFolderCreatedTimeIso: string): Promise<Record<string, unknown>>`
- **Verification Command:**
  ```bash
  cd C:/Users/daars/.gemini/antigravity/scratch/school-mcp-sync-engine/extension && npx vitest run tests/cryptoVault.test.ts
  ```

### Task 2.3: Implement `DriveVaultManager` (`extension/src/services/driveVaultManager.ts` & `tests/driveVaultManager.test.ts`)
- [ ] **Target Files:**
  - `extension/src/services/driveVaultManager.ts` (CREATE)
  - `extension/tests/driveVaultManager.test.ts` (CREATE)
- **Action:** Implement Google Drive REST v3 client (`https://www.googleapis.com/drive/v3/files` & `https://www.googleapis.com/upload/drive/v3/files`) with Token Bucket rate limiting (max 8 req/sec burst, 3 req/sec sustained, exponential backoff on HTTP 429/5xx):
  1. `provisionChildVault(token: string, childName: string, academicYear: string): Promise<VaultFolderIds>`:
     - Finds or creates root folder `K.I.D.S. Data` (`rootKidsFolderId`).
     - Finds or creates global system folders under root: `_system`, `_system/config`, `_system/config/recipes`, `_system/config/auth`, `_system/queue`, `_system/models`, and `ui`.
     - Finds or creates `{AcademicYear}` under `K.I.D.S. Data` (`yearFolderId`).
     - Finds or creates `{ChildName}` under `{AcademicYear}` (`childFolderId`).
     - Finds or creates `attachments`, `Google Classroom`, `Google Classroom/attachments`, `_system`, `_system/diagnostics`, and `_system/logs` under `{ChildName}`.
     - Saves folder IDs using the exact keys in `app_preferences.json` (`vault_${email}_${year}_${lowerName}_childFolderId`, etc.) so Android auto-discovers them with zero friction.
  2. `renameChildVaultFolder(token: string, folderId: string, newName: string): Promise<void>`:
     - Calls `PATCH https://www.googleapis.com/drive/v3/files/${folderId}` with `{ name: newName }`.
  3. `claimQueueTaskWithEtag(token: string, fileId: string, etag: string, task: QueueTaskFile, instanceId: string): Promise<{ claimed: boolean; updatedTask: QueueTaskFile }>`:
     - Sends `PATCH` with header `If-Match: "${etag}"` setting `status: "CLAIMED"`, `claimedBy: instanceId`.
     - Handles `HTTP 412 Precondition Failed` gracefully by returning `{ claimed: false }`.
  4. `uploadOrUpdateFile(token: string, parentFolderId: string, fileName: string, mimeType: string, content: string | ArrayBuffer, existingFileId?: string): Promise<{ id: string; webViewLink: string }>`:
     - Uses multipart/resumable upload (`uploadType=multipart` for $< 5\text{MB}$, `uploadType=resumable` for $\ge 5\text{MB}$).
  5. `appendSheetRows(token: string, spreadsheetId: string, sheetName: string, rows: string[][]): Promise<void>`:
     - Calls Google Sheets REST v4 `spreadsheets.values.append` to append new notices to the child's sheet tab.
- **Verification Command:**
  ```bash
  cd C:/Users/daars/.gemini/antigravity/scratch/school-mcp-sync-engine/extension && npx vitest run tests/driveVaultManager.test.ts
  ```

## Phase 3: 4-Gate Privacy Filter, Multi-Child Router & Step 2 Gmail/Classroom/Drive Crawler

**Goal:** Implement the 4-Gate personal-email noise filter (preventing commercial emails on `daarshnicsanjeev@gmail.com` / `@hotmail.com` from polluting the child's digest while allowing Little Pods shadow session notes), dynamic $G_{\text{current}} - 1$ grade-boundary discovery, Classroom deep-link follower, Stream backfill, and Drive `"Shared with me"` harvester.

### Task 3.1: Implement 4-Gate Privacy Filter & Multi-Child Router (`extension/src/services/privacyAndRouter.ts` & `tests/privacyAndRouter.test.ts`)
- [ ] **Target Files:**
  - `extension/src/services/privacyAndRouter.ts` (CREATE)
  - `extension/tests/privacyAndRouter.test.ts` (CREATE)
- **Action:**
  1. Implement `PrivacyGateEvaluator.shouldIngestEmailOrNotification(params)`:
     - **Gate 1 (OTP & Financial Regex Block):** Immediately return `false` if text matches `/\b(?:OTP|one[- ]time password|verification code|cvv|aadhaar|debited via upi|credited to your a\/c|netbanking)\b/i`.
     - **Gate 2 (Promotional & Adult Course Blocklist):** Immediately return `false` if sender or subject/body matches `/\b(?:eureka\s*forbes|aquaguard|tapi\s*carpets|facebook\s*friend|birthday\s*card|kuvera|gold\s*etf|naukri|nexatalent|peoplesprint|skill\s*arbitra|lawsikho|growthschool|finright|microsoft\s*ignite|muse\s*spark|github\s*universe|coderoad|freelists\.org|redditmail|linkedin)\b/i`.
     - **Gate 3 (Strict Recipient & Student-Account Binding):**
       - If the message recipient/account matches a configured child's `studentEmail` (e.g., `atharva.chaodhari@myglobal.school`, `atharva.cwig680@wittykidsindia.com`, `anvesharprasad@sjbhs.org`), return `true`.
       - If the message arrived on a parent's personal account (`daarshnicsanjeev@gmail.com`, `daarshnicsanjeev@hotmail.com`), ONLY return `true` if:
         - Sender domain is in `child.whitelistedDomains` (`myglobal.school`, `wittykidsindia.com`, `globalschoolsfoundation.org`, `sjbhs.org`, `littlepods.in`), OR
         - Sender/body matches a configured shadow-support educator (`Prarthana Sawant`, `Little Pods`, `Shadow Session`), OR
         - Subject/body contains the child's exact `name` (`Atharva`, `Anvesha`) AND at least one school keyword (`/\b(?:grade\s*\d|std[\s\-]*[ivx\d]+|classroom|homework|worksheet|circular|principal|exam|syllabus|school)\b/i`).
       - Otherwise return `false`.
  2. Implement `MultiChildRouter.routeNotice(notice, profiles)`:
     - Implements the 5-Tier Attribution Cascade (Tier 1: Account binding $\rightarrow$ Tier 2: Whitelisted educator/group/course $\rightarrow$ Tier 3: Name/Grade mention $\rightarrow$ Tier 4: School domain broadcast $\rightarrow$ Tier 5: Quarantine).
- **Verification Command:**
  ```bash
  cd C:/Users/daars/.gemini/antigravity/scratch/school-mcp-sync-engine/extension && npx vitest run tests/privacyAndRouter.test.ts
  ```

### Task 3.2: Implement Step 2 Gmail, Classroom Deep-Link & Drive Shared Crawler (`extension/src/services/gmailClassroomCrawler.ts` & `tests/gmailClassroomCrawler.test.ts`)
- [ ] **Target Files:**
  - `extension/src/services/gmailClassroomCrawler.ts` (CREATE)
  - `extension/src/services/driveSharedHarvester.ts` (CREATE)
  - `extension/tests/gmailClassroomCrawler.test.ts` (CREATE)
- **Action:**
  1. `cleanAttachmentTitle(rawTitle: string): string`:
     - Strips duplicate format suffixes from Classroom DOM attachment cards (`/\.(pdf|docx?|xlsx?|pptx?|jpe?g|png|mp3|wav)_(?:PDF|Word|Excel|PowerPoint|Image|Audio|Text)$/i` $\rightarrow$ `.$1`, and collapses `.pdf.pdf` $\rightarrow$ `.pdf`, `.docx.pdf` preserved or normalized cleanly).
  2. `normalizeClassroomTitle(rawTitle: string): string`:
     - Strips notification prefixes (`/^(?:New\s+(?:material|assignment|announcement|question)(?:\s+from\s+[^:]+)?|Updated\s+[^:]+|Due\s+soon|Returned):\s*"?([^"\n•]+?)"?(?:\s*•\s*See details)?$/i` $\rightarrow$ `$1.trim()`).
  3. `discoverGradeAndCheckBoundary(courseTitle: string, currentGrade: number | null)`:
     - Extracts grade using `/(?:Grade|Class|Year|Std|Standard|Form)[\s\-:]*(\d{1,2}|[IVX]{1,4})\s*(?:[\(\-]?\s*([A-Za-z])\s*[\)]?)?/i` (converting Roman numerals `I`–`XII` to `1`–`12`).
     - First Classroom email sets `G_current`.
     - Computes `G_previous = G_current - 1`.
     - Tracks consecutive prior-grade hits; when `consecutivePriorGradeCount >= 3` where parsed grade $\le G_{\text{previous}}$, returns `{ shouldStopCrawl: true }`.
  4. `consolidateNoticeWithExisting(incoming: NoticeRecord, existingMap: Map<string, NoticeRecord>): NoticeRecord`:
     - Merges Classroom push stubs (`• See details`) with full Gmail/Classroom deep-link posts sharing the same `classroomPostId` or normalized title within 24 hours.
  5. `crawlCourseStreamAndClasswork(courseUrl: string, accountPrefix: string, seenPostIds: Set<string>, seenFileHashes: Set<string>)`:
     - Opens or reuses the isolated minimized utility window (`chrome.windows.create({ url, focused: false, state: 'minimized' })`).
     - Skips any post whose `classroomPostId` is already in `seenPostIds` ($O(1)$ deduplication).
     - Downloads new worksheets/PDFs/PPTXs/MP3s and uploads them to the child's Drive `attachments/` folder.
  6. `DriveSharedHarvester.harvestSharedWithMe(token: string, child: ChildProfile, seenFileHashes: Set<string>)`:
     - Queries `files.list` with `q="sharedWithMe = true and trashed = false"`, filters for educational files matching the child's grade/school, copies new files into `child.attachmentsFolderId`, and emits a consolidated `Google Drive Shared Resources` notice.
- **Verification Command:**
  ```bash
  cd C:/Users/daars/.gemini/antigravity/scratch/school-mcp-sync-engine/extension && npx vitest run tests/gmailClassroomCrawler.test.ts
  ```

### Task 3.3: Implement Step 4 WhatsApp Chat Export Parser (`extension/src/services/whatsappExportParser.ts` & `tests/whatsappExportParser.test.ts`)
- [ ] **Target Files:**
  - `extension/src/services/whatsappExportParser.ts` (CREATE)
  - `extension/tests/whatsappExportParser.test.ts` (CREATE)
- **Action:**
  1. Parse multi-line WhatsApp turns using `/^\[?(\d{1,2}[\/\.-]\d{1,2}[\/\.-]\d{2,4}),?\s+(\d{1,2}:\d{2}(?::\d{2})?(?:\s*[APap][Mm])?)\]?\s*(?:-|\s)?\s*([^:]+):\s*(.*)$/`.
  2. Link `<attached: filename.ext>` or `filename.ext (file attached)` against `.zip` entries.
  3. Apply the 3-Stage Parent Chatter Filter (dropping short `"Thank you ma'am"`, `"Noted"`, `"👍"`, `"+1"`, `"Happy birthday"` messages unless they contain attachments, URLs, or come from a teacher handle).
- **Verification Command:**
  ```bash
  cd C:/Users/daars/.gemini/antigravity/scratch/school-mcp-sync-engine/extension && npx vitest run tests/whatsappExportParser.test.ts
  ```

## Phase 4: Symmetrical WebGPU `EmbeddingGemma 2`, Offscreen OCR & Graphify Engine

**Goal:** Build the Chrome Offscreen Document hosting `EmbeddingGemma 2` (256-dim L2-normalized MRL embeddings via WebGPU / WASM SIMD128) + PDF/Image OCR, `TSGraphifyEngine` (generating `knowledge_graph.json`, zero-CDN `graph.html`, `MASTER_DIGEST.md`, `CLASSROOM_DIGEST.md`, `FAMILY_DIGEST.md`), and `HybridSearchEngine` (Reciprocal Rank Fusion).

### Task 4.1: Implement Offscreen Document for WebGPU `EmbeddingGemma 2` & PDF OCR (`extension/src/offscreen/offscreen.html` & `offscreen.ts`)
- [ ] **Target Files:**
  - `extension/src/offscreen/offscreen.html` (CREATE)
  - `extension/src/offscreen/offscreen.ts` (CREATE)
  - `extension/tests/embeddingOffscreen.test.ts` (CREATE)
- **Action:**
  1. Create `offscreen.ts` listening for `chrome.runtime.onMessage` actions:
     - `'COMPUTE_EMBEDDING_256D'`: Runs quantized `EmbeddingGemma 2` via WebGPU (falling back to WASM SIMD128 if `navigator.gpu` is unavailable), truncates to the first 256 Matryoshka dimensions, applies L2 normalization ($\mathbf{v} / \|\mathbf{v}\|_2$), and returns `number[]` (length 256).
     - `'EXTRACT_PDF_OR_IMAGE_OCR'`: Extracts text per page formatted with `[--- Page X of Y ---]` headers matching Android `MLKitOcrParser.kt`.
  2. Implement `cosineSimilarity256d(a: number[], b: number[]): number` and verify that L2-normalized vectors have unit norm ($\|\mathbf{v}\|_2 \approx 1.0$).
- **Verification Command:**
  ```bash
  cd C:/Users/daars/.gemini/antigravity/scratch/school-mcp-sync-engine/extension && npx vitest run tests/embeddingOffscreen.test.ts
  ```

### Task 4.2: Implement `TSGraphifyEngine` & Digest Generators (`extension/src/services/graphifyEngine.ts` & `tests/graphifyEngine.test.ts`)
- [ ] **Target Files:**
  - `extension/src/services/graphifyEngine.ts` (CREATE)
  - `extension/tests/graphifyEngine.test.ts` (CREATE)
- **Action:** Port `KotlinGraphifyEngine.kt` to TypeScript so both Desktop and Android produce identical Drive artifacts:
  1. `buildKnowledgeGraph(child: ChildProfile, notices: NoticeRecord[]): KnowledgeGraphJson`
  2. `buildStandaloneGraphHtml(graph: KnowledgeGraphJson): string`:
     - Must embed a self-contained vanilla HTML5 Canvas / SVG force-directed graph with **zero external CDN `<script>` tags** (replacing `<script src="https://d3js.org/d3.v7.min.js">` so it works 100% offline and under strict CSP).
  3. `buildMasterDigestMarkdown(child: ChildProfile, notices: NoticeRecord[]): string`:
     - Generates `# K.I.D.S. MASTER DIGEST: ${child.name.toUpperCase()}`, grouped into `## Homework & Assignments`, `## Circulars & Schedules`, `## Fees & Due Dates`, and `## Indexed OCR Excerpts from Circular PDFs`.
  4. `buildClassroomDigestMarkdown(child: ChildProfile, notices: NoticeRecord[]): string`
  5. `buildFamilyDigestMarkdown(children: ChildProfile[], noticesByChild: Record<string, NoticeRecord[]>): string`
  6. `buildLayoutManifest(activeChild: string, children: ChildProfile[], noticesByChild: Record<string, NoticeRecord[]>): LayoutManifestJson`
- **Verification Command:**
  ```bash
  cd C:/Users/daars/.gemini/antigravity/scratch/school-mcp-sync-engine/extension && npx vitest run tests/graphifyEngine.test.ts
  ```

### Task 4.3: Implement Tri-Layer `HybridSearchEngine` with Reciprocal Rank Fusion (`extension/src/services/hybridSearchEngine.ts` & `tests/hybridSearchRrf.test.ts`)
- [ ] **Target Files:**
  - `extension/src/services/hybridSearchEngine.ts` (CREATE)
  - `extension/tests/hybridSearchRrf.test.ts` (CREATE)
- **Action:**
  1. Implement local BM25 inverted index over `NoticeRecord[]` (`title` weight $3.0$, `category` weight $2.0$, `sender` weight $1.5$, `body` weight $1.0$, `ocrText` weight $1.0$).
  2. Implement vector cosine similarity search over `NoticeIndexEntry[]` (256-dim `EmbeddingGemma 2` vectors).
  3. Implement Google Drive REST `files.list` query merger (`fullText contains '...'`).
  4. Fuse rankings using Reciprocal Rank Fusion ($k = 60$):
     $$\text{Score}_{\text{RRF}}(d) = \frac{1.0}{60 + r_{\text{bm25}}(d)} + \frac{1.2}{60 + r_{\text{vec}}(d)} + \frac{0.8}{60 + r_{\text{drive}}(d)} + \beta_{\text{urgency}}(d)$$
     where $\beta_{\text{urgency}}(d) = +0.015$ if `dueDateMs` is within the next 7 days.
  5. Add optional `summarizeTopResultsWithGeminiNano(query: string, top3Notices: NoticeRecord[]): Promise<string | null>` that ONLY runs post-retrieval on the top 3 results and returns `null` gracefully if `window.ai?.languageModel` is unavailable.
- **Verification Command:**
  ```bash
  cd C:/Users/daars/.gemini/antigravity/scratch/school-mcp-sync-engine/extension && npx vitest run tests/hybridSearchRrf.test.ts
  ```

## Phase 5: Step 3 Interceptor & PreFlight Upgrade + Dual-Surface Accessible UI

**Goal:** Upgrade `mainWorldInterceptor.ts`, `interceptor.ts`, and `preflight.ts` for Zero-GAS Drive Vault storage, and build Surface 1 (`popup/index.html` + `wizard.ts`) and Surface 2 (`dashboard/dashboard.html` + `dashboard.ts`) with full JAWS/NVDA keyboard accessibility.

### Task 5.1: Upgrade `mainWorldInterceptor.ts`, `interceptor.ts`, and `preflight.ts`
- [ ] **Target Files:**
  - `extension/src/content/mainWorldInterceptor.ts` (MODIFY)
  - `extension/src/content/interceptor.ts` (MODIFY)
  - `extension/src/services/preflight.ts` (MODIFY)
  - `extension/tests/preflight.test.ts` (CREATE)
- **Action:**
  1. In `mainWorldInterceptor.ts`: Capture response `Content-Type` and cloned JSON preview body on `fetch` and `XMLHttpRequest` load events; compute the API Heuristic Score $S_{\text{api}} \in [0, 1]$.
  2. In `interceptor.ts`: Add message handler `'SCAN_SEMANTIC_REGIONS'` that inspects the page DOM for semantic containers (`table`, `[role="tabpanel"]`, `main article`, `section[aria-label]`) and returns an array of `{ regionId, label, selectorLadder, rowCount }` for the accessible dropdown `selStep3SemanticRegion`.
  3. In `preflight.ts`: Keep `stage1LocalSessionProbe` and `stage2ExtensionFetchVerification`. Replace `stage3GasProxyVerification` with `stage3DriveVaultAndSchemaVerification(spec, samplePayload, sanitizer)` which verifies primitive mapping, sanitizes headers/cookies via `SanitizerService`, and returns `{ passed: true, primitiveType, sanitizedRecipe }`.
- **Verification Command:**
  ```bash
  cd C:/Users/daars/.gemini/antigravity/scratch/school-mcp-sync-engine/extension && npx vitest run tests/preflight.test.ts
  ```

### Task 5.2: Upgrade Surface 1 Popup (`extension/src/popup/index.html`, `style.css`, `wizard.ts`)
- [ ] **Target Files:**
  - `extension/src/popup/index.html` (MODIFY)
  - `extension/src/popup/style.css` (MODIFY)
  - `extension/src/popup/wizard.ts` (MODIFY)
- **Action:**
  1. Replace the old GAS/MCP HTML in `src/popup/index.html` with the 4-Step Accessible Wizard + Quick Home View containing these exact element IDs:
     - Header & Stepper: `stepBadge`, `dot1`, `line1`, `dot2`, `line2`, `dot3`, `line3`, `dot4`, `statusAlert` (`role="alert" aria-live="assertive"`).
     - Step 1 (`step1Card`): `lblStep1AccountEmail`, `txtStep1ChildName`, `btnStep1EditChildName`, `btnStep1SaveChildName`, `btnStep1CancelChildName`, `selStep1AcademicYear`, `btnStep1EditAcademicYear`, `txtStep1SchoolName`, `txtStep1StudentEmail`, `txtStep1ShadowTeacherEmail`, `fileChildPhoto`, `btnVerifyStep1`.
     - Step 2 (`step2Card`): `step2ConnectedBadge`, `btnStartStep2Sync`, `progressMailboxSweep`, `lblMailboxStats` (`aria-live="polite"`), `progressClassroomHarvest`, `lblClassroomStats` (`aria-live="polite"`), `btnNavToStep3`.
     - Step 3 (`step3Card`): `connectionStatusBox`, `connectionStatusIcon`, `connectionStatusText`, `btnCaptureVerifyPortal`, `selStep3SemanticRegion`, `selStep3Category`, `btnRegisterFeature`, `step3RegisteredToolsList`, `btnNavToStep4`.
     - Step 4 (`step4Card`): `fileWhatsAppExport`, `txtWhatsAppGroupWhitelist`, `btnOpenFullDashboard`.
  2. Enforce WCAG 2.1 AA/AAA styling in `style.css`: Kanit + Poppins fonts, `#1A365D` Deep Navy header, `#ED8936` Amber focus rings, minimum `48px` button height.
  3. Wire all event listeners in `wizard.ts` including `Enter` to save and `Escape` to cancel on `txtStep1ChildName`.
- **Verification Command:**
  ```bash
  cd C:/Users/daars/.gemini/antigravity/scratch/school-mcp-sync-engine/extension && npx tsc --noEmit && npm run build
  ```

### Task 5.3: Build Surface 2 Full-Tab Dashboard (`extension/src/dashboard/dashboard.html` & `dashboard.ts`)
- [ ] **Target Files:**
  - `extension/src/dashboard/dashboard.html` (CREATE)
  - `extension/src/dashboard/dashboard.ts` (CREATE)
- **Action:**
  1. Create `dashboard.html` and `dashboard.ts` implementing the 4 top-level views with ARIA tablist navigation (`role="tablist"`, `role="tab"`, `role="tabpanel"`):
     - **Tab 1 (`viewCommandCenter`):** Renders `layout_manifest.json` sections using the 5 Universal Primitives (`TIMELINE_ACTION` countdown cards, `STAT_METRIC` tiles, `PROGRESS_GAUGE` bars, `DATA_GRID` period-by-period classwork logs, `MEDIA_CARD` grid) + Quick Add Task form.
     - **Tab 2 (`viewSearchArchive`):** Tri-Layer Hybrid Search input (`txtHybridSearch`), filter pills (`Child`, `Category`, `Urgency`), optional Gemini Nano 2-sentence summary banner, and notice cards with inline `[--- Page X of Y ---]` OCR preview and native Drive attachment links.
     - **Tab 3 (`viewManageKidsPortals`):** Multi-Child Profile switcher/editor (`ChildManager`), Portal Recipe registry (`ACTIVE`/`STALE` status + Re-test button), and 1-click links to `MASTER_DIGEST.md`, `CLASSROOM_DIGEST.md`, `FAMILY_DIGEST.md`, `graph.html`, and the Google Sheet ledger.
     - **Tab 4 (`viewAndroidSync`):** One-Click Google Account Auto-Pairing status, 3-Step Android setup instructions, and live diagnostics rendered from `_system/SYSTEM_STATUS.md` and `runtime_telemetry.json`.
- **Verification Command:**
  ```bash
  cd C:/Users/daars/.gemini/antigravity/scratch/school-mcp-sync-engine/extension && npx tsc --noEmit && npm run build
  ```

## Phase 6: Android Collector Hardening (`c:/K.I.D.S`) & Zero-Hardcode CI Gate

**Goal:** Apply the three production fixes discovered in the live Drive vault logs to `c:/K.I.D.S` (`PrivacyFilter.kt`, `NoticeReconciliationEngine.kt`, and `DriveSyncWorker.kt`) and verify all CI gates across both repositories.

### Task 6.1: Upgrade `PrivacyFilter.kt` & `DeduplicationEngine.kt` in `c:/K.I.D.S`
- [ ] **Target Files:**
  - `c:/K.I.D.S/app/src/main/java/com/kids/collector/domain/filter/PrivacyFilter.kt`
  - `c:/K.I.D.S/app/src/main/java/com/kids/collector/domain/dedupe/DeduplicationEngine.kt`
  - `c:/K.I.D.S/app/src/test/java/com/kids/collector/PrivacyFilterTest.kt`
- **Action:**
  1. In `PrivacyFilter.kt`: Add the 4-Gate personal-account noise isolation rules so notifications arriving on `daarshnicsanjeev@gmail.com` or `daarshnicsanjeev@hotmail.com` from commercial/adult senders (`Eureka Forbes`, `Tapi`, `Facebook`, `Kuvera`, `Skill Arbitrage`, `Naukri`, `FinRight`) are dropped in memory, while emails from `@myglobal.school`, `@wittykidsindia.com`, `@sjbhs.org`, and `Prarthana Sawant` (`Little Pods`) are ingested.
  2. In `DeduplicationEngine.kt`: Normalize Classroom push notification titles (`New material from X: Title • See details`) so they consolidate cleanly with Gmail Classroom notification records.
- **Verification Command:**
  ```bash
  cd c:/K.I.D.S && ./gradlew testDebugUnitTest --tests "com.kids.collector.PrivacyFilterTest"
  ```

### Task 6.2: Lock Reconciled Attachments (`NoticeReconciliationEngine.kt`) & Single-Flight `DriveSyncWorker.kt`
- [ ] **Target Files:**
  - `c:/K.I.D.S/app/src/main/java/com/kids/collector/data/db/Entities.kt`
  - `c:/K.I.D.S/app/src/main/java/com/kids/collector/domain/router/NoticeReconciliationEngine.kt`
  - `c:/K.I.D.S/app/src/main/java/com/kids/collector/service/DriveSyncWorker.kt`
- **Action:**
  1. Add `val isReconciledLocked: Boolean = false` to `AttachmentEntity` in `Entities.kt`.
  2. In `NoticeReconciliationEngine.kt`: Skip any attachment where `isReconciledLocked == true` so attachments never oscillate between two notices on subsequent sync cycles; set `isReconciledLocked = true` once linked.
  3. In `DriveSyncWorker.kt`: Guard sync execution with a singleton `Mutex` (`private val syncMutex = Mutex()`), enqueue periodic/expedited work with `ExistingWorkPolicy.KEEP` instead of `REPLACE`, and wrap `KotlinGraphifyEngine` + `DiagnosticsMirror` uploads in `withContext(NonCancellable)` so `JobCancellationException` never aborts WAL checkpointing or digest uploads mid-flight.
- **Verification Command:**
  ```bash
  cd c:/K.I.D.S && ./gradlew testDebugUnitTest
  ```

### Task 6.3: Final Zero-Hardcode & Full Test Suite Gate Across Both Repositories
- [ ] **Action:** Run the zero-hardcode audit script and complete test suites in both repositories:
  ```bash
  cd C:/Users/daars/.gemini/antigravity/scratch/school-mcp-sync-engine/extension && npm test && npm run build
  cd c:/K.I.D.S && python scripts/verify_zero_hardcode.py && ./gradlew testDebugUnitTest
  ```
