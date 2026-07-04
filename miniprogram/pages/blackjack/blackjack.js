const P = require('../../utils/poker');
const FX = require('../../utils/fx');

Page({
  data: {
    view: 'setup',
    n: 4,
    nameList: ['玩家1', '玩家2', '玩家3', '玩家4'],
    betStr: '1',
    t: null, result: null
  },
  onShareAppMessage() {
    const r = this.data.result;
    if (this.data.view === 'result' && r) {
      return { title: '21点战绩 · ' + r.sub, path: '/pages/blackjack/blackjack' };
    }
    return { title: '像素聚会牌局 · 21点轮流坐庄!', path: '/pages/blackjack/blackjack' };
  },
B: null, bet: 1,

  onMinus() { const n = this.data.n; if (n > 2) this.setNum(n - 1); },
  onPlus() { const n = this.data.n; if (n < 8) this.setNum(n + 1); },
  setNum(n) {
    FX.feedback('tap');
    const list = this.data.nameList.slice(0, n);
    while (list.length < n) list.push('玩家' + (list.length + 1));
    this.setData({ n, nameList: list });
  },
  onName(e) { this.data.nameList[e.currentTarget.dataset.i] = e.detail.value; },
  onBetMinus() { this.bet = Math.max(0.5, this.bet - 0.5); FX.feedback('tap'); this.setData({ betStr: P.cup(this.bet) }); },
  onBetPlus() { this.bet = Math.min(5, this.bet + 0.5); FX.feedback('tap'); this.setData({ betStr: P.cup(this.bet) }); },

  onStart() {
    FX.feedback('deal');
    const n = this.data.n, names = [];
    for (let i = 0; i < n; i++) {
      const v = (this.data.nameList[i] || '').trim();
      names.push(v || ('玩家' + (i + 1)));
    }
    this.B = { names, n, dealer: 0 };
    this.deal();
  },
  deal() {
    const B = this.B;
    B.deck = P.freshDeck(); B.hands = []; B.stood = [];
    for (let i = 0; i < B.n; i++) { B.hands.push([B.deck.pop(), B.deck.pop()]); B.stood.push(false); }
    B.phase = 'play'; B.hidden = true;
    let i = 0; while (i < B.n && i === B.dealer) i++;
    if (i >= B.n) { this.dealerPhase(); }
    else { B.turn = i; this.setData({ view: 'table' }); this.render(); }
  },
  advance() {
    const B = this.B;
    let i = B.turn + 1; while (i < B.n && i === B.dealer) i++;
    if (i >= B.n) this.dealerPhase();
    else { B.turn = i; this.render(); }
  },
  dealerPhase() {
    const B = this.B;
    B.phase = 'dealer'; B.hidden = false; B.turn = B.dealer;
    this.setData({ view: 'table' });
    this.render();
  },
  onHit() {
    FX.feedback('deal');
    const B = this.B, h = B.hands[B.turn];
    h.push(B.deck.pop());
    if (P.bjHandVal(h) > 21) { this.render(); setTimeout(() => this.done(), 750); }
    else this.render();
  },
  onStand() { FX.feedback('tap'); this.done(); },
  done() {
    const B = this.B;
    if (B.phase === 'dealer') { this.resolve(); return; }
    B.stood[B.turn] = true;
    this.advance();
  },
  render() {
    const B = this.B, dh = B.hands[B.dealer];
    const dCards = B.hidden
      ? [Object.assign({ back: false }, P.disp(dh[0])), { back: true }]
      : dh.map(c => Object.assign({ back: false }, P.disp(c)));
    const dv = P.bjHandVal(dh);
    const seats = [];
    for (let i = 0; i < B.n; i++) {
      if (i === B.dealer) continue;
      const h = B.hands[i], v = P.bjHandVal(h);
      seats.push({
        name: B.names[i], cards: h.map(P.disp),
        bust: v > 21, active: (B.phase === 'play' && i === B.turn),
        status: P.bjIsBJ(h) ? '21点!' : (v > 21 ? ('爆 ' + v) : (B.stood[i] ? ('停 ' + v) : (v + ' 点')))
      });
    }
    this.setData({
      t: {
        phase: B.phase === 'dealer' ? '庄 家 行 动' : '闲 家 行 动',
        dealerName: B.names[B.dealer],
        dCards,
        dVal: B.hidden ? '? 点' : (dv + ' 点'),
        dBust: !B.hidden && dv > 21,
        seats,
        actor: B.phase === 'dealer' ? B.names[B.dealer] : B.names[B.turn],
        role: B.phase === 'dealer' ? '庄家' : '闲家'
      }
    });
  },
  resolve() {
    const B = this.B, dh = B.hands[B.dealer];
    const dv = P.bjHandVal(dh), dBust = dv > 21, dBJ = P.bjIsBJ(dh);
    let dealerDrinks = 0;
    const drinks = [], rows = [];
    rows.push({ name: B.names[B.dealer] + ' 庄 · ' + dv + ' 点' + (dBust ? ' 爆' : ''), cards: dh.map(P.disp), win: true });
    for (let i = 0; i < B.n; i++) {
      if (i === B.dealer) continue;
      const h = B.hands[i], pv = P.bjHandVal(h), pBust = pv > 21, pBJ = P.bjIsBJ(h);
      let o;
      if (pBust) o = 'lose';
      else if (dBust) o = 'win';
      else if (pBJ && !dBJ) o = 'win';
      else if (dBJ && !pBJ) o = 'lose';
      else if (pv > dv) o = 'win';
      else if (pv < dv) o = 'lose';
      else o = 'push';
      if (o === 'win') dealerDrinks += this.bet;
      drinks.push(
        o === 'lose' ? { name: B.names[i], tag: '', amt: '喝 ' + P.cup(this.bet) + ' 杯', safe: false } :
        o === 'win' ? { name: B.names[i], tag: '赢庄', amt: '免喝', safe: true } :
        { name: B.names[i], tag: '', amt: '平 · 免喝', safe: true }
      );
      rows.push({ name: B.names[i] + ' · ' + pv + ' 点' + (pBust ? ' 爆' : ''), cards: h.map(P.disp), win: false });
    }
    drinks.unshift({
      name: B.names[B.dealer], tag: '庄',
      amt: dealerDrinks > 0 ? ('喝 ' + P.cup(dealerDrinks) + ' 杯') : '免喝',
      safe: dealerDrinks <= 0
    });
    this.setData({
      view: 'result',
      result: {
        title: dBust ? '庄家爆牌!' : '本 局 结 算',
        sub: '庄家 ' + B.names[B.dealer] + ' · ' + dv + ' 点' + (dBust ? '' : '') +
          (dealerDrinks > 0 ? (' · 喝 ' + P.cup(dealerDrinks) + ' 杯') : ''),
        drinks, rows
      }
    });
    FX.feedback('win');
  },
  onNext() { const B = this.B; B.dealer = (B.dealer + 1) % B.n; FX.feedback('deal'); this.deal(); },
  onBackSetup() { this.setData({ view: 'setup', t: null, result: null }); }
});
