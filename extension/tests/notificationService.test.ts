import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotificationService } from '../src/services/notificationService';
import { WhatsAppDiagnosticLogger } from '../src/services/whatsappLogger';
import { PersonalDriveService } from '../src/services/personalDriveService';

describe('NotificationService Test Suite', () => {
  let localStorageMock: Record<string, any> = {};
  let createdNotifications: any[] = [];

  beforeEach(() => {
    localStorageMock = {};
    createdNotifications = [];
    NotificationService.resetAttachmentStats();

    (global as any).chrome = {
      runtime: {
        getURL: vi.fn((path: string) => `chrome-extension://test/${path}`),
        lastError: null
      },
      storage: {
        local: {
          get: vi.fn((keys: string[]) => {
            const res: Record<string, any> = {};
            keys.forEach(k => { if (k in localStorageMock) res[k] = localStorageMock[k]; });
            return Promise.resolve(res);
          }),
          set: vi.fn((data: Record<string, any>) => {
            Object.assign(localStorageMock, data);
            return Promise.resolve();
          })
        }
      },
      notifications: {
        create: vi.fn((options: any, cb?: (id: string) => void) => {
          createdNotifications.push(options);
          if (typeof cb === 'function') cb('test_notif_id');
        })
      }
    };
  });

  it('dispatches desktop notification with icon, title, message, and priority', async () => {
    const notifId = await NotificationService.send({
      id: 'test_sync_1',
      title: 'K.I.D.S. Sync Finished',
      message: '19 email attachments saved.',
      priority: 2,
      requireInteraction: true
    });

    expect(notifId).toBe('test_notif_id');
    expect(chrome.notifications.create).toHaveBeenCalled();
    expect(createdNotifications).toHaveLength(1);
    const created = createdNotifications[0];
    expect(created.type).toBe('basic');
    expect(created.title).toBe('K.I.D.S. Sync Finished');
    expect(created.message).toBe('19 email attachments saved.');
    expect(created.priority).toBe(2);
    expect(created.requireInteraction).toBe(true);
    expect(created.iconUrl).toContain('icons/icon128.png');
  });

  it('persists notification in local storage for UI/screen readers and logs it', async () => {
    const logSpy = vi.spyOn(WhatsAppDiagnosticLogger, 'log');

    await NotificationService.send({
      title: 'Classroom Sync Complete',
      message: '205 files downloaded.'
    });

    expect(localStorageMock.last_notification).toBeDefined();
    expect(localStorageMock.last_notification.title).toBe('Classroom Sync Complete');
    expect(localStorageMock.last_notification.message).toBe('205 files downloaded.');
    expect(logSpy).toHaveBeenCalledWith(
      'INFO',
      'DRIVE',
      expect.stringContaining('Classroom Sync Complete: 205 files downloaded.')
    );
  });

  it('gracefully handles chrome.runtime.lastError without crashing', async () => {
    (chrome.runtime as any).lastError = { message: 'Notifications disabled by user' };
    (chrome.notifications as any).create = vi.fn((options: any, cb?: (id: string) => void) => {
      if (typeof cb === 'function') cb('');
    });

    const notifId = await NotificationService.send({
      title: 'Test Error Handling',
      message: 'Checking robustness.'
    });

    expect(notifId).toBeNull();
  });

  describe('Single Consolidated Notification for Classroom & Email', () => {
    it('consolidates Classroom and Email downloads into exactly 1 notification', async () => {
      await NotificationService.notifySchoolAttachments({
        classroomDownloaded: 205,
        classroomSkipped: 0,
        emailDownloaded: 19,
        emailSkipped: 0
      });

      expect(createdNotifications).toHaveLength(1);
      expect(createdNotifications[0].title).toBe('K.I.D.S. School Attachments Synced');
      expect(createdNotifications[0].message).toBe(
        'Successfully saved 205 Classroom worksheets & 19 Email circular attachments to Parent Vault.'
      );
    });

    it('syncSchoolAttachments executes both syncs silently and dispatches only 1 unified notification', async () => {
      vi.spyOn(PersonalDriveService, 'syncClassroomAttachments').mockResolvedValue({
        total: 205,
        downloaded: 205,
        skipped: 0,
        failed: 0
      });

      vi.spyOn(PersonalDriveService, 'syncEmailAttachments').mockResolvedValue({
        total: 19,
        downloaded: 19,
        skipped: 0,
        failed: 0
      });

      const res = await PersonalDriveService.syncSchoolAttachments('p-tok', 's-tok', 'Atharva', '2026-2027');

      expect(res.classroom.downloaded).toBe(205);
      expect(res.email.downloaded).toBe(19);

      // Must be EXACTLY 1 notification dispatched, NOT 2!
      expect(createdNotifications).toHaveLength(1);
      expect(createdNotifications[0].title).toBe('K.I.D.S. School Attachments Synced');
      expect(createdNotifications[0].message).toContain('205 Classroom worksheets & 19 Email circular attachments');
    });

    it('formats single notification when only Classroom attachments are downloaded', async () => {
      await NotificationService.notifySchoolAttachments({
        classroomDownloaded: 15,
        classroomSkipped: 5,
        emailDownloaded: 0,
        emailSkipped: 19
      });

      expect(createdNotifications).toHaveLength(1);
      expect(createdNotifications[0].message).toBe('Successfully saved 15 Classroom worksheets to Parent Vault.');
    });

    it('formats single notification when only Email circulars are downloaded', async () => {
      await NotificationService.notifySchoolAttachments({
        classroomDownloaded: 0,
        classroomSkipped: 205,
        emailDownloaded: 7,
        emailSkipped: 12
      });

      expect(createdNotifications).toHaveLength(1);
      expect(createdNotifications[0].message).toBe('Successfully saved 7 Email circular attachments to Parent Vault.');
    });

    it('dispatches rich 1-time sync completion notification with full metrics including OCR', async () => {
      await NotificationService.notifyInitialSyncCompleted({
        childName: 'Atharva',
        courses: 8,
        emails: 15,
        attachments: 224,
        classroomAttachments: 205,
        emailAttachments: 19,
        ocrIndexed: 180,
        skipped: 12
      });

      expect(createdNotifications).toHaveLength(1);
      const notif = createdNotifications[0];
      expect(notif.title).toBe('K.I.D.S. Vault Ready (Atharva)');
      expect(notif.message).toContain('8 course(s)');
      expect(notif.message).toContain('15 circular(s)');
      expect(notif.message).toContain('224 attachment(s)');
      expect(notif.message).toContain('180 OCR-indexed');
      expect(notif.message).toContain('12 already present');
      expect(notif.priority).toBe(2);
      expect(notif.requireInteraction).toBe(true);
    });
  });
});
