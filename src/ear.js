/* Ivory Reader ear training: the pure parts of the listening drills — the
   interval table, the pools each drill draws from, and the weighted pick that
   brings back whatever you keep missing. No DOM, so test/ear.test.mjs loads it
   directly. Leaves one global, IvoryEar. */
(function(){
'use strict';
const SEMI={C:0,D:2,E:4,F:5,G:7,A:9,B:11};
const midi=(letter,oct)=>(oct+1)*12+SEMI[letter];
const isBlack=m=>[1,3,6,8,10].includes(m%12);

// Index is the distance in semitones, so INTERVALS[7] is the perfect fifth.
const INTERVALS=[
  {s:0,ab:'1',name:'Unison'},
  {s:1,ab:'m2',name:'Minor 2nd'},
  {s:2,ab:'M2',name:'Major 2nd'},
  {s:3,ab:'m3',name:'Minor 3rd'},
  {s:4,ab:'M3',name:'Major 3rd'},
  {s:5,ab:'P4',name:'Perfect 4th'},
  {s:6,ab:'TT',name:'Tritone'},
  {s:7,ab:'P5',name:'Perfect 5th'},
  {s:8,ab:'m6',name:'Minor 6th'},
  {s:9,ab:'M6',name:'Major 6th'},
  {s:10,ab:'m7',name:'Minor 7th'},
  {s:11,ab:'M7',name:'Major 7th'},
  {s:12,ab:'8ve',name:'Octave'}
];
// Ear training is a ladder: start with the three that are hard to confuse, add
// the thirds, then the rest of the scale, then the chromatic leftovers.
const INT_SETS={
  fifths:[0,7,12],
  thirds:[0,3,4,5,7,12],
  scale:[0,2,4,5,7,9,11,12],
  all:[0,1,2,3,4,5,6,7,8,9,10,11,12]
};
// Ranges for the name-the-note drill. Each starts on a C, which is also the
// reference note the drill can play first.
const RANGES={
  five:{lo:midi('C',4),hi:midi('G',4)},
  oct:{lo:midi('C',4),hi:midi('C',5)},
  two:{lo:midi('C',3),hi:midi('C',5)}
};
// Interval and higher-or-lower questions are rooted anywhere in the piano's
// middle, so neither note lands where the ear has no bearings.
const EAR_LO=midi('C',3),EAR_HI=midi('C',6);
// Gap sizes for higher-or-lower, in semitones. A close gap is the hard one.
const GAP_SETS={
  close:[1,2],
  mid:[3,4,5],
  wide:[6,7,8,9,10,11,12],
  mixed:[1,2,3,4,5,6,7,8,9,10,11,12]
};

function notePool(rangeKey,keys){
  const r=RANGES[rangeKey]||RANGES.oct,out=[];
  for(let m=r.lo;m<=r.hi;m++)if(keys==='all'||!isBlack(m))out.push(m);
  return out;
}
function intervalsIn(setKey){return (INT_SETS[setKey]||INT_SETS.all).map(s=>INTERVALS[s]);}
// Same shape as the reading drill's weighting: recent misses come back sooner,
// and something never asked outranks something already answered right.
function weightOf(stat){
  if(!stat||!stat.n)return 2;
  return 1+(stat.recent||[]).filter(x=>!x).length*3;
}
function pickWeighted(items,weight,rnd){
  if(!items.length)return null;
  const ws=items.map(weight);
  let r=(rnd||Math.random)()*ws.reduce((a,b)=>a+b,0);
  for(let i=0;i<items.length;i++){r-=ws[i];if(r<=0)return items[i];}
  return items[items.length-1];
}
// The roots that keep both notes of the question inside EAR_LO..EAR_HI.
function rootRange(semis,dir){
  return dir==='down'?{lo:EAR_LO+semis,hi:EAR_HI}:{lo:EAR_LO,hi:EAR_HI-semis};
}
function pickRoot(semis,dir,rnd){
  const r=rootRange(semis,dir);
  return r.lo+Math.floor((rnd||Math.random)()*(r.hi-r.lo+1));
}
// Higher-or-lower progress is kept per gap size, not per exact interval: what
// you are learning there is how small a step you can still hear.
function gapBucket(semis){return semis<=2?'close':semis<=5?'mid':'wide';}

globalThis.IvoryEar={INTERVALS,INT_SETS,RANGES,GAP_SETS,EAR_LO,EAR_HI,
  notePool,intervalsIn,weightOf,pickWeighted,rootRange,pickRoot,gapBucket};
})();
