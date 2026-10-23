// Run with: node --env-file=.env.local scripts/check-database.js
// Read-only: does not create records or print customer data/credentials.
import { createDatabase, DatabaseError } from '../lib/database.js';

const database = createDatabase();
try {
  for (const resource of ['businesses', 'customers', 'card_designs', 'loyalty_cards', 'visits', 'redemptions']) {
    // Nonexistent tenant intentionally returns no private data while checking schema.
    await database.read('org_ConnectionCheck', resource, { limit: 1 });
    console.log(`${resource}: ready`);
  }
} catch (error) {
  console.error(error instanceof DatabaseError ? error.code : 'DATABASE_UNAVAILABLE');
  process.exitCode = 1;
}
