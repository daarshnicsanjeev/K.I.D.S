import { describe, it, expect } from 'vitest';
import { SkillGeneratorService } from '../src/services/skillGenerator';
import { ChildManager, ChildProfile } from '../src/services/childManager';

describe('Kids Intelligent Dashboard System (K.I.D.S.) - Skill & Child Services', () => {
  it('calculates past, current, and future academic years accurately', () => {
    // Test for August 2026
    const testDate = new Date(2026, 7, 30); // August is month 7 (0-indexed)
    const years = ChildManager.getCalculatedAcademicYears(testDate);
    expect(years.current).toBe('2026-2027');
    expect(years.past).toBe('2025-2026');
    expect(years.future).toBe('2027-2028');
  });

  it('validates clean first names strictly (letters only, 2-30 chars)', () => {
    expect(ChildManager.validateFirstName('Atharva').valid).toBe(true);
    expect(ChildManager.validateFirstName('Atharva').cleanName).toBe('Atharva');
    expect(ChildManager.validateFirstName('atharva').cleanName).toBe('Atharva');
    
    // Invalid inputs
    expect(ChildManager.validateFirstName('A').valid).toBe(false);
    expect(ChildManager.validateFirstName('Atharva 123').valid).toBe(false);
    expect(ChildManager.validateFirstName('Child_1').valid).toBe(false);
    expect(ChildManager.validateFirstName('').valid).toBe(false);
  });

  it('generates personalized multi-kid K.I.D.S._SKILL.md with MCP endpoints, schemas, and deadline rule', async () => {
    const mockProfiles: ChildProfile[] = [
      {
        id: 'kid_atharva_1',
        name: 'Atharva',
        academicYear: '2026-2027',
        createdAt: Date.now(),
        gasDeploymentUrl: 'https://script.google.com/macros/s/ATHARVA_DEPLOYMENT_ID/exec',
        hasClassroom: true,
        trackedChats: [{ title: '3B Cambridge 2026 - 27' }],
        registeredTools: [{ feature: 'Attendance' }]
      },
      {
        id: 'kid_ananya_2',
        name: 'Ananya',
        academicYear: '2026-2027',
        createdAt: Date.now(),
        gasDeploymentUrl: 'https://script.google.com/macros/s/ANANYA_DEPLOYMENT_ID/exec',
        hasClassroom: false,
        trackedChats: [{ title: 'Grade 1 Little Pearls' }]
      }
    ];

    const skillDoc = await SkillGeneratorService.generatePersonalizedSkill(mockProfiles);

    // 1. Check branding
    expect(skillDoc).toContain('Kids Intelligent Dashboard System (K.I.D.S.)');
    expect(skillDoc).toContain('Atharva, Ananya');

    // 2. Check MCP Server routing
    expect(skillDoc).toContain('ATHARVA_DEPLOYMENT_ID');
    expect(skillDoc).toContain('ANANYA_DEPLOYMENT_ID');

    // 3. Check master tool documentation
    expect(skillDoc).toContain('get_all_school_updates');
    expect(skillDoc).toContain('1-Click Authorization Rule');

    // 4. Check concrete JSON schemas
    expect(skillDoc).toContain('extractedPdfOcrText');
    expect(skillDoc).toContain('driveAttachmentUrl');

    // 5. Check next-period default deadline rule
    expect(skillDoc).toContain('The Next-Period Default Due Date Rule');
    expect(skillDoc).toContain('NEXT scheduled period/class of that subject');
  });
});
