const base = process.env.API_BASE || 'http://localhost:3000/api';

async function check(path) {
  try {
    const res = await fetch(base + path);
    const text = await res.text();
    console.log(path, '->', res.status);
    // print small body
    console.log(text.slice(0, 1000));
  } catch (err) {
    console.error(path, 'error:', err.message);
  }
}

async function run() {
  console.log('Running smoke tests against', base);
  await check('/healthz');
  await check('/purchases');
  await check('/sales');
  await check('/expenses');
  await check('/customers');
  await check('/suppliers');
  console.log('Done');
}

run();

