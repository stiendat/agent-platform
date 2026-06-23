import { describe, expect, it } from 'vitest';
import { resetCoreDb } from '../../src/db/client.ts';
import { DEFAULT_GLOBAL_FLAGS, getGlobalFlags, setGlobalFlag } from '../../src/global-flags.ts';
import { withCoreTestDb } from '../helpers.ts';

describe('global flags', () => {
  it('returns defaults when no rows are stored', async () => {
    await withCoreTestDb(async () => {
      resetCoreDb();
      const flags = await getGlobalFlags();
      expect(flags).toEqual(DEFAULT_GLOBAL_FLAGS);
      expect(flags.force_expand_reasoning).toBe(false);
    });
  });

  it('persists a flag and reads it back', async () => {
    await withCoreTestDb(async () => {
      resetCoreDb();
      await setGlobalFlag('force_expand_reasoning', true);
      const flags = await getGlobalFlags();
      expect(flags.force_expand_reasoning).toBe(true);
    });
  });

  it('upserts on repeated writes (single row, last value wins)', async () => {
    await withCoreTestDb(async () => {
      resetCoreDb();
      await setGlobalFlag('force_expand_reasoning', true);
      await setGlobalFlag('force_expand_reasoning', false);
      const flags = await getGlobalFlags();
      expect(flags.force_expand_reasoning).toBe(false);
    });
  });
});
