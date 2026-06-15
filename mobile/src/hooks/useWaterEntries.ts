import { useState, useEffect, useCallback } from 'react';
import { useDb } from './useDb';
import type { LocalWaterEntry } from '../db/schema';
import { generateUUID, nowISO } from '../services/uuid';

interface UseWaterEntriesResult {
  entries: LocalWaterEntry[];
  totalMl: number;
  isLoading: boolean;
  error: string | null;
  addWater: (userId: number, volumeMl: number) => Promise<string>;
  deleteWater: (localId: string) => Promise<void>;
  refresh: () => Promise<void>;
}

/**
 * Hook to manage water entries for a specific user and date.
 *
 * @example
 * const { totalMl, addWater } = useWaterEntries(userId, '2024-01-15');
 */
export function useWaterEntries(
  userId: number | null,
  date: string
): UseWaterEntriesResult {
  const { waterRepo, syncQueue } = useDb();

  const [entries, setEntries] = useState<LocalWaterEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!userId) {
      setEntries([]);
      setIsLoading(false);
      return;
    }
    try {
      setIsLoading(true);
      const data = await waterRepo.getWaterEntriesByDate(userId, date);
      setEntries(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load water entries');
    } finally {
      setIsLoading(false);
    }
  }, [userId, date]);

  useEffect(() => {
    load();
  }, [load]);

  const addWater = useCallback(
    async (userId: number, volumeMl: number): Promise<string> => {
      const now = nowISO();
      const localId = await generateUUID();

      const entry: Omit<LocalWaterEntry, 'sync_status' | 'sync_attempts' | 'last_sync_error'> = {
        local_id: localId,
        server_id: null,
        user_id: userId,
        volume_ml: volumeMl,
        logged_date: date,
        client_created_at: now,
        created_at: now,
      };

      await waterRepo.insertWaterEntry(entry);

      await syncQueue.enqueue({
        operation: 'CREATE',
        entity_type: 'water',
        local_id: localId,
        payload: {
          volume_ml: volumeMl,
          logged_date: date,
          client_created_at: now,
        },
      });

      await load();
      return localId;
    },
    [date, waterRepo, syncQueue, load]
  );

  const deleteWater = useCallback(
    async (localId: string): Promise<void> => {
      const entry = entries.find((e) => e.local_id === localId);
      if (!entry) return;

      if (entry.server_id) {
        await waterRepo.softDeleteWaterEntry(localId);
        await syncQueue.enqueue({
          operation: 'DELETE',
          entity_type: 'water',
          local_id: localId,
          payload: { server_id: entry.server_id },
        });
      } else {
        await waterRepo.hardDeleteWaterEntry(localId);
      }

      await load();
    },
    [entries, waterRepo, syncQueue, load]
  );

  const totalMl = entries.reduce((sum, e) => sum + e.volume_ml, 0);

  return {
    entries,
    totalMl,
    isLoading,
    error,
    addWater,
    deleteWater,
    refresh: load,
  };
}
