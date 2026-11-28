(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.Calc = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function num(value) {
    const n = Number(value);
    return isNaN(n) ? 0 : n;
  }

  function balance(account, transactions) {
    const txs = Array.isArray(transactions) ? transactions : [];
    const open = num(account && account.open);
    return txs.reduce(function (b, t) {
      const v = num(t && t.amount);
      if (!t) return b;
      if (t.type === 'income' && t.acc === (account && account.id)) return b + v;
      if (t.type === 'expense' && t.acc === (account && account.id)) return b - v;
      if (t.type === 'transfer') {
        if (t.acc === (account && account.id)) b -= v;
        if (t.to === (account && account.id)) b += v;
      }
      return b;
    }, open);
  }

  function totalBalance(accounts, transactions) {
    const accs = Array.isArray(accounts) ? accounts : [];
    return accs.reduce(function (s, a) {
      return s + balance(a, transactions);
    }, 0);
  }

  function monthlyTotals(transactions, month) {
    const txs = Array.isArray(transactions) ? transactions : [];
    const filtered = month ? txs.filter(function (t) { return String(t && t.date || '').startsWith(month); }) : txs;
    const income = filtered.filter(function (t) { return t && t.type === 'income'; }).reduce(function (s, t) { return s + num(t.amount); }, 0);
    const expense = filtered.filter(function (t) { return t && t.type === 'expense'; }).reduce(function (s, t) { return s + num(t.amount); }, 0);
    return { income: income, expense: expense, net: income - expense };
  }

  function spendingByCategory(transactions, month) {
    const txs = Array.isArray(transactions) ? transactions : [];
    const out = {};
    txs.forEach(function (t) {
      if (!t || t.type !== 'expense') return;
      if (month && !String(t.date || '').startsWith(month)) return;
      const key = t.cat || '';
      out[key] = (out[key] || 0) + num(t.amount);
    });
    return out;
  }

  function budgetProgress(limit, spent) {
    const l = num(limit);
    const s = num(spent);
    if (l <= 0) return { pct: 0, remaining: 0, over: false };
    const pct = Math.min(100, (s / l) * 100);
    return { pct: pct, remaining: Math.max(0, l - s), over: s > l };
  }

  function monthsBetween(from, to) {
    return (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());
  }

  function goalProgress(goal, now) {
    const g = goal || {};
    const d = now instanceof Date ? now : new Date();
    const target = num(g.target);
    const saved = num(g.saved);
    const remaining = Math.max(0, target - saved);
    const targetDate = g.targetDate ? new Date(g.targetDate + 'T00:00') : d;
    const monthsLeft = Math.max(1, monthsBetween(d, targetDate));
    // Share of the target that should be saved by now, measured from when the goal was set.
    const start = g.createdAt ? new Date(g.createdAt) : d;
    const total = Math.max(1, monthsBetween(start, targetDate));
    const elapsed = Math.min(total, Math.max(0, monthsBetween(start, d)));
    const expected = target * (elapsed / total);
    return {
      pct: target > 0 ? Math.min(100, (saved / target) * 100) : 0,
      remaining: remaining,
      monthsLeft: monthsLeft,
      required: remaining / monthsLeft,
      expected: expected,
      onTrack: saved + 0.005 >= expected
    };
  }

  // Amount a recurring item costs per month, whatever its own cadence.
  function recurringMonthly(item) {
    const v = num(item && item.amount);
    switch (item && item.freq) {
      case 'daily': return v * 30;
      case 'weekly': return (v * 52) / 12;
      case 'monthly': return v;
      case 'quarterly': return v / 3;
      case 'yearly': return v / 12;
      default: return 0;
    }
  }

  // Projected balance: current balance, plus the historical daily net over the
  // window, minus what savings goals call for.
  //
  // Recurring items are deliberately not added here. The daily averages are
  // built from transactions that already contain the recurring charges, so
  // adding the schedule on top would count those payments twice.
  function forecast(opts) {
    const o = opts || {};
    const days = num(o.days);
    const drift = (num(o.avgDailyIncome) - num(o.avgDailyExpense)) * days;
    const goals = num(o.goalMonthly) * (days / 30);
    return num(o.total) + drift - goals;
  }

  function netWorth(accounts, transactions, assets, liabilities, loans) {
    const totalAssets = (Array.isArray(assets) ? assets : []).reduce(function (s, a) { return s + num(a && a.value); }, 0) +
      totalBalance(accounts, transactions);
    const totalLiabilities = (Array.isArray(liabilities) ? liabilities : []).reduce(function (s, l) { return s + num(l && l.value); }, 0) +
      (Array.isArray(loans) ? loans : []).reduce(function (s, l) { return s + num(l && l.remaining); }, 0);
    return { assets: totalAssets, liabilities: totalLiabilities, net: totalAssets - totalLiabilities };
  }

  return {
    balance: balance,
    totalBalance: totalBalance,
    monthlyTotals: monthlyTotals,
    spendingByCategory: spendingByCategory,
    budgetProgress: budgetProgress,
    goalProgress: goalProgress,
    recurringMonthly: recurringMonthly,
    forecast: forecast,
    netWorth: netWorth
  };
});