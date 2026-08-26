import { describe, it, expect } from 'vitest';
import { AiNormalizerService } from '../src/services/aiNormalizer';

describe('WhatsApp Sync Engine — Complete End-to-End TDD Suite', () => {

  describe('1. Date Header & Month Name Resolution', () => {
    it('should parse British and American month-name date headers correctly', () => {
      const anchor = new Date('2026-08-26T12:00:00Z');

      expect(AiNormalizerService.resolveDateHeader('18 August 2026', anchor)).toBe('8/18/2026');
      expect(AiNormalizerService.resolveDateHeader('August 18, 2026', anchor)).toBe('8/18/2026');
      expect(AiNormalizerService.resolveDateHeader('4 August 2026', anchor)).toBe('8/4/2026');
      expect(AiNormalizerService.resolveDateHeader('1 Aug 2026', anchor)).toBe('8/1/2026');
      expect(AiNormalizerService.resolveDateHeader('today', anchor)).toBe('8/26/2026');
      expect(AiNormalizerService.resolveDateHeader('yesterday', anchor)).toBe('8/25/2026');
      expect(AiNormalizerService.resolveDateHeader('8/12/2026', anchor)).toBe('8/12/2026');
    });

    it('should resolve weekday headers to the most recent past dates', () => {
      const anchor = new Date('2026-08-26T12:00:00Z'); // Wednesday
      const tuesday = AiNormalizerService.resolveDateHeader('tuesday', anchor);
      expect(tuesday).toBe('8/25/2026');

      const monday = AiNormalizerService.resolveDateHeader('monday', anchor);
      expect(monday).toBe('8/24/2026');
    });
  });

  describe('2. Message Turn Extraction & Deduplication', () => {
    it('should deduplicate identical message bodies and prioritize teacher name over phone number', () => {
      const rawText = `[6:22 PM, 8/18/2026] +91 87672 22296:
SST Homework – Community Helpers
Draw and colour any 3 community helpers in your notebook.
Submission date - 25th August 2026.

[8/18/2026] Teji Sayal Bindra:
SST Homework – Community Helpers
Draw and colour any 3 community helpers in your notebook.
Submission date - 25th August 2026.`;

      const turns = AiNormalizerService.extractRawTurns(rawText);
      expect(turns).toHaveLength(1);
      expect(turns[0].sender).toBe('Teji Sayal Bindra');
      expect(turns[0].time).toBe('6:22 PM');
      expect(turns[0].date).toBe('8/18/2026');
    });

    it('should extract correct dates and times across distinct dates without defaulting to 8:00 PM', () => {
      const rawText = `12 August 2026
[6:47 PM] +91 97739 40266:
Dear Parents, Please note that students will report to school at 11:30 a.m. on Thursday (13th August) for rehearsals.

17 August 2026
[6:34 PM] +91 77688 06593:
Subject: ICT – Homework. Topic: Cut, Copy and Paste in MS Word. Submission Date: Monday, 24 August 2026.
https://drive.google.com/drive/folders/150RtiyeRWMI49wtv84JF8OLOORiM63jm

24 August 2026
[7:02 PM] +91 77688 06593:
Subject: ICT – Homework. Topic: Editing and Formatting Text in MS Word. Submission Date: Monday, 31 August 2026.
https://drive.google.com/drive/folders/1oGt6hVjPLxVE2l0D90xrzUgVdv8mZ1ad`;

      const turns = AiNormalizerService.extractRawTurns(rawText);
      expect(turns).toHaveLength(3);
      expect(turns[0].date).toBe('8/12/2026');
      expect(turns[0].time).toBe('6:47 PM');
      expect(turns[1].date).toBe('8/17/2026');
      expect(turns[1].time).toBe('6:34 PM');
      expect(turns[2].date).toBe('8/24/2026');
      expect(turns[2].time).toBe('7:02 PM');
    });
  });

  describe('3. Document Attachment Title Resolution', () => {
    it('should extract referenced document filenames from notice bodies', () => {
      const rawText = `[8/25/2026, 8:00 PM] Ruchi:
[Document Attachment: View "GRADE 3&4- ASSSESSMENTS STRUCTURE.pdf"]
Dear Parents, Please find below the presentation on the Assessment Structure.

[8/20/2026, 8:00 PM] Ruchi:
[Document Attachment: View "Grade 3- Assessment Structure.pdf"]
Dear Parents, Please find attached the detailed assessment structure for Grade 3.

[8/19/2026, 8:00 PM] Kamaljit Kaur Kaunsal:
[Document Attachment: Download "Ordering Numbers.jpg.jpeg"]
Dear Parents, Please find attached the homework on Ordering Numbers.`;

      const turns = AiNormalizerService.extractRawTurns(rawText);
      expect(turns).toHaveLength(3);

      const docTitles: string[] = [];
      turns.forEach(t => {
        const match = t.rawBody.match(/\[Document Attachment:\s*(?:View|Download)?\s*["']?([^"'\n\]]+)["']?\]/i);
        if (match && match[1]) {
          docTitles.push(match[1].replace(/^View\s*["']?|["']$/gi, '').trim());
        }
      });

      expect(docTitles).toContain('GRADE 3&4- ASSSESSMENTS STRUCTURE.pdf');
      expect(docTitles).toContain('Grade 3- Assessment Structure.pdf');
      expect(docTitles).toContain('Ordering Numbers.jpg.jpeg');
    });
  });

  describe('4. Deterministic Extraction Fallback', () => {
    it('should accurately extract categories and deadlines deterministically', () => {
      const rawText = `18 August 2026
[6:22 PM] Teji Sayal Bindra:
SST Homework – Community Helpers
Draw and colour any 3 community helpers in your notebook.
Write their names and one way they help us.
Submission date - 25th August 2026.

25 August 2026
[8:08 PM] +91 77109 73630:
Dear Parents, Greetings of the day!
Please note that tomorrow, Wednesday, 26th August 2026, will be a holiday on account of Eid and Onam.
School will remain closed for all students.`;

      const notices = AiNormalizerService.extractNoticesDeterministically(rawText, '3B Cambridge', 'Atharva');
      expect(notices).toHaveLength(2);
      expect(notices[0].category).toBe('HOMEWORK_OR_TASK_ANNOUNCEMENT');
      expect(notices[0].submissionDeadline).toBe('25th August 2026');
      expect(notices[0].date).toBe('8/18/2026');
      expect(notices[0].time).toBe('6:22 PM');

      expect(notices[1].category).toBe('CIRCULAR_NOTICE');
      expect(notices[1].date).toBe('8/25/2026');
      expect(notices[1].time).toBe('8:08 PM');
    });
  });

  describe('5. Complete Normalization Pipeline', () => {
    it('should normalize full month of notices with 0 errors', async () => {
      const rawChatText = `[8/4/2026, 9:00 AM] Teji Sayal Bindra:
Dear Parents, Greetings from Witty International School! The Official Class WhatsApp Group has been created.

[8/8/2026, 5:15 PM] +91 93216 80087:
Dear Parents, We are pleased to share the details for our upcoming Grade 3B Class Assembly. The theme is "World Humanitarian Day". Assembly Date: Friday, 21st August 2026.

[8/12/2026, 7:43 PM] +91 97739 40266:
Dear Parents, Please find attached the homework on Comparing and Ordering Numbers. Submit by Monday, 17th August.

[8/17/2026, 6:34 PM] +91 77688 06593:
Subject: ICT – Homework. Topic: Cut, Copy and Paste in MS Word. Submission Date: Monday, 24 August 2026.
https://drive.google.com/drive/folders/150RtiyeRWMI49wtv84JF8OLOORiM63jm

[8/25/2026, 6:25 PM] +91 87672 22296:
SST Homework – The Fabric of Community & Daily Life. Submission date - 1st September, 2026.`;

      const results = await AiNormalizerService.normalizeRawChatText(rawChatText, '3B Cambridge 2026 - 27', 'Atharva');
      expect(results).toHaveLength(5);

      expect(results[0].date).toBe('8/4/2026');
      expect(results[0].time).toBe('9:00 AM');
      expect(results[0].sender).toBe('Teji Sayal Bindra');

      const ictHomework = results.find(r => r.body.includes('ICT – Homework'));
      expect(ictHomework).toBeDefined();
      expect(ictHomework?.submissionDeadline).toContain('24 August 2026');
      expect(ictHomework?.detectedLinks).toContain('https://drive.google.com/drive/folders/150RtiyeRWMI49wtv84JF8OLOORiM63jm');

      const sstHomework = results.find(r => r.body.includes('The Fabric of Community'));
      expect(sstHomework).toBeDefined();
      expect(sstHomework?.submissionDeadline).toContain('1st September');
    });
  });
});
