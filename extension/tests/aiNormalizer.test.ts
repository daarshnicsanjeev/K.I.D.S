import { describe, it, expect } from 'vitest';
import { AiNormalizerService } from '../src/services/aiNormalizer';

describe('AiNormalizerService', () => {
  it('should cleanly parse direct JSON array from Gemini Nano', () => {
    const mockOutput = JSON.stringify([
      {
        sender: 'Kamaljit Kaur Kaunsal',
        time: '7:43 PM',
        date: '8/12/2026',
        timestamp: '7:43 PM, 8/12/2026',
        category: 'HOMEWORK_OR_TASK_ANNOUNCEMENT',
        body: 'Please find attached the homework on Comparing and Ordering Numbers.',
        submissionDeadline: 'Monday, 17th August'
      }
    ]);

    const result = AiNormalizerService.parseAndSanitizeAiResponse(mockOutput, '3B Cambridge', 'Atharva');
    expect(result).toHaveLength(1);
    expect(result[0].sender).toBe('Kamaljit Kaur Kaunsal');
    expect(result[0].date).toBe('8/12/2026');
    expect(result[0].time).toBe('7:43 PM');
    expect(result[0].category).toBe('HOMEWORK_OR_TASK_ANNOUNCEMENT');
    expect(result[0].submissionDeadline).toBe('Monday, 17th August');
    expect(result[0].childName).toBe('Atharva');
  });

  it('should strip markdown codeblocks and prefix text from AI response', () => {
    const rawAiOutput = `Here is the structured JSON output:
\`\`\`json
[
  {
    "sender": "Teji Sayal Bindra",
    "timestamp": "6:34 PM, 8/17/2026",
    "body": "Subject: ICT - Homework. Cut, Copy and Paste in MS Word. Upload to https://drive.google.com/drive/folders/150RtiyeRWMI49wtv84JF8OLOORiM63jm",
    "category": "HOMEWORK_OR_TASK_ANNOUNCEMENT",
    "submissionDeadline": "24 August 2026"
  }
]
\`\`\`
Hope this helps!`;

    const result = AiNormalizerService.parseAndSanitizeAiResponse(rawAiOutput, '3B Cambridge', 'Atharva');
    expect(result).toHaveLength(1);
    expect(result[0].sender).toBe('Teji Sayal Bindra');
    expect(result[0].date).toBe('8/17/2026');
    expect(result[0].time).toBe('6:34 PM');
    expect(result[0].detectedLinks).toContain('https://drive.google.com/drive/folders/150RtiyeRWMI49wtv84JF8OLOORiM63jm');
    expect(result[0].submissionDeadline).toBe('24 August 2026');
  });

  it('should auto-classify unclassified homework text', () => {
    const rawAiOutput = JSON.stringify([
      {
        sender: 'Bhumika Parmar',
        timestamp: '5:47 PM, 7/13/2026',
        body: 'Dear Parents, please complete the Math worksheet and exercise by tomorrow.',
        category: 'GENERAL_CHAT'
      }
    ]);

    const result = AiNormalizerService.parseAndSanitizeAiResponse(rawAiOutput, '3B Cambridge', 'Atharva');
    expect(result).toHaveLength(1);
    expect(result[0].category).toBe('HOMEWORK_OR_TASK_ANNOUNCEMENT');
  });

  it('should report unsupported gracefully when Prompt API is absent', async () => {
    const availability = await AiNormalizerService.getAvailability();
    expect(['readily', 'after-download', 'no', 'unsupported']).toContain(availability.status);
  });

  it('should stitch fragmented continuation turns seamlessly', () => {
    const fragmentedRawChat = `[11:49 AM, 7/1/2026] +91 93216 80087: Dear Parents,
Greetings!
We are delighted to invite you to our Coffee Meet.
Venue: Seminar Hall
[11:49 AM, 8/27/2026] +91 93216 80087: 7:45 a.m. – 9:30 a.m.
Grades 2, 3 & 4
10:30 a.m. – 11:45 a.m.
We sincerely look forward to meeting you over a cup of coffee.`;

    const turns = AiNormalizerService.extractRawTurns(fragmentedRawChat, new Date('2026-08-27T12:00:00Z'));
    expect(turns).toHaveLength(1);
    expect(turns[0].date).toBe('7/1/2026');
    expect(turns[0].rawBody).toContain('Venue: Seminar Hall');
    expect(turns[0].rawBody).toContain('7:45 a.m. – 9:30 a.m.');
    expect(turns[0].rawBody).toContain('over a cup of coffee');
  });

  it('should filter out dummy attachment clock pills and star chips', () => {
    const rawWithPills = `[8:22 AM, 6/25/2026] Bhoomi: [Document Attachment: 7:12 PM]
[8:22 AM, 6/25/2026] Bhoomi: Dear Parents, please find attached the revised schedule.
[12:25 AM, 8/4/2026] Bhoomi: [Document Attachment: star]`;

    const turns = AiNormalizerService.extractRawTurns(rawWithPills, new Date('2026-08-27T12:00:00Z'));
    expect(turns).toHaveLength(1);
    expect(turns[0].rawBody).toContain('Dear Parents, please find attached the revised schedule.');
  });

  it('should parse Android WhatsApp export unbracketed date/time lines and filter system events', () => {
    const rawExport = `6/3/26, 2:25 PM - Messages and calls are end-to-end encrypted. Only people in this chat can read, listen to, or share them.
6/3/26, 7:44 AM - ~ Bhoomi created group "3B Cambridge 2026 - 27"
6/3/26, 2:25 PM - ~ Bhoomi added you
6/3/26, 2:46 PM - ~ Bhoomi added Nikita Patil
6/6/26, 7:44 PM - +91 93216 80087: Dear Parents,
Greetings!
I am Ms. Bhumika Parmar, the in-charge teacher of Grade 3 Division B.
School Reopening Details:
Date: Monday, 8th June 2026
School Timings: 1:15 p.m. to 6:00 p.m.
6/8/26, 8:15 AM - +91 93216 80087: Dear Parents, please note that today is day 1 timetable.
6/10/26, 6:30 PM - Kamaljit Kaur: Subject: Math - Homework. Complete Exercise 4. Submission date: 15 June 2026.`;

    const turns = AiNormalizerService.extractRawTurns(rawExport);
    expect(turns).toHaveLength(3);

    expect(turns[0].date).toBe('6/6/2026');
    expect(turns[0].time).toBe('7:44 PM');
    expect(turns[0].sender).toBe('Bhumika Parmar');
    expect(turns[0].rawBody).toContain('School Reopening Details');

    expect(turns[1].date).toBe('6/8/2026');
    expect(turns[1].time).toBe('8:15 AM');
    expect(turns[1].rawBody).toContain('day 1 timetable');

    expect(turns[2].date).toBe('6/10/2026');
    expect(turns[2].sender).toBe('Kamaljit Kaur');
    expect(turns[2].rawBody).toContain('Math - Homework');
  });
});
