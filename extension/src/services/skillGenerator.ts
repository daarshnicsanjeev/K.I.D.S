/**
 * Kids Intelligent Dashboard System (K.I.D.S.)
 * Dynamic Multi-Kid Skill Generator
 * Dynamically synthesizes personalized SKILL.md tailored to all configured kids,
 * MCP endpoints, sample data schemas, and the next-period default deadline rule.
 */

import { ChildProfile } from './childManager';
import { AiNormalizerService } from './aiNormalizer';

export class SkillGeneratorService {
  /**
   * Generates a fully personalized K.I.D.S._SKILL.md document for the family.
   */
  public static async generatePersonalizedSkill(profiles: ChildProfile[]): Promise<string> {
    const validProfiles = profiles.filter(p => p && p.name);
    const kidNames = validProfiles.map(p => p.name).join(', ') || 'Student';

    // 1. Build Kid MCP Endpoints table / section
    let endpointsDoc = '';
    if (validProfiles.length === 0) {
      endpointsDoc = `*No active student profiles configured yet. Complete the K.I.D.S. setup wizard to bind your MCP server endpoints.*`;
    } else {
      endpointsDoc = validProfiles.map((p, idx) => {
        const url = p.gasDeploymentUrl || '(Pending Setup - Complete Step 2)';
        const year = p.academicYear || '2026-2027';
        const channels = [
          p.hasClassroom !== false ? 'Google Classroom' : null,
          p.registeredTools && p.registeredTools.length > 0 ? `${p.registeredTools.length} Web Portals` : null,
          p.trackedChats && p.trackedChats.length > 0 ? `${p.trackedChats.length} Chat Groups` : 'WhatsApp'
        ].filter(Boolean).join(', ');

        return `### ${idx + 1}. ${p.name} (Academic Year: ${year})
- **Server Name**: \`Kids Intelligent Dashboard System (K.I.D.S.) - ${p.name}\`
- **MCP Web App URL**: \`${url}\`
- **Connected Channels**: ${channels || 'WhatsApp & School Portals'}`;
      }).join('\n\n');
    }

    // 2. Generate Core Markdown Specification
    let skillContent = `---
name: Kids Intelligent Dashboard System (K.I.D.S.)
description: AI Command Center for Parents. Aggregates multi-kid school notices, Google Classroom coursework, Gmail circulars, timetables, and WhatsApp homework with 1-click execution.
version: 3.0.0
author: K.I.D.S. AI Platform
---

# Kids Intelligent Dashboard System (K.I.D.S.) — Parent AI Skill Specification

## 1. System Overview & Family Routing

This skill connects Google Gemini Spark, Google Gemini Advanced, and modern AI assistants to the **Kids Intelligent Dashboard System (K.I.D.S.)** private Google Apps Script MCP Servers for **${kidNames}**.

### 🔗 Connected Multi-Kid MCP Server Endpoints:
${endpointsDoc}

---

## 2. Master All-In-One Tool: \`get_all_school_updates\`

Whenever the parent asks about homework, circulars, assignments, tests, or daily updates for a specific child, **ALWAYS invoke the single master composite tool**:

\`\`\`json
{
  "name": "get_all_school_updates",
  "arguments": {
    "gmail_query": "optional subject search",
    "whatsapp_filter": "optional chat or homework keyword"
  }
}
\`\`\`

> **⚡ 1-Click Authorization Rule**: Calling \`get_all_school_updates\` fetches all sources across the entire student ecosystem in a single unified execution with only **1 user permission confirmation**.

---

## 3. Sample Data Payload Structure

When \`get_all_school_updates\` is executed, the MCP server returns structured JSON containing all active channels:

\`\`\`json
{
  "timestamp": "2026-08-30T10:15:00.000Z",
  "google_classroom": [
    {
      "courseName": "Grade 3B CAIE",
      "assignments": [
        {
          "title": "Mathematics Worksheet: Negative Numbers",
          "dueDate": "2026-09-02T18:00:00.000Z",
          "description": "Complete exercises 1 to 10 on page 42.",
          "extractedPdfOcrText": "Worksheet 4: Order numbers from smallest to largest..."
        }
      ]
    }
  ],
  "school_gmail_circulars": [
    {
      "subject": "Annual Sports Day Registration & Schedule",
      "date": "2026-08-29",
      "snippet": "Dear Parents, registration for track and field events is now open.",
      "driveAttachments": [
        {
          "fileTitle": "sports_day_circular_2026.pdf",
          "extractedText": "Events include 100m sprint, relay, and high jump..."
        }
      ]
    }
  ],
  "calendar_events": [
    {
      "title": "Science Unit Test 1",
      "startTime": "2026-09-04T09:00:00.000Z",
      "endTime": "2026-09-04T10:30:00.000Z"
    }
  ],
  "whatsapp_school_notices": [
    {
      "chatName": "3B Cambridge 2026 - 27",
      "sender": "School Teacher",
      "timestamp": "8/28/2026, 2:45 PM",
      "category": "HOMEWORK_OR_TASK_ANNOUNCEMENT",
      "body": "Dear Parents, please ensure ICT homework on MS Word 2016 is submitted before next ICT class.",
      "driveAttachmentUrl": "https://drive.google.com/open?id=1MIj7bXHFbMfbxgJfHkjJWyc4rkJVdaMP",
      "driveFileName": "Editing_Text_in_Word_2016_notes.pdf"
    }
  ],
  "live_web_tab_content": {
    "domain": "edusprint.com",
    "title": "Student Attendance & Fee Status",
    "tables": [
      { "header": "Attendance", "value": "98.5%" }
    ]
  },
  "portal_data": {}
}
\`\`\`

---

## 4. Critical Intelligence & Deadline Rules

### 📅 The Next-Period Default Due Date Rule (Invariant)
- **Rule**: If an assignment, worksheet, or homework notice does **NOT** explicitly mention a specific due date or submission time, the AI **MUST automatically calculate and state the due date as the NEXT scheduled period/class of that subject** in the student's timetable or weekly schedule.
- *Example*: If an ICT task is assigned on Friday with no explicit date, the AI will report: *"Due Date: Next scheduled ICT class (e.g. Tuesday morning)"*.

### 🔍 Attachment & OCR Inspection
- Always inspect \`extractedPdfOcrText\` and \`driveAttachments\` to answer detailed questions about worksheets, competition rules, or permission slips without asking the parent to manually open PDFs.

### 🛡️ Multi-Kid Privacy & Isolation
- Keep answers for **${validProfiles.map(p => p.name).join('** and **') || 'each student'}** strictly segregated under clear, organized section banners.

---
*Generated dynamically by Kids Intelligent Dashboard System (K.I.D.S.) for ${kidNames} on ${new Date().toLocaleDateString()}.*
`;

    // 3. Enrich with Chrome Gemini Nano SLM if available
    try {
      const isReady = await AiNormalizerService.checkAiReadiness();
      if (isReady) {
        // AI is active; skillContent is already formatted cleanly
      }
    } catch (e) {}

    return skillContent;
  }

  /**
   * Triggers a browser download for K.I.D.S._SKILL.md.
   */
  public static triggerSkillDownload(markdownContent: string): void {
    const blob = new Blob([markdownContent], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'K.I.D.S._SKILL.md';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}
