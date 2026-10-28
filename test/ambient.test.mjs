import assert from 'node:assert/strict';
import { test } from 'node:test';
import xterm from '@xterm/headless';
import { AmbientMood, ambientBand, ambientEnabled, bandHit, bandRows, BAND_ROWS, blinking, looksBusy, penguinFrame, penguinPose, readSignals } from '../dist/ambient.js';
import { TITLE_FOR, stories, storyBeat, storyLength } from '../dist/stories.js';
import { penguinPoses, PENGUIN_HEIGHT } from '../dist/penguin.js';
import { reactionDefinitions } from '../dist/reactions.js';
import { InputReader, leftClick } from '../dist/mouse.js';
import { SessionTerminal } from '../dist/session-terminal.js';

const plain = (line) => line.replace(/\x1b\[[0-9;]*m/g, '');
const write = (terminal, data) => new Promise((resolve) => terminal.write(data, resolve));
const calm = { busy: false };
const busy = { busy: true };

test('screen markers of Codex, Claude Code and Gemini CLI are recognized', () => {
  assert.ok(looksBusy('• Working (12s • Esc to interrupt)'));
  assert.ok(looksBusy('✻ Pondering… (esc to interrupt)'));
  assert.ok(looksBusy('⠋ Thinking (esc to cancel, 4s)'));
  assert.ok(!looksBusy('> écris une fonction escape'));
  assert.equal(readSignals('✻ Pondering… (esc to interrupt)', false).busy, false, 'a marker without fresh output is stale');
  assert.ok(readSignals(' Do you want to proceed?\n ❯ 1. Yes', false).asking);
  assert.ok(readSignals('Would you like to run the following command?', false).asking);
  assert.ok(readSignals('  ⎿  Interrupted by user', false).interrupted);
  assert.ok(readSignals('API Error: 529 overloaded', false).failed);
  assert.deepEqual(readSignals('> salut', true), { busy: false, asking: false, interrupted: false, failed: false });
  assert.equal(ambientEnabled({}), true);
  assert.equal(ambientEnabled({ ICECREW_AMBIENT: '0' }), false);
  assert.throws(() => ambientEnabled({ ICECREW_AMBIENT: 'yes' }));
  assert.equal(BAND_ROWS, 10, 'the penguin at its true size, never shrunk');
  assert.equal(bandRows(80, 40), BAND_ROWS);
  assert.equal(bandRows(80, 18), BAND_ROWS);
  assert.equal(bandRows(80, 17), 0, 'the AI keeps at least 8 lines');
  assert.equal(bandRows(30, 40), 0);
});

test('the penguin reacts on its own: work, coffee, snail, finish and chill', () => {
  const mood = new AmbientMood(0, 1);
  assert.equal(mood.update(0, calm).scene, 'idle');
  assert.equal(mood.update(1000, busy).scene, 'idle', 'a short burst is not work');
  assert.equal(mood.update(2600, busy).scene, 'working');
  assert.equal(mood.update(30_000, busy).work, 29);
  assert.equal(mood.update(47_000, busy).reaction?.name, 'coffee');
  assert.equal(mood.update(60_000, busy).reaction, undefined);
  assert.equal(mood.update(152_000, busy).reaction?.name, 'too_slow');
  mood.update(170_000, calm);
  const done = mood.update(173_000, calm);
  assert.equal(done.scene, 'idle');
  assert.equal(done.finished, true);
  assert.equal(done.work, 169);
  assert.deepEqual([done.reaction?.name, done.reaction?.intensity], ['reward', 2]);
  assert.equal(mood.update(474_000, calm).scene, 'quiet');
  assert.equal(mood.update(474_100, calm).reaction?.name, 'chill');
  const woken = mood.update(480_000, { busy: false, typed: true });
  assert.deepEqual([woken.scene, woken.reaction?.name], ['idle', 'boop'], 'typing after a long pause wakes the penguin');
});

test('short work gets no reward, quick wins are easy, and interruptions get a facepalm', () => {
  const short = new AmbientMood(0, 7);
  short.update(0, busy); short.update(2000, busy); short.update(5000, calm);
  assert.equal(short.update(8500, calm).reaction, undefined);
  let story;
  for (let now = 8500; now < 60_000 && !story; now += 500) story = short.update(now, calm).story;
  assert.ok(stories.some(({ id }) => id === story?.id), 'calm again, it tells an episode');

  const quick = new AmbientMood(0, 3);
  quick.update(0, busy); quick.update(2000, busy); quick.update(25_000, calm);
  assert.equal(quick.update(28_000, calm).reaction?.name, 'ez');

  const cut = new AmbientMood(0, 3);
  cut.update(0, busy); cut.update(2000, busy);
  assert.equal(cut.update(30_000, { busy: false, interrupted: true }).reaction?.name, 'facepalm');
  assert.equal(cut.update(40_000, { busy: false, interrupted: true }).reaction, undefined, 'no reward after an interruption');
});

test('a permission prompt is suspense, not the end of the work', () => {
  const mood = new AmbientMood(0, 5);
  mood.update(0, busy); mood.update(2000, busy);
  const asking = mood.update(20_000, { busy: false, asking: true });
  assert.deepEqual([asking.scene, asking.asking, asking.reaction?.name], ['working', true, 'sus']);
  assert.equal(mood.update(40_000, { busy: false, asking: true }).scene, 'working');
});

test('band draws the penguin, then every reaction beside it, at the requested width', () => {
  const frames = new Set();
  const base = { scene: 'idle', seconds: 1, clock: 5, work: 75, drawn: 1, visit: 0 };
  const views = [
    { ...base, drawn: 0.4, clock: 1 }, base, { ...base, scene: 'working' }, { ...base, scene: 'quiet' },
    { ...base, story: { id: 'peche', seconds: 12 } }, { ...base, asking: true },
    ...Object.keys(reactionDefinitions).map((name) => ({ ...base, reaction: { name, intensity: 2, seconds: 1.3 } })),
  ];
  for (const view of views) {
    for (const columns of [40, 80, 132]) {
      const lines = ambientBand(view, columns);
      assert.equal(lines.length, BAND_ROWS);
      for (const line of lines) assert.equal([...plain(line)].length, columns);
      if (view.drawn === 1) assert.match(plain(lines[3]), /[▀▄]{10}/, 'the pixel penguin');
      assert.doesNotMatch(plain(lines.join('')), /KK LAB|IA/, 'only the mascot, no brand or status text');
      if (view.scene === 'working') assert.doesNotMatch(plain(lines.join('')), /[{}()=;<>[\]]/, 'no code characters while the AI works');
      if (view.reaction) {
        const { title, messages } = reactionDefinitions[view.reaction.name];
        const caption = `${title.toUpperCase()} · ${messages[1]}`, line = plain(lines[1]);
        if (columns >= 80) assert.ok(line.includes(caption), caption);
        else assert.ok(line.includes(caption.slice(0, 10)), caption);
      }
      // Scenes are pixel art: only the caption is text.
      lines.forEach((line, i) => { if (i !== 1) assert.match(plain(line), /^▀*$/, `line ${i}`); });
      frames.add(lines.join('\n'));
    }
  }
  assert.equal(frames.size, views.length * 3);
  // The night spreads from the left, then the penguin draws itself over it.
  const cells = (view) => plain(ambientBand(view, 80).join('')).split(/[▀▄]/).length;
  assert.ok(cells({ ...base, drawn: 0, clock: 0.3 }) < cells({ ...base, drawn: 0, clock: 1 }), 'the decor spreads at startup');
  assert.notEqual(ambientBand({ ...base, drawn: 0.3 }, 80).join(''), ambientBand(base, 80).join(''), 'the penguin draws itself');
});

test('the penguin takes the pose of each state from its sheet', () => {
  const base = { scene: 'idle', seconds: 1, clock: 5, work: 0, drawn: 1, visit: 0 };
  assert.equal(penguinPose(base), 'neutral');
  const blinks = [];
  for (let t = 0; t < 60; t += 0.02) if (blinking(t) && !blinking(t - 0.02)) blinks.push(t);
  assert.ok(blinks.length >= 12, 'it blinks');
  const gaps = new Set(blinks.slice(1).map((t, i) => Math.round((t - blinks[i]) * 10)));
  assert.ok(gaps.size >= 5, 'at uneven times, like real eyes');
  assert.equal(penguinPose({ ...base, clock: blinks[3] + 0.05 }), 'closed');
  assert.equal(penguinPose({ ...base, scene: 'working', seconds: 0.5 }), 'sliding');
  assert.equal(penguinPose({ ...base, scene: 'working', seconds: 5 }), 'focused');
  assert.equal(penguinPose({ ...base, scene: 'quiet', seconds: 30 }), 'fishing');
  assert.equal(penguinPose({ ...base, scene: 'quiet', seconds: 300 }), 'asleep');
  assert.equal(penguinPose({ ...base, finished: true }), 'happy');
  assert.ok(['left', 'right'].includes(penguinPose({ ...base, asking: true })));
  const idle = new Set(Array.from({ length: 30 }, (_, i) => penguinPose({ ...base, clock: 6.5 + i * 6 })));
  assert.ok(idle.size >= 3, 'idle, it looks around');
  const reaction = (name) => penguinPose({ ...base, reaction: { name, intensity: 1, seconds: 1 } });
  assert.deepEqual(['chill', 'facepalm', 'boop', 'reward', 'rip'].map(reaction), ['shades', 'facepalm', 'surprised', 'happy', 'closed']);
  const later = (name) => penguinPose({ ...base, reaction: { name, intensity: 1, seconds: 3 } });
  assert.deepEqual(['reward', 'boop', 'too_slow'].map(later), ['hero', 'innocent', 'sweating'], 'poses from the second sheet');
});

test('every pose stands on the same feet, centered on the same belly', () => {
  assert.ok(Object.keys(penguinPoses).length >= 28);
  for (const [name, rows] of Object.entries(penguinPoses)) {
    assert.equal(rows.length, PENGUIN_HEIGHT, name);
    assert.equal(rows[0].length % 2, 1, `${name}: an odd width keeps the center column`);
    assert.ok(rows.every((row) => row.length === rows[0].length), name);
    assert.match(rows.at(-1), /K/, `${name}: feet on the bottom row`);
  }
});

test('the third sheet\'s hobbies keep the penguin at its size, each with its own pose', () => {
  const base = { scene: 'idle', seconds: 20, clock: 20, work: 0, drawn: 1, visit: 0 };
  const hobbies = ['read', 'feast', 'tinker', 'build', 'paint', 'experiment', 'game', 'gift', 'photo', 'spy', 'guitar', 'love', 'idea', 'king', 'garden', 'balloon'];
  const poses = hobbies.map((name) => penguinPose({ ...base, doing: { name, seconds: 3 } }));
  assert.equal(new Set(poses).size, hobbies.length);
  const headTop = (rows) => rows.findIndex((row) => /KKKKK/.test(row));
  for (const pose of ['reading', 'gift', 'love', 'idea', 'balloon', 'photographing']) assert.equal(headTop(penguinPoses[pose]), headTop(penguinPoses.neutral), pose);
  // The bulb lights up once it has thought.
  const band = (seconds) => ambientBand({ ...base, doing: { name: 'idea', seconds } }, 80).join('');
  assert.equal(penguinPose({ ...base, doing: { name: 'idea', seconds: 0.5 } }), 'thinking');
  assert.notEqual(band(0.5), band(2));
});

test('left alone, it tells its episodes, never the same twice in a row; too narrow, it keeps busy', () => {
  const mood = new AmbientMood(0, 11);
  const told = [], done = [];
  for (let now = 0; now < 1_800_000; now += 250) {
    // Someone types now and then: the penguin never drifts into its long pause.
    const view = mood.update(now, now % 240_000 === 0 ? { busy: false, typed: true } : calm);
    if (view.story && view.story.id !== told.at(-1)) told.push(view.story.id);
    if (view.doing && view.doing.name !== done.at(-1)) done.push(view.doing.name);
  }
  assert.equal(told[0], 'amis', 'first, the friends are introduced');
  assert.ok(!told.slice(1).some((id) => id.startsWith('amis')), 'once a session');
  assert.ok(new Set(told).size >= 12, told.join(' '));
  told.slice(1).forEach((id, i) => assert.notEqual(id, told[i], 'never the same episode twice in a row'));
  assert.ok(done.every((name) => ['look', 'wave', 'stroll'].includes(name)), `between episodes, only small things: ${done.join(' ')}`);
  const narrow = new AmbientMood(0, 11);
  narrow.resize(48);
  const hobbies = [];
  for (let now = 0; now < 240_000; now += 250) {
    const view = narrow.update(now, calm);
    assert.equal(view.story, undefined, 'too few episodes fit: none is told');
    if (view.doing && view.doing.name !== hobbies.at(-1)) hobbies.push(view.doing.name);
  }
  assert.ok(new Set(hobbies).size >= 4, hobbies.join(' '));
  const base = { scene: 'idle', seconds: 20, clock: 20, work: 0, drawn: 1, visit: 0 };
  const frames = (name, length) => Array.from({ length: 24 }, (_, i) => penguinFrame({ ...base, doing: { name, seconds: (i * length) / 24 } }));
  assert.deepEqual([...new Set(frames('juggle', 3).map((frame) => frame.pose))].sort(), ['juggling', 'juggling2']);
  assert.ok(frames('dance', 3).some((frame) => frame.dy < 0), 'it hops while it dances');
  assert.ok(frames('shiver', 3).some((frame) => frame.dx !== 0), 'it shivers');
  const working = new AmbientMood(0, 4);
  let thinking = false;
  for (let now = 0; now < 60_000 && !thinking; now += 500) thinking = working.update(now, busy).doing?.name === 'think';
  assert.ok(thinking, 'a long piece of work makes it think');
});

test('now and then it jumps into the sea in its swim ring, floats, and swims back', () => {
  const base = { scene: 'idle', seconds: 20, clock: 20, work: 0, drawn: 1, visit: 0 };
  const at = (seconds) => penguinFrame({ ...base, doing: { name: 'swim', seconds } });
  const frames = Array.from({ length: 170 }, (_, i) => at(i / 10));
  assert.ok(frames.every((frame) => frame.ring), 'it wears its ring all along');
  assert.ok(frames.some((frame) => frame.dy < 0), 'it jumps');
  assert.ok(frames.some((frame) => frame.water && frame.pose === 'shades'), 'it takes it easy in the water');
  assert.ok(Math.max(...frames.map((frame) => frame.dx)) >= 30, 'out at sea');
  // Never more than two pixels from one tenth of a second to the next, but on the jumps.
  frames.slice(1).forEach((frame, i) => assert.ok(Math.abs(frame.dx - frames[i].dx) <= 4, `smooth at ${i / 10}s`));
  assert.deepEqual([frames.at(-1).dx, frames.at(-1).dy, Boolean(frames.at(-1).water)], [0, 0, false], 'back home, dry');
  // Under water, only its head and its ring show.
  const floating = ambientBand({ ...base, doing: { name: 'swim', seconds: 8 } }, 90).join('');
  const home = ambientBand({ ...base, doing: { name: 'swim', seconds: 0 } }, 90).join('');
  assert.notEqual(floating, home);

  // The AI starts working: it swims home first instead of vanishing.
  let mood, now, view;
  for (let seed = 1; seed < 20 && view?.story?.id !== 'baignade'; seed++) {
    mood = new AmbientMood(0, seed);
    for (now = 0; now < 290_000; now += 250) if ((view = mood.update(now, calm)).story?.id === 'baignade') break;
  }
  assert.equal(view.story?.id, 'baignade', 'it goes swimming by itself, in its episode');
  now += 6000;
  mood.update(now, calm);
  mood.poke('sea', now);
  view = mood.update(now, calm);
  assert.deepEqual([view.doing?.name, view.doing?.petted], ['swim', 0], 'a click out at sea pets it, and it swims on');
  assert.ok(Math.abs(penguinFrame(view).dx) >= 30, 'still out at sea, no jump home');
  for (let t = now; t < now + 2000; t += 250) view = mood.update(t, busy);
  assert.equal(view.doing?.name, 'swim', 'still on its way home');
  assert.ok(view.doing.seconds >= 13, 'heading home straight away');
  // Too narrow for the open sea: no swim.
  const narrow = new AmbientMood(0, 3);
  narrow.resize(50);
  for (let t = 0; t < 600_000; t += 250) { const v = narrow.update(t, calm); assert.notEqual(v.doing?.name, 'swim'); assert.notEqual(v.story?.id, 'baignade'); }
  // A click finds it where it floats.
  assert.equal(bandHit(90, 40, 6, 32).target, 'penguin');
  assert.equal(bandHit(90, 40, 6).target, 'sky');
});

test('the AI comes first: an episode waits for it, then resumes at the shot it left', () => {
  const mood = new AmbientMood(0, 5);
  let now = 0, view;
  for (; now < 120_000; now += 250) if ((view = mood.update(now, calm)).story) break;
  assert.ok(view.story, 'calm, it starts an episode');
  const story = stories.find(({ id }) => id === view.story.id);
  // Into its third shot…
  const third = TITLE_FOR + story.beats[0].for + story.beats[1].for;
  for (const end = now + (third + 0.5) * 1000; now < end; now += 250) view = mood.update(now, calm);
  assert.equal(storyBeat(story, view.story.seconds).index, 2);
  // …the AI starts working: the episode stops at once.
  view = mood.update(now += 250, busy);
  assert.equal(view.story, undefined, 'paused the moment the AI is busy');
  for (const end = now + 6000; now < end; now += 250) assert.equal(mood.update(now, busy).story, undefined);
  // Short work, no reward: calm again, the episode picks up at the start of that shot.
  for (const end = now + 15_000; now < end && !view.story; now += 250) view = mood.update(now, calm);
  assert.equal(view.story?.id, story.id);
  assert.ok(Math.abs(view.story.seconds - third) < 0.3, `resumed at ${view.story.seconds}s, its shot started at ${third}s`);
  // Away for long, it starts over.
  for (const end = now + 1000; now < end; now += 250) mood.update(now, calm);
  for (const end = now + 100_000; now < end; now += 250) mood.update(now, now % 60_000 === 0 ? { busy: true, asking: true } : { busy: false, asking: true });
  for (const end = now + 30_000; now < end && !(view = mood.update(now, calm)).story; now += 250);
  assert.ok(!view.story || view.story.id !== story.id || view.story.seconds < 1, 'after a long while, from the start');
});

test('every episode plays whole at every width it fits: the narrator never cut, the AI never touched', () => {
  const base = { scene: 'idle', seconds: 100, work: 0, drawn: 1 };
  for (const story of stories) {
    let shown = 0;
    for (const columns of [60, 80, 100, 132, 200]) {
      const mood = new AmbientMood(0, 1);
      mood.resize(columns);
      // Does it fit? Ask the mood through a band it would tell it in.
      const fits = columns >= 100 || !story.snowman;
      if (!fits) continue;
      for (let t = 0; t < storyLength(story); t += 0.25) {
        const view = { ...base, clock: 300 + t, story: { id: story.id, seconds: t } };
        const lines = ambientBand(view, columns);
        assert.equal(lines.length, BAND_ROWS, `${story.id} ${columns}`);
        for (const line of lines) assert.equal([...plain(line)].length, columns, `${story.id} at ${t}s, ${columns} columns`);
        const shot = storyBeat(story, t), caption = plain(lines[1]);
        if (shot.title) {
          // The title shows alone, like a card: it is not someone speaking.
          assert.ok(caption.includes(`ÉPISODE : ${story.title.toUpperCase()}`), `${story.id}: its title card`);
        } else if (columns >= 80) {
          // Once typed, the whole line shows: the narrator's alone, a character's after their name.
          const line = shot.beat.who ? `${shot.beat.who} : « ${shot.beat.say} »` : shot.beat.say;
          if (shot.s > [...line].length / 40 + 0.05) { assert.ok(caption.includes(line), `${story.id}: « ${line} » at ${columns} columns`); shown++; }
          assert.ok(!caption.includes(story.title.toUpperCase()), `${story.id}: no title before the lines, it reads like a speaker`);
        }
        lines.forEach((line, i) => { if (i !== 1) assert.match(plain(line), /^▀*$/, `${story.id}: pixel art only, line ${i}`); });
      }
    }
    assert.ok(shown > 0, `${story.id}: its narrator speaks`);
    // A line in quotes is someone speaking: it must say who.
    for (const beat of story.beats) assert.ok(beat.who || !/^«/.test(beat.say), `${story.id}: « ${beat.say} » needs its speaker`);
    // Every line stays long enough to be typed, then read.
    for (const beat of story.beats) {
      const typed = ([...beat.say].length + (beat.who ? beat.who.length + 5 : 0)) / 40, read = [...beat.say].length / 15;
      assert.ok(beat.for >= 0.8 + typed + read - 0.5, `${story.id}: « ${beat.say} » shows ${beat.for} s, needs ${(0.8 + typed + read).toFixed(1)} s`);
    }
  }
});

test('a click pets the penguin: it answers kindly, happier at each click', () => {
  const mood = new AmbientMood(0, 9);
  mood.update(0, calm);
  const answers = [0, 1, 2, 3, 4].map((i) => { mood.poke('penguin', 1000 + i * 500); return mood.update(1000 + i * 500, calm).doing; });
  assert.deepEqual(answers.map((doing) => doing.name), ['pleased', 'wave', 'hop', 'dance', 'dance']);
  assert.ok(answers.every((doing) => doing.user));
  for (const doing of answers) assert.notEqual(penguinPose({ scene: 'idle', seconds: 1, clock: 1, work: 0, drawn: 1, visit: 0, doing }), 'grumpy');
  mood.poke('penguin', 20_000);
  assert.equal(mood.update(20_000, calm).doing.name, 'pleased', 'a new petting starts gently again');
  mood.poke('snowman', 30_000);
  assert.equal(mood.update(30_000, calm).doing.name, 'greet');
  mood.poke('sea', 40_000, { x: 60, y: 17 });
  assert.deepEqual(mood.update(40_000, calm).doing, { name: 'splash', seconds: 0, user: true, x: 60, y: 17 });

  // A click outranks a reaction, and wakes it up from a long pause.
  mood.update(50_000, { busy: false, interrupted: true });
  mood.poke('penguin', 50_500);
  assert.equal(penguinPose(mood.update(50_600, calm)), 'pleased');
  const sleepy = new AmbientMood(0, 2);
  sleepy.update(0, calm);
  assert.equal(sleepy.update(400_000, calm).scene, 'quiet');
  sleepy.poke('penguin', 400_100);
  assert.deepEqual([sleepy.update(400_200, calm).scene, sleepy.update(400_300, calm).doing.name], ['idle', 'wave']);
});

test('a click lands on the penguin, the snowman, the sea or the sky', () => {
  assert.equal(bandHit(80, 10, 5).target, 'penguin');
  assert.equal(bandHit(120, 4, 8).target, 'snowman');
  assert.equal(bandHit(120, 4, 1).target, 'sky');
  assert.equal(bandHit(80, 60, 9).target, 'sea');
  assert.equal(bandHit(80, 60, 0).target, 'sky');
  assert.deepEqual(bandHit(80, 60, 9), { target: 'sea', x: 60, y: 19 });
  assert.equal(bandHit(80, 60, BAND_ROWS), undefined);
});

test('session reserves the band below the AI and plays its reactions there, without covering the AI', async () => {
  let output = '';
  const stream = { isTTY: true, columns: 80, rows: 30, write: (data) => { output += data; } };
  let clock = 0;
  const session = new SessionTerminal(stream, { ambient: true, now: () => clock });
  const physical = new xterm.Terminal({ cols: 80, rows: 30, allowProposedApi: true });
  try {
    assert.equal(session.terminal.rows, 20);
    clock = 5000;
    await session.write('\x1b[2J\x1b[HAssistant prêt\r\n> ');
    session.render();
    await write(physical, output);
    const buffer = physical.buffer.active;
    assert.match(buffer.getLine(0).translateToString(true), /Assistant prêt/);
    assert.match(buffer.getLine(25).translateToString(true), /[▀▄]/);
    assert.deepEqual([buffer.cursorY, buffer.cursorX], [1, 2]);
    const written = output.length;
    session.renderBand();
    const once = output.length;
    session.renderBand();
    assert.equal(output.length, once, 'an unchanged band is not repainted');

    // The user interrupts the AI, whose status sits at the bottom: the penguin facepalms below it.
    await session.write('\x1b[19;1HInterrupted by user\x1b[2;3H');
    session.render();
    await write(physical, output);
    assert.match(buffer.getLine(0).translateToString(true), /Assistant prêt/, 'the AI stays on screen');
    assert.match(buffer.getLine(21).translateToString(true), /FACEPALM · Bruh\./);
    const before = output.length;
    clock += 600;
    session.renderBand();
    assert.ok(output.length - before < 4000, 'a new band frame only sends the cells that changed');
    assert.ok(!output.slice(written).includes('\x1b[2J'), 'the screen is never cleared');

    session.resize(80, 17);
    assert.equal(session.terminal.rows, 17, 'small terminals give every row to the AI');
  } finally { await session.dispose(); physical.dispose(); }
});

test('the mouse wheel scrolls the AI history, keys bring the live screen back', async () => {
  const input = new InputReader();
  const up = '\x1b[<64;10;5M';
  assert.deepEqual(input.read(`a${up}${up}b`), {
    keys: 'ab', wheel: -2, reports: [{ raw: up, button: 64, column: 10, row: 5, press: true }, { raw: up, button: 64, column: 10, row: 5, press: true }],
  });
  const click = input.read('\x1b[<0;3;4M\x1b[<0;3;4m');
  assert.equal(click.keys, '', 'clicks never reach the AI as text');
  assert.deepEqual(click.reports.map(leftClick), [true, false], 'a click counts once, on the press');
  assert.equal(leftClick(input.read('\x1b[<2;3;4M').reports[0]), false, 'the right button is not a click');
  assert.equal(input.read('\x1b[<81;1;1M').wheel, 1, 'Ctrl + wheel down');
  assert.deepEqual([input.read('x\x1b[<65;1').keys, input.read(';2M').wheel], ['x', 1], 'a report split across reads');
  assert.equal(input.read('\x1b').keys, '\x1b', 'the Escape key is never held back');
  assert.equal(input.read('\x1b[A').keys, '\x1b[A');

  const stream = { isTTY: true, columns: 80, rows: 30, write: () => {} };
  const session = new SessionTerminal(stream, { ambient: true, now: () => 0 });
  try {
    await session.write(Array.from({ length: 60 }, (_, i) => `ligne ${i}`).join('\r\n'));
    assert.equal(session.scrolledBack, false);
    session.scroll(-6);
    assert.equal(session.scrolledBack, true);
    const buffer = session.terminal.buffer.active;
    assert.match(buffer.getLine(buffer.viewportY).translateToString(true), /ligne 34/);
    session.scroll(0);
    assert.equal(session.scrolledBack, false);
  } finally { await session.dispose(); }
});

test('a click on the band reaches the penguin', async () => {
  let painted = '';
  const stream = { isTTY: true, columns: 80, rows: 30, write: (text) => { painted += text; } };
  let now = 0;
  const session = new SessionTerminal(stream, { ambient: true, now: () => now });
  try {
    now = 5000;
    session.renderBand();
    painted = '';
    session.click(10, 5);
    assert.ok(painted.length > 0, 'the penguin answers at once');
    now = 5100;
    painted = '';
    session.click(10, -1);
    assert.equal(painted, '', 'above the band is the AI, not the penguin');
  } finally { await session.dispose(); }
});
