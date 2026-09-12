/* Ivory Reader notation parser.
   Plain script, no DOM: build.sh inlines it before script.html, and the tests
   in test/ load it directly. It leaves one global, IvoryParse. */
(function(){
'use strict';
const SEMI={C:0,D:2,E:4,F:5,G:7,A:9,B:11};
const midi=(letter,oct)=>(oct+1)*12+SEMI[letter];
const SHARPS=['F','C','G','D','A','E','B'],FLATS=['B','E','A','D','G','C','F'];
const KEYS={'C':0,'G':1,'D':2,'A':3,'E':4,'B':5,'F#':6,'C#':7,'F':-1,'BB':-2,'EB':-3,'AB':-4,'DB':-5,'GB':-6,'CB':-7,
  'AM':0,'EM':1,'BM':2,'F#M':3,'C#M':4,'G#M':5,'D#M':6,'DM':-1,'GM':-2,'CM':-3,'FM':-4,'BBM':-5,'EBM':-6};
const DUR={w:4,h:2,q:1,e:0.5,s:0.25};
// Part names in score order. A "2" part is a second voice on the same staff as its hand.
const PARTS=['RH','RH2','LH','LH2'];
const PART_ALIAS={rh:'RH',right:'RH',r:'RH',treble:'RH',rh2:'RH2',right2:'RH2',r2:'RH2',treble2:'RH2',
  lh:'LH',left:'LH',l:'LH',bass:'LH',lh2:'LH2',left2:'LH2',l2:'LH2',bass2:'LH2'};
const handOf=part=>part.slice(0,2);

function keySig(name){
  const n=(name||'C').trim().replace(/\s+/g,'').replace(/minor$/i,'m').replace(/major$/i,'').toUpperCase();
  const k=KEYS[n];if(k===undefined)return null;
  const alt={};if(k>0)SHARPS.slice(0,k).forEach(l=>alt[l]=1);if(k<0)FLATS.slice(0,-k).forEach(l=>alt[l]=-1);
  return {count:k,alt};
}

// n notes in the time of the largest power of two below n: 3 in 2, 5 in 4, 6 in 4, 7 in 4.
function tupletRatio(n){let k=1;while(k*2<n)k*=2;return k/n;}

// Splits one bar into tokens, grouping "3( ... )" into a tuplet marker stream:
// yields {tok} for notes and {open:n} / {close:true} around a tuplet.
function tokenizeBar(text){
  const out=[];
  // a token is a [chord] plus its length, or any run of non-space characters
  (text.match(/\[[^\]]*\]\S*|\S+/g)||[]).forEach(raw=>{
    let s=raw;
    const o=s.match(/^(\d+)\((.*)$/);
    if(o){out.push({open:+o[1]});s=o[2];if(!s)return;}
    let closeAfter=false;
    if(s.endsWith(')')){closeAfter=true;s=s.slice(0,-1);}
    if(s)out.push({tok:s});
    if(closeAfter)out.push({close:true});
  });
  return out;
}

function parsePiece(text){
  const piece={title:'Untitled',time:[4,4],tempo:72,keyName:'C',parts:{},errors:[]};
  const partLines={};
  text.split(/\r?\n/).forEach(line=>{
    const m=line.match(/^\s*([A-Za-z]+\d?)\s*:\s*(.*)$/);if(!m)return;
    const k=m[1].toLowerCase(),v=m[2].trim();
    if(k==='title')piece.title=v||'Untitled';
    else if(k==='time'){const t=v.match(/^(\d+)\s*\/\s*(\d+)$/);if(t)piece.time=[+t[1],+t[2]];else piece.errors.push('Time signature should look like 4/4.');}
    else if(k==='tempo'){const n=parseInt(v,10);if(n>=20&&n<=300)piece.tempo=n;}
    else if(k==='key')piece.keyName=v||'C';
    else if(PART_ALIAS[k]){const p=PART_ALIAS[k];partLines[p]=(partLines[p]?partLines[p]+' | ':'')+v;}
  });
  const ks=keySig(piece.keyName);if(!ks){piece.errors.push(`Unknown key "${piece.keyName}", using C.`);piece.keyName='C';}
  piece.key=ks||{count:0,alt:{}};
  const beatsPerBar=piece.time[0]*4/piece.time[1];piece.beatsPerBar=beatsPerBar;
  // A second voice needs its first voice; if only the second is given, treat it as the first.
  ['RH','LH'].forEach(h=>{if(partLines[h+'2']&&!partLines[h]){piece.errors.push(`${h}2 needs an ${h} line too; reading it as ${h}.`);partLines[h]=partLines[h+'2'];delete partLines[h+'2'];}});
  const tokRe=/^(?:\[([^\]]+)\]|([A-Ga-g][#bn]?\d)|(r))\/([whqes])(\.?)(~?)$/;
  function pitch(tok){
    const pm=tok.match(/^([A-Ga-g])([#bn]?)(\d)$/);if(!pm)return null;
    const letter=pm[1].toUpperCase(),acc=pm[2],oct=+pm[3];
    const alter=acc==='#'?1:acc==='b'?-1:acc==='n'?0:(piece.key.alt[letter]||0);
    const show=acc==='n'?(piece.key.alt[letter]?'♮':''):acc==='#'&&piece.key.alt[letter]!==1?'♯':acc==='b'&&piece.key.alt[letter]!==-1?'♭':'';
    return {m:midi(letter,oct)+alter,letter,oct,show};
  }
  PARTS.forEach(part=>{
    if(!partLines[part])return;
    const measures=partLines[part].split('|').map(s=>s.trim()).filter(s=>s.length);
    piece.parts[part]=measures.map((ms,mi)=>{
      const notes=[];let start=0;let tup=null;// {n,ratio,notes:[]}
      tokenizeBar(ms).forEach(item=>{
        if(item.open){
          if(tup)piece.errors.push(`${part} bar ${mi+1}: tuplet inside a tuplet is not supported.`);
          tup={n:item.open,ratio:tupletRatio(item.open),notes:[]};return;
        }
        if(item.close){
          if(!tup){piece.errors.push(`${part} bar ${mi+1}: ")" without a tuplet.`);return;}
          if(tup.notes.length){tup.notes[0].tuplet.first=true;tup.notes[tup.notes.length-1].tuplet.last=true;}
          tup=null;return;
        }
        const tok=item.tok,t=tok.match(tokRe);
        if(!t){piece.errors.push(`${part} bar ${mi+1}: cannot read "${tok}".`);return;}
        let dur=DUR[t[4]];if(t[5])dur*=1.5;
        if(tup)dur*=tup.ratio;
        const n={start,dur,dot:!!t[5],kind:t[4],tie:!!t[6],rest:!!t[3],pitches:[]};
        if(tup){n.tuplet={n:tup.n,first:false,last:false};tup.notes.push(n);}
        if(t[1]){t[1].trim().split(/\s+/).forEach(p=>{const r=pitch(p);if(r)n.pitches.push(r);else piece.errors.push(`${part} bar ${mi+1}: bad pitch "${p}" in chord.`);});}
        else if(t[2]){const r=pitch(t[2]);if(r)n.pitches.push(r);}
        if(!n.rest&&!n.pitches.length){piece.errors.push(`${part} bar ${mi+1}: "${tok}" has no pitch.`);return;}
        n.pitches.sort((a,b)=>a.m-b.m);notes.push(n);start+=dur;
      });
      if(tup)piece.errors.push(`${part} bar ${mi+1}: tuplet is not closed with ")".`);
      if(Math.abs(start-beatsPerBar)>0.001&&notes.length)piece.errors.push(`${part} bar ${mi+1} adds up to ${+start.toFixed(3)} beats, expected ${beatsPerBar}.`);
      return {notes,beats:start};
    });
  });
  if(!piece.parts.RH&&!piece.parts.LH)piece.errors.push('Add at least one line starting with RH: or LH:.');
  const nBars=Math.max(0,...PARTS.map(p=>piece.parts[p]?piece.parts[p].length:0));
  PARTS.forEach(part=>{if(piece.parts[part])while(piece.parts[part].length<nBars)piece.parts[part].push({notes:[{start:0,dur:beatsPerBar,kind:'w',rest:true,pitches:[]}],beats:beatsPerBar});});
  piece.nBars=nBars;
  // ties: mark the following note of the same pitch as a continuation
  PARTS.forEach(part=>{const bars=piece.parts[part];if(!bars)return;
    const flat=[];bars.forEach((b,mi)=>b.notes.forEach((n,ni)=>flat.push({n,mi,ni})));
    flat.forEach((x,i)=>{if(x.n.tie&&flat[i+1]&&!flat[i+1].n.rest){const nx=flat[i+1].n;const same=x.n.pitches.every(p=>nx.pitches.some(pp=>pp.m===p.m));if(same)nx.tiedFrom=true;else piece.errors.push(`${part} bar ${x.mi+1}: tie goes to a different pitch, treated as separate notes.`);}});
  });
  // timeline of onsets, all voices merged; beats rounded so 1/3 + 2/3 lands on the same key as 1
  const map=new Map();
  PARTS.forEach(part=>{const bars=piece.parts[part];if(!bars)return;bars.forEach((b,mi)=>b.notes.forEach((n,ni)=>{const on=Math.round((mi*beatsPerBar+n.start)*1e6)/1e6;if(!map.has(on))map.set(on,[]);map.get(on).push({part,mi,ni,n});}));});
  piece.onsets=[...map.keys()].sort((a,b)=>a-b).map(on=>({beat:on,items:map.get(on)}));
  piece.totalBeats=nBars*beatsPerBar;
  piece.handOf=handOf;
  return piece;
}

globalThis.IvoryParse={parsePiece,keySig,midi,SEMI,DUR,PARTS,SHARPS,FLATS,handOf,tupletRatio};
})();
