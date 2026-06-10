const P = require('../../utils/poker');
const FX = require('../../utils/fx');

const DIRP = { left: '22%', center: '50%', right: '78%' };
const DL = { left: '左', center: '中', right: '右' };

Page({
  data: {
    view: 'setup',
    a: '球员1', b: '球员2', penStr: '3',
    scoreA: 0, scoreB: 0,
    marker: 0, vm: {}
  },
  pen: 3, kick: 0, shotDir: null, saveDir: null,
  outcome: '', sweet: false, miss: false,
  timer: null, pos: 0, pdir: 1,

  onUnload() { this.stopLoop(); },
  onHide() { this.stopLoop(); },
  stopLoop() { if (this.timer) { clearInterval(this.timer); this.timer = null; } },

  onA(e) { this.setData({ a: e.detail.value }); },
  onB(e) { this.setData({ b: e.detail.value }); },
  onPenM() { this.pen = Math.max(0.5, this.pen - 0.5); FX.feedback('tap'); this.setData({ penStr: P.cup(this.pen) }); },
  onPenP() { this.pen = Math.min(10, this.pen + 0.5); FX.feedback('tap'); this.setData({ penStr: P.cup(this.pen) }); },

  board() {
    const aShoot = this.kick % 2 === 0;
    return {
      aShoot,
      roundLabel: this.kick < 10
        ? ('第 ' + (Math.floor(this.kick / 2) + 1) + ' 轮 / 共 5 轮')
        : ('突然死亡 · 第 ' + (Math.floor((this.kick - 10) / 2) + 1) + ' 轮'),
      shooter: aShoot ? this.data.a : this.data.b,
      keeper: aShoot ? this.data.b : this.data.a
    };
  },
  onStart() {
    FX.feedback('deal');
    const a = (this.data.a || '').trim() || '球员1';
    const b = (this.data.b || '').trim() || '球员2';
    this.kick = 0;
    this.setData({ a, b, scoreA: 0, scoreB: 0 });
    this.toShoot();
  },
  toShoot() {
    this.shotDir = null; this.saveDir = null; this.miss = false; this.sweet = false;
    this.setData({ view: 'shoot', vm: this.board() });
  },
  onDir(e) {
    const d = e.currentTarget.dataset.d;
    FX.feedback('tap');
    if (this.data.view === 'shoot') { this.shotDir = d; this.toPower(); }
    else if (this.data.view === 'save') { this.saveDir = d; this.resolve(); }
  },
  toPower() {
    const bd = this.board();
    this.pos = 0; this.pdir = 1;
    bd.ballLeft = DIRP[this.shotDir];
    this.setData({ view: 'power', vm: bd, marker: 0 });
    this.timer = setInterval(() => {
      this.pos += this.pdir * 2.4;
      if (this.pos >= 100) { this.pos = 100; this.pdir = -1; }
      if (this.pos <= 0) { this.pos = 0; this.pdir = 1; }
      this.setData({ marker: this.pos });
    }, 28);
  },
  onKick() {
    this.stopLoop();
    FX.feedback('pour');
    this.miss = (this.pos < 14 || this.pos > 86);
    this.sweet = (!this.miss && this.pos >= 42 && this.pos <= 58);
    this.setData({ view: 'save', vm: this.board() });
  },
  resolve() {
    if (this.miss) this.outcome = 'miss';
    else if (this.sweet) this.outcome = 'goal';
    else this.outcome = (this.saveDir === this.shotDir) ? 'save' : 'goal';
    if (this.outcome === 'goal') {
      if (this.kick % 2 === 0) this.setData({ scoreA: this.data.scoreA + 1 });
      else this.setData({ scoreB: this.data.scoreB + 1 });
    }
    const bd = this.board();
    const isLast = (this.kick + 1 >= 10) && ((this.kick + 1) % 2 === 0) && true;
    Object.assign(bd, {
      txt: this.outcome === 'goal' ? '⚽️ 进 球!' : (this.outcome === 'save' ? '🧤 扑 出!' : '😵 射 偏!'),
      cls: this.outcome,
      line: bd.shooter + ' 射' + DL[this.shotDir] + (this.sweet ? '(刁钻)' : '') + ' · ' + bd.keeper + ' 扑' + DL[this.saveDir],
      ballLeft: DIRP[this.shotDir], ballBottom: '-60rpx', ballDeg: 0,
      keeperLeft: '50%', keeperDeg: 0,
      btn: isLast ? '查看战况' : '下 一 球'
    });
    this.setData({ view: 'reveal', vm: bd });
    setTimeout(() => {
      let bl, bb;
      if (this.outcome === 'miss') {
        if (this.shotDir === 'center') { bl = '50%'; bb = '96%'; }
        else { bl = this.shotDir === 'left' ? '-8%' : '108%'; bb = '62%'; }
      } else if (this.outcome === 'goal') { bl = DIRP[this.shotDir]; bb = '56%'; }
      else { bl = DIRP[this.saveDir]; bb = '24%'; }
      const kd = this.saveDir === 'left' ? -24 : (this.saveDir === 'right' ? 24 : 0);
      this.setData({
        'vm.ballLeft': bl, 'vm.ballBottom': bb, 'vm.ballDeg': 900,
        'vm.keeperLeft': DIRP[this.saveDir], 'vm.keeperDeg': kd
      });
    }, 80);
    FX.feedback(this.outcome === 'goal' ? 'win' : 'fold');
  },
  onNextKick() {
    this.kick++;
    if (this.kick >= 10 && this.kick % 2 === 0 && this.data.scoreA !== this.data.scoreB) {
      const aWin = this.data.scoreA > this.data.scoreB;
      this.setData({
        view: 'end',
        vm: { winner: aWin ? this.data.a : this.data.b, loser: aWin ? this.data.b : this.data.a, pen: P.cup(this.pen) }
      });
      FX.feedback('win');
      return;
    }
    this.toShoot();
  },
  onAgain() { this.kick = 0; this.setData({ scoreA: 0, scoreB: 0 }); FX.feedback('deal'); this.toShoot(); },
  onBackSetup() { this.setData({ view: 'setup' }); }
});
