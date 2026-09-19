/**
 * Kids Intelligent Dashboard System (K.I.D.S.)
 * Knowledge Graph & Master Semantic Digest Engine
 *
 * Builds and incrementally maintains:
 * 1. `_system/knowledge_graph.json` (Machine-readable GraphRAG schema)
 * 2. `MASTER_DIGEST.md` (Living semantic summary optimized for Gemini Spark)
 * 3. `FAMILY_DIGEST.md` (Multi-child rollup for parents)
 * 4. `graph.html` (Self-contained interactive visual map for Google Drive)
 */

export interface GraphNode {
  id: string;
  type: 'Child' | 'Course' | 'Assignment' | 'EmailCircular' | 'PortalNotice' | 'ChatMessage' | 'Teacher' | 'Attachment' | 'Attendance';
  label: string;
  source: 'classroom' | 'gmail' | 'portal' | 'whatsapp';
  date?: string;
  dueDate?: string;
  urgent?: boolean;
  metadata?: Record<string, any>;
}

export interface GraphEdge {
  source: string;
  target: string;
  relation: 'BELONGS_TO' | 'ASSIGNED_BY' | 'MENTIONS' | 'RELEVANT_TO' | 'ATTACHED_TO' | 'APPLIES_TO';
  weight?: number;
}

export interface SchoolKnowledgeGraph {
  version: string;
  childId: string;
  childName: string;
  academicYear: string;
  lastUpdated: number;
  stats: {
    totalNodes: number;
    totalEdges: number;
    courseCount: number;
    assignmentCount: number;
    circularCount: number;
    portalNoticeCount: number;
    chatMessageCount: number;
  };
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export class KnowledgeGraphBuilder {
  public static readonly SCHEMA_VERSION = '1.0.0';

  /**
   * Builds full knowledge graph for a child from initial extraction data (Step 2, 3, and/or 4).
   */
  public static buildInitialGraph(params: {
    childId: string;
    childName: string;
    academicYear: string;
    classroomData?: any;
    gmailData?: any;
    portalData?: any;
    whatsappData?: any;
  }): SchoolKnowledgeGraph {
    const childId = params.childId || `child_${(params.childName || 'kid').toLowerCase()}`;
    const childName = params.childName || 'Child';
    const academicYear = params.academicYear || '2026-2027';

    const nodesMap = new Map<string, GraphNode>();
    const edges: GraphEdge[] = [];

    // Root Child Node
    const childNodeId = `child_${childId}`;
    nodesMap.set(childNodeId, {
      id: childNodeId,
      type: 'Child',
      label: childName,
      source: 'classroom',
      metadata: { academicYear }
    });

    // 1. Process Step 2: Google Classroom Data
    if (params.classroomData) {
      this.ingestClassroomData(nodesMap, edges, childNodeId, params.classroomData);
    }

    // 2. Process Step 2: School Emails / Circulars
    if (params.gmailData) {
      this.ingestGmailData(nodesMap, edges, childNodeId, params.gmailData);
    }

    // 3. Process Step 3: School Portals Data
    if (params.portalData) {
      this.ingestPortalData(nodesMap, edges, childNodeId, params.portalData);
    }

    // 4. Process Step 4: WhatsApp / Messaging Data
    if (params.whatsappData) {
      this.ingestWhatsAppData(nodesMap, edges, childNodeId, params.whatsappData);
    }

    const nodes = Array.from(nodesMap.values());
    const stats = this.computeStats(nodes, edges);

    return {
      version: this.SCHEMA_VERSION,
      childId,
      childName,
      academicYear,
      lastUpdated: Date.now(),
      stats,
      nodes,
      edges
    };
  }

  /**
   * Incrementally patches an existing knowledge graph with new delta items from Step 2, 3, or 4.
   */
  public static patchKnowledgeGraph(
    existingGraph: SchoolKnowledgeGraph,
    delta: {
      classroomData?: any;
      gmailData?: any;
      portalData?: any;
      whatsappData?: any;
    }
  ): SchoolKnowledgeGraph {
    const nodesMap = new Map<string, GraphNode>();
    existingGraph.nodes.forEach(n => nodesMap.set(n.id, n));

    const existingEdgeKeys = new Set<string>();
    const edges: GraphEdge[] = [];
    existingGraph.edges.forEach(e => {
      const key = `${e.source}->${e.relation}->${e.target}`;
      existingEdgeKeys.add(key);
      edges.push(e);
    });

    const childNodeId = `child_${existingGraph.childId}`;
    if (!nodesMap.has(childNodeId)) {
      nodesMap.set(childNodeId, {
        id: childNodeId,
        type: 'Child',
        label: existingGraph.childName,
        source: 'classroom',
        metadata: { academicYear: existingGraph.academicYear }
      });
    }

    const addEdgeSafe = (source: string, target: string, relation: GraphEdge['relation'], weight?: number) => {
      const key = `${source}->${relation}->${target}`;
      if (!existingEdgeKeys.has(key)) {
        existingEdgeKeys.add(key);
        edges.push({ source, target, relation, weight });
      }
    };

    if (delta.classroomData) {
      this.ingestClassroomData(nodesMap, edges, childNodeId, delta.classroomData, addEdgeSafe);
    }
    if (delta.gmailData) {
      this.ingestGmailData(nodesMap, edges, childNodeId, delta.gmailData, addEdgeSafe);
    }
    if (delta.portalData) {
      this.ingestPortalData(nodesMap, edges, childNodeId, delta.portalData, addEdgeSafe);
    }
    if (delta.whatsappData) {
      this.ingestWhatsAppData(nodesMap, edges, childNodeId, delta.whatsappData, addEdgeSafe);
    }

    const nodes = Array.from(nodesMap.values());
    const stats = this.computeStats(nodes, edges);

    return {
      ...existingGraph,
      lastUpdated: Date.now(),
      stats,
      nodes,
      edges
    };
  }

  /**
   * Generates a clean, comprehensive markdown digest for a specific child (MASTER_DIGEST.md).
   * Formatted specifically for Gemini Spark and parent assistants to parse in a single token-efficient turn.
   */
  public static generateMasterDigestMarkdown(graph: SchoolKnowledgeGraph): string {
    const dateFormatted = new Date(graph.lastUpdated).toLocaleString('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short'
    });

    // 1. Group upcoming assignments/deadlines
    const assignments = graph.nodes
      .filter(n => n.type === 'Assignment')
      .sort((a, b) => {
        const da = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
        const db = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
        return da - db;
      });

    // 2. Group recent circulars & notices (Gmail + Portal)
    const circulars = graph.nodes
      .filter(n => n.type === 'EmailCircular' || n.type === 'PortalNotice')
      .sort((a, b) => {
        const da = a.date ? new Date(a.date).getTime() : 0;
        const db = b.date ? new Date(b.date).getTime() : 0;
        return db - da;
      });

    // 3. Group WhatsApp broadcasts
    const chatBroadcasts = graph.nodes
      .filter(n => n.type === 'ChatMessage')
      .sort((a, b) => {
        const da = a.date ? new Date(a.date).getTime() : 0;
        const db = b.date ? new Date(b.date).getTime() : 0;
        return db - da;
      });

    // 4. Group courses and their teachers
    const courses = graph.nodes.filter(n => n.type === 'Course');

    // Build Markdown Lines
    const lines: string[] = [];
    lines.push(`# 🎓 Academic Knowledge Digest: ${graph.childName} (${graph.academicYear})`);
    lines.push(`*Last Synchronized: ${dateFormatted}*`);
    lines.push('');
    lines.push('> 💡 **For AI Assistants / Gemini Spark:** This digest contains the unified, deduped status of homework, circulars, portal updates, and teacher broadcasts across all school platforms. Use the entity IDs in \`_system/knowledge_graph.json\` for relational graph navigation.');
    lines.push('');

    // Section 1: Upcoming Deadlines (Next 7–14 Days)
    lines.push('## 🚨 Urgent & Upcoming Deadlines');
    if (assignments.length === 0) {
      lines.push('- *No pending coursework or deadlines detected.*');
    } else {
      const now = Date.now();
      const next14Days = assignments.filter(a => {
        if (!a.dueDate) return true;
        const t = new Date(a.dueDate).getTime();
        return t >= now - (24 * 3600 * 1000) && t <= now + (14 * 24 * 3600 * 1000);
      });

      const displayList = next14Days.length > 0 ? next14Days : assignments.slice(0, 10);
      displayList.forEach(a => {
        const dueStr = a.dueDate ? `**Due: ${a.dueDate}**` : '*No fixed deadline*';
        const courseName = a.metadata?.courseName || 'General';
        const points = a.metadata?.maxPoints ? ` (${a.metadata.maxPoints} pts)` : '';
        lines.push(`- [ ] **[${courseName}]** ${a.label}${points} — ${dueStr}`);
        if (a.metadata?.description) {
          const cleanDesc = a.metadata.description.replace(/\\n+/g, ' ').substring(0, 140);
          lines.push(`  > *${cleanDesc}...*`);
        }
      });
    }
    lines.push('');

    // Section 2: Recent School Circulars & Official Notices
    lines.push('## 📢 Recent School Circulars & Portal Notices');
    if (circulars.length === 0) {
      lines.push('- *No school circulars recorded yet.*');
    } else {
      circulars.slice(0, 8).forEach(c => {
        const dateStr = c.date ? `[${c.date}]` : '';
        const tag = c.type === 'PortalNotice' ? '🏫 [Portal]' : '📧 [Email]';
        const urgentBadge = c.urgent ? ' ⚠️ **URGENT**' : '';
        lines.push(`- ${tag} ${dateStr} **${c.label}**${urgentBadge}`);
        if (c.metadata?.attachments && c.metadata.attachments.length > 0) {
          lines.push(`  - 📎 Attached: \`${c.metadata.attachments.join('`, `')}\``);
        }
      });
    }
    lines.push('');

    // Section 3: Recent Teacher Chat Broadcasts (WhatsApp / Messaging)
    lines.push('## 💬 Recent Teacher Broadcasts & Group Notices');
    if (chatBroadcasts.length === 0) {
      lines.push('- *No active messaging broadcasts recorded.*');
    } else {
      chatBroadcasts.slice(0, 6).forEach(m => {
        const dateStr = m.date ? `[${m.date}]` : '';
        const sender = m.metadata?.sender ? `**${m.metadata.sender}**: ` : '';
        const group = m.metadata?.chatGroup ? `*(${m.metadata.chatGroup})* ` : '';
        lines.push(`- 💬 ${dateStr} ${group}${sender}${m.label}`);
        if (m.metadata?.links && m.metadata.links.length > 0) {
          lines.push(`  - 🔗 Links: ${m.metadata.links.join(', ')}`);
        }
      });
    }
    lines.push('');

    // Section 4: Coursework Directory by Subject
    lines.push('## 📚 Enrolled Courses & Faculty Directory');
    if (courses.length === 0) {
      lines.push('- *No enrolled courses found.*');
    } else {
      courses.forEach(c => {
        const teacher = c.metadata?.teacherName ? `(Teacher: ${c.metadata.teacherName})` : '';
        const courseAssignments = assignments.filter(a => a.metadata?.courseId === c.metadata?.courseId || a.metadata?.courseName === c.label);
        lines.push(`### ${c.label} ${teacher}`);
        lines.push(`- **Active Assignments**: ${courseAssignments.length}`);
        if (c.metadata?.room) lines.push(`- **Room**: ${c.metadata.room}`);
        if (c.metadata?.description) lines.push(`- **Topic**: ${c.metadata.description}`);
      });
    }
    lines.push('');

    // Knowledge Graph Metrics
    lines.push('---');
    lines.push(`*Graph Statistics: ${graph.stats.totalNodes} entities, ${graph.stats.totalEdges} relationships across ${graph.stats.courseCount} courses, ${graph.stats.assignmentCount} assignments, ${graph.stats.circularCount} circulars, and ${graph.stats.chatMessageCount} chat broadcasts.*`);

    return lines.join('\n');
  }

  /**
   * Generates a unified family digest aggregating deadlines and circulars across ALL children.
   */
  public static generateFamilyDigestMarkdown(childGraphs: SchoolKnowledgeGraph[]): string {
    const dateFormatted = new Date().toLocaleString('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short'
    });

    const lines: string[] = [];
    lines.push('# 👨‍👩‍👧‍👦 Unified Family Academic Digest (K.I.D.S.)');
    lines.push(`*Last Synchronized: ${dateFormatted}*`);
    lines.push('');
    lines.push('> 💡 **Overview for Parents & Gemini Spark:** Aggregated view across all student profiles. Individual detailed digests are available inside each child\'s respective academic year folder.');
    lines.push('');

    // Aggregated Deadlines
    lines.push('## 🚨 Consolidated Upcoming Deadlines');
    let hasDeadlines = false;
    childGraphs.forEach(g => {
      const assignments = g.nodes
        .filter(n => n.type === 'Assignment')
        .sort((a, b) => (a.dueDate ? new Date(a.dueDate).getTime() : 0) - (b.dueDate ? new Date(b.dueDate).getTime() : 0));

      if (assignments.length > 0) {
        hasDeadlines = true;
        lines.push(`### 👤 ${g.childName} (${g.academicYear})`);
        assignments.slice(0, 5).forEach(a => {
          const dueStr = a.dueDate ? `**Due: ${a.dueDate}**` : '*No deadline*';
          lines.push(`- [ ] **[${a.metadata?.courseName || 'Subject'}]** ${a.label} — ${dueStr}`);
        });
      }
    });
    if (!hasDeadlines) {
      lines.push('- *No pending deadlines across any children.*');
    }
    lines.push('');

    // Aggregated Urgent Circulars
    lines.push('## 📢 Recent School Circulars & Notices Across Family');
    let hasCirculars = false;
    childGraphs.forEach(g => {
      const circulars = g.nodes
        .filter(n => n.type === 'EmailCircular' || n.type === 'PortalNotice')
        .sort((a, b) => (b.date ? new Date(b.date).getTime() : 0) - (a.date ? new Date(a.date).getTime() : 0));

      if (circulars.length > 0) {
        hasCirculars = true;
        lines.push(`### 👤 ${g.childName}`);
        circulars.slice(0, 4).forEach(c => {
          const dateStr = c.date ? `[${c.date}]` : '';
          const urgentBadge = c.urgent ? ' ⚠️ **URGENT**' : '';
          lines.push(`- ${dateStr} **${c.label}**${urgentBadge}`);
        });
      }
    });
    if (!hasCirculars) {
      lines.push('- *No circulars recorded yet.*');
    }

    return lines.join('\n');
  }

  /**
   * Generates a self-contained, standalone interactive visual map in HTML (graph.html).
   * Opens in any browser directly from Google Drive without requiring local web servers.
   */
  public static generateVisualGraphHtml(graph: SchoolKnowledgeGraph): string {
    const jsonPayload = JSON.stringify(graph).replace(/</g, '\\u003c');

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>K.I.D.S. Knowledge Graph — ${graph.childName}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui, -apple-system, sans-serif; background: #0f172a; color: #f8fafc; overflow: hidden; }
    #header {
      position: absolute; top: 12px; left: 16px; z-index: 10;
      background: rgba(30, 41, 59, 0.85); backdrop-filter: blur(8px);
      padding: 10px 16px; border-radius: 8px; border: 1px solid #334155;
      box-shadow: 0 4px 16px rgba(0,0,0,0.3);
    }
    #header h1 { font-size: 1.1rem; color: #38bdf8; font-weight: 700; margin-bottom: 2px; }
    #header p { font-size: 0.75rem; color: #94a3b8; }
    #legend {
      position: absolute; bottom: 16px; left: 16px; z-index: 10;
      background: rgba(30, 41, 59, 0.85); backdrop-filter: blur(8px);
      padding: 8px 14px; border-radius: 6px; border: 1px solid #334155;
      font-size: 0.72rem; display: flex; gap: 12px; align-items: center; flex-wrap: wrap;
    }
    .legend-item { display: flex; align-items: center; gap: 5px; }
    .legend-color { width: 10px; height: 10px; border-radius: 50%; display: inline-block; }
    #canvas { width: 100vw; height: 100vh; display: block; }
    #tooltip {
      position: absolute; display: none; z-index: 20;
      background: #1e293b; color: #f1f5f9; padding: 8px 12px;
      border-radius: 6px; border: 1px solid #475569; font-size: 0.75rem;
      pointer-events: none; max-width: 280px; box-shadow: 0 4px 12px rgba(0,0,0,0.5);
    }
  </style>
</head>
<body>
  <div id="header">
    <h1>🎓 ${graph.childName}'s Knowledge Graph</h1>
    <p>Academic Year: ${graph.academicYear} • Entities: ${graph.stats.totalNodes} • Links: ${graph.stats.totalEdges}</p>
  </div>

  <div id="legend">
    <div class="legend-item"><span class="legend-color" style="background:#38bdf8;"></span> Child</div>
    <div class="legend-item"><span class="legend-color" style="background:#10b981;"></span> Course</div>
    <div class="legend-item"><span class="legend-color" style="background:#f59e0b;"></span> Assignment</div>
    <div class="legend-item"><span class="legend-color" style="background:#ef4444;"></span> Circular</div>
    <div class="legend-item"><span class="legend-color" style="background:#8b5cf6;"></span> Portal</div>
    <div class="legend-item"><span class="legend-color" style="background:#22c55e;"></span> WhatsApp</div>
  </div>

  <div id="tooltip"></div>
  <canvas id="canvas"></canvas>

  <script>
    const data = ${jsonPayload};
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    const tooltip = document.getElementById('tooltip');

    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;

    window.addEventListener('resize', () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    });

    const typeColors = {
      Child: '#38bdf8',
      Course: '#10b981',
      Assignment: '#f59e0b',
      EmailCircular: '#ef4444',
      PortalNotice: '#8b5cf6',
      ChatMessage: '#22c55e',
      Teacher: '#06b6d4',
      Attachment: '#64748b'
    };

    const nodePositions = new Map();
    const centerX = width / 2;
    const centerY = height / 2;

    // Arrange nodes in concentric rings by type
    data.nodes.forEach((node, i) => {
      let radius = 0;
      if (node.type === 'Child') radius = 0;
      else if (node.type === 'Course') radius = 120;
      else if (node.type === 'Teacher') radius = 180;
      else if (node.type === 'Assignment') radius = 260;
      else radius = 350;

      const angle = (i / Math.max(1, data.nodes.length)) * Math.PI * 2;
      const x = centerX + Math.cos(angle) * radius + (Math.random() * 20 - 10);
      const y = centerY + Math.sin(angle) * radius + (Math.random() * 20 - 10);
      nodePositions.set(node.id, { x, y, node });
    });

    function draw() {
      ctx.clearRect(0, 0, width, height);

      // Draw Edges
      ctx.lineWidth = 1;
      data.edges.forEach(e => {
        const p1 = nodePositions.get(e.source);
        const p2 = nodePositions.get(e.target);
        if (p1 && p2) {
          ctx.strokeStyle = 'rgba(148, 163, 184, 0.25)';
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.stroke();
        }
      });

      // Draw Nodes
      nodePositions.forEach(p => {
        const color = typeColors[p.node.type] || '#94a3b8';
        const size = p.node.type === 'Child' ? 14 : (p.node.type === 'Course' ? 10 : 6);

        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Label
        if (p.node.type === 'Child' || p.node.type === 'Course' || p.node.urgent) {
          ctx.fillStyle = '#f8fafc';
          ctx.font = '10px system-ui, sans-serif';
          ctx.fillText(p.node.label.substring(0, 22), p.x + 8, p.y + 3);
        }
      });
    }

    draw();

    // Hover tooltip
    canvas.addEventListener('mousemove', (e) => {
      const mx = e.clientX;
      const my = e.clientY;
      let hovered = null;

      nodePositions.forEach(p => {
        const dx = p.x - mx;
        const dy = p.y - my;
        if (Math.sqrt(dx * dx + dy * dy) < 12) {
          hovered = p.node;
        }
      });

      if (hovered) {
        tooltip.style.display = 'block';
        tooltip.style.left = (mx + 12) + 'px';
        tooltip.style.top = (my + 12) + 'px';
        tooltip.innerHTML = '<strong>' + hovered.label + '</strong><br>' +
          '<span style="color:#94a3b8;">Type:</span> ' + hovered.type + '<br>' +
          '<span style="color:#94a3b8;">Source:</span> ' + hovered.source +
          (hovered.dueDate ? '<br><span style="color:#f59e0b;">Due: ' + hovered.dueDate + '</span>' : '') +
          (hovered.date ? '<br><span style="color:#38bdf8;">Date: ' + hovered.date + '</span>' : '');
      } else {
        tooltip.style.display = 'none';
      }
    });
  </script>
</body>
</html>`;
  }

  // ==========================================
  // INGESTION HELPERS
  // ==========================================

  private static ingestClassroomData(
    nodesMap: Map<string, GraphNode>,
    edges: GraphEdge[],
    childNodeId: string,
    classroom: any,
    addEdgeFn?: (s: string, t: string, r: GraphEdge['relation'], w?: number) => void
  ) {
    const addEdge = addEdgeFn || ((s, t, r, w) => edges.push({ source: s, target: t, relation: r, weight: w }));

    if (classroom.courses && Array.isArray(classroom.courses)) {
      classroom.courses.forEach((c: any) => {
        const courseId = `course_${c.id || c.name}`;
        nodesMap.set(courseId, {
          id: courseId,
          type: 'Course',
          label: c.name || 'Course',
          source: 'classroom',
          metadata: {
            courseId: c.id,
            section: c.section,
            room: c.room,
            description: c.descriptionHeading || c.description,
            teacherName: c.teacherName
          }
        });
        addEdge(courseId, childNodeId, 'BELONGS_TO');

        // Teacher node
        if (c.teacherName) {
          const teacherId = `teacher_${c.teacherName.replace(/\\s+/g, '_').toLowerCase()}`;
          if (!nodesMap.has(teacherId)) {
            nodesMap.set(teacherId, {
              id: teacherId,
              type: 'Teacher',
              label: c.teacherName,
              source: 'classroom'
            });
          }
          addEdge(courseId, teacherId, 'ASSIGNED_BY');
        }

        // Coursework
        if (c.courseWork && Array.isArray(c.courseWork)) {
          c.courseWork.forEach((cw: any) => {
            const cwId = `assignment_${cw.id || cw.title}`;
            let dueStr = '';
            if (cw.dueDate) {
              const yr = cw.dueDate.year || 2026;
              const mo = String(cw.dueDate.month || 1).padStart(2, '0');
              const da = String(cw.dueDate.day || 1).padStart(2, '0');
              dueStr = `${yr}-${mo}-${da}`;
            }

            nodesMap.set(cwId, {
              id: cwId,
              type: 'Assignment',
              label: cw.title || 'Assignment',
              source: 'classroom',
              dueDate: dueStr || undefined,
              metadata: {
                courseId: c.id,
                courseName: c.name,
                description: cw.description,
                maxPoints: cw.maxPoints,
                materials: cw.materials
              }
            });
            addEdge(cwId, courseId, 'BELONGS_TO');
          });
        }
      });
    }
  }

  private static ingestGmailData(
    nodesMap: Map<string, GraphNode>,
    edges: GraphEdge[],
    childNodeId: string,
    gmail: any,
    addEdgeFn?: (s: string, t: string, r: GraphEdge['relation'], w?: number) => void
  ) {
    const addEdge = addEdgeFn || ((s, t, r, w) => edges.push({ source: s, target: t, relation: r, weight: w }));

    if (gmail.emails && Array.isArray(gmail.emails)) {
      gmail.emails.forEach((em: any) => {
        const emailId = `email_${em.id || em.subject}`;
        const attNames = (em.attachments || []).map((a: any) => (typeof a === 'string' ? a : a.filename || a.name));

        nodesMap.set(emailId, {
          id: emailId,
          type: 'EmailCircular',
          label: em.subject || 'School Circular',
          source: 'gmail',
          date: em.date,
          urgent: em.urgency === 'URGENT' || em.urgent === true,
          metadata: {
            from: em.from,
            snippet: em.snippet,
            attachments: attNames
          }
        });
        addEdge(emailId, childNodeId, 'RELEVANT_TO');

        // Attachment nodes
        attNames.forEach((an: string) => {
          const attId = `att_${an.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
          if (!nodesMap.has(attId)) {
            nodesMap.set(attId, {
              id: attId,
              type: 'Attachment',
              label: an,
              source: 'gmail'
            });
          }
          addEdge(attId, emailId, 'ATTACHED_TO');
        });
      });
    }
  }

  private static ingestPortalData(
    nodesMap: Map<string, GraphNode>,
    edges: GraphEdge[],
    childNodeId: string,
    portal: any,
    addEdgeFn?: (s: string, t: string, r: GraphEdge['relation'], w?: number) => void
  ) {
    const addEdge = addEdgeFn || ((s, t, r, w) => edges.push({ source: s, target: t, relation: r, weight: w }));

    if (portal.notices && Array.isArray(portal.notices)) {
      portal.notices.forEach((not: any) => {
        const notId = `portal_notice_${not.id || not.title}`;
        nodesMap.set(notId, {
          id: notId,
          type: 'PortalNotice',
          label: not.title || 'Portal Notice',
          source: 'portal',
          date: not.date,
          urgent: not.urgent === true || not.priority === 'HIGH',
          metadata: {
            domain: not.domain || portal.domain,
            category: not.category,
            description: not.description,
            attachments: not.attachments
          }
        });
        addEdge(notId, childNodeId, 'APPLIES_TO');
      });
    }
  }

  private static ingestWhatsAppData(
    nodesMap: Map<string, GraphNode>,
    edges: GraphEdge[],
    childNodeId: string,
    whatsapp: any,
    addEdgeFn?: (s: string, t: string, r: GraphEdge['relation'], w?: number) => void
  ) {
    const addEdge = addEdgeFn || ((s, t, r, w) => edges.push({ source: s, target: t, relation: r, weight: w }));

    const messages = whatsapp.messages || whatsapp.turns || (Array.isArray(whatsapp) ? whatsapp : []);
    messages.forEach((msg: any) => {
      const msgId = `chat_${msg.id || (msg.date + '_' + msg.time + '_' + (msg.sender || ''))}`;
      const snippet = (msg.body || msg.rawBody || msg.text || '').substring(0, 100);

      nodesMap.set(msgId, {
        id: msgId,
        type: 'ChatMessage',
        label: snippet || 'Chat Message',
        source: 'whatsapp',
        date: msg.date,
        urgent: (msg.body || '').toLowerCase().includes('urgent') || (msg.body || '').toLowerCase().includes('important'),
        metadata: {
          sender: msg.sender,
          time: msg.time,
          chatGroup: msg.chatName || msg.chatGroup || whatsapp.groupName,
          links: msg.detectedLinks || []
        }
      });
      addEdge(msgId, childNodeId, 'RELEVANT_TO');
    });
  }

  private static computeStats(nodes: GraphNode[], edges: GraphEdge[]) {
    let courseCount = 0;
    let assignmentCount = 0;
    let circularCount = 0;
    let portalNoticeCount = 0;
    let chatMessageCount = 0;

    nodes.forEach(n => {
      if (n.type === 'Course') courseCount++;
      else if (n.type === 'Assignment') assignmentCount++;
      else if (n.type === 'EmailCircular') circularCount++;
      else if (n.type === 'PortalNotice') portalNoticeCount++;
      else if (n.type === 'ChatMessage') chatMessageCount++;
    });

    return {
      totalNodes: nodes.length,
      totalEdges: edges.length,
      courseCount,
      assignmentCount,
      circularCount,
      portalNoticeCount,
      chatMessageCount
    };
  }
}
