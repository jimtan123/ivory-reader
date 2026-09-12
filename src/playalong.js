/* Ivory Reader play-along scorer.
   Pure timing logic, no DOM or audio: script.html drives it from the clock,
   and test/playalong.test.mjs drives it directly. Leaves one global, IvoryPlayAlong. */
(function(){
'use strict';
// onsets: [{beat, pitches:[midi]}] in beat order. tol: window either side of the beat.
class Scorer{
  constructor(onsets,opts){
    this.tol=(opts&&opts.tol)||0.34;
    this.onsets=onsets.map(o=>({beat:o.beat,pitches:o.pitches.slice(),left:new Set(o.pitches),closed:false}));
    this.hit=0;this.missed=0;this.wrong=0;
    this.total=this.onsets.reduce((a,o)=>a+o.pitches.length,0);
  }
  // Close every onset whose window has passed; unplayed keys there are missed.
  update(beat){
    this.onsets.forEach(o=>{if(!o.closed&&beat-o.beat>this.tol){o.closed=true;this.missed+=o.left.size;o.left.clear();}});
  }
  // Assign a key press to the earliest open onset that still wants it.
  press(m,beat){
    const o=this.onsets.find(o=>!o.closed&&Math.abs(beat-o.beat)<=this.tol&&o.left.has(m));
    if(!o){this.wrong++;return 'wrong';}
    o.left.delete(m);this.hit++;if(!o.left.size)o.closed=true;return 'hit';
  }
  // Onsets not yet closed and not yet fully played.
  remaining(){return this.onsets.filter(o=>!o.closed);}
  // The onset whose keys should be lit now: the earliest still open.
  next(){const o=this.onsets.find(o=>!o.closed);return o?{beat:o.beat,pitches:[...o.left]}:null;}
  done(){return this.onsets.every(o=>o.closed);}
  summary(){return {total:this.total,hit:this.hit,missed:this.missed,wrong:this.wrong};}
}
globalThis.IvoryPlayAlong={Scorer};
})();
