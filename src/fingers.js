/* Ivory Reader hand positions: where each hand sits, and which finger plays
   each note. Plain script, no DOM: build.sh inlines it after parse.js, and the
   tests in test/ load it directly. It leaves one global, IvoryFingers.

   Beginner books print a finger number only where the hand is placed or moves
   (often circled). Each printed number pins the hand: finger f on a key means
   the thumb sits f-1 white keys away (to the right for the left hand, to the
   left for the right hand), and the five fingers own five neighbouring keys.
   Every note after that, until the next printed number that moves the hand,
   gets its finger from that placement. */
(function(){
'use strict';
const LETTERS=['C','D','E','F','G','A','B'],SEMI={C:0,D:2,E:4,F:5,G:7,A:9,B:11};
const step=(letter,oct)=>oct*7+LETTERS.indexOf(letter);   // white-key index; a sharp shares its letter's step
function keyAt(s,alt){const letter=LETTERS[((s%7)+7)%7],oct=Math.floor(s/7);return (oct+1)*12+SEMI[letter]+((alt&&alt[letter])||0);}
const thumbFrom=(hand,s,f)=>hand==='RH'?s-(f-1):s+(f-1);
function fingerAt(hand,thumb,s){const f=hand==='RH'?s-thumb+1:thumb-s+1;return f>=1&&f<=5?f:null;}

// Where one step's printed fingers put the thumb. When they disagree (the hand
// is stretched, as in a third played 2-1), the thumb's own number wins and the
// step is marked as a stretch.
function anchor(hand,ps){
  const got=ps.filter(x=>x.p.finger).map(x=>({f:x.p.finger,t:thumbFrom(hand,step(x.p.letter,x.p.oct),x.p.finger)}));
  if(!got.length)return null;
  got.sort((a,b)=>a.f-b.f);
  return {thumb:got[0].t,stretch:got.some(g=>g.t!==got[0].t)};
}

// Adds p.auto (the finger that plays it, or null when the hand would have to
// reach) to every sounding pitch, sets n.move to the placement on the first note
// of each one, and returns {RH:[pos...],LH:[pos...]} in time order, where
// pos = {hand,beat,thumb (step),stretch,keys:[5 midi or null, finger 1 first],at:{part,mi,ni}}.
function plan(piece){
  const out={RH:[],LH:[]},alt=(piece.key&&piece.key.alt)||{};
  ['RH','LH'].forEach(hand=>{
    const steps=[];
    piece.onsets.forEach(o=>{
      const ps=[];
      o.items.forEach(it=>{if(piece.handOf(it.part)!==hand||it.n.rest)return;it.n.pitches.forEach(p=>ps.push({p,it}));});
      if(ps.length)steps.push({beat:o.beat,ps});
    });
    const first=steps.find(s=>anchor(hand,s.ps));
    if(!first)return;                       // no printed fingers for this hand: nothing to go on
    let thumb=anchor(hand,first.ps).thumb,cur=null;
    steps.forEach(s=>{
      const a=anchor(hand,s.ps);
      const moved=a&&(a.thumb!==thumb||a.stretch||(cur&&cur.stretch));
      if(a)thumb=a.thumb;
      if(!cur||moved){
        const it=s.ps[0].it;
        cur={hand,beat:s.beat,thumb,stretch:!!(a&&a.stretch),keys:[],at:{part:it.part,mi:it.mi,ni:it.ni}};
        if(cur.stretch)s.ps.forEach(({p})=>{if(p.finger)cur.keys[p.finger-1]=p.m;});
        else for(let f=1;f<=5;f++)cur.keys[f-1]=keyAt(hand==='RH'?thumb+f-1:thumb-(f-1),alt);
        for(let f=0;f<5;f++)if(cur.keys[f]===undefined)cur.keys[f]=null;
        cur.played=new Set();
        it.n.move=cur;
        out[hand].push(cur);
      }
      s.ps.forEach(({p})=>{
        p.auto=p.finger||(cur.stretch?null:fingerAt(hand,thumb,step(p.letter,p.oct)));
        // a sharp or flat the piece actually plays replaces the plain key under that finger
        if(p.auto&&!cur.stretch&&!cur.played.has(p.auto)){cur.played.add(p.auto);cur.keys[p.auto-1]=p.m;}
      });
    });
    out[hand].forEach(pos=>delete pos.played);
  });
  return out;
}

// The placement in force at a beat: the last one that started at or before it,
// or the first one when the beat comes before any (a hand that starts late).
function at(list,beat){
  if(!list||!list.length)return null;
  let r=list[0];for(const p of list){if(p.beat<=beat+1e-9)r=p;else break;}
  return r;
}

globalThis.IvoryFingers={plan,at,step,keyAt};
})();
