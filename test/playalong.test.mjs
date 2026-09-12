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
