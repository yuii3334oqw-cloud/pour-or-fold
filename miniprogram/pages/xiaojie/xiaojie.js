const P = require('../../utils/poker');
const FX = require('../../utils/fx');

const XJ_REF = [
  { k: 'A', v: '点杀:指定一人,自己定喝几杯' },
  { k: '2', v: '小姐:当小姐被点陪喝,下张2换人' },
  { k: '3', v: '逛三园:接龙说不出喝' },
  { k: '4', v: '找人决斗:玩啥自己定,输了喝' },
  { k: '5', v: '石头剪刀布:每输+半杯' },
  { k: '6', v: '摸鼻子:偷偷摸,最后一个喝' },
  { k: '7', v: '七的倍数:报错喝' },
  { k: '8', v: '尿牌:有它才能去厕所,出牌放行' },
  { k: '9', v: '自己喝' },
  { k: '10', v: '神经病:喊我是神经病,搭理者喝,下张10换人' },
  { k: 'J', v: '上家喝' },
  { k: 'Q', v: '下家喝' },
  { k: 'K', v: '定酒:首张喝半杯并指定下张K喝几杯' }
];
const RPS = ['石头', '布', '剪刀'];

Page({
  data: {
    view: 'setup',
    n: 6,
    nameList: ['玩家1', '玩家2', '玩家3', '玩家4', '玩家5', '玩家6'],
    refList: XJ_REF,
    topStr: '', card: null, info: null,
    kPickStr: '1', dsCupsStr: '1', vm: {}
  },
  deck: [], drawer: 0, kPending: null, kPick: 1,
  dsVictim: -1, dsCups: 1, rpsOpp: -1, rpsA: -1, rpsB: -1, rpsStake: 0.5,
  isK: false, cardR: 0,

  onShareAppMessage() {
    return { title: '像素聚会牌局 · 小姐牌整蛊开局!', path: '/pages/xiaojie/xiaojie' };
  },
onMinus() { const n = this.data.n; if (n > 3) this.setNum(n - 1); },
  onPlus() { const n = this.data.n; if (n < 12) this.setNum(n + 1); },
  setNum(n) {
    FX.feedback('tap');
    const list = this.data.nameList.slice(0, n);
    while (list.length < n) list.push('玩家' + (list.length + 1));
    this.setData({ n, nameList: list });
  },
  onName(e) { this.data.nameList[e.currentTarget.dataset.i] = e.detail.value; },
  names() { return this.data.nameList; },

  onStart() {
    FX.feedback('deal');
    const n = this.data.n, list = [];
    for (let i = 0; i < n; i++) {
      const v = (this.data.nameList[i] || '').trim();
      list.push(v || ('玩家' + (i + 1)));
    }
    this.setData({ nameList: list });
    this.deck = P.freshDeck();
    this.drawer = 0; this.kPending = null;
    this.toDraw();
  },
  topBar() {
    const pend = this.kPending != null ? (' · 下张 K 喝 ' + P.cup(this.kPending) + ' 杯') : '';
    return '牌堆剩 ' + this.deck.length + ' 张' + pend;
  },
  toDraw() {
    this.setData({ view: 'draw', topStr: this.topBar(), vm: { me: this.names()[this.drawer] } });
  },
  onDraw() {
    FX.feedback('deal');
    if (this.deck.length === 0) this.deck = P.freshDeck();
    const c = this.deck.pop();
    this.cardR = c.r;
    this.isK = (c.r === 13);
    if (this.isK) this.kPick = 1;
    const info = this.rule(c);
    this.setData({
      view: 'reveal', topStr: this.topBar(),
      card: P.disp(c), info, isK: this.isK,
      kPickStr: P.cup(this.kPick),
      vm: {
        canDS: c.r === 14,
        canRPS: c.r === 4 || c.r === 5,
        rpsLabel: c.r === 5 ? '开始猜拳(输喝半杯)' : '用猜拳决斗(输喝 1 杯)'
      }
    });
  },
  rule(c) {
    const ns = this.names(), n = this.data.n;
    const me = ns[this.drawer];
    const prev = ns[(this.drawer - 1 + n) % n];
    const next = ns[(this.drawer + 1) % n];
    const r = c.r;
    if (r === 14) return { tag: 'A · 点杀', desc: me + ' 点杀任意一人,并自己决定 TA 喝几杯!(也可玩蒙眼版:蒙一人眼,指人问 TA 喝不喝)' };
    if (r === 2) return { tag: '2 · 小姐', desc: me + ' 成为「小姐」,要立刻亮明身份。之后谁喝酒都能点小姐陪喝半杯,陪喝后要说「谢谢老板」——直到下一张 2 出现才换人/解除。' };
    if (r === 3) return { tag: '3 · 逛三园', desc: '从 ' + me + ' 开始「逛三园」:轮流说 动物园/植物园/水果园 里的东西,不能重复、不能卡壳,出错者喝半杯。' };
    if (r === 4) return { tag: '4 · 找人决斗', desc: me + ' 点名一人决斗,玩什么自己定(猜拳、划拳、闷酒…),输的人喝一杯!' };
    if (r === 5) return { tag: '5 · 石头剪刀布', desc: me + ' 和大家一起出拳,每输一轮 +半杯,可连续淘汰到只剩一人。' };
    if (r === 6) return { tag: '6 · 摸鼻子', desc: me + ' 不要出声,悄悄开始摸鼻子;其他人察觉后也跟着偷偷摸——最后一个摸的人喝半杯。' };
    if (r === 7) return { tag: '7 · 七的倍数', desc: '从 ' + me + ' 开始报数,遇到 7、含 7、或 7 的倍数 要拍桌说「过」并反向,出错者喝一杯。' };
    if (r === 8) return { tag: '8 · 尿牌', desc: me + ' 获得一张「尿牌」收好——有尿牌才能去撒尿!没有尿牌的人中途不许离桌上厕所。想去时点「出尿牌」打出(作废)。' };
    if (r === 9) return { tag: '9 · 自己喝', desc: me + ' 自己喝一杯,认栽。' };
    if (r === 10) return { tag: '10 · 神经病', desc: me + ' 先大喊一声「我是神经病!」,此后谁搭理 TA(回应/对话)谁喝——直到下一张 10 出现才换人。' };
    if (r === 11) return { tag: 'J · 上家喝', desc: me + ' 的上家「' + prev + '」喝一杯。' };
    if (r === 12) return { tag: 'Q · 下家喝', desc: me + ' 的下家「' + next + '」喝一杯。' };
    const drinkNow = (this.kPending == null) ? 0.5 : this.kPending;
    return { tag: 'K · 定酒', desc: me + ' 抽到 K,先喝 ' + P.cup(drinkNow) + ' 杯;再指定「下一个抽到 K 的人」喝几杯' };
  },
  onNextPlayer() {
    FX.feedback('tap');
    this.drawer = (this.drawer + 1) % this.data.n;
    this.toDraw();
  },
  /* K 定酒 */
  onKM() { this.kPick = Math.max(0.5, this.kPick - 0.5); this.setData({ kPickStr: P.cup(this.kPick) }); },
  onKP() { this.kPick = Math.min(5, this.kPick + 0.5); this.setData({ kPickStr: P.cup(this.kPick) }); },
  onKConfirm() { this.kPending = this.kPick; this.onNextPlayer(); },
  /* A 点杀 */
  onDS() {
    const list = [];
    for (let i = 0; i < this.data.n; i++) if (i !== this.drawer) list.push({ i, name: this.names()[i] });
    this.setData({ view: 'dsPick', topStr: this.topBar(), vm: { me: this.names()[this.drawer], list } });
  },
  onDSPick(e) {
    this.dsVictim = e.currentTarget.dataset.i;
    this.dsCups = 1;
    FX.feedback('tap');
    this.setData({ view: 'dsCups', dsCupsStr: '1', vm: { me: this.names()[this.drawer], victim: this.names()[this.dsVictim] } });
  },
  onDSRand() {
    const o = [];
    for (let i = 0; i < this.data.n; i++) if (i !== this.drawer) o.push(i);
    this.dsVictim = o[Math.floor(Math.random() * o.length)];
    this.dsCups = 1;
    FX.feedback('tap');
    this.setData({ view: 'dsCups', dsCupsStr: '1', vm: { me: this.names()[this.drawer], victim: this.names()[this.dsVictim] } });
  },
  onDSM() { this.dsCups = Math.max(0.5, this.dsCups - 0.5); this.setData({ dsCupsStr: P.cup(this.dsCups) }); },
  onDSP() { this.dsCups = Math.min(5, this.dsCups + 0.5); this.setData({ dsCupsStr: P.cup(this.dsCups) }); },
  onDSConfirm() {
    FX.feedback('win');
    this.setData({ view: 'dsDone', vm: { victim: this.names()[this.dsVictim], cups: P.cup(this.dsCups) } });
  },
  /* 猜拳决斗 */
  onRPS() {
    this.rpsStake = this.cardR === 5 ? 0.5 : 1;
    const list = [];
    for (let i = 0; i < this.data.n; i++) if (i !== this.drawer) list.push({ i, name: this.names()[i] });
    this.setData({ view: 'rpsPick', topStr: this.topBar(), vm: { me: this.names()[this.drawer], stake: P.cup(this.rpsStake), list } });
  },
  onRPSOpp(e) {
    this.rpsOpp = e.currentTarget.dataset.i;
    FX.feedback('tap');
    this.setData({ view: 'rpsA', vm: { who: this.names()[this.drawer] } });
  },
  onRPSPick(e) {
    const c = Number(e.currentTarget.dataset.c);
    FX.feedback('tap');
    if (this.data.view === 'rpsA') {
      this.rpsA = c;
      this.setData({ view: 'rpsB', vm: { who: this.names()[this.rpsOpp] } });
    } else {
      this.rpsB = c;
      const a = this.rpsA, b = this.rpsB, tie = a === b;
      const beat = (a === 0 && b === 2) || (a === 2 && b === 1) || (a === 1 && b === 0);
      const loser = tie ? '' : (beat ? this.names()[this.rpsOpp] : this.names()[this.drawer]);
      this.setData({
        view: 'rpsResult',
        vm: {
          me: this.names()[this.drawer], opp: this.names()[this.rpsOpp],
          ea: RPS[a], eb: RPS[b], tie, loser, stake: P.cup(this.rpsStake)
        }
      });
      FX.feedback(tie ? 'tap' : 'win');
    }
  },
  onRPSReplay() { this.setData({ view: 'rpsA', vm: { who: this.names()[this.drawer] } }); },
  /* 尿牌 */
  onPiao() { this.setData({ view: 'piao', topStr: this.topBar() }); },
  onPiaoGo() { FX.feedback('peek'); this.setData({ view: 'piaoDone' }); },
  /* 规则总览 */
  onRules() { this.setData({ view: 'rules' }); },
  onRulesBack() { this.toDraw(); },
  onCancel() { this.toDraw(); },
  onCancelReveal() { this.setData({ view: 'reveal' }); },
  onBackSetup() { this.setData({ view: 'setup' }); }
});
