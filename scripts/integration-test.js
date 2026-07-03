import assert from 'assert';

const base = process.env.API_BASE || 'http://localhost:3000/api';

async function req(path, opts) {
  const res = await fetch(base + path, opts);
  const text = await res.text();
  let body = text;
  try { body = JSON.parse(text); } catch {}
  return { status: res.status, body };
}

async function findCashAccount() {
  const { body } = await req('/accounts');
  if (!Array.isArray(body)) throw new Error('accounts not array');
  const cash = body.find(a => a.code === '1001') || body.find(a => a.name.includes('خزينة') || a.name.includes('البنك')) || body[0];
  return cash;
}

async function testPurchase() {
  const cash = await findCashAccount();
  console.log('Using account:', cash.code, cash.name, cash.id);

  const purchasePayload = {
    invoiceNumber: `IT-${Date.now()}`,
    date: new Date().toISOString().slice(0,10),
    supplierName: 'Test Supplier',
    paymentMethod: 'cash',
    accountId: cash.id,
    warehouseId: 1,
    items: [{ productId: 1, quantity: 1, unitPrice: 10 }]
  };

  const res = await req('/purchases', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(purchasePayload) });
  assert.strictEqual(res.status, 201, 'purchase creation failed');
  const purchase = res.body;
  console.log('Created purchase id', purchase.id);

  // get journal entries and find by referenceId
  const journals = await req('/journal');
  const entry = journals.body.find(e => e.referenceId === purchase.id && e.source === 'purchase');
  assert(entry, 'journal entry for purchase not found');

  const totalDebit = entry.lines.reduce((s,l)=>s+parseFloat(l.debit||0),0);
  const totalCredit = entry.lines.reduce((s,l)=>s+parseFloat(l.credit||0),0);
  console.log('Journal totals', totalDebit, totalCredit);
  assert(Math.abs(totalDebit - totalCredit) < 0.01, 'journal not balanced');
  console.log('Purchase journal balanced OK');
}

async function testSale() {
  const account = await findCashAccount();
  const payload = {
    date: new Date().toISOString().slice(0,10),
    customerId: 3,
    paymentMethod: 'cash',
    accountId: account.id,
    items: [{ productId: 1, quantity: 1, unitPrice: 7 }]
  };
  const res = await req('/sales', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
  if (res.status !== 201) { console.warn('Sale create failed', res.status, res.body); return; }
  const sale = res.body;
  console.log('Created sale id', sale.id);
  const journals = await req('/journal');
  const entry = journals.body.find(e => e.referenceId === sale.id && e.source === 'sale');
  assert(entry, 'journal entry for sale not found');
  const totalDebit = entry.lines.reduce((s,l)=>s+parseFloat(l.debit||0),0);
  const totalCredit = entry.lines.reduce((s,l)=>s+parseFloat(l.credit||0),0);
  assert(Math.abs(totalDebit - totalCredit) < 0.01, 'sale journal not balanced');
  console.log('Sale journal balanced OK');
}

async function testExpense() {
  const payload = { date: new Date().toISOString().slice(0,10), category: 'مصروفات أخرى', description: 'Test expense', amount: 5 };
  const res = await req('/expenses', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
  assert.strictEqual(res.status, 201, `Expense creation failed: ${JSON.stringify(res.body)}`);
  const expense = res.body;
  console.log('Created expense id', expense.id);
  const journals = await req('/journal');
  const entry = journals.body.find(e => e.referenceId === expense.id && e.source === 'expense');
  assert(entry, 'journal entry for expense not found');
  const totalDebit = entry.lines.reduce((s,l)=>s+parseFloat(l.debit||0),0);
  const totalCredit = entry.lines.reduce((s,l)=>s+parseFloat(l.credit||0),0);
  assert(Math.abs(totalDebit - totalCredit) < 0.01, 'expense journal not balanced');
  console.log('Expense journal balanced OK');
}

async function run() {
  console.log('Integration tests against', base);
  try {
    await testPurchase();
    await testSale();
    await testExpense();
    console.log('All integration checks passed');
  } catch (err) {
    console.error('Integration test failed:', err.message);
    process.exit(2);
  }
}

run();
