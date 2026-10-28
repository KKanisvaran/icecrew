import { setTimeout as delay } from 'node:timers/promises';
import { waitFrame } from './frame-clock.ts';
import { imagesAllowed, mascotAspect, mascotBlocks, mascotHeight, mascotSixel, parseGraphics, queryTerminal } from './mascot-render.ts';
import type { TerminalGraphics } from './mascot-render.ts';

interface IntroStream {
  isTTY?: boolean;
  columns?: number;
  rows?: number;
  /** Set while the terminal is behind on what was sent. */
  writableNeedDrain?: boolean;
  write(text: string): unknown;
}
interface IntroInput {
  isTTY?: boolean;
  isRaw?: boolean;
  setRawMode?(mode: boolean): unknown;
  resume(): unknown;
  pause(): unknown;
  on(event: 'data', listener: (data: Buffer | string) => void): unknown;
  off(event: 'data', listener: (data: Buffer | string) => void): unknown;
}

/** The note, one sentence per line; on a narrow terminal, a sentence wraps between its pieces. */
const NOTE = [
  ['Bienvenue sur la banquise !'],
  ['Ce petit pingouin est ravi', 'de vous tenir compagnie', 'pendant que vous codez.'],
  ['Merci de tout cœur', 'de l’avoir installé :', 'vous allez bien', 'vous amuser ensemble !'],
];
const NOTE_TEXT = NOTE.map((pieces) => pieces.join(' ')).join(' ');
/** The note's lines on a terminal `cols` wide; `last` ends a sentence. */
function noteLines(cols: number): { text: string; last: boolean }[] {
  return NOTE.flatMap((pieces) => {
    const whole = pieces.join(' ');
    // Too long for one line: it breaks between pieces, after a colon rather than mid-thought.
    const lines = [...whole].length <= cols - 2 ? [whole] : pieces.reduce<string[]>((lines, piece, i) => {
      const joined = lines.length ? `${lines.at(-1)} ${piece}` : piece;
      if (lines.length && !pieces[i - 1]!.endsWith(':') && [...joined].length <= cols - 2) lines[lines.length - 1] = joined;
      else lines.push(piece);
      return lines;
    }, []);
    return lines.map((text, i, all) => ({ text, last: i === all.length - 1 }));
  });
}
/** The splash needs room for its note, and for the mascot when it fits. */
const SPLASH_MIN = { cols: 30, rows: 13 };
/** Seconds the mascot takes to draw itself; the signature and the note follow below it. */
const DRAW = 1.6;
const IMAGE_AT = DRAW;
const SIGN_AT = DRAW + 0.2;
const NOTE_AT = SIGN_AT + 0.5;
/** Characters a second the note types itself at: a calm reading pace. */
const NOTE_SPEED = 30;
/** A breath after each sentence; time to read the last one before the splash closes. */
const SENTENCE_PAUSE = 0.7, READ_AT_END = 4.5;
/** Seconds the whole note takes to type, its pauses included. */
const NOTE_TYPING = [...NOTE_TEXT].length / NOTE_SPEED + SENTENCE_PAUSE * (NOTE.length - 1);
/** The splash closes on its own once the note is read; a key skips it. */
export const SPLASH_FOR = NOTE_AT + NOTE_TYPING + READ_AT_END;
const SKIP = 'une touche pour passer';
/** Text lines under the mascot: a gap, the signature, the note and the line that says how to skip. */
const below = (cols: number) => 3 + noteLines(cols).length;
/** The real image stays small: at most this many lines tall. */
const MASCOT_LINES = 12;
/**
 * Half blocks need more lines to show the stripes: below 16, the tiger blurs
 * into a wolf, so it is left out rather than misdrawn.
 */
const BLOCK_LINES = { min: 16, max: 22 };
const RESET = '\x1b[0m';
const DIM = '\x1b[38;2;150;160;180m';
const TEXT = '\x1b[38;2;219;227;238m';
const AMBER = '\x1b[1;38;2;232;170;72m';

const center = (text: string, width: number, cols: number) => `${' '.repeat(Math.max(0, Math.floor((cols - width) / 2)))}${text}`;

/** The mascot's box in cells: small, centered with the text below it. */
function mascotBox(cols: number, rows: number, graphics?: TerminalGraphics) {
  const cell = graphics?.sixel ? graphics.cell : undefined;
  // Pixels per cell: two stacked half blocks, or the real cell size for an image.
  const [cellWidth, cellHeight] = cell ? [cell.width, cell.height] : [1, 2];
  const widthFor = (lines: number) => Math.ceil(Math.min(lines * cellHeight, cell ? mascotHeight : Infinity) * mascotAspect / cellWidth);
  let lines = Math.min(cell ? MASCOT_LINES : BLOCK_LINES.max, rows - below(cols));
  while (lines > 0 && widthFor(lines) > cols - 2) lines--;
  if (lines < (cell ? 8 : BLOCK_LINES.min)) return undefined;
  const width = widthFor(lines);
  return {
    lines, width, left: Math.floor((cols - width) / 2), top: Math.floor((rows - lines - below(cols) + 1) / 2),
    image: Boolean(cell), pixels: Math.min(lines * cellHeight, mascotHeight),
  };
}

/** The splash: the mascot, centered, then « by KK LAB » and the note typing itself below. */
function splashFrame(seconds: number, cols: number, rows: number, graphics?: TerminalGraphics): string[] {
  const box = mascotBox(cols, rows, graphics);
  const lines: string[] = Array.from({ length: box?.top ?? 0 }, () => '');
  // The mascot draws itself in half blocks; a Sixel image then takes its place.
  if (box?.image && seconds >= IMAGE_AT) for (let i = 0; i < box.lines; i++) lines.push('');
  else if (box) {
    for (const line of mascotBlocks(box.width, box.lines, Math.min(1, seconds / DRAW))) lines.push(`${' '.repeat(box.left)}${line}`);
  }
  lines.push('', seconds >= SIGN_AT ? center(`${DIM}by ${AMBER}KK LAB${RESET}`, 9, cols) : '');
  // One line after the other, in order, with a breath at the end of each sentence.
  let clock = seconds - NOTE_AT;
  for (const { text, last } of noteLines(cols)) {
    const chars = [...text], shown = Math.max(0, Math.min(chars.length, Math.floor(clock * NOTE_SPEED)));
    lines.push(shown ? center(`${TEXT}${chars.slice(0, shown).join('')}${RESET}`, chars.length, cols) : '');
    clock -= (chars.length + 1) / NOTE_SPEED + (last ? SENTENCE_PAUSE : 0);
  }
  lines.push(seconds >= NOTE_AT + NOTE_TYPING + 0.6 ? center(`${DIM}${SKIP}${RESET}`, SKIP.length, cols) : '');
  return lines;
}

/**
 * Pure frame builder (tests and static output); `seconds` drives the reveal.
 * With a Sixel image, the mascot's lines stay blank: `introImage` draws it.
 */
export function introFrame(seconds: number, cols = 120, rows = 34, graphics?: TerminalGraphics): string[] {
  return splashFrame(seconds, cols, rows, graphics);
}

let sixel: { pixels: number; image: string } | undefined;

/** The Sixel mascot for this frame, centered at the top, or undefined when it is drawn in half blocks. */
export function introImage(seconds: number, cols: number, rows: number, graphics?: TerminalGraphics): string | undefined {
  if (seconds < IMAGE_AT) return undefined;
  const box = mascotBox(cols, rows, graphics);
  if (!box?.image) return undefined;
  if (sixel?.pixels !== box.pixels) sixel = { pixels: box.pixels, image: mascotSixel(box.pixels) };
  return `\x1b[${box.top + 1};${box.left + 1}H${sixel.image}`;
}

/** Plain text for captured output: no cursor control, no colors. */
export function introText(): string {
  return ['KK LAB · icecrew', NOTE_TEXT].join('\n');
}

/** The KK LAB mascot appears, with its note below, then closes on its own; a key skips it. */
export async function playIntro(stdout: IntroStream = process.stdout, stdin: IntroInput = process.stdin): Promise<void> {
  const cols = stdout.columns ?? 80, rows = stdout.rows ?? 24;
  // Captured output gets the note as plain text; a terminal too small, nothing.
  if (!stdout.isTTY || !stdin.isTTY) { stdout.write(`${introText()}\n`); return; }
  if (cols < SPLASH_MIN.cols || rows < SPLASH_MIN.rows) return;
  let presses = 0, replies = '';
  // Terminal reports (focus, cursor position, device attributes, cell size) are not key presses.
  const onKey = (data: Buffer | string) => {
    const text = data.toString();
    if (/^(\x1b\[[0-9;?]*[A-Za-z~]|\x1b\[[IO])+$/.test(text)) replies += text;
    else presses++;
  };
  const wasRaw = Boolean(stdin.isRaw);
  stdout.write('\x1b[?1049h\x1b[?25l\x1b[2J');
  try {
    stdin.setRawMode?.(true);
    stdin.resume();
    stdin.on('data', onKey);
    // A real image when the terminal can show one: Sixel, sized from its cells.
    let graphics: TerminalGraphics | undefined;
    if (imagesAllowed()) {
      stdout.write(queryTerminal);
      for (const asked = performance.now(); !(graphics = parseGraphics(replies)) && performance.now() - asked < 400;) await delay(20);
    }
    const start = performance.now();
    // Only changed lines are rewritten: the truecolor mascot is heavy for ConPTY.
    let previous: string[] = [], size = '', drawn = false, deadline = start;
    for (;; deadline = await waitFrame(deadline)) {
      const seconds = (performance.now() - start) / 1000;
      if (presses || seconds >= SPLASH_FOR) break;
      // A terminal still busy with the last frame skips this one rather than fall behind.
      if (stdout.writableNeedDrain) continue;
      const width = stdout.columns ?? cols, height = stdout.rows ?? rows;
      const frame = introFrame(seconds, width, height, graphics);
      if (frame.length !== previous.length || size !== `${width}x${height}`) {
        stdout.write('\x1b[2J');
        previous = []; size = `${width}x${height}`; drawn = false;
      }
      const changes = frame.map((line, i) => line === previous[i] ? '' : `\x1b[${i + 1};1H${line}\x1b[K`).join('');
      if (changes) stdout.write(changes);
      const image = drawn ? undefined : introImage(seconds, width, height, graphics);
      if (image) { stdout.write(image); drawn = true; }
      previous = frame;
    }
  } finally {
    stdin.off('data', onKey);
    stdin.setRawMode?.(wasRaw);
    stdin.pause();
    stdout.write(`${RESET}\x1b[?25h\x1b[?1049l`);
  }
}
