'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const Calc = require('../calc.js');

const approx = (actual, expected, eps = 1e-6) =>
  assert.ok(Math.abs(actual - expected) <= eps, `expected ${actual} to be within ${eps} of ${expected}`);

const acc = (id, open) => ({ id, name: id, open: open || 0 });
const tx = (id, type, amount, date, from, to) => ({ id, type, amount, date, acc: from, to });
const day = (m, d) => `2026-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

test('balance adds income, subtracts expenses and moves transfers', () => {
  const accounts = [acc('cash', 100), acc('bank', 500)];
  const txs = [
    tx('t1', 'income', 50, day(1, 2), 'cash'),
    tx('t2', 'expense', 30, day(1, 3), 'cash'),
    tx('t3', 'transfer', 200, day(1, 4), 'bank', 'cash')
  ];
  assert.equal(Calc.balance(accounts[0], txs), 100 + 50 - 30 + 200);
  assert.equal(Calc.balance(accounts[1], txs), 500 - 200);
  assert.equal(Calc.totalBalance(accounts, txs), 620);
});

test('a transfer never changes the total balance', () => {
  const accounts = [acc('cash', 1000), acc('bank', 0)];
  const txs = [tx('t1', 'transfer', 250, day(1, 5), 'cash', 'bank')];
  assert.equal(Calc.totalBalance(accounts, txs), 1000);
});

test('balance ignores other accounts and unknown types', () => {
  const a = acc('cash', 10);
  const txs = [
    tx('t1', 'income', 999, day(1, 1), 'bank'),
    { id: 't2', type: 'adjustment', amount: 40, date: day(1, 2), acc: 'cash' }
  ];
  assert.equal(Calc.balance(a, txs), 10);
});

test('balance survives missing or malformed amounts', () => {
  const a = acc('cash', 0);
  const txs = [{ id: 't1', type: 'income', amount: 'abc', acc: 'cash', date: day(1, 1) }, null];
  assert.equal(Calc.balance(a, txs), 0);
  assert.equal(Calc.balance(acc('cash'), []), 0);
});

test('monthlyTotals splits a month and excludes transfers', () => {
  const txs = [
    tx('t1', 'income', 5000, day(2, 1), 'cash'),
    tx('t2', 'expense', 1200, day(2, 4), 'cash'),
    tx('t3', 'transfer', 900, day(2, 6), 'cash', 'bank'),
    tx('t4', 'expense', 75, day(1, 28), 'cash'),
    tx('t5', 'income', 100, day(3, 1), 'cash')
  ];
  const feb = Calc.monthlyTotals(txs, '2026-02');
  assert.deepEqual(feb, { income: 5000, expense: 1200, net: 3800 });
  assert.deepEqual(Calc.monthlyTotals(txs), { income: 5100, expense: 1275, net: 3825 });
});

test('spendingByCategory only counts expenses in the requested month', () => {
  const txs = [
    tx('t1', 'expense', 100, day(2, 1), 'cash'),
    tx('t2', 'expense', 250, day(2, 2), 'cash'),
    tx('t3', 'expense', 40, day(1, 2), 'cash'),
    tx('t4', 'income', 300, day(2, 3), 'cash')
  ];
  txs[0].cat = 'food';
  txs[1].cat = 'food';
  txs[2].cat = 'food';
  txs[3].cat = 'salary';
  assert.deepEqual(Calc.spendingByCategory(txs, '2026-02'), { food: 350 });
  assert.deepEqual(Calc.spendingByCategory(txs), { food: 390 });
});

test('spendingByCategory files uncategorised spending under an empty key', () => {
  const txs = [Object.assign(tx('t1', 'expense', 60, day(2, 1), 'cash'), { cat: '' })];
  assert.deepEqual(Calc.spendingByCategory(txs, '2026-02'), { '': 60 });
});

test('budgetProgress reports usage, what is left and going over', () => {
  assert.deepEqual(Calc.budgetProgress(1000, 700), { pct: 70, remaining: 300, over: false });
  assert.deepEqual(Calc.budgetProgress(1000, 1000), { pct: 100, remaining: 0, over: false });
  assert.deepEqual(Calc.budgetProgress(1000, 1200), { pct: 100, remaining: 0, over: true });
});

test('budgetProgress with no limit does not produce NaN or Infinity', () => {
  assert.deepEqual(Calc.budgetProgress(0, 500), { pct: 0, remaining: 0, over: false });
  assert.deepEqual(Calc.budgetProgress(undefined, undefined), { pct: 0, remaining: 0, over: false });
});

test('goalProgress splits what is left across the months remaining', () => {
  const now = new Date(2026, 0, 15);
  const goal = { target: 12000, saved: 3000, targetDate: '2026-07-15', createdAt: new Date(2025, 6, 15).getTime() };
  const p = Calc.goalProgress(goal, now);
  assert.equal(p.pct, 25);
  assert.equal(p.remaining, 9000);
  assert.equal(p.monthsLeft, 6);
  assert.equal(p.required, 1500);
});

test('a goal counts as on track only when it is ahead of an even pace', () => {
  const now = new Date(2026, 0, 15);
  const base = { target: 1200, targetDate: '2026-07-15', createdAt: new Date(2025, 6, 15).getTime() };
  // Half the time has passed, so half the target is expected.
  assert.equal(Calc.goalProgress({ ...base, saved: 600 }, now).onTrack, true);
  assert.equal(Calc.goalProgress({ ...base, saved: 500 }, now).onTrack, false);
});

test('goalProgress clamps finished, overdue and future goals', () => {
  const now = new Date(2026, 0, 15);
  assert.equal(Calc.goalProgress({ target: 1000, saved: 1500, targetDate: '2026-07-15' }, now).pct, 100);
  const overdue = Calc.goalProgress({ target: 1000, saved: 400, targetDate: '2025-01-01' }, now);
  assert.equal(overdue.monthsLeft, 1);
  assert.equal(overdue.required, 600);
  assert.equal(overdue.remaining, 600);
});

test('recurringMonthly normalises every cadence to a month', () => {
  approx(Calc.recurringMonthly({ amount: 100, freq: 'daily' }), 3000);
  approx(Calc.recurringMonthly({ amount: 120, freq: 'weekly' }), (120 * 52) / 12);
  approx(Calc.recurringMonthly({ amount: 500, freq: 'monthly' }), 500);
  approx(Calc.recurringMonthly({ amount: 900, freq: 'quarterly' }), 300);
  approx(Calc.recurringMonthly({ amount: 1200, freq: 'yearly' }), 100);
  assert.equal(Calc.recurringMonthly({ amount: 100, freq: 'sometimes' }), 0);
});

test('forecast grows the balance by the daily net and subtracts goal savings', () => {
  const projected = Calc.forecast({ total: 10000, avgDailyIncome: 100, avgDailyExpense: 80, days: 30 });
  approx(projected, 10600);

  const withGoals = Calc.forecast({ total: 10000, avgDailyIncome: 100, avgDailyExpense: 80, days: 30, goalMonthly: 200 });
  approx(withGoals, 10400);
});

test('forecast counts a recurring payment once, through the 90-day average', () => {
  // A 450 subscription charged monthly has hit three times in the 90-day window,
  // so the average already spends the whole 1350. Add the schedule again and the
  // projection loses a second 1350.
  const avgDailyExpense = (450 * 3) / 90;
  const fromAverageOnly = Calc.forecast({ total: 10000, days: 90, avgDailyExpense });
  const withSchedule = Calc.forecast({
    total: 10000,
    days: 90,
    avgDailyExpense,
    recurring: [{ amount: 450, freq: 'monthly', type: 'expense', active: true }]
  });
  approx(fromAverageOnly, 10000 - 450 * 3);
  approx(withSchedule, fromAverageOnly);
});

test('forecast treats missing input as zero instead of NaN', () => {
  assert.equal(Calc.forecast({}), 0);
  assert.equal(Calc.forecast(), 0);
});

test('netWorth counts accounts plus assets against liabilities and loans', () => {
  const accounts = [acc('cash', 1000)];
  const txs = [tx('t1', 'income', 500, day(2, 1), 'cash')];
  const result = Calc.netWorth(accounts, txs, [{ value: 2000 }], [{ value: 300 }], [{ remaining: 700 }]);
  assert.deepEqual(result, { assets: 3500, liabilities: 1000, net: 2500 });
});

test('netWorth is negative when debts outweigh what is owned', () => {
  const result = Calc.netWorth([acc('card', -500)], [], [], [{ value: 1500 }], []);
  assert.deepEqual(result, { assets: -500, liabilities: 1500, net: -2000 });
});
