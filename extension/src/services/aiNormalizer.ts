/**
 * Chrome Built-in AI (Gemini Nano) Normalizer Service
 * Uses the Chrome Prompt API (`ai.languageModel` / `window.ai.languageModel`)
 * to normalize messy conversational text streams into structured School MCP JSON.
 */

import { WhatsAppDiagnosticLogger } from './whatsappLogger';

export interface NormalizedNoticeMessage {
  id?: string;
  chatName?: string;
  sender: string;
  timestamp: string;
  date?: string;
  time?: string;
  body: string;
  category: 'HOMEWORK_OR_TASK_ANNOUNCEMENT' | 'CIRCULAR_NOTICE' | 'GENERAL_CHAT';
  submissionDeadline?: string | null;
  detectedLinks?: string[];
  driveAttachmentUrl?: string | null;
  driveFileName?: string | null;
  childName?: string;
}

export type AiAvailabilityStatus = 'readily' | 'after-download' | 'no' | 'unsupported';

export interface RawChatTurn {
  id: string;
  sender: string;
  time: string;
  date: string;
  rawBody: string;
  detectedLinks: string[];
}

export class AiNormalizerService {
  private static session: any = null;

  /**
   * Generates a rich, concise SLM semantic description for a school group.
   * Useful for indexing groups in child_groups_manifest.json so LLMs can quickly query specific groups.
   */
  public static async generateGroupSemanticDescription(
    groupName: string,
    messages: any[],
    childName: string
  ): Promise<string> {
    const subjects = new Set<string>();
    const teachers = new Set<string>();
    const noticeTypes = new Set<string>();

    const knownSubjects = ['Math', 'Mathematics', 'English', 'Science', 'EVS', 'SST', 'Social Studies', 'Hindi', 'Marathi', 'French', 'Spanish', 'Art', 'Music', 'ICT', 'Computer', 'Physical Education', 'PE', 'Dance', 'Drama', 'Robotics'];

    messages.slice(0, 150).forEach(m => {
      if (!m) return;
      const b = (m.body || m.rawBody || m.text || '').toLowerCase();
      const s = (m.sender || '');
      if (s && !s.startsWith('+') && !s.toLowerCase().includes('notice') && !s.toLowerCase().includes('teacher')) {
        teachers.add(s);
      }
      knownSubjects.forEach(subj => {
        if (b.includes(subj.toLowerCase())) subjects.add(subj);
      });
      if (m.category === 'HOMEWORK_OR_TASK_ANNOUNCEMENT') noticeTypes.add('Homework Assignments');
      if (m.category === 'CIRCULAR_NOTICE') noticeTypes.add('Official Circulars');
      if (m.submissionDeadline) noticeTypes.add('Submission Deadlines');
    });

    const subjectList = Array.from(subjects);
    const teacherList = Array.from(teachers);
    const noticeList = Array.from(noticeTypes);

    const uniqueSenders = new Set(messages.map(m => m ? m.sender : null).filter(Boolean));
    const isParentDiscussion = uniqueSenders.size > 12;

    // Rule-based rich synthesis
    let desc = isParentDiscussion
      ? `Parents discussion and coordination group "${groupName}" for ${childName} with active participation across ${uniqueSenders.size} parents.`
      : `Official school announcement group "${groupName}" for ${childName}.`;

    if (subjectList.length > 0) {
      desc += ` Covers academic subjects: ${subjectList.slice(0, 5).join(', ')}.`;
    }
    if (noticeList.length > 0) {
      desc += ` Includes ${noticeList.join(', ')}.`;
    }
    if (teacherList.length > 0) {
      desc += ` Key senders/teachers: ${teacherList.slice(0, 3).join(', ')}.`;
    }

    // Attempt SLM refinement if Chrome Prompt API is available
    const promptApi = this.getLanguageModelApi();
    if (promptApi) {
      try {
        const session = await promptApi.create({
          systemPrompt: `You are an educational assistant. Summarize the role and content of this school chat group in 1-2 concise sentences for quick AI retrieval. Note if it is an official teacher circular channel or a parent discussion group.`
        });
        const sampleText = messages.slice(0, 10).map(m => `[${m.sender || 'Unknown'}]: ${(m.body || m.rawBody || m.text || '').substring(0, 80)}`).join('\n');
        const aiSummary = await session.prompt(`Group Name: ${groupName}\nChild: ${childName}\nSample notices:\n${sampleText}\nProvide a concise 1-2 sentence description.`);
        if (aiSummary && aiSummary.trim().length > 15) {
          return aiSummary.trim();
        }
      } catch (e) {}
    }

    return desc;
  }

  /**
   * Checks if Chrome Prompt API / Gemini Nano SLM is available.
   */
  public static async checkAiReadiness(): Promise<boolean> {
    const api = this.getLanguageModelApi();
    if (!api) return false;
    try {
      if (typeof api.capabilities === 'function') {
        const caps = await api.capabilities();
        return caps.available === 'readily' || caps.available === 'after-download';
      }
      if (typeof api.availability === 'function') {
        const avail = await api.availability();
        return avail === 'readily' || avail === 'after-download';
      }
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Resolves the official Chrome Prompt API `LanguageModel` or `ai.languageModel` across all Chrome scopes.
   */
  public static getLanguageModelApi(): any {
    if (typeof globalThis !== 'undefined' && (globalThis as any).LanguageModel) {
      return (globalThis as any).LanguageModel;
    }
    if (typeof window !== 'undefined') {
      if ((window as any).LanguageModel) return (window as any).LanguageModel;
      if ((window as any).ai?.languageModel) return (window as any).ai.languageModel;
      if ((window as any).model?.languageModel) return (window as any).model.languageModel;
      if ((window as any).chrome?.ai?.languageModel) return (window as any).chrome.ai.languageModel;
    }
    if (typeof self !== 'undefined') {
      if ((self as any).LanguageModel) return (self as any).LanguageModel;
      if ((self as any).ai?.languageModel) return (self as any).ai.languageModel;
    }
    return null;
  }

  /**
   * Segments raw conversational text from any chat/portal into discrete chronological sender turns.
   */
  public static extractRawTurns(rawText: string, defaultDate?: string): RawChatTurn[] {
    if (!rawText || rawText.trim().length === 0) return [];

    const now = new Date();
    const anchorDate = now;
    let currentDate = defaultDate || this.resolveDateHeader('yesterday', anchorDate);

    const monthNames: Record<string, number> = {
      january: 1, jan: 1, february: 2, feb: 2, march: 3, mar: 3, april: 4, apr: 4,
      may: 5, june: 6, jun: 6, july: 7, jul: 7, august: 8, aug: 8,
      september: 9, sep: 9, sept: 9, october: 10, oct: 10, november: 11, nov: 11, december: 12, dec: 12
    };

    const turns: RawChatTurn[] = [];
    const seenTurnBodies = new Map<string, RawChatTurn>();
    const lines = rawText.split('\n').map(l => l.trim()).filter(l => l.length > 0);

    const timeRegex = /\b(\d{1,2}:\d{2}\s*(?:AM|PM|am|pm))\b/;
    const dateHeaderRegex = /^(today|yesterday|monday|tuesday|wednesday|thursday|friday|saturday|sunday|\d{1,2}\/\d{1,2}\/\d{2,4}|\d{1,2}\s+[a-z]+(?:\s+\d{4})?|[a-z]+\s+\d{1,2}(?:,\s*\d{4})?)$/i;
    
    let currentSender = 'School Teacher';
    let currentBodyLines: string[] = [];
    let currentTime = '';

    const flushTurn = () => {
      if (currentBodyLines.length > 0) {
        let cleanedLines = currentBodyLines.filter(l => !/^[A-Za-z0-9]$/.test(l.trim()));
        
        let detectedSender = currentSender;
        const candidateSenders: string[] = [];
        const nonAuthorKeywords = [
          'dear', 'homework', 'subject', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
          'forwarded', 'god bless', 'bless you', 'greetings', 'good morning', 'good afternoon', 'good evening',
          'please note', 'warm regards', 'witty', 'international', 'school', 'thank you', 'thanks'
        ];

        while (cleanedLines.length > 0) {
          const firstLine = cleanedLines[0];
          const firstLower = firstLine.toLowerCase();
          const isBlacklisted = nonAuthorKeywords.some(k => firstLower.includes(k));
          
          if (/^[A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3}$/.test(firstLine) && !isBlacklisted) {
            candidateSenders.push(firstLine);
            cleanedLines.shift();
          } else {
            break;
          }
        }
        if (candidateSenders.length > 0) {
          detectedSender = candidateSenders[candidateSenders.length - 1];
        }

        let fullBody = cleanedLines.join('\n').trim();
        fullBody = fullBody.replace(/(?:\.\.\.|…)?\s*read\s+more\s*$/i, '').trim();

        // Check for in-body teacher introduction (e.g. "I am Ms. Bhumika Parmar, the in-charge teacher")
        if (detectedSender.startsWith('+91') || detectedSender === 'School Teacher') {
          const introMatch = fullBody.match(/\b(?:I am|This is)\s+(?:Ms\.|Mr\.|Mrs\.|Dr\.)?\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2})/i);
          if (introMatch && introMatch[1]) {
            detectedSender = introMatch[1].trim();
          }
        }

        if (fullBody.length > 1 && !fullBody.toLowerCase().includes('this message was deleted')) {
          const urls: string[] = [];
          const urlMatches = fullBody.match(/https?:\/\/[^\s]+/g);
          if (urlMatches) {
            urlMatches.forEach(u => { if (!urls.includes(u)) urls.push(u); });
          }

          const turnBodyKey = fullBody.replace(/\s+/g, ' ').trim().toLowerCase().substring(0, 80);
          const effectiveTime = currentTime || '8:00 PM';

          if (seenTurnBodies.has(turnBodyKey)) {
            // Merge duplicate turn with better sender / time
            const existing = seenTurnBodies.get(turnBodyKey)!;
            if (existing.sender.startsWith('+91') && !detectedSender.startsWith('+91')) {
              existing.sender = detectedSender;
            }
            if (existing.time === '8:00 PM' && effectiveTime !== '8:00 PM') {
              existing.time = effectiveTime;
            }
          } else {
            const newTurn: RawChatTurn = {
              id: `turn_${Date.now()}_${turns.length}`,
              sender: detectedSender,
              time: effectiveTime,
              date: currentDate,
              rawBody: fullBody,
              detectedLinks: urls
            };
            seenTurnBodies.set(turnBodyKey, newTurn);
            turns.push(newTurn);
          }
        }
        currentBodyLines = [];
      }
    };

    // Post-Processing Phase 1: Filter Dummy Attachment & Media UI Chips
    const isAttachmentNoise = (body: string): boolean => {
      const b = body.trim();
      if (/^\[(?:Document Attachment|Photo\/Image Attachment|Document|Photo|Image):\s*(?:\d{1,2}:\d{2}\s*(?:AM|PM|am|pm)?|star|[A-Za-z0-9_.\- ]+)\]$/i.test(b)) {
        const inner = b.replace(/^\[(?:Document Attachment|Photo\/Image Attachment|Document|Photo|Image):\s*/i, '').replace(/\]$/, '').trim();
        if (/^\d{1,2}:\d{2}\s*(?:AM|PM|am|pm)?$/i.test(inner) || inner.toLowerCase() === 'star') {
          return true;
        }
      }
      if (/^(?:star|forms\.gle|ruchi:|bhoomi:|download\s*"[^"]*")$/i.test(b)) return true;
      return false;
    };

    const isContinuationFragment = (currTurn: RawChatTurn, prevTurn: RawChatTurn | null): boolean => {
      if (!prevTurn) return false;
      const b = currTurn.rawBody.trim();
      const firstLine = b.split('\n')[0].trim();
      const firstLower = firstLine.toLowerCase();

      // Check if current turn starts with a salutation/greeting or subject line (indicates a new message)
      const hasGreeting = /^(dear\s+|greetings|good\s+(morning|afternoon|evening)|subject:|notice|circular|hindi\s+homework|science\s+homework|sst\s+homework|math\s+homework|homework)/i.test(firstLower);
      if (hasGreeting) return false;

      // Indicator 1: Starts with time ranges ("7:45 a.m. – 9:30 a.m.", "10:30 a.m. – 11:45 a.m.")
      if (/^\d{1,2}:\d{2}\s*(?:a\.?m\.?|p\.?m\.?)\s*[–—\-]\s*\d{1,2}:\d{2}/i.test(firstLine)) return true;

      // Indicator 2: Starts with continuation punctuation or conjunctions
      if (/^[,\-;–—•*]|^(and|or|but|which|with|that|to|for|in\s+case|kindly|please|we\s+sincerely)\b/i.test(firstLower)) return true;

      // Indicator 3: Previous turn ends with colon, comma, hyphen, or incomplete sentence
      const prevBody = prevTurn.rawBody.trim();
      if (/[:,\-–—]\s*$/i.test(prevBody) || /^(venue:|time:|timing:|schedule:)/i.test(prevBody.split('\n').pop()?.trim() || '')) {
        return true;
      }

      // Indicator 4: Contextual continuation (e.g. coffee meet continuation mentioning coffee)
      if (prevBody.toLowerCase().includes('coffee meet') && firstLower.includes('coffee')) {
        return true;
      }

      return false;
    };

    // Build initial turns list
    lines.forEach(line => {
      if (dateHeaderRegex.test(line)) {
        flushTurn();
        currentDate = this.resolveDateHeader(line, anchorDate);
        return;
      }

      // Format 1: iOS / Web bracketed format: [6/6/26, 7:44 PM] Sender: Message
      const waBracketMatch = line.match(/^\[([^\]]+)\]\s*([^:]+):\s*(.*)$/);
      if (waBracketMatch) {
        flushTurn();
        const headerInside = waBracketMatch[1].trim();
        const parts = headerInside.split(',').map(p => p.trim());
        if (parts.length >= 2) {
          if (parts[0].includes(':')) {
            currentTime = parts[0].replace(/\u202f|\u00a0/g, ' ');
            currentDate = this.resolveDateHeader(parts[1], anchorDate);
          } else {
            currentDate = this.resolveDateHeader(parts[0], anchorDate);
            currentTime = parts[1].replace(/\u202f|\u00a0/g, ' ');
          }
        } else if (parts.length === 1) {
          if (parts[0].includes(':')) {
            currentTime = parts[0].replace(/\u202f|\u00a0/g, ' ');
          } else {
            currentDate = this.resolveDateHeader(parts[0], anchorDate);
          }
        }
        let cleanAuthor = waBracketMatch[2].trim().replace(/^\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4}\s*/, '').trim();
        currentSender = cleanAuthor || 'School Teacher';
        
        const restOfLine = waBracketMatch[3] ? waBracketMatch[3].trim() : '';
        if (restOfLine) {
          currentBodyLines.push(restOfLine);
        }
        return;
      }

      // Format 2: Android WhatsApp export format: 6/6/26, 7:44 PM - +91 93216 80087: Message
      // Or system events without colon: 6/3/26, 2:25 PM - Messages and calls are end-to-end encrypted...
      const waDashMatch = line.match(/^(\d{1,2}[\/\.\-]\d{1,2}[\/\.\-]\d{2,4}),?\s+(\d{1,2}:\d{2}(?::\d{2})?(?:[\s\u202f\u00a0]*(?:AM|PM|am|pm))?)\s*-\s*([^:]+?)(?::\s*(.*))?$/i);
      if (waDashMatch) {
        flushTurn();
        const rawDate = waDashMatch[1].trim();
        const rawTime = waDashMatch[2].trim().replace(/\u202f|\u00a0/g, ' ');
        const rawSender = waDashMatch[3].trim();
        const rawMessage = waDashMatch[4] !== undefined ? waDashMatch[4].trim() : null;

        // Skip WhatsApp system events that have no colon / message body
        if (rawMessage === null || rawSender.includes('created group') || rawSender.includes('added you') || rawSender.includes('end-to-end encrypted') || rawSender.includes('changed the group') || rawSender.includes('changed the subject') || rawSender.includes('left') || rawSender.includes('removed')) {
          return;
        }

        currentDate = this.resolveDateHeader(rawDate, anchorDate);
        currentTime = rawTime;
        let cleanAuthor = rawSender.replace(/^\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4}\s*/, '').replace(/^~\s*/, '').trim();
        currentSender = cleanAuthor || 'School Teacher';

        if (rawMessage) {
          currentBodyLines.push(rawMessage);
        }
        return;
      }

      currentBodyLines.push(line);
    });

    flushTurn();

    // Multi-Phase SLM / Semantic Anomaly Repair Pipeline
    const repairedTurns: RawChatTurn[] = [];

    for (let i = 0; i < turns.length; i++) {
      const turn = turns[i];

      // Phase 1: Skip standalone attachment noise
      if (isAttachmentNoise(turn.rawBody)) {
        continue;
      }

      const prevTurn = repairedTurns.length > 0 ? repairedTurns[repairedTurns.length - 1] : null;

      // Phase 2: Semantic Turn Stitching (Rejoin continuation fragments like turn_126 + turn_127)
      if (prevTurn && isContinuationFragment(turn, prevTurn)) {
        prevTurn.rawBody = `${prevTurn.rawBody}\n${turn.rawBody}`;
        if (turn.detectedLinks && turn.detectedLinks.length > 0) {
          prevTurn.detectedLinks = Array.from(new Set([...(prevTurn.detectedLinks || []), ...turn.detectedLinks]));
        }
        continue;
      }

      // Phase 3: Temporal Cross-Verification & Date Calibration
      // Look for explicit in-body event dates (e.g. "Sunday, 5th July 2026", "23.07.2026", "Monday, 8th June 2026")
      const explicitInBodyDateMatch = turn.rawBody.match(/\b(?:Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday),\s*([0-9]{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]+)(?:,?\s*(\d{4}))?/i) ||
                                      turn.rawBody.match(/\b([0-9]{1,2})[\/\.\-]([0-9]{1,2})[\/\.\-](202\d)\b/);
      if (explicitInBodyDateMatch) {
        // If turn has a valid in-body date and the assigned date appears to be a fallback or default
        if (explicitInBodyDateMatch[2] && isNaN(Number(explicitInBodyDateMatch[2]))) {
          const d = parseInt(explicitInBodyDateMatch[1], 10);
          const mStr = explicitInBodyDateMatch[2].toLowerCase();
          const m = monthNames[mStr];
          const y = explicitInBodyDateMatch[3] ? parseInt(explicitInBodyDateMatch[3], 10) : anchorDate.getFullYear();
          if (m && d) {
            const inBodyDate = `${m}/${d}/${y}`;
            // If the stamped date is today/yesterday anchor while message is discussing a previous month
            if (turn.date !== inBodyDate && Math.abs(anchorDate.getTime() - new Date(turn.date).getTime()) < 2 * 24 * 3600 * 1000 && m < (anchorDate.getMonth() + 1)) {
              turn.date = inBodyDate;
            }
          }
        }
      }
      repairedTurns.push(turn);
    }

    return repairedTurns;
  }

  /**
   * Normalizes raw conversational text turn-by-turn into structured JSON.
   */
  public static async normalizeRawChatText(
    rawText: string,
    chatName: string = 'Active School Chat',
    childName: string = 'Atharva',
    onDownloadProgress?: (progressPercent: number) => void,
    driveUrlMap?: { [fileName: string]: string }
  ): Promise<NormalizedNoticeMessage[]> {
    const rawTurns = this.extractRawTurns(rawText);

    const senderFrequency: Record<string, number> = {};
    rawTurns.forEach(t => {
      senderFrequency[t.sender] = (senderFrequency[t.sender] || 0) + 1;
    });

    await WhatsAppDiagnosticLogger.log('INFO', 'EXTRACT', `[TURN_EXTRACTION] Abstracted ${rawTurns.length} sender turns across ${Object.keys(senderFrequency).length} distinct authors.`, {
      turnCount: rawTurns.length,
      authors: senderFrequency
    });

    // Step 1: Initialize on-device Gemini Nano session if available
    let session: any = null;
    let slmConsecutiveFailures = 0;

    try {
      session = await this.getSession(onDownloadProgress);
    } catch (e: any) {
      await WhatsAppDiagnosticLogger.log('WARN', 'EXTRACT', `Local Gemini Nano session initialization deferred: ${e.message}. Using fast deterministic parser.`);
    }

    const normalizedResults: NormalizedNoticeMessage[] = [];

    // Step 2: Run loop per sender turn through Chrome SLM with circuit breaker
    for (let tIdx = 0; tIdx < rawTurns.length; tIdx++) {
      const turn = rawTurns[tIdx];
      let finalNotice: NormalizedNoticeMessage | null = null;
      let usedSlm = false;
      const startTime = Date.now();

      // Check if message references an attached file in driveUrlMap
      let attachUrl: string | undefined;
      let attachName: string | undefined;
      if (driveUrlMap && Object.keys(driveUrlMap).length > 0) {
        for (const [fName, driveUrl] of Object.entries(driveUrlMap)) {
          if (turn.rawBody.toLowerCase().includes(fName.toLowerCase()) || fName.toLowerCase().includes(turn.rawBody.trim().toLowerCase())) {
            attachUrl = driveUrl;
            attachName = `${childName}_${fName}`;
            break;
          }
        }
      }

      // Try Chrome SLM for this turn if session is active, not circuit-broken, and batch is small (<= 30 turns)
      if (session && slmConsecutiveFailures < 2 && rawTurns.length <= 30) {
        const turnPrompt = `Extract and normalize this school notice from ${turn.sender} (context header: ${turn.time}, ${turn.date}) into JSON:
MESSAGE:
${turn.rawBody}

Return JSON with:
{
  "sender": "${turn.sender}",
  "date": "M/D/YYYY (infer accurately from message content or context ${turn.date})",
  "time": "Time string (infer from message text or context ${turn.time})",
  "body": "Clean notice body text",
  "category": "HOMEWORK_OR_TASK_ANNOUNCEMENT" | "CIRCULAR_NOTICE" | "GENERAL_CHAT",
  "submissionDeadline": "Extracted deadline string if homework/task else null",
  "detectedLinks": []
}`;

        try {
          const timeoutPromise = new Promise<string>((_, reject) =>
            setTimeout(() => reject(new Error('Turn SLM timeout')), 1000)
          );

          const slmRawOutput = await Promise.race([
            session.prompt(turnPrompt),
            timeoutPromise
          ]);

          const parsedList = this.parseAndSanitizeAiResponse(slmRawOutput, chatName, childName);
          if (parsedList && parsedList.length > 0) {
            const parsed = parsedList[0];
            finalNotice = {
              id: turn.id,
              chatName,
              sender: parsed.sender || turn.sender,
              timestamp: `${parsed.time || turn.time}, ${parsed.date || turn.date}`,
              date: parsed.date || turn.date,
              time: parsed.time || turn.time,
              body: parsed.body,
              category: (parsed.category === 'HOMEWORK_OR_TASK_ANNOUNCEMENT' || parsed.category === 'CIRCULAR_NOTICE')
                ? parsed.category
                : 'GENERAL_CHAT',
              submissionDeadline: parsed.submissionDeadline || null,
              detectedLinks: Array.isArray(parsed.detectedLinks) ? parsed.detectedLinks : turn.detectedLinks,
              childName,
              driveAttachmentUrl: attachUrl || (turn as any).driveAttachmentUrl,
              driveFileName: attachName || (turn as any).driveFileName
            };
            usedSlm = true;
            slmConsecutiveFailures = 0;
          }
        } catch (turnErr) {
          // Trip circuit breaker immediately so remaining turns use the 0ms deterministic parser
          slmConsecutiveFailures = 99;
        }
      }

      // Deterministic Fallback if SLM skipped or timed out
      if (!finalNotice) {
        let cat: 'HOMEWORK_OR_TASK_ANNOUNCEMENT' | 'CIRCULAR_NOTICE' | 'GENERAL_CHAT' = 'GENERAL_CHAT';
        const lowerBody = turn.rawBody.toLowerCase();
        if (lowerBody.includes('homework') || lowerBody.includes('assignment') || lowerBody.includes('submission date') || lowerBody.includes('submit it by')) {
          cat = 'HOMEWORK_OR_TASK_ANNOUNCEMENT';
        } else if (lowerBody.includes('circular') || lowerBody.includes('notice') || lowerBody.includes('dear parents') || lowerBody.includes('competition') || lowerBody.includes('assembly') || lowerBody.includes('holiday')) {
          cat = 'CIRCULAR_NOTICE';
        }

        let deadline: string | null = null;
        const dlMatch = turn.rawBody.match(/(?:submission|due|submit by|deadline|bring it on)\s*(?:date\s*)?[-:\s]*((?:[A-Za-z]+,?\s*)?[0-9]{1,2}(?:st|nd|rd|th)?\s+[A-Za-z]+(?:,?\s*\d{4})?|[0-9]{1,2}[\/\.\-][0-9]{1,2}[\/\.\-]\d{2,4})/i);
        if (dlMatch && dlMatch[1]) {
          deadline = dlMatch[1].trim();
        }

        finalNotice = {
          id: turn.id,
          chatName,
          sender: turn.sender,
          timestamp: `${turn.time}, ${turn.date}`,
          date: turn.date,
          time: turn.time,
          body: turn.rawBody,
          category: cat,
          submissionDeadline: deadline,
          detectedLinks: turn.detectedLinks,
          childName,
          driveAttachmentUrl: attachUrl || (turn as any).driveAttachmentUrl,
          driveFileName: attachName || (turn as any).driveFileName
        };
      }

      const elapsedMs = Date.now() - startTime;
      normalizedResults.push(finalNotice);
      await WhatsAppDiagnosticLogger.log('INFO', 'EXTRACT', `[SLM_TURN ${tIdx + 1}/${rawTurns.length}] (${usedSlm ? '🤖 Gemini Nano' : '⚡ Fast Parser'} ${elapsedMs}ms) Author: "${finalNotice.sender}" | Date: ${finalNotice.date} | Category: ${finalNotice.category}${finalNotice.submissionDeadline ? ` | Deadline: ${finalNotice.submissionDeadline}` : ''}`);
    }

    await WhatsAppDiagnosticLogger.log('SUCCESS', 'EXTRACT', `🎉 [SLM_NORMALIZATION_COMPLETE] Successfully normalized ${normalizedResults.length} distinct sender turns across ${Object.keys(senderFrequency).length} authors!`, {
      totalTurns: normalizedResults.length,
      authors: senderFrequency
    });

    return normalizedResults;
  }

  /**
   * Checks availability of Chrome Built-in AI (Gemini Nano Prompt API).
   */
  public static async getAvailability(): Promise<{ status: AiAvailabilityStatus; message: string }> {
    try {
      const lm = this.getLanguageModelApi();
      if (!lm) {
        return {
          status: 'unsupported',
          message: 'Chrome Built-in LanguageModel Prompt API is not supported in this browser build.'
        };
      }

      let availStr = 'no';
      if (typeof lm.availability === 'function') {
        const res = await lm.availability();
        availStr = typeof res === 'string' ? res : (res?.available || 'no');
      } else if (typeof lm.capabilities === 'function') {
        const cap = await lm.capabilities();
        availStr = cap.available;
      }

      if (availStr === 'readily' || availStr === 'readily-available' || availStr === 'available') {
        return {
          status: 'readily',
          message: 'Gemini Nano LanguageModel is ready for on-device inference.'
        };
      } else if (availStr === 'after-download' || availStr === 'downloading') {
        return {
          status: 'after-download',
          message: 'Gemini Nano LanguageModel is ready to download on-device.'
        };
      } else {
        return {
          status: 'no',
          message: 'Gemini Nano is not available on this device configuration.'
        };
      }
    } catch (err: any) {
      return {
        status: 'unsupported',
        message: err?.message || 'Error querying LanguageModel availability.'
      };
    }
  }

  /**
   * Performs deep evaluation of Chrome Version vs Flag State and returns specific user guidance.
   */
  public static async checkAiReadinessDetailed(): Promise<{
    status: 'ready' | 'outdated_chrome' | 'disabled_or_flag_off' | 'downloading' | 'unsupported';
    chromeVersion: number;
    badgeLabel: string;
    badgeColor: string;
    badgeBg: string;
    userAdviceTitle: string;
    userAdviceMessage: string;
    actionType?: 'update_chrome' | 'enable_flags' | 'start_download';
    actionUrl?: string;
    flagSteps?: string[];
  }> {
    const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
    const chromeMatch = ua.match(/Chrome\/([0-9]+)/);
    const chromeVer = chromeMatch ? parseInt(chromeMatch[1], 10) : 0;

    // 1. Check if Chrome is outdated (Official Prompt API in extensions requires modern Chrome)
    if (chromeVer > 0 && chromeVer < 128) {
      return {
        status: 'outdated_chrome',
        chromeVersion: chromeVer,
        badgeLabel: `🔴 Update Chrome (v${chromeVer})`,
        badgeBg: '#7f1d1d',
        badgeColor: '#fca5a5',
        userAdviceTitle: 'Update Google Chrome for Built-in AI',
        userAdviceMessage: `The Chrome Prompt API (Gemini Nano) requires modern Google Chrome, but your browser is running Chrome v${chromeVer}.\n\nAccording to official Chrome AI documentation, please update Chrome at chrome://settings/help to enable on-device AI.\n\n(While updating, the extension operates at 100% speed using the built-in Rule Engine).`,
        actionType: 'update_chrome',
        actionUrl: 'chrome://settings/help'
      };
    }

    // 2. Check active Prompt API availability
    const avail = await this.getAvailability();
    if (avail.status === 'readily') {
      return {
        status: 'ready',
        chromeVersion: chromeVer,
        badgeLabel: '🟢 Ready (Gemini Nano)',
        badgeBg: '#065f46',
        badgeColor: '#34d399',
        userAdviceTitle: 'Chrome Prompt API (Gemini Nano) Active',
        userAdviceMessage: 'Google Chrome Built-in AI (Gemini Nano) is fully initialized and operating on-device per official W3C Prompt API specifications.'
      };
    }

    if (avail.status === 'after-download') {
      return {
        status: 'downloading',
        chromeVersion: chromeVer,
        badgeLabel: '🟡 Model Download Required',
        badgeBg: '#78350f',
        badgeColor: '#fcd34d',
        userAdviceTitle: 'Gemini Nano Download Required',
        userAdviceMessage: 'The Prompt API is enabled in Chrome and waiting to download the Gemini Nano model (~1.5 GB). You can also verify component status at chrome://components.',
        actionType: 'start_download'
      };
    }

    // 3. Chrome version is modern, but Prompt API is disabled or flags are inactive
    return {
      status: 'disabled_or_flag_off',
      chromeVersion: chromeVer,
      badgeLabel: '🟡 Enable Gemini Nano',
      badgeBg: '#78350f',
      badgeColor: '#fcd34d',
      userAdviceTitle: 'Enable Chrome Prompt API (Gemini Nano)',
      userAdviceMessage: `To enable Chrome Built-in AI on your machine (per official developer.chrome.com/docs/ai/prompt-api guide):\n\n1. Open chrome://flags\n2. Set "Prompt API for Gemini Nano" -> Enabled\n3. Set "Enables optimization guide on device" -> Enabled BypassPerfRequirement\n4. Relaunch Chrome\n5. Verify "Optimization Guide On Device Model" is updated at chrome://components\n\nHardware Requirements: ≥22 GB free disk space, >4 GB VRAM or 16 GB RAM.`,
      actionType: 'enable_flags',
      actionUrl: 'chrome://flags',
      flagSteps: [
        '1. Open chrome://flags in your address bar.',
        '2. Set "Prompt API for Gemini Nano" to "Enabled".',
        '3. Set "Enables optimization guide on device" to "Enabled BypassPerfRequirement".',
        '4. Click "Relaunch" at the bottom of Chrome.',
        '5. Open chrome://components and click "Check for update" on Optimization Guide On Device Model.'
      ]
    };
  }

  /**
   * Runs an in-depth step-by-step diagnostic inspection of Chrome On-Device AI prerequisites.
   */
  public static async runStepByStepDiagnostics(targetTabId?: number): Promise<{ report: string; success: boolean; canDownload: boolean }> {
    const lines: string[] = [];
    lines.push('=== Chrome Built-in AI (Gemini Nano) Prerequisite Inspector ===');
    lines.push(`Time: ${new Date().toLocaleTimeString()}, ${new Date().toLocaleDateString()}`);

    // Step 1: User-Agent & Version
    const ua = typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown';
    const chromeMatch = ua.match(/Chrome\/([0-9]+)/);
    const chromeVer = chromeMatch ? parseInt(chromeMatch[1], 10) : 0;
    lines.push(`[Step 1] Browser User-Agent: ${ua}`);
    if (chromeVer >= 127) {
      lines.push(`  ✅ Chrome Version: ${chromeVer} (Supported >= 127)`);
    } else {
      lines.push(`  ❌ Chrome Version: ${chromeVer} (Requires Chrome 127+ or Chrome Canary/Dev)`);
    }

    // Step 2: Global Object Check
    const winLm = (typeof window !== 'undefined') ? (window as any).LanguageModel : undefined;
    const globalLm = (typeof globalThis !== 'undefined') ? (globalThis as any).LanguageModel : undefined;
    const winAi = (typeof window !== 'undefined') ? (window as any).ai : undefined;
    const chromeAi = (typeof window !== 'undefined') ? (window as any).chrome?.ai : undefined;

    lines.push('[Step 2] Extension Popup Scope:');
    lines.push(`  - LanguageModel (Standard Class): ${winLm || globalLm ? 'EXISTS' : 'UNDEFINED'}`);
    lines.push(`  - window.ai: ${winAi ? 'EXISTS' : 'UNDEFINED'}`);
    lines.push(`  - chrome.ai: ${chromeAi ? 'EXISTS' : 'UNDEFINED'}`);

    const lm = this.getLanguageModelApi();
    let canDownload = false;

    if (lm) {
      try {
        lines.push('[Step 3] Popup LanguageModel Availability:');
        let avail = 'no';
        if (typeof lm.availability === 'function') {
          const res = await lm.availability();
          avail = typeof res === 'string' ? res : (res?.available || 'no');
        } else if (typeof lm.capabilities === 'function') {
          const cap = await lm.capabilities();
          avail = cap.available;
        }
        lines.push(`  - availability: "${avail}"`);
        if (avail === 'readily' || avail === 'available') {
          lines.push('  ✅ Popup AI status: Ready!');
          
          // Live Inference Smoke Test
          try {
            lines.push('[Step 4] Live Inference Smoke Test (Testing session.prompt in extension):');
            const smokeStart = Date.now();
            let testSession: any = null;
            try {
              testSession = await lm.create({
                initialPrompts: [{ role: 'system', content: 'You are a test helper.' }]
              });
            } catch (e1) {
              testSession = await lm.create();
            }

            const smokePromptPromise = testSession.prompt('Reply with just the word: OK');
            const smokeTimeoutPromise = new Promise<string>((_, reject) => setTimeout(() => reject(new Error('Prompt timeout after 15s')), 15000));
            const smokeReply = await Promise.race([smokePromptPromise, smokeTimeoutPromise]);
            const elapsedSec = ((Date.now() - smokeStart) / 1000).toFixed(2);
            lines.push(`  🎉 In-Context Inference Succeeded in ${elapsedSec}s! Response: "${smokeReply.trim()}"`);
            if (testSession && typeof testSession.destroy === 'function') {
              try { testSession.destroy(); } catch (e) {}
            }
          } catch (smokeErr: any) {
            lines.push(`  ❌ Live Inference Smoke Test Failed: ${smokeErr?.message || String(smokeErr)}`);
          }

        } else if (avail === 'after-download' || avail === 'downloading') {
          canDownload = true;
          lines.push('  🟡 Popup AI status: Pending download.');
        }
      } catch (capErr: any) {
        lines.push(`  - Availability query error: ${capErr?.message || String(capErr)}`);
      }
    } else {
      lines.push('  ℹ️ Note: In standard Chrome, LanguageModel is injected into secure HTTPS webpage tabs (e.g. WhatsApp Web).');
    }

    // Step 4: In-Page Active Tab Probe (The True Extraction Environment)
    lines.push('\n[Step 3] Probing In-Page Active Web Tab (WhatsApp/Telegram Tab):');
    if (typeof chrome !== 'undefined' && chrome.tabs && chrome.scripting) {
      try {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        const activeTab = tabs && tabs[0];
        if (activeTab && activeTab.id) {
          lines.push(`  - Target Tab ID: ${activeTab.id} ("${activeTab.title || 'Tab'}", ${activeTab.url || ''})`);

          const probeResults = await chrome.scripting.executeScript({
            target: { tabId: activeTab.id },
            world: 'MAIN',
            func: async () => {
              const tabLm = (window as any).LanguageModel ||
                            (typeof globalThis !== 'undefined' && (globalThis as any).LanguageModel) ||
                            (window as any).ai?.languageModel ||
                            ((window as any).chrome && (window as any).chrome.ai?.languageModel) ||
                            (window as any).model?.languageModel;

              if (!tabLm) {
                return {
                  hasLm: false,
                  keys: Object.keys(window).filter(k => k.toLowerCase().includes('ai') || k.toLowerCase().includes('model') || k.toLowerCase().includes('language'))
                };
              }

              try {
                let avail = 'no';
                if (typeof tabLm.availability === 'function') {
                  const res = await tabLm.availability();
                  avail = typeof res === 'string' ? res : (res?.available || 'no');
                } else if (typeof tabLm.capabilities === 'function') {
                  const cap = await tabLm.capabilities();
                  avail = cap.available;
                }
                return {
                  hasLm: true,
                  available: avail
                };
              } catch (e: any) {
                return { hasLm: true, error: e?.message };
              }
            }
          });

          const res = probeResults && probeResults[0]?.result;
          if (res?.hasLm) {
            lines.push('  ✅ Active Web Tab has LanguageModel Prompt API!');
            lines.push(`  - Tab Model Availability: "${res.available}"`);
            if (res.available === 'readily' || res.available === 'available') {
              lines.push('  🎉 FULL SUCCESS: In-Page LanguageModel is ready for extraction!');
            } else if (res.available === 'after-download' || res.available === 'downloading') {
              canDownload = true;
              lines.push('  🟡 In-Page status: "after-download". Click "⚡ Start Download" below.');
            } else if (res.available === 'no') {
              lines.push('  ❌ In-Page status: "no". Hardware/VRAM requirements not yet recognized.');
            }
          } else {
            lines.push('  ❌ LanguageModel / window.ai was NOT found in the active webpage tab.');
            if (res?.keys && res.keys.length > 0) {
              lines.push(`  - Related window globals found: [${res.keys.join(', ')}]`);
            }
          }
        } else {
          lines.push('  ❌ No active browser tab found.');
        }
      } catch (scriptErr: any) {
        lines.push(`  ❌ Scripting probe failed: ${scriptErr?.message || String(scriptErr)}`);
      }
    }

    return { report: lines.join('\n'), success: true, canDownload };
  }

  /**
   * Forces Chrome to start downloading Gemini Nano model in the background.
   */
  public static async triggerModelDownload(onProgress: (percent: number, loaded: number, total: number) => void): Promise<boolean> {
    const aiObject = (typeof window !== 'undefined' && ((window as any).ai || (window as any).model)) || (typeof self !== 'undefined' && (self as any).ai);
    if (!aiObject || !aiObject.languageModel) {
      throw new Error('ai.languageModel is not available to trigger download.');
    }

    const session = await aiObject.languageModel.create({
      monitor: (m: any) => {
        m.addEventListener('downloadprogress', (e: any) => {
          const loaded = e.loaded || 0;
          const total = e.total || 1;
          const percent = Math.round((loaded / total) * 100);
          onProgress(percent, loaded, total);
        });
      }
    });

    if (session && typeof session.destroy === 'function') {
      try { session.destroy(); } catch (e) {}
    }
    return true;
  }

  /**
   * Gets or initializes the Gemini Nano session with structured normalizer instructions.
   */
  private static async getSession(onDownloadProgress?: (progressPercent: number) => void): Promise<any> {
    if (this.session) return this.session;

    const lm = this.getLanguageModelApi();
    if (!lm) {
      throw new Error('Chrome Built-in LanguageModel Prompt API is not available.');
    }

    const systemPromptContent = `You are an expert school message classifier and structured JSON normalizer.
Your task is to take raw chat logs from school messaging platforms (WhatsApp, Telegram, Teams) and extract all distinct messages into a clean JSON array.

RULES:
1. Output ONLY a valid raw JSON array of objects. Do NOT use markdown code blocks (\`\`\`json) and do NOT provide any conversational prefix or suffix.
2. For each message, extract:
   - "sender": Teacher, Mentor, or Parent name / phone number
   - "time": e.g. "9:57 AM" or "6:33 PM"
   - "date": "M/D/YYYY" format (e.g. "8/25/2026", "8/17/2026")
   - "timestamp": "<Time>, <Date>" format (e.g. "9:57 AM, 8/25/2026")
   - "category": Categorize strictly into ONE of:
     * "HOMEWORK_OR_TASK_ANNOUNCEMENT": Homework tasks, worksheets, submissions, study material instructions.
     * "CIRCULAR_NOTICE": Assembly dates, dress codes, bus timing, field trips, holidays.
     * "GENERAL_CHAT": Parent queries, polite acknowledgments, informal messages.
   - "body": Full cleaned text of the announcement/message.
   - "submissionDeadline": Extract exact submission date if explicitly stated, or null.
3. Preserve all URLs and drive links within the body text.`;

    const sessionOptions: any = {
      initialPrompts: [{ role: 'system', content: systemPromptContent }]
    };

    if (onDownloadProgress) {
      sessionOptions.monitor = (m: any) => {
        m.addEventListener('downloadprogress', (e: any) => {
          if (e.loaded && e.total) {
            const percent = Math.round((e.loaded / e.total) * 100);
            onDownloadProgress(percent);
          }
        });
      };
    }

    try {
      this.session = await lm.create(sessionOptions);
    } catch (e1) {
      try {
        this.session = await lm.create({ systemPrompt: systemPromptContent });
      } catch (e2) {
        this.session = await lm.create();
      }
    }
    return this.session;
  }

  /**
   * Resolves WhatsApp date headers ("TODAY", "YESTERDAY", "MONDAY", "TUESDAY", explicit dates) to exact M/D/YYYY.
   */
  public static resolveDateHeader(headerText: string, anchorDate = new Date()): string {
    const clean = headerText.trim().toLowerCase();
    const anchor = new Date(anchorDate);
    
    if (clean === 'today') {
      return `${anchor.getMonth() + 1}/${anchor.getDate()}/${anchor.getFullYear()}`;
    }
    if (clean === 'yesterday') {
      const y = new Date(anchor.getTime() - 24 * 60 * 60 * 1000);
      return `${y.getMonth() + 1}/${y.getDate()}/${y.getFullYear()}`;
    }
    
    // Weekday matching (e.g. "Monday", "Tuesday", "Wednesday", etc.)
    const weekdays = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const targetDayIdx = weekdays.indexOf(clean);
    if (targetDayIdx !== -1) {
      const currentDayIdx = anchor.getDay();
      let diffDays = currentDayIdx - targetDayIdx;
      if (diffDays <= 0) diffDays += 7; // Most recent past occurrence
      const targetDate = new Date(anchor.getTime() - diffDays * 24 * 60 * 60 * 1000);
      return `${targetDate.getMonth() + 1}/${targetDate.getDate()}/${targetDate.getFullYear()}`;
    }

    const monthNames: Record<string, number> = {
      january: 1, jan: 1, february: 2, feb: 2, march: 3, mar: 3, april: 4, apr: 4,
      may: 5, june: 6, jun: 6, july: 7, jul: 7, august: 8, aug: 8,
      september: 9, sep: 9, sept: 9, october: 10, oct: 10, november: 11, nov: 11, december: 12, dec: 12
    };

    // Format: "18 August 2026" or "18 Aug 2026" or "18 August, 2026"
    const dayMonthYear = clean.match(/^(\d{1,2})\s+([a-z]+),?\s*(\d{4})?$/);
    if (dayMonthYear && monthNames[dayMonthYear[2]]) {
      const d = parseInt(dayMonthYear[1], 10);
      const m = monthNames[dayMonthYear[2]];
      const y = dayMonthYear[3] ? parseInt(dayMonthYear[3], 10) : anchor.getFullYear();
      return `${m}/${d}/${y}`;
    }

    // Format: "August 18, 2026" or "Aug 18 2026"
    const monthDayYear = clean.match(/^([a-z]+)\s+(\d{1,2}),?\s*(\d{4})?$/);
    if (monthDayYear && monthNames[monthDayYear[1]]) {
      const m = monthNames[monthDayYear[1]];
      const d = parseInt(monthDayYear[2], 10);
      const y = monthDayYear[3] ? parseInt(monthDayYear[3], 10) : anchor.getFullYear();
      return `${m}/${d}/${y}`;
    }
    
    // Explicit date matching (e.g. "8/24/2026", "24/08/2026", "23.07.2026", "2026-08-24")
    const explicitMatch = clean.match(/(\d{1,4})[\/\.\-](\d{1,2})[\/\.\-](\d{2,4})/);
    if (explicitMatch) {
      const p1 = parseInt(explicitMatch[1], 10);
      const p2 = parseInt(explicitMatch[2], 10);
      const p3 = parseInt(explicitMatch[3], 10);
      if (p1 > 1000) {
        // YYYY-MM-DD
        return `${p2}/${p3}/${p1}`;
      }
      const y = p3 < 100 ? 2000 + p3 : p3;
      if (p1 > 12 && p2 <= 12) {
        // DD/MM/YYYY -> MM/DD/YYYY
        return `${p2}/${p1}/${y}`;
      }
      return `${p1}/${p2}/${y}`;
    }

    return `${anchor.getMonth() + 1}/${anchor.getDate()}/${anchor.getFullYear()}`;
  }

  /**
   * Deterministic structural regex parser as a fallback when on-device LLM is busy or unavailable.
   */
  public static extractNoticesDeterministically(
    rawChunk: string,
    chatName = 'School Chat',
    childName = 'Atharva',
    defaultDate?: string
  ): NormalizedNoticeMessage[] {
    if (!rawChunk || rawChunk.trim().length === 0) return [];

    const now = new Date();
    // Default to yesterday if past midnight, or today
    const anchorDate = now;
    let currentDate = defaultDate || this.resolveDateHeader('yesterday', anchorDate);

    const notices: NormalizedNoticeMessage[] = [];
    const lines = rawChunk.split('\n').map(l => l.trim()).filter(l => l.length > 0);

    const timeRegex = /\b(\d{1,2}:\d{2}\s*(?:AM|PM|am|pm))\b/;
    const dateHeaderRegex = /^(today|yesterday|monday|tuesday|wednesday|thursday|friday|saturday|sunday|\d{1,2}\/\d{1,2}\/\d{2,4}|\d{1,2}\s+[a-z]+(?:\s+\d{4})?|[a-z]+\s+\d{1,2}(?:,\s*\d{4})?)$/i;
    
    let currentSender = 'School Teacher';
    let currentBodyLines: string[] = [];
    let currentTime = '8:00 PM';

    const flushCurrent = () => {
      if (currentBodyLines.length > 0) {
        // Filter out single-letter avatar abbreviations (e.g. "T", "S", "B", "2") from top of body
        let cleanedLines = currentBodyLines.filter(l => !/^[A-Za-z0-9]$/.test(l.trim()));
        
        // Extract teacher sender name from top lines if present
        let detectedSender = currentSender;
        const candidateSenders: string[] = [];
        while (cleanedLines.length > 0) {
          const firstLine = cleanedLines[0];
          if (/^[A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3}$/.test(firstLine) && !firstLine.toLowerCase().includes('dear') && !firstLine.toLowerCase().includes('homework') && !firstLine.toLowerCase().includes('subject') && !firstLine.toLowerCase().includes('monday') && !firstLine.toLowerCase().includes('tuesday')) {
            candidateSenders.push(firstLine);
            cleanedLines.shift();
          } else {
            break;
          }
        }
        if (candidateSenders.length > 0) {
          detectedSender = candidateSenders[candidateSenders.length - 1];
        }

        const fullBody = cleanedLines.join('\n').trim();

        // Skip only deleted messages
        if (fullBody.length > 1 && !fullBody.toLowerCase().includes('this message was deleted')) {
          const lower = fullBody.toLowerCase();
          let cat: 'HOMEWORK_OR_TASK_ANNOUNCEMENT' | 'CIRCULAR_NOTICE' | 'GENERAL_CHAT' = 'GENERAL_CHAT';
          if (lower.includes('homework') || lower.includes('submission') || lower.includes('worksheet') || lower.includes('exercise') || lower.includes('ms word') || lower.includes('paragraph in')) {
            cat = 'HOMEWORK_OR_TASK_ANNOUNCEMENT';
          } else if (lower.includes('circular') || lower.includes('dear parents') || lower.includes('holiday') || lower.includes('assembly') || lower.includes('greetings') || lower.includes('science notebook')) {
            cat = 'CIRCULAR_NOTICE';
          }

          const urls: string[] = [];
          const urlMatches = fullBody.match(/https?:\/\/[^\s]+/g);
          if (urlMatches) {
            urlMatches.forEach(u => { if (!urls.includes(u)) urls.push(u); });
          }

          // Extract submission deadline
          let deadline: string | null = null;
          const dlMatch = fullBody.match(/(?:submission\s+date|submit\s+by|due\s+date|upload.*by)[:\s-]+(?:[A-Za-z]+,\s*)?([0-9]{1,2}(?:st|nd|rd|th)?\s+[A-Za-z]+(?:\s+\d{4})?|\d{1,2}\/\d{1,2}\/\d{4})/i);
          if (dlMatch && dlMatch[1]) {
            deadline = dlMatch[1].trim();
          }

          notices.push({
            id: `det_${Date.now()}_${notices.length}`,
            chatName,
            sender: detectedSender,
            timestamp: `${currentTime}, ${currentDate}`,
            date: currentDate,
            time: currentTime,
            body: fullBody,
            category: cat,
            submissionDeadline: deadline,
            detectedLinks: urls,
            childName
          });
        }
      }
      currentBodyLines = [];
    };

    for (const line of lines) {
      if (dateHeaderRegex.test(line)) {
        flushCurrent();
        currentDate = this.resolveDateHeader(line, anchorDate);
      } else {
        const timeMatch = line.match(timeRegex);
        if (timeMatch && line.length < 50) {
          flushCurrent();
          currentTime = timeMatch[1];
          const cleaned = line.replace(timeRegex, '').replace(/[-–—,:\[\]]/g, '').trim();
          if (cleaned.length > 1 && !cleaned.includes('+91')) {
            currentSender = cleaned;
          }
        } else {
          currentBodyLines.push(line);
        }
      }
    }
    flushCurrent();

    return notices;
  }

  /**
   * Cleans model output and parses JSON safely with schema validation.
   */
  public static parseAndSanitizeAiResponse(
    rawOutput: string,
    chatName = 'School Chat',
    childName = 'Atharva'
  ): NormalizedNoticeMessage[] {
    if (!rawOutput) return [];

    let cleaned = rawOutput.trim();
    // Strip markdown code fences if model accidentally added them
    cleaned = cleaned.replace(/^```json\s*/i, '');
    cleaned = cleaned.replace(/^```\s*/i, '');
    cleaned = cleaned.replace(/\s*```$/i, '');
    cleaned = cleaned.trim();

    let parsed: any = null;
    try {
      parsed = JSON.parse(cleaned);
    } catch (e1) {
      const firstBracket = cleaned.indexOf('[');
      const lastBracket = cleaned.lastIndexOf(']');
      if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
        try { parsed = JSON.parse(cleaned.substring(firstBracket, lastBracket + 1)); } catch (e2) {}
      }
      if (!parsed) {
        const firstBrace = cleaned.indexOf('{');
        const lastBrace = cleaned.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
          try { parsed = JSON.parse(cleaned.substring(firstBrace, lastBrace + 1)); } catch (e3) {}
        }
      }
    }

    let items: any[] = [];
    if (Array.isArray(parsed)) {
      items = parsed;
    } else if (parsed && Array.isArray(parsed.messages)) {
      items = parsed.messages;
    } else if (parsed && Array.isArray(parsed.notices)) {
      items = parsed.notices;
    } else if (parsed && typeof parsed === 'object' && (parsed.sender || parsed.body)) {
      items = [parsed];
    }

    if (items.length === 0) {
      return [];
    }

    return items.map((item, idx) => {
      const timeStr = item.time || (item.timestamp && item.timestamp.includes(',') ? item.timestamp.split(',')[0].trim() : '');
      const dateStr = item.date || (item.timestamp && item.timestamp.includes(',') ? item.timestamp.split(',')[1].trim() : '');
      const fullTs = (timeStr && dateStr) ? `${timeStr}, ${dateStr}` : (item.timestamp || new Date().toLocaleString());

      let cat: 'HOMEWORK_OR_TASK_ANNOUNCEMENT' | 'CIRCULAR_NOTICE' | 'GENERAL_CHAT' = 'GENERAL_CHAT';
      if (item.category === 'HOMEWORK_OR_TASK_ANNOUNCEMENT' || item.category === 'CIRCULAR_NOTICE') {
        cat = item.category;
      } else {
        const lowerBody = (item.body || '').toLowerCase();
        if (lowerBody.includes('homework') || lowerBody.includes('submission') || lowerBody.includes('worksheet') || lowerBody.includes('exercise')) {
          cat = 'HOMEWORK_OR_TASK_ANNOUNCEMENT';
        } else if (lowerBody.includes('circular') || lowerBody.includes('dear parents') || lowerBody.includes('reminder') || lowerBody.includes('assembly')) {
          cat = 'CIRCULAR_NOTICE';
        }
      }

      // Links extractor
      const urls: string[] = [];
      const urlMatches = (item.body || '').match(/https?:\/\/[^\s]+/g);
      if (urlMatches) {
        urlMatches.forEach((u: string) => {
          if (!urls.includes(u)) urls.push(u);
        });
      }

      return {
        id: `ai_${Date.now()}_${idx}`,
        chatName,
        sender: item.sender || 'Teacher/Parent',
        timestamp: fullTs,
        date: dateStr || undefined,
        time: timeStr || undefined,
        body: item.body || '',
        category: cat,
        submissionDeadline: item.submissionDeadline || null,
        detectedLinks: urls,
        childName
      };
    });
  }

  /**
   * Cleans up allocated AI session memory when done.
   */
  public static destroySession(): void {
    if (this.session && typeof this.session.destroy === 'function') {
      try {
        this.session.destroy();
      } catch (e) {}
      this.session = null;
    }
  }
}
