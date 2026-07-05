const FX = require('../../utils/fx');
Page({
  data: { started:false, lo:1, hi:100, bomb:0, pick:50, turn:1, boom:false },
  onLoad(){ this.reset(); },
  reset(){ this.setData({ started:false, lo:1, hi:100, bomb:1+Math.floor(Math.random()*100), pick:50, turn:1, boom:false }); },
  start(){ FX.feedback('deal'); this.setData({ started:true }); },
  onSlide(e){ this.setData({ pick: e.detail.value }); },
  dec(){ if(this.data.pick>this.data.lo){ FX.feedback('tap'); this.setData({ pick:this.data.pick-1 }); } },
  inc(){ if(this.data.pick<this.data.hi){ FX.feedback('tap'); this.setData({ pick:this.data.pick+1 }); } },
  cut(){
    const { pick, bomb, lo, hi, turn } = this.data;
    if(pick===bomb){ FX.feedback('fold'); this.setData({ boom:true }); return; }
    FX.feedback('tap');
    let nlo=lo, nhi=hi;
    if(pick<bomb) nlo=pick+1; else nhi=pick-1;
    this.setData({ lo:nlo, hi:nhi, pick:Math.floor((nlo+nhi)/2), turn:turn+1 });
  },
  again(){ this.reset(); FX.feedback('deal'); }
});
