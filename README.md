# Ivory Reader

A piano trainer for beginners: read notes, learn where your hands go, train your
ear, practise with a metronome. It installs on a phone or tablet and works with
no signal.

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
  playing the note on a MIDI piano, or **Listen with mic**, which answers by
  playing the note on any real piano, one note at a time, in a quiet room.
  Notes you get wrong come back more often.
- **Hand position** — C, Middle C and G positions with a finger number on every
  key, a posture checklist, and a drill that asks which finger plays a note.
- **Ear training** — three listening drills, no staff involved. **Higher or
  lower** plays two notes and asks which way the second one went, with a gap you
  can narrow to a single semitone. **Name the interval** plays two notes, up,
  down or together, and you pick the interval from a set that starts at fifths
  and octaves. **Name the note** plays a reference C and then a mystery note,
  which you find on the keyboard, over five keys, one octave or two, white keys
  or chromatic. A wrong answer is revealed and played again. Whatever you keep
  missing is asked more often, the same way the reading flashcards work.
- **Practice** — pieces on a grand staff. **Listen** plays at the metronome
  tempo with a count-in. **Play along** clicks through the piece at that tempo
  while you play and scores each note: on time within a third of a beat, missed,
  or wrong; with one hand selected the app plays the other. With **Use mic** on,
  Play along is silent instead — no click and no backing hand, since the mic
  would hear them — and listens to your own piano, both hands and chords
  included: the count-in, the beat lights and the moving line keep time. It
  listens for the notes the piece expects next, so by mic a wrong key is not
  called wrong; it shows up as the right note missed. When the run ends, a
  results card takes the keyboard's place: the share of notes on time, a grade,
  whether you tend to rush or drag, the bars with the most misses, and your
  best score for the piece; the notes on the sheet turn green (on time) or red
  (missed). Progress keeps each piece's best Play along score. **Wait mode** lights
  the next keys and waits until you play them, so you set the pace; it can also
  be graded with **Use mic** on a real piano, one note at a time — a
  chord (both hands landing together) can't be told apart by ear-only pitch
  detection, so those steps are left for a tap or a MIDI piano instead. A
  **moving line** rides the beat across the score in Listen and Play along; it
  can be turned off under **Options**, and Wait mode has no clock so it has no
  line. The controls sit in one row, with the set-once settings (next keys,
  count-in, moving line) under **Options**, so on a landscape tablet the score
  keeps both staves in view; if a line of music still doesn't fit, the score is
  drawn smaller, down to 70%, rather than cutting off the left hand.
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
never `index.html` directly. `src/parse.js` (the notation parser),
`src/playalong.js` (the play-along scorer), `src/piano.js` (the sampled piano)
and `src/ear.js` (the ear drills' pools and weighting) are plain scripts that the
build inlines ahead of `src/script.html`; they have no DOM dependency so the
tests can load them directly:

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

Both checks run on every pull request (`.github/workflows/ci.yml`): the tests,
and a rebuild that fails if `index.html` no longer matches `src/`, which is how
a commit that edits one without the other gets caught.
