/* Ivory Reader play-along scorer.
   Pure timing logic, no DOM or audio: script.html drives it from the clock,
   and test/playalong.test.mjs drives it directly. Leaves one global, IvoryPlayAlong. */
(function(){
'use strict';
// onsets: [{beat, pitches:[midi]}] in beat order. tol: window either side of the beat.
class Scorer{
  constructor(onsets,opts){
    this.tol=(opts&&opts.tol)||0.34;
    this.onsets=onsets.map(o=>({beat:o.beat,pitches:o.pitches.slice(),left:new Set(o.pitches),closed:false,got:0,heard:[],offsets:[]}));
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
    o.left.delete(m);o.got++;o.heard.push(m);o.offsets.push(beat-o.beat);this.hit++;if(!o.left.size)o.closed=true;return 'hit';
  }
  // Onsets not yet closed and not yet fully played.
  remaining(){return this.onsets.filter(o=>!o.closed);}
  // The onset whose keys should be lit now: the earliest still open.
  next(){const o=this.onsets.find(o=>!o.closed);return o?{beat:o.beat,pitches:[...o.left]}:null;}
  done(){return this.onsets.every(o=>o.closed);}
  summary(){return {total:this.total,hit:this.hit,missed:this.missed,wrong:this.wrong};}
  // Per onset, how it went: 'hit' (every key on time), 'part' (some), 'miss' (none),
  // which keys were played on time,
  // and how far off the beat the keys that did land were, on average, in beats.
  results(){return this.onsets.map(o=>({beat:o.beat,pitches:o.pitches.slice(),heard:o.heard.slice(),
    status:o.got===o.pitches.length?'hit':o.got?'part':'miss',
    offset:o.offsets.length?o.offsets.reduce((a,b)=>a+b,0)/o.offsets.length:null}));}
}
// What to tell the player after a run. bpb: beats per bar, so bars can be named.
function review(scorer,bpb){
  const s=scorer.summary(),res=scorer.results();
  const pct=s.total?Math.round(100*s.hit/s.total):0;
  const grade=pct>=90?'Excellent':pct>=75?'Good':pct>=50?'Getting there':'Keep going';
  const offs=res.filter(r=>r.offset!=null).map(r=>r.offset);
  const mean=offs.length?offs.reduce((a,b)=>a+b,0)/offs.length:0;
  // Early or late only when it is a habit: enough notes, leaning a tenth of a beat or more.
  const tendency=offs.length>=4&&mean<=-0.1?'early':offs.length>=4&&mean>=0.1?'late':'steady';
  const miss={};res.forEach(r=>{if(r.status!=='hit'){const b=Math.floor(r.beat/bpb)+1;miss[b]=(miss[b]||0)+(r.status==='miss'?1:0.5);}});
  const weakBars=Object.keys(miss).map(Number).sort((a,b)=>miss[b]-miss[a]||a-b).slice(0,3).sort((a,b)=>a-b);
  return {pct,grade,mean,tendency,weakBars,summary:s};
}
globalThis.IvoryPlayAlong={Scorer,review};
})();
