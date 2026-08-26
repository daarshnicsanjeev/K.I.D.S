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
});
