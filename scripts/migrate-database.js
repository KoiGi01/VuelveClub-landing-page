// Local migration tool. Never deploy the database password to the browser/Vercel.
import pg from 'pg';
import { readFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';

let client;
try {
  const api = new URL(process.env.SUPABASE_URL);
  if (!/^[a-z0-9]+\.supabase\.co$/.test(api.hostname)) throw Error('INVALID_PROJECT_URL');
  const ref = api.hostname.split('.')[0];
  const certificate = await fetch('https://supabase-downloads.s3-ap-southeast-1.amazonaws.com/prod/ssl/prod-ca-2021.crt', { signal: AbortSignal.timeout(15000) });
  if (!certificate.ok) throw Error('CERTIFICATE_UNAVAILABLE');
  const ssl = { ca: await certificate.text(), rejectUnauthorized: true };
  let connection;
  if (process.env.SUPABASE_DB_URL) {
    const url = new URL(process.env.SUPABASE_DB_URL);
    if (!['postgres:', 'postgresql:'].includes(url.protocol) ||
        !(url.hostname === `db.${ref}.supabase.co` || /^aws-[0-9]+-[a-z0-9-]+\.pooler\.supabase\.com$/.test(url.hostname))) throw Error('INVALID_DATABASE_URL');
    // Use the verified TLS options below rather than URL driver overrides.
    for (const key of [...url.searchParams.keys()]) if (key.startsWith('ssl')) url.searchParams.delete(key);
    connection = { connectionString: url.toString() };
  } else {
    if (!process.env.SUPABASE_DB_PASSWORD) throw Error('DATABASE_PASSWORD_REQUIRED');
    connection = { host: `db.${ref}.supabase.co`, port: 5432, user: 'postgres', database: 'postgres', password: process.env.SUPABASE_DB_PASSWORD };
  }
  client = new pg.Client({ ...connection, ssl, connectionTimeoutMillis: 15000, statement_timeout: 30000 });
  await client.connect();
  await client.query("select pg_advisory_lock(hashtext('vuelveclub_schema_migrations'))");
  await client.query('create schema if not exists vuelve_migrations');
  await client.query('revoke all on schema vuelve_migrations from public, anon, authenticated');
  await client.query('create table if not exists vuelve_migrations.applied (name text primary key, checksum text not null, applied_at timestamptz not null default now())');
  const directory = new URL('../supabase/migrations/', import.meta.url);
  for (const name of (await readdir(directory)).filter(name => /^\d+_[a-z0-9_]+\.sql$/.test(name)).sort()) {
    const sql = (await readFile(new URL(name, directory), 'utf8')).replace(/\r\n/g, '\n');
    const checksum = createHash('sha256').update(sql).digest('hex');
    const previous = await client.query('select checksum from vuelve_migrations.applied where name=$1', [name]);
    if (previous.rows.length) {
      if (previous.rows[0].checksum !== checksum) throw Error('MIGRATION_CHECKSUM_MISMATCH');
      console.log(`${name}: already applied`); continue;
    }
    await client.query('begin');
    try {
      await client.query(sql.replace(/^begin;\s*$/m, '').replace(/^commit;\s*$/m, ''));
      await client.query('insert into vuelve_migrations.applied(name,checksum) values($1,$2)', [name, checksum]);
      await client.query('commit');
      console.log(`${name}: applied`);
    } catch (error) { await client.query('rollback'); throw error; }
  }
} catch (error) {
  // SQL/connection errors can contain credentials or row contents; print only code.
  const allowed = ['INVALID_PROJECT_URL', 'INVALID_DATABASE_URL', 'CERTIFICATE_UNAVAILABLE', 'DATABASE_PASSWORD_REQUIRED', 'MIGRATION_CHECKSUM_MISMATCH'];
  console.error(allowed.includes(error.message) ? error.message : /^[A-Z0-9_]+$/.test(error.code || '') ? `DATABASE_MIGRATION_FAILED (${error.code})` : 'DATABASE_MIGRATION_FAILED');
  process.exitCode = 1;
} finally { await client?.end().catch(() => {}); }
