import { WhatsAppDiagnosticLogger } from './whatsappLogger';

export interface NotificationOptions {
  title: string;
  message: string;
  id?: string;
  priority?: 0 | 1 | 2;
  requireInteraction?: boolean;
}

export interface SchoolAttachmentNotificationStats {
  classroomDownloaded?: number;
  classroomSkipped?: number;
  emailDownloaded?: number;
  emailSkipped?: number;
  childName?: string;
}

export interface InitialSyncNotificationStats {
  childName?: string;
  courses?: number;
  emails?: number;
  attachments?: number;
  classroomAttachments?: number;
  emailAttachments?: number;
  ocrIndexed?: number;
  skipped?: number;
}

export class NotificationService {
  private static pendingAttachmentStats: SchoolAttachmentNotificationStats = {};

  /**
   * Dispatches a rich completion notification at the end of the 1-time historical onboarding data sync.
   * Highlights counts for courses, emails/circulars, downloaded attachments, and OCR indexed documents.
   */
  public static async notifyInitialSyncCompleted(stats: InitialSyncNotificationStats): Promise<string | null> {
    const child = stats.childName || 'Child';
    const courses = stats.courses ?? 0;
    const emails = stats.emails ?? 0;
    const atts = stats.attachments ?? 0;
    const ocr = stats.ocrIndexed ?? 0;
    const skipped = stats.skipped ?? 0;

    let details = `${courses} course(s), ${emails} circular(s), ${atts} attachment(s)`;
    if (ocr > 0) {
      details += `, ${ocr} OCR-indexed`;
    }
    if (skipped > 0) {
      details += ` (${skipped} already present)`;
    }

    const message = `1-Time School Vault setup complete for ${child}! Synced ${details}. Instant search is active.`;

    return await this.send({
      id: 'kids_initial_sync_complete',
      title: `K.I.D.S. Vault Ready (${child})`,
      message,
      priority: 2,
      requireInteraction: true
    });
  }

  /**
   * Dispatches a Windows / Chrome native desktop notification.
   * Handles iconUrl resolution, requireInteraction, fallback logging, and storage persistence.
   */
  public static async send(options: NotificationOptions): Promise<string | null> {
    const title = options.title || 'K.I.D.S. Notification';
    const message = options.message || '';
    const priority = options.priority !== undefined ? options.priority : 2;
    const requireInteraction = options.requireInteraction ?? false;

    // 1. Record in diagnostic logs
    await WhatsAppDiagnosticLogger.log('INFO', 'DRIVE', `🔔 [NOTIFICATION] ${title}: ${message}`);

    // 2. Persist in storage for UI banner / screen reader toast
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      await chrome.storage.local.set({
        last_notification: {
          title,
          message,
          timestamp: Date.now()
        }
      }).catch(() => {});
    }

    // 3. Dispatch native Chrome Notification
    if (typeof chrome !== 'undefined' && chrome.notifications?.create) {
      return new Promise((resolve) => {
        try {
          const iconUrl = (typeof chrome.runtime?.getURL === 'function')
            ? chrome.runtime.getURL('icons/icon128.png')
            : 'icons/icon128.png';

          const notificationOptions: chrome.notifications.NotificationOptions = {
            type: 'basic',
            iconUrl,
            title,
            message,
            priority,
            requireInteraction
          };

          const notificationId = options.id || `kids_notif_${Date.now()}`;
          (chrome.notifications.create as any)(notificationOptions, (id: any) => {
            if (chrome.runtime?.lastError) {
              console.warn('[NotificationService] chrome.notifications.create warning:', chrome.runtime.lastError);
              resolve(null);
            } else {
              resolve(id || notificationId);
            }
          });
        } catch (e) {
          console.warn('[NotificationService] Error creating notification:', e);
          resolve(null);
        }
      });
    }
    return null;
  }

  /**
   * Dispatches or updates exactly ONE single consolidated desktop notification for both Classroom and Email attachments.
   * Uses a static notification ID ('kids_school_attachments_sync') so Windows Action Center updates the single
   * toast rather than producing two separate notifications.
   */
  public static async notifySchoolAttachments(stats: SchoolAttachmentNotificationStats): Promise<string | null> {
    // If the 1-time historical initial sync is currently in progress, suppress intermediate attachment notifications
    // so the user receives only 1 comprehensive completion notification at the end.
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      const syncFlags: any = await chrome.storage.local.get(['step2_initial_sync_in_progress']).catch(() => ({}));
      if (syncFlags?.step2_initial_sync_in_progress) {
        return null;
      }
    }

    if (stats.classroomDownloaded !== undefined) {
      this.pendingAttachmentStats.classroomDownloaded = stats.classroomDownloaded;
    }
    if (stats.classroomSkipped !== undefined) {
      this.pendingAttachmentStats.classroomSkipped = stats.classroomSkipped;
    }
    if (stats.emailDownloaded !== undefined) {
      this.pendingAttachmentStats.emailDownloaded = stats.emailDownloaded;
    }
    if (stats.emailSkipped !== undefined) {
      this.pendingAttachmentStats.emailSkipped = stats.emailSkipped;
    }
    if (stats.childName) {
      this.pendingAttachmentStats.childName = stats.childName;
    }

    const classCount = this.pendingAttachmentStats.classroomDownloaded ?? 0;
    const emailCount = this.pendingAttachmentStats.emailDownloaded ?? 0;

    let message = '';
    if (classCount > 0 && emailCount > 0) {
      message = `Successfully saved ${classCount} Classroom worksheets & ${emailCount} Email circular attachments to Parent Vault.`;
    } else if (classCount > 0) {
      message = `Successfully saved ${classCount} Classroom worksheets to Parent Vault.`;
    } else if (emailCount > 0) {
      message = `Successfully saved ${emailCount} Email circular attachments to Parent Vault.`;
    } else {
      const skippedTotal = (this.pendingAttachmentStats.classroomSkipped ?? 0) + (this.pendingAttachmentStats.emailSkipped ?? 0);
      message = `All Classroom worksheets and Email circular attachments are up to date in Parent Vault (${skippedTotal} checked).`;
    }

    return await this.send({
      id: 'kids_school_attachments_sync',
      title: 'K.I.D.S. School Attachments Synced',
      message,
      priority: 1,
      requireInteraction: false
    });
  }

  public static resetAttachmentStats(): void {
    this.pendingAttachmentStats = {};
  }
}
