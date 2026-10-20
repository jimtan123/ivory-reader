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

// A song whose opening is the interval, so the sound has something to hang on.
// Notes are semitones from middle C; at is the note the interval starts on,
// when a lead-in comes first.
const TRICKS={
  1:{song:'Jaws',notes:[0,1,0,1]},
  2:{song:'Happy Birthday',notes:[0,0,2,0,5,4]},
  3:{song:'Greensleeves',notes:[0,3,5,7]},
  4:{song:'When the Saints Go Marching In',notes:[0,4,5,7]},
  5:{song:'Here Comes the Bride',notes:[0,5,5,5]},
  6:{song:'Maria (West Side Story)',notes:[0,6,7]},
  7:{song:'Twinkle Twinkle Little Star',notes:[0,0,7,7]},
  8:{song:'The Entertainer',notes:[-2,-1,0,8],at:2},
  9:{song:'My Bonnie Lies over the Ocean',notes:[0,9,7,5,7,5]},
  10:{song:'Somewhere (West Side Story)',notes:[0,10,9]},
  12:{song:'Somewhere over the Rainbow',notes:[0,12,11,7,9,11,12]}
};
// The lesson path: one new sound at a time, the notes first and then the
// distances between them, with a checkpoint that mixes everything so far.
// A note lesson lists the midi notes it asks; an interval lesson lists
// semitone distances, always played going up.
const C4=midi('C',4),WHITE_OCT=[0,2,4,5,7,9,11,12].map(s=>C4+s);
const LESSONS=[
  {id:'n-cg',kind:'note',title:'C and G',sub:'Two notes a fifth apart. Start here.',notes:[C4,C4+7]},
  {id:'n-ceg',kind:'note',title:'The Major Third',sub:'Add E. Now you have a chord.',notes:[C4,C4+4,C4+7]},
  {id:'n-penta',kind:'note',title:'Pentatonic Start',sub:'Add D and A. No wrong notes.',notes:[C4,C4+2,C4+4,C4+7,C4+9]},
  {id:'n-fb',kind:'note',title:'The 4th & 7th',sub:'Add F and B. The tension notes.',notes:[C4,C4+2,C4+4,C4+5,C4+7,C4+9,C4+11]},
  {id:'n-cmaj',kind:'note',check:true,title:'Middle C Major',sub:'All white keys, middle octave.',notes:WHITE_OCT},
  {id:'i-58',kind:'interval',title:'The Perfect 5th',sub:'Twinkle Twinkle opens on a perfect fifth.',ints:[7,12]},
  {id:'i-4',kind:'interval',title:'The Perfect 4th',sub:'Here Comes the Bride. Easy to mix up with the fifth.',ints:[5,7,12]},
  {id:'i-3',kind:'interval',title:'Major and Minor Thirds',sub:'When the Saints is bright; Greensleeves is sad.',ints:[3,4,5,7]},
  {id:'i-2',kind:'interval',title:'Steps',sub:'Happy Birthday takes a whole step; Jaws takes a half.',ints:[1,2,3,4]},
  {id:'i-mix',kind:'interval',check:true,title:'Small Intervals',sub:'Everything from a half step to the octave, but the wide ones.',ints:[1,2,3,4,5,7,12]},
  {id:'n-fs',kind:'note',title:'F♯ (bright & tense)',sub:'The first black key, between F and G.',notes:[...WHITE_OCT,C4+6].sort((a,b)=>a-b)},
  {id:'n-bb',kind:'note',title:'B♭ (smooth & bluesy)',sub:'The black key under B.',notes:[...WHITE_OCT,C4+6,C4+10].sort((a,b)=>a-b)},
  {id:'n-chrom',kind:'note',check:true,title:'Every Key',sub:'Add C♯, E♭ and A♭. The whole octave.',notes:Array.from({length:13},(_,i)=>C4+i)},
  {id:'i-6',kind:'interval',title:'Sixths',sub:'My Bonnie is major; The Entertainer is minor.',ints:[7,8,9,12]},
  {id:'i-7',kind:'interval',title:'Sevenths and the Tritone',sub:'Somewhere, and Maria.',ints:[6,10,11,12]},
  {id:'i-all',kind:'interval',check:true,title:'Every Interval',sub:'Half step to octave, all of them.',ints:[1,2,3,4,5,6,7,8,9,10,11,12]}
];
const ROUND=20;
// Stars for a finished round: 18 of 20 is three, 15 two, 12 one.
function starsFor(ok,total){
  const p=total?ok/total:0;
  return p>=0.9?3:p>=0.75?2:p>=0.6?1:0;
}
// The lesson to suggest: the first one without two stars yet.
function nextLesson(best){
  const i=LESSONS.findIndex(l=>((best||{})[l.id]||0)<2);
  return i<0?LESSONS.length-1:i;
}

globalThis.IvoryEar={INTERVALS,INT_SETS,RANGES,GAP_SETS,EAR_LO,EAR_HI,TRICKS,LESSONS,ROUND,
  notePool,intervalsIn,weightOf,pickWeighted,rootRange,pickRoot,gapBucket,starsFor,nextLesson};
})();
