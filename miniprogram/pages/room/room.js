const NET = require('../../utils/net');
const FX = require('../../utils/fx');
const P = require('../../utils/poker');
const CF = require('../../utils/confetti');
const ADS = require('../../utils/ads');

function cup(x) { return P.cup(x); }
const STREET = { preflop: 'PRE-FLOP', flop: 'FLOP', turn: 'TURN', river: 'RIVER' };

Page({
  data: { roomId: '', me: '', room: null, myHole: [], raise: 1, vm: {} },
  watcher: null, lastHV: -1,

  async onLoad(q) {
    const id = String(q.roomId || '');
    this.setData({ roomId: id });
    wx.setNavigationBarTitle({ title: '房间 ' + id });
    const w = await NET.call('whoami');
    if (w.ok) this.setData({ me: w.openid });
    // 直接扫码/点链接进来但还没入座的,补一次 join
    await NET.call('join', { roomId: id, name: NET.nick() || '玩家' });
    this.startWatch(id);
  },
  onUnload() { if (this.watcher) { try { this.watcher.close(); } catch (e) {} } if (this.data.roomId) NET.call('leave', { roomId: this.data.roomId }); },
  onShareAppMessage() {
    const vm = this.data.vm || {};
    if (vm.mode === 'result' && vm.result) {
      return { title: '战绩 ' + vm.result.title + ':' + vm.result.sub + ' · 房号 ' + this.data.roomId + ' 来下一局!', path: '/pages/online/online?code=' + this.data.roomId };
    }
return { title: '来一局!房号 ' + this.data.roomId, path: '/pages/online/online?code=' + this.data.roomId };
  },

  startWatch(id) {
    const db = wx.cloud.database();
    this.watcher = db.collection('rooms').doc(id).watch({
      onChange: snap => {
        const doc = snap && snap.docs && snap.docs[0];
        if (doc) this.onRoom(doc);
        else { wx.showToast({ title: '房间已关闭', icon: 'none' }); setTimeout(() => wx.navigateBack(), 900); }
      },
      onError: () => { setTimeout(() => this.startWatch(id), 1500); }
    });
  },
  onRoom(room) {
    if (room.game === 'texas' && room.status !== 'lobby' && room.handVersion !== this.lastHV) {
      this.lastHV = room.handVersion; this.refreshHole();
    }
    this.setData({ room });
    this.buildVM(room);
    if (room.status === 'handover' && !this._confetti) { this._confetti = true; this.setData({ confetti: CF() }); }
    if (room.status !== 'handover') this._confetti = false;
  },
  async refreshHole() {
    const r = await NET.call('getHand', { roomId: this.data.roomId });
    if (r.ok && r.hole) {
      this.setData({ myHole: r.hole.map(P.disp) });
      if (this.data.room) this.buildVM(this.data.room);   // 底牌到了,重渲染让我的座位亮出手牌
    }
  },

  buildVM(room) {
    const me = this.data.me;
    if (room.status === 'lobby') {
      const players = room.players.map(p => ({ name: p.name, ready: p.ready, host: p.openid === room.host, me: p.openid === me }));
      this.setData({ vm: {
        mode: 'lobby', players, isHost: room.host === me,
        canStart: room.players.length >= 2,
        iReady: (room.players.find(p => p.openid === me) || {}).ready,
        gameName: room.game === 'texas' ? '德州扑克' : '21 点'
      }});
      return;
    }
    if (room.game === 'texas') return this.vmTexas(room);
    return this.vmBJ(room);
  },
  vmTexas(room) {
    const me = this.data.me, t = room.tx;
    const mySeat = t.seats.findIndex(s => s.openid === me);
    const comm = [];
    for (let i = 0; i < 5; i++) {
      if (i < t.revealed) { const d = P.disp(t.community[i]); comm.push({ face: true, rs: d.rs, sc: d.sc, red: d.red }); }
      else comm.push({ face: false });
    }
    const seats = t.seats.map((s, i) => ({
      name: s.name, folded: s.folded, active: (i === t.actor && !s.folded), isMe: i === mySeat,
      d: i === t.dealer, sb: i === t.sb, bb: i === t.bb,
      stat: s.folded ? '已弃牌' : ('已倒入 ' + cup(s.contributed) + ' 杯'),
      bet: s.roundBet > 0 ? ('本轮 ' + cup(s.roundBet) + ' 杯') : '—',
      mine: (i === mySeat) ? this.data.myHole : null
    }));
    const toCall = mySeat >= 0 ? Math.max(0, t.currentBet - t.seats[mySeat].roundBet) : 0;
    const myTurn = mySeat === t.actor && !room.result && mySeat >= 0;
    this.setData({ vm: {
      mode: room.result ? 'result' : 'texas', game: 'texas',
      street: STREET[t.street] || '', pot: cup(t.pot), comm, seats,
      myTurn, canCheck: toCall <= 0, callLabel: '跟注 ' + cup(toCall) + ' 杯',
      raiseLabel: (t.currentBet > 0 ? '加注 ' : '下注 ') + cup(this.data.raise) + ' 杯', raiseStr: cup(this.data.raise),
      waitName: (t.actor >= 0 && t.seats[t.actor]) ? t.seats[t.actor].name : '',
      result: room.result ? this.txResult(room.result) : null,
      isHost: room.host === me
    }});
  },
  txResult(res) {
    return {
      title: res.title,
      sub: (res.winnerNames.join(' · ')) + ' 赢得 ' + res.pot + ' 杯' + (res.handName ? (' · ' + res.handName) : ''),
      drinks: res.drinks,
      reveal: (res.reveal || []).map(rw => ({ name: rw.name, hand: rw.hand, win: rw.win, cards: (rw.hole || []).map(P.disp) })),
      comm: (res.community || []).map(P.disp)
    };
  },
  vmBJ(room) {
    const me = this.data.me, b = room.bj;
    const mySeat = b.seats.findIndex(s => s.openid === me);
    const seats = b.seats.map((s, i) => ({
      name: s.name, isMe: i === mySeat, isDealer: i === b.dealer,
      active: b.phase === 'play' && i === b.turn,
      bust: s.val > 21,
      status: (s.hand.length === 2 && s.val === 21) ? '21点!' : (s.val > 21 ? ('爆 ' + s.val) : (s.stood ? ('停 ' + s.val) : (s.val + ' 点'))),
      cards: s.hand.map(P.disp)
    }));
    const dCards = b.dealerHand.map(c => c.back ? { back: true } : Object.assign({ back: false }, P.disp(c)));
    const myTurn = mySeat === b.turn && !room.result && mySeat >= 0;
    this.setData({ vm: {
      mode: room.result ? 'result' : 'bj', game: 'blackjack',
      phase: b.phase === 'dealer' ? '庄家行动' : '闲家行动',
      dealerName: b.seats[b.dealer].name, dCards, dVal: b.dealerVal == null ? '?' : (b.dealerVal + ' 点'),
      seats, myTurn, waitName: (b.turn >= 0 && b.seats[b.turn]) ? b.seats[b.turn].name : '',
      result: room.result ? { title: res_title(room.result), sub: room.result.dealerName + ' 庄 · ' + room.result.dealerVal + ' 点' + (room.result.dealerBust ? ' 爆' : ''), drinks: room.result.drinks, bjReveal: (room.result.reveal || []).map(rw => ({ name: rw.name + (rw.dealer ? '(庄)' : ''), val: rw.val, cards: rw.hand.map(P.disp) })) } : null,
      isHost: room.host === me
    }});
  },

  /* 操作 */
  onReady() { FX.feedback('tap'); NET.call('ready', { roomId: this.data.roomId, ready: !this.data.vm.iReady }); },
  onStart() { FX.feedback('deal'); NET.call('start', { roomId: this.data.roomId }); },
  onNext() { FX.feedback('deal'); ADS.showInterstitial(); NET.call('next', { roomId: this.data.roomId }); },
  onLeave() { const id = this.data.roomId; NET.call('leave', { roomId: id }); wx.navigateBack(); },
  onFold() { FX.feedback('fold'); NET.call('act', { roomId: this.data.roomId, type: 'fold' }); },
  onCheck() { FX.feedback('tap'); NET.call('act', { roomId: this.data.roomId, type: 'check' }); },
  onCall() { FX.feedback('pour'); NET.call('act', { roomId: this.data.roomId, type: 'call' }); },
  onRaise() { FX.feedback('pour'); NET.call('act', { roomId: this.data.roomId, type: 'raise', amt: this.data.raise }); },
  onRaiseM() { const r = Math.max(0.5, this.data.raise - 0.5); FX.feedback('tap'); this.setData({ raise: r }); this.buildVM(this.data.room); },
  onRaiseP() { const r = Math.min(5, this.data.raise + 0.5); FX.feedback('tap'); this.setData({ raise: r }); this.buildVM(this.data.room); },
  onHit() { FX.feedback('deal'); NET.call('bjAct', { roomId: this.data.roomId, type: 'hit' }); },
  onStand() { FX.feedback('tap'); NET.call('bjAct', { roomId: this.data.roomId, type: 'stand' }); },
  copyCode() { wx.setClipboardData({ data: this.data.roomId }); }
});
function res_title(r) { return r.dealerBust ? '庄家爆牌' : '本局结算'; }
