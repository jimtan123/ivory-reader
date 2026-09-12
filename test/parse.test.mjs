import test from 'node:test';
import assert from 'node:assert/strict';
import '../src/parse.js';
const {parsePiece}=globalThis.IvoryParse;

const head='title: T\ntime: 4/4\nkey: C\ntempo: 80\n';

test('plain bars parse with no errors and correct beat sums',()=>{
  const p=parsePiece(head+'RH: E4/q E4/q F4/q G4/q | G4/w\nLH: C3/h G3/h | C3/w');
  assert.deepEqual(p.errors,[]);
  assert.equal(p.nBars,2);
  assert.equal(p.parts.RH[0].beats,4);
  assert.equal(p.totalBeats,8);
});

test('a tuplet of three eighths fills one beat',()=>{
  const p=parsePiece(head+'RH: C4/q 3(C4/e D4/e E4/e) E4/h');
  assert.deepEqual(p.errors,[]);
  const n=p.parts.RH[0].notes;
  assert.equal(n.length,5);
  assert.ok(Math.abs(n[1].dur-1/3)<1e-9);
  assert.ok(Math.abs(n[2].start-(1+1/3))<1e-9);
  assert.ok(Math.abs(n[4].start-2)<1e-9);
  assert.equal(n[1].tuplet.n,3);
  assert.equal(n[1].tuplet.first,true);
  assert.equal(n[3].tuplet.last,true);
});

test('a tuplet may hold rests and chords',()=>{
  const p=parsePiece(head+'LH: 3(C3/e r/e [E3 G3]/e) C3/h. ');
  assert.deepEqual(p.errors,[]);
  assert.ok(Math.abs(p.parts.LH[0].beats-4)<1e-9);
});

test('an unclosed tuplet is reported, not silently swallowed',()=>{
  const p=parsePiece(head+'RH: 3(C4/e D4/e E4/e C4/h.');
  assert.ok(p.errors.some(e=>/tuplet/i.test(e)),p.errors.join('|'));
});

test('a second voice sits on the same hand and shares the timeline',()=>{
  const p=parsePiece(head+'LH: r/q E3/q G3/q C4/q\nLH2: C2/w~ | C2/w\nLH: r/q E3/q G3/q C4/q');
  assert.deepEqual(p.errors,[]);
  assert.ok(p.parts.LH2,'LH2 part exists');
  assert.equal(p.parts.LH2.length,2);
  assert.equal(p.parts.LH2[1].notes[0].tiedFrom,true);
  const first=p.onsets[0];
  assert.equal(first.beat,0);
  const parts=first.items.map(i=>i.part).sort();
  assert.deepEqual(parts,['LH','LH2']);
  assert.equal(p.handOf('LH2'),'LH');
  assert.equal(p.handOf('RH'),'RH');
});

test('a second voice without its first voice is an error',()=>{
  const p=parsePiece(head+'RH2: C4/w');
  assert.ok(p.errors.some(e=>/RH2/.test(e)&&/RH/.test(e)),p.errors.join('|'));
});

test('a chord written with spaces inside the brackets parses as one note',()=>{
  const p=parsePiece(head+'RH: [C4 E4 G4]/w');
  assert.deepEqual(p.errors,[]);
  assert.equal(p.parts.RH[0].notes.length,1);
  assert.deepEqual(p.parts.RH[0].notes[0].pitches.map(x=>x.m),[60,64,67]);
});
