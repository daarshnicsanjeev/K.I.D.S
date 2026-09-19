import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ClassroomBrowserExtractor } from '../src/services/classroomBrowserExtractor';

describe('Classroom Classwork Tab Scraper & Multi-Pass Extraction', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    (globalThis as any).chrome = {
      tabs: {
        query: vi.fn().mockResolvedValue([]),
        create: vi.fn().mockResolvedValue({ id: 999, url: 'https://classroom.google.com/u/2/w/course_abc/t/all' }),
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

  it('passes injection func to executeScript and extracts multi-topic notes and attachments', async () => {
    let capturedFunc: any = null;
    let capturedArgs: any = null;

    (globalThis as any).chrome.scripting.executeScript = vi.fn().mockImplementation(async (opts: any) => {
      capturedFunc = opts.func;
      capturedArgs = opts.args;
      return [
        {
          result: {
            materials: [
              { id: 'mat_1', title: 'Hindi Sep 11', attachments: [{ fileId: 'f1', title: 'Hindi_11.pdf' }] },
              { id: 'mat_2', title: 'Hindi Sep 9', attachments: [{ fileId: 'f2', title: 'Hindi_9.pdf' }] },
              { id: 'mat_3', title: 'Science Sep 10', attachments: [{ fileId: 'f3', title: 'Science_10.pdf' }] }
            ],
            courseWork: [
              { id: 'cw_1', title: 'Geography Assignment 1', attachments: [{ fileId: 'f4', title: 'Geo_1.pdf' }] }
            ],
            attachmentsCount: 4
          }
        }
      ];
    });

    const res = await ClassroomBrowserExtractor.scrapeCourseClassworkTab('course_abc', '/u/2', 'STD- VIII (B)');
    expect(res).not.toBeNull();
    expect(res?.materials.length).toBe(3);
    expect(res?.courseWork.length).toBe(1);
    expect(res?.attachmentsCount).toBe(4);
    expect(capturedFunc).toBeTypeOf('function');
    expect(capturedArgs).toEqual(['/u/2', 'course_abc']);
  });

  it('executes the injection function in a simulated DOM and verifies multi-topic extraction, card isolation, and overflow clicking', async () => {
    // Intercept the real injection function from scrapeCourseClassworkTab
    let injectedFunc: ((pfx: string, cId: string) => Promise<any>) | null = null;
    (globalThis as any).chrome.scripting.executeScript = vi.fn().mockImplementation(async (opts: any) => {
      injectedFunc = opts.func;
      return [{ result: null }];
    });

    await ClassroomBrowserExtractor.scrapeCourseClassworkTab('test_course', '/u/2');
    expect(injectedFunc).toBeTypeOf('function');

    // Build a mock DOM tree
    const clickedElements: any[] = [];
    const windowScrolls: any[] = [];

    class MockNode {
      children: MockNode[] = [];
      parentElement: MockNode | null = null;
      attributes: Record<string, string> = {};
      textContent: string = '';
      innerHTML: string = '';
      tagName: string;
      scrollTop: number = 0;

      eventListeners: Record<string, Function[]> = {};

      constructor(tagName: string, attrs: Record<string, string> = {}, text = '', innerHTML = '') {
        this.tagName = tagName.toUpperCase();
        this.attributes = { ...attrs };
        this.textContent = text;
        this.innerHTML = innerHTML;
      }

      addEventListener(type: string, listener: Function) {
        if (!this.eventListeners[type]) this.eventListeners[type] = [];
        this.eventListeners[type].push(listener);
      }

      appendChild(child: MockNode) {
        child.parentElement = this;
        this.children.push(child);
        return child;
      }

      getAttribute(name: string) {
        return this.attributes[name] ?? null;
      }

      hasAttribute(name: string) {
        return name in this.attributes;
      }

      setAttribute(name: string, val: string) {
        this.attributes[name] = val;
      }

      click() {
        clickedElements.push(this);
        const event = { defaultPrevented: false, preventDefault: () => { event.defaultPrevented = true; } };
        for (const l of this.eventListeners['click'] || []) {
          l(event);
        }
        if (this.attributes['aria-expanded'] === 'false') {
          this.attributes['aria-expanded'] = 'true';
        }
      }

      scrollIntoView() {}
      dispatchEvent() { return true; }

      contains(other: MockNode): boolean {
        let curr: MockNode | null = other;
        while (curr) {
          if (curr === this) return true;
          curr = curr.parentElement;
        }
        return false;
      }

      closest(selector: string): MockNode | null {
        let curr: MockNode | null = this;
        while (curr) {
          if (curr.matches(selector)) return curr;
          curr = curr.parentElement;
        }
        return null;
      }

      matches(selector: string): boolean {
        const parts = selector.split(',').map(s => s.trim());
        return parts.some(part => {
          const p = part.toLowerCase();
          if (p === 'ol[role="list"]') return this.tagName === 'OL' && this.getAttribute('role') === 'list';
          if (p.includes('ol[role="list"]') && p.includes('li')) {
            return this.tagName === 'LI';
          }
          if (p === 'main' || p === '[role="main"]') return this.tagName === 'MAIN' || this.getAttribute('role') === 'main';
          if (p === 'header' || p === '[role="banner"]') return this.tagName === 'HEADER' || this.getAttribute('role') === 'banner';
          if (p === 'nav' || p === '[role="navigation"]') return this.tagName === 'NAV' || this.getAttribute('role') === 'navigation';
          if (p === 'li') return this.tagName === 'LI';
          if (p === 'a') return this.tagName === 'A';
          if (p === 'button') return this.tagName === 'BUTTON';
          if (p === 'c-wiz') return this.tagName === 'C-WIZ';
          if (p === '[aria-expanded]') return this.hasAttribute('aria-expanded');
          if (p === '[aria-expanded="false"]') return this.getAttribute('aria-expanded') === 'false';
          if (p === '[aria-expanded="true"]') return this.getAttribute('aria-expanded') === 'true';
          if (p === '[data-item-id]') return this.hasAttribute('data-item-id');
          if (p === 'div[role="region"]') return this.tagName === 'DIV' && this.getAttribute('role') === 'region';
          if (p === 'div[data-topic-id]') return this.tagName === 'DIV' && this.hasAttribute('data-topic-id');
          if (p === 'section') return this.tagName === 'SECTION';
          if (p === 'h2') return this.tagName === 'H2';
          if (p === 'h3') return this.tagName === 'H3';
          if (p === '[role="heading"]') return this.getAttribute('role') === 'heading';
          if (p.includes('heading') && p.includes('aria-level="2"')) return this.getAttribute('role') === 'heading' && this.getAttribute('aria-level') === '2';
          if (p.includes('heading') && p.includes('aria-level="3"')) return this.getAttribute('role') === 'heading' && this.getAttribute('aria-level') === '3';
          if (p === 'div[role="button"]') return this.tagName === 'DIV' && this.getAttribute('role') === 'button';
          if (p === 'div[role="button"][aria-expanded="false"]') return this.tagName === 'DIV' && this.getAttribute('role') === 'button' && this.getAttribute('aria-expanded') === 'false';
          if (p === 'div[role="button"][aria-expanded="true"]') return this.tagName === 'DIV' && this.getAttribute('role') === 'button' && this.getAttribute('aria-expanded') === 'true';
          if (p.startsWith('a[href*=')) {
            const match = part.match(/a\[href\*=["']?([^"']+)["']?\]/i);
            return this.tagName === 'A' && (this.getAttribute('href') || '').toLowerCase().includes((match?.[1] || '').toLowerCase());
          }
          if (p.includes('title')) {
            return (this.getAttribute('class') || '').toLowerCase().includes('title');
          }
          if (p.includes('more')) {
            return (this.getAttribute('class') || '').toLowerCase().includes('more') || (this.getAttribute('aria-label') || '').toLowerCase().includes('more');
          }
          return false;
        });
      }

      querySelector(selector: string): MockNode | null {
        return this.querySelectorAll(selector)[0] || null;
      }

      querySelectorAll(selector: string): MockNode[] {
        const results: MockNode[] = [];
        const traverse = (node: MockNode) => {
          for (const child of node.children) {
            if (child.matches(selector)) {
              results.push(child);
            }
            traverse(child);
          }
        };
        traverse(this);
        return results;
      }
    }

    const body = new MockNode('body');
    const main = body.appendChild(new MockNode('main'));

    // System button in header
    const header = body.appendChild(new MockNode('header'));
    const sysBtn = header.appendChild(new MockNode('button', { 'aria-label': 'Classroom menu', 'aria-expanded': 'false' }, 'Menu'));

    const topicList = main.appendChild(new MockNode('ol', { role: 'list' }));

    // TOPIC 1: Hindi
    const topicHindi = topicList.appendChild(new MockNode('li'));
    topicHindi.appendChild(new MockNode('h2', {}, 'Hindi'));
    // Truncation link in topic
    const topicHindiTruncationLink = topicHindi.appendChild(new MockNode('a', { href: 'https://classroom.google.com/u/2/w/test_course/t/hindi' }, 'View all'));
    const hindiCardsContainer = topicHindi.appendChild(new MockNode('div'));

    // Note 1 - Contains 3-dots menu button and permalink to material!
    const hindiNote1 = hindiCardsContainer.appendChild(new MockNode('div', { class: 'item-card', 'data-item-id': 'mat_h1_id' }));
    const hindiToggle1 = hindiNote1.appendChild(new MockNode('div', { role: 'button', 'aria-expanded': 'false' }));
    hindiToggle1.appendChild(new MockNode('h3', {}, 'Sep 11 Hindi Notes'));
    // 3-dots menu button inside Note 1 (has aria-haspopup="true" and aria-expanded="false")
    const hindiMenuBtn1 = hindiNote1.appendChild(new MockNode('button', { 'aria-label': 'More options', 'aria-haspopup': 'true', 'aria-expanded': 'false' }, '...'));
    const hindiAttDiv1 = hindiNote1.appendChild(new MockNode('div'));
    hindiAttDiv1.appendChild(new MockNode('a', { href: 'https://drive.google.com/file/d/11111111111111111111/view' }, 'Attachment: Hindi_Ch1.pdf PDF'));
    // Permalink to material inside Note 1
    hindiAttDiv1.appendChild(new MockNode('a', { href: 'https://classroom.google.com/u/2/w/test_course/m/mat_h1_id' }, 'View material'));

    // Note 2
    const hindiNote2 = hindiCardsContainer.appendChild(new MockNode('div', { class: 'item-card', 'data-item-id': 'mat_h2_id' }));
    const hindiToggle2 = hindiNote2.appendChild(new MockNode('div', { role: 'button', 'aria-expanded': 'false' }));
    hindiToggle2.appendChild(new MockNode('h3', {}, 'Sep 9 Hindi Notes'));
    const hindiAttDiv2 = hindiNote2.appendChild(new MockNode('div'));
    hindiAttDiv2.appendChild(new MockNode('a', { href: 'https://drive.google.com/file/d/22222222222222222222/view' }, 'Hindi_Ch2.pdf'));
    hindiAttDiv2.appendChild(new MockNode('a', { href: 'https://classroom.google.com/u/2/w/test_course/m/mat_h2_id' }, 'View material'));

    // TOPIC 2: Science
    const topicScience = topicList.appendChild(new MockNode('li'));
    topicScience.appendChild(new MockNode('h2', {}, 'Science'));
    const scienceCardsContainer = topicScience.appendChild(new MockNode('div'));

    // Note 3
    const scienceNote1 = scienceCardsContainer.appendChild(new MockNode('div', { class: 'item-card' }));
    const scienceToggle1 = scienceNote1.appendChild(new MockNode('div', { role: 'button', 'aria-expanded': 'false' }));
    scienceToggle1.appendChild(new MockNode('h3', {}, 'Sep 10 Science Notes'));
    const scienceAttDiv1 = scienceNote1.appendChild(new MockNode('div'));
    scienceAttDiv1.appendChild(new MockNode('a', { href: 'https://drive.google.com/file/d/33333333333333333333/view' }, 'Science_Acid_Base.pdf'));
    const overflowBtn = scienceAttDiv1.appendChild(new MockNode('button', { class: 'more', 'aria-label': 'Show 2 more attachments' }, '+2 more'));

    // Orphan file at page level
    main.appendChild(new MockNode('a', { href: 'https://drive.google.com/file/d/99999999999999999999/view' }, 'Syllabus_Orphan.pdf'));

    // Install mock global environment
    (globalThis as any).document = {
      querySelectorAll: (sel: string) => body.querySelectorAll(sel),
      querySelector: (sel: string) => body.querySelector(sel),
      documentElement: { innerHTML: body.innerHTML }
    };
    (globalThis as any).window = {
      scrollY: 1000,
      scrollBy: (opts: any) => windowScrolls.push({ type: 'scrollBy', opts }),
      scrollTo: (opts: any) => windowScrolls.push({ type: 'scrollTo', opts })
    };

    // Run the injected function with fast timers so 25 scroll cycles don't block
    const origSetTimeout = globalThis.setTimeout;
    (globalThis as any).setTimeout = (fn: any, ms?: number) => {
      if (typeof ms === 'number' && ms > 0) {
        return origSetTimeout(fn, 1);
      }
      return origSetTimeout(fn, ms);
    };

    let result: any;
    try {
      result = await injectedFunc!('/u/2', 'test_course');
    } finally {
      globalThis.setTimeout = origSetTimeout;
    }

    // Assertions:
    // 1. window.scrollTo({ top: 0 }) was NOT called!
    const scrollToZero = windowScrolls.find(s => s.type === 'scrollTo' && s.opts?.top === 0);
    expect(scrollToZero, 'window.scrollTo({ top: 0 }) MUST NOT be called prior to extraction').toBeUndefined();

    // 2. System buttons and 3-dots menu buttons were NOT clicked
    expect(clickedElements).not.toContain(sysBtn);
    expect(clickedElements).not.toContain(hindiMenuBtn1);

    // 2b. Truncation link was clicked safely (and navigation was prevented)
    expect(clickedElements).toContain(topicHindiTruncationLink);

    // 3. Both Hindi toggles and the Science toggle WERE clicked and expanded
    expect(clickedElements).toContain(hindiToggle1);
    expect(clickedElements).toContain(hindiToggle2);
    expect(clickedElements).toContain(scienceToggle1);

    // 4. Overflow button (+2 more) WAS clicked
    expect(clickedElements).toContain(overflowBtn);

    // 5. Check extracted materials count:
    // We expect: 2 Hindi notes + 1 Science note + 1 Orphan file = 4 materials total!
    // (Previous bug extracted only 1 per topic = 2 materials!)
    expect(result.materials.length).toBe(4);

    // Verify individual note titles were captured (NOT collapsed into just "Hindi")
    const titles = result.materials.map((m: any) => m.title);
    expect(titles).toContain('Sep 11 Hindi Notes');
    expect(titles).toContain('Sep 9 Hindi Notes');
    expect(titles).toContain('Sep 10 Science Notes');

    // Verify topics and item IDs were correctly resolved (not collapsed or mangled)
    const hindiNote1Mat = result.materials.find((m: any) => m.title === 'Sep 11 Hindi Notes');
    expect(hindiNote1Mat.topic).toBe('Hindi');
    expect(hindiNote1Mat.id).toBe('mat_h1_id');
    expect(hindiNote1Mat.alternateLink).toContain('/m/mat_h1_id');
    expect(hindiNote1Mat.attachments.length).toBe(1);
    expect(hindiNote1Mat.attachments[0].fileId).toBe('11111111111111111111');
    expect(hindiNote1Mat.attachments[0].title).toBe('Hindi_Ch1.pdf'); // Cleaned from 'Attachment:' and 'PDF'

    const hindiNote2Mat = result.materials.find((m: any) => m.title === 'Sep 9 Hindi Notes');
    expect(hindiNote2Mat.topic).toBe('Hindi');
    expect(hindiNote2Mat.id).toBe('mat_h2_id');
    expect(hindiNote2Mat.attachments[0].fileId).toBe('22222222222222222222');

    const scienceNote1Mat = result.materials.find((m: any) => m.title === 'Sep 10 Science Notes');
    expect(scienceNote1Mat.topic).toBe('Science');
    expect(scienceNote1Mat.attachments[0].fileId).toBe('33333333333333333333');

    // Verify orphan attachment was captured in Pass 3
    const orphanMat = result.materials.find((m: any) => m.attachments?.some((a: any) => a.fileId === '99999999999999999999'));
    expect(orphanMat).toBeDefined();

    // Total unique attachments
    expect(result.attachmentsCount).toBe(4);
  });

  describe('normalizeClassroomId', () => {
    it('normalizes base64-encoded numeric IDs to standard numeric strings', () => {
      // ODU1MzM1Njg4NjI5 in base64 is 855335688629
      expect(ClassroomBrowserExtractor.normalizeClassroomId('ODU1MzM1Njg4NjI5')).toBe('855335688629');
      // Nzk4Mzg4MDA0NDc3 in base64 is 798388004477
      expect(ClassroomBrowserExtractor.normalizeClassroomId('Nzk4Mzg4MDA0NDc3')).toBe('798388004477');
    });

    it('preserves standard numeric IDs and alphanumeric custom IDs', () => {
      expect(ClassroomBrowserExtractor.normalizeClassroomId('855335688629')).toBe('855335688629');
      expect(ClassroomBrowserExtractor.normalizeClassroomId('cw_math_123')).toBe('cw_math_123');
      expect(ClassroomBrowserExtractor.normalizeClassroomId('')).toBe('');
      expect(ClassroomBrowserExtractor.normalizeClassroomId(null)).toBe('');
    });
  });

  describe('Multi-Topic Systematic Ingestion in scrapeCourseClassworkTab', () => {
    it('discovers truncated topics and navigates to dedicated topic URLs', async () => {
      const updatedUrls: string[] = [];
      (globalThis as any).chrome = {
        tabs: {
          query: vi.fn().mockResolvedValue([]),
          create: vi.fn().mockResolvedValue({ id: 777, url: 'https://classroom.google.com/u/2/w/course_xyz/t/all' }),
          remove: vi.fn().mockResolvedValue(undefined),
          update: vi.fn().mockImplementation(async (tabId: number, props: any) => {
            if (props.url) updatedUrls.push(props.url);
            return { id: tabId, url: props.url };
          }),
          onUpdated: {
            addListener: vi.fn((listener: Function) => {
              listener(777, { status: 'complete' });
            }),
            removeListener: vi.fn()
          }
        },
        scripting: {
          executeScript: vi.fn()
        }
      };

      let callCount = 0;
      (globalThis as any).chrome.scripting.executeScript = vi.fn().mockImplementation(async (opts: any) => {
        callCount++;
        if (callCount === 1) {
          // Pass 1: Overview page /t/all returns recent items and discovered topicLinks
          return [
            {
              result: {
                materials: [
                  { id: 'mat_overview_1', title: 'Recent Math Note 1', topic: 'Mathematics', attachments: [{ fileId: 'f_math_1', title: 'Math1.pdf' }] },
                  { id: 'mat_overview_2', title: 'Recent Hindi Note 1', topic: 'Hindi', attachments: [{ fileId: 'f_hindi_1', title: 'Hindi1.pdf' }] }
                ],
                courseWork: [],
                attachmentsCount: 2,
                topicLinks: [
                  { id: 'math_topic_id', name: 'Mathematics', url: 'https://classroom.google.com/u/2/w/course_xyz/t/math_topic_id', hasViewAll: true, itemCount: 10 },
                  { id: 'dance_topic_id', name: 'Dance', url: 'https://classroom.google.com/u/2/w/course_xyz/t/dance_topic_id', hasViewAll: false, itemCount: 2 }
                ]
              }
            }
          ];
        } else if (callCount === 2) {
          // Pass 2: Dedicated topic page for Mathematics
          expect(opts.args[2]).toBe('Mathematics');
          return [
            {
              result: {
                materials: [
                  { id: 'mat_overview_1', title: 'Recent Math Note 1', topic: 'Mathematics', attachments: [{ fileId: 'f_math_1', title: 'Math1.pdf' }] },
                  { id: 'mat_math_old_1', title: 'Addition and Subtraction Worksheet', topic: 'Mathematics', attachments: [{ fileId: 'f_math_old_1', title: 'AddSub.pdf' }] },
                  { id: 'mat_math_old_2', title: 'Place Value and Rounding', topic: 'Mathematics', attachments: [{ fileId: 'f_math_old_2', title: 'PlaceValue.pdf' }] }
                ],
                courseWork: [
                  { id: 'cw_math_hw_1', title: 'Math Homework Sheet', attachments: [{ fileId: 'f_hw_1', title: 'HW1.pdf' }] }
                ],
                attachmentsCount: 4
              }
            }
          ];
        }
        return [{ result: null }];
      });

      const res = await ClassroomBrowserExtractor.scrapeCourseClassworkTab('course_xyz', '/u/2', 'Grade 3B');
      expect(res).not.toBeNull();
      
      // Verified that chrome.tabs.update navigated to the truncated Mathematics topic page!
      expect(updatedUrls).toContain('https://classroom.google.com/u/2/w/course_xyz/t/math_topic_id');
      // Verified Dance was not visited because hasViewAll=false and itemCount=2
      expect(updatedUrls).not.toContain('https://classroom.google.com/u/2/w/course_xyz/t/dance_topic_id');

      // Verified merged results: 1 Hindi note + 3 Math notes = 4 materials total!
      expect(res?.materials.length).toBe(4);
      expect(res?.materials.some((m: any) => m.title === 'Addition and Subtraction Worksheet')).toBe(true);
      expect(res?.materials.some((m: any) => m.title === 'Place Value and Rounding')).toBe(true);
      expect(res?.materials.some((m: any) => m.title === 'Recent Hindi Note 1')).toBe(true);
      expect(res?.courseWork.length).toBe(1);
      expect(res?.courseWork[0].title).toBe('Math Homework Sheet');

      // Unique attachments: f_math_1, f_hindi_1, f_math_old_1, f_math_old_2, f_hw_1 = 5 attachments
      expect(res?.attachmentsCount).toBe(5);
    });
  });
});
