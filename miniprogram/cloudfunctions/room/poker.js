/* 云端权威牌逻辑(与前端 utils/poker.js 一致) */
const SUITS = ['s', 'h', 'd', 'c'];
function rankStr(r){ return r===14?'A':r===13?'K':r===12?'Q':r===11?'J':String(r); }
function freshDeck() {
  const d = [];
  for (const s of SUITS) for (let r = 2; r <= 14; r++) d.push({ r, s });
  for (let i = d.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = d[i]; d[i] = d[j]; d[j] = t;
  }
  return d;
}
function eval5(cards) {
  const ranks = cards.map(c => c.r), suits = cards.map(c => c.s);
  const isFlush = suits.every(s => s === suits[0]);
  const cnt = {}; ranks.forEach(r => { cnt[r] = (cnt[r] || 0) + 1; });
  const groups = Object.keys(cnt).map(Number).sort((a, b) => (cnt[b] - cnt[a]) || (b - a));
  const counts = groups.map(r => cnt[r]);
  const uniq = Array.from(new Set(ranks)).sort((a, b) => b - a);
  let sh = 0;
  if (uniq.length === 5) {
    if (uniq[0] - uniq[4] === 4) sh = uniq[0];
    else if (uniq[0] === 14 && uniq[1] === 5 && uniq[2] === 4 && uniq[3] === 3 && uniq[4] === 2) sh = 5;
  }
  if (sh && isFlush) return [8, sh];
  if (counts[0] === 4) return [7, groups[0], groups[1]];
  if (counts[0] === 3 && counts[1] === 2) return [6, groups[0], groups[1]];
  if (isFlush) return [5].concat(groups);
  if (sh) return [4, sh];
  if (counts[0] === 3) return [3].concat(groups);
  if (counts[0] === 2 && counts[1] === 2) return [2].concat(groups);
  if (counts[0] === 2) return [1].concat(groups);
  return [0].concat(groups);
}
function cmp(a, b) {
  const n = Math.max(a.length, b.length);
  for (let i = 0; i < n; i++) { const x = a[i] || 0, y = b[i] || 0; if (x !== y) return x - y; }
  return 0;
}
function combos(arr, k) {
  const res = [], n = arr.length, idx = [];
  for (let i = 0; i < k; i++) idx.push(i);
  while (true) {
    res.push(idx.map(i => arr[i]));
    let i = k - 1;
    while (i >= 0 && idx[i] === i + n - k) i--;
    if (i < 0) break;
    idx[i]++;
    for (let j = i + 1; j < k; j++) idx[j] = idx[j - 1] + 1;
  }
  return res;
}
function eval7(seven) {
  let best = null;
  for (const c of combos(seven, 5)) { const s = eval5(c); if (!best || cmp(s, best) > 0) best = s; }
  return best;
}
const CAT = ['高牌', '一对', '两对', '三条', '顺子', '同花', '葫芦', '四条', '同花顺'];
function handName(sc) { return (sc[0] === 8 && sc[1] === 14) ? '皇家同花顺' : CAT[sc[0]]; }
function bjHandVal(cards) {
  let s = 0, a = 0;
  for (const c of cards) { if (c.r === 14) { a++; s += 11; } else s += Math.min(c.r, 10); }
  while (s > 21 && a) { s -= 10; a--; }
  return s;
}
function bjIsBJ(cards) { return cards.length === 2 && bjHandVal(cards) === 21; }

module.exports = { freshDeck, eval5, cmp, combos, eval7, handName, bjHandVal, bjIsBJ, rankStr };
