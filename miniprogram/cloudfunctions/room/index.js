const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;
const P = require('./poker');

const ROOMS = db.collection('rooms');       // 公开(客户端 watch)
const STATE = db.collection('roomState');   // 私密(仅云函数读写:底牌/牌堆)

const MAXP = 8;
function code() { return String(Math.floor(1000 + Math.random() * 9000)); }
async function getRoom(id) { const r = await ROOMS.doc(id).get().catch(() => null); return r && r.data ? (delete r.data._id, r.data) : null; }
async function getState(id) { const r = await STATE.doc(id).get().catch(() => null); return r && r.data ? (delete r.data._id, r.data) : null; }

exports.main = async (event) => {
  const openid = (cloud.getWXContext() || {}).OPENID || 'anon';
  try {
    switch (event.action) {
      case 'create': return create(event, openid);
      case 'join': return join(event, openid);
      case 'leave': return leave(event, openid);
      case 'ready': return ready(event, openid);
      case 'start': return start(event, openid);
      case 'act': return act(event, openid);       // 德州
      case 'bjAct': return bjAct(event, openid);    // 21点
      case 'next': return next(event, openid);
      case 'getHand': return getHand(event, openid);
      case 'whoami': return { ok: true, openid };
      default: return { ok: false, err: '未知操作' };
    }
  } catch (e) {
    return { ok: false, err: String(e && e.message || e) };
  }
};

/* ---------------- 大厅 ---------------- */
async function create(ev, openid) {
  let id;
  for (let i = 0; i < 10; i++) { id = code(); if (!(await getRoom(id))) break; }
  const p = { openid, name: (ev.name || '玩家').slice(0, 8), ready: true };
  await ROOMS.doc(id).set({ data: {
    host: openid, game: ev.game || 'texas', status: 'lobby',
    players: [p], handVersion: 0, ts: Date.now()
  }});
  return { ok: true, roomId: id };
}
async function join(ev, openid) {
  const r = await getRoom(ev.roomId);
  if (!r) return { ok: false, err: '房间不存在' };
  if (r.players.find(p => p.openid === openid)) return { ok: true, roomId: ev.roomId };
  if (r.status !== 'lobby') return { ok: false, err: '游戏已开始' };
  if (r.players.length >= MAXP) return { ok: false, err: '房间已满' };
  const p = { openid, name: (ev.name || '玩家').slice(0, 8), ready: false };
  await ROOMS.doc(ev.roomId).update({ data: { players: _.push([p]) } });
  return { ok: true, roomId: ev.roomId };
}
async function leave(ev, openid) {
  const r = await getRoom(ev.roomId);
  if (!r) return { ok: true };
  const players = r.players.filter(p => p.openid !== openid);
  if (players.length === 0) { await ROOMS.doc(ev.roomId).remove().catch(() => {}); await STATE.doc(ev.roomId).remove().catch(() => {}); return { ok: true }; }
  const upd = { players };
  if (r.host === openid) upd.host = players[0].openid;
  if (r.status !== 'lobby') upd.status = 'lobby';   // 有人跑路就散局回大厅
  await ROOMS.doc(ev.roomId).update({ data: upd });
  return { ok: true };
}
async function ready(ev, openid) {
  const r = await getRoom(ev.roomId);
  if (!r) return { ok: false, err: '房间不存在' };
  const players = r.players.map(p => p.openid === openid ? Object.assign({}, p, { ready: !!ev.ready }) : p);
  await ROOMS.doc(ev.roomId).update({ data: { players } });
  return { ok: true };
}

/* ---------------- 开局 ---------------- */
async function start(ev, openid) {
  const r = await getRoom(ev.roomId);
  if (!r) return { ok: false, err: '房间不存在' };
  if (r.host !== openid) return { ok: false, err: '只有房主能开始' };
  if (r.players.length < 2) return { ok: false, err: '至少 2 人' };
  const seats = r.players.map((p, i) => ({ openid: p.openid, name: p.name, seat: i }));
  const st = { game: r.game, seats, dealer: 0 };
  if (r.game === 'texas') dealTexas(st); else dealBJ(st);
  await STATE.doc(ev.roomId).set({ data: st });
  await ROOMS.doc(ev.roomId).update({ data: pub(st, r, r.handVersion + 1) });
  return { ok: true };
}
async function next(ev, openid) {
  const r = await getRoom(ev.roomId);
  if (!r) return { ok: false, err: '房间不存在' };
  if (r.host !== openid) return { ok: false, err: '只有房主能开始下一局' };
  const st = await getState(ev.roomId);
  if (!st) return { ok: false, err: '状态丢失,请重新开始' };
  st.dealer = (st.dealer + 1) % st.seats.length;
  st.result = null;
  if (st.game === 'texas') dealTexas(st); else dealBJ(st);
  await STATE.doc(ev.roomId).set({ data: st });
  await ROOMS.doc(ev.roomId).update({ data: pub(st, r, (r.handVersion || 0) + 1) });
  return { ok: true };
}

/* ---------------- 公开投影 ---------------- */
function pub(st, room, handVersion) {
  const base = {
    host: room.host, game: st.game, status: st.result ? 'handover' : 'playing',
    players: room.players, handVersion: handVersion == null ? room.handVersion : handVersion,
    result: st.result || null
  };
  if (st.game === 'texas') {
    base.tx = {
      dealer: st.dealer, sb: st.sb, bb: st.bb, actor: st.actor,
      street: st.street, currentBet: st.currentBet, revealed: st.revealed,
      community: st.community.slice(0, st.revealed),
      pot: st.seats.reduce((a, s) => a + s.contributed, 0),
      seats: st.seats.map(s => ({
        openid: s.openid, name: s.name, seat: s.seat,
        folded: s.folded, roundBet: s.roundBet, contributed: s.contributed
      }))
    };
  } else {
    base.bj = {
      phase: st.bjPhase, turn: st.bjTurn, dealer: st.dealer, hidden: st.bjHidden,
      seats: st.seats.map(s => ({
        openid: s.openid, name: s.name, seat: s.seat, stood: s.bjStood,
        hand: s.bjHand, val: P.bjHandVal(s.bjHand)
      })),
      dealerHand: st.bjHidden ? [st.seats[st.dealer].bjHand[0], { back: true }] : st.seats[st.dealer].bjHand,
      dealerVal: st.bjHidden ? null : P.bjHandVal(st.seats[st.dealer].bjHand)
    };
  }
  return base;
}

/* ================= 德州 ================= */
function pay(p, a) { p.roundBet += a; p.contributed += a; }
function activeCount(st) { return st.seats.filter(s => !s.folded).length; }
function firstActiveFrom(st, start) {
  const n = st.seats.length;
  for (let i = 0; i < n; i++) { const j = (start + i) % n; if (!st.seats[j].folded) return j; }
  return -1;
}
function nextToAct(st, start) {
  const n = st.seats.length;
  for (let i = 0; i < n; i++) { const j = (start + i) % n; const s = st.seats[j]; if (!s.folded && !s.hasActed) return j; }
  return -1;
}
function dealTexas(st) {
  const n = st.seats.length;
  st.deck = P.freshDeck();
  st.seats.forEach(s => { s.folded = false; s.hasActed = false; s.roundBet = 0; s.contributed = 0; s.hole = [st.deck.pop(), st.deck.pop()]; });
  st.community = [st.deck.pop(), st.deck.pop(), st.deck.pop(), st.deck.pop(), st.deck.pop()];
  st.revealed = 0; st.street = 'preflop'; st.currentBet = 1;
  let sb, bb;
  if (n === 2) { sb = st.dealer; bb = (st.dealer + 1) % n; } else { sb = (st.dealer + 1) % n; bb = (st.dealer + 2) % n; }
  pay(st.seats[sb], 0.5); pay(st.seats[bb], 1);
  st.sb = sb; st.bb = bb; st.actor = (bb + 1) % n; st.result = null;
}
async function act(ev, openid) {
  const r = await getRoom(ev.roomId); if (!r) return { ok: false, err: '房间不存在' };
  const st = await getState(ev.roomId); if (!st || st.game !== 'texas') return { ok: false, err: '状态异常' };
  if (st.result) return { ok: false, err: '本局已结束' };
  const seat = st.seats.findIndex(s => s.openid === openid);
  if (seat < 0) return { ok: false, err: '你不在牌局' };
  if (seat !== st.actor) return { ok: false, err: '还没轮到你' };
  const p = st.seats[seat], n = st.seats.length, type = ev.type;
  if (type === 'fold') p.folded = true;
  else if (type === 'check') { if (st.currentBet - p.roundBet > 0) return { ok: false, err: '不能过牌,需跟注' }; p.hasActed = true; }
  else if (type === 'call') { pay(p, st.currentBet - p.roundBet); p.hasActed = true; }
  else if (type === 'raise') {
    let inc = Math.max(0.5, Math.min(5, Number(ev.amt) || 1));
    inc = Math.round(inc * 2) / 2;
    const nb = st.currentBet + inc;
    pay(p, nb - p.roundBet); st.currentBet = nb;
    st.seats.forEach((q, i) => { if (!q.folded && i !== seat) q.hasActed = false; });
    p.hasActed = true;
  } else return { ok: false, err: '非法操作' };

  if (activeCount(st) <= 1) { finishTexas(st, 'fold'); }
  else {
    const nx = nextToAct(st, (seat + 1) % n);
    if (nx === -1) endRoundTexas(st); else st.actor = nx;
  }
  await STATE.doc(ev.roomId).set({ data: st });
  await ROOMS.doc(ev.roomId).update({ data: pub(st, r) });
  return { ok: true };
}
function endRoundTexas(st) {
  if (st.street === 'river') { showdownTexas(st); return; }
  if (st.street === 'preflop') { st.street = 'flop'; st.revealed = 3; }
  else if (st.street === 'flop') { st.street = 'turn'; st.revealed = 4; }
  else if (st.street === 'turn') { st.street = 'river'; st.revealed = 5; }
  st.currentBet = 0;
  st.seats.forEach(s => { s.roundBet = 0; if (!s.folded) s.hasActed = false; });
  st.actor = firstActiveFrom(st, (st.dealer + 1) % st.seats.length);
}
function showdownTexas(st) {
  const live = st.seats.map((s, i) => s.folded ? -1 : i).filter(i => i >= 0);
  const scores = {}; let best = null;
  live.forEach(i => { scores[i] = P.eval7(st.seats[i].hole.concat(st.community)); if (!best || P.cmp(scores[i], best) > 0) best = scores[i]; });
  const winners = live.filter(i => P.cmp(scores[i], best) === 0);
  finishTexas(st, 'showdown', winners, best, scores);
}
function finishTexas(st, reason, winners, best, scores) {
  st.revealed = 5;
  if (!winners) winners = st.seats.map((s, i) => s.folded ? -1 : i).filter(i => i >= 0);
  const pot = st.seats.reduce((a, s) => a + s.contributed, 0);
  const drinks = st.seats.map((s, i) => {
    const win = winners.indexOf(i) >= 0;
    if (win) return { name: s.name, amt: '免喝', safe: true };
    if (s.contributed > 0) return { name: s.name, amt: '喝 ' + cupStr(s.contributed) + ' 杯', safe: false };
    return { name: s.name, amt: '没下注 · 免喝', safe: true };
  });
  const reveal = [];
  if (reason === 'showdown') {
    st.seats.forEach((s, i) => { if (!s.folded) reveal.push({ name: s.name, hole: s.hole, hand: scores ? P.handName(scores[i]) : '', win: winners.indexOf(i) >= 0 }); });
  }
  st.result = {
    reason, pot: cupStr(pot),
    winnerNames: winners.map(i => st.seats[i].name),
    title: winners.length === 1 ? 'WINNER' : 'SPLIT POT',
    handName: (reason === 'showdown' && best) ? P.handName(best) : '',
    drinks, reveal, community: st.community
  };
  st.actor = -1;
}
function cupStr(x) { return x % 1 === 0 ? String(x) : x.toFixed(1); }

/* ================= 21 点 ================= */
function dealBJ(st) {
  st.deck = P.freshDeck();
  st.seats.forEach(s => { s.bjHand = [st.deck.pop(), st.deck.pop()]; s.bjStood = false; });
  st.bjHidden = true; st.bjPhase = 'play'; st.result = null;
  let i = 0; while (i < st.seats.length && i === st.dealer) i++;
  if (i >= st.seats.length) bjDealerPhase(st); else st.bjTurn = i;
}
function bjAdvance(st) {
  let i = st.bjTurn + 1; while (i < st.seats.length && i === st.dealer) i++;
  if (i >= st.seats.length) bjDealerPhase(st); else st.bjTurn = i;
}
function bjDealerPhase(st) { st.bjPhase = 'dealer'; st.bjHidden = false; st.bjTurn = st.dealer; }
async function bjAct(ev, openid) {
  const r = await getRoom(ev.roomId); if (!r) return { ok: false, err: '房间不存在' };
  const st = await getState(ev.roomId); if (!st || st.game !== 'blackjack') return { ok: false, err: '状态异常' };
  if (st.result) return { ok: false, err: '本局已结束' };
  const seat = st.seats.findIndex(s => s.openid === openid);
  if (seat < 0) return { ok: false, err: '你不在牌局' };
  if (seat !== st.bjTurn) return { ok: false, err: '还没轮到你' };
  const s = st.seats[seat];
  if (ev.type === 'hit') {
    s.bjHand.push(st.deck.pop());
    if (P.bjHandVal(s.bjHand) > 21) { bjDone(st); }
  } else if (ev.type === 'stand') { bjDone(st); }
  else return { ok: false, err: '非法操作' };
  await STATE.doc(ev.roomId).set({ data: st });
  await ROOMS.doc(ev.roomId).update({ data: pub(st, r) });
  return { ok: true };
}
function bjDone(st) {
  if (st.bjPhase === 'dealer') { bjResolve(st); return; }
  st.seats[st.bjTurn].bjStood = true;
  bjAdvance(st);
}
function bjResolve(st) {
  const dh = st.seats[st.dealer].bjHand, dv = P.bjHandVal(dh), dBust = dv > 21, dBJ = P.bjIsBJ(dh);
  let dealerDrinks = 0;
  const bet = 1;
  const drinks = [];
  st.seats.forEach((s, i) => {
    if (i === st.dealer) return;
    const pv = P.bjHandVal(s.bjHand), pBust = pv > 21, pBJ = P.bjIsBJ(s.bjHand);
    let o;
    if (pBust) o = 'lose'; else if (dBust) o = 'win'; else if (pBJ && !dBJ) o = 'win';
    else if (dBJ && !pBJ) o = 'lose'; else if (pv > dv) o = 'win'; else if (pv < dv) o = 'lose'; else o = 'push';
    if (o === 'win') dealerDrinks += bet;
    drinks.push({ name: s.name, amt: o === 'lose' ? ('喝 ' + bet + ' 杯') : (o === 'win' ? '免喝(赢庄)' : '平 · 免喝'), safe: o !== 'lose' });
  });
  drinks.unshift({ name: st.seats[st.dealer].name + '(庄)', amt: dealerDrinks > 0 ? ('喝 ' + cupStr(dealerDrinks) + ' 杯') : '免喝', safe: dealerDrinks <= 0 });
  st.result = {
    reason: 'bj', title: dBust ? '庄家爆牌' : '本局结算',
    dealerName: st.seats[st.dealer].name, dealerVal: dv, dealerBust: dBust,
    drinks, reveal: st.seats.map(s => ({ name: s.name, hand: s.bjHand, val: P.bjHandVal(s.bjHand), dealer: s.seat === st.dealer }))
  };
  st.bjTurn = -1;
}

/* ---------------- 取自己的底牌(德州私密) ---------------- */
async function getHand(ev, openid) {
  const st = await getState(ev.roomId);
  if (!st) return { ok: false, err: '无状态' };
  const s = st.seats.find(x => x.openid === openid);
  if (!s) return { ok: false, err: '你不在牌局' };
  if (st.game === 'texas') return { ok: true, hole: s.hole || [] };
  return { ok: true, hand: s.bjHand || [] };
}
