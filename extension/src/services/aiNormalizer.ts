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

        const fullBody = cleanedLines.join('\n').trim();

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

    lines.forEach(line => {
      // Date cluster separator
      if (dateHeaderRegex.test(line)) {
        flushTurn();
        currentDate = this.resolveDateHeader(line, anchorDate);
        return;
      }

      // Check standard WhatsApp header: [Time, Date] Author:, [Date, Time] Author:, [Date] Author:, [Time] Author:
      const waHeaderMatch = line.match(/^\[([^\]]+)\]\s*([^:]+):/);
      if (waHeaderMatch) {
        flushTurn();
        const headerInside = waHeaderMatch[1].trim();
        const parts = headerInside.split(',').map(p => p.trim());
        if (parts.length >= 2) {
          if (parts[0].includes(':')) {
            currentTime = parts[0];
            currentDate = this.resolveDateHeader(parts[1], anchorDate);
          } else {
            currentDate = this.resolveDateHeader(parts[0], anchorDate);
            currentTime = parts[1];
          }
        } else if (parts.length === 1) {
          if (parts[0].includes(':')) {
            currentTime = parts[0];
          } else {
            currentDate = this.resolveDateHeader(parts[0], anchorDate);
          }
        }
        let cleanAuthor = waHeaderMatch[2].trim().replace(/^\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4}\s*/, '').trim();
        currentSender = cleanAuthor || 'School Teacher';
        return;
      }

      currentBodyLines.push(line);
    });

    flushTurn();
    return turns;
  }

  /**
   * Normalizes raw conversational text turn-by-turn into structured JSON.
   */
  public static async normalizeRawChatText(
    rawText: string,
    chatName: string = 'Active School Chat',
    childName: string = 'Atharva',
    onDownloadProgress?: (progressPercent: number) => void
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

    if (rawTurns.length === 0) return [];

    let session: any = null;
    let slmConsecutiveFailures = 0;
    try {
      session = await this.getSession(onDownloadProgress);
      if (session) {
        await WhatsAppDiagnosticLogger.log('INFO', 'EXTRACT', `[SLM_SESSION] Chrome LanguageModel (Gemini Nano) Prompt session active.`);
      }
    } catch (sErr: any) {
      await WhatsAppDiagnosticLogger.log('WARN', 'EXTRACT', `[SLM_SESSION] LanguageModel Prompt session fallback: ${sErr?.message || sErr}`);
    }

    const normalizedResults: NormalizedNoticeMessage[] = [];

    // Step 2: Run loop per sender turn through Chrome SLM with circuit breaker
    for (let tIdx = 0; tIdx < rawTurns.length; tIdx++) {
      const turn = rawTurns[tIdx];
      let finalNotice: NormalizedNoticeMessage | null = null;
      let usedSlm = false;
      const startTime = Date.now();

      // Try Chrome SLM for this turn if session is active and not circuit-broken
      if (session && slmConsecutiveFailures < 2) {
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
            setTimeout(() => reject(new Error('Turn SLM timeout')), 2500)
          );
          const rawSlmResp = await Promise.race([session.prompt(turnPrompt), timeoutPromise]);
          const parsed = this.parseAndSanitizeAiResponse(rawSlmResp, chatName, childName);
          if (parsed && parsed.length > 0) {
            finalNotice = parsed[0];
            finalNotice.id = turn.id;
            finalNotice.date = finalNotice.date || turn.date;
            finalNotice.time = finalNotice.time || turn.time;
            finalNotice.timestamp = `${finalNotice.time}, ${finalNotice.date}`;
            usedSlm = true;
            slmConsecutiveFailures = 0;
          }
        } catch (turnErr) {
          slmConsecutiveFailures++;
        }
      }

      // Fast-path / Fallback if SLM didn't produce a notice
      if (!finalNotice) {
        const lower = turn.rawBody.toLowerCase();
        let cat: 'HOMEWORK_OR_TASK_ANNOUNCEMENT' | 'CIRCULAR_NOTICE' | 'GENERAL_CHAT' = 'GENERAL_CHAT';
        if (lower.includes('homework') || lower.includes('submission') || lower.includes('worksheet') || lower.includes('exercise') || lower.includes('ms word') || lower.includes('paragraph in')) {
          cat = 'HOMEWORK_OR_TASK_ANNOUNCEMENT';
        } else if (lower.includes('circular') || lower.includes('dear parents') || lower.includes('holiday') || lower.includes('assembly') || lower.includes('greetings') || lower.includes('science notebook')) {
          cat = 'CIRCULAR_NOTICE';
        }

        let deadline: string | null = null;
        const dlMatch = turn.rawBody.match(/(?:submission\s+date|submit\s+by|due\s+date|upload.*by)[:\s-]+(?:[A-Za-z]+,\s*)?([0-9]{1,2}(?:st|nd|rd|th)?\s+[A-Za-z]+(?:\s+\d{4})?|\d{1,2}\/\d{1,2}\/\d{4})/i);
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
          childName
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
