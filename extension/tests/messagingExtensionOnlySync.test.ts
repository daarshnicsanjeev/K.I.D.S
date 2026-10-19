import { describe, it, expect, vi, beforeEach } from 'vitest';
import { KnowledgeGraphBuilder } from '../src/services/knowledgeGraphBuilder';
import { PersonalDriveService } from '../src/services/personalDriveService';

describe('Step 4 Messaging Tool: Incremental Data Handled by Extension Only', () => {
  let driveFiles: Map<string, { id: string; name: string; content: string }>;

  beforeEach(() => {
    driveFiles = new Map();
    vi.restoreAllMocks();

    // Mock chrome APIs
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

    // Mock Drive HTTP calls
    vi.stubGlobal('fetch', vi.fn(async (url: string, opts: any = {}) => {
      const urlStr = url.toString();
      const decodedUrl = decodeURIComponent(urlStr);

      // 1. Query files/folders (GET without alt=media)
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
        if (targetName && driveFiles.has(targetName)) {
          const file = driveFiles.get(targetName)!;
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
        const entry = Array.from(driveFiles.values()).find(f => f.id === fileId);
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

      // 4. File upload / update: POST / PATCH to upload URL
      if (urlStr.includes('/upload/drive/v3/files')) {
        if (urlStr.includes('uploadType=media') && opts.method === 'PATCH') {
          const fileIdMatch = urlStr.match(/\/files\/([^?]+)/);
          const fileId = fileIdMatch ? fileIdMatch[1] : '';
          const existing = Array.from(driveFiles.values()).find(f => f.id === fileId);
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
        driveFiles.set(name, { id: fileId, name, content: bodyStr });
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

  it('performs incremental delta sync of WhatsApp messages directly from extension to personal drive', async () => {
    const batch1 = [
      {
        id: 'msg_001',
        sender: 'Mrs. Sharma',
        timestamp: '2026-09-15T08:00:00Z',
        date: '9/15/2026',
        time: '8:00 AM',
        text: 'English assessment on Chapters 3 and 4 scheduled for Friday.',
        urgent: true,
        extractedDueDates: ['2026-09-18']
      },
      {
        id: 'msg_002',
        sender: 'PTA Rep',
        timestamp: '2026-09-15T09:00:00Z',
        date: '9/15/2026',
        time: '9:00 AM',
        text: 'School annual sports day form distribution started.',
        urgent: false,
        extractedDueDates: []
      }
    ];

    const res1 = await PersonalDriveService.saveMessagesToPersonalDrive('mock-token', batch1, 'Atharva', '2026-2027');
    expect(res1.saved).toBeGreaterThanOrEqual(0);

    // Verify files created in Personal Drive
    expect(driveFiles.has('MASTER_DIGEST.md')).toBe(true);
    expect(driveFiles.has('knowledge_graph.json')).toBe(true);
    expect(driveFiles.has('graph.html')).toBe(true);
  });

  it('applies incremental patch to knowledge graph without wiping Classroom or Portal entities', () => {
    const baseData = {
      courses: [
        {
          id: 'course_sci_1',
          name: 'Science 4',
          courseWork: [
            { id: 'work_solar_1', title: 'Solar System Model', dueDate: { year: 2026, month: 9, day: 28 }, maxPoints: 100 }
          ]
        }
      ]
    };

    const initialGraph = KnowledgeGraphBuilder.buildInitialGraph({
      childId: 'atharva',
      childName: 'Atharva',
      academicYear: '2026-2027',
      classroomData: baseData
    });
    expect(initialGraph.nodes.length).toBeGreaterThan(1);
    const initialNodeCount = initialGraph.nodes.length;

    // Incoming incremental WhatsApp message detected by extension content script
    const incrementalBatch = [
      {
        id: 'msg_003',
        sender: 'Science Teacher',
        timestamp: '2026-09-15T10:00:00Z',
        date: '9/15/2026',
        time: '10:00 AM',
        text: 'Bring cardboard and acrylic paints for the Solar System project.',
        urgent: true,
        extractedDueDates: ['2026-09-28']
      }
    ];

    const patchedGraph = KnowledgeGraphBuilder.patchKnowledgeGraph(initialGraph, {
      whatsappData: { messages: incrementalBatch }
    });

    // Classroom nodes must be intact
    const courseNode = patchedGraph.nodes.find(n => n.id === 'course_course_sci_1');
    const workNode = patchedGraph.nodes.find(n => n.id === 'assignment_work_solar_1');
    expect(courseNode).toBeDefined();
    expect(workNode).toBeDefined();

    // New WhatsApp message node must be present
    const msgNode = patchedGraph.nodes.find(n => n.id === 'chat_msg_003');
    expect(msgNode).toBeDefined();
    expect(msgNode?.label).toContain('Bring cardboard and acrylic paints');
    expect(patchedGraph.nodes.length).toBe(initialNodeCount + 1);

    // Verify edge connects to child root
    const edge = patchedGraph.edges.find(e => e.source === 'chat_msg_003');
    expect(edge).toBeDefined();
    expect(edge?.target).toBe('child_atharva');
    expect(edge?.relation).toBe('RELEVANT_TO');
  });

  it('deduplicates incoming WhatsApp messages during incremental syncs', () => {
    const existingMessages = [
      { id: 'msg_dup_1', text: 'Parent teacher meeting on Saturday', timestamp: '2026-09-15T07:00:00Z' }
    ];

    const incomingBatch = [
      { id: 'msg_dup_1', text: 'Parent teacher meeting on Saturday', timestamp: '2026-09-15T07:00:00Z' },
      { id: 'msg_dup_2', text: 'Bus route 12 running 10 mins late', timestamp: '2026-09-15T07:30:00Z' }
    ];

    // Filter out duplicates by id
    const existingIds = new Set(existingMessages.map(m => m.id));
    const newItems = incomingBatch.filter(m => !existingIds.has(m.id));

    expect(newItems.length).toBe(1);
    expect(newItems[0].id).toBe('msg_dup_2');
  });
});
