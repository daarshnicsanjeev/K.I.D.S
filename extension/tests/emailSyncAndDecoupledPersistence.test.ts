import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { PersonalDriveService } from '../src/services/personalDriveService';

describe('Decoupled Email Sync & Metadata Persistence Engine', () => {
  let callOrder: string[] = [];
  let savedFiles: Record<string, any> = {};

  beforeEach(() => {
    callOrder = [];
    savedFiles = {};

    (global as any).chrome = {
      storage: {
        local: {
          get: vi.fn().mockResolvedValue({}),
          set: vi.fn().mockResolvedValue(undefined)
        }
      }
    };

    vi.spyOn(PersonalDriveService, 'getOrCreateKidFolder').mockResolvedValue({ id: 'kid-folder-123' } as any);
    vi.spyOn(PersonalDriveService, 'getOrCreateClassroomFolder').mockResolvedValue({ id: 'class-folder-123', attachmentsFolderId: 'class-att-123' } as any);
    vi.spyOn(PersonalDriveService, 'getOrCreateEmailsFolder').mockResolvedValue({ id: 'email-folder-123', attachmentsFolderId: 'email-att-123' } as any);
    vi.spyOn(PersonalDriveService, 'getOrCreateSubfolder').mockResolvedValue({ id: 'subfolder-123' } as any);
    vi.spyOn(PersonalDriveService, 'getMasterWorkerUrl').mockResolvedValue('https://script.google.com/macros/s/TEST/exec');

    vi.spyOn(PersonalDriveService, 'saveSchoolVaultFile').mockImplementation(async (folderId, fileName, content, mimeType) => {
      callOrder.push(`saveSchoolVaultFile:${fileName}`);
      savedFiles[fileName] = content;
      return { id: `id-${fileName}`, name: fileName } as any;
    });

    vi.spyOn(PersonalDriveService, 'saveJsonFileInFolder').mockImplementation(async (token, folderId, fileName, data) => {
      callOrder.push(`saveJsonFileInFolder:${fileName}`);
      savedFiles[fileName] = data;
      return { id: `id-${fileName}`, name: fileName } as any;
    });

    vi.spyOn(PersonalDriveService, 'saveTextFileInFolder').mockImplementation(async (token, folderId, fileName, text, mime) => {
      callOrder.push(`saveTextFileInFolder:${fileName}`);
      savedFiles[fileName] = text;
      return { id: `id-${fileName}`, name: fileName } as any;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('guarantees all JSON metadata files are saved before heavy attachment synchronization begins', async () => {
    vi.spyOn(PersonalDriveService, 'syncClassroomAttachments').mockImplementation(async () => {
      callOrder.push('syncClassroomAttachments');
      return { total: 10, downloaded: 10, skipped: 0, failed: 0 };
    });

    vi.spyOn(PersonalDriveService, 'syncEmailAttachments').mockImplementation(async () => {
      callOrder.push('syncEmailAttachments');
      return { total: 5, downloaded: 5, skipped: 0, failed: 0 };
    });

    const syncData = {
      classroom: { courses: [{ id: 'c1', name: 'Grade 3B CAIE' }], totalCourses: 1 },
      gmail: {
        totalEmails: 2,
        emails: [
          { id: 'm1', from: 'principal@school.edu', subject: 'Circular 1', body: 'School is closed.' },
          { id: 'm2', from: 'teacher@school.edu', subject: 'Notice 2', body: 'Field trip tomorrow.' }
        ]
      },
      digest: {
        md: '# Daily Digest',
        masterTimeline: [{ id: 't1', title: 'Circular 1' }]
      }
    };

    await PersonalDriveService.saveExtractedSchoolData('parent-token', 'Atharva', '2026-2027', syncData, 'student-token');

    // 1. Verify files were saved
    expect(savedFiles['classroom_data.json']).toBeDefined();
    expect(savedFiles['school_emails.json']).toBeDefined();
    expect(savedFiles['school_emails.json'].totalEmails).toBe(2);
    expect(savedFiles['latest_digest.md']).toBeDefined();
    expect(savedFiles['master_timeline.json']).toBeDefined();

    // 2. Verify strict ordering: All metadata MUST be saved BEFORE syncClassroomAttachments starts!
    const classIdx = callOrder.indexOf('saveSchoolVaultFile:classroom_data.json');
    const emailIdx = callOrder.indexOf('saveSchoolVaultFile:school_emails.json');
    const digestIdx = callOrder.indexOf('saveSchoolVaultFile:latest_digest.md');
    const timelineIdx = callOrder.indexOf('saveSchoolVaultFile:master_timeline.json');
    const attIdx = callOrder.indexOf('syncClassroomAttachments');
    const emAttIdx = callOrder.indexOf('syncEmailAttachments');

    expect(classIdx).toBeGreaterThanOrEqual(0);
    expect(emailIdx).toBeGreaterThanOrEqual(0);
    expect(digestIdx).toBeGreaterThanOrEqual(0);
    expect(timelineIdx).toBeGreaterThanOrEqual(0);
    expect(attIdx).toBeGreaterThanOrEqual(0);
    expect(emAttIdx).toBeGreaterThanOrEqual(0);

    // All JSON files saved before attachments
    expect(emailIdx).toBeLessThan(attIdx);
    expect(digestIdx).toBeLessThan(attIdx);
    expect(timelineIdx).toBeLessThan(attIdx);
    expect(attIdx).toBeLessThan(emAttIdx);
  });

  it('guarantees school_emails.json is saved even when syncData.gmail is absent or null', async () => {
    vi.spyOn(PersonalDriveService, 'syncClassroomAttachments').mockResolvedValue({ total: 0, downloaded: 0, skipped: 0, failed: 0 });
    vi.spyOn(PersonalDriveService, 'syncEmailAttachments').mockResolvedValue({ total: 0, downloaded: 0, skipped: 0, failed: 0 });

    const syncData = {
      classroom: { courses: [{ id: 'c1' }] }
    };

    await PersonalDriveService.saveExtractedSchoolData('parent-token', 'Atharva', '2026-2027', syncData);

    expect(savedFiles['school_emails.json']).toBeDefined();
    expect(savedFiles['school_emails.json'].kidName).toBe('Atharva');
    expect(savedFiles['school_emails.json'].academicYear).toBe('2026-2027');
    expect(savedFiles['school_emails.json'].totalEmails).toBe(0);
    expect(Array.isArray(savedFiles['school_emails.json'].emails)).toBe(true);
  });

  it('guarantees school_emails.json is safely preserved even if syncClassroomAttachments throws an error', async () => {
    vi.spyOn(PersonalDriveService, 'syncClassroomAttachments').mockRejectedValue(new Error('Drive network timeout'));
    vi.spyOn(PersonalDriveService, 'syncEmailAttachments').mockResolvedValue({ total: 0, downloaded: 0, skipped: 0, failed: 0 });

    const syncData = {
      classroom: { courses: [{ id: 'c1' }] },
      gmail: {
        totalEmails: 1,
        emails: [{ id: 'm1', from: 'admin@school.com', subject: 'Sports Day' }]
      }
    };

    // Should complete cleanly without throwing unhandled error
    await expect(
      PersonalDriveService.saveExtractedSchoolData('parent-token', 'Atharva', '2026-2027', syncData)
    ).resolves.not.toThrow();

    expect(savedFiles['school_emails.json']).toBeDefined();
    expect(savedFiles['school_emails.json'].totalEmails).toBe(1);
  });

  it('guarantees GmailIngester strictly excludes automated classroom notifications and operates in extractOnly mode', () => {
    const gsPath = path.resolve(__dirname, '../../gas-mcp-server/src/GmailIngester.gs');
    const provPath = path.resolve(__dirname, '../src/services/gasProvisioner.ts');
    const gs = fs.readFileSync(gsPath, 'utf8');
    const prov = fs.readFileSync(provPath, 'utf8');

    // 1. extractOnly parameter supported
    expect(gs).toContain('sync: function(targetFolderId, childName, academicYear, schoolDomain, isIncremental, extractOnly)');
    expect(prov).toContain('sync: function(targetFolderId, childName, academicYear, schoolDomain, isIncremental, extractOnly)');

    // 2. DriveApp guarded under extractOnly
    expect(gs).toContain('if (targetFolderId && !extractOnly)');
    expect(prov).toContain('if (targetFolderId && !extractOnly)');

    // 3. Strict classroom exclusion
    expect(gs).toContain('-from:(classroom.google.com)');
    expect(gs).toContain('no-reply-classroom@google.com');
    expect(prov).toContain('-from:(classroom.google.com)');
    expect(prov).toContain('no-reply-classroom@google.com');

    // 4. In-memory return on extractOnly error
    expect(gs).toContain('if (extractOnly)');
    expect(prov).toContain('if (extractOnly)');
  });
});
