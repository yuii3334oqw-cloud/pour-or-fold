const FX = require('../../utils/fx');
const PAIRS = [
  ['苹果','梨'],['可乐','雪碧'],['猫','老虎'],['筷子','叉子'],['西瓜','冬瓜'],
  ['太阳','月亮'],['铅笔','钢笔'],['奶茶','咖啡'],['地铁','火车'],['沙发','床'],
  ['薯条','薯片'],['雪人','冰淇淋'],['吉他','钢琴'],['蝙蝠','燕子'],['耳机','眼镜']
];
Page({
  data: { phase:'setup', count:4, civ:'', spy:'', spyIdx:0, cur:1, showWord:false, myWord:'', myIsSpy:false },
  addP(){ if(this.data.count<12){ FX.feedback('tap'); this.setData({ count:this.data.count+1 }); } },
  subP(){ if(this.data.count>3){ FX.feedback('tap'); this.setData({ count:this.data.count-1 }); } },
  begin(){
    const p = PAIRS[Math.floor(Math.random()*PAIRS.length)];
    const swap = Math.random()<0.5;
    FX.feedback('deal');
    this.setData({ phase:'reveal', civ: swap?p[1]:p[0], spy: swap?p[0]:p[1], spyIdx: 1+Math.floor(Math.random()*this.data.count), cur:1, showWord:false });
  },
  peek(){ const isSpy=this.data.cur===this.data.spyIdx; FX.feedback('peek'); this.setData({ showWord:true, myWord: isSpy?this.data.spy:this.data.civ, myIsSpy:isSpy }); },
  hide(){ FX.feedback('tap'); const next=this.data.cur+1; if(next>this.data.count) this.setData({ showWord:false, phase:'play' }); else this.setData({ showWord:false, cur:next }); },
  reveal(){ FX.feedback('win'); this.setData({ phase:'result' }); },
  again(){ FX.feedback('deal'); this.setData({ phase:'setup', showWord:false }); }
});
