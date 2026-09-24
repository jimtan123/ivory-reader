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
