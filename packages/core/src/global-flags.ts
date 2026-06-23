import { coreDb } from './db/client.ts';
import { globalFlags } from './db/schema/global-flags.ts';

/**
 * Deployment-wide runtime flags. Singleton (not tenant-scoped). The store is a
 * key/value table; this module owns the typed contract so callers never touch
 * raw keys. Add a flag by extending {@link GlobalFlags} + {@link DEFAULT_GLOBAL_FLAGS}.
 */
export interface GlobalFlags {
  /**
   * Force every agent chat to render reasoning steps + tool calls expanded,
   * overriding each user's local density preference. Chat is already persisted
   * unconditionally, so this is purely the display lever.
   */
  force_expand_reasoning: boolean;
}

export const DEFAULT_GLOBAL_FLAGS: GlobalFlags = {
  force_expand_reasoning: false,
};

export type GlobalFlagKey = keyof GlobalFlags;

export const GLOBAL_FLAG_KEYS: readonly GlobalFlagKey[] = Object.keys(
  DEFAULT_GLOBAL_FLAGS,
) as GlobalFlagKey[];

export function isGlobalFlagKey(key: string): key is GlobalFlagKey {
  return (GLOBAL_FLAG_KEYS as readonly string[]).includes(key);
}

/** Read all flags, falling back to defaults for any key with no stored row. */
export async function getGlobalFlags(): Promise<GlobalFlags> {
  const rows = await coreDb().select().from(globalFlags);
  const stored = new Map(rows.map((r) => [r.key, r.value]));
  const result = { ...DEFAULT_GLOBAL_FLAGS };
  for (const key of GLOBAL_FLAG_KEYS) {
    const raw = stored.get(key);
    if (typeof raw === 'boolean') result[key] = raw;
  }
  return result;
}

/** Upsert a single flag. */
export async function setGlobalFlag(key: GlobalFlagKey, value: boolean): Promise<void> {
  await coreDb()
    .insert(globalFlags)
    .values({ key, value })
    .onConflictDoUpdate({
      target: globalFlags.key,
      set: { value, updatedAt: new Date() },
    });
}
