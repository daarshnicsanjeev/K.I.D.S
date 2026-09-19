import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ClassroomBrowserExtractor } from '../src/services/classroomBrowserExtractor';
import { PersonalDriveService } from '../src/services/personalDriveService';

describe('Sequential Accordion Scraper, Filename Sanitization & OCR Timeout', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('Filename & Title Sanitization', () => {
    it('PersonalDriveService.normalizeAttachmentFileName sanitizes empty, ().pdf, and .pdf titles with fallback', () => {
      // Empty or punctuation-only titles
      expect(PersonalDriveService.normalizeAttachmentFileName('', 'application/pdf', 'Math Notes', '104yZlqqoAotPTbDwo-3NDzQ97s94erho'))
        .toBe('Math Notes_104yZl.pdf');

      expect(PersonalDriveService.normalizeAttachmentFileName('().pdf', 'application/pdf', 'Marathi Comp', '104yZlqqoAotPTbDwo-3NDzQ97s94erho'))
        .toBe('Marathi Comp_104yZl.pdf');

      expect(PersonalDriveService.normalizeAttachmentFileName('.pdf', 'application/pdf', 'Science Notes', '1LqiuR4Fb8UUSeX9GCzxGOsCFdXNsHUT3'))
        .toBe('Science Notes_1LqiuR.pdf');

      expect(PersonalDriveService.normalizeAttachmentFileName('( ).pdf', 'application/pdf', '', '1LqiuR4Fb8UUSeX9GCzxGOsCFdXNsHUT3'))
        .toBe('Classroom_Doc_1LqiuR.pdf');

      expect(PersonalDriveService.normalizeAttachmentFileName('---', 'application/pdf', undefined, 'abcdef123456'))
        .toBe('Classroom_Doc_abcdef.pdf');

      // Placeholders like Collapse topic, View material, Item 63 are discarded in favor of Classroom_Doc
      expect(PersonalDriveService.normalizeAttachmentFileName('().pdf', 'application/pdf', 'Collapse topic', 'abcdef123456'))
        .toBe('Classroom_Doc_abcdef.pdf');

      expect(PersonalDriveService.normalizeAttachmentFileName('.pdf', 'application/pdf', 'View material', 'abcdef123456'))
        .toBe('Classroom_Doc_abcdef.pdf');

      expect(PersonalDriveService.normalizeAttachmentFileName('', 'application/pdf', 'Item 63', 'abcdef123456'))
        .toBe('Classroom_Doc_abcdef.pdf');

      expect(PersonalDriveService.normalizeAttachmentFileName('().png', 'image/png', 'Item 65', 'img123456789'))
        .toBe('Classroom_Doc_img123.pdf');

      // Valid English and Devanagari titles preserved
      expect(PersonalDriveService.normalizeAttachmentFileName('8SCI5.InsidetheAtom.pdf', 'application/pdf'))
        .toBe('8SCI5.InsidetheAtom.pdf');

      expect(PersonalDriveService.normalizeAttachmentFileName('8th-Dicatationwords(Marathi).pdf', 'application/pdf'))
        .toBe('8th-Dicatationwords(Marathi).pdf');

      expect(PersonalDriveService.normalizeAttachmentFileName('मराठी निबंध.pdf', 'application/pdf'))
        .toBe('मराठी निबंध.pdf');

      // Trailing format badges stripped
      expect(PersonalDriveService.normalizeAttachmentFileName('Circular Notice.pdfPDF', 'application/pdf'))
        .toBe('Circular Notice.pdf');
    });

    it('ClassroomBrowserExtractor.cleanAttachmentTitle handles empty, ().pdf, and .pdf titles with fallback', () => {
      expect(ClassroomBrowserExtractor.cleanAttachmentTitle('().pdf', 'Hindi Notes', '104yZlqqoAotPTbDwo-3NDzQ97s94erho'))
        .toBe('Hindi Notes_104yZl.pdf');

      expect(ClassroomBrowserExtractor.cleanAttachmentTitle('.pdf', 'Health & Disease', '12WLZWZ-uCAVC8f6E2ikSGPZpy6NmPXiw'))
        .toBe('Health & Disease_12WLZW.pdf');

      expect(ClassroomBrowserExtractor.cleanAttachmentTitle('Attachment: PDF', 'Atom Structure', '1xLDz5oC3ReUtfRcmbURKuTI8Wqq_hWec'))
        .toBe('Atom Structure_1xLDz5.pdf');

      expect(ClassroomBrowserExtractor.cleanAttachmentTitle('Attachment: STD8SCILE.2HEALTHANDDISEASES.pdf PDF'))
        .toBe('STD8SCILE.2HEALTHANDDISEASES.pdf');

      expect(ClassroomBrowserExtractor.cleanAttachmentTitle('मराठी वाचन.pdf'))
        .toBe('मराठी वाचन.pdf');

      // Placeholders like Collapse topic or Item X are discarded
      expect(ClassroomBrowserExtractor.cleanAttachmentTitle('().pdf', 'Collapse topic', '104yZlqqoAotPTbDwo-3NDzQ97s94erho'))
        .toBe('Classroom_Doc_104yZl.pdf');

      expect(ClassroomBrowserExtractor.cleanAttachmentTitle('().pdf', 'Item 63', '104yZlqqoAotPTbDwo-3NDzQ97s94erho'))
        .toBe('Classroom_Doc_104yZl.pdf');
    });
  });

  describe('Auto-Collapsing Accordion & Topic Header Filtering in scrapeCourseClassworkTab', () => {
    it('extracts attachments sequentially even when Classroom auto-collapses previous cards and filters topic headers', async () => {
      let injectedFunc: ((pfx: string, cId: string) => Promise<any>) | null = null;
      (globalThis as any).chrome = {
        tabs: {
          query: vi.fn().mockResolvedValue([]),
          create: vi.fn().mockResolvedValue({ id: 888 }),
          remove: vi.fn().mockResolvedValue(undefined),
          onUpdated: { addListener: vi.fn(), removeListener: vi.fn() }
        },
        scripting: {
          executeScript: vi.fn().mockImplementation(async (opts: any) => {
            injectedFunc = opts.func;
            return [{ result: null }];
          })
        }
      };

      await ClassroomBrowserExtractor.scrapeCourseClassworkTab('test_course', '/u/2');
      expect(injectedFunc).toBeTypeOf('function');

      // Mock DOM supporting Classroom accordion auto-collapse
      class MockDOMNode {
        tagName: string;
        attributes: Record<string, string> = {};
        textContent: string = '';
        children: MockDOMNode[] = [];
        parentElement: MockDOMNode | null = null;
        isOpen: boolean = false;

        constructor(tag: string, attrs: Record<string, string> = {}, text = '') {
          this.tagName = tag.toUpperCase();
          this.attributes = { ...attrs };
          this.textContent = text;
        }

        appendChild(child: MockDOMNode) {
          child.parentElement = this;
          this.children.push(child);
          return child;
        }

        getAttribute(name: string) { return this.attributes[name] ?? null; }
        hasAttribute(name: string) { return name in this.attributes; }
        setAttribute(name: string, val: string) { this.attributes[name] = val; }
        removeAttribute(name: string) { delete this.attributes[name]; }
        scrollIntoView() {}

        click() {
          if (this.attributes['aria-expanded'] === 'false') {
            this.attributes['aria-expanded'] = 'true';
            this.isOpen = true;
          }
        }

        closest(sel: string): MockDOMNode | null {
          let curr: MockDOMNode | null = this;
          while (curr) {
            if (curr.matches(sel)) return curr;
            curr = curr.parentElement;
          }
          return null;
        }

        matches(sel: string): boolean {
          const parts = sel.split(',').map(s => s.trim().toLowerCase());
          return parts.some(p => {
            if (p === 'ol[role="list"]') return this.tagName === 'OL' && this.getAttribute('role') === 'list';
            if (p.includes('ol[role="list"]') && p.includes('li')) return this.tagName === 'LI';
            if (p === 'section') return this.tagName === 'SECTION';
            if (p === 'li') return this.tagName === 'LI';
            if (p === 'a') return this.tagName === 'A';
            if (p === 'h2') return this.tagName === 'H2';
            if (p === 'h3') return this.tagName === 'H3';
            if (p === '[role="heading"]') return this.getAttribute('role') === 'heading';
            if (p.includes('heading') && p.includes('aria-level="2"')) return this.getAttribute('role') === 'heading' && this.getAttribute('aria-level') === '2';
            if (p.includes('heading') && p.includes('aria-level="3"')) return this.getAttribute('role') === 'heading' && this.getAttribute('aria-level') === '3';
            if (p === 'div[role="button"]') return this.tagName === 'DIV' && this.getAttribute('role') === 'button';
            if (p === '[aria-expanded]') return this.hasAttribute('aria-expanded');
            if (p === '[aria-expanded="false"]') return this.getAttribute('aria-expanded') === 'false';
            if (p === '[aria-expanded="true"]') return this.getAttribute('aria-expanded') === 'true';
            if (p === '[data-item-id]') return this.hasAttribute('data-item-id');
            if (p.includes('role="dialog"')) return this.getAttribute('role') === 'dialog';
            if (p.includes('data-modal-scraped')) return this.hasAttribute('data-modal-scraped');
            if (p.startsWith('a[href*=')) {
              const m = p.match(/a\[href\*=["']?([^"']+)["']?\]/i);
              return this.tagName === 'A' && (this.getAttribute('href') || '').toLowerCase().includes((m?.[1] || '').toLowerCase());
            }
            if (p.includes('title')) return (this.getAttribute('class') || '').toLowerCase().includes('title');
            if (p.includes('more')) return (this.getAttribute('class') || '').toLowerCase().includes('more') || (this.getAttribute('aria-label') || '').toLowerCase().includes('more');
            return false;
          });
        }

        querySelectorAll(sel: string): MockDOMNode[] {
          const res: MockDOMNode[] = [];
          const walk = (node: MockDOMNode) => {
            for (const c of node.children) {
              if (c.matches(sel)) res.push(c);
              walk(c);
            }
          };
          walk(this);
          return res;
        }

        querySelector(sel: string): MockDOMNode | null {
          return this.querySelectorAll(sel)[0] || null;
        }
      }

      const body = new MockDOMNode('body');
      const list = body.appendChild(new MockDOMNode('ol', { role: 'list' }));

      // Topic: Science
      const topicLi = list.appendChild(new MockDOMNode('li'));
      topicLi.appendChild(new MockDOMNode('h2', {}, 'Science'));

      // Topic Header Button ("Collapse topic") - MUST NOT be scraped as a material!
      topicLi.appendChild(new MockDOMNode('div', { role: 'button', 'aria-expanded': 'true', 'aria-label': 'Collapse topic' }, 'Collapse topic'));

      const cardsContainer = topicLi.appendChild(new MockDOMNode('div'));

      // Card 1
      const card1 = cardsContainer.appendChild(new MockDOMNode('div', { 'data-item-id': 'item_1_id' }));
      const toggle1 = card1.appendChild(new MockDOMNode('div', { role: 'button', 'aria-expanded': 'false' }));
      toggle1.appendChild(new MockDOMNode('h3', {}, 'Force and Pressure'));
      const attDiv1 = card1.appendChild(new MockDOMNode('div'));
      attDiv1.appendChild(new MockDOMNode('a', { href: 'https://drive.google.com/file/d/drive_id_11111111111111111111/view' }, 'Force_Pressure.pdf'));

      // Card 2
      const card2 = cardsContainer.appendChild(new MockDOMNode('div', { 'data-item-id': 'item_2_id' }));
      const toggle2 = card2.appendChild(new MockDOMNode('div', { role: 'button', 'aria-expanded': 'false' }));
      toggle2.appendChild(new MockDOMNode('h3', {}, 'Inside the Atom'));
      const attDiv2 = card2.appendChild(new MockDOMNode('div'));
      attDiv2.appendChild(new MockDOMNode('a', { href: 'https://drive.google.com/file/d/drive_id_22222222222222222222/view' }, 'Inside_Atom.pdf'));

      // Simulate Classroom accordion: expanding Card 2 collapses Card 1 and unmounts attachments
      const origToggle2Click = toggle2.click.bind(toggle2);
      toggle2.click = () => {
        origToggle2Click();
        toggle1.setAttribute('aria-expanded', 'false');
        attDiv1.children = [];
      };

      (globalThis as any).document = {
        querySelectorAll: (sel: string) => body.querySelectorAll(sel),
        querySelector: (sel: string) => body.querySelector(sel),
        documentElement: { innerHTML: '' }
      };
      (globalThis as any).window = {
        scrollY: 0,
        scrollBy: vi.fn()
      };

      const origSetTimeout = globalThis.setTimeout;
      (globalThis as any).setTimeout = (fn: any, ms?: number) => origSetTimeout(fn, 1);

      let res: any;
      try {
        res = await injectedFunc!('/u/2', 'test_course');
      } finally {
        globalThis.setTimeout = origSetTimeout;
      }

      // Assertions:
      // 1. "Collapse topic" topic header was filtered out and NOT added as a material!
      const collapseTopicMat = res.materials.find((m: any) => m.title.toLowerCase().includes('collapse topic'));
      expect(collapseTopicMat).toBeUndefined();

      // 2. Both Card 1 and Card 2 were extracted with their real titles and real attachments!
      expect(res.materials.length).toBe(2);

      const mat1 = res.materials.find((m: any) => m.id === 'item_1_id');
      expect(mat1).toBeDefined();
      expect(mat1.title).toBe('Force and Pressure');
      expect(mat1.attachments.length).toBe(1);
      expect(mat1.attachments[0].fileId).toBe('drive_id_11111111111111111111');

      const mat2 = res.materials.find((m: any) => m.id === 'item_2_id');
      expect(mat2).toBeDefined();
      expect(mat2.title).toBe('Inside the Atom');
      expect(mat2.attachments.length).toBe(1);
      expect(mat2.attachments[0].fileId).toBe('drive_id_22222222222222222222');

      expect(res.attachmentsCount).toBe(2);
    });

    it('ignores "View material" action links for card titles and captures modal overflow attachments on document.body', async () => {
      let injectedFunc: ((pfx: string, cId: string) => Promise<any>) | null = null;
      (globalThis as any).chrome = {
        tabs: {
          query: vi.fn().mockResolvedValue([]),
          create: vi.fn().mockResolvedValue({ id: 889 }),
          remove: vi.fn().mockResolvedValue(undefined),
          onUpdated: { addListener: vi.fn(), removeListener: vi.fn() }
        },
        scripting: {
          executeScript: vi.fn().mockImplementation(async (opts: any) => {
            injectedFunc = opts.func;
            return [{ result: null }];
          })
        }
      };

      await ClassroomBrowserExtractor.scrapeCourseClassworkTab('test_course_action', '/u/2');
      expect(injectedFunc).toBeTypeOf('function');

      class MockDOMNode2 {
        tagName: string;
        attributes: Record<string, string> = {};
        textContent: string = '';
        children: MockDOMNode2[] = [];
        parentElement: MockDOMNode2 | null = null;
        isOpen: boolean = false;

        constructor(tag: string, attrs: Record<string, string> = {}, text = '') {
          this.tagName = tag.toUpperCase();
          this.attributes = { ...attrs };
          this.textContent = text;
        }

        appendChild(child: MockDOMNode2) {
          child.parentElement = this;
          this.children.push(child);
          return child;
        }

        getAttribute(name: string) { return this.attributes[name] ?? null; }
        hasAttribute(name: string) { return name in this.attributes; }
        setAttribute(name: string, val: string) { this.attributes[name] = val; }
        removeAttribute(name: string) { delete this.attributes[name]; }
        scrollIntoView() {}

        click() {
          if (this.attributes['aria-expanded'] === 'false') {
            this.attributes['aria-expanded'] = 'true';
            this.isOpen = true;
          }
        }

        closest(sel: string): MockDOMNode2 | null {
          let curr: MockDOMNode2 | null = this;
          while (curr) {
            if (curr.matches(sel)) return curr;
            curr = curr.parentElement;
          }
          return null;
        }

        matches(sel: string): boolean {
          const parts = sel.split(',').map(s => s.trim().toLowerCase());
          return parts.some(p => {
            if (p === 'ol[role="list"]') return this.tagName === 'OL' && this.getAttribute('role') === 'list';
            if (p.includes('ol[role="list"]') && p.includes('li')) return this.tagName === 'LI';
            if (p === 'section') return this.tagName === 'SECTION';
            if (p === 'li') return this.tagName === 'LI';
            if (p === 'a') return this.tagName === 'A';
            if (p === 'h2') return this.tagName === 'H2';
            if (p === 'h3') return this.tagName === 'H3';
            if (p === '[role="heading"]') return this.getAttribute('role') === 'heading';
            if (p === 'div[role="button"]') return this.tagName === 'DIV' && this.getAttribute('role') === 'button';
            if (p === '[aria-expanded]') return this.hasAttribute('aria-expanded');
            if (p === '[aria-expanded="false"]') return this.getAttribute('aria-expanded') === 'false';
            if (p === '[aria-expanded="true"]') return this.getAttribute('aria-expanded') === 'true';
            if (p === '[data-item-id]') return this.hasAttribute('data-item-id');
            if (p.includes('role="dialog"')) return this.getAttribute('role') === 'dialog';
            if (p.includes('data-modal-scraped')) return this.hasAttribute('data-modal-scraped');
            if (p.startsWith('a[href*=')) {
              const m = p.match(/a\[href\*=["']?([^"']+)["']?\]/i);
              return this.tagName === 'A' && (this.getAttribute('href') || '').toLowerCase().includes((m?.[1] || '').toLowerCase());
            }
            if (p.includes('title')) return (this.getAttribute('class') || '').toLowerCase().includes('title');
            if (p.includes('more')) return (this.getAttribute('class') || '').toLowerCase().includes('more') || (this.getAttribute('aria-label') || '').toLowerCase().includes('more');
            return false;
          });
        }

        querySelectorAll(sel: string): MockDOMNode2[] {
          const res: MockDOMNode2[] = [];
          const walk = (node: MockDOMNode2) => {
            for (const c of node.children) {
              if (c.matches(sel)) res.push(c);
              walk(c);
            }
          };
          walk(this);
          return res;
        }

        querySelector(sel: string): MockDOMNode2 | null {
          return this.querySelectorAll(sel)[0] || null;
        }
      }

      const body = new MockDOMNode2('body');
      const list = body.appendChild(new MockDOMNode2('ol', { role: 'list' }));

      // Topic: Moral Science
      const topicLi = list.appendChild(new MockDOMNode2('li'));
      topicLi.appendChild(new MockDOMNode2('h2', {}, 'Moral Science'));

      // Card with aria-label on expand toggle, a "View material" action link, and an overflow modal
      const card = topicLi.appendChild(new MockDOMNode2('div', { 'data-item-id': 'item_ms_1' }));
      const toggle = card.appendChild(new MockDOMNode2('div', {
        role: 'button',
        'aria-expanded': 'false',
        'aria-label': 'Material: Chapter 4 Being Trustworthy. Posted Jul 15'
      }));
      // Action link inside card - text is "View material", NOT the title!
      card.appendChild(new MockDOMNode2('a', { href: '/u/2/c/123/m/item_ms_1/details' }, 'View material'));

      // In-card attachment
      const attDiv = card.appendChild(new MockDOMNode2('div'));
      attDiv.appendChild(new MockDOMNode2('a', { href: 'https://drive.google.com/file/d/drive_att_primary_111/view' }, 'Trustworthy_Part1.pdf'));

      // Overflow button "+1 more"
      const overflowBtn = card.appendChild(new MockDOMNode2('button', { 'aria-label': '+1 more' }, '+1 more'));

      // When overflow button clicked, attach modal dialog to body
      overflowBtn.click = () => {
        const dialog = body.appendChild(new MockDOMNode2('div', { role: 'dialog' }));
        dialog.appendChild(new MockDOMNode2('a', { href: 'https://drive.google.com/file/d/drive_att_overflow_222/view' }, 'Trustworthy_Part2.pdf'));
        dialog.appendChild(new MockDOMNode2('button', { 'aria-label': 'close' }, 'Close'));
      };

      (globalThis as any).document = {
        querySelectorAll: (sel: string) => body.querySelectorAll(sel),
        querySelector: (sel: string) => body.querySelector(sel),
        documentElement: { innerHTML: '' }
      };
      (globalThis as any).window = {
        scrollY: 0,
        scrollBy: vi.fn()
      };

      const origSetTimeout = globalThis.setTimeout;
      (globalThis as any).setTimeout = (fn: any, ms?: number) => origSetTimeout(fn, 1);

      let res: any;
      try {
        res = await injectedFunc!('/u/2', 'test_course_action');
      } finally {
        globalThis.setTimeout = origSetTimeout;
      }

      expect(res.materials.length).toBe(1);
      const mat = res.materials[0];
      // Title must NOT be "View material" or have ". Posted Jul 15"
      expect(mat.title).toBe('Chapter 4 Being Trustworthy');
      // Must capture BOTH attachments: the in-card attachment and the modal overflow attachment!
      expect(mat.attachments.length).toBe(2);
      expect(mat.attachments.some((a: any) => a.fileId === 'drive_att_primary_111')).toBe(true);
      expect(mat.attachments.some((a: any) => a.fileId === 'drive_att_overflow_222')).toBe(true);
    });
  });

  describe('OCR Trigger RPC Timeout', () => {
    it('uses 60-second timeout for run_vault_ocr_indexing and 30-second default for general RPC calls', async () => {
      let timeoutSetMs: number | null = null;

      const origFetch = globalThis.fetch;
      const origSetTimeout = globalThis.setTimeout;

      vi.spyOn(globalThis, 'setTimeout').mockImplementation(((fn: any, ms?: number) => {
        timeoutSetMs = ms ?? null;
        return 12345 as any;
      }) as any);

      vi.spyOn(globalThis, 'clearTimeout').mockImplementation(() => {});

      (globalThis as any).fetch = vi.fn().mockImplementation(async (url: string, opts: any) => {
        return {
          ok: true,
          json: async () => ({ result: { success: true, indexed: 10 } })
        };
      });

      try {
        // Test run_vault_ocr_indexing RPC timeout
        const ocrRes = await PersonalDriveService.callGasWorkerRpc(
          'https://script.google.com/macros/s/test/exec',
          'run_vault_ocr_indexing',
          { targetFolderId: 'folder_123', maxBatch: 15 }
        );

        expect(ocrRes.success).toBe(true);
        // Timeout for run_vault_ocr_indexing must be 60000ms (60 seconds)
        expect(timeoutSetMs).toBe(60000);

        // Test general RPC call timeout
        await PersonalDriveService.callGasWorkerRpc(
          'https://script.google.com/macros/s/test/exec',
          'get_vault_file',
          { folderId: 'folder_123', fileName: 'data.json' }
        );

        // Default timeout must be 30000ms (30 seconds), not 12000ms
        expect(timeoutSetMs).toBe(30000);
      } finally {
        globalThis.fetch = origFetch;
        globalThis.setTimeout = origSetTimeout;
      }
    });
  });
});
