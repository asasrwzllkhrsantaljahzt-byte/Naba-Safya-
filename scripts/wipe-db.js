#!/usr/bin/env node
import pg from 'pg';

const { Pool } = pg;
if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL must be set in environment (source your .env)');
  process.exit(1);
}

function getArg(name) {
  const m = process.argv.find(a => a.startsWith(`--${name}=`));
  return m ? m.split('=')[1] : undefined;
}

const dryRun = process.argv.includes('--dry-run');
const confirmArg = getArg('confirm');

async function main() {
  console.log('wipe-db starting', dryRun ? '(dry-run)' : '');

  if (!dryRun) {
    const token = process.env.WIPE_TOKEN;
    if (!token) {
      console.error('WIPE_TOKEN not set in environment. Set WIPE_TOKEN and retry.');
      process.exit(1);
    }
    if (confirmArg !== token) {
      console.error('Missing or invalid --confirm token. Provide --confirm=<token> matching WIPE_TOKEN.');
      process.exit(1);
    }
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  const actions = [
    'journal_lines',
    'journal_entries',
    'treasury_transactions',
    'inventory_transactions',
    'sale_returns',
    'sales',
    'purchase_returns',
    'purchases',
    'expenses',
    'obligations',
    'payroll',
    'inventory',
  ];

  try {
    for (const table of actions) {
      try {
        if (dryRun) {
          const res = await client.query(`SELECT count(*)::int as c FROM ${table}`);
          console.log(`[dry-run] ${table}: ${res.rows[0].c} rows`);
        } else {
          console.log(`Deleting all rows from ${table}...`);
          await client.query(`DELETE FROM ${table}`);
          console.log(`Deleted ${table}`);
        }
      } catch (err) {
        console.error('Error processing', table, err?.message ?? err);
      }
    }
  } finally {
    await client.release();
    await pool.end();
  }

  console.log('wipe-db finished');
}

main().catch((err) => {
  console.error('wipe-db failed:', err?.message ?? err);
  process.exit(1);
});
