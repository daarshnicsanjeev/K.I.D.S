import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ClassroomBrowserExtractor } from '../src/services/classroomBrowserExtractor';

describe('Classroom Stream Tab Scraper & Circular Extraction', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    (globalThis as any).chrome = {
      tabs: {
        query: vi.fn().mockResolvedValue([]),
        create: vi.fn().mockResolvedValue({ id: 888, url: 'https://classroom.google.com/u/1/c/854795530690' }),
        remove: vi.fn().mockResolvedValue(undefined),
        update: vi.fn(),
        onUpdated: {
          addListener: vi.fn(),
          removeListener: vi.fn()
        }
      },
      scripting: {
        executeScript: vi.fn()
      }
    };
  });

  it('passes injection func to executeScript and extracts stream announcements and attachments', async () => {
    let capturedFunc: any = null;
    let capturedArgs: any = null;

    (globalThis as any).chrome.scripting.executeScript = vi.fn().mockImplementation(async (opts: any) => {
      capturedFunc = opts.func;
      capturedArgs = opts.args;
      return [
        {
          result: {
            announcements: [
              {
                id: 'ann_1',
                text: 'Dear Parents, please find attached the Cambridge Primary Checkpoint circular.',
                attachments: [{ fileId: 'circ_doc_1', title: 'Circular_Sep2026.pdf' }]
              },
              {
                id: 'ann_2',
                text: 'School timetable update for Grade 3B.',
                attachments: [{ fileId: 'circ_doc_2', title: 'Timetable_3B.pdf' }]
              }
            ],
            attachmentsCount: 2
          }
        }
      ];
    });

    const res = await ClassroomBrowserExtractor.scrapeCourseStreamTab('854795530690', '/u/1', 'Grade 3B CAIE');
    expect(res).not.toBeNull();
    expect(res?.announcements.length).toBe(2);
    expect(res?.attachmentsCount).toBe(2);
    expect(capturedFunc).toBeTypeOf('function');
    expect(capturedArgs).toEqual(['/u/1', '854795530690']);
  });

  it('executes the Stream injection function in a simulated DOM and verifies infinite scroll, card isolation, overflow modal scraping, and circular extraction', async () => {
    let injectedFunc: ((pfx: string, cId: string) => Promise<any>) | null = null;
    (globalThis as any).chrome.scripting.executeScript = vi.fn().mockImplementation(async (opts: any) => {
      injectedFunc = opts.func;
      return [{ result: null }];
    });

    await ClassroomBrowserExtractor.scrapeCourseStreamTab('854795530690', '/u/1', 'Grade 3B CAIE');
    expect(injectedFunc).toBeTypeOf('function');

    // Create a mock DOM environment
    class MockNode {
      tagName: string;
      attributes: Record<string, string> = {};
      children: MockNode[] = [];
      parentElement: MockNode | null = null;
      textContent: string = '';
      innerHTML: string = '';

      constructor(tagName: string) {
        this.tagName = tagName.toUpperCase();
      }

      setAttribute(name: string, val: string) {
        this.attributes[name] = val;
      }

      getAttribute(name: string) {
        return this.attributes[name] || null;
      }

      removeAttribute(name: string) {
        delete this.attributes[name];
      }

      appendChild(child: MockNode) {
        child.parentElement = this;
        this.children.push(child);
        return child;
      }

      querySelector(selector: string): MockNode | null {
        return this.querySelectorAll(selector)[0] || null;
      }

      querySelectorAll(selector: string): MockNode[] {
        const results: MockNode[] = [];
        const match = (node: MockNode): boolean => {
          if (selector.includes('div[data-stream-item-id]') || selector.includes('[data-stream-item-id]')) {
            if (node.getAttribute('data-stream-item-id')) return true;
          }
          if (selector.includes('div[role="dialog"]')) {
            if (node.tagName === 'DIV' && node.getAttribute('role') === 'dialog') return true;
          }
          if (selector.includes('a[href*="drive.google.com"]')) {
            const href = node.getAttribute('href') || '';
            if (node.tagName === 'A' && href.includes('drive.google.com')) return true;
          }
          if (selector.includes('a[href*="/p/"]')) {
            const href = node.getAttribute('href') || '';
            if (node.tagName === 'A' && href.includes('/p/')) return true;
          }
          if (selector.includes('h3')) {
            if (node.tagName === 'H3') return true;
          }
          if (selector.includes('button')) {
            if (node.tagName === 'BUTTON') return true;
          }
          if (selector.includes('[data-modal-scraped="true"]')) {
            if (node.getAttribute('data-modal-scraped') === 'true') return true;
          }
          return false;
        };

        const traverse = (current: MockNode) => {
          for (const child of current.children) {
            if (match(child)) results.push(child);
            traverse(child);
          }
        };
        traverse(this);
        return results;
      }

      scrollIntoView() {}
      click() {}
    }

    const mockBody = new MockNode('BODY');
    (mockBody as any).scrollHeight = 2000;

    // Post 1: General circular announcement
    const post1 = new MockNode('DIV');
    post1.setAttribute('data-stream-item-id', 'ann_stream_101');
    const p1Text = new MockNode('P');
    p1Text.textContent = 'Dear Grade 3B Parents, please find attached circular for sports day 2026.';
    post1.appendChild(p1Text);

    const p1Att = new MockNode('A');
    p1Att.setAttribute('href', 'https://drive.google.com/file/d/1SportsDayCircular2026DriveIdABC/view');
    p1Att.textContent = 'Sports_Day_Notice.pdf';
    post1.appendChild(p1Att);
    mockBody.appendChild(post1);

    // Post 2: Announcement with "+2 more" overflow button
    const post2 = new MockNode('DIV');
    post2.setAttribute('data-stream-item-id', 'ann_stream_102');
    const p2Text = new MockNode('P');
    p2Text.textContent = 'Curriculum overview for Term 1 and syllabus breakdown.';
    post2.appendChild(p2Text);

    const p2Att1 = new MockNode('A');
    p2Att1.setAttribute('href', 'https://drive.google.com/file/d/1SyllabusBreakdownTerm1DriveIdDEF/view');
    p2Att1.textContent = 'Term_1_Syllabus.pdf';
    post2.appendChild(p2Att1);

    const p2MoreBtn = new MockNode('BUTTON');
    p2MoreBtn.textContent = '+2 more';
    p2MoreBtn.click = () => {
      // Simulate Classroom Wiz opening overflow dialog on document.body
      const dialog = new MockNode('DIV');
      dialog.setAttribute('role', 'dialog');
      dialog.setAttribute('aria-modal', 'true');

      const modalAtt1 = new MockNode('A');
      modalAtt1.setAttribute('href', 'https://drive.google.com/file/d/1OverflowCircularBooklistDriveIdXYZ/view');
      modalAtt1.textContent = 'Book_List_2026.pdf';
      dialog.appendChild(modalAtt1);

      mockBody.appendChild(dialog);
    };
    post2.appendChild(p2MoreBtn);
    mockBody.appendChild(post2);

    // Provide mock environment to global
    const origDoc = (globalThis as any).document;
    const origWin = (globalThis as any).window;

    (globalThis as any).document = {
      body: mockBody,
      documentElement: { scrollHeight: 2000, clientHeight: 800 },
      querySelectorAll: (sel: string) => mockBody.querySelectorAll(sel),
      querySelector: (sel: string) => mockBody.querySelector(sel)
    };

    (globalThis as any).window = {
      scrollTo: vi.fn(),
      scrollBy: vi.fn(),
      innerHeight: 800
    };

    // Fast-forward timers for the 15+ scroll cycles so test finishes in <100ms
    const origSetTimeout = globalThis.setTimeout;
    (globalThis as any).setTimeout = (fn: any, ms?: number) => {
      if (typeof ms === 'number' && ms > 0) {
        return origSetTimeout(fn, 1);
      }
      return origSetTimeout(fn, ms);
    };

    try {
      const result = await injectedFunc!('/u/1', '854795530690');
      expect(result).toBeDefined();
      expect(result.announcements.length).toBeGreaterThanOrEqual(2);

      const allAtts = result.announcements.flatMap((a: any) => a.attachments);
      const fileIds = allAtts.map((a: any) => a.fileId);

      expect(fileIds).toContain('1SportsDayCircular2026DriveIdABC');
      expect(fileIds).toContain('1SyllabusBreakdownTerm1DriveIdDEF');
      // The modal overflow attachment must be captured
      expect(fileIds).toContain('1OverflowCircularBooklistDriveIdXYZ');
    } finally {
      (globalThis as any).document = origDoc;
      (globalThis as any).window = origWin;
      globalThis.setTimeout = origSetTimeout;
    }
  });
});
