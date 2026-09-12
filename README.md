# Ivory Reader

A piano trainer for beginners: read notes, learn where your hands go, practise
with a metronome. It installs on a phone or tablet and works with no signal.

**Live app:** https://jimtan123.github.io/ivory-reader/

## Install it

**iPhone or iPad** — open the link in **Safari** (Chrome on iPhone cannot
install web apps), tap **Share**, then **Add to Home Screen**.

**Android** — open the link in **Chrome**, then tap **Install** in the app's
header, or use the three-dots menu and choose **Install app**.

Once installed it opens without browser bars and runs offline. Your progress
and saved pieces live in that browser's storage, so they stay on the device and
are lost if you clear the browser's data for this site.

## What it does

- **Read notes** — flashcards on a treble or bass staff. Answer by tapping the
  on-screen keyboard, tapping a note name, pressing A–G on a computer keyboard,
  or playing the note on a MIDI piano. Notes you get wrong come back more often.
- **Hand position** — C, Middle C and G positions with a finger number on every
  key, a posture checklist, and a drill that asks which finger plays a note.
- **Practice** — pieces on a grand staff. **Listen** plays at the metronome
  tempo with a count-in. **Play along** clicks through the piece at that tempo
  while you play and scores each note: on time within a third of a beat, missed,
  or wrong; with one hand selected the app plays the other. **Wait mode** lights
  the next keys and waits until you play them, so you set the pace. A **moving
  line** rides the beat across the score in Listen and Play along; its checkbox
  turns it off, and Wait mode has no clock so it has no line.
- **Progress** — accuracy per note, speed, and a run history per piece.
- **Metronome and MIDI** in the bar along the bottom.
- **Piano sound** is a sampled grand: the [Salamander Grand Piano](https://github.com/sfzinstruments/SalamanderGrandPiano)
  by Alexander Holm, CC BY 3.0. `audio/` holds 22 notes (A1 to C7, every minor
  third, trimmed to 6 s, mono 64 kbps, about 1 MB); other pitches play the
  nearest sample shifted by at most a semitone. The site fetches them and the
  service worker caches them; the claude.ai copy has them embedded as base64.
  Until they are decoded, or if they fail to load, the old synthesized tone plays.

MIDI uses the Web MIDI API: Chrome or Edge on a computer or Android. Safari and
iOS have no Web MIDI, so on an iPhone or iPad the on-screen keyboard is the input.

## Pieces

Pieces are written in a short text notation. Open **Practice → Add a piece**:

```
title: Ode to Joy
time: 4/4
key: C
tempo: 72
RH: E4/q E4/q F4/q G4/q | G4/q F4/q E4/q D4/q
LH: C3/h G3/h | C3/h G3/h
```

Pitch is a letter, an optional `#`, `b` or `n`, then the octave, where middle C
is `C4`. Length is `w` `h` `q` `e` `s`, dotted with `.`. A rest is `r/q`, a
chord is `[C4 E4 G4]/h`, a tie is `C4/h~`, and `|` separates bars.

A tuplet is the count, then the notes in round brackets: `3(C4/e D4/e E4/e)`
is three eighths in the time of two (`5(...)` is five in the time of four).
A second voice on the same staff, such as a note held under a moving line, goes
on its own line, `RH2:` or `LH2:`, with the same number of bars and rests where
it is silent. Lines starting with `#` are ignored, so a piece can carry notes
to itself.

## The two copies

There is a second copy of this app published on claude.ai. That one can
**transcribe a photo of sheet music** into the notation above, because it runs
inside Claude's own page and can ask Claude to read the image. A static site
like this one has no server behind it and cannot do that.

Each copy stores its own pieces. To move a piece across, press **Copy notation**
in one, then paste into the other's Notation box and press **Load and save**.

## Building

`src/` holds the source; both copies are generated from it, so edit `src/` and
never `index.html` directly. `src/parse.js` (the notation parser) and
`src/playalong.js` (the play-along scorer) are plain scripts that the build
inlines ahead of `src/script.html`; they have no DOM dependency so the tests can
load them directly:

```sh
node --test test/*.test.mjs
```

```sh
./build.sh                      # writes index.html and dist/artifact.html
./build.sh /path/to/artifact.html
```

- `index.html` — this site: self-hosted fonts, web app manifest, service worker.
- `dist/artifact.html` — the claude.ai copy: fonts from Google's CDN, no service
  worker, and no surrounding `<html>` document, which that platform supplies.

When you change any cached file, bump `VERSION` in `sw.js` so installed copies
pick the new one up.
