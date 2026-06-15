import { useState, useEffect, useCallback } from 'react';
import { useDb } from './useDb';
import type { LocalWeightEntry } from '../db/schema';
import { generateUUID, nowISO } from '../services/uuid';

interface LogWeightParams {
  userId: number;
  weight_kg: number;
  note?: string;
}

interface UseWeightEntryResult {
  entry: LocalWeightEntry | null;
  isLoading: boolean;
  error: string | null;
  logWeight: (params: LogWeightParams) => Promise<string>;
  deleteWeight: () => Promise<void>;
  refresh: () => Promise<void>;
}

/**
 * Hook to manage weight entry for a specific user and date (one per day).
 * Handles create and delete with sync queue integration.
 *
 * @example
 * const { entry, logWeight } = useWeightEntry(userId, '2024-01-15');
 */
export function useWeightEntry(
  userId: number | null,
  date: string
): UseWeightEntryResult {
  const { weightRepo, syncQueue } = useDb();

  const [entry, setEntry] = useState<LocalWeightEntry | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!userId) {
      setEntry(null);
      setIsLoading(false);
      return;
    }
    try {
      setIsLoading(true);
      const data = await weightRepo.getWeightEntryByDate(userId, date);
      setEntry(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load weight entry');
    } finally {
      setIsLoading(false);
    }
  }, [userId, date]);

  useEffect(() => {
    load();
  }, [load]);

  const logWeight = useCallback(
    async (params: LogWeightParams): Promise<string> => {
      const now = nowISO();
      const localId = await generateUUID();

      const newEntry: Omit<LocalWeightEntry, 'sync_status' | 'sync_attempts' | 'last_sync_error'> = {
        local_id: localId,
        server_id: null,
        user_id: params.userId,
        weight_kg: params.weight_kg,
        logged_date: date,
        note: params.note ?? null,
        client_created_at: now,
        created_at: now,
      };

      await weightRepo.insertWeightEntry(newEntry);

      await syncQueue.enqueue({
        operation: 'CREATE',
        entity_type: 'weight',
        local_id: localId,
        payload: {
          weight_kg: params.weight_kg,
          logged_date: date,
          note: params.note ?? null,
          client_created_at: now,
        },
      });

      await load();
      return localId;
    },
    [date, weightRepo, syncQueue, load]
  );

  const deleteWeight = useCallback(async (): Promise<void> => {
    if (!entry) return;

    if (entry.server_id) {
      await weightRepo.softDeleteWeightEntry(entry.local_id);
      await syncQueue.enqueue({
        operation: 'DELETE',
        entity_type: 'weight',
        local_id: entry.local_id,
        payload: { server_id: entry.server_id },
      });
    } else {
      await weightRepo.hardDeleteWeightEntry(entry.local_id);
    }

    await load();
  }, [entry, weightRepo, syncQueue, load]);

  return {
    entry,
    isLoading,
    error,
    logWeight,
    deleteWeight,
    refresh: load,
  };
}