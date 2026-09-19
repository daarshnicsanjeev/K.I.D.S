/**
 * Kids Intelligent Dashboard System (K.I.D.S.)
 * ClassroomBrowserExtractor - Tier 3 Browser-Native Direct Classroom Extraction
 * 
 * Allows parents to extract Google Classroom coursework, assignments, and announcements
 * directly through their Chrome browser session without requiring Google Apps Script
 * or external third-party OAuth app authorization from restricted school domains.
 */

import { PersonalDriveService } from './personalDriveService';
import { ChildManager, ChildProfile } from './childManager';
import { WhatsAppDiagnosticLogger } from './whatsappLogger';

export interface ClassroomExtractionProgress {
  phase: 'CONNECTING' | 'DISCOVERING_COURSES' | 'FETCHING_COURSEWORK' | 'SAVING_TO_VAULT' | 'COMPLETED' | 'ERROR';
  message: string;
  percent: number;
  coursesFound?: number;
  itemsFound?: number;
  attachmentsSaved?: number;
  totalAttachments?: number;
}

export interface ExtractedCourse {
  id: string;
  name: string;
  section?: string;
  alternateLink?: string;
  descriptionHeading?: string;
  courseState?: string;
  courseWork?: ExtractedCourseWork[];
  announcements?: ExtractedAnnouncement[];
  materials?: ExtractedMaterial[];
}

export interface ExtractedCourseWork {
  id: string;
  title: string;
  description?: string;
  state?: string;
  alternateLink?: string;
  creationTime?: string;
  updateTime?: string;
  dueDate?: { year: number; month: number; day: number };
  dueTime?: { hours: number; minutes: number };
  maxPoints?: number;
  workType?: string;
  attachments?: ExtractedAttachment[];
}

export interface ExtractedAnnouncement {
  id: string;
  text: string;
  alternateLink?: string;
  creationTime?: string;
  updateTime?: string;
  attachments?: ExtractedAttachment[];
}

export interface ExtractedMaterial {
  id: string;
  title: string;
  description?: string;
  alternateLink?: string;
  creationTime?: string;
  updateTime?: string;
  attachments?: ExtractedAttachment[];
}

export interface ExtractedAttachment {
  title: string;
  fileId?: string;
  downloadUrl?: string;
  alternateLink?: string;
  mimeType?: string;
  youtubeUrl?: string;
  formUrl?: string;
  url?: string;
}

export class ClassroomBrowserExtractor {
  private static isExtracting = false;

  public static isRunning(): boolean {
    return this.isExtracting;
  }

  /**
   * Helper to parse a course ID from a Classroom URL or relative path
   */
  public static parseCourseId(href: string): string | null {
    if (!href) return null;
    const cMatch = href.match(/\/c\/([a-zA-Z0-9_-]+)/);
    if (cMatch && cMatch[1] && !['u', 'h', 'calendar', 'settings', 'archive', 'user'].includes(cMatch[1])) {
      return cMatch[1];
    }
    const rMatch = href.match(/\/r\/([a-zA-Z0-9_-]+)/);
    if (rMatch && rMatch[1] && !['u', 'h'].includes(rMatch[1])) {
      return rMatch[1];
    }
    return null;
  }

  /**
   * Extract Google multi-account prefix (e.g. /u/2 or /u/1) from a Classroom URL
   */
  public static extractUserPrefix(url?: string): string {
    if (!url) return '';
    const match = url.match(/\/u\/(\d+)/);
    return match ? `/u/${match[1]}` : '';
  }

  /**
   * Universal Drive File ID extractor matching:
   * - /(?:file|document|presentation|spreadsheets|forms)(?:\/u\/\d+)?\/d\/([a-zA-Z0-9_-]{20,})/i
   * - /[?&]id=([a-zA-Z0-9_-]{20,})/i
   * - /\/d\/([a-zA-Z0-9_-]{20,})/i
   */
  public static extractDriveFileId(url: string | null | undefined): string | null {
    if (!url || typeof url !== 'string') return null;
    const pathMatch = url.match(/(?:file|document|presentation|spreadsheets|forms)(?:\/u\/\d+)?\/d\/([a-zA-Z0-9_-]{20,})/i);
    if (pathMatch && pathMatch[1]) return pathMatch[1];
    const queryMatch = url.match(/[?&]id=([a-zA-Z0-9_-]{20,})/i);
    if (queryMatch && queryMatch[1]) return queryMatch[1];
    const genericDMatch = url.match(/\/d\/([a-zA-Z0-9_-]{20,})/i);
    if (genericDMatch && genericDMatch[1]) return genericDMatch[1];
    return null;
  }

  /**
   * Helper to clean format badges from attachment titles
   */
  public static cleanAttachmentTitle(raw: string, noteTitle?: string, fileId?: string): string {
    const cleanText = (t: string) => (t || '').replace(/\r?\n/g, ' ').replace(/\s+/g, ' ').trim();
    let t = cleanText(raw);
    t = t.replace(/^Attachment:\s*/i, '');
    t = t.replace(/(\.[a-zA-Z0-9]{2,5})[\s_]*(?:PDF|Video|Image|Word|PowerPoint|Excel|Document|Audio)+$/i, '$1');
    t = t.replace(/[\s_]+(?:PDF|Video|Image|Word|PowerPoint|Excel|Document|Audio)+$/i, '');
    t = t.replace(/(?<!\.)(?:PDF|Video|Image|Word|PowerPoint|Excel|Document|Audio)+$/i, '');
    t = t.trim();

    const isInvalid = !t || /^[().\s_-]+(\.[a-zA-Z0-9]+)?$/i.test(t) || t.replace(/\.[a-zA-Z0-9]+$/i, '').trim() === '';
    if (isInvalid) {
      let cleanNote = (noteTitle || '').replace(/[\\/:*?"<>|]/g, '_').replace(/^[().\s_-]+$/g, '').trim().substring(0, 30);
      if (/^(?:item\s+\d+|collapse\s+topic|view\s+material|view\s+assignment|coursework\s+[a-z0-9_-]+)$/i.test(cleanNote)) {
        cleanNote = '';
      }
      const prefix = cleanNote || 'Classroom_Doc';
      const idPart = (fileId || '').substring(0, 6) || Math.random().toString(36).substring(2, 8);
      return `${prefix}_${idPart}.pdf`;
    }
    return t;
  }

  /**
   * Score a Classroom tab to prioritize student accounts (/u/2/, /u/1/),
   * active tabs, and tabs currently inside a course or classwork stream.
   */
  public static scoreClassroomTab(tab: chrome.tabs.Tab, preferredPrefix?: string): number {
    let s = 0;
    const u = tab.url || '';
    if (preferredPrefix && u.includes(preferredPrefix)) {
      s += 300; // Strongest preference for matching student profile prefix (e.g. /u/2/)
    }
    if (tab.active) s += 100;
    const m = u.match(/\/u\/(\d+)/);
    if (m) {
      const idx = parseInt(m[1], 10);
      s += idx > 0 ? 50 + idx : 10;
    }
    if (u.includes('/c/')) s += 30; // Currently inside a course
    if (u.includes('/h')) s += 20; // Home classes grid
    return s;
  }

  /**
   * Normalize Classroom IDs: decodes base64-encoded numeric IDs (e.g. ODU1MzM1Njg4NjI5 -> 855335688629)
   * to align directly with the Google Classroom API ID space.
   */
  public static normalizeClassroomId(id: string | null | undefined): string {
    if (!id) return '';
    const s = String(id).trim();
    if (/^\d+$/.test(s)) return s;
    if (/^[a-zA-Z0-9+/=]{8,}$/.test(s)) {
      try {
        let decoded = '';
        if (typeof atob === 'function') {
          decoded = atob(s);
        } else if (typeof Buffer !== 'undefined') {
          decoded = Buffer.from(s, 'base64').toString('ascii');
        }
        if (/^\d{8,}$/.test(decoded)) {
          return decoded;
        }
      } catch (e) {}
    }
    return s;
  }

  /**
   * Check if a classroom.google.com tab is open or available in current browser.
   * Prioritizes active tabs and multi-account student profiles (/u/2/, etc.).
   */
  public static async findClassroomTab(preferredPrefix?: string): Promise<chrome.tabs.Tab | null> {
    if (typeof chrome === 'undefined' || !chrome.tabs?.query) return null;
    try {
      // Query all open tabs across all windows to avoid popup-window scope traps
      const allTabs = await chrome.tabs.query({});
      const classroomTabs = allTabs.filter(t => t.url && t.url.includes('classroom.google.com'));

      if (!classroomTabs || classroomTabs.length === 0) return null;

      // Sort tabs so the student profile (e.g. /u/2/) and active tab rank first
      classroomTabs.sort((a, b) => this.scoreClassroomTab(b, preferredPrefix) - this.scoreClassroomTab(a, preferredPrefix));
      return classroomTabs[0] || null;
    } catch {
      return null;
    }
  }

  /**
   * Ensure classroom.google.com is open so active session cookies can be leveraged
   */
  public static async openClassroomTabIfNeeded(): Promise<chrome.tabs.Tab | null> {
    if (typeof chrome === 'undefined' || !chrome.tabs?.create) return null;
    const existing = await this.findClassroomTab();
    if (existing && existing.id) {
      return existing;
    }
    try {
      return await chrome.tabs.create({
        url: 'https://classroom.google.com',
        active: false
      });
    } catch {
      return null;
    }
  }

  /**
   * Scrapes the course's Stream tab (/c/<courseId>) by navigating or opening a Classroom tab,
   * performing deep infinite scroll until the physical end of the stream feed is reached,
   * expanding announcements, handling "+N more" overflow modal dialogs, and extracting
   * all circulars, notices, schedules, attachments, and Drive links.
   */
  public static async scrapeCourseStreamTab(
    courseId: string,
    userPrefix: string,
    courseName?: string
  ): Promise<{ announcements: any[]; attachmentsCount: number } | null> {
    if (typeof chrome === 'undefined' || !chrome.scripting?.executeScript) {
      return null;
    }

    let targetTabId: number | null = null;
    let createdTab = false;

    try {
      // 1. Check if an open tab is already on this course's stream page
      if (chrome.tabs?.query) {
        try {
          const allTabs = (await chrome.tabs.query({})) || [];
          const existingStreamTabs = allTabs.filter(t =>
            t.url && (t.url.includes(`/c/${courseId}`) && !t.url.includes(`/w/${courseId}`))
          );
          if (existingStreamTabs.length > 0) {
            existingStreamTabs.sort((a, b) => this.scoreClassroomTab(b, userPrefix) - this.scoreClassroomTab(a, userPrefix));
            targetTabId = existingStreamTabs[0].id || null;
          }
        } catch (qErr) {}
      }

      const streamUrl = `https://classroom.google.com${userPrefix}/c/${courseId}`;

      // 2. If not already at stream, use findClassroomTab() to find best student Classroom tab and navigate it to the Stream tab
      if (!targetTabId) {
        try {
          const existingClassroom = await this.findClassroomTab(userPrefix);
          if (existingClassroom && existingClassroom.id && chrome.tabs?.update) {
            targetTabId = existingClassroom.id;
            await WhatsAppDiagnosticLogger.log(
              'INFO',
              'EXTRACT',
              `📢 [STREAM_TAB_NAVIGATE] Navigating Classroom tab #${targetTabId} (scored for "${userPrefix}") to Stream: ${streamUrl}`
            ).catch(() => {});

            await chrome.tabs.update(targetTabId, { url: streamUrl, active: true });

            // Wait for tab status complete
            await new Promise<void>((resolve) => {
              let done = false;
              const finish = () => {
                if (!done) {
                  done = true;
                  try { chrome.tabs.onUpdated.removeListener(listener); } catch (e) {}
                  resolve();
                }
              };
              const listener = (tid: number, changeInfo: chrome.tabs.TabChangeInfo) => {
                if (tid === targetTabId && changeInfo.status === 'complete') {
                  finish();
                }
              };
              if (chrome.tabs?.onUpdated) {
                chrome.tabs.onUpdated.addListener(listener);
              }
              setTimeout(finish, 8000);
            });

            // Allow Classroom client-side SPA to fully render DOM elements
            await new Promise(r => setTimeout(r, 3500));
          }
        } catch (navErr) {}
      }

      // 3. If no Classroom tab was open at all, create a new active tab
      if (!targetTabId && chrome.tabs?.create) {
        await WhatsAppDiagnosticLogger.log(
          'INFO',
          'EXTRACT',
          `📢 [STREAM_TAB_OPEN] Opening new Stream tab for "${courseName || courseId}": ${streamUrl}`
        ).catch(() => {});

        let newTab: chrome.tabs.Tab | null = null;
        try {
          newTab = await chrome.tabs.create({
            url: streamUrl,
            active: true
          });
        } catch (createErr) {
          newTab = null;
        }

        if (newTab && newTab.id) {
          targetTabId = newTab.id;
          createdTab = true;

          // Wait for tab status complete
          await new Promise<void>((resolve) => {
            let done = false;
            const finish = () => {
              if (!done) {
                done = true;
                try { chrome.tabs.onUpdated.removeListener(listener); } catch (e) {}
                resolve();
              }
            };
            const listener = (tid: number, changeInfo: chrome.tabs.TabChangeInfo) => {
              if (tid === newTab.id && changeInfo.status === 'complete') {
                finish();
              }
            };
            if (chrome.tabs?.onUpdated) {
              chrome.tabs.onUpdated.addListener(listener);
            }
            setTimeout(finish, 8000);
          });

          // Allow Classroom client-side SPA to render DOM elements
          await new Promise(r => setTimeout(r, 4000));
        }
      }

      if (!targetTabId) {
        return null;
      }

      // 4. Inject Stream extraction script into target tab
      const injection = await chrome.scripting.executeScript({
        target: { tabId: targetTabId },
        args: [userPrefix, courseId],
        func: async (pfx: string, cId: string) => {
          const cleanText = (t: string) => (t || '').replace(/\r?\n/g, ' ').replace(/\s+/g, ' ').trim();
          const cleanAttachmentTitle = (raw: string, noteTitle?: string, fileId?: string): string => {
            let t = cleanText(raw);
            t = t.replace(/^Attachment:\s*/i, '');
            t = t.replace(/(\.[a-zA-Z0-9]{2,5})[\s_]*(?:PDF|Video|Image|Word|PowerPoint|Excel|Document|Audio)+$/i, '$1');
            t = t.replace(/[\s_]+(?:PDF|Video|Image|Word|PowerPoint|Excel|Document|Audio)+$/i, '');
            t = t.replace(/(?<!\.)(?:PDF|Video|Image|Word|PowerPoint|Excel|Document|Audio)+$/i, '');
            t = t.trim();

            const isInvalid = !t || /^[().\s_-]+(\.[a-zA-Z0-9]+)?$/i.test(t) || t.replace(/\.[a-zA-Z0-9]+$/i, '').trim() === '';
            if (isInvalid) {
              let cleanNote = (noteTitle || '').replace(/[\\/:*?"<>|]/g, '_').replace(/^[().\s_-]+$/g, '').trim().substring(0, 30);
              if (/^(?:item\s+\d+|collapse\s+topic|view\s+material|view\s+assignment|coursework\s+[a-z0-9_-]+)$/i.test(cleanNote)) {
                cleanNote = '';
              }
              const prefix = cleanNote || 'Classroom_Doc';
              const idPart = (fileId || '').substring(0, 6) || Math.random().toString(36).substring(2, 8);
              return `${prefix}_${idPart}.pdf`;
            }
            return t;
          };
          const extractDriveId = (urlOrHref: string | null | undefined): string | null => {
            if (!urlOrHref || typeof urlOrHref !== 'string') return null;
            const pathMatch = urlOrHref.match(/(?:file|document|presentation|spreadsheets|forms)(?:\/u\/\d+)?\/d\/([a-zA-Z0-9_-]{20,})/i);
            if (pathMatch && pathMatch[1]) return pathMatch[1];
            const queryMatch = urlOrHref.match(/[?&]id=([a-zA-Z0-9_-]{20,})/i);
            if (queryMatch && queryMatch[1]) return queryMatch[1];
            const genericDMatch = urlOrHref.match(/\/d\/([a-zA-Z0-9_-]{20,})/i);
            if (genericDMatch && genericDMatch[1]) return genericDMatch[1];
            return null;
          };

          // 1. Wait for Classroom Stream SPA to genuinely hydrate
          const pollStart = Date.now();
          while (Date.now() - pollStart < 12000) {
            const hasItems = document.querySelectorAll(
              'div[data-stream-item-id], div[data-announcement-id], div[role="article"], div[data-item-id], li[role="listitem"], div[class*="Post"], div[class*="Card"], div[class*="StreamItem"]'
            ).length > 0;
            if (hasItems) break;
            await new Promise(r => setTimeout(r, 400));
          }
          await new Promise(r => setTimeout(r, 1200));

          // 2. Discover all scrollable containers in Classroom
          const getScrollContainers = (): HTMLElement[] => {
            const containers: HTMLElement[] = [];
            if (document.scrollingElement) containers.push(document.scrollingElement as HTMLElement);
            if (document.documentElement) containers.push(document.documentElement);
            if (document.body) containers.push(document.body);
            
            const candidates = document.querySelectorAll('main, [role="main"], c-wiz, div');
            for (const c of Array.from(candidates)) {
              const el = c as HTMLElement;
              if (el.scrollHeight > el.clientHeight + 50) {
                const style = window.getComputedStyle ? window.getComputedStyle(el) : null;
                if (!style || style.overflowY === 'auto' || style.overflowY === 'scroll' || style.overflow === 'auto' || style.overflow === 'scroll') {
                  containers.push(el);
                }
              }
            }
            return Array.from(new Set(containers));
          };

          const getItemCount = () => {
            return document.querySelectorAll(
              'div[data-stream-item-id], div[data-announcement-id], div[role="article"], div[data-item-id], li[role="listitem"], div[class*="Post"], div[class*="Card"], div[class*="StreamItem"]'
            ).length;
          };

          // 3. Deep Infinite Scroll down to the physical end of the Stream feed
          let lastCount = getItemCount();
          let lastScrollHeight = 0;
          let stableCycles = 0;
          let c = 0;
          const safetyLimit = 60;

          while (c < safetyLimit) {
            c++;
            const scrollContainers = getScrollContainers();

            window.scrollBy({ top: 1200, behavior: 'instant' as any });
            for (const sc of scrollContainers) {
              sc.scrollTop += 1200;
              try { sc.dispatchEvent(new Event('scroll', { bubbles: true })); } catch (e) {}
            }

            // Jump to bottom periodically to trigger IntersectionObserver sentinels
            if (c % 2 === 0) {
              const bH = (document.body && typeof document.body.scrollHeight === 'number') ? document.body.scrollHeight : 0;
              window.scrollTo({ top: bH + 10000, behavior: 'instant' as any });
              for (const sc of scrollContainers) {
                if (sc && typeof sc.scrollHeight === 'number') {
                  sc.scrollTop = sc.scrollHeight;
                  try { sc.dispatchEvent(new Event('scroll', { bubbles: true })); } catch (e) {}
                }
              }
            }

            // Click any "load older posts" or bottom pagination triggers if present
            const loadMoreBtns = Array.from(document.querySelectorAll(
              'button[aria-label*="older" i], div[role="button"][aria-label*="older" i], button[aria-label*="more" i], div[role="button"][aria-label*="more" i]'
            ));
            for (const btn of loadMoreBtns) {
              try { (btn as HTMLElement).click(); } catch(e) {}
            }

            await new Promise(r => setTimeout(r, 1200));

            const currentCount = getItemCount();
            const bHeight = (document.body && typeof document.body.scrollHeight === 'number') ? document.body.scrollHeight : 0;
            const deHeight = (document.documentElement && typeof document.documentElement.scrollHeight === 'number') ? document.documentElement.scrollHeight : 0;
            const scHeights = scrollContainers.map(s => (s && typeof s.scrollHeight === 'number') ? s.scrollHeight : 0);
            const currentScrollHeight = Math.max(bHeight, deHeight, ...scHeights, 0);

            if (currentCount > lastCount || currentScrollHeight > lastScrollHeight) {
              lastCount = currentCount;
              lastScrollHeight = currentScrollHeight;
              stableCycles = 0;
            } else {
              stableCycles++;
              if (stableCycles >= 8 && c >= 15) {
                break; // Confirmed true end of Stream feed reached
              }
            }
          }

          // 4. Scrape all announcements directly from active tab DOM with per-card expansion
          const announcements: any[] = [];
          const seenAnnIds = new Set<string>();
          const seenFileIds = new Set<string>();

          const postCards = Array.from(document.querySelectorAll(
            'div[data-stream-item-id], div[data-announcement-id], div[role="article"], div[data-item-id], ' +
            'li[role="listitem"], div[class*="StreamItem"], div[class*="announcement"], div[class*="Post"]'
          ));
          const containers = postCards;

          for (let i = 0; i < containers.length; i++) {
            const container = containers[i] as HTMLElement;

            // Scroll container into view so virtual renderer populates it
            try {
              if (typeof container.scrollIntoView === 'function') {
                container.scrollIntoView({ behavior: 'instant' as any, block: 'center' });
              }
              await new Promise(r => setTimeout(r, 40));
            } catch (e) {}

            // Expand card text if collapsed ("Read more", "Show more")
            const readMoreBtns = Array.from(container.querySelectorAll(
              '[aria-expanded="false"], [aria-label*="Expand" i], [aria-label*="Show more" i], [aria-label*="Read more" i], button[class*="expand" i], div[role="button"][class*="expand" i]'
            ));
            for (const b of readMoreBtns) {
              try {
                if (b.tagName === 'A' || b.closest('a') || b.hasAttribute('href') || b.hasAttribute('data-drive-id')) continue;
                const label = (b.getAttribute('aria-label') || b.textContent || '').toLowerCase();
                if (!label.includes('menu') && !label.includes('account') && !label.includes('google apps') && !label.startsWith('attachment:')) {
                  (b as HTMLElement).click();
                }
              } catch (e) {}
            }

            // Expand multi-attachment overflow buttons (+N more, +3, +5, +10 attachments!)
            const moreAttBtns = Array.from(container.querySelectorAll(
              'button[aria-label*="more" i], div[role="button"][aria-label*="more" i], [class*="more" i], [class*="overflow" i]'
            ));
            for (const mb of moreAttBtns) {
              try {
                if (mb.tagName === 'A' || mb.closest('a') || mb.hasAttribute('href') || mb.hasAttribute('data-drive-id')) continue;
                const ariaLabel = (mb.getAttribute('aria-label') || '').toLowerCase();
                if (ariaLabel.startsWith('attachment:') || ariaLabel.includes('google drive') || ariaLabel.includes('video')) continue;
                const txt = (mb.textContent || ariaLabel).trim();
                if (/\+\d+/i.test(txt) || /\b\d+\s+more\b/i.test(txt) || /\bshow\s+more\b/i.test(txt)) {
                  (mb as HTMLElement).click();
                }
              } catch (e) {}
            }
            if (readMoreBtns.length > 0 || moreAttBtns.length > 0) {
              await new Promise(r => setTimeout(r, 150));
            }

            // Check if overflow modal dialog opened at document.body level
            const overflowModal = document.querySelector('div[role="dialog"][aria-modal="true"], div[role="dialog"], div[class*="modal" i][style*="display"]');
            if (overflowModal) {
              await new Promise(r => setTimeout(r, 120));
              const modalAttLinks = Array.from(overflowModal.querySelectorAll(
                'a[href*="drive.google.com"], a[href*="docs.google.com"], a[href*="drive.usercontent.google.com"], a[href*="/file/d/"], a[href*="/file/u/"], a[href*="/d/"], a[download], [data-drive-id], [data-url*="drive.google.com"], div[role="link"]'
              ));
              for (const ma of modalAttLinks) {
                try { ma.setAttribute('data-modal-scraped', 'true'); } catch(e) {}
              }
              const closeBtn = overflowModal.querySelector('button[aria-label*="close" i], button[aria-label*="dismiss" i], button[aria-label*="Cancel" i], [data-mdc-dialog-action="close"]') as HTMLElement;
              if (closeBtn) {
                try { closeBtn.click(); } catch(e) {}
                await new Promise(r => setTimeout(r, 100));
              }
            }

            // Extract attachments inside this container AND from any modal overflow
            const attachmentsMap = new Map<string, any>();
            const containerAttLinks = Array.from(container.querySelectorAll(
              'a[href*="drive.google.com"], a[href*="docs.google.com"], a[href*="drive.usercontent.google.com"], a[href*="/file/d/"], a[href*="youtube.com"], a[href*="youtu.be"], a[download], [data-drive-id], [data-url*="drive.google.com"], div[role="button"][aria-label*="attachment" i], div[role="link"]'
            ));
            const modalAttLinks = Array.from(document.querySelectorAll('[data-modal-scraped="true"]'));
            for (const ma of modalAttLinks) {
              try { ma.removeAttribute('data-modal-scraped'); } catch(e) {}
            }
            const attLinks = [...containerAttLinks, ...modalAttLinks];
            for (const a of attLinks) {
              const href = a.getAttribute('href') || a.getAttribute('data-url') || '';
              const dataDriveId = a.getAttribute('data-drive-id');
              const fId = extractDriveId(href) || extractDriveId(a.getAttribute('data-url')) || dataDriveId || undefined;
              const cardTitle = cleanText(container.querySelector('h3, [role="heading"], div[class*="title" i]')?.textContent || '');
              const attTitle = cleanAttachmentTitle(a.textContent || a.getAttribute('aria-label') || '', cardTitle, fId);
              const attKey = fId || href;
              if (!attKey) continue;

              const existing = attachmentsMap.get(attKey);
              if (existing) {
                const isPlaceholder = !existing.title ||
                  ['attachment', 'thumbnail', 'file', 'preview'].includes(existing.title.toLowerCase().trim()) ||
                  (attTitle && attTitle.length > existing.title.length && !['attachment', 'thumbnail'].includes(attTitle.toLowerCase().trim()));
                if (isPlaceholder && attTitle) {
                  existing.title = attTitle;
                }
              } else {
                attachmentsMap.set(attKey, {
                  title: attTitle || 'Attachment',
                  fileId: fId,
                  id: fId,
                  alternateLink: href || (fId ? `https://drive.google.com/file/d/${fId}/view` : ''),
                  downloadUrl: fId ? `https://drive.google.com/uc?id=${fId}&export=download` : href
                });
                if (fId) seenFileIds.add(fId);
              }
            }

            // Also check innerHTML of this post container for Drive IDs
            try {
              const cHtml = container.innerHTML;
              const patterns = [
                /(?:drive\.google\.com|docs\.google\.com|drive\.usercontent\.google\.com)(?:[^\s"'<>]*(?:id=|(?:\/|\\\/)d(?:\/|\\\/)))([a-zA-Z0-9_-]{20,})/g,
                /(?:(?:driveFile|fileId|attachmentId)["']:\s*\{["']id["']:\s*["']|data-(?:drive-id|file-id)=["'])([a-zA-Z0-9_-]{25,})/g
              ];
              for (const pat of patterns) {
                for (const cm of cHtml.matchAll(pat)) {
                  const fId = cm[1];
                  if (!attachmentsMap.has(fId) && !['folders', 'drive', 'document', 'spreadsheets', 'presentation', 'edit', 'view', 'preview', 'thumbnail', 'home', 'export', 'download'].includes(fId)) {
                    const cardTitle = cleanText(container.querySelector('h3, [role="heading"], div[class*="title" i]')?.textContent || '');
                    const safeTitle = cleanAttachmentTitle('', cardTitle || 'Circular', fId);
                    attachmentsMap.set(fId, {
                      title: safeTitle,
                      fileId: fId,
                      id: fId,
                      alternateLink: `https://drive.google.com/file/d/${fId}/view`,
                      downloadUrl: `https://drive.google.com/uc?id=${fId}&export=download`
                    });
                    seenFileIds.add(fId);
                  }
                }
              }
            } catch (e) {}

            // Extract post text & ID
            const textEl = container.querySelector('[class*="text" i], [class*="content" i], [class*="body" i], p') || container;
            const text = cleanText(textEl.textContent || '');
            const postLink = container.querySelector('a[href*="/p/"]')?.getAttribute('href') || '';
            const pIdMatch = postLink.match(/\/p\/([a-zA-Z0-9_-]+)/);
            const annId = container.getAttribute('data-stream-item-id') ||
                          container.getAttribute('data-announcement-id') ||
                          container.getAttribute('data-item-id') ||
                          (pIdMatch ? pIdMatch[1] : null) ||
                          `ann_${seenAnnIds.size}`;

            // We only keep cards that have either real text (> 5 chars) or at least 1 attachment
            if (!seenAnnIds.has(annId) && (text.length > 5 || attachmentsMap.size > 0)) {
              seenAnnIds.add(annId);
              announcements.push({
                id: annId,
                text: text,
                alternateLink: postLink ? (postLink.startsWith('http') ? postLink : `https://classroom.google.com${postLink}`) : undefined,
                attachments: Array.from(attachmentsMap.values())
              });
            }
          }

          // 5. Page-wide universal scan: capture any circulars/files embedded on the Stream page
          const allStreamAnchors = Array.from(document.querySelectorAll(
            'a[href*="drive.google.com"], a[href*="docs.google.com"], a[href*="drive.usercontent.google.com"], a[href*="/file/d/"], a[href*="/file/u/"], a[href*="/d/"]'
          ));
          for (const a of allStreamAnchors) {
            const href = a.getAttribute('href') || a.getAttribute('data-url') || '';
            const fId = extractDriveId(href) || extractDriveId(a.getAttribute('data-url')) || a.getAttribute('data-drive-id');
            if (fId && !seenFileIds.has(fId)) {
              seenFileIds.add(fId);
              const rawTitle = a.querySelector('[class*="title" i], [id*="title" i]')?.textContent || a.textContent || a.getAttribute('aria-label') || '';
              const aTitle = cleanAttachmentTitle(rawTitle, 'Stream_Notice', fId);
              announcements.push({
                id: `stream_dom_ann_${fId}`,
                text: `Notice / Circular Attachment: ${aTitle}`,
                alternateLink: href,
                attachments: [{
                  title: aTitle,
                  fileId: fId,
                  id: fId,
                  alternateLink: href,
                  downloadUrl: `https://drive.google.com/uc?id=${fId}&export=download`
                }]
              });
            }
          }

          return {
            announcements,
            attachmentsCount: seenFileIds.size
          };
        }
      });

      if (injection && injection[0]?.result) {
        const res = injection[0].result as { announcements: any[]; attachmentsCount: number };
        await WhatsAppDiagnosticLogger.log(
          'SUCCESS',
          'EXTRACT',
          `📢 [STREAM_EXTRACT_DONE] Course "${courseName || courseId}": Extracted ${res.announcements.length} announcement(s) and ${res.attachmentsCount} attachment(s) from Stream tab!`
        ).catch(() => {});
        return res;
      }
      return null;
    } catch (err: any) {
      console.warn(`[ClassroomBrowserExtractor] scrapeCourseStreamTab error:`, err);
      await WhatsAppDiagnosticLogger.log('WARN', 'EXTRACT', `⚠️ Stream tab extraction warning for ${courseName || courseId}: ${err?.message || err}`).catch(() => {});
      return null;
    } finally {
      if (createdTab && targetTabId && chrome.tabs?.remove) {
        try {
          await chrome.tabs.remove(targetTabId);
        } catch (rErr) {}
      }
    }
  }

  /**
   * Scrapes the course's Classwork tab (/w/<courseId>/t/all) by using an existing open tab
   * or opening a silent background tab (active: false), expanding accordion items, smart-scrolling,
   * and extracting all materials, coursework, and Drive attachments.
   */
  public static async scrapeCourseClassworkTab(
    courseId: string,
    userPrefix: string,
    courseName?: string
  ): Promise<{ materials: any[]; courseWork: any[]; attachmentsCount: number } | null> {
    if (typeof chrome === 'undefined' || !chrome.scripting?.executeScript) {
      return null;
    }

    let targetTabId: number | null = null;
    let createdTab = false;

    try {
      // 1. Check if an open tab is already on this course's classwork page
      if (chrome.tabs?.query) {
        try {
          const allTabs = (await chrome.tabs.query({})) || [];
          const existingClassworkTabs = allTabs.filter(t =>
            t.url && (t.url.includes(`/w/${courseId}`) || t.url.includes(`/c/${courseId}/w`))
          );
          if (existingClassworkTabs.length > 0) {
            existingClassworkTabs.sort((a, b) => this.scoreClassroomTab(b, userPrefix) - this.scoreClassroomTab(a, userPrefix));
            targetTabId = existingClassworkTabs[0].id || null;
          }
        } catch (qErr) {}
      }

      const classworkUrl = `https://classroom.google.com${userPrefix}/w/${courseId}/t/all`;

      // 2. If not already at classwork, use findClassroomTab() to find best student Classroom tab and navigate it to the Classwork tab
      if (!targetTabId) {
        try {
          const existingClassroom = await this.findClassroomTab(userPrefix);
          if (existingClassroom && existingClassroom.id && chrome.tabs?.update) {
            targetTabId = existingClassroom.id;
            await WhatsAppDiagnosticLogger.log(
              'INFO',
              'EXTRACT',
              `📂 [CLASSWORK_TAB_NAVIGATE] Navigating Classroom tab #${targetTabId} (scored for "${userPrefix}") to Classwork: ${classworkUrl}`
            ).catch(() => {});

            await chrome.tabs.update(targetTabId, { url: classworkUrl, active: true });

            // Wait for tab status complete
            await new Promise<void>((resolve) => {
              let done = false;
              const finish = () => {
                if (!done) {
                  done = true;
                  try { chrome.tabs.onUpdated.removeListener(listener); } catch (e) {}
                  resolve();
                }
              };
              const listener = (tid: number, changeInfo: chrome.tabs.TabChangeInfo) => {
                if (tid === targetTabId && changeInfo.status === 'complete') {
                  finish();
                }
              };
              if (chrome.tabs?.onUpdated) {
                chrome.tabs.onUpdated.addListener(listener);
              }
              setTimeout(finish, 8000);
            });

            // Allow Classroom client-side SPA to fully render DOM elements
            await new Promise(r => setTimeout(r, 3500));
          }
        } catch (navErr) {}
      }

      // 3. If no Classroom tab was open at all, create a new active tab
      if (!targetTabId && chrome.tabs?.create) {
        await WhatsAppDiagnosticLogger.log(
          'INFO',
          'EXTRACT',
          `📂 [CLASSWORK_TAB_OPEN] Opening new Classwork tab for "${courseName || courseId}": ${classworkUrl}`
        ).catch(() => {});

        let newTab: chrome.tabs.Tab | null = null;
        try {
          newTab = await chrome.tabs.create({
            url: classworkUrl,
            active: true
          });
        } catch (createErr) {
          newTab = null;
        }

        if (newTab && newTab.id) {
          targetTabId = newTab.id;
          createdTab = true;

          // Wait for tab status complete
          await new Promise<void>((resolve) => {
            let done = false;
            const finish = () => {
              if (!done) {
                done = true;
                try { chrome.tabs.onUpdated.removeListener(listener); } catch (e) {}
                resolve();
              }
            };
            const listener = (tid: number, changeInfo: chrome.tabs.TabChangeInfo) => {
              if (tid === newTab.id && changeInfo.status === 'complete') {
                finish();
              }
            };
            if (chrome.tabs?.onUpdated) {
              chrome.tabs.onUpdated.addListener(listener);
            }
            setTimeout(finish, 8000);
          });

          // Allow Classroom client-side SPA to render DOM elements
          await new Promise(r => setTimeout(r, 4000));
        }
      }

      if (!targetTabId) {
        return null;
      }

      // 3. Define unified Classwork extraction function (runs in browser tab context)
      const extractClassworkInTab = async (pfx: string, cId: string, forcedTopicName?: string) => {
        const cleanText = (t: string) => (t || '').replace(/\r?\n/g, ' ').replace(/\s+/g, ' ').trim();
        const normalizeId = (id: string | null | undefined): string => {
          if (!id) return '';
          const s = String(id).trim();
          if (/^\d+$/.test(s)) return s;
          if (/^[a-zA-Z0-9+/=]{8,}$/.test(s)) {
            try {
              const decoded = atob(s);
              if (/^\d{8,}$/.test(decoded)) return decoded;
            } catch (e) {}
          }
          return s;
        };
        const cleanAttachmentTitle = (raw: string, noteTitle?: string, fileId?: string): string => {
          let t = cleanText(raw);
          t = t.replace(/^Attachment:\s*/i, '');
          t = t.replace(/(\.[a-zA-Z0-9]{2,5})[\s_]*(?:PDF|Video|Image|Word|PowerPoint|Excel|Document|Audio)+$/i, '$1');
          t = t.replace(/[\s_]+(?:PDF|Video|Image|Word|PowerPoint|Excel|Document|Audio)+$/i, '');
          t = t.replace(/(?<!\.)(?:PDF|Video|Image|Word|PowerPoint|Excel|Document|Audio)+$/i, '');
          t = t.trim();

          const isInvalid = !t || /^[().\s_-]+(\.[a-zA-Z0-9]+)?$/i.test(t) || t.replace(/\.[a-zA-Z0-9]+$/i, '').trim() === '';
          if (isInvalid) {
            let cleanNote = (noteTitle || '').replace(/[\\/:*?"<>|]/g, '_').replace(/^[().\s_-]+$/g, '').trim().substring(0, 30);
            if (/^(?:item\s+\d+|collapse\s+topic|view\s+material|view\s+assignment|coursework\s+[a-z0-9_-]+)$/i.test(cleanNote)) {
              cleanNote = '';
            }
            const prefix = cleanNote || 'Classroom_Doc';
            const idPart = (fileId || '').substring(0, 6) || Math.random().toString(36).substring(2, 8);
            return `${prefix}_${idPart}.pdf`;
          }
          return t;
        };
        const extractDriveId = (urlOrHref: string | null | undefined): string | null => {
          if (!urlOrHref || typeof urlOrHref !== 'string') return null;
          const pathMatch = urlOrHref.match(/(?:file|document|presentation|spreadsheets|forms)(?:\/u\/\d+)?\/d\/([a-zA-Z0-9_-]{20,})/i);
          if (pathMatch && pathMatch[1]) return pathMatch[1];
          const queryMatch = urlOrHref.match(/[?&]id=([a-zA-Z0-9_-]{20,})/i);
          if (queryMatch && queryMatch[1]) return queryMatch[1];
          const genericDMatch = urlOrHref.match(/\/d\/([a-zA-Z0-9_-]{20,})/i);
          if (genericDMatch && genericDMatch[1]) return genericDMatch[1];
          return null;
        };

        // 1. Wait for Classroom Classwork SPA to genuinely hydrate
        const pollStart = Date.now();
        while (Date.now() - pollStart < 12000) {
          const hasItems = document.querySelectorAll(
            'ol[role="list"] li, div[data-item-id], div[role="region"], div[data-topic-id], div[class*="Topic" i], div[class*="Coursework" i], div[class*="StreamItem" i], a[href*="/m/"], a[href*="/a/"], div[role="listitem"]'
          ).length > 0;
          if (hasItems) break;
          await new Promise(r => setTimeout(r, 400));
        }

        await new Promise(r => setTimeout(r, 1200));

        // 2. Discover all scrollable containers in Classroom
        const getScrollContainers = (): HTMLElement[] => {
          const containers: HTMLElement[] = [];
          if (document.scrollingElement) containers.push(document.scrollingElement as HTMLElement);
          if (document.documentElement) containers.push(document.documentElement);
          if (document.body) containers.push(document.body);
          
          const candidates = document.querySelectorAll('main, [role="main"], c-wiz, div');
          for (const c of Array.from(candidates)) {
            const el = c as HTMLElement;
            if (el.scrollHeight > el.clientHeight + 50) {
              const style = window.getComputedStyle ? window.getComputedStyle(el) : null;
              if (!style || style.overflowY === 'auto' || style.overflowY === 'scroll' || style.overflow === 'auto' || style.overflow === 'scroll') {
                containers.push(el);
              }
            }
          }
          return Array.from(new Set(containers));
        };

        // Helper to identify system navigation, account menus, or attachment links that must NOT be clicked
        const isSystemOrMenuButton = (el: Element): boolean => {
          const label = (el.getAttribute('aria-label') || el.textContent || '').toLowerCase();
          const popup = el.getAttribute('aria-haspopup');
          if (popup === 'true' || popup === 'menu') return true;
          if (label.includes('main menu') || label.includes('classroom menu') || label.includes('google apps') ||
              label.includes('google account') || label.includes('account') || label.includes('settings') ||
              label.includes('help') || label.includes('feedback') || label.includes('more options') ||
              label.includes('action menu') || label.includes('post options')) {
            return true;
          }
          if (label.startsWith('attachment:') || el.getAttribute('data-drive-id') || el.hasAttribute('href')) {
            return true;
          }
          if (el.closest('header, nav, [role="banner"], [role="navigation"]')) {
            return true;
          }
          return false;
        };

        // Helper to identify topic header buttons or elements
        const isTopicHeaderElement = (el: Element): boolean => {
          if (el.tagName === 'H2' || el.querySelector('h2, [role="heading"][aria-level="2"]')) return true;
          if (el.closest('h2, [role="heading"][aria-level="2"]')) return true;
          const label = (el.getAttribute('aria-label') || '').toLowerCase();
          if (label.includes('collapse topic') || label.includes('expand topic') || label.includes('topic options') || label.includes('topic filter') || label.includes('all topics')) return true;
          const txt = (el.textContent || '').trim().toLowerCase();
          if (txt === 'collapse topic' || txt === 'expand topic' || txt.includes('topic filter') || txt === 'all topics' || txt.endsWith(' topic') || txt.endsWith(' topics')) return true;
          return false;
        };

        const isTopicHeaderContainer = (el: HTMLElement): boolean => {
          if (el.tagName === 'H2') return true;
          const hasH2 = el.querySelector('h2, [role="heading"][aria-level="2"]') !== null;
          const hasH3OrLinks = el.querySelector('h3, [role="heading"][aria-level="3"], a[href*="/m/"], a[href*="/a/"]') !== null;
          if (hasH2 && !hasH3OrLinks) return true;
          const label = (el.getAttribute('aria-label') || '').toLowerCase();
          if (label.includes('collapse topic') || label.includes('expand topic') || label.includes('topic options') || label.includes('topic filter') || label.includes('all topics')) return true;
          const txt = (el.textContent || '').trim().toLowerCase();
          if (txt === 'collapse topic' || txt === 'expand topic' || txt.includes('topic filter') || txt === 'all topics' || txt.endsWith(' topic') || txt.endsWith(' topics')) return true;
          return false;
        };

        const isActionLinkTitle = (title: string): boolean => {
          if (!title) return false;
          const t = title.trim().toLowerCase();
          return (
            t === 'view material' ||
            t === 'view assignment' ||
            t === 'view instructions' ||
            t === 'view question' ||
            t === 'view details' ||
            t === 'सामग्री पहा' ||
            t === 'सूचना पहा' ||
            t === 'अभिहस्तांकन पहा' ||
            t.startsWith('view material') ||
            t.startsWith('view assignment') ||
            t.startsWith('view instructions') ||
            t.startsWith('view question') ||
            t.startsWith('open ')
          );
        };

        const cleanTopicTitle = (raw: string): string => {
          let t = (raw || '').replace(/\r?\n/g, ' ').replace(/\s+/g, ' ').trim();
          t = t.replace(/\b(?:collapse|expand)\s+topic\b/gi, '');
          t = t.replace(/\bcopy\s+link\b/gi, '');
          t = t.replace(/\bmore_vert\b/gi, '');
          t = t.replace(/\btopic\s+options\b/gi, '');
          return t.trim();
        };

        const isTopicHeaderTitle = (title: string, topicName?: string): boolean => {
          if (!title) return true;
          const t = title.trim().toLowerCase();
          if (t === 'collapse topic' || t === 'expand topic' || t.includes('collapse topic') || t.includes('expand topic')) return true;
          if (t === 'copy link' || t.includes('copy link')) return true;
          if (t === 'topic options' || t.includes('topic options')) return true;
          if (t === 'all topics' || t === 'add topic' || t.includes('all topics') || t.includes('topic filter')) return true;
          if (t.startsWith('topic ') || t.endsWith(' topic') || t.endsWith(' topics')) return true;
          if (isActionLinkTitle(t)) return true;
          if (topicName && (t === topicName.trim().toLowerCase() || t === (topicName.trim().toLowerCase() + ' topic'))) return true;
          return false;
        };

        const isSystemTitle = (title: string): boolean => {
          const t = (title || '').trim().toLowerCase();
          return t.includes('google apps') || t.includes('classroom menu') || t.includes('main menu') || t.includes('google account') || isActionLinkTitle(t);
        };

        const getTopicForElement = (el: Element): string => {
          if (forcedTopicName) return forcedTopicName;
          let curr: Element | null = el;
          while (curr && curr.tagName !== 'BODY' && curr.tagName !== 'HTML') {
            const h2 = curr.querySelector('h2, [role="heading"][aria-level="2"]');
            if (h2 && h2 !== el && !isElementInside(el, h2)) {
              const t = cleanTopicTitle(h2.textContent || '');
              if (t && !isTopicHeaderTitle(t)) return t;
            }
            curr = curr.parentElement;
          }

          const section = el.closest ? el.closest('section, div[data-topic-id], div[role="region"], li') : null;
          if (section) {
            const h2 = section.querySelector('h2, [role="heading"][aria-level="2"]');
            if (h2) {
              const t = cleanTopicTitle(h2.textContent || '');
              if (t && !isTopicHeaderTitle(t)) return t;
            }
          }

          const allH2 = Array.from(document.querySelectorAll('h2, [role="heading"][aria-level="2"]'));
          let candidate: Element | null = null;
          for (const h of allH2) {
            if (h.compareDocumentPosition && (h.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING)) {
              candidate = h;
            } else {
              break;
            }
          }
          if (candidate) {
            const t = cleanTopicTitle(candidate.textContent || '');
            if (t && !isTopicHeaderTitle(t)) return t;
          }
          return '';
        };

        const isElementInside = (parent: Element | null | undefined, child: Element | null | undefined): boolean => {
          if (!parent || !child) return false;
          if (parent === child) return true;
          if (typeof parent.contains === 'function') {
            return parent.contains(child);
          }
          let curr: Element | null = child;
          while (curr) {
            if (curr === parent) return true;
            curr = curr.parentElement;
          }
          return false;
        };

        const getCardContainer = (toggle: Element, topicEl?: Element): HTMLElement => {
          const itemRow = toggle.closest('li[role="listitem"], [role="listitem"], div[data-item-id]');
          if (itemRow && (!topicEl || isElementInside(topicEl, itemRow)) && itemRow !== topicEl) {
            if (!itemRow.querySelector('h2, [role="heading"][aria-level="2"]')) {
              return itemRow as HTMLElement;
            }
          }

          let curr = toggle as HTMLElement;
          while (curr.parentElement) {
            const parent = curr.parentElement;
            if (topicEl && (curr === topicEl || parent === topicEl)) {
              break;
            }
            if (parent.tagName === 'BODY' || parent.tagName === 'MAIN') {
              break;
            }
            if (parent.querySelector('h2, [role="heading"][aria-level="2"]')) {
              break;
            }
            const siblingHeadings = parent.querySelectorAll('h3, [role="heading"][aria-level="3"]');
            if (siblingHeadings.length > 1) {
              return curr;
            }
            const siblingToggles = Array.from(
              parent.querySelectorAll('[aria-expanded], div[role="button"][aria-expanded]')
            ).filter(el => !isSystemOrMenuButton(el) && !isTopicHeaderElement(el));
            if (siblingToggles.length > 1) {
              return curr;
            }
            curr = parent;
          }
          return curr;
        };

        const sanitizeIdPart = (s: string) => s.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 30);

        const materials: any[] = [];
        const courseWork: any[] = [];
        const seenFileIds = new Set<string>();
        const seenCardElements = new Set<HTMLElement>();

        // Discover topic links if on overview page (/t/all)
        const topicLinks: { id: string; name: string; url: string; hasViewAll: boolean; itemCount: number }[] = [];
        const seenTopicIds = new Set<string>();

        if (!forcedTopicName) {
          const navLinks = Array.from(document.querySelectorAll('a[href*="/t/"], nav a, div[role="navigation"] a'));
          for (const a of navLinks) {
            const h = a.getAttribute('href') || '';
            const tMatch = h.match(/\/t\/([a-zA-Z0-9_-]+)/);
            const tId = tMatch ? tMatch[1] : '';
            if (tId && tId !== 'all' && !seenTopicIds.has(tId)) {
              seenTopicIds.add(tId);
              const name = cleanTopicTitle(a.textContent || '');
              if (name && !isTopicHeaderTitle(name)) {
                const fullUrl = h.startsWith('http') ? h : `https://classroom.google.com${h}`;
                topicLinks.push({ id: tId, name, url: fullUrl, hasViewAll: false, itemCount: 0 });
              }
            }
          }

          const topicSections = Array.from(document.querySelectorAll('ol[role="list"] > li, div[role="region"], div[data-topic-id], section'));
          for (const sec of topicSections) {
            const h2 = sec.querySelector('h2, [role="heading"][aria-level="2"]');
            const topicName = cleanTopicTitle(h2?.textContent || '');
            const viewAllAnchor = Array.from(sec.querySelectorAll('a[href*="/t/"]')).find(a => {
              const txt = (a.textContent || a.getAttribute('aria-label') || '').toLowerCase();
              return txt.includes('view all') || txt.includes('view more') || txt.includes('show all') || txt.includes('see all') || txt.includes('सामग्री');
            });
            if (viewAllAnchor) {
              const h = viewAllAnchor.getAttribute('href') || '';
              const tMatch = h.match(/\/t\/([a-zA-Z0-9_-]+)/);
              const tId = tMatch ? tMatch[1] : '';
              if (tId && tId !== 'all') {
                const existingT = topicLinks.find(t => t.id === tId || (topicName && t.name.toLowerCase() === topicName.toLowerCase()));
                if (existingT) {
                  existingT.hasViewAll = true;
                } else {
                  seenTopicIds.add(tId);
                  const fullUrl = h.startsWith('http') ? h : `https://classroom.google.com${h}`;
                  topicLinks.push({ id: tId, name: topicName || 'Topic', url: fullUrl, hasViewAll: true, itemCount: 0 });
                }
              }
            }
          }

          // In case sidebar is collapsed or dynamic, discover topic links embedded anywhere in the DOM/HTML
          try {
            const courseMatch = window.location.pathname.match(/^(\/u\/\d+)?\/w\/([a-zA-Z0-9_-]+)/);
            const userPrefix = courseMatch?.[1] || '';
            const courseId = courseMatch?.[2] || '';
            const topicUrlPat = /(?:\/w\/[a-zA-Z0-9_-]+)?\/t\/([a-zA-Z0-9_-]{5,})/g;
            for (const tm of document.documentElement.innerHTML.matchAll(topicUrlPat)) {
              const tId = tm[1];
              if (tId && tId !== 'all' && !seenTopicIds.has(tId) && !['submissions', 'grades', 'sort', 'about', 'stream'].includes(tId)) {
                seenTopicIds.add(tId);
                const fullUrl = `https://classroom.google.com${userPrefix}/w/${courseId}/t/${tId}`;
                topicLinks.push({ id: tId, name: `Topic ${tId.substring(0, 8)}`, url: fullUrl, hasViewAll: true, itemCount: 0 });
              }
            }
          } catch (e) {}
        }

        const scrapeCard = (container: HTMLElement, defaultTopic?: string) => {
          const linkEl = container.querySelector('a[href*="/m/"], a[href*="/a/"], a[href*="/sa/"], a[href*="/submissions/"]') ||
            (container.tagName === 'A' && (container as HTMLAnchorElement).href ? container : null);
          const link = linkEl?.getAttribute('href') || '';
          const linkMatch = link.match(/\/(?:m|a|sa)\/([a-zA-Z0-9_-]+)/);
          const rawId = linkMatch?.[1];
          const normId = normalizeId(rawId);

          const headingEl = container.querySelector('h3, h4, [role="heading"]:not([aria-level="1"]):not([aria-level="2"])') ||
                            container.querySelector('div[class*="title" i], span[class*="title" i]');
          let rawTitle = cleanText(headingEl?.textContent || '');
          if (!rawTitle || rawTitle.length < 2 || isActionLinkTitle(rawTitle)) {
            const expandEl = container.querySelector('[aria-expanded], div[role="button"]');
            const lbl = cleanText(expandEl?.getAttribute('aria-label') || '');
            if (lbl && !isTopicHeaderTitle(lbl, defaultTopic) && !isActionLinkTitle(lbl)) {
              rawTitle = lbl;
            } else if (expandEl?.textContent) {
              const expTxt = cleanText(expandEl.textContent);
              if (!isTopicHeaderTitle(expTxt, defaultTopic) && !isActionLinkTitle(expTxt)) {
                rawTitle = expTxt;
              }
            }
          }

          let title = rawTitle
            .replace(/^(?:Material|Assignment|Question):\s*/i, '')
            .replace(/(?:\.|\,)?\s*(?:Posted|Due)\s+.*$/i, '')
            .trim();

          if (isTopicHeaderTitle(title, defaultTopic) || isSystemTitle(title)) {
            return;
          }

          const attachments: any[] = [];
          const attAnchors = Array.from(container.querySelectorAll(
            'a[href*="drive.google.com"], a[href*="docs.google.com"], a[href*="drive.usercontent.google.com"], a[href*="youtube.com"], a[href*="youtu.be"], a[download], a[href*="/file/d/"], a[href*="/file/u/"], a[href*="/d/"], [data-drive-id], [data-url*="drive.google.com"], div[role="button"][aria-label*="attachment" i], div[role="link"]'
          ));

          if (attAnchors.length === 0 && container.parentElement) {
            const p = container.parentElement;
            if (p.tagName !== 'BODY' && p.tagName !== 'MAIN' && !p.querySelector('h2, [role="heading"][aria-level="2"]')) {
              const siblingHeadings = p.querySelectorAll('h3, [role="heading"][aria-level="3"]');
              if (siblingHeadings.length <= 1) {
                const parentAtts = Array.from(p.querySelectorAll(
                  'a[href*="drive.google.com"], a[href*="docs.google.com"], a[href*="drive.usercontent.google.com"], a[href*="/file/d/"], a[href*="/file/u/"], a[href*="/d/"], [data-drive-id], [data-url*="drive.google.com"]'
                ));
                attAnchors.push(...parentAtts);
              }
            }
          }

          const modalAttLinks = Array.from(document.querySelectorAll('[data-modal-scraped="true"]'));
          for (const ma of modalAttLinks) {
            try { ma.removeAttribute('data-modal-scraped'); } catch (e) {}
          }
          const allCardAttAnchors = [...attAnchors, ...modalAttLinks];

          for (const a of allCardAttAnchors) {
            const href = a.getAttribute('href') || a.getAttribute('data-url') || '';
            const rawAttTitle = a.querySelector('[class*="title" i], [id*="title" i]')?.textContent || a.textContent || a.getAttribute('aria-label') || '';
            const fId = extractDriveId(href) || extractDriveId(a.getAttribute('data-url')) || a.getAttribute('data-drive-id') || undefined;
            const aTitle = cleanAttachmentTitle(rawAttTitle, title, fId);
            if (fId && !seenFileIds.has(fId)) {
              seenFileIds.add(fId);
              attachments.push({
                title: aTitle,
                fileId: fId,
                id: fId,
                alternateLink: href || `https://drive.google.com/file/d/${fId}/view`,
                downloadUrl: `https://drive.google.com/uc?id=${fId}&export=download`
              });
            }
          }

          try {
            const cardHtml = container.innerHTML;
            const cardDriveRegex = /(?:drive\.google\.com|docs\.google\.com|drive\.usercontent\.google\.com)(?:[^\s"'<>]*(?:id=|(?:\/|\\\/)d(?:\/|\\\/)))([a-zA-Z0-9_-]{20,})/g;
            for (const cm of cardHtml.matchAll(cardDriveRegex)) {
              const fId = cm[1];
              if (!seenFileIds.has(fId) && !['folders', 'drive', 'document', 'spreadsheets', 'presentation', 'edit', 'view', 'preview', 'thumbnail', 'home', 'export', 'download'].includes(fId)) {
                seenFileIds.add(fId);
                const aTitle = cleanAttachmentTitle('', title, fId);
                attachments.push({
                  title: aTitle,
                  fileId: fId,
                  id: fId,
                  alternateLink: `https://drive.google.com/file/d/${fId}/view`,
                  downloadUrl: `https://drive.google.com/uc?id=${fId}&export=download`
                });
              }
            }
          } catch (e) {}

          const resolvedTopic = forcedTopicName || (defaultTopic && !isTopicHeaderTitle(defaultTopic) ? defaultTopic : getTopicForElement(container));
          const effectiveId = normId || rawId || container.getAttribute('data-item-id') || `cw_${sanitizeIdPart(resolvedTopic || 'notopic')}_${sanitizeIdPart(title)}_${materials.length + courseWork.length + 1}`;
          const isAssignment = link.includes('/a/') || container.querySelector('a[href*="/a/"], a[href*="/submissions/"]') !== null;

          const itemObj = {
            id: effectiveId,
            title: title || (isAssignment ? 'Coursework Assignment' : 'Classwork Material'),
            alternateLink: link || undefined,
            topic: resolvedTopic || undefined,
            attachments
          };

          if (isAssignment) {
            courseWork.push(itemObj);
          } else {
            materials.push(itemObj);
          }
        };

        const dispatchRealisticClick = (el: Element) => {
          try {
            if (typeof (el as any).click === 'function') {
              (el as any).click();
            } else {
              el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
              el.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));
              el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
            }
          } catch (e) {}
        };

        const expandCardAndPoll = async (cardContainer: HTMLElement) => {
          if (typeof cardContainer.scrollIntoView === 'function') {
            try {
              cardContainer.scrollIntoView({ block: 'center', behavior: 'instant' as any });
            } catch (e) {
              try { cardContainer.scrollIntoView(); } catch (e2) {}
            }
          }

          let toggle = cardContainer.querySelector(
            '[aria-expanded="false"], div[role="button"][aria-expanded="false"]'
          );
          if (!toggle) {
            toggle = cardContainer.querySelector('[aria-expanded], div[role="button"][aria-expanded]');
          }
          const heading = cardContainer.querySelector('h3, [role="heading"][aria-level="3"]');
          if (toggle && isSystemOrMenuButton(toggle)) {
            toggle = null;
          }
          if (!toggle && cardContainer.hasAttribute('aria-expanded') && !isSystemOrMenuButton(cardContainer)) {
            toggle = cardContainer;
          }

          if (toggle && !isSystemOrMenuButton(toggle) && !isTopicHeaderElement(toggle)) {
            if (toggle.getAttribute('aria-expanded') !== 'true') {
              if (toggle.tagName !== 'A' || !toggle.hasAttribute('href')) {
                dispatchRealisticClick(toggle);
              }
            }
          } else if (heading && (!heading.hasAttribute('href') && heading.tagName !== 'A')) {
            dispatchRealisticClick(heading.parentElement && heading.parentElement !== cardContainer ? heading.parentElement : heading);
          }

          const waitStart = Date.now();
          let pollCycles = 0;
          while (Date.now() - waitStart < 800 && pollCycles < 12) {
            pollCycles++;
            const hasAtts = cardContainer.querySelectorAll(
              'a[href*="drive.google.com"], a[href*="docs.google.com"], a[href*="drive.usercontent.google.com"], [data-drive-id]'
            ).length > 0;
            const isExp = (toggle && toggle.getAttribute('aria-expanded') === 'true') ||
                          cardContainer.getAttribute('aria-expanded') === 'true' ||
                          cardContainer.querySelector('[aria-expanded="true"]') !== null;
            if (hasAtts) {
              await new Promise(r => setTimeout(r, 80));
              break;
            }
            if (isExp && Date.now() - waitStart >= 450) {
              break;
            }
            await new Promise(r => setTimeout(r, 50));
          }

          const overflowBtns = Array.from(cardContainer.querySelectorAll(
            'button[aria-label*="more" i], div[role="button"][aria-label*="more" i], [class*="more" i], [class*="overflow" i]'
          )).filter(btn => {
            if (btn.tagName === 'A' || btn.closest('a') || btn.hasAttribute('href') || btn.hasAttribute('data-drive-id')) return false;
            const ariaLabel = (btn.getAttribute('aria-label') || '').toLowerCase();
            if (ariaLabel.startsWith('attachment:') || ariaLabel.includes('google drive') || ariaLabel.includes('video') || ariaLabel.includes('pdf')) return false;
            const txt = (btn.textContent || ariaLabel).trim();
            return /\+\d+/i.test(txt) || /\b\d+\s+more\b/i.test(txt) || /\bshow\s+more\b/i.test(txt);
          });
          for (const mb of overflowBtns) {
            try {
              (mb as HTMLElement).click();
              await new Promise(r => setTimeout(r, 80));
            } catch (e) {}
          }

          const overflowModal = document.querySelector('div[role="dialog"][aria-modal="true"], div[role="dialog"], div[class*="modal" i][style*="display"]');
          if (overflowModal) {
            await new Promise(r => setTimeout(r, 100));
            const modalAttLinks = Array.from(overflowModal.querySelectorAll(
              'a[href*="drive.google.com"], a[href*="docs.google.com"], a[href*="drive.usercontent.google.com"], a[href*="/file/d/"], a[href*="/file/u/"], a[href*="/d/"], a[download], [data-drive-id], [data-url*="drive.google.com"], div[role="link"]'
            ));
            for (const ma of modalAttLinks) {
              try { ma.setAttribute('data-modal-scraped', 'true'); } catch (e) {}
            }
            const closeBtn = overflowModal.querySelector('button[aria-label*="close" i], button[aria-label*="dismiss" i], button[aria-label*="Cancel" i], [data-mdc-dialog-action="close"]') as HTMLElement;
            if (closeBtn) {
              try { closeBtn.click(); } catch (e) {}
              await new Promise(r => setTimeout(r, 80));
            }
          }
        };

        // 3. Paced Downward Infinite Scroll with Sentinel Jumping & Incremental Viewport Scraping
        let lastCount = 0;
        let lastScrollHeight = 0;
        let stableCycles = 0;
        let scrollCycles = 0;
        const safetyLimit = 300;

        while (scrollCycles < safetyLimit) {
          scrollCycles++;
          const scrollContainers = getScrollContainers();

          if (typeof window.scrollBy === 'function') {
            window.scrollBy({ top: 1200, behavior: 'instant' as any });
          }
          for (const sc of scrollContainers) {
            sc.scrollTop += 1200;
            try { sc.dispatchEvent(new Event('scroll', { bubbles: true })); } catch (e) {}
          }

          if (scrollCycles % 2 === 0) {
            const bH = (document.body && typeof document.body.scrollHeight === 'number') ? document.body.scrollHeight : 0;
            if (typeof window.scrollTo === 'function') {
              window.scrollTo({ top: bH + 10000, behavior: 'instant' as any });
            }
            for (const sc of scrollContainers) {
              if (sc && typeof sc.scrollHeight === 'number') {
                sc.scrollTop = sc.scrollHeight;
                try { sc.dispatchEvent(new Event('scroll', { bubbles: true })); } catch (e) {}
              }
            }
          }

          const viewMoreBtns = Array.from(document.querySelectorAll('button, div[role="button"], a[href*="/t/"]')).filter(el => {
            const t = (el.textContent || el.getAttribute('aria-label') || '').trim().toLowerCase();
            return t.includes('view more') || t.includes('show more') || t.includes('view all');
          });
          for (const btn of viewMoreBtns) {
            try {
              if (btn.tagName === 'A') {
                btn.addEventListener('click', (e) => e.preventDefault(), { once: true });
              }
              (btn as HTMLElement).click();
            } catch (e) {}
          }

          const inViewElements = Array.from(document.querySelectorAll(
            '[aria-expanded], div[role="button"][aria-expanded], h3, [role="heading"][aria-level="3"], a[href*="/m/"], a[href*="/a/"], a[href*="/sa/"], div[data-item-id], li'
          )).filter(el => {
            if (isSystemOrMenuButton(el) || isTopicHeaderElement(el)) return false;
            if (typeof el.getBoundingClientRect === 'function') {
              const rect = el.getBoundingClientRect();
              const vh = window.innerHeight || 1000;
              return rect.top >= -400 && rect.bottom <= vh + 800;
            }
            return true;
          });

          for (const el of inViewElements) {
            const cardContainer = getCardContainer(el);
            if (!cardContainer || seenCardElements.has(cardContainer)) continue;
            if (isTopicHeaderContainer(cardContainer)) continue;
            seenCardElements.add(cardContainer);

            await expandCardAndPoll(cardContainer);
            const derivedTopic = forcedTopicName || getTopicForElement(cardContainer);
            scrapeCard(cardContainer, derivedTopic);
          }

          await new Promise(r => setTimeout(r, 250));

          const currentCount = document.querySelectorAll('div[data-item-id], li[role="listitem"], [aria-expanded], a[href*="/m/"], a[href*="/a/"]').length;
          const bHeight = (document.body && typeof document.body.scrollHeight === 'number') ? document.body.scrollHeight : 0;
          const deHeight = (document.documentElement && typeof document.documentElement.scrollHeight === 'number') ? document.documentElement.scrollHeight : 0;
          const scHeights = scrollContainers.map(s => (s && typeof s.scrollHeight === 'number') ? s.scrollHeight : 0);
          const currentScrollHeight = Math.max(bHeight, deHeight, ...scHeights, 0);

          if (currentCount > lastCount || currentScrollHeight > lastScrollHeight) {
            lastCount = currentCount;
            lastScrollHeight = currentScrollHeight;
            stableCycles = 0;
          } else {
            stableCycles++;
            const maxCycles = forcedTopicName ? 10 : 5;
            const minCycles = forcedTopicName ? 3 : 2;
            if (stableCycles >= 2 && scrollCycles >= minCycles) {
              break;
            }
            if (scrollCycles >= maxCycles) {
              break;
            }
          }
        }

        // 4. Upward Sweep
        const scrollContainers = getScrollContainers();
        for (let up = 0; up < 4; up++) {
          if (typeof window.scrollBy === 'function') {
            window.scrollBy({ top: -1500, behavior: 'instant' as any });
          }
          for (const sc of scrollContainers) {
            sc.scrollTop -= 1500;
            try { sc.dispatchEvent(new Event('scroll', { bubbles: true })); } catch (e) {}
          }
          await new Promise(r => setTimeout(r, 150));

          const upCandidates = Array.from(document.querySelectorAll(
            '[aria-expanded], div[role="button"][aria-expanded], h3, [role="heading"][aria-level="3"], a[href*="/m/"], a[href*="/a/"], a[href*="/sa/"], div[data-item-id], li'
          )).filter(el => {
            if (isSystemOrMenuButton(el) || isTopicHeaderElement(el)) return false;
            if (typeof el.getBoundingClientRect === 'function') {
              const rect = el.getBoundingClientRect();
              const vh = window.innerHeight || 1000;
              return rect.top >= -400 && rect.bottom <= vh + 800;
            }
            return true;
          });

          for (const el of upCandidates) {
            const cardContainer = getCardContainer(el);
            if (!cardContainer || seenCardElements.has(cardContainer)) continue;
            if (isTopicHeaderContainer(cardContainer)) continue;
            seenCardElements.add(cardContainer);

            await expandCardAndPoll(cardContainer);
            const derivedTopic = forcedTopicName || getTopicForElement(cardContainer);
            scrapeCard(cardContainer, derivedTopic);
          }
        }

        // 5. Sweep across all identified topic sections
        const rawTopicSections = Array.from(document.querySelectorAll(
          'ol[role="list"] > li, div[role="region"], div[data-topic-id], section'
        )).filter(el => el.querySelector('h2, [role="heading"][aria-level="2"]') !== null);

        const topicSections = rawTopicSections.filter(section => {
          const h2 = section.querySelector('h2, [role="heading"][aria-level="2"]');
          const hasChildTopicWithSameHeading = rawTopicSections.some(other =>
            other !== section && isElementInside(section, other) && other.querySelector('h2, [role="heading"][aria-level="2"]') === h2
          );
          return !hasChildTopicWithSameHeading;
        });

        for (const topicEl of topicSections) {
          const topicHeadingEl = topicEl.querySelector('h2, [role="heading"][aria-level="2"]');
          const topicTitle = forcedTopicName || cleanText(topicHeadingEl?.textContent || '');

          const candidateElements = Array.from(topicEl.querySelectorAll(
            '[aria-expanded], div[role="button"][aria-expanded], h3, [role="heading"][aria-level="3"], a[href*="/m/"], a[href*="/a/"], a[href*="/sa/"], div[data-item-id], li'
          )).filter(el => el !== topicEl && !isSystemOrMenuButton(el) && !isTopicHeaderElement(el));

          for (const el of candidateElements) {
            const cardContainer = getCardContainer(el, topicEl);
            if (!cardContainer || seenCardElements.has(cardContainer)) continue;
            if (isTopicHeaderContainer(cardContainer)) continue;
            seenCardElements.add(cardContainer);

            await expandCardAndPoll(cardContainer);
            scrapeCard(cardContainer, topicTitle);
          }
        }

        const outsideCandidates = Array.from(document.querySelectorAll(
          '[aria-expanded], div[role="button"][aria-expanded], h3, [role="heading"][aria-level="3"], a[href*="/m/"], a[href*="/a/"], a[href*="/sa/"], div[data-item-id], li'
        )).filter(el =>
          !isSystemOrMenuButton(el) &&
          !isTopicHeaderElement(el) &&
          !topicSections.some(t => isElementInside(t, el))
        );

        for (const el of outsideCandidates) {
          const cardContainer = getCardContainer(el);
          if (!cardContainer || seenCardElements.has(cardContainer)) continue;
          if (isTopicHeaderContainer(cardContainer)) continue;
          seenCardElements.add(cardContainer);

          await expandCardAndPoll(cardContainer);
          const derivedTopic = forcedTopicName || getTopicForElement(cardContainer);
          scrapeCard(cardContainer, derivedTopic);
        }

        // 6. Universal scan across entire page DOM & HTML for any remaining Drive files
        const allAnchors = Array.from(document.querySelectorAll(
          'a[href*="drive.google.com"], a[href*="docs.google.com"], a[href*="drive.usercontent.google.com"], a[href*="/file/d/"], a[href*="/file/u/"], a[href*="/d/"]'
        ));
        for (const a of allAnchors) {
          const href = a.getAttribute('href') || a.getAttribute('data-url') || '';
          const fId = extractDriveId(href) || extractDriveId(a.getAttribute('data-url')) || a.getAttribute('data-drive-id');
          if (fId && !seenFileIds.has(fId)) {
            seenFileIds.add(fId);
            const rawTitle = a.querySelector('[class*="title" i], [id*="title" i]')?.textContent || a.textContent || a.getAttribute('aria-label') || '';
            const aTitle = cleanAttachmentTitle(rawTitle, undefined, fId);

            // Reconcile directly with parent card if present instead of creating dummy material
            let parentCard = a.closest ? (a.closest('li[role="listitem"], [role="listitem"], div[data-item-id]') as HTMLElement) : null;
            if (!parentCard) parentCard = getCardContainer(a);

            let attachedToExisting = false;
            if (parentCard && !isTopicHeaderContainer(parentCard)) {
              const cardLink = parentCard.querySelector('a[href*="/m/"], a[href*="/a/"]')?.getAttribute('href') || '';
              const cardMatch = cardLink.match(/\/(?:m|a)\/([a-zA-Z0-9_-]+)/);
              const cardId = cardMatch?.[1] || parentCard.getAttribute('data-item-id');
              const heading = cleanText(parentCard.querySelector('h3, [role="heading"][aria-level="3"]')?.textContent || '');

              const targetMat = materials.find(m => {
                if (cardId && (m.id === cardId || m.id === `mat_${cardId}` || (m.alternateLink && m.alternateLink.includes(cardId)))) return true;
                if (heading && m.title.trim().toLowerCase() === heading.toLowerCase()) return true;
                return false;
              });

              if (targetMat) {
                targetMat.attachments = targetMat.attachments || [];
                targetMat.attachments.push({
                  title: aTitle,
                  fileId: fId,
                  id: fId,
                  alternateLink: href || `https://drive.google.com/file/d/${fId}/view`,
                  downloadUrl: `https://drive.google.com/uc?id=${fId}&export=download`
                });
                attachedToExisting = true;
              }
            }

            if (!attachedToExisting) {
              materials.push({
                id: `classwork_dom_${fId}`,
                title: aTitle,
                alternateLink: href,
                attachments: [{
                  title: aTitle,
                  fileId: fId,
                  id: fId,
                  alternateLink: href,
                  downloadUrl: `https://drive.google.com/uc?id=${fId}&export=download`
                }]
              });
            }
          }
        }

        try {
          const fullHtml = document.documentElement.innerHTML;
          const patterns = [
            /(?:drive\.google\.com|docs\.google\.com|drive\.usercontent\.google\.com)(?:[^\s"'<>]*(?:id=|(?:\/|\\\/)d(?:\/|\\\/)))([a-zA-Z0-9_-]{20,})/g,
            /(?:(?:driveFile|fileId|attachmentId)["']:\s*\{["']id["']:\s*["']|data-(?:drive-id|file-id)=["'])([a-zA-Z0-9_-]{25,})/g,
            /https?:\\\/\\\/drive\.google\.com\\\/file\\\/d\\\/([a-zA-Z0-9_-]{20,})/g
          ];
          for (const pat of patterns) {
            for (const fm of fullHtml.matchAll(pat)) {
              const fId = fm[1];
              if (!seenFileIds.has(fId) && !['folders', 'drive', 'document', 'spreadsheets', 'presentation', 'edit', 'view', 'preview', 'thumbnail', 'home', 'export', 'download'].includes(fId)) {
                seenFileIds.add(fId);
                const safeTitle = cleanAttachmentTitle('', 'Attachment', fId);
                materials.push({
                  id: `classwork_regex_${fId}`,
                  title: `Classwork Attachment (${fId.substring(0, 8)})`,
                  alternateLink: `https://drive.google.com/file/d/${fId}/view`,
                  attachments: [{
                    title: safeTitle,
                    fileId: fId,
                    id: fId,
                    alternateLink: `https://drive.google.com/file/d/${fId}/view`,
                    downloadUrl: `https://drive.google.com/uc?id=${fId}&export=download`
                  }]
                });
              }
            }
          }
        } catch (e) {}

        // Fallback deep-fetch for materials with 0 attachments (targeted to active topic view, max 6 items)
        const isClassroomOrigin = typeof location !== 'undefined' && typeof location.hostname === 'string' && location.hostname.includes('classroom.google.com');
        const materialsNeedingFallback = (forcedTopicName && isClassroomOrigin) ? materials.filter(m =>
          (!m.attachments || m.attachments.length === 0) &&
          m.alternateLink &&
          (m.alternateLink.includes('/m/') || m.alternateLink.includes('/c/'))
        ).slice(0, 6) : [];

        if (materialsNeedingFallback.length > 0) {
          const batchSize = 5;
          for (let i = 0; i < materialsNeedingFallback.length; i += batchSize) {
            const batch = materialsNeedingFallback.slice(i, i + batchSize);
            await Promise.all(batch.map(async (mat) => {
              try {
                const ctrl = new AbortController();
                const tid = setTimeout(() => ctrl.abort(), 4000);
                const resp = await fetch(mat.alternateLink, {
                  credentials: 'include',
                  headers: { 'Accept': 'text/html,application/xhtml+xml' },
                  signal: ctrl.signal
                }).finally(() => clearTimeout(tid));

                if (resp.ok) {
                  const html = await resp.text();
                  const drivePat = /(?:drive\.google\.com|docs\.google\.com|drive\.usercontent\.google\.com)(?:[^\s"'<>]*(?:id=|(?:\/|\\\/)d(?:\/|\\\/)))([a-zA-Z0-9_-]{20,})/g;
                  for (const dm of html.matchAll(drivePat)) {
                    const fId = dm[1];
                    if (!seenFileIds.has(fId) && !['folders', 'drive', 'document', 'spreadsheets', 'presentation', 'edit', 'view', 'preview', 'thumbnail', 'home', 'export', 'download'].includes(fId)) {
                      seenFileIds.add(fId);
                      const safeTitle = cleanAttachmentTitle('', mat.title, fId);
                      mat.attachments = mat.attachments || [];
                      mat.attachments.push({
                        title: safeTitle,
                        fileId: fId,
                        id: fId,
                        alternateLink: `https://drive.google.com/file/d/${fId}/view`,
                        downloadUrl: `https://drive.google.com/uc?id=${fId}&export=download`
                      });
                    }
                  }
                }
              } catch (fbErr) {}
            }));
          }
        }

        // Calculate item counts for discovered topics
        if (!forcedTopicName) {
          for (const tl of topicLinks) {
            tl.itemCount = materials.filter(m => (m.topic || '').toLowerCase() === tl.name.toLowerCase()).length;
          }
        }

        return {
          materials,
          courseWork,
          attachmentsCount: seenFileIds.size,
          topicLinks
        };
      };

      // 4. Inject Classwork extraction script into target overview tab (/t/all)
      const injection = await chrome.scripting.executeScript({
        target: { tabId: targetTabId },
        args: [userPrefix, courseId],
        func: extractClassworkInTab
      });

      if (injection && injection[0]?.result) {
        const overviewRes = injection[0].result as {
          materials: any[];
          courseWork: any[];
          attachmentsCount: number;
          topicLinks?: { id: string; name: string; url: string; hasViewAll: boolean; itemCount: number }[];
        };

        const masterMaterials = [...(overviewRes.materials || [])];
        const masterCourseWork = [...(overviewRes.courseWork || [])];
        const masterSeenFileIds = new Set<string>();

        for (const m of masterMaterials) {
          for (const a of (m.attachments || [])) {
            if (a.fileId) masterSeenFileIds.add(a.fileId);
          }
        }
        for (const cw of masterCourseWork) {
          for (const a of (cw.attachments || [])) {
            if (a.fileId) masterSeenFileIds.add(a.fileId);
          }
        }

        // 5. Check if any topics are truncated or require dedicated topic page scraping
        const topicLinks = overviewRes.topicLinks || [];
        const topicsToScrape = topicLinks.filter(t => t.hasViewAll || t.itemCount >= 6 || t.itemCount === 0);

        if (topicsToScrape.length > 0 && chrome.tabs?.update) {
          await WhatsAppDiagnosticLogger.log(
            'INFO',
            'EXTRACT',
            `📂 [CLASSWORK_TOPICS_DISCOVERED] Course "${courseName || courseId}": Found ${topicLinks.length} topic(s). Deep-scanning ${topicsToScrape.length} truncated topic(s): ${topicsToScrape.map(t => t.name).join(', ')}`
          ).catch(() => {});

          for (const topic of topicsToScrape) {
            try {
              if (chrome.runtime?.getPlatformInfo) {
                chrome.runtime.getPlatformInfo().catch(() => {});
              }
              await WhatsAppDiagnosticLogger.log(
                'INFO',
                'EXTRACT',
                `🔍 [CLASSWORK_TOPIC_START] Navigating to dedicated topic "${topic.name}": ${topic.url}`
              ).catch(() => {});

              await chrome.tabs.update(targetTabId, { url: topic.url, active: true });
              await new Promise<void>((resolve) => {
                let done = false;
                const finish = () => {
                  if (!done) {
                    done = true;
                    try { chrome.tabs.onUpdated.removeListener(listener); } catch (e) {}
                    resolve();
                  }
                };
                const listener = (tid: number, changeInfo: chrome.tabs.TabChangeInfo) => {
                  if (tid === targetTabId && changeInfo.status === 'complete') {
                    finish();
                  }
                };
                if (chrome.tabs?.onUpdated) {
                  chrome.tabs.onUpdated.addListener(listener);
                }
                setTimeout(finish, 6000);
              });

              // Allow Classroom client-side SPA to render DOM elements
              await new Promise(r => setTimeout(r, 2000));

              const topicInjection = await chrome.scripting.executeScript({
                target: { tabId: targetTabId },
                args: [userPrefix, courseId, topic.name],
                func: extractClassworkInTab
              });

              if (topicInjection && topicInjection[0]?.result) {
                const tRes = topicInjection[0].result as { materials: any[]; courseWork: any[]; attachmentsCount: number };
                let newNotes = 0;
                let newAtts = 0;

                for (const item of (tRes.materials || [])) {
                  const normId = ClassroomBrowserExtractor.normalizeClassroomId(item.id);
                  const existing = masterMaterials.find(m => {
                    const mNormId = ClassroomBrowserExtractor.normalizeClassroomId(m.id);
                    if (mNormId && normId && mNormId === normId) return true;
                    if (m.alternateLink && item.alternateLink && m.alternateLink === item.alternateLink) return true;
                    if (m.title && item.title && m.title.trim().toLowerCase() === item.title.trim().toLowerCase() &&
                        (m.topic || '').trim().toLowerCase() === (item.topic || topic.name).trim().toLowerCase()) {
                      return true;
                    }
                    return false;
                  });

                  if (existing) {
                    if (normId && !normId.startsWith('cw_') && existing.id.startsWith('cw_')) {
                      existing.id = normId;
                    }
                    if (item.alternateLink && !existing.alternateLink) {
                      existing.alternateLink = item.alternateLink;
                    }
                    const curAtts = existing.attachments || [];
                    const curIds = new Set(curAtts.map((a: any) => a.fileId || a.id));
                    for (const att of (item.attachments || [])) {
                      if (att.fileId && !curIds.has(att.fileId)) {
                        curIds.add(att.fileId);
                        curAtts.push(att);
                        if (!masterSeenFileIds.has(att.fileId)) {
                          masterSeenFileIds.add(att.fileId);
                          newAtts++;
                        }
                      }
                    }
                    existing.attachments = curAtts;
                  } else {
                    masterMaterials.push(item);
                    newNotes++;
                    for (const att of (item.attachments || [])) {
                      if (att.fileId && !masterSeenFileIds.has(att.fileId)) {
                        masterSeenFileIds.add(att.fileId);
                        newAtts++;
                      }
                    }
                  }
                }

                for (const cw of (tRes.courseWork || [])) {
                  const normCwId = ClassroomBrowserExtractor.normalizeClassroomId(cw.id);
                  const existingCw = masterCourseWork.find(c => {
                    const cNormId = ClassroomBrowserExtractor.normalizeClassroomId(c.id);
                    if (cNormId && normCwId && cNormId === normCwId) return true;
                    if (c.alternateLink && cw.alternateLink && c.alternateLink === cw.alternateLink) return true;
                    if (c.title && cw.title && c.title.trim().toLowerCase() === cw.title.trim().toLowerCase()) return true;
                    return false;
                  });

                  if (existingCw) {
                    const curAtts = existingCw.attachments || [];
                    const curIds = new Set(curAtts.map((a: any) => a.fileId || a.id));
                    for (const att of (cw.attachments || [])) {
                      if (att.fileId && !curIds.has(att.fileId)) {
                        curIds.add(att.fileId);
                        curAtts.push(att);
                        if (!masterSeenFileIds.has(att.fileId)) {
                          masterSeenFileIds.add(att.fileId);
                          newAtts++;
                        }
                      }
                    }
                    existingCw.attachments = curAtts;
                  } else {
                    masterCourseWork.push(cw);
                    for (const att of (cw.attachments || [])) {
                      if (att.fileId && !masterSeenFileIds.has(att.fileId)) {
                        masterSeenFileIds.add(att.fileId);
                        newAtts++;
                      }
                    }
                  }
                }

                await WhatsAppDiagnosticLogger.log(
                  'INFO',
                  'EXTRACT',
                  `📥 [CLASSWORK_TOPIC_DONE] Topic "${topic.name}": Added ${newNotes} new note(s), ${newAtts} new attachment(s). (Current total: ${masterMaterials.length} materials, ${masterSeenFileIds.size} unique attachments)`
                ).catch(() => {});
              }
            } catch (tErr: any) {
              console.warn(`[ClassroomBrowserExtractor] Error extracting dedicated topic "${topic.name}":`, tErr);
              await WhatsAppDiagnosticLogger.log('WARN', 'EXTRACT', `⚠️ Topic extraction warning for "${topic.name}": ${tErr?.message || tErr}`).catch(() => {});
            }
          }

          // Restore tab back to /t/all if using an existing student tab
          if (!createdTab && targetTabId && chrome.tabs?.update) {
            try {
              await chrome.tabs.update(targetTabId, { url: classworkUrl });
            } catch (e) {}
          }
        }

        const finalResult = {
          materials: masterMaterials,
          courseWork: masterCourseWork,
          attachmentsCount: masterSeenFileIds.size
        };

        await WhatsAppDiagnosticLogger.log(
          'SUCCESS',
          'EXTRACT',
          `📥 [CLASSWORK_EXTRACT_DONE] Course "${courseName || courseId}": Extracted ${finalResult.materials.length} material(s), ${finalResult.courseWork.length} assignment(s), and ${finalResult.attachmentsCount} attachment(s) from Classwork tab!`
        ).catch(() => {});
        return finalResult;
      }
      return null;
    } catch (err: any) {
      console.warn(`[ClassroomBrowserExtractor] scrapeCourseClassworkTab error:`, err);
      await WhatsAppDiagnosticLogger.log('WARN', 'EXTRACT', `⚠️ Classwork tab extraction warning for ${courseName || courseId}: ${err?.message || err}`).catch(() => {});
      return null;
    } finally {
      if (createdTab && targetTabId && chrome.tabs?.remove) {
        try {
          await chrome.tabs.remove(targetTabId);
        } catch (rErr) {}
      }
    }
  }

  /**
   * Run extraction from the browser session
   */
  public static async extractClassroomData(
    profile: ChildProfile,
    options: {
      mode: 'ONE_TIME_FULL' | 'INCREMENTAL' | 'RESUME_DOWNLOADS';
      onProgress?: (progress: ClassroomExtractionProgress) => void;
    }
  ): Promise<{
    success: boolean;
    coursesCount: number;
    announcementsCount: number;
    totalAttachments: number;
    savedAttachments: number;
    error?: string;
  }> {
    if (this.isExtracting) {
      throw new Error('Classroom extraction is already in progress.');
    }

    this.isExtracting = true;
    const reportProgress = (p: ClassroomExtractionProgress) => {
      if (options.onProgress) {
        options.onProgress(p);
      }
      if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
        chrome.runtime.sendMessage({
          type: 'BROWSER_CLASSROOM_SYNC_PROGRESS',
          payload: { childId: profile.id, ...p }
        }).catch(() => {});
      }
    };
    let keepAliveInterval: any = null;

    try {
      // Clear any stale interrupted or paused sync flags from previous runs
      if (typeof chrome !== 'undefined' && chrome.storage?.local) {
        await chrome.storage.local.set({
          step2_sync_status: 'IN_PROGRESS',
          step2_initial_sync_in_progress: true,
          step2_initial_sync_complete: false,
          step2_sync_heartbeat: Date.now(),
          step2_sync_active_child_id: profile.id,
          step2_sync_active_child_name: profile.name,
          step2_sync_error: null,
          classroom_attachment_progress: {
            total: 0,
            downloaded: 0,
            skipped: 0,
            failed: 0,
            ocrIndexed: 0,
            phase: 'starting',
            interrupted: false
          }
        }).catch(() => {});
      }

      // Early Profile Tagging: Ensure profile is marked as BROWSER_EXTENSION immediately
      await ChildManager.updateProfile(profile.id, {
        syncMethod: 'BROWSER_EXTENSION',
        schoolGasDeploymentUrl: 'browser_extension'
      }).catch(() => {});

      // MV3 Keep-Alive Supervisor: prevent Chrome from terminating service worker during in-tab scraping
      if (typeof chrome !== 'undefined') {
        try {
          if (chrome.alarms?.create) {
            chrome.alarms.create('KEEP_ALIVE_CLASSROOM_BROWSER_SUPERVISOR', { periodInMinutes: 1 });
          }
          keepAliveInterval = setInterval(() => {
            if (chrome.runtime?.getPlatformInfo) {
              chrome.runtime.getPlatformInfo().catch(() => {});
            }
          }, 10000);
        } catch (hbErr) {}
      }

      reportProgress({
        phase: 'CONNECTING',
        message: 'Checking Google Classroom session in browser...',
        percent: 5
      });

      // 1. Check parent vault token
      const parentToken = await PersonalDriveService.getValidToken(false);
      if (!parentToken) {
        throw new Error('Parent Google Drive token is missing or expired. Please sign in to Step 1.');
      }

      // Fast-path: If RESUME_DOWNLOADS requested or classroom_data.json already exists in Parent Vault with attachments
      if (options.mode === 'RESUME_DOWNLOADS') {
        const classFolder = await PersonalDriveService.getOrCreateClassroomFolder(parentToken, profile.name, profile.academicYear);
        const vaultData = await PersonalDriveService.readJsonFileInFolder(parentToken, classFolder.id, 'classroom_data.json').catch(() => null);
        if (vaultData && vaultData.courses && vaultData.courses.length > 0) {
          await WhatsAppDiagnosticLogger.log('INFO', 'EXTRACT', `⚡ [FAST_RESUME] Found existing classroom_data.json with ${vaultData.courses.length} course(s) in Parent Vault. Resuming attachment download pipeline immediately...`).catch(() => {});
          reportProgress({
            phase: 'SAVING_TO_VAULT',
            message: `Resuming attachment downloads directly from Parent Vault...`,
            percent: 50
          });

          const syncData: any = { classroom: vaultData };
          const saveStats = await PersonalDriveService.saveExtractedSchoolData(
            parentToken,
            profile.name,
            profile.academicYear,
            syncData
          );

          const downloaded = Number.isFinite(saveStats.totalDownloaded) ? saveStats.totalDownloaded : 0;
          const skipped = Number.isFinite(saveStats.totalSkipped) ? saveStats.totalSkipped : 0;
          const failed = Number.isFinite(saveStats.totalFailed) ? saveStats.totalFailed : 0;

          await ChildManager.updateProfile(profile.id, {
            syncMethod: 'BROWSER_EXTENSION',
            schoolGasDeploymentUrl: 'browser_extension',
            lastSchoolSync: new Date().toISOString(),
            initialSyncStatus: 'COMPLETED',
            initialSyncCompletedAt: Date.now(),
            initialSyncError: undefined,
            initialSyncProgress: {
              downloaded,
              skipped,
              failed,
              total: downloaded + skipped + failed,
              phase: 'complete'
            }
          });

          if (typeof chrome !== 'undefined' && chrome.storage?.local) {
            await chrome.storage.local.set({
              step2_sync_status: 'COMPLETED',
              step2_initial_sync_in_progress: false,
              step2_initial_sync_complete: true,
              step2_sync_heartbeat: null,
              step2_sync_error: null,
              step2_initial_sync_summary: {
                courses: vaultData.courses.length,
                attachments: downloaded + skipped,
                ocrIndexed: 0
              },
              classroom_attachment_progress: {
                downloaded,
                skipped,
                failed,
                total: downloaded + skipped + failed,
                phase: 'complete',
                interrupted: false
              }
            }).catch(() => {});
          }

          reportProgress({
            phase: 'COMPLETED',
            message: `Successfully completed attachment downloads for ${profile.name}!`,
            percent: 100,
            coursesFound: vaultData.courses.length,
            attachmentsSaved: downloaded,
            totalAttachments: downloaded + skipped
          });

          return {
            success: true,
            coursesCount: vaultData.courses.length,
            announcementsCount: 0,
            totalAttachments: downloaded + skipped,
            savedAttachments: downloaded
          };
        }
      }

      // 2. Locate or open Classroom tab
      let tab = await this.findClassroomTab();
      if (!tab) {
        reportProgress({
          phase: 'CONNECTING',
          message: 'Opening Google Classroom tab in browser...',
          percent: 8
        });
        await WhatsAppDiagnosticLogger.log('WARN', 'EXTRACT', '⚠️ No open Google Classroom tab found. Creating new background tab to classroom.google.com...').catch(() => {});
        tab = await this.openClassroomTabIfNeeded();
        if (tab && tab.id) {
          await new Promise(r => setTimeout(r, 2500));
          tab = await this.findClassroomTab();
        }
      }

      await WhatsAppDiagnosticLogger.log('INFO', 'EXTRACT', `🔍 Selected Classroom tab #${tab?.id || 'NONE'}: ${tab?.url || 'NONE'}`).catch(() => {});

      const userPrefix = this.extractUserPrefix(tab?.url);

      // 3. Discover classroom courses via resilient DOM inspection
      reportProgress({
        phase: 'DISCOVERING_COURSES',
        message: 'Scanning enrolled classroom courses in browser...',
        percent: 15
      });

      let extractedCourses: ExtractedCourse[] = [];

      if (tab && tab.id && typeof chrome !== 'undefined' && chrome.scripting?.executeScript) {
        try {
          await WhatsAppDiagnosticLogger.log('INFO', 'EXTRACT', `💉 Injecting in-tab crawler into tab #${tab.id} (prefix: "${userPrefix}")...`).catch(() => {});
          const injectionResults = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            args: [userPrefix],
            func: async (detectedPrefix: string) => {
              const courses: any[] = [];
              const seenIds = new Set<string>();
              const pageSeenFids = new Set<string>();

              const logDirect = async (msg: string) => {
                try {
                  const now = Date.now();
                  const data = await chrome.storage.local.get(['whatsapp_diagnostic_logs']);
                  const logs = data['whatsapp_diagnostic_logs'] || [];
                  logs.unshift({
                    timestamp: new Date(now).toLocaleTimeString(),
                    rawTimestamp: now,
                    level: 'INFO',
                    category: 'SCAN',
                    message: msg
                  });
                  if (logs.length > 500) logs.length = 500;
                  await chrome.storage.local.set({ whatsapp_diagnostic_logs: logs });
                } catch (e) {}
              };

              const cleanText = (t: string) => (t || '').replace(/\r?\n/g, ' ').replace(/\s+/g, ' ').trim();
              const cleanAttachmentTitle = (raw: string, noteTitle?: string, fileId?: string): string => {
                let t = cleanText(raw);
                t = t.replace(/^Attachment:\s*/i, '');
                t = t.replace(/(\.[a-zA-Z0-9]{2,5})[\s_]*(?:PDF|Video|Image|Word|PowerPoint|Excel|Document|Audio)+$/i, '$1');
                t = t.replace(/[\s_]+(?:PDF|Video|Image|Word|PowerPoint|Excel|Document|Audio)+$/i, '');
                t = t.replace(/(?<!\.)(?:PDF|Video|Image|Word|PowerPoint|Excel|Document|Audio)+$/i, '');
                t = t.trim();

                const isInvalid = !t || /^[().\s_-]+(\.[a-zA-Z0-9]+)?$/i.test(t) || t.replace(/\.[a-zA-Z0-9]+$/i, '').trim() === '';
                if (isInvalid) {
                  let cleanNote = (noteTitle || '').replace(/[\\/:*?"<>|]/g, '_').replace(/^[().\s_-]+$/g, '').trim().substring(0, 30);
                  if (/^(?:item\s+\d+|collapse\s+topic|view\s+material|view\s+assignment|coursework\s+[a-z0-9_-]+)$/i.test(cleanNote)) {
                    cleanNote = '';
                  }
                  const prefix = cleanNote || 'Classroom_Doc';
                  const idPart = (fileId || '').substring(0, 6) || Math.random().toString(36).substring(2, 8);
                  return `${prefix}_${idPart}.pdf`;
                }
                return t;
              };
              const extractDriveId = (urlOrHref: string | null | undefined): string | null => {
                if (!urlOrHref || typeof urlOrHref !== 'string') return null;
                const pathMatch = urlOrHref.match(/(?:file|document|presentation|spreadsheets|forms)(?:\/u\/\d+)?\/d\/([a-zA-Z0-9_-]{20,})/i);
                if (pathMatch && pathMatch[1]) return pathMatch[1];
                const queryMatch = urlOrHref.match(/[?&]id=([a-zA-Z0-9_-]{20,})/i);
                if (queryMatch && queryMatch[1]) return queryMatch[1];
                const genericDMatch = urlOrHref.match(/\/d\/([a-zA-Z0-9_-]{20,})/i);
                if (genericDMatch && genericDMatch[1]) return genericDMatch[1];
                return null;
              };

              // Helper to parse course ID
              const getCourseId = (href: string): string => {
                if (!href) return '';
                const cMatch = href.match(/\/c\/([a-zA-Z0-9_-]+)/);
                if (cMatch && cMatch[1] && !['u', 'h', 'calendar', 'settings', 'archive', 'user'].includes(cMatch[1])) {
                  return cMatch[1];
                }
                const rMatch = href.match(/\/r\/([a-zA-Z0-9_-]+)/);
                if (rMatch && rMatch[1] && !['u', 'h'].includes(rMatch[1])) {
                  return rMatch[1];
                }
                return '';
              };

              // Scan all course links in DOM (cards, sidebar drawer, course list)
              const candidateLinks = Array.from(document.querySelectorAll('a[href*="/c/"], a[href*="/r/"]'));
              for (const a of candidateLinks) {
                const href = a.getAttribute('href') || '';
                const courseId = getCourseId(href);
                if (!courseId || seenIds.has(courseId)) continue;

                // Locate container/card
                const card = a.closest('[data-course-id], li, [role="listitem"], [role="article"], div[class*="Card"], div[class*="card"], div[class*="course"]') || a.parentElement;

                // Extract course title
                let title = '';
                const headingEl = card?.querySelector('h2, h3, [aria-level="2"], [data-course-id]') || a.querySelector('h2, h3, div');
                if (headingEl && headingEl.textContent?.trim()) {
                  title = cleanText(headingEl.textContent);
                } else if (a.textContent?.trim()) {
                  title = cleanText(a.textContent);
                } else if (a.getAttribute('aria-label')) {
                  title = cleanText(a.getAttribute('aria-label') || '');
                }

                if (title.toLowerCase().includes('google apps') || title.toLowerCase().includes('classroom menu')) {
                  continue;
                }

                // Extract section/subtitle and teacher if present on card
                let section: string | undefined;
                if (card) {
                  const textNodes = Array.from(card.querySelectorAll('div, span, p'))
                    .map(el => cleanText(el.textContent || ''))
                    .filter(t => t.length > 0 && t !== title && !t.includes('http') && t.length < 80);
                  if (textNodes.length > 0) {
                    section = textNodes[0];
                  }
                }

                seenIds.add(courseId);
                courses.push({
                  id: courseId,
                  name: title || `Course ${courseId.substring(0, 6)}`,
                  section: section,
                  alternateLink: href.startsWith('http') ? href : `https://classroom.google.com${href}`,
                  courseWork: [],
                  announcements: [],
                  materials: []
                });
              }

              // Also check if current page is inside a single course (e.g. /c/<courseId>)
              const currentPathMatch = window.location.pathname.match(/\/c\/([a-zA-Z0-9_-]+)/);
              if (currentPathMatch && currentPathMatch[1] && !seenIds.has(currentPathMatch[1])) {
                const cId = currentPathMatch[1];
                const pageHeading = document.querySelector('h1, [aria-level="1"]')?.textContent || document.title.replace(/- Google Classroom.*/, '');
                seenIds.add(cId);
                courses.push({
                  id: cId,
                  name: cleanText(pageHeading) || `Course ${cId.substring(0, 6)}`,
                  alternateLink: window.location.href,
                  courseWork: [],
                  announcements: [],
                  materials: []
                });
              }

              // 1. Deep Smart-scrolling engine for Stream feed: scrolls until the TRUE END of the feed is reached
              const performSmartScroll = async (): Promise<number> => {
                const getItemCount = () => {
                  return document.querySelectorAll(
                    'div[data-stream-item-id], div[data-announcement-id], div[role="article"], div[data-item-id], li[role="listitem"], div[class*="Post"], div[class*="Card"], div[class*="StreamItem"]'
                  ).length;
                };

                // Discover all scrollable containers in Google Classroom
                const getScrollContainers = (): HTMLElement[] => {
                  const containers: HTMLElement[] = [];
                  if (document.scrollingElement) containers.push(document.scrollingElement as HTMLElement);
                  if (document.documentElement) containers.push(document.documentElement);
                  if (document.body) containers.push(document.body);
                  
                  const candidates = document.querySelectorAll('main, [role="main"], c-wiz, div');
                  for (const c of Array.from(candidates)) {
                    const el = c as HTMLElement;
                    if (el.scrollHeight > el.clientHeight + 50) {
                      const style = window.getComputedStyle(el);
                      if (style.overflowY === 'auto' || style.overflowY === 'scroll' || style.overflow === 'auto' || style.overflow === 'scroll') {
                        containers.push(el);
                      }
                    }
                  }
                  return Array.from(new Set(containers));
                };

                const initialCount = getItemCount();
                await logDirect(`📜 [STREAM_SCROLL_START] Initiating Classroom Stream infinite scroll. Scrolling until the true end of the feed is reached. Visible items: ${initialCount}`);

                let lastCount = initialCount;
                let lastScrollHeight = 0;
                let stableCycles = 0;
                let c = 0;
                const safetyLimit = 300; // Safety guard: allows scrolling through hundreds of historical posts

                while (c < safetyLimit) {
                  c++;
                  const scrollContainers = getScrollContainers();

                  // Progressive scroll down in 1200px steps
                  window.scrollBy({ top: 1200, behavior: 'instant' as any });
                  for (const sc of scrollContainers) {
                    sc.scrollTop += 1200;
                    sc.dispatchEvent(new Event('scroll', { bubbles: true }));
                  }

                  // Jump to bottom periodically to trigger any IntersectionObserver sentinels
                  if (c % 2 === 0) {
                    window.scrollTo({ top: document.body.scrollHeight + 10000, behavior: 'instant' as any });
                    for (const sc of scrollContainers) {
                      sc.scrollTop = sc.scrollHeight;
                      sc.dispatchEvent(new Event('scroll', { bubbles: true }));
                    }
                  }

                  // Click any "load older posts" or bottom pagination triggers if present
                  const loadMoreBtns = Array.from(document.querySelectorAll(
                    'button[aria-label*="older" i], div[role="button"][aria-label*="older" i], button[aria-label*="more" i], div[role="button"][aria-label*="more" i]'
                  ));
                  for (const btn of loadMoreBtns) {
                    try { (btn as HTMLElement).click(); } catch(e) {}
                  }

                  // Wait 1400ms for Google Classroom AJAX feed (batchexecute) to fetch and append older items
                  await new Promise(r => setTimeout(r, 1400));

                  const currentCount = getItemCount();
                  const currentScrollHeight = Math.max(
                    document.body.scrollHeight,
                    document.documentElement.scrollHeight,
                    ...scrollContainers.map(s => s.scrollHeight)
                  );

                  if (currentCount > lastCount || currentScrollHeight > lastScrollHeight) {
                    await logDirect(`📜 [STREAM_SCROLL_PROGRESS] Cycle #${c}: Loaded older posts! Count: ${lastCount} ➔ ${currentCount} (feed expanding)...`);
                    lastCount = currentCount;
                    lastScrollHeight = currentScrollHeight;
                    stableCycles = 0;
                  } else {
                    stableCycles++;
                    // Require 8 consecutive checks with 0 change (across 11+ seconds of confirmed idle)
                    // and at least 15 cycles to ensure we never stop early
                    if (stableCycles >= 8 && c >= 15) {
                      await logDirect(`📜 [STREAM_SCROLL_END] Verified true end of stream feed reached! Total announcements loaded: ${currentCount}`);
                      break;
                    }
                  }
                }

                await logDirect(`✅ [STREAM_SCROLL_DONE] Infinite scroll completed after ${c} cycles. Final items count: ${lastCount}`);
                return lastCount;
              };

              // Helper to scrape announcements directly from active tab DOM with per-card expansion
              const scrapeDomAnnouncements = async (): Promise<any[]> => {
                const results: any[] = [];
                const seenText = new Set<string>();

                // Selectors for Classroom stream post cards
                const postCards = Array.from(document.querySelectorAll(
                  'div[data-stream-item-id], div[data-announcement-id], div[role="article"], div[data-item-id], ' +
                  'li[role="listitem"], div[class*="StreamItem"], div[class*="announcement"], div[class*="Post"], div[class*="Card"]'
                ));

                const containers = postCards.length > 0 ? postCards : Array.from(document.querySelectorAll('div'));

                for (let i = 0; i < containers.length; i++) {
                  const container = containers[i] as HTMLElement;

                  // 1. Scroll container into view so virtual renderer populates it
                  try {
                    container.scrollIntoView({ behavior: 'instant' as any, block: 'center' });
                    await new Promise(r => setTimeout(r, 60));
                  } catch (e) {}

                  // 2. Expand card text if collapsed ("Read more", "Show more")
                  const readMoreBtns = Array.from(container.querySelectorAll(
                    '[aria-expanded="false"], [aria-label*="Expand" i], [aria-label*="Show more" i], [aria-label*="Read more" i], button[class*="expand" i], div[role="button"][class*="expand" i]'
                  ));
                  for (const b of readMoreBtns) {
                    try {
                      if (b.tagName === 'A' || b.closest('a') || b.hasAttribute('href') || b.hasAttribute('data-drive-id')) continue;
                      const label = (b.getAttribute('aria-label') || b.textContent || '').toLowerCase();
                      if (!label.includes('menu') && !label.includes('account') && !label.includes('google apps') && !label.startsWith('attachment:')) {
                        (b as HTMLElement).click();
                      }
                    } catch (e) {}
                  }

                  // 3. Expand multi-attachment overflow buttons (+N more, +3, +5, +10 attachments!)
                  // STRICT GUARD: NEVER click attachment file links (a tags, href, data-drive-id, or Attachment: labels)
                  const moreAttBtns = Array.from(container.querySelectorAll(
                    'button[aria-label*="more" i], div[role="button"][aria-label*="more" i], [class*="more" i], [class*="overflow" i]'
                  ));
                  for (const mb of moreAttBtns) {
                    try {
                      if (mb.tagName === 'A' || mb.closest('a') || mb.hasAttribute('href') || mb.hasAttribute('data-drive-id')) continue;
                      const ariaLabel = (mb.getAttribute('aria-label') || '').toLowerCase();
                      if (ariaLabel.startsWith('attachment:') || ariaLabel.includes('google drive') || ariaLabel.includes('video')) continue;
                      const txt = (mb.textContent || ariaLabel).trim();
                      if (/\+\d+/i.test(txt) || /\b\d+\s+more\b/i.test(txt) || /\bshow\s+more\b/i.test(txt)) {
                        (mb as HTMLElement).click();
                      }
                    } catch (e) {}
                  }
                  if (readMoreBtns.length > 0 || moreAttBtns.length > 0) {
                    await new Promise(r => setTimeout(r, 250));
                  }

                  // 3b. If clicking +N more opened a modal dialog at document.body level, scrape it
                  // Google Classroom Wiz renders overflow attachment lists in a modal overlay
                  // outside the container element, directly on document.body.
                  const overflowModal = document.querySelector('div[role="dialog"][aria-modal="true"], div[role="dialog"], div[class*="modal" i][style*="display"]');
                  if (overflowModal) {
                    // Give the modal a moment to populate its attachment links
                    await new Promise(r => setTimeout(r, 200));
                    // Mark container as having modal-expanded attachments so we include them
                    const modalAttLinks = Array.from(overflowModal.querySelectorAll(
                      'a[href*="drive.google.com"], a[href*="docs.google.com"], a[href*="drive.usercontent.google.com"], a[href*="/file/d/"], a[href*="/file/u/"], a[href*="/d/"], a[download], [data-drive-id], [data-url*="drive.google.com"], div[role="link"]'
                    ));
                    // We'll collect these modal links and process them below in step 4
                    for (const ma of modalAttLinks) {
                      // Temporarily append a marker so we can find them below
                      try { ma.setAttribute('data-modal-scraped', 'true'); } catch(e) {}
                    }
                    // Close the modal to restore viewport for the next card
                    const closeBtn = overflowModal.querySelector('button[aria-label*="close" i], button[aria-label*="dismiss" i], button[aria-label*="Cancel" i], [data-mdc-dialog-action="close"]') as HTMLElement;
                    if (closeBtn) {
                      try { closeBtn.click(); } catch(e) {}
                      await new Promise(r => setTimeout(r, 150));
                    }
                  }

                  // 4. Extract attachments inside this container AND from any modal overflow (handles 1, 5, 10, or 20 attachments per post)
                  const attachmentsMap = new Map<string, any>();
                  const containerAttLinks = Array.from(container.querySelectorAll(
                    'a[href*="drive.google.com"], a[href*="docs.google.com"], a[href*="drive.usercontent.google.com"], a[href*="/file/d/"], a[href*="youtube.com"], a[href*="youtu.be"], a[download], [data-drive-id], [data-url*="drive.google.com"], div[role="button"][aria-label*="attachment" i], div[role="link"]'
                  ));
                  // Also include any links from the overflow modal that we marked in step 3b
                  const modalAttLinks = Array.from(document.querySelectorAll('[data-modal-scraped="true"]'));
                  // Clean up the marker attribute
                  for (const ma of modalAttLinks) {
                    try { ma.removeAttribute('data-modal-scraped'); } catch(e) {}
                  }
                  const attLinks = [...containerAttLinks, ...modalAttLinks];
                  for (const a of attLinks) {
                    const href = a.getAttribute('href') || a.getAttribute('data-url') || '';
                    const dataDriveId = a.getAttribute('data-drive-id');
                    const fId = extractDriveId(href) || extractDriveId(a.getAttribute('data-url')) || dataDriveId || undefined;
                    const cardTitle = cleanText(container.querySelector('h3, [role="heading"], div[class*="title" i]')?.textContent || '');
                    const attTitle = cleanAttachmentTitle(a.textContent || a.getAttribute('aria-label') || '', cardTitle, fId);
                    const attKey = fId || href;
                    if (!attKey) continue;

                    const existing = attachmentsMap.get(attKey);
                    if (existing) {
                      const isPlaceholder = !existing.title ||
                        ['attachment', 'thumbnail', 'file', 'preview'].includes(existing.title.toLowerCase().trim()) ||
                        (attTitle && attTitle.length > existing.title.length && !['attachment', 'thumbnail'].includes(attTitle.toLowerCase().trim()));
                      if (isPlaceholder && attTitle) {
                        existing.title = attTitle;
                      }
                    } else {
                      attachmentsMap.set(attKey, {
                        title: attTitle || 'Attachment',
                        fileId: fId,
                        id: fId,
                        alternateLink: href || (fId ? `https://drive.google.com/file/d/${fId}/view` : ''),
                        downloadUrl: fId ? `https://drive.google.com/uc?id=${fId}&export=download` : href
                      });
                    }
                  }

                  // Also check innerHTML of this post container for Drive IDs
                  try {
                    const cHtml = container.innerHTML;
                    const patterns = [
                      /(?:drive\.google\.com|docs\.google\.com|drive\.usercontent\.google\.com)(?:[^\s"'<>]*(?:id=|(?:\/|\\\/)d(?:\/|\\\/)))([a-zA-Z0-9_-]{20,})/g,
                      /(?:(?:driveFile|fileId|attachmentId)["']:\s*\{["']id["']:\s*["']|data-(?:drive-id|file-id)=["'])([a-zA-Z0-9_-]{25,})/g
                    ];
                    for (const pat of patterns) {
                      for (const cm of cHtml.matchAll(pat)) {
                        const fId = cm[1];
                        if (!attachmentsMap.has(fId) && !['folders', 'drive', 'document', 'spreadsheets', 'presentation', 'edit', 'view', 'preview', 'thumbnail', 'home', 'export', 'download'].includes(fId)) {
                          attachmentsMap.set(fId, {
                            title: `Attachment ${fId.substring(0, 8)}`,
                            fileId: fId,
                            id: fId,
                            alternateLink: `https://drive.google.com/file/d/${fId}/view`,
                            downloadUrl: `https://drive.google.com/uc?id=${fId}&export=download`
                          });
                        }
                      }
                    }
                  } catch (e) {}

                  const attachments = Array.from(attachmentsMap.values());

                  // 5. Check for Coursework, Material, or Post links inside container
                  const cwLinks = Array.from(container.querySelectorAll('a[href*="/a/"], a[href*="/sa/"], a[href*="/m/"], a[href*="/p/"]'));

                  const textBlocks = Array.from(container.querySelectorAll('div[dir="auto"], span[dir="auto"], p, h2, h3, div[class*="Text"], div[class*="text"], div[class*="title"], div[class*="Title"], a'))
                    .map(el => cleanText(el.textContent || ''))
                    .filter(t => t.length > 2 && !t.includes('Woohoo') && !t.includes('New announcement') && !t.includes('Class options') && !t.includes('Google apps') && !t.includes('Classroom menu'));

                  const fullText = textBlocks.join(' - ').trim();
                  // Never skip if container has attachments or coursework links!
                  if (attachments.length === 0 && cwLinks.length === 0 && fullText.length < 5) {
                    continue;
                  }

                  // Extract Author and Date BEFORE dedup so we can use them in the dedup key
                  let author = '';
                  let postDate = '';

                  const authorEl = container.querySelector('h3, [aria-level="3"], span[class*="Author"], div[class*="Author"]') ||
                                   container.querySelector('span, div');
                  if (authorEl) {
                    const aText = cleanText(authorEl.textContent || '');
                    if (aText && aText.length < 70 && !aText.includes('\n')) {
                      author = aText;
                    }
                  }

                  const dateEl = container.querySelector('span[aria-label], time, [class*="date"]');
                  if (dateEl) {
                    postDate = cleanText(dateEl.getAttribute('aria-label') || dateEl.textContent || '');
                  }

                  // Use unique post identifiers for deduplication instead of text truncation.
                  // Priority: data-stream-item-id > data-announcement-id > post permalink > composite key
                  const postPermalink = container.querySelector('a[href*="/p/"]')?.getAttribute('href') || '';
                  const annId = container.getAttribute('data-stream-item-id') ||
                                container.getAttribute('data-announcement-id') ||
                                container.getAttribute('data-item-id') ||
                                postPermalink ||
                                `ann_${author}_${postDate}_${attachments.length}_${results.length}_${i}`;

                  // Dedup by unique ID — NEVER skip a container that has attachments
                  if (seenText.has(annId) && attachments.length === 0) continue;
                  seenText.add(annId);

                  results.push({
                    id: annId,
                    text: fullText,
                    authorName: author || undefined,
                    creationTime: postDate || undefined,
                    attachments: attachments
                  });
                }

                // Fallback: scan all dir="auto" elements for standalone notices
                if (results.length === 0) {
                  const autoDivs = Array.from(document.querySelectorAll('div[dir="auto"]'));
                  for (const ad of autoDivs) {
                    const t = cleanText(ad.textContent || '');
                    if (t.length > 30 && !seenText.has(t.substring(0, 80)) && !t.includes('Classroom')) {
                      seenText.add(t.substring(0, 80));
                      results.push({
                        id: `ann_auto_${Date.now()}_${results.length}`,
                        text: t,
                        attachments: []
                      });
                    }
                  }
                }

                return results;
              };

              // Helper: Expand all collapsed chips, read more buttons, and post items in the live DOM
              const expandInPageItems = async () => {
                const expandables = Array.from(document.querySelectorAll(
                  '[aria-expanded="false"], [aria-label*="Expand" i], [aria-label*="Show more" i], [aria-label*="Read more" i], ' +
                  'button[class*="expand" i], div[role="button"][class*="expand" i]'
                ));
                for (const el of expandables) {
                  try {
                    const label = (el.getAttribute('aria-label') || el.textContent || '').toLowerCase();
                    if (label.includes('menu') || label.includes('navigation') || label.includes('account') || label.includes('google apps')) {
                      continue;
                    }
                    if (!el.closest('a[href]') || el.getAttribute('role') === 'button') {
                      (el as HTMLElement).click();
                    }
                  } catch (e) {}
                }
                await new Promise(r => setTimeout(r, 400));
              };

              // Deep Coursework, Stream Announcements & Material Discovery
              const localPrefixMatch = window.location.pathname.match(/\/u\/(\d+)/);
              const effectivePrefix = detectedPrefix || (localPrefixMatch ? `/u/${localPrefixMatch[1]}` : '');
              const currentCourseId = window.location.pathname.match(/\/c\/([a-zA-Z0-9_-]+)/)?.[1];

              for (const course of courses) {
                // If active tab is currently inside this course, execute fast smart-scroll, expand in-page items, and DOM extraction
                if (currentCourseId && currentCourseId === course.id) {
                  await performSmartScroll();
                  await expandInPageItems();
                  const liveAnnouncements = await scrapeDomAnnouncements();
                  if (liveAnnouncements.length > 0) {
                    course.announcements.push(...liveAnnouncements);
                  }

                  // Universal Live Page Scan: Extract all Google Drive and Docs file attachments embedded anywhere
                  // in the active tab's HTML, scripts, JSON data, and attributes
                  try {
                    const liveHtml = document.documentElement.innerHTML;
                    const patterns = [
                      /(?:drive\.google\.com|docs\.google\.com|drive\.usercontent\.google\.com)(?:[^\s"'<>]*(?:id=|(?:\/|\\\/)d(?:\/|\\\/)))([a-zA-Z0-9_-]{20,})/g,
                      /(?:(?:driveFile|fileId|attachmentId)["']:\s*\{["']id["']:\s*["']|data-(?:drive-id|file-id)=["'])([a-zA-Z0-9_-]{25,})/g,
                      /https?:\\\/\\\/drive\.google\.com\\\/file\\\/d\\\/([a-zA-Z0-9_-]{20,})/g
                    ];

                    for (const pat of patterns) {
                      for (const pdm of liveHtml.matchAll(pat)) {
                        const fId = pdm[1];
                        if (!pageSeenFids.has(fId) && !['folders', 'drive', 'document', 'spreadsheets', 'presentation', 'edit', 'view', 'preview', 'thumbnail', 'home', 'export', 'download'].includes(fId)) {
                          pageSeenFids.add(fId);
                          const inAnn = course.announcements.some((a: any) => a.attachments?.some((at: any) => at.fileId === fId || at.id === fId));
                          const inMat = course.materials.some((m: any) => m.attachments?.some((at: any) => at.fileId === fId || at.id === fId));
                          if (!inAnn && !inMat) {
                            course.materials.push({
                              id: `live_page_mat_${fId}`,
                              title: `Classroom Attachment (${fId.substring(0, 8)})`,
                              alternateLink: `https://drive.google.com/file/d/${fId}/view`,
                              attachments: [{
                                title: `Attachment ${fId.substring(0, 8)}`,
                                fileId: fId,
                                id: fId,
                                alternateLink: `https://drive.google.com/file/d/${fId}/view`,
                                downloadUrl: `https://drive.google.com/uc?id=${fId}&export=download`
                              }]
                            });
                          }
                        }
                      }
                    }
                  } catch (liveScanErr) {}
                }

                // Deep scan announcements, coursework, and materials (/p/<id>, /a/<id>, /sa/<id>, /m/<id>)
                const deepLinksToScan = new Set<string>();

                // 1. Gather all /p/, /a/, /sa/, /m/ links across all elements and anchors in the page
                for (const a of Array.from(document.querySelectorAll('a[href]'))) {
                  const href = a.getAttribute('href') || '';
                  if (href.includes('/p/') || href.includes('/a/') || href.includes('/sa/') || href.includes('/m/')) {
                    deepLinksToScan.add(href);
                  }
                }

                // 2. Also check announcement IDs
                for (const ann of course.announcements) {
                  if (ann.id && !ann.id.startsWith('ann_auto_') && !ann.id.startsWith('ann_')) {
                    deepLinksToScan.add(`${effectivePrefix}/c/${course.id}/p/${ann.id}`);
                  }
                }

                // 3. Scan all direct Drive/Docs links across the entire DOM
                for (const a of Array.from(document.querySelectorAll('a[href*="drive.google.com"], a[href*="docs.google.com"]'))) {
                  const href = a.getAttribute('href') || '';
                  const dm = href.match(/\/(?:file\/d\/|[a-z]+\/d\/|open\?id=)([a-zA-Z0-9_-]{20,})/);
                  if (dm && dm[1]) {
                    const fId = dm[1];
                    if (!pageSeenFids.has(fId)) {
                      pageSeenFids.add(fId);
                      const title = cleanText(a.textContent || a.getAttribute('aria-label') || `Drive File ${fId.substring(0, 8)}`);
                      course.materials.push({
                        id: `dom_mat_${fId}`,
                        title: title,
                        alternateLink: href,
                        attachments: [{
                          title: title,
                          fileId: fId,
                          id: fId,
                          alternateLink: href,
                          downloadUrl: `https://drive.google.com/uc?id=${fId}&export=download`
                        }]
                      });
                    }
                  }
                }

                await logDirect(`🔍 [DEEP_SCAN_START] Discovered ${deepLinksToScan.size} internal post/coursework links. Deep-scanning for hidden attachments...`);

                let scannedItemsCount = 0;
                let deepAttachmentsFound = 0;

                // Quick probe of key post/coursework pages (capped at 5 to prevent stalls)
                for (const relUrl of Array.from(deepLinksToScan).slice(0, 5)) {
                  scannedItemsCount++;
                  try {
                    const pUrl = relUrl.startsWith('http') ? relUrl : `https://classroom.google.com${relUrl}`;
                    const ctrl = new AbortController();
                    const tid = setTimeout(() => ctrl.abort(), 1500);
                    const pRes = await fetch(pUrl, {
                      credentials: 'include',
                      headers: { 'Accept': 'text/html,application/xhtml+xml' },
                      signal: ctrl.signal
                    }).finally(() => clearTimeout(tid));
                    if (pRes.ok) {
                      const pHtml = await pRes.text();
                      const driveRegex = /(?:drive\.google\.com|docs\.google\.com)(?:[^\s"'<>]*(?:id=|(?:\/|\\\/)d(?:\/|\\\/)))([a-zA-Z0-9_-]{20,})/g;
                      for (const dm of pHtml.matchAll(driveRegex)) {
                        const fId = dm[1];
                        if (!pageSeenFids.has(fId) && !['folders', 'drive', 'document', 'spreadsheets', 'presentation', 'edit', 'view'].includes(fId)) {
                          pageSeenFids.add(fId);
                          deepAttachmentsFound++;
                          course.materials.push({
                            id: `deep_mat_${fId}`,
                            title: `Classroom Attachment (${fId.substring(0, 8)})`,
                            alternateLink: `https://drive.google.com/file/d/${fId}/view`,
                            attachments: [{
                              title: `Attachment ${fId.substring(0, 8)}`,
                              fileId: fId,
                              id: fId,
                              alternateLink: `https://drive.google.com/file/d/${fId}/view`,
                              downloadUrl: `https://drive.google.com/uc?id=${fId}&export=download`
                            }]
                          });
                        }
                      }
                    }
                  } catch (pErr) {}
                }

                await logDirect(`📥 [DEEP_SCAN_DONE] Inspected ${scannedItemsCount} post/assignment views. Extracted ${deepAttachmentsFound} new attachment(s)!`);

                // Fetch Stream page for notices & attachments via authenticated background fetch
                try {
                  const streamUrl = `${effectivePrefix}/c/${course.id}`;
                  const streamRes = await fetch(streamUrl, {
                    credentials: 'include',
                    headers: { 'Accept': 'text/html,application/xhtml+xml' }
                  });
                  if (streamRes.ok) {
                    const sHtml = await streamRes.text();
                    // Regex extract any Google Drive attachments referenced in the stream
                    const streamDriveRegex = /(?:https?|https?:\\\/\\\/)?(?:drive|docs)\.google\.com(?:\/|\\\/)(?:(?:file|document|spreadsheets|presentation)(?:\/|\\\/)d(?:\/|\\\/)|open\?(?:amp;)?id=)([a-zA-Z0-9_-]{20,})/g;
                    for (const sdm of sHtml.matchAll(streamDriveRegex)) {
                      const fId = sdm[1];
                      const alreadyInMaterials = course.materials.some((m: any) => m.attachments?.some((a: any) => a.fileId === fId));
                      if (!alreadyInMaterials) {
                        course.materials.push({
                          id: `stream_mat_${fId}`,
                          title: `Stream Attachment (${fId.substring(0, 8)})`,
                          alternateLink: `https://drive.google.com/file/d/${fId}/view`,
                          attachments: [{
                            title: `Drive File ${fId.substring(0, 8)}`,
                            fileId: fId,
                            id: fId,
                            alternateLink: `https://drive.google.com/file/d/${fId}/view`,
                            downloadUrl: `https://drive.google.com/uc?id=${fId}&export=download`
                          }]
                        });
                      }
                    }
                  }
                } catch (sErr) {
                  console.warn(`[ClassroomBrowserExtractor] Stream fetch notice for ${course.id}:`, sErr);
                }

                // Fetch Classwork page for assignments & materials
                try {
                  const classworkUrl = `${effectivePrefix}/c/${course.id}/a`;
                  const res = await fetch(classworkUrl, {
                    credentials: 'include',
                    headers: { 'Accept': 'text/html,application/xhtml+xml' }
                  });

                  if (res.ok) {
                    const html = await res.text();

                    // Extract Google Drive attachments
                    const driveRegex = /(?:https?|https?:\\\/\\\/)?(?:drive|docs)\.google\.com(?:\/|\\\/)(?:(?:file|document|spreadsheets|presentation)(?:\/|\\\/)d(?:\/|\\\/)|open\?(?:amp;)?id=)([a-zA-Z0-9_-]{20,})/g;
                    const driveMatches = html.matchAll(driveRegex);
                    const seenDriveIds = new Set<string>();

                    for (const dm of driveMatches) {
                      const fileId = dm[1];
                      if (!seenDriveIds.has(fileId)) {
                        seenDriveIds.add(fileId);
                        const att = {
                          title: `Drive File ${fileId.substring(0, 8)}`,
                          fileId: fileId,
                          id: fileId,
                          alternateLink: `https://drive.google.com/file/d/${fileId}/view`,
                          downloadUrl: `https://drive.google.com/uc?id=${fileId}&export=download`
                        };
                        course.materials.push({
                          id: `mat_${fileId}`,
                          title: `Course Material (${fileId.substring(0, 8)})`,
                          alternateLink: att.alternateLink,
                          attachments: [att]
                        });
                      }
                    }

                    // Extract Coursework / Assignment links
                    const cwRegex = new RegExp(`href="([^"]*\/c\/${course.id}\/a\/([a-zA-Z0-9_-]+)[^"]*)"`, 'g');
                    const cwMatches = html.matchAll(cwRegex);
                    const seenCw = new Set<string>();
                    for (const cwm of cwMatches) {
                      const cwLink = cwm[1];
                      const cwId = cwm[2];
                      if (!seenCw.has(cwId)) {
                        seenCw.add(cwId);
                        course.courseWork.push({
                          id: cwId,
                          title: `Assignment ${cwId.substring(0, 6)}`,
                          alternateLink: cwLink.startsWith('http') ? cwLink : `https://classroom.google.com${cwLink}`,
                          attachments: []
                        });
                      }
                    }

                    // Deep fetch coursework assignment detail pages (/sa/<id>/details)
                    for (const cw of course.courseWork.slice(0, 10)) {
                      try {
                        const cwUrl = `${effectivePrefix}/c/${course.id}/sa/${cw.id}/details`;
                        const cwRes = await fetch(cwUrl, {
                          credentials: 'include',
                          headers: { 'Accept': 'text/html,application/xhtml+xml' }
                        });
                        if (cwRes.ok) {
                          const cwHtml = await cwRes.text();
                          const cwDriveRegex = /(?:https?|https?:\\\/\\\/)?(?:drive|docs)\.google\.com(?:\/|\\\/)(?:(?:file|document|spreadsheets|presentation)(?:\/|\\\/)d(?:\/|\\\/)|open\?(?:amp;)?id=)([a-zA-Z0-9_-]{20,})/g;
                          for (const cdm of cwHtml.matchAll(cwDriveRegex)) {
                            const fId = cdm[1];
                            if (!cw.attachments.some((at: any) => at.fileId === fId)) {
                              cw.attachments.push({
                                title: `Work File (${fId.substring(0, 8)})`,
                                fileId: fId,
                                id: fId,
                                alternateLink: `https://drive.google.com/file/d/${fId}/view`,
                                downloadUrl: `https://drive.google.com/uc?id=${fId}&export=download`
                              });
                            }
                          }
                        }
                      } catch (cwErr) {}
                    }
                  }
                } catch (deepErr) {
                  console.warn(`[ClassroomBrowserExtractor] Deep fetch notice for ${course.id}:`, deepErr);
                }
              }

              return courses;
            }
          });

          if (injectionResults && injectionResults[0]?.result && Array.isArray(injectionResults[0].result)) {
            extractedCourses = injectionResults[0].result as ExtractedCourse[];
            await WhatsAppDiagnosticLogger.log('INFO', 'EXTRACT', `✅ Tab script succeeded: parsed ${extractedCourses.length} course(s).`).catch(() => {});
          } else {
            await WhatsAppDiagnosticLogger.log('WARN', 'EXTRACT', '⚠️ Tab script returned empty results. Will attempt fallback probes...').catch(() => {});
          }
        } catch (scriptErr: any) {
          console.warn('[ClassroomBrowserExtractor] Tab script injection fallback:', scriptErr);
          await WhatsAppDiagnosticLogger.log('ERROR', 'EXTRACT', `❌ Tab script error: ${scriptErr?.message || String(scriptErr)}`).catch(() => {});
        }
      }

      // Fallback: If DOM scraping returned no courses, probe Classroom HTML directly with multi-account prefixes
      if (extractedCourses.length === 0) {
        const candidatePrefixes = [userPrefix, '', '/u/2', '/u/1', '/u/3'].filter((p, i, a) => a.indexOf(p) === i);
        for (const pfx of candidatePrefixes) {
          try {
            const res = await fetch(`https://classroom.google.com${pfx}/h`, {
              credentials: 'include',
              headers: { 'Accept': 'text/html,application/xhtml+xml' }
            });
            if (res.ok) {
              const html = await res.text();
              const matches = html.matchAll(/\/c\/([a-zA-Z0-9_-]{8,})/g);
              const seenIds = new Set<string>();
              for (const m of matches) {
                const cId = m[1];
                if (!seenIds.has(cId) && !['calendar', 'settings', 'archive'].includes(cId)) {
                  seenIds.add(cId);
                  extractedCourses.push({
                    id: cId,
                    name: `Course ${cId.substring(0, 6)}`,
                    alternateLink: `https://classroom.google.com${pfx}/c/${cId}`,
                    courseWork: [],
                    announcements: [],
                    materials: []
                  });
                }
              }
              if (extractedCourses.length > 0) break;
            }
          } catch (fetchErr) {
            console.warn(`[ClassroomBrowserExtractor] Classroom HTML fetch fallback (${pfx}):`, fetchErr);
          }
        }
      }

      // If still empty, report clear instruction to user
      if (extractedCourses.length === 0) {
        reportProgress({
          phase: 'ERROR',
          message: 'No active Google Classroom courses detected. Please ensure you are logged into classroom.google.com in this browser.',
          percent: 0
        });
        return {
          success: false,
          coursesCount: 0,
          announcementsCount: 0,
          totalAttachments: 0,
          savedAttachments: 0,
          error: 'Please open https://classroom.google.com in this browser, confirm your student is logged in, and click Retry.'
        };
      }

      // For each discovered course, systematically ingest BOTH dedicated Stream tab (/c/<courseId>)
      // and Classwork tab (/w/<courseId>/t/all) to match School Worker API completeness (100% parity)
      for (let i = 0; i < extractedCourses.length; i++) {
        const course = extractedCourses[i];

        // Phase A: Ingest Stream Tab (Stream Announcements, Notices & Circular Attachments)
        // If initial in-tab crawl already captured announcements for this course, skip redundant re-scroll!
        if (!course.announcements || course.announcements.length === 0) {
          reportProgress({
            phase: 'FETCHING_COURSEWORK',
            message: `Ingesting Stream announcements for "${course.name}" (${i + 1}/${extractedCourses.length})...`,
            percent: 25 + Math.round(((i + 0.4) / extractedCourses.length) * 25)
          });

          try {
            const streamData = await this.scrapeCourseStreamTab(course.id, userPrefix, course.name);
            if (streamData && streamData.announcements && streamData.announcements.length > 0) {
              if (!course.announcements) course.announcements = [];
              const existingAnnIds = new Set(course.announcements.map((a: any) => a.id));
              for (const ann of streamData.announcements) {
                if (!existingAnnIds.has(ann.id)) {
                  existingAnnIds.add(ann.id);
                  course.announcements.push(ann);
                }
              }
            }
          } catch (sErr: any) {
            console.warn(`[ClassroomBrowserExtractor] Stream tab scrape error for ${course.id}:`, sErr);
          }
        } else {
          await WhatsAppDiagnosticLogger.log(
            'INFO',
            'EXTRACT',
            `📢 [STREAM_ALREADY_INGESTED] Course "${course.name}": Stream feed already captured ${course.announcements.length} announcement(s). Proceeding directly to Classwork tab...`
          ).catch(() => {});
        }

        // Phase B: Ingest Classwork Tab (Topics, Materials, Worksheets & Assignments)
        reportProgress({
          phase: 'FETCHING_COURSEWORK',
          message: `Ingesting Classwork tab for "${course.name}" (${i + 1}/${extractedCourses.length})...`,
          percent: 25 + Math.round(((i + 1) / extractedCourses.length) * 25)
        });

        try {
          const classworkData = await this.scrapeCourseClassworkTab(course.id, userPrefix, course.name);
          if (classworkData) {
            // Merge materials
            if (!course.materials) course.materials = [];
            if (classworkData.materials && classworkData.materials.length > 0) {
              const existingMatIds = new Set(course.materials.map((m: any) => m.id));
              for (const m of classworkData.materials) {
                if (!existingMatIds.has(m.id)) {
                  existingMatIds.add(m.id);
                  course.materials.push(m);
                }
              }
            }
            // Merge coursework
            if (!course.courseWork) course.courseWork = [];
            if (classworkData.courseWork && classworkData.courseWork.length > 0) {
              const existingCwIds = new Set(course.courseWork.map((cw: any) => cw.id));
              for (const cw of classworkData.courseWork) {
                if (!existingCwIds.has(cw.id)) {
                  existingCwIds.add(cw.id);
                  course.courseWork.push(cw);
                }
              }
            }
          }
        } catch (cwErr: any) {
          console.warn(`[ClassroomBrowserExtractor] Classwork tab scrape error for ${course.id}:`, cwErr);
        }
      }

      // Calculate totals across courses
      let totalAttachmentsCount = 0;
      let totalCourseWorkCount = 0;
      let totalAnnouncementsCount = 0;
      for (const c of extractedCourses) {
        totalCourseWorkCount += c.courseWork?.length || 0;
        totalAnnouncementsCount += c.announcements?.length || 0;
        const allItems = [...(c.courseWork || []), ...(c.materials || []), ...(c.announcements || [])];
        for (const it of allItems) {
          totalAttachmentsCount += it.attachments?.length || 0;
        }
      }

      await WhatsAppDiagnosticLogger.log(
        'INFO',
        'EXTRACT',
        `📊 Ingestion Summary: ${extractedCourses.length} course(s), ${totalAnnouncementsCount} announcement(s), ${totalCourseWorkCount} coursework, and ${totalAttachmentsCount} total attachment(s) identified.`
      ).catch(() => {});

      reportProgress({
        phase: 'FETCHING_COURSEWORK',
        message: `Found ${extractedCourses.length} course(s) with ${totalCourseWorkCount} assignments & ${totalAttachmentsCount} materials.`,
        percent: 50,
        coursesFound: extractedCourses.length,
        itemsFound: totalCourseWorkCount,
        totalAttachments: totalAttachmentsCount
      });

      // Assemble standard syncData structure
      const syncData: any = {
        classroom: {
          courses: extractedCourses,
          extractedAt: new Date().toISOString(),
          extractionMethod: 'BROWSER_EXTENSION',
          deepLog: {
            syncId: `browser_sync_${Date.now()}`,
            timestamp: new Date().toISOString(),
            childName: profile.name,
            academicYear: profile.academicYear,
            extractOnly: true,
            summary: {
              totalCoursesFound: extractedCourses.length,
              coursesIngested: extractedCourses.length,
              totalAnnouncements: totalAnnouncementsCount,
              totalCourseWork: totalCourseWorkCount,
              totalAttachments: totalAttachmentsCount
            },
            logTimeline: [
              `[${new Date().toISOString()}] Browser Direct Sync executed for ${profile.name}`,
              `[${new Date().toISOString()}] Ingested ${extractedCourses.length} courses, ${totalCourseWorkCount} coursework, ${totalAttachmentsCount} attachments.`
            ]
          }
        }
      };

      reportProgress({
        phase: 'SAVING_TO_VAULT',
        message: 'Saving courses and archiving into Parent Vault (K.I.D.S. Data/)...',
        percent: 75
      });

      const saveStats = await PersonalDriveService.saveExtractedSchoolData(
        parentToken,
        profile.name,
        profile.academicYear,
        syncData
      );

      const downloaded = Number.isFinite(saveStats.totalDownloaded) ? saveStats.totalDownloaded : 0;
      const skipped = Number.isFinite(saveStats.totalSkipped) ? saveStats.totalSkipped : 0;
      const failed = Number.isFinite(saveStats.totalFailed) ? saveStats.totalFailed : 0;

      // Update child profile
      await ChildManager.updateProfile(profile.id, {
        syncMethod: 'BROWSER_EXTENSION',
        schoolGasDeploymentUrl: 'browser_extension',
        lastSchoolSync: new Date().toISOString(),
        initialSyncStatus: 'COMPLETED',
        initialSyncCompletedAt: Date.now(),
        initialSyncError: undefined,
        initialSyncProgress: {
          downloaded,
          skipped,
          failed,
          total: downloaded + skipped + failed,
          phase: 'complete'
        }
      });

      if (typeof chrome !== 'undefined' && chrome.storage?.local) {
        await chrome.storage.local.set({
          step2_sync_status: 'COMPLETED',
          step2_initial_sync_in_progress: false,
          step2_initial_sync_complete: true,
          step2_sync_heartbeat: null,
          step2_sync_error: null,
          step2_initial_sync_summary: {
            courses: extractedCourses.length,
            attachments: downloaded + skipped,
            ocrIndexed: 0
          },
          classroom_attachment_progress: {
            downloaded,
            skipped,
            failed,
            total: downloaded + skipped + failed,
            phase: 'complete',
            interrupted: false
          }
        }).catch(() => {});
      }

      reportProgress({
        phase: 'COMPLETED',
        message: `Successfully synced ${extractedCourses.length} course(s), ${totalAnnouncementsCount} announcement(s), and ${downloaded} attachment(s) to Parent Vault!`,
        percent: 100,
        coursesFound: extractedCourses.length,
        itemsFound: totalAnnouncementsCount + totalCourseWorkCount,
        attachmentsSaved: downloaded,
        totalAttachments: downloaded + skipped
      });

      await WhatsAppDiagnosticLogger.log(
        'INFO',
        'EXTRACT',
        `✅ Browser Extension sync completed for ${profile.name}: ${extractedCourses.length} course(s), ${totalAnnouncementsCount} announcement(s), ${downloaded} attachment(s) vaulted.`
      ).catch(() => {});

      return {
        success: true,
        coursesCount: extractedCourses.length,
        announcementsCount: totalAnnouncementsCount,
        totalAttachments: downloaded + skipped,
        savedAttachments: downloaded
      };
    } catch (err: any) {
      reportProgress({
        phase: 'ERROR',
        message: `Sync error: ${err?.message || err}`,
        percent: 0
      });
      throw err;
    } finally {
      if (keepAliveInterval) {
        clearInterval(keepAliveInterval);
        keepAliveInterval = null;
      }
      try {
        if (typeof chrome !== 'undefined' && chrome.alarms?.clear) {
          chrome.alarms.clear('KEEP_ALIVE_CLASSROOM_BROWSER_SUPERVISOR');
        }
      } catch (e) {}
      this.isExtracting = false;
    }
  }
}
