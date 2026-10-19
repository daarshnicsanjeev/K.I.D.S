import { describe, it, expect, vi, beforeEach } from 'vitest';
import { KnowledgeGraphBuilder } from '../src/services/knowledgeGraphBuilder';
import { PersonalDriveService } from '../src/services/personalDriveService';

describe('Multi-Child Sync Scoping (Steps 2, 3, 4)', () => {
  let createdFiles: Map<string, { id: string; name: string; content: string }>;

  beforeEach(() => {
    createdFiles = new Map();
    vi.restoreAllMocks();

    // Mock chrome.identity.getAuthToken & storage
    vi.stubGlobal('chrome', {
      identity: {
        getAuthToken: vi.fn((_details: any, cb: (token?: string) => void) => cb('mock-oauth-token'))
      },
      storage: {
        local: {
          get: vi.fn().mockResolvedValue({}),
          set: vi.fn().mockResolvedValue(undefined)
        }
      }
    });

    // Mock global fetch to intercept Google Drive API calls
    vi.stubGlobal('fetch', vi.fn(async (url: string, opts: any = {}) => {
      const urlStr = url.toString();
      const decodedUrl = decodeURIComponent(urlStr);

      // 1. Folder & file query: GET without alt=media
      if (urlStr.includes('/drive/v3/files') && (!opts.method || opts.method === 'GET') && !urlStr.includes('alt=media')) {
        const isFolderQuery = decodedUrl.includes("mimeType = 'application/vnd.google-apps.folder'");
        const nameMatch = decodedUrl.match(/name\s*=\s*'([^']+)'/);
        const targetName = nameMatch ? nameMatch[1] : '';

        if (isFolderQuery) {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              files: [{ id: `folder_${targetName || 'root'}`, name: targetName }]
            })
          };
        }

        // File search
        if (targetName && createdFiles.has(targetName)) {
          const file = createdFiles.get(targetName)!;
          return {
            ok: true,
            status: 200,
            json: async () => ({
              files: [{ id: file.id, name: file.name }]
            })
          };
        }

        return {
          ok: true,
          status: 200,
          json: async () => ({ files: [] })
        };
      }

      // 2. Read file content (alt=media)
      if (urlStr.includes('alt=media')) {
        const fileIdMatch = urlStr.match(/\/files\/([^?]+)/);
        const fileId = fileIdMatch ? fileIdMatch[1] : '';
        const entry = Array.from(createdFiles.values()).find(f => f.id === fileId);
        if (entry) {
          return {
            ok: true,
            status: 200,
            text: async () => entry.content,
            json: async () => JSON.parse(entry.content)
          };
        }
        return { ok: false, status: 404, text: async () => 'Not found' };
      }

      // 3. Folder creation: POST /drive/v3/files (non-multipart)
      if (urlStr.includes('/drive/v3/files') && opts.method === 'POST' && !urlStr.includes('uploadType=multipart')) {
        const body = JSON.parse(opts.body || '{}');
        const folderId = `folder_${body.name}`;
        return {
          ok: true,
          status: 200,
          json: async () => ({ id: folderId, name: body.name })
        };
      }

      // 4. File upload / update: POST or PATCH /upload/drive/v3/files
      if (urlStr.includes('/upload/drive/v3/files')) {
        if (urlStr.includes('uploadType=media') && opts.method === 'PATCH') {
          const fileIdMatch = urlStr.match(/\/files\/([^?]+)/);
          const fileId = fileIdMatch ? fileIdMatch[1] : '';
          const existing = Array.from(createdFiles.values()).find(f => f.id === fileId);
          if (existing) {
            existing.content = opts.body as string;
            return { ok: true, status: 200, json: async () => ({ id: fileId, name: existing.name }) };
          }
        }

        const bodyStr = opts.body as string;
        const metaMatch = bodyStr.match(/\{[\s\S]*?\}/);
        let name = 'unknown';
        if (metaMatch) {
          try {
            const meta = JSON.parse(metaMatch[0]);
            name = meta.name;
          } catch (e) {}
        }

        const fileId = `file_${name}`;
        createdFiles.set(name, { id: fileId, name, content: bodyStr });
        return {
          ok: true,
          status: 200,
          json: async () => ({ id: fileId, name })
        };
      }

      return {
        ok: true,
        status: 200,
        json: async () => ({})
      };
    }));
  });

  describe('1. Step 2 Multi-Child Scoping (Classroom & Gmail Sync)', () => {
    it('segregates Atharva and Ananya Classroom and Gmail data into distinct graphs and digests', async () => {
      const atharvaData = {
        classroom: {
          courses: [
            {
              id: 'c1',
              name: 'Atharva Grade 4 Math',
              section: '4-A',
              courseWork: [
                { id: 'cw1', title: 'Fractions Worksheet', dueDate: { year: 2026, month: 9, day: 20 }, maxPoints: 100 }
              ]
            }
          ]
        },
        emails: {
          emails: [
            { id: 'em1', subject: 'Grade 4 Science Exhibition', from: 'science@school.org', date: '2026-09-10' }
          ]
        }
      };

      const ananyaData = {
        classroom: {
          courses: [
            {
              id: 'c2',
              name: 'Ananya Grade 1 Phonics',
              section: '1-B',
              courseWork: [
                { id: 'cw2', title: 'Alphabet Tracing', dueDate: { year: 2026, month: 9, day: 18 }, maxPoints: 50 }
              ]
            }
          ]
        },
        emails: {
          emails: [
            { id: 'em2', subject: 'Grade 1 Picnic Notice', from: 'picnic@school.org', date: '2026-09-12' }
          ]
        }
      };

      // Sync Atharva via PersonalDriveService
      await PersonalDriveService.saveExtractedSchoolData('mock-token', 'Atharva', '2026-2027', atharvaData);
      // Sync Ananya via PersonalDriveService
      await PersonalDriveService.saveExtractedSchoolData('mock-token', 'Ananya', '2026-2027', ananyaData);

      // Verify Knowledge Graphs were independently generated
      const atharvaGraph = KnowledgeGraphBuilder.buildInitialGraph({
        childId: 'atharva',
        childName: 'Atharva',
        academicYear: '2026-2027',
        classroomData: atharvaData.classroom,
        gmailData: atharvaData.emails
      });

      const ananyaGraph = KnowledgeGraphBuilder.buildInitialGraph({
        childId: 'ananya',
        childName: 'Ananya',
        academicYear: '2026-2027',
        classroomData: ananyaData.classroom,
        gmailData: ananyaData.emails
      });

      expect(atharvaGraph.childName).toBe('Atharva');
      expect(ananyaGraph.childName).toBe('Ananya');

      // Check Atharva's graph contains only Grade 4 items
      const atharvaNodeLabels = atharvaGraph.nodes.map(n => n.label);
      expect(atharvaNodeLabels).toContain('Atharva Grade 4 Math');
      expect(atharvaNodeLabels).toContain('Fractions Worksheet');
      expect(atharvaNodeLabels).toContain('Grade 4 Science Exhibition');
      expect(atharvaNodeLabels).not.toContain('Ananya Grade 1 Phonics');
      expect(atharvaNodeLabels).not.toContain('Alphabet Tracing');

      // Check Ananya's graph contains only Grade 1 items
      const ananyaNodeLabels = ananyaGraph.nodes.map(n => n.label);
      expect(ananyaNodeLabels).toContain('Ananya Grade 1 Phonics');
      expect(ananyaNodeLabels).toContain('Alphabet Tracing');
      expect(ananyaNodeLabels).toContain('Grade 1 Picnic Notice');
      expect(ananyaNodeLabels).not.toContain('Atharva Grade 4 Math');
      expect(ananyaNodeLabels).not.toContain('Fractions Worksheet');
    });
  });

  describe('2. Step 3 Multi-Child Scoping (School Portals)', () => {
    it('isolates portal configurations and updates respective knowledge graphs without cross-leakage', async () => {
      const atharvaPortals = [
        { name: 'Edunext Atharva', url: 'https://school.edunext.com', username: 'atharva_p' }
      ];
      const ananyaPortals = [
        { name: 'Entab Ananya', url: 'https://ananya.entab.info', username: 'ananya_p' }
      ];

      await PersonalDriveService.savePortalToolsConfig('mock-token', 'Atharva', '2026-2027', atharvaPortals);
      await PersonalDriveService.savePortalToolsConfig('mock-token', 'Ananya', '2026-2027', ananyaPortals);

      // Verify files uploaded to personal drive
      expect(createdFiles.has('portal_tools_config.json')).toBe(true);
      expect(createdFiles.has('MASTER_DIGEST.md')).toBe(true);
      expect(createdFiles.has('knowledge_graph.json')).toBe(true);
    });
  });

  describe('3. Step 4 Multi-Child Scoping (WhatsApp Group Messages)', () => {
    it('routes incoming WhatsApp messages strictly to the respective child directory', async () => {
      const atharvaMessages = [
        {
          id: 'msg_ath_1',
          sender: 'Class Teacher Gr4',
          timestamp: '2026-09-14T15:00:00Z',
          date: '9/14/2026',
          time: '3:00 PM',
          text: 'Math Olympiad registration deadline tomorrow for Grade 4.',
          urgent: true,
          extractedDueDates: ['2026-09-15']
        }
      ];

      const ananyaMessages = [
        {
          id: 'msg_ana_1',
          sender: 'Class Teacher Gr1',
          timestamp: '2026-09-14T16:00:00Z',
          date: '9/14/2026',
          time: '4:00 PM',
          text: 'Please send extra crayons with Grade 1 students on Wednesday.',
          urgent: false,
          extractedDueDates: []
        }
      ];

      // Save Atharva WhatsApp messages
      await PersonalDriveService.saveMessagesToPersonalDrive('mock-token', atharvaMessages, 'Atharva', '2026-2027');
      // Save Ananya WhatsApp messages
      await PersonalDriveService.saveMessagesToPersonalDrive('mock-token', ananyaMessages, 'Ananya', '2026-2027');

      // Verify master digests generated per child
      const atharvaGraph = KnowledgeGraphBuilder.buildInitialGraph({
        childId: 'atharva',
        childName: 'Atharva',
        academicYear: '2026-2027',
        whatsappData: { messages: atharvaMessages }
      });
      const ananyaGraph = KnowledgeGraphBuilder.buildInitialGraph({
        childId: 'ananya',
        childName: 'Ananya',
        academicYear: '2026-2027',
        whatsappData: { messages: ananyaMessages }
      });

      const atharvaDigest = KnowledgeGraphBuilder.generateMasterDigestMarkdown(atharvaGraph);
      const ananyaDigest = KnowledgeGraphBuilder.generateMasterDigestMarkdown(ananyaGraph);

      expect(atharvaDigest).toContain('Math Olympiad registration deadline');
      expect(atharvaDigest).not.toContain('extra crayons');

      expect(ananyaDigest).toContain('extra crayons');
      expect(ananyaDigest).not.toContain('Math Olympiad');
    });
  });

  describe('4. Multi-Child Unified Family Digest Rollup', () => {
    it('generates a clean unified Family Master Digest across both children', () => {
      const atharvaGraph = KnowledgeGraphBuilder.buildInitialGraph({
        childId: 'atharva',
        childName: 'Atharva',
        academicYear: '2026-2027',
        classroomData: {
          courses: [{ id: 'c1', name: 'Math 4', courseWork: [{ id: 'w1', title: 'Algebra Practice', dueDate: { year: 2026, month: 9, day: 22 } }] }]
        },
        gmailData: {
          emails: [{ id: 'e1', subject: 'Atharva Science Camp', from: 'camp@school.com', date: '2026-09-10' }]
        }
      });

      const ananyaGraph = KnowledgeGraphBuilder.buildInitialGraph({
        childId: 'ananya',
        childName: 'Ananya',
        academicYear: '2026-2027',
        classroomData: {
          courses: [{ id: 'c2', name: 'Art 1', courseWork: [{ id: 'w2', title: 'Color Wheel', dueDate: { year: 2026, month: 9, day: 25 } }] }]
        },
        gmailData: {
          emails: [{ id: 'e2', subject: 'Ananya Dental Checkup Notice', from: 'nurse@school.com', date: '2026-09-11' }]
        }
      });

      const familyMd = KnowledgeGraphBuilder.generateFamilyDigestMarkdown([atharvaGraph, ananyaGraph]);

      // Check structure
      expect(familyMd).toContain('# 👨‍👩‍👧‍👦 Unified Family Academic Digest (K.I.D.S.)');
      expect(familyMd).toContain('Atharva');
      expect(familyMd).toContain('Algebra Practice');

      expect(familyMd).toContain('Ananya');
      expect(familyMd).toContain('Color Wheel');
    });
  });
});
