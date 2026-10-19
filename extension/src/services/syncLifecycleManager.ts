/**
 * Sync Lifecycle & Concurrency Manager
 * 
 * Provides strict singleton mutex locking, ingestion mutual exclusion,
 * zero-group pre-flight checks, and immediate mid-flight cancellation tokens.
 */

import { WhatsAppDiagnosticLogger } from './whatsappLogger';

export type SyncState = 'IDLE' | 'SYNCING' | 'INGESTING' | 'ABORTING';

export interface SyncLockStatus {
  state: SyncState;
  isSyncRunning: boolean;
  isIngestionRunning: boolean;
  inFlightIngestionsCount: number;
  syncStartedAt: number | null;
  activeTargetGroup: string | null;
  abortRequested: boolean;
  abortedGroups: string[];
}

export class SyncLifecycleManager {
  private static readonly SYNC_TIMEOUT_MS = 8 * 60 * 1000; // 8 minute stale lock recovery
  private static abortRequestedGlobal = false;
  private static abortedGroupSet = new Set<string>();

  /**
   * Evaluates whether a background sync is allowed to start.
   * Rejects if:
   * 1. Another sync is already active and healthy.
   * 2. Export ingestion is currently active or queued.
   * 3. 0 tracked groups exist and no manual group is specified.
   */
  public static async canRunBackgroundSync(
    isManual = false,
    specificGroup?: string
  ): Promise<{ allowed: boolean; reason?: string }> {
    // Check Network Online Status
    if (typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean' && !navigator.onLine) {
      return {
        allowed: false,
        reason: 'Network offline. Background sync paused until connection is restored.'
      };
    }

    const status = await this.getLockStatus();

    // Check Ingestion Lock
    if (status.isIngestionRunning || status.inFlightIngestionsCount > 0) {
      return {
        allowed: false,
        reason: `Export ingestion is currently active (${status.inFlightIngestionsCount} in queue). Background sync paused.`
      };
    }

    // Check Sync Singleton Mutex Lock
    if (status.isSyncRunning) {
      if (status.syncStartedAt && (Date.now() - status.syncStartedAt < this.SYNC_TIMEOUT_MS)) {
        return {
          allowed: false,
          reason: `Another sync instance is already running on group "${status.activeTargetGroup || 'General'}" (started ${Math.round((Date.now() - status.syncStartedAt) / 1000)}s ago).`
        };
      } else {
        // Recover stale lock
        await WhatsAppDiagnosticLogger.log('WARN', 'CONN', '⚠️ [STALE_LOCK_RECOVERY] Previous sync lock exceeded 8 minutes without release. Recovering lock.');
        await this.forceReleaseAllLocks();
      }
    }

    // Zero-Group Strict Guard: If not manual and no tracked chats exist, refuse to run
    if (!isManual && !specificGroup) {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        const state = await chrome.storage.local.get(['tracked_whatsapp_chats', 'target_whatsapp_chats']);
        const tracked = state.tracked_whatsapp_chats || [];
        const filterStr = (state.target_whatsapp_chats || '').trim();
        if (tracked.length === 0 && filterStr.length === 0) {
          return {
            allowed: false,
            reason: 'Zero tracked groups configured. Background scanner remains idle.'
          };
        }
      }
    }

    return { allowed: true };
  }

  /**
   * Saves a resumable sync checkpoint cursor for a child group.
   */
  public static async saveCheckpoint(childId: string, groupName: string, cursor: any): Promise<void> {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      const key = `sync_checkpoint_${childId}_${groupName.replace(/[^a-zA-Z0-9]/g, '_')}`;
      await chrome.storage.local.set({ [key]: { cursor, savedAt: Date.now() } });
    }
  }

  /**
   * Retrieves a resumable sync checkpoint cursor for a child group.
   */
  public static async getCheckpoint(childId: string, groupName: string): Promise<any | null> {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      const key = `sync_checkpoint_${childId}_${groupName.replace(/[^a-zA-Z0-9]/g, '_')}`;
      const state = await chrome.storage.local.get([key]);
      return state[key] ? state[key].cursor : null;
    }
    return null;
  }

  /**
   * Acquires the singleton sync lock.
   */
  public static async acquireSyncLock(activeGroup?: string): Promise<boolean> {
    const evalRes = await this.canRunBackgroundSync(true, activeGroup);
    if (!evalRes.allowed) {
      await WhatsAppDiagnosticLogger.log('WARN', 'CONN', `🔒 [SYNC_LOCK_REJECT] Cannot acquire sync lock: ${evalRes.reason}`);
      return false;
    }

    this.abortRequestedGlobal = false;
    this.abortedGroupSet.clear();

    const now = Date.now();
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      await chrome.storage.local.set({
        sync_is_running: true,
        sync_started_at: now,
        sync_active_group: activeGroup || null,
        sync_abort_requested: false,
        sync_aborted_groups: []
      });
    }

    return true;
  }

  /**
   * Updates the currently processing target group name in the lock.
   */
  public static async setActiveGroup(groupName: string): Promise<void> {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      await chrome.storage.local.set({ sync_active_group: groupName });
    }
  }

  /**
   * Releases the singleton sync lock.
   */
  public static async releaseSyncLock(): Promise<void> {
    this.abortRequestedGlobal = false;
    this.abortedGroupSet.clear();

    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      await chrome.storage.local.set({
        sync_is_running: false,
        sync_started_at: null,
        sync_active_group: null,
        sync_abort_requested: false,
        sync_aborted_groups: []
      });
    }
  }

  /**
   * Acquires an ingestion lock (called when starting or queuing export ingestion).
   */
  public static async acquireIngestionLock(): Promise<number> {
    let currentCount = 0;
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      const stored = await chrome.storage.local.get(['ingestion_in_flight_count']);
      currentCount = (stored.ingestion_in_flight_count || 0) + 1;
      await chrome.storage.local.set({
        ingestion_active: true,
        ingestion_in_flight_count: currentCount
      });
    } else {
      currentCount = 1;
    }
    await WhatsAppDiagnosticLogger.log('INFO', 'DRIVE', `🔒 [INGESTION_LOCK_ACQUIRED] Ingestion active (Queue: ${currentCount}). Background sync locked.`);
    return currentCount;
  }

  /**
   * Decrements ingestion lock and releases if queue is empty.
   */
  public static async releaseIngestionLock(): Promise<number> {
    let remaining = 0;
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      const stored = await chrome.storage.local.get(['ingestion_in_flight_count']);
      remaining = Math.max(0, (stored.ingestion_in_flight_count || 1) - 1);
      await chrome.storage.local.set({
        ingestion_active: remaining > 0,
        ingestion_in_flight_count: remaining
      });
    }
    if (remaining === 0) {
      await WhatsAppDiagnosticLogger.log('INFO', 'DRIVE', '🔓 [INGESTION_LOCK_RELEASED] All ingestions completed. Background sync unlocked.');
    }
    return remaining;
  }

  /**
   * Requests immediate mid-flight abort for the active sync or a specific group.
   */
  public static async requestAbort(groupName?: string): Promise<void> {
    if (groupName && groupName.trim()) {
      this.abortedGroupSet.add(groupName.trim().toLowerCase());
    } else {
      this.abortRequestedGlobal = true;
    }

    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      await chrome.storage.local.set({
        sync_abort_requested: true,
        sync_aborted_groups: Array.from(this.abortedGroupSet)
      });
    }

    await WhatsAppDiagnosticLogger.log('WARN', 'CONN', `⏹️ [ABORT_SIGNAL_SENT] Abort signal dispatched ${groupName ? `for "${groupName}"` : 'globally'}.`);
  }

  /**
   * Checks whether the active sync or a specific group has received an abort signal.
   */
  public static async isAborted(groupName?: string): Promise<boolean> {
    if (this.abortRequestedGlobal) return true;
    if (groupName && this.abortedGroupSet.has(groupName.trim().toLowerCase())) return true;

    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      const state = await chrome.storage.local.get(['sync_abort_requested', 'sync_aborted_groups']);
      if (state.sync_abort_requested && !groupName) return true;
      if (groupName && Array.isArray(state.sync_aborted_groups)) {
        if (state.sync_aborted_groups.includes(groupName.trim().toLowerCase())) return true;
      }
    }

    return false;
  }

  /**
   * Retrieves the current comprehensive lock status.
   */
  public static async getLockStatus(): Promise<SyncLockStatus> {
    let isSyncRunning = false;
    let isIngestionRunning = false;
    let inFlightIngestionsCount = 0;
    let syncStartedAt: number | null = null;
    let activeTargetGroup: string | null = null;
    let abortRequested = this.abortRequestedGlobal;
    let abortedGroups = Array.from(this.abortedGroupSet);

    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      const stored = await chrome.storage.local.get([
        'sync_is_running',
        'sync_started_at',
        'sync_active_group',
        'ingestion_active',
        'ingestion_in_flight_count',
        'sync_abort_requested',
        'sync_aborted_groups'
      ]);
      isSyncRunning = Boolean(stored.sync_is_running);
      syncStartedAt = stored.sync_started_at || null;
      activeTargetGroup = stored.sync_active_group || null;
      isIngestionRunning = Boolean(stored.ingestion_active);
      inFlightIngestionsCount = stored.ingestion_in_flight_count || 0;
      abortRequested = Boolean(stored.sync_abort_requested) || this.abortRequestedGlobal;
      abortedGroups = stored.sync_aborted_groups || Array.from(this.abortedGroupSet);
    }

    let state: SyncState = 'IDLE';
    if (isIngestionRunning) state = 'INGESTING';
    else if (abortRequested) state = 'ABORTING';
    else if (isSyncRunning) state = 'SYNCING';

    return {
      state,
      isSyncRunning,
      isIngestionRunning,
      inFlightIngestionsCount,
      syncStartedAt,
      activeTargetGroup,
      abortRequested,
      abortedGroups
    };
  }

  /**
   * Resets all locks unconditionally (used for recovery/testing).
   */
  public static async forceReleaseAllLocks(): Promise<void> {
    this.abortRequestedGlobal = false;
    this.abortedGroupSet.clear();

    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      await chrome.storage.local.set({
        sync_is_running: false,
        sync_started_at: null,
        sync_active_group: null,
        ingestion_active: false,
        ingestion_in_flight_count: 0,
        sync_abort_requested: false,
        sync_aborted_groups: []
      });
    }
  }
}
