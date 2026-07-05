const P = require('../../utils/poker');
const FX = require('../../utils/fx');
const CF = require('../../utils/confetti');
const ADS = require('../../utils/ads');

Page({
  data: {
    view: 'setup',
    numPlayers: 4,
    nameList: ['玩家1', '玩家2', '玩家3', '玩家4'],
    t: null, ov: null, result: null
  },
  G: null, peekI: -1, scores: null,

  onShareAppMessage() {
    const r = this.data.result;
    if (this.data.view === 'result' && r) {
      return { title: '德州战绩 · ' + r.sub, path: '/pages/texas/texas' };
    }
    return { title: '像素聚会牌局 · 一台手机来局德州!', path: '/pages/texas/texas' };
  },
/* ---------- 设置 ---------- */
  onMinus() { const n = this.data.numPlayers; if (n > 2) this.setNum(n - 1); },
  onPlus() { const n = this.data.numPlayers; if (n < 8) this.setNum(n + 1); },
  setNum(n) {
    FX.feedback('tap');
    const list = this.data.nameList.slice(0, n);
    while (list.length < n) list.push('玩家' + (list.length + 1));
    this.setData({ numPlayers: n, nameList: list });
  },
  onName(e) {
    const i = e.currentTarget.dataset.i;
    this.data.nameList[i] = e.detail.value;
  },
  onStart() {
    FX.feedback('deal');
    const n = this.data.numPlayers, names = [];
    for (let i = 0; i < n; i++) {
      const v = (this.data.nameList[i] || '').trim();
      names.push(v || ('玩家' + (i + 1)));
    }
    this.G = { names, n, dealer: 0, handNo: 0 };
    this.newHand();
  },

  /* ---------- 牌局 ---------- */
  pay(p, amt) { p.roundBet += amt; p.contributed += amt; },
  potTotal() { return this.G.players.reduce((s, p) => s + p.contributed, 0); },
  activeIdx() { return this.G.players.map((p, i) => p.folded ? -1 : i).filter(i => i >= 0); },
  firstActiveFrom(start) {
    const n = this.G.n;
    for (let i = 0; i < n; i++) { const j = (start + i) % n; if (!this.G.players[j].folded) return j; }
    return -1;
  },
  nextToAct(start) {
    const n = this.G.n;
    for (let i = 0; i < n; i++) {
      const j = (start + i) % n, p = this.G.players[j];
      if (!p.folded && !p.hasActed) return j;
    }
    return -1;
  },
  newHand() {
    const G = this.G;
    G.handNo++;
    G.deck = P.freshDeck();
    G.players = G.names.map(nm => ({
      name: nm, cards: [G.deck.pop(), G.deck.pop()],
      folded: false, hasActed: false, roundBet: 0, contributed: 0
    }));
    G.community = [G.deck.pop(), G.deck.pop(), G.deck.pop(), G.deck.pop(), G.deck.pop()];
    G.revealed = 0; G.street = 'preflop'; G.currentBet = 1; G.raiseAmt = 1;
    let sb, bb; const n = G.n;
    if (n === 2) { sb = G.dealer; bb = (G.dealer + 1) % n; }
    else { sb = (G.dealer + 1) % n; bb = (G.dealer + 2) % n; }
    this.pay(G.players[sb], 0.5); this.pay(G.players[bb], 1);
    G.sbIdx = sb; G.bbIdx = bb; G.actor = (bb + 1) % n;
    this.scores = null;
    this.setData({ view: 'table', feltGreen: G.handNo % 2 === 1 });
    this.renderTable();
    this.peekStep(0);
  },

  /* ---------- 开局看牌流程 ---------- */
  peekStep(i) {
    const G = this.G;
    if (i >= G.n) { this.setData({ ov: null }); return; }
    this.peekI = i;
    this.setData({ ov: { type: 'deal', idx: i, name: G.players[i].name, step: (i + 1) + ' / ' + G.n, holding: false } });
  },
  onPeekDone() {
    const ov = this.data.ov; if (!ov) return;
    FX.feedback('tap');
    if (ov.type === 'deal') this.peekStep(this.peekI + 1);
    else this.setData({ ov: null });
  },
  onHoldStart() {
    const ov = this.data.ov; if (!ov) return;
    FX.feedback('peek');
    const G = this.G, p = G.players[ov.idx];
    const known = p.cards.concat(G.community.slice(0, G.revealed));
    this.setData({
      'ov.holding': true,
      'ov.c0': P.disp(p.cards[0]), 'ov.c1': P.disp(p.cards[1]),
      'ov.hand': P.bestHandName(known)
    });
  },
  onHoldEnd() { if (this.data.ov) this.setData({ 'ov.holding': false }); },

  /* ---------- 牌桌看牌(确认身份) ---------- */
  onPeekTap(e) {
    const i = e.currentTarget.dataset.i;
    if (this.G.players[i].folded) return;
    FX.feedback('tap');
    this.setData({ ov: { type: 'confirm', idx: i, name: this.G.players[i].name } });
  },
  onPeekCancel() { this.setData({ ov: null }); },
  onPeekConfirm() {
    const ov = this.data.ov;
    this.setData({ ov: { type: 'hold', idx: ov.idx, name: ov.name, holding: false } });
  },

  /* ---------- 渲染 ---------- */
  renderTable() {
    const G = this.G;
    const labels = { preflop: 'PRE-FLOP', flop: 'FLOP', turn: 'TURN', river: 'RIVER' };
    const comm = [];
    for (let i = 0; i < 5; i++) {
      if (i < G.revealed) { const d = P.disp(G.community[i]); comm.push({ face: true, rs: d.rs, sc: d.sc, red: d.red }); }
      else comm.push({ face: false });
    }
    const cur = G.players[G.actor];
    const toCall = Math.max(0, G.currentBet - cur.roundBet);
    const players = G.players.map((p, i) => ({
      name: p.name, d: i === G.dealer, sb: i === G.sbIdx, bb: i === G.bbIdx,
      folded: p.folded, active: (i === G.actor && !p.folded),
      stat: p.folded ? '已弃牌' : ('已倒入 ' + P.cup(p.contributed) + ' 杯'),
      bet: p.roundBet > 0 ? ('本轮 ' + P.cup(p.roundBet) + ' 杯') : '—'
    }));
    this.setData({
      t: {
        street: labels[G.street] || '',
        pot: P.cup(this.potTotal()),
        comm, players,
        turnName: cur.name,
        canCheck: toCall <= 0,
        callLabel: '跟注 ' + P.cup(toCall) + ' 杯',
        raiseLabel: (G.currentBet > 0 ? '加注 ' : '下注 ') + P.cup(G.raiseAmt) + ' 杯',
        raiseStr: P.cup(G.raiseAmt)
      }
    });
  },

  /* ---------- 行动 ---------- */
  onRaiseMinus() { const G = this.G; G.raiseAmt = Math.max(0.5, G.raiseAmt - 0.5); FX.feedback('tap'); this.renderTable(); },
  onRaisePlus() { const G = this.G; G.raiseAmt = Math.min(5, G.raiseAmt + 0.5); FX.feedback('tap'); this.renderTable(); },
  onFold() { FX.feedback('fold'); this.act('fold'); },
  onCheck() { FX.feedback('tap'); this.act('check'); },
  onCall() { FX.feedback('pour'); this.act('call'); },
  onRaise() { FX.feedback('pour'); this.act('raise'); },
  act(type) {
    const G = this.G, p = G.players[G.actor];
    if (type === 'fold') p.folded = true;
    else if (type === 'check') p.hasActed = true;
    else if (type === 'call') { this.pay(p, G.currentBet - p.roundBet); p.hasActed = true; }
    else if (type === 'raise') {
      const nb = G.currentBet + G.raiseAmt;
      this.pay(p, nb - p.roundBet);
      G.currentBet = nb;
      G.players.forEach((q, i) => { if (!q.folded && i !== G.actor) q.hasActed = false; });
      p.hasActed = true;
      G.raiseAmt = 1;
    }
    if (this.activeIdx().length <= 1) { this.finishHand(this.activeIdx(), 'fold', null); return; }
    const nxt = this.nextToAct((G.actor + 1) % G.n);
    if (nxt === -1) this.endRound();
    else { G.actor = nxt; this.renderTable(); }
  },
  endRound() {
    const G = this.G;
    if (G.street === 'river') { this.showdown(); return; }
    if (G.street === 'preflop') { G.street = 'flop'; G.revealed = 3; }
    else if (G.street === 'flop') { G.street = 'turn'; G.revealed = 4; }
    else if (G.street === 'turn') { G.street = 'river'; G.revealed = 5; }
    G.currentBet = 0;
    G.players.forEach(p => { p.roundBet = 0; if (!p.folded) p.hasActed = false; });
    G.actor = this.firstActiveFrom((G.dealer + 1) % G.n);
    FX.feedback('deal');
    this.renderTable();
  },
  showdown() {
    const G = this.G, live = this.activeIdx(), scores = {};
    live.forEach(i => { scores[i] = P.eval7(G.players[i].cards.concat(G.community)); });
    let best = null;
    live.forEach(i => { if (!best || P.cmp(scores[i], best) > 0) best = scores[i]; });
    const winners = live.filter(i => P.cmp(scores[i], best) === 0);
    this.scores = scores;
    this.finishHand(winners, 'showdown', best);
  },
  finishHand(winners, reason, best) {
    const G = this.G;
    G.revealed = 5;
    const pot = this.potTotal();
    const winNames = winners.map(i => G.players[i].name).join(' · ');
    let title, sub;
    if (winners.length === 1) {
      title = 'WINNER';
      sub = winNames + ' 赢得这一池 ' + P.cup(pot) + ' 杯' +
        (reason === 'showdown' && best ? (' · 牌型:' + P.handName(best)) : ' · 其余玩家全部弃牌');
    } else {
      title = 'SPLIT POT';
      sub = '平局:' + winNames + ' · 共 ' + P.cup(pot) + ' 杯';
    }
    const drinks = G.players.map((p, i) => {
      const win = winners.indexOf(i) >= 0;
      if (win) return { name: p.name, tag: '赢家', amt: '免喝', safe: true };
      if (p.contributed > 0) return { name: p.name, tag: '', amt: '喝 ' + P.cup(p.contributed) + ' 杯', safe: false };
      return { name: p.name, tag: '', amt: '没下注 · 免喝', safe: true };
    });
    const rows = [];
    if (reason === 'showdown') {
      G.players.forEach((p, i) => {
        if (p.folded) return;
        const sc = this.scores && this.scores[i];
        rows.push({ name: p.name, hand: sc ? P.handName(sc) : '', win: winners.indexOf(i) >= 0, cards: p.cards.map(P.disp) });
      });
    }
    this.setData({
      view: 'result', ov: null, confetti: CF(),
      result: { title, sub, drinks, rows, commRow: G.community.map(P.disp), showCards: reason === 'showdown' }
    });
    FX.feedback('win');
  },
  onNextHand() { const G = this.G; G.dealer = (G.dealer + 1) % G.n; FX.feedback('deal'); ADS.showInterstitial(); this.newHand(); },
  onBackSetup() { this.setData({ view: 'setup', t: null, result: null, ov: null }); }
});
