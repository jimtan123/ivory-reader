import test from 'node:test';
import assert from 'node:assert/strict';
import '../src/playalong.js';
const {Scorer}=globalThis.IvoryPlayAlong;

// onsets: beat + the pitches the player must hit there
const mk=(onsets,tol=0.34)=>new Scorer(onsets,{tol});
const C4=60,D4=62,E4=64;

test('a key pressed inside the window is a hit',()=>{
  const s=mk([{beat:0,pitches:[C4]}]);
  assert.equal(s.press(C4,0.2),'hit');
  assert.deepEqual(s.summary(),{total:1,hit:1,missed:0,wrong:0});
});

test('the same key pressed again after its hit is wrong',()=>{
  const s=mk([{beat:0,pitches:[C4]}]);
  s.press(C4,0);
  assert.equal(s.press(C4,0.1),'wrong');
  assert.equal(s.summary().wrong,1);
});

test('a key pressed outside every window is wrong',()=>{
  const s=mk([{beat:2,pitches:[C4]}]);
  assert.equal(s.press(C4,0.5),'wrong');
});

test('an onset whose window closes with keys unplayed counts them as missed',()=>{
  const s=mk([{beat:0,pitches:[C4,E4]}]);
  s.press(C4,0.1);
  s.update(0.2);
  assert.equal(s.summary().missed,0);
  s.update(1);
  assert.deepEqual(s.summary(),{total:2,hit:1,missed:1,wrong:0});
});

test('a repeated pitch goes to the earliest open onset first',()=>{
  const s=mk([{beat:0,pitches:[C4]},{beat:0.5,pitches:[C4]}]);
  assert.equal(s.press(C4,0.3),'hit');
  s.update(0.3);
  assert.equal(s.remaining(0.3).map(o=>o.beat).join(),'0.5');
  assert.equal(s.press(C4,0.5),'hit');
  s.update(2);
  assert.deepEqual(s.summary(),{total:2,hit:2,missed:0,wrong:0});
});

test('next tells which keys to light: the earliest onset still open or upcoming',()=>{
  const s=mk([{beat:0,pitches:[C4]},{beat:1,pitches:[D4]}]);
  assert.deepEqual(s.next(0).pitches,[C4]);
  s.press(C4,0);
  assert.deepEqual(s.next(0.1).pitches,[D4]);
  s.update(3);
  assert.equal(s.next(3),null);
});

test('done once every onset is closed',()=>{
  const s=mk([{beat:0,pitches:[C4]},{beat:1,pitches:[D4]}]);
  s.update(1.2);
  assert.equal(s.done(),false);
  s.update(1.4);
  assert.equal(s.done(),true);
});

test('results mark each onset hit, part or miss, with its timing',()=>{
  const s=mk([{beat:0,pitches:[C4]},{beat:1,pitches:[C4,E4]},{beat:2,pitches:[D4]}]);
  s.press(C4,0.1);s.press(C4,1.2);s.update(3);
  const r=s.results();
  assert.deepEqual(r.map(x=>x.status),['hit','part','miss']);
  assert.deepEqual(r[1].heard,[C4]);
  assert.ok(Math.abs(r[0].offset-0.1)<1e-9);
  assert.equal(r[2].offset,null);
});

test('review grades the run and names the bars that went worst',()=>{
  const {review}=globalThis.IvoryPlayAlong;
  // 4/4, eight onsets over two bars; bar 2 is where it goes wrong
  const s=mk([0,1,2,3,4,5,6,7].map(b=>({beat:b,pitches:[C4]})));
  [0,1,2,3,4].forEach(b=>s.press(C4,b+0.2));   // all a little late
  s.update(9);
  const r=review(s,4);
  assert.equal(r.pct,63);
  assert.equal(r.grade,'Getting there');
  assert.equal(r.tendency,'late');
  assert.deepEqual(r.weakBars,[2]);
});

test('review calls steady timing steady and a clean run excellent',()=>{
  const {review}=globalThis.IvoryPlayAlong;
  const s=mk([0,1,2,3].map(b=>({beat:b,pitches:[C4]})));
  [0.05,0.95,2.02,3].forEach(b=>s.press(C4,b));
  s.update(5);
  const r=review(s,4);
  assert.equal(r.pct,100);assert.equal(r.grade,'Excellent');assert.equal(r.tendency,'steady');assert.deepEqual(r.weakBars,[]);
});
