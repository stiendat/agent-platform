import { jsonb, text, timestamp } from 'drizzle-orm/pg-core';
import { core } from './_core-schema.ts';

// Deployment-wide singleton key/value store for global runtime flags. Not
// tenant-scoped: a flag here applies to the whole deployment. One row per flag
// key keeps adding future flags a no-op (no migration per flag).
export const globalFlags = core.table('global_flags', {
  key: text('key').primaryKey(),
  value: jsonb('value').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
