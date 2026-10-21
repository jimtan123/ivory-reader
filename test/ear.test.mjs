import test from 'node:test';
import assert from 'node:assert/strict';
import '../src/ear.js';
const {INTERVALS,INT_SETS,RANGES,GAP_SETS,EAR_LO,EAR_HI,
  notePool,intervalsIn,weightOf,pickWeighted,rootRange,pickRoot,gapBucket}=globalThis.IvoryEar;

test('the interval table is indexed by semitones, unison to octave',()=>{
  assert.equal(INTERVALS.length,13);
  INTERVALS.forEach((iv,i)=>assert.equal(iv.s,i));
  assert.equal(INTERVALS[7].name,'Perfect 5th');
  assert.equal(INTERVALS[12].ab,'8ve');
});

test('every interval set holds real intervals, in order, with no repeats',()=>{
  Object.entries(INT_SETS).forEach(([key,set])=>{
    assert.ok(set.length,`${key} is empty`);
    assert.deepEqual(set,[...new Set(set)].sort((a,b)=>a-b),`${key} is unsorted or repeats`);
    set.forEach(s=>assert.ok(INTERVALS[s],`${key} names ${s}, which is not an interval`));
  });
  assert.deepEqual(intervalsIn('fifths').map(i=>i.ab),['1','P5','8ve']);
  assert.deepEqual(intervalsIn('nonsense').map(i=>i.s),INT_SETS.all);
});

test('note pools stay inside their range and skip black keys unless asked',()=>{
  assert.deepEqual(notePool('five','white'),[60,62,64,65,67]);
  assert.equal(notePool('oct','white').length,8);          // C4 up to C5
  assert.equal(notePool('oct','all').length,13);
  assert.equal(notePool('two','all').length,25);
  Object.keys(RANGES).forEach(key=>{
    const pool=notePool(key,'all');
    assert.equal(pool[0],RANGES[key].lo);
    assert.equal(pool[pool.length-1],RANGES[key].hi);
  });
});

test('weighting brings back recent misses and unasked items first',()=>{
  assert.equal(weightOf(null),2);                              // never asked
  assert.equal(weightOf({ok:0,n:0,recent:[]}),2);
  assert.equal(weightOf({ok:3,n:3,recent:[1,1,1]}),1);         // all right: the floor
  assert.equal(weightOf({ok:1,n:3,recent:[1,0,0]}),7);         // two misses
  assert.ok(weightOf({ok:1,n:2,recent:[1,0]})>weightOf({ok:2,n:2,recent:[1,1]}));
});

test('a weighted pick lands in each band in proportion to its weight',()=>{
  const items=['a','b'],weight=x=>x==='a'?1:3;                 // 1/4 and 3/4
  assert.equal(pickWeighted(items,weight,()=>0.1),'a');
  assert.equal(pickWeighted(items,weight,()=>0.3),'b');
  assert.equal(pickWeighted(items,weight,()=>0.99),'b');
  assert.equal(pickWeighted([],weight,()=>0.5),null);
  assert.equal(pickWeighted(['only'],weight,()=>1),'only');    // r never reaches 0
});

test('roots keep both notes of an interval on the keyboard, up or down',()=>{
  for(let s=0;s<=12;s++){
    const up=rootRange(s,'up'),down=rootRange(s,'down');
    assert.ok(up.hi+s<=EAR_HI,`up ${s} runs off the top`);
    assert.ok(down.lo-s>=EAR_LO,`down ${s} runs off the bottom`);
    assert.ok(up.lo<=up.hi&&down.lo<=down.hi,`no room for ${s}`);
    [0,0.5,0.999].forEach(r=>{
      const root=pickRoot(s,'down',()=>r);
      assert.ok(root-s>=EAR_LO&&root<=EAR_HI,`pickRoot(${s}) gave ${root}`);
    });
  }
  assert.deepEqual(rootRange(7,'harmonic'),rootRange(7,'up')); // anything but down reads as up
});

test('higher-or-lower gaps bucket by how hard they are to hear',()=>{
  assert.equal(gapBucket(1),'close');
  assert.equal(gapBucket(2),'close');
  assert.equal(gapBucket(3),'mid');
  assert.equal(gapBucket(5),'mid');
  assert.equal(gapBucket(6),'wide');
  assert.equal(gapBucket(12),'wide');
  Object.entries(GAP_SETS).forEach(([key,gaps])=>{
    gaps.forEach(g=>assert.ok(g>=1&&g<=12,`${key} holds a ${g} semitone gap`));
    if(key!=='mixed')gaps.forEach(g=>assert.equal(gapBucket(g),key,`${key} holds ${g}`));
  });
});

const {TRICKS,LESSONS,ROUND,starsFor,nextLesson}=globalThis.IvoryEar;

test('each song trick opens on the interval it is filed under',()=>{
  Object.entries(TRICKS).forEach(([s,t])=>{
    const n=t.notes,i=t.at!=null?t.at+1:n.findIndex((x,k)=>k>0&&x!==n[k-1]);
    assert.ok(i>0,`${t.song} never moves`);
    assert.equal(n[i]-n[i-1],+s,`${t.song} opens on ${n[i]-n[i-1]}, filed under ${s}`);
  });
});

test('lessons have unique ids and ask something real',()=>{
  assert.equal(new Set(LESSONS.map(l=>l.id)).size,LESSONS.length);
  LESSONS.filter(l=>l.kind!=='quality').forEach(l=>{
    const items=l.kind==='note'?l.notes:l.ints;
    assert.ok(items.length>=2,`${l.id} has fewer than two answers`);
    assert.deepEqual(items,[...new Set(items)].sort((a,b)=>a-b),`${l.id} is unsorted or repeats`);
    if(l.kind==='interval')items.forEach(s=>assert.ok(s>=1&&s<=12,`${l.id} asks ${s}`));
    else items.forEach(m=>assert.ok(m>=60&&m<=72,`${l.id} leaves the middle octave`));
  });
});

test('note lessons only ever add notes, never drop one',()=>{
  const notes=LESSONS.filter(l=>l.kind==='note');
  for(let i=1;i<notes.length;i++)
    notes[i-1].notes.forEach(m=>assert.ok(notes[i].notes.includes(m),`${notes[i].id} drops ${m}`));
});

test('stars: 18 of 20 is three, 15 two, 12 one, less is none',()=>{
  assert.equal(ROUND,20);
  assert.equal(starsFor(20,20),3);assert.equal(starsFor(18,20),3);
  assert.equal(starsFor(17,20),2);assert.equal(starsFor(15,20),2);
  assert.equal(starsFor(12,20),1);assert.equal(starsFor(11,20),0);
  assert.equal(starsFor(0,0),0);
});

test('the suggested lesson is the first without two stars',()=>{
  assert.equal(nextLesson({}),0);
  assert.equal(nextLesson({[LESSONS[0].id]:3,[LESSONS[1].id]:1}),1);
  const all=Object.fromEntries(LESSONS.map(l=>[l.id,2]));
  assert.equal(nextLesson(all),LESSONS.length-1);
});

const {CHORDS,SCALES,SHAPE_ROOTS,shapesOf}=globalThis.IvoryEar;

test('chords and scales start on the root, climb, and scales end on the octave',()=>{
  [...Object.values(CHORDS),...Object.values(SCALES)].forEach(c=>{
    assert.equal(c.notes[0],0,`${c.ab} does not start on the root`);
    c.notes.forEach((n,i)=>i&&assert.ok(n>c.notes[i-1],`${c.ab} does not climb`));
  });
  Object.values(SCALES).forEach(c=>assert.equal(c.notes.at(-1),12,`${c.ab} does not end on the octave`));
  assert.deepEqual(CHORDS.maj.notes,[0,4,7]);assert.deepEqual(CHORDS.min.notes,[0,3,7]);
});

test('chord and scale lessons only offer shapes that exist, with no repeats',()=>{
  const q=LESSONS.filter(l=>l.kind==='quality');
  assert.ok(q.some(l=>l.group==='chord')&&q.some(l=>l.group==='scale'));
  q.forEach(l=>{
    assert.ok(l.opts.length>=2,`${l.id} has one answer`);
    assert.equal(new Set(l.opts).size,l.opts.length,`${l.id} repeats an answer`);
    l.opts.forEach(k=>assert.ok(shapesOf(l)[k],`${l.id} offers ${k}, which is not in its table`));
    if(l.group==='chord')assert.ok(['block','broken','mixed'].includes(l.sound),`${l.id} has no sound`);
  });
});

test('the highest root keeps every chord and scale under C6',()=>{
  const top=(t,r)=>Math.max(...Object.values(t).map(c=>c.notes.at(-1)))+r.hi;
  assert.ok(top(CHORDS,SHAPE_ROOTS.chord)<=84);
  assert.ok(top(SCALES,SHAPE_ROOTS.scale)<=84);
});

const {PROGS,progVoicing}=globalThis.IvoryEar;

test('progressions are built from real chords on real scale degrees',()=>{
  Object.entries(PROGS).forEach(([k,p])=>{
    assert.ok(p.chords.length>=3,`${k} is too short`);
    p.chords.forEach(([r,q])=>{
      assert.ok(r>=0&&r<12,`${k} has a root of ${r}`);
      assert.ok(CHORDS[q],`${k} uses ${q}, which is not a chord`);
    });
  });
  // No two progressions in the same lesson may sound identical.
  const sig=k=>PROGS[k].chords.map(c=>c.join('')).join('|');
  LESSONS.filter(l=>l.group==='prog').forEach(l=>
    assert.equal(new Set(l.opts.map(sig)).size,l.opts.length,`${l.id} has two identical progressions`));
});

test('a voiced progression keeps the bass below the hand and the hand in one octave',()=>{
  const v=progVoicing(60,PROGS.pop);
  assert.deepEqual(v.map(c=>c.bass),[48,55,57,53]);          // C G A F
  assert.deepEqual(v[0].upper,[60,64,67]);                    // C E G
  assert.deepEqual(v[1].upper,[62,67,71]);                    // G chord folded: D G B
  Object.values(PROGS).forEach(p=>progVoicing(SHAPE_ROOTS.prog.hi,p).forEach(c=>{
    c.upper.forEach(m=>assert.ok(m>c.bass&&m<SHAPE_ROOTS.prog.hi+12&&m<=84));
  }));
});
