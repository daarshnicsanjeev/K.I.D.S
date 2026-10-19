import { describe, it, expect } from 'vitest';
import { KnowledgeGraphBuilder, SchoolKnowledgeGraph } from '../src/services/knowledgeGraphBuilder';

describe('KnowledgeGraphBuilder & Master Digest Engine', () => {

  const mockClassroomData = {
    courses: [
      {
        id: 'c_sci_101',
        name: 'Science Grade 5',
        section: '5-B',
        room: 'Lab 2',
        teacherName: 'Mrs. Sharma',
        courseWork: [
          {
            id: 'cw_plant_01',
            title: 'Plant Life Cycle Worksheet',
            description: 'Read pages 34-40 and answer questions 1 to 5',
            dueDate: { year: 2026, month: 9, day: 22 },
            maxPoints: 50
          }
        ]
      },
      {
        id: 'c_math_102',
        name: 'Mathematics',
        teacherName: 'Mr. Verma',
        courseWork: [
          {
            id: 'cw_frac_02',
            title: 'Fractions Problem Set',
            dueDate: { year: 2026, month: 9, day: 25 },
            maxPoints: 20
          }
        ]
      }
    ]
  };

  const mockGmailData = {
    emails: [
      {
        id: 'em_field_trip',
        subject: 'Annual Science Museum Field Trip Permission Slip',
        from: 'principal@school.edu',
        date: '2026-09-14',
        urgency: 'URGENT',
        attachments: ['Field_Trip_Permission_Slip.pdf']
      }
    ]
  };

  const mockPortalData = {
    domain: 'edusprint.in',
    notices: [
      {
        id: 'pn_half_day',
        title: 'Half Day Notice for Teacher Workshop',
        date: '2026-09-15',
        urgent: true
      }
    ]
  };

  const mockWhatsAppData = {
    groupName: '5-B Cambridge Official',
    messages: [
      {
        id: 'wa_msg_01',
        sender: 'Mrs. Sharma',
        date: '2026-09-15',
        time: '6:30 PM',
        body: 'Reminder: Please submit the Plant Life Cycle worksheet before Friday.',
        detectedLinks: ['https://drive.google.com/open?id=12345']
      }
    ]
  };

  it('builds full initial knowledge graph with nodes, edges, and statistics', () => {
    const graph = KnowledgeGraphBuilder.buildInitialGraph({
      childId: 'kid_atharva_123',
      childName: 'Atharva',
      academicYear: '2026-2027',
      classroomData: mockClassroomData,
      gmailData: mockGmailData,
      portalData: mockPortalData,
      whatsappData: mockWhatsAppData
    });

    expect(graph.childName).toBe('Atharva');
    expect(graph.academicYear).toBe('2026-2027');
    expect(graph.stats.courseCount).toBe(2);
    expect(graph.stats.assignmentCount).toBe(2);
    expect(graph.stats.circularCount).toBe(1);
    expect(graph.stats.portalNoticeCount).toBe(1);
    expect(graph.stats.chatMessageCount).toBe(1);

    // Node checks
    const childNode = graph.nodes.find(n => n.type === 'Child');
    expect(childNode).toBeDefined();
    expect(childNode?.label).toBe('Atharva');

    const teacherNode = graph.nodes.find(n => n.type === 'Teacher' && n.label === 'Mrs. Sharma');
    expect(teacherNode).toBeDefined();

    const attachmentNode = graph.nodes.find(n => n.type === 'Attachment');
    expect(attachmentNode?.label).toBe('Field_Trip_Permission_Slip.pdf');

    // Edge checks
    const assignmentEdge = graph.edges.find(e => e.source === 'assignment_cw_plant_01' && e.target === 'course_c_sci_101');
    expect(assignmentEdge).toBeDefined();
    expect(assignmentEdge?.relation).toBe('BELONGS_TO');

    const teacherEdge = graph.edges.find(e => e.source === 'course_c_sci_101' && e.relation === 'ASSIGNED_BY');
    expect(teacherEdge).toBeDefined();
  });

  it('patches existing graph incrementally with delta additions', () => {
    const initialGraph = KnowledgeGraphBuilder.buildInitialGraph({
      childId: 'kid_atharva_123',
      childName: 'Atharva',
      academicYear: '2026-2027',
      classroomData: mockClassroomData
    });

    expect(initialGraph.stats.circularCount).toBe(0);
    expect(initialGraph.stats.chatMessageCount).toBe(0);

    // Delta update with newly arrived WhatsApp message and Email
    const patchedGraph = KnowledgeGraphBuilder.patchKnowledgeGraph(initialGraph, {
      gmailData: mockGmailData,
      whatsappData: mockWhatsAppData
    });

    expect(patchedGraph.stats.courseCount).toBe(2);
    expect(patchedGraph.stats.circularCount).toBe(1);
    expect(patchedGraph.stats.chatMessageCount).toBe(1);
    expect(patchedGraph.nodes.length).toBeGreaterThan(initialGraph.nodes.length);
  });

  it('generates rich, sorted MASTER_DIGEST.md optimized for Gemini Spark', () => {
    const graph = KnowledgeGraphBuilder.buildInitialGraph({
      childId: 'kid_atharva_123',
      childName: 'Atharva',
      academicYear: '2026-2027',
      classroomData: mockClassroomData,
      gmailData: mockGmailData,
      portalData: mockPortalData,
      whatsappData: mockWhatsAppData
    });

    const md = KnowledgeGraphBuilder.generateMasterDigestMarkdown(graph);

    expect(md).toContain('# 🎓 Academic Knowledge Digest: Atharva (2026-2027)');
    expect(md).toContain('## 🚨 Urgent & Upcoming Deadlines');
    expect(md).toContain('Fractions Problem Set');
    expect(md).toContain('Plant Life Cycle Worksheet');
    expect(md).toContain('## 📢 Recent School Circulars & Portal Notices');
    expect(md).toContain('Annual Science Museum Field Trip Permission Slip');
    expect(md).toContain('Field_Trip_Permission_Slip.pdf');
    expect(md).toContain('## 💬 Recent Teacher Broadcasts & Group Notices');
    expect(md).toContain('Mrs. Sharma');
    expect(md).toContain('## 📚 Enrolled Courses & Faculty Directory');
    expect(md).toContain('Science Grade 5 (Teacher: Mrs. Sharma)');
  });

  it('generates multi-child FAMILY_DIGEST.md combining multiple profiles', () => {
    const graphAtharva = KnowledgeGraphBuilder.buildInitialGraph({
      childId: 'kid_atharva_123',
      childName: 'Atharva',
      academicYear: '2026-2027',
      classroomData: mockClassroomData
    });

    const graphAnanya = KnowledgeGraphBuilder.buildInitialGraph({
      childId: 'kid_ananya_456',
      childName: 'Ananya',
      academicYear: '2026-2027',
      gmailData: {
        emails: [
          {
            id: 'em_ananya_dance',
            subject: 'Grade 1 Annual Day Dance Practice Schedule',
            date: '2026-09-15',
            urgency: 'URGENT'
          }
        ]
      }
    });

    const familyMd = KnowledgeGraphBuilder.generateFamilyDigestMarkdown([graphAtharva, graphAnanya]);

    expect(familyMd).toContain('# 👨‍👩‍👧‍👦 Unified Family Academic Digest (K.I.D.S.)');
    expect(familyMd).toContain('### 👤 Atharva');
    expect(familyMd).toContain('Fractions Problem Set');
    expect(familyMd).toContain('### 👤 Ananya');
    expect(familyMd).toContain('Grade 1 Annual Day Dance Practice Schedule');
  });

  it('generates self-contained interactive visual graph HTML', () => {
    const graph = KnowledgeGraphBuilder.buildInitialGraph({
      childId: 'kid_atharva_123',
      childName: 'Atharva',
      academicYear: '2026-2027',
      classroomData: mockClassroomData
    });

    const html = KnowledgeGraphBuilder.generateVisualGraphHtml(graph);
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain("Atharva's Knowledge Graph");
    expect(html).toContain('<canvas id="canvas">');
    expect(html).toContain('const data =');
  });
});
