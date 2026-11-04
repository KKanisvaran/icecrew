// The penguin's little cartoons: short episodes it plays when the AI is
// quiet, with a narrator on the caption line, like the cards of a silent
// film. Its friends come and go: Gaspard the seagull, Bulle the fish, a
// shooting star, Flocon the snowman. What it holds never vanishes from one
// shot to the next: a rod it lets go of stays planted in the ice.
// Pure: everything is drawn from the seconds the caller passes in.
import { SWIM, beat, drawActivity, ease, swimFrame, waddle } from './companion.ts';
import type { Frame } from './companion.ts';
import { FLOE, backdrop } from './decor.ts';
import { aurora, bear, boom, chick, dot, fish, flower, gift, gull, gullHead, heart, igloo, mirror, note, note2, photo, put, shadow, shell, shootingStar, smallFish, seal, smoke, star, whale, zed } from './cast.ts';
import { PENGUIN_WIDTH, penguinPalette, penguinPoses, penguinProps } from './penguin.ts';
import type { Pose } from './penguin.ts';

/** Where the story plays, in band pixels. */
export interface StoryPlace {
  canvas: string[][];
  /** Left edge of the penguin's 21-pixel box, at its place. */
  left: number;
  /** Where the floe ends: the sea starts there. */
  floe: number;
  /** First row of the sea. */
  sea: number;
  width: number;
  /** Left edge of Flocon the snowman, when there is room for him. */
  snowman?: number | undefined;
  /** Seconds since the band started, for twinkles. */
  clock: number;
}

type Draw = (place: StoryPlace, s: number, u: number) => void;

/** One shot: what the narrator says, what the penguin does, what the others do. */
export interface Beat {
  /** Seconds it lasts. */
  for: number;
  /** What the narrator says, or, with `who`, what that character says. */
  say: string;
  /** The character speaking this line; none for the narrator. */
  who?: string;
  /** The penguin, `s` seconds into the shot, `u` from 0 to 1 along it. */
  penguin: (s: number, u: number) => Frame;
  /** Drawn behind the penguin. */
  behind?: Draw;
  /** Drawn in front of it. */
  draw?: Draw;
  /** How far a bite pulls the bobber under, while it fishes. */
  dip?: (s: number, u: number) => number;
  /** Cells the narrator moves right, past something held high beside the penguin. */
  caption?: number;
}

export interface Story {
  id: string;
  title: string;
  /** Told first, once a session: it introduces the friends. */
  opening?: boolean;
  /** Pixels it needs to the right of the penguin's place. */
  room: number;
  /** It needs Flocon, who only fits in a band 100 columns wide. */
  snowman?: boolean;
  beats: Beat[];
}

// ── The penguin ────────────────────────────────────────────────────────────

const pose = (name: Pose, dx = 0, dy = 0) => (): Frame => ({ pose: name, dx, dy });
/** A little bounce now and then. */
const bounce = (name: Pose, speed = 1.5, dx = 0) => (s: number): Frame => ({ pose: name, dx, dy: beat(s, speed) ? -1 : 0 });
/** A start: one hop, then it stays. */
const startle = (name: Pose, dx = 0) => (s: number): Frame => ({ pose: name, dx, dy: s < 0.25 ? -1 : 0 });
/** Two poses in turn, like a dance. */
const alternate = (a: Pose, b: Pose, speed = 3, dx = 0) => (s: number): Frame => {
  const step = Math.floor(s * speed) % 2;
  return { pose: step ? a : b, dx, dy: step ? 0 : -1 };
};
const walk = (from: number, to: number, seconds: number, name: Pose) => (s: number): Frame =>
  waddle(s, from, to, Math.abs(to - from) / Math.max(0.1, seconds - 0.1), name);

// ── What they do ───────────────────────────────────────────────────────────

/** The highest row things float up to: above it is the narrator's line. */
const SKY_TOP = 4;
const lerp = (a: number, b: number, u: number) => a + (b - a) * u;
const clamp = (u: number) => Math.min(1, Math.max(0, u));
/** 0 → 1 between `a` and `b` of the shot's own 0 → 1. */
const part = (u: number, a: number, b: number) => clamp((u - a) / (b - a));

/** Gaspard on the wing, facing the way he flies, beating his wings. */
function flying(place: StoryPlace, x: number, y: number, s: number, left = true): void {
  const wings = Math.floor(s * 5) % 2 ? gull.up : gull.down;
  put(place.canvas, left ? wings : mirror(wings), Math.round(x), Math.round(y));
}
/** Gaspard on the ice: his feet on its surface. */
function standing(place: StoryPlace, x: number, bowing = false, left = true): void {
  const body = bowing ? gull.bow : gull.stand;
  put(place.canvas, left ? body : mirror(body), Math.round(x), FLOE - body.length);
}
/** Gaspard flies from (x0, y0) to (x1, y1), along `u`. */
function flight(place: StoryPlace, s: number, u: number, x0: number, y0: number, x1: number, y1: number): void {
  const e = ease(u);
  flying(place, lerp(x0, x1, e), lerp(y0, y1, e) + Math.sin(s * 6) * 0.6, s, x1 <= x0);
}

/** Drops of water flying out where something breaks the surface. */
function splash(place: StoryPlace, x: number, u: number, size = 3): void {
  if (u <= 0 || u >= 1) return;
  for (let i = 0; i < 6; i++) {
    const side = i - 2.5, height = 2 + (i % 3) * size / 2;
    dot(place.canvas, Math.round(x + side * (1 + u * 2)), Math.round(place.sea - Math.sin(Math.PI * u) * height), ['ffffff', 'c8d6e4', '6cbcfd'][i % 3]!);
  }
}

/** Bulle leaps out of the sea from `x0` to `x1`, up to `height` pixels; he smiles if asked. */
function leap(place: StoryPlace, u: number, x0: number, x1: number, height = 8, smiling = false): void {
  if (u <= 0 || u >= 1) return;
  const x = lerp(x0, x1, u), top = place.sea + 1 - Math.sin(Math.PI * u) * height - fish.swim.length;
  const body = smiling ? fish.smile : u < 0.5 ? fish.swim : fish.flick;
  put(place.canvas, x1 < x0 ? body : mirror(body), Math.round(x - 5), Math.round(top));
  splash(place, x0, part(u, 0, 0.25));
  splash(place, x1, part(u, 0.8, 1));
}

/** Little Bulle swimming just under the surface, his back out of the water. */
function swimming(place: StoryPlace, x: number, left = true): void {
  put(place.canvas, left ? smallFish : mirror(smallFish), Math.round(x), place.sea + 1);
}

/** More ice beyond the floe, from `x0` to `x1`: room to build, to plant, to land. */
function ice(place: StoryPlace, x0: number, x1: number): void {
  for (let x = Math.round(x0); x <= x1; x++) {
    const end = x === Math.round(x1);
    if (!end) dot(place.canvas, x, FLOE, 'ffffff');
    dot(place.canvas, x, FLOE + 1, end ? 'edffff' : 'ffffff');
  }
}

/** Twinkling sparkles around (`x`, `y`). */
function sparkles(place: StoryPlace, x: number, y: number, s: number, spread = 6): void {
  for (let i = 0; i < 4; i++) {
    const on = Math.floor(s * 4 + i * 1.7) % 3 !== 0;
    if (!on) continue;
    const sx = Math.round(x + Math.sin(i * 2.3) * spread), sy = Math.round(y + Math.cos(i * 1.9) * spread / 2);
    put(place.canvas, star.sparkle[(Math.floor(s * 3) + i) % 2]!.map((row) => row.replace(/S/g, '.')), sx - 2, sy - 2);
  }
}

/** The whole sky twinkling, star after star, beyond the penguin. */
function starry(place: StoryPlace, s: number): void {
  const from = place.left + 24, span = Math.max(10, place.width - from - 16);
  for (let i = 0; i < 16; i++) {
    const phase = (s * 1.3 + i * 0.37) % 2;
    if (phase > 1.2) continue;
    const x = from + ((i * 53) % span), y = 4 + ((i * 7) % 9);
    put(place.canvas, star.sparkle[phase < 0.6 ? 0 : 1]!.map((row) => row.replace(/S/g, '.')), x - 2, y - 2);
  }
}

/** Hearts rising from (`x`, `y`). */
function hearts(place: StoryPlace, x: number, y: number, s: number, count = 2): void {
  for (let i = 0; i < count; i++) {
    const up = ((s * 0.7 + i / count) % 1) * 6;
    put(place.canvas, heart, Math.round(x + i * 6 + Math.sin(s * 2 + i) * 1.2), Math.max(SKY_TOP, Math.round(y - up)));
  }
}

/** Notes rising from (`x`, `y`), swaying. */
function notes(place: StoryPlace, x: number, y: number, s: number, toward = 1): void {
  for (let i = 0; i < 3; i++) {
    const u = (s * 0.5 + i / 3) % 1;
    put(place.canvas, i % 2 ? note2 : note, Math.round(x + toward * u * 10 + Math.sin(s * 3 + i * 2)), Math.max(SKY_TOP, Math.round(y - u * 8)));
  }
}

/** A yellow « ! » above the penguin's head: something happens. */
function exclaim(place: StoryPlace, dx = 0): void {
  for (const [x, y] of [[0, 0], [0, 1], [0, 2], [0, 4]] as const) dot(place.canvas, place.left + dx + 17 + x, y, 'ffd23f');
}
/** A drop of sweat beside its head. */
function sweat(place: StoryPlace, s: number, dx = 0): void {
  const y = 4 + Math.floor((s * 2) % 3);
  dot(place.canvas, place.left + dx + 17, y, '9fe3ff');
  dot(place.canvas, place.left + dx + 17, y + 1, '58b4ff');
}

/** The fishing rod in the penguin's flipper, its line, and the bobber at sea (`dip` pulls it under). */
export function fishingRod(canvas: string[][], left: number, sea: number, clock: number, dip = 0, dy = 0): void {
  // The rod: light wood, so it shows against the night, ending in a darker tip.
  for (let i = 0; i <= 7; i++) dot(canvas, left + 18 + i, 12 - i + dy, i < 6 ? 'd09858' : '8a5a2a');
  dot(canvas, left + 17, 13 + dy, '9aa8ba');
  const [tipX, tipY] = [left + 25, 5 + dy];
  // Reeled in: a short line from the tip to the catch's mouth, at HOOK.
  if (dip === HOOKED) { for (let y = tipY + 1; y <= tipY + HOOK.y; y++) dot(canvas, tipX - 1, y, 'e6eef6'); return; }
  // A bite pulls the bobber under: the line goes taut to the surface, ripples around it.
  const bobX = left + 31, under = dip >= 2, bobY = under ? sea : sea + 1 + Math.round(Math.sin(clock * 2) * 0.5) + dip;
  for (let y = tipY + 1; y < bobY; y++) dot(canvas, Math.round(tipX + (bobX - tipX) * (y - tipY) / (bobY - tipY)), y, 'e6eef6');
  if (!under) { dot(canvas, bobX, bobY - 1, 'ffffff'); dot(canvas, bobX, bobY, 'ee4250'); }
  else for (const d of [-2, -1, 1, 2]) dot(canvas, bobX + d, sea, Math.abs(d) === 1 ? 'ffffff' : 'c8d6e4');
}
/** The rod's `dip` once the catch is reeled in, and where its mouth hangs from the tip. */
export const HOOKED = -1;
const HOOK = { x: -1, y: 3 };

/** The rod it put down, planted in the ice beside it, its line still in the sea. */
function plantedRod(place: StoryPlace): void {
  const x = place.left + 20;
  for (let i = 0; i <= 7; i++) dot(place.canvas, x + Math.floor(i / 3), FLOE - 1 - i, i < 6 ? 'd09858' : '8a5a2a');
  for (let y = FLOE - 7; y < place.sea + 2; y++) dot(place.canvas, Math.round(x + 2 + (y - FLOE + 7) * 0.9), y, 'e6eef6');
}

/** Flocon's arms: down and sad, or up and happy; a tear when he is lonely. */
function flocon(place: StoryPlace, mood: 'sad' | 'happy' | 'dance', s = 0): void {
  if (place.snowman === undefined) return;
  const x = place.snowman, top = FLOE + 1 - 10;
  // His arms are twigs at rows 5 and 6 of his sprite: put them back to the sky first.
  for (const [ax, ay] of [[0, 5], [8, 5], [1, 6], [7, 6]] as const) dot(place.canvas, x + ax, top + ay, backdrop(top + ay));
  const up = mood === 'happy' || (mood === 'dance' && beat(s, 2) === 0);
  const twig = penguinPalette.R!;
  if (up) for (const [ax, ay] of [[0, 3], [1, 4], [8, 3], [7, 4]] as const) dot(place.canvas, x + ax, top + ay, twig);
  else for (const [ax, ay] of [[0, 7], [1, 6], [8, 7], [7, 6]] as const) dot(place.canvas, x + ax, top + ay, twig);
  if (mood === 'sad') {
    const drop = Math.floor((s * 2) % 3);
    dot(place.canvas, x + 3, top + 3 + drop, '58b4ff');
  } else {
    // A smile under his carrot nose.
    for (const mx of [3, 4, 5]) dot(place.canvas, x + mx, top + 4, '0a0d16');
  }
}

/** The photo flash: a burst of white at the camera. */
function flash(place: StoryPlace, x: number, y: number): void {
  for (let i = -3; i <= 3; i++) { dot(place.canvas, x + i, y, 'ffffff'); dot(place.canvas, x, y + i, 'ffffff'); }
  for (const d of [-2, 2]) { dot(place.canvas, x + d, y + d, 'fff3b0'); dot(place.canvas, x + d, y - d, 'fff3b0'); }
}

/** Confetti falling over the floe. */
function confetti(place: StoryPlace, s: number, x0: number, x1: number): void {
  const colors = ['ee4250', 'ffd23f', '58b4ff', '74d27a', 'ffa6c4'];
  for (let i = 0; i < 14; i++) {
    const x = Math.round(x0 + ((i * 37) % 100) / 100 * (x1 - x0) + Math.sin(s * 3 + i) * 1.5);
    const y = Math.round(((s * (3 + (i % 4)) + i * 2.7) % 16) + 2);
    dot(place.canvas, x, y, colors[i % colors.length]!);
  }
}

/** Bubbles rising from the flask's mouth. */
function bubbles(place: StoryPlace, s: number, x: number, y: number, speed = 1): void {
  for (let i = 0; i < 4; i++) {
    const u = (s * speed * 0.6 + i / 4) % 1;
    dot(place.canvas, Math.round(x + Math.sin(s * 4 + i * 2) * 1.2), Math.max(SKY_TOP, Math.round(y - u * 6)), i % 2 ? 'bff0ff' : '74d27a');
  }
}

/** The igloo, built from the bottom row up as `u` goes 0 → 1; its door glows once done. */
function iglooRising(place: StoryPlace, x: number, u: number, glow = 0): void {
  const rows = Math.round(u * igloo.length);
  const shown = igloo.map((row, y) => (y >= igloo.length - rows ? row : '.'.repeat(row.length)));
  put(place.canvas, glow ? shown : shown.map((row) => row.replace(/[YS]/g, 'w')), x, FLOE - igloo.length);
}

// ── The episodes ───────────────────────────────────────────────────────────

const L = (place: StoryPlace, dx: number) => place.left + dx;

/** The friends, one after the other, so everyone knows who is who; Flocon when he is there. */
function friends(withFlocon: boolean): Story {
  const ice40 = (p: StoryPlace) => ice(p, p.floe - 1, L(p, 42));
  return {
    id: withFlocon ? 'amis' : 'amis-sans-flocon', title: 'Les amis', room: 60, snowman: withFlocon, opening: true,
    beats: [
      { for: 4.5, who: 'Pingouin', say: 'Salut ! Je te présente ma bande !', penguin: bounce('waving', 2) },
      {
        for: 5, who: 'Gaspard', say: 'Gaspard, la mouette. Tu as du poisson ?', penguin: pose('right'),
        draw: (p, s, u) => { ice40(p); if (u < 0.6) flight(p, s, part(u, 0, 0.6), p.width, 4, L(p, 30), 9); else { standing(p, L(p, 30), beat(s, 1.5) === 1); sparkles(p, L(p, 34), 9, s, 5); } },
      },
      {
        for: 5, who: 'Bulle', say: 'Moi, c’est Bulle ! Attention, je mouille !', penguin: startle('surprised'),
        draw: (p, s, u) => { ice40(p); standing(p, L(p, 30)); leap(p, part(u, 0.05, 0.6), L(p, 56), L(p, 46), 10, true); if (u > 0.6) swimming(p, L(p, 46)); },
      },
      ...(withFlocon ? [{
        for: 5, who: 'Flocon', say: 'Flocon… le bonhomme de neige. Bonsoir.', penguin: pose('left'),
        draw: (p: StoryPlace, s: number) => { ice40(p); standing(p, L(p, 30)); swimming(p, L(p, 46)); flocon(p, 'dance', s); sparkles(p, (p.snowman ?? 0) + 4, 11, s, 6); },
      }] : []),
      {
        for: 5, who: 'Pingouin', say: 'Allez, que l’aventure commence !', penguin: alternate('dancing', 'happy'),
        draw: (p, s) => { ice40(p); flying(p, L(p, 30), 6 + beat(s, 3), s); leap(p, (s % 1.6) / 1.6, L(p, 56), L(p, 48), 8); flocon(p, 'happy'); hearts(p, L(p, 20), 8, s); },
      },
    ],
  };
}

export const stories: Story[] = [
  friends(true),
  friends(false),
  {
    // A prank, a catch, a choice, and a friend for life.
    id: 'peche', title: 'La pêche', room: 58,
    beats: [
      { for: 5, who: 'Pingouin', say: 'Ce soir, c’est moi qui pêche le dîner !', penguin: pose('fishing') },
      { for: 4, say: 'Il attend… et il attend encore…', penguin: pose('fishing'), draw: (p, s, u) => swimming(p, lerp(p.width - 4, L(p, 44), u)) },
      { for: 4, say: 'Une ombre file sous le bouchon !', penguin: pose('fishing'), dip: (s) => beat(s, 3), draw: (p, s, u) => swimming(p, lerp(L(p, 44), L(p, 33), u)) },
      {
        for: 4, who: 'Bulle', say: 'Hi hi ! Une petite douche ?', penguin: startle('fishing'),
        draw: (p, s, u) => {
          leap(p, part(u, 0, 0.5), L(p, 36), L(p, 30), 6);
          // A fan of water, blue so it stands out from the snow, lands on its head…
          for (let i = 0; i < 8; i++) {
            const v = part(u, 0.2 + i * 0.03, 0.62 + i * 0.03);
            if (v > 0 && v < 1) dot(p.canvas, Math.round(lerp(L(p, 31), L(p, 8 + i), v)), Math.round(lerp(p.sea, 3, v) - Math.sin(Math.PI * v) * 5), i % 2 ? '58b4ff' : '9fe3ff');
          }
          // …and drips down.
          if (u > 0.62) for (let i = 0; i < 4; i++) dot(p.canvas, L(p, 8 + i * 2), 2 + Math.floor(((u - 0.62) * 10 + i) % 3), i % 2 ? '58b4ff' : '9fe3ff');
          if (u > 0.55) exclaim(p);
        },
      },
      { for: 5, who: 'Pingouin', say: 'Ça mord ! Cette fois, c’est la bonne !', penguin: (s) => ({ pose: 'fishing', dx: 0, dy: beat(s, 6) ? -1 : 0 }), dip: (s) => (beat(s, 4) ? 2 : 1), draw: (p) => exclaim(p) },
      { for: 3.5, say: 'Il tire de toutes ses forces…', penguin: (s) => ({ pose: 'fishing', dx: beat(s, 8) ? -1 : 0, dy: 0 }), dip: () => 2, draw: (p, s) => sweat(p, s) },
      { for: 4, who: 'Bulle', say: 'Euh… c’est moi. Bonsoir ?', penguin: bounce('fishing', 2), dip: () => HOOKED, draw: (p, s) => hooked(p, s) },
      {
        for: 4, who: 'Bulle', say: 'Tu ne vas pas me manger, hein ?', penguin: pose('fishing'), dip: () => HOOKED,
        draw: (p, s) => { hooked(p, 0); dot(p.canvas, L(p, 25), 11 + Math.floor((s * 2) % 3), '58b4ff'); },
      },
      { for: 4, who: 'Pingouin', say: 'Va, file ! Les amis d’abord.', penguin: startle('pleased'), draw: (p, s, u) => { plantedRod(p); leap(p, part(u, 0, 0.7), L(p, 26), L(p, 42), 6); hearts(p, L(p, 16), 6, s); } },
      {
        for: 5, who: 'Bulle', say: 'Merci ! Tiens, un coquillage pour toi !', penguin: startle('surprised'),
        draw: (p, s, u) => {
          plantedRod(p); ice(p, p.floe - 1, L(p, 34));
          leap(p, part(u, 0, 0.5), L(p, 46), L(p, 32), 9, true);
          if (u > 0.45) put(p.canvas, shell, L(p, 27), FLOE - shell.length);
        },
      },
      { for: 5, say: 'Pas de dîner… mais un ami de plus.', penguin: bounce('love', 1), draw: (p, s) => { plantedRod(p); ice(p, p.floe - 1, L(p, 34)); put(p.canvas, shell, L(p, 27), FLOE - shell.length); hearts(p, L(p, 16), 6, s); } },
    ],
  },
  {
    // A thief who turns out to be a father.
    id: 'mouette', title: 'Le voleur', room: 66,
    beats: [
      { for: 4, who: 'Pingouin', say: 'Miam ! Enfin un bon poisson.', penguin: bounce('eating', 1.2) },
      { for: 3.5, say: 'Mais là-haut, Gaspard rôde…', penguin: pose('eating'), draw: (p, s, u) => flight(p, s, u, p.width, 4, L(p, 40), 6) },
      {
        for: 3.5, say: 'Hop ! Volé en plein vol !', penguin: startle('surprised'),
        draw: (p, s, u) => {
          const dive = u < 0.5 ? part(u, 0, 0.5) : 1 - part(u, 0.5, 1);
          const x = lerp(L(p, 40), L(p, 16), dive), y = lerp(6, 8, dive);
          flying(p, x, y, s, u < 0.5);
          if (u >= 0.5) put(p.canvas, smallFish, Math.round(x) + 1, Math.round(y) + 7);
        },
      },
      {
        for: 4, who: 'Pingouin', say: 'Mon dîner ! Reviens, voleur !', penguin: pose('crying'),
        draw: (p, s, u) => { const x = lerp(L(p, 40), p.width + 4, ease(u)), y = 6 - u * 2; flying(p, x, y, s, false); put(p.canvas, smallFish, Math.round(x) + 10, Math.round(y) + 7); },
      },
      { for: 4.5, say: 'Il sort ses jumelles…', penguin: pose('binoculars'), draw: (p) => { nest(p); standing(p, L(p, 52)); put(p.canvas, smallFish, L(p, 50), FLOE - 3); } },
      {
        for: 5, say: 'Gaspard nourrit… son bébé !', penguin: pose('binoculars'),
        draw: (p, s) => { nest(p); standing(p, L(p, 52), beat(s, 1.5) === 1); put(p.canvas, chick, L(p, 59) + beat(s, 3), FLOE - chick.length); hearts(p, L(p, 58), 9, s, 1); },
      },
      { for: 4.5, who: 'Pingouin', say: 'Oh… il avait un petit à nourrir.', penguin: bounce('love', 1), draw: (p, s) => { nest(p); standing(p, L(p, 52)); put(p.canvas, chick, L(p, 59), FLOE - chick.length); } },
      {
        for: 4.5, say: 'Le lendemain, Gaspard revient…', penguin: startle('surprised'),
        draw: (p, s, u) => {
          nest(p); put(p.canvas, chick, L(p, 59), FLOE - chick.length); ice(p, p.floe - 1, L(p, 40));
          if (u < 0.8) {
            const x = lerp(L(p, 52), L(p, 30), ease(part(u, 0, 0.8))), y = 8 - Math.sin(Math.PI * part(u, 0, 0.8)) * 3;
            flying(p, x, y, s);
            put(p.canvas, smallFish, Math.round(x) + 1, Math.round(y) + 7);
            put(p.canvas, smallFish, Math.round(x) + 7, Math.round(y) + 7);
          } else { standing(p, L(p, 30)); put(p.canvas, smallFish, L(p, 25), FLOE - 3); }
        },
      },
      {
        for: 5, who: 'Gaspard', say: 'Pardon pour hier. Un chacun ?', penguin: bounce('feasting', 1.5),
        draw: (p, s) => { nest(p); put(p.canvas, chick, L(p, 59), FLOE - chick.length); ice(p, p.floe - 1, L(p, 40)); standing(p, L(p, 30), beat(s, 2) === 1); hearts(p, L(p, 26), 7, s); },
      },
    ],
  },
  {
    // A wish, a fallen star, and the balloon that takes her home.
    id: 'voeu', title: 'L’étoile', room: 60,
    beats: [
      { for: 4.5, say: 'Une nuit pleine d’étoiles…', penguin: pose('right'), draw: (p, s) => starry(p, s) },
      { for: 4.5, who: 'Pingouin', say: 'Une étoile filante ! Vite, un vœu !', penguin: startle('surprised'), draw: (p, s, u) => shootingStar(p.canvas, lerp(p.width - 8, L(p, 40), u), lerp(4, 8, u), 1.4, -0.35, 12) },
      { for: 4, say: 'Il ferme les yeux et fait son vœu…', penguin: pose('closed'), draw: (p, s) => sparkles(p, L(p, 14), 3, s, 4) },
      {
        for: 4.5, say: 'Mais l’étoile tombe… sur la glace !', penguin: startle('surprised'),
        draw: (p, s, u) => { ice(p, p.floe - 1, L(p, 40)); if (u < 0.6) shootingStar(p.canvas, lerp(L(p, 44), L(p, 30), part(u, 0, 0.6)), lerp(4, 13, part(u, 0, 0.6)), 0.8, -0.8, 7); else fallen(p, s); },
      },
      { for: 4, who: 'L’étoile', say: 'Aïe… je ne sais plus voler…', penguin: walk(0, 6, 3, 'right'), draw: (p, s) => { ice(p, p.floe - 1, L(p, 40)); fallen(p, s); } },
      { for: 4, who: 'Pingouin', say: 'Comment te ramener là-haut ?', penguin: pose('thinking', 6), draw: (p, s) => { ice(p, p.floe - 1, L(p, 40)); fallen(p, s); } },
      {
        for: 4, who: 'Pingouin', say: 'J’ai une idée : mon ballon !', penguin: startle('idea', 6), caption: 8,
        behind: (p, s) => put(p.canvas, penguinProps.bulb, L(p, 23), s < 0.2 ? 1 : 0, penguinPalette),
        draw: (p, s) => { ice(p, p.floe - 1, L(p, 40)); fallen(p, s); },
      },
      {
        for: 4, say: 'Il y attache l’étoile, tout doux…', penguin: pose('balloon', 6), caption: 9, behind: (p, s) => balloonBehind(p, s, 6),
        draw: (p) => { ice(p, p.floe - 1, L(p, 40)); put(p.canvas, star.head, L(p, 31), 8); },
      },
      {
        for: 5, who: 'L’étoile', say: 'Merci, petit pingouin !', penguin: pose('waving', 6), caption: 12,
        draw: (p, s, u) => {
          ice(p, p.floe - 1, L(p, 40));
          const x = L(p, 25) + Math.round(Math.sin(s * 2) * 2 + u * 10), y = Math.round(1 - u * 14);
          put(p.canvas, penguinProps.balloon, x - 1, y, penguinPalette);
          for (let i = 0; i < 4; i++) dot(p.canvas, x + 3, y + 10 + i, '9aa8ba');
          put(p.canvas, star.head, x + 1, y + 14);
        },
      },
      { for: 5, say: 'Et tout le ciel scintille de joie.', penguin: alternate('happy', 'dancing', 3, 6), draw: (p, s) => starry(p, s * 2) },
      { for: 3.5, say: 'Il rentre, le cœur léger.', penguin: walk(6, 0, 3.5, 'left'), draw: (p, s) => hearts(p, L(p, 18), 7, s, 1) },
    ],
  },
  {
    // A lonely snowman, a song, and everyone coming round.
    id: 'flocon', title: 'Flocon', room: 50, snowman: true,
    beats: [
      { for: 5, say: 'Flocon, le bonhomme de neige, est triste.', penguin: pose('left'), draw: (p, s) => flocon(p, 'sad', s) },
      { for: 4.5, who: 'Flocon', say: 'Personne ne vient jamais me voir…', penguin: pose('thinking'), draw: (p, s) => flocon(p, 'sad', s) },
      { for: 3, who: 'Pingouin', say: 'Ça y est, je sais !', penguin: startle('idea'), behind: (p, s) => put(p.canvas, penguinProps.bulb, L(p, 18), s < 0.2 ? 1 : 0, penguinPalette), draw: (p, s) => flocon(p, 'sad', s) },
      { for: 5, who: 'Pingouin', say: 'Une chanson, rien que pour toi !', penguin: pose('guitar'), draw: (p, s) => { flocon(p, 'sad', s); notes(p, L(p, -1), 10, s, -1); } },
      {
        for: 4.5, who: 'Gaspard', say: 'Qui chante si bien par ici ?', penguin: pose('guitar'),
        draw: (p, s, u) => { flocon(p, 'sad', s); notes(p, L(p, -1), 10, s, -1); ice(p, p.floe - 1, L(p, 42)); if (u < 0.7) flight(p, s, part(u, 0, 0.7), p.width, 4, L(p, 31), 9); else standing(p, L(p, 31)); },
      },
      { for: 4, who: 'Bulle', say: 'Moi aussi, je veux écouter !', penguin: pose('guitar'), draw: (p, s, u) => { flocon(p, 'sad', s); notes(p, L(p, -1), 10, s, -1); ice(p, p.floe - 1, L(p, 42)); standing(p, L(p, 31)); leap(p, part(u, 0.1, 0.7), L(p, 54), L(p, 46), 9, true); } },
      { for: 4, who: 'Flocon', say: 'Vous êtes venus… pour moi ?', penguin: pose('guitar'), draw: (p, s) => { flocon(p, 'happy'); notes(p, L(p, -1), 10, s, -1); ice(p, p.floe - 1, L(p, 42)); standing(p, L(p, 31), true); hearts(p, (p.snowman ?? 0) + 2, 6, s, 1); } },
      {
        for: 6, say: 'Ce soir-là, Flocon n’était plus seul.', penguin: alternate('dancing', 'happy'),
        draw: (p, s) => { flocon(p, 'dance', s); ice(p, p.floe - 1, L(p, 42)); flying(p, L(p, 30), 6 + beat(s, 3), s); leap(p, (s % 1.5) / 1.5, L(p, 54), L(p, 46), 8); notes(p, L(p, 18), 8, s); },
      },
    ],
  },
  {
    // A house of ice, built with love… a size too small.
    id: 'igloo', title: 'L’igloo', room: 50,
    beats: [
      { for: 4.5, who: 'Pingouin', say: 'Brrr… qu’il fait froid ce soir !', penguin: (s) => ({ pose: 'shivering', dx: beat(s, 12), dy: 0 }) },
      { for: 5, who: 'Pingouin', say: 'Il me faudrait une maison bien chaude…', penguin: pose('thinking') },
      { for: 3.5, who: 'Pingouin', say: 'J’ai trouvé : un igloo !', penguin: startle('idea'), behind: (p, s) => put(p.canvas, penguinProps.bulb, L(p, 18), s < 0.2 ? 1 : 0, penguinPalette) },
      { for: 9, say: 'Bloc après bloc, il le construit…', penguin: bounce('building', 2), draw: (p, s, u) => { ice(p, p.floe - 1, L(p, 46)); iglooRising(p, L(p, 29), u); } },
      { for: 4, who: 'Pingouin', say: 'Ta-da ! Ma maison toute neuve !', penguin: startle('happy'), draw: (p, s) => { ice(p, p.floe - 1, L(p, 46)); iglooRising(p, L(p, 29), 1); sparkles(p, L(p, 36), 9, s, 7); } },
      { for: 4.5, say: 'Il veut entrer… mais il est trop gros !', penguin: walk(0, 6, 2, 'right'), draw: (p, s, u) => { ice(p, p.floe - 1, L(p, 46)); iglooRising(p, L(p, 29), 1); if (u > 0.55) { sweat(p, s, 6); exclaim(p, 6); } } },
      {
        for: 4.5, who: 'Gaspard', say: 'Moi, j’y rentre sans problème !', penguin: pose('facepalm', 6),
        draw: (p, s, u) => {
          ice(p, p.floe - 1, L(p, 46)); iglooRising(p, L(p, 29), 1, 1);
          if (u < 0.7) flight(p, s, part(u, 0, 0.7), p.width, 5, L(p, 35), 12);
          else peek(p);
        },
      },
      {
        for: 6, say: 'Tant pis : il garde la porte en lisant.', penguin: pose('reading', 1),
        draw: (p, s) => { ice(p, p.floe - 1, L(p, 46)); iglooRising(p, L(p, 29), 1, 1 + beat(s, 1)); snoring(p, s); },
      },
    ],
  },
  {
    // A masterpiece, ruined by a wing… or is it?
    id: 'peintre', title: 'Le peintre', room: 46,
    beats: [
      { for: 4.5, who: 'Pingouin', say: 'Mon prochain chef-d’œuvre : la lune.', penguin: pose('painting'), draw: (p, s) => sparkles(p, p.width - 12, 3, s, 3) },
      { for: 4, say: 'La lune pose pour lui, bien sage.', penguin: pose('painting'), draw: (p, s) => sparkles(p, p.width - 12, 3, s, 4) },
      { for: 4, who: 'Gaspard', say: 'Hmm… tu as oublié les mouettes.', penguin: pose('painting'), draw: (p, s, u) => { ice(p, p.floe - 1, L(p, 40)); if (u < 0.75) flight(p, s, part(u, 0, 0.75), p.width, 5, L(p, 27), 9); else standing(p, L(p, 27)); } },
      {
        for: 4.5, say: 'Oups ! Un coup d’aile, et tout gicle !', penguin: startle('painting'),
        draw: (p, s, u) => {
          ice(p, p.floe - 1, L(p, 40));
          flying(p, L(p, 26), 8 - Math.round(Math.sin(Math.PI * u) * 2), s * 2);
          const colors = ['ee4250', 'ffd23f', '58b4ff', '74d27a', 'ffa6c4'];
          for (let i = 0; i < 9; i++) {
            const v = part(u, i * 0.05, 0.5 + i * 0.05);
            if (v > 0) dot(p.canvas, Math.round(lerp(L(p, 24), L(p, 17 + (i % 6)), v)), Math.round(lerp(10, 9 + (i % 4), v) - Math.sin(Math.PI * v) * 3), colors[i % 5]!);
          }
          exclaim(p);
        },
      },
      { for: 4, who: 'Pingouin', say: 'Mon chef-d’œuvre… gâché !', penguin: pose('painting'), draw: (p, s) => { ice(p, p.floe - 1, L(p, 40)); standing(p, L(p, 29), true); splashed(p); sweat(p, s); } },
      { for: 4.5, who: 'Gaspard', say: 'Gâché ? C’est encore plus beau !', penguin: bounce('painting', 1.2), draw: (p, s) => { ice(p, p.floe - 1, L(p, 40)); standing(p, L(p, 29)); splashed(p); hearts(p, L(p, 20), 6, s); } },
      { for: 5, say: 'Titre : « Gaspard, période bleue ».', penguin: pose('painting'), draw: (p, s) => { ice(p, p.floe - 1, L(p, 40)); standing(p, L(p, 29), beat(s, 1) === 1); splashed(p); sparkles(p, L(p, 20), 10, s, 4); } },
    ],
  },
  {
    // Too late, too early, just right.
    id: 'photo', title: 'La photo', room: 56,
    beats: [
      { for: 4, who: 'Pingouin', say: 'Bulle, ne bouge plus… souris !', penguin: pose('photographing'), draw: (p, s, u) => swimming(p, lerp(L(p, 50), L(p, 38), u)) },
      { for: 4, say: 'Clic !… Trop tard, il a plongé.', penguin: pose('photographing'), draw: (p, s, u) => { leap(p, part(u, 0, 0.6), L(p, 44), L(p, 36), 8); if (u > 0.75 && u < 0.85) flash(p, L(p, 18), 9); } },
      { for: 4.5, who: 'Pingouin', say: 'Il faut que je sois plus rapide…', penguin: pose('photographing'), draw: (p, s) => sweat(p, s) },
      { for: 4, say: 'Clic !… Trop tôt, cette fois !', penguin: pose('photographing'), draw: (p, s, u) => { if (u > 0.08 && u < 0.18) flash(p, L(p, 18), 9); leap(p, part(u, 0.35, 0.95), L(p, 36), L(p, 46), 8); } },
      { for: 3, who: 'Pingouin', say: 'Patience… patience…', penguin: pose('photographing'), draw: (p, s) => { for (let i = 0; i < 3; i++) if (s % 1.5 > i * 0.4) dot(p.canvas, L(p, 22 + i * 2), 5, 'd6e2ee'); } },
      {
        for: 4, say: 'Clic ! Pile au bon moment !', penguin: startle('photographing'),
        draw: (p, s, u) => { const v = u < 0.4 ? part(u, 0, 0.8) : u < 0.7 ? 0.5 : part(u, 0.3, 1.1); leap(p, v, L(p, 44), L(p, 34), 8, v >= 0.45 && v <= 0.55); if (u > 0.4 && u < 0.5) flash(p, L(p, 18), 9); },
      },
      {
        for: 6, who: 'Bulle', say: 'Alors ? Je suis beau, hein ?', penguin: bounce('happy', 1),
        // Bulle pops up beside his photo to admire himself.
        draw: (p, s, u) => { put(p.canvas, photo, Math.round(lerp(L(p, 16), L(p, 26), ease(part(u, 0, 0.4)))), Math.round(lerp(9, 6, ease(part(u, 0, 0.4)))) + beat(s, 1)); leap(p, part(u, 0.3, 0.75), L(p, 52), L(p, 44), 8, true); if (u > 0.75) swimming(p, L(p, 44)); },
      },
    ],
  },
  {
    // From one spectator to a whole crowd.
    id: 'concert', title: 'Le concert', room: 62,
    beats: [
      { for: 4.5, who: 'Pingouin', say: 'Bonsoir la banquise ! … Personne ?', penguin: pose('guitar'), draw: (p, s) => notes(p, L(p, 18), 9, s) },
      { for: 4.5, who: 'Gaspard', say: 'Moi ! Je ne rate jamais un concert.', penguin: pose('guitar'), draw: (p, s, u) => { ice(p, p.floe - 1, L(p, 42)); notes(p, L(p, 18), 9, s); if (u < 0.7) flight(p, s, part(u, 0, 0.7), p.width, 4, L(p, 31), 9); else standing(p, L(p, 31)); } },
      { for: 4.5, who: 'Bulle', say: 'Attendez-moi ! J’arrive en rythme !', penguin: pose('guitar'), draw: (p, s) => { ice(p, p.floe - 1, L(p, 42)); notes(p, L(p, 18), 9, s); standing(p, L(p, 31), beat(s, 2) === 1); leap(p, (s % 1.5) / 1.5, L(p, 56), L(p, 48), 7); } },
      { for: 5, say: 'Et maintenant, tout le monde chante !', penguin: alternate('singing', 'pleased', 2.5), draw: (p, s) => { ice(p, p.floe - 1, L(p, 42)); notes(p, L(p, 14), 7, s); standing(p, L(p, 31), beat(s, 2) === 1); leap(p, ((s + 0.7) % 1.5) / 1.5, L(p, 48), L(p, 56), 7); } },
      { for: 5, say: 'Quelle ambiance sur la banquise !', penguin: alternate('dancing', 'happy'), draw: (p, s) => { ice(p, p.floe - 1, L(p, 42)); flying(p, L(p, 30), 6 + beat(s, 3), s); notes(p, L(p, 18), 8, s); leap(p, (s % 1.2) / 1.2, L(p, 56), L(p, 48), 9); } },
      { for: 4, who: 'Pingouin', say: 'Merci, vous êtes adorables !', penguin: startle('pleased'), draw: (p, s) => { ice(p, p.floe - 1, L(p, 42)); standing(p, L(p, 31), true); hearts(p, L(p, 18), 7, s); } },
    ],
  },
  {
    // The first flower of the ice floe, and the hero who saves it.
    id: 'jardin', title: 'La fleur', room: 50,
    beats: [
      { for: 4.5, say: 'Il plante une graine dans la glace.', penguin: pose('gardening'), draw: (p, s) => garden(p, s, 0) },
      { for: 4.5, who: 'Pingouin', say: 'Un peu d’eau, beaucoup d’amour…', penguin: pose('gardening'), draw: (p, s) => garden(p, s, 1) },
      { for: 4, who: 'Pingouin', say: 'Une pousse ! Sur la banquise !', penguin: startle('gardening'), draw: (p, s) => { garden(p, s, 2); exclaim(p); } },
      { for: 5, say: 'Une fleur, la toute première de la banquise.', penguin: pose('gardening'), draw: (p, s) => { garden(p, s, 3, false); sparkles(p, L(p, 32), 11, s, 5); } },
      { for: 4, say: 'Il en tombe amoureux.', penguin: bounce('love', 1), draw: (p, s) => { garden(p, s, 3, false); hearts(p, L(p, 16), 6, s, 1); } },
      { for: 4, who: 'Gaspard', say: 'Miam… une fleur ! Ça se mange ?', penguin: startle('surprised'), draw: (p, s, u) => { garden(p, s, 3, false); flight(p, s, u, p.width, 4, L(p, 36), 8); exclaim(p); } },
      { for: 4.5, who: 'Pingouin', say: 'Halte-là ! Pas touche à ma fleur !', penguin: startle('hero'), draw: (p, s) => { garden(p, s, 3, false); flying(p, L(p, 36), 7 + beat(s, 2), s); } },
      { for: 5, who: 'Gaspard', say: 'Pardon… elle est vraiment belle.', penguin: pose('pleased'), draw: (p, s) => { garden(p, s, 3, false); ice(p, p.floe - 1, L(p, 46)); standing(p, L(p, 35), true); hearts(p, L(p, 30), 7, s); } },
    ],
  },
  {
    // A forgotten birthday… or so he thinks.
    id: 'fete', title: 'La surprise', room: 64,
    beats: [
      { for: 4.5, who: 'Pingouin', say: 'C’est mon anniversaire aujourd’hui !', penguin: pose('balloon'), caption: 3, behind: (p, s) => balloonBehind(p, s) },
      {
        for: 4.5, who: 'Pingouin', say: 'Mais personne ne s’en souvient…', penguin: pose('crying'), caption: 3,
        // The balloon it no longer holds floats beside it, its string trailing on the ice.
        behind: (p, s) => { balloonBehind(p, s, 1); for (let y = 11; y < FLOE; y++) dot(p.canvas, L(p, 22) + (y > 15 ? 1 : 0), y, '9aa8ba'); },
      },
      {
        for: 5, who: 'Gaspard', say: 'Surprise ! Un paquet rien que pour toi !', penguin: startle('surprised'),
        draw: (p, s, u) => {
          ice(p, p.floe - 1, L(p, 46));
          if (u < 0.75) { const e = part(u, 0, 0.75), x = lerp(p.width, L(p, 36), ease(e)), y = 4 + e * 2; flying(p, x, y, s); put(p.canvas, gift, Math.round(x) + 4, Math.round(y) + 7); }
          else { standing(p, L(p, 38)); put(p.canvas, gift, L(p, 29), Math.round(lerp(13, FLOE - gift.length, part(u, 0.75, 0.9)))); }
        },
      },
      { for: 3, who: 'Pingouin', say: 'Pour moi ?!', penguin: startle('surprised'), draw: (p) => { ice(p, p.floe - 1, L(p, 46)); standing(p, L(p, 38)); put(p.canvas, gift, L(p, 29), FLOE - gift.length); exclaim(p); } },
      { for: 4.5, say: 'Il ouvre son cadeau…', penguin: bounce('gift', 1.5), draw: (p, s) => { ice(p, p.floe - 1, L(p, 46)); standing(p, L(p, 38), beat(s, 1) === 1); sparkles(p, L(p, 14), 9, s, 7); } },
      { for: 5, who: 'Bulle', say: 'Joyeux anniversaire !', penguin: alternate('dancing', 'happy'), draw: (p, s) => { ice(p, p.floe - 1, L(p, 46)); standing(p, L(p, 38), beat(s, 2) === 1); leap(p, (s % 1.6) / 1.6, L(p, 60), L(p, 50), 9); confetti(p, s, L(p, 0), L(p, 60)); } },
      { for: 5, who: 'Gaspard', say: 'On ne t’avait pas oublié !', penguin: bounce('balloon', 1.5), caption: 3, behind: (p, s) => balloonBehind(p, s), draw: (p, s) => { ice(p, p.floe - 1, L(p, 46)); flying(p, L(p, 36), 7 + beat(s, 2), s); confetti(p, s, L(p, 0), L(p, 60)); hearts(p, L(p, 22), 8, s, 1); } },
    ],
  },
  {
    // An experiment that goes boom… and snows glitter.
    id: 'potion', title: 'La potion', room: 34,
    beats: [
      { for: 4.5, who: 'Pingouin', say: 'Une expérience très sérieuse…', penguin: pose('experimenting'), draw: (p, s) => bubbles(p, s, L(p, 22), 6) },
      { for: 4, say: 'La potion se met à bouillonner !', penguin: (s) => ({ pose: 'experimenting', dx: beat(s, 10), dy: 0 }), draw: (p, s) => { bubbles(p, s, L(p, 22), 6, 3); sweat(p, s); } },
      {
        for: 2.5, say: 'BOUM !', penguin: startle('surprised'),
        // A flash at the flask, then smoke billowing out from it.
        draw: (p, s, u) => {
          if (u < 0.25) put(p.canvas, boom, L(p, 17), 4);
          else {
            const puff = u < 0.7 ? smoke[0]! : smoke[1]!, out = part(u, 0.25, 1) * 6;
            put(p.canvas, puff, Math.round(L(p, 18) + out), 5); put(p.canvas, puff, Math.round(L(p, 10) - out / 2), Math.round(4 - out / 3)); put(p.canvas, puff, L(p, 14), Math.round(8 + out / 3));
          }
        },
      },
      { for: 4.5, who: 'Pingouin', say: 'Oh ! Il neige… des paillettes !', penguin: startle('surprised'), draw: (p, s) => confetti(p, s, L(p, 0), L(p, 34)) },
      { for: 4.5, say: 'Une expérience réussie… presque.', penguin: alternate('happy', 'dancing', 2), draw: (p, s) => confetti(p, s, L(p, 0), L(p, 34)) },
      { for: 4, who: 'Pingouin', say: 'Personne n’a rien vu, hein ?', penguin: pose('innocent'), draw: (p, s) => { for (let i = 0; i < 3; i++) dot(p.canvas, L(p, 18 + i * 2), 4 - beat(s + i * 0.3, 2), 'd6e2ee'); } },
    ],
  },
  {
    // A crown found in the snow: king for one night.
    id: 'roi', title: 'Le roi', room: 50,
    beats: [
      { for: 4.5, say: 'Il a trouvé une couronne dans la neige !', penguin: pose('king'), draw: (p, s) => sparkles(p, L(p, 10), 3, s, 5) },
      { for: 4, who: 'Pingouin', say: 'Je suis le roi de la banquise !', penguin: startle('hero') },
      { for: 4.5, who: 'Gaspard', say: 'Oui, Votre Majesté… hi hi !', penguin: pose('king'), draw: (p, s, u) => { ice(p, p.floe - 1, L(p, 40)); standing(p, L(p, 29), u > 0.3 && u < 0.8); } },
      { for: 4, who: 'Bulle', say: 'Une révérence pour le roi !', penguin: pose('king'), draw: (p, s, u) => { ice(p, p.floe - 1, L(p, 40)); standing(p, L(p, 29)); leap(p, part(u, 0, 0.8), L(p, 48), L(p, 42), 10, true); } },
      { for: 4.5, who: 'Pingouin', say: 'Premier décret : la fête pour tous !', penguin: alternate('dancing', 'happy'), draw: (p, s) => { ice(p, p.floe - 1, L(p, 40)); flying(p, L(p, 30), 6 + beat(s, 3), s); confetti(p, s, L(p, 0), L(p, 50)); } },
      { for: 4.5, say: 'Un règne glorieux… jusqu’à l’heure du dodo.', penguin: pose('pleased'), draw: (p, s) => { ice(p, p.floe - 1, L(p, 40)); standing(p, L(p, 29)); hearts(p, L(p, 16), 6, s); } },
    ],
  },
  {
    // A ghost story read at night, and the ghost that wasn't.
    id: 'fantome', title: 'Le fantôme', room: 40,
    beats: [
      { for: 4.5, say: 'Il lit une histoire de fantômes…', penguin: pose('reading') },
      { for: 4, who: 'Pingouin', say: 'Même pas peur. Enfin… un peu.', penguin: (s) => ({ pose: 'reading', dx: beat(s, 10), dy: 0 }), draw: (p, s) => sweat(p, s) },
      { for: 4, say: 'Une ombre approche dans la nuit…', penguin: pose('reading'), draw: (p, s, u) => ghost(p, Math.floor(s * 5) % 2 ? 'up' : 'down', Math.round(lerp(p.width, L(p, 24), ease(u))), 6) },
      { for: 3, who: 'Pingouin', say: 'AAAAH ! Un fantôme !', penguin: (s) => ({ pose: 'scared', dx: 0, dy: s < 0.4 ? -2 : 0 }), draw: (p) => { ghost(p, 'stand', L(p, 25), FLOE - gull.stand.length); exclaim(p); } },
      { for: 4, who: 'Gaspard', say: 'Bouh ! … Mais non, c’est moi !', penguin: pose('surprised'), draw: (p) => { ice(p, p.floe - 1, L(p, 36)); standing(p, L(p, 25)); } },
      { for: 5, say: 'Et ils rient aux éclats tous les deux.', penguin: alternate('happy', 'pleased', 3), draw: (p, s) => { ice(p, p.floe - 1, L(p, 36)); standing(p, L(p, 25), beat(s, 3) === 1); hearts(p, L(p, 20), 7, s, 1); } },
    ],
  },
  {
    // Three snowballs, a seagull, a fish: a game for everyone.
    id: 'balle', title: 'La partie', room: 60,
    beats: [
      { for: 4.5, say: 'Il jongle avec trois boules de neige.', penguin: (s) => ({ pose: Math.floor(s * 2.5) % 2 ? 'juggling2' : 'juggling', dx: 0, dy: 0 }), draw: (p, s) => juggled(p, s, 3) },
      {
        for: 4.5, say: 'Hop ! Gaspard en vole une au passage !', penguin: (s) => ({ pose: Math.floor(s * 2.5) % 2 ? 'juggling2' : 'juggling', dx: 0, dy: 0 }),
        draw: (p, s, u) => { juggled(p, s, 2); const x = lerp(p.width, L(p, 34), ease(u)); flying(p, x, 4, s); put(p.canvas, penguinProps.ball, Math.round(x) + 6, 10, penguinPalette); },
      },
      { for: 3, who: 'Pingouin', say: 'Hé ! Rends-la-moi !', penguin: startle('surprised'), draw: (p, s) => { flying(p, L(p, 36), 4 + beat(s, 2), s); put(p.canvas, penguinProps.ball, L(p, 42), 10 + beat(s, 2), penguinPalette); exclaim(p); } },
      {
        for: 4, who: 'Gaspard', say: 'Attrape, Bulle !', penguin: pose('right'),
        draw: (p, s, u) => { flying(p, L(p, 36), 4, s); const x = lerp(L(p, 42), L(p, 52), u), y = 10 - Math.sin(Math.PI * u) * 5 + u * 4; put(p.canvas, penguinProps.ball, Math.round(x), Math.round(y), penguinPalette); swimming(p, L(p, 51)); },
      },
      {
        for: 4, who: 'Bulle', say: 'Et hop, d’un coup de tête !', penguin: startle('happy'),
        draw: (p, s, u) => {
          flying(p, L(p, 36), 4, s); leap(p, part(u, 0, 0.5), L(p, 54), L(p, 50), 6);
          const v = part(u, 0.3, 1), x = lerp(L(p, 51), L(p, 18), v), y = 8 - Math.sin(Math.PI * v) * 6;
          if (v > 0) put(p.canvas, penguinProps.ball, Math.round(x), Math.round(y), penguinPalette);
        },
      },
      { for: 5, say: 'Une vraie partie de balle entre amis !', penguin: alternate('dancing', 'happy'), draw: (p, s) => { flying(p, L(p, 36), 5 + beat(s, 3), s); leap(p, (s % 1.6) / 1.6, L(p, 56), L(p, 48), 8); const v = (s % 2) / 2, x = lerp(L(p, 18), L(p, 48), v < 0.5 ? v * 2 : 2 - v * 2); put(p.canvas, penguinProps.ball, Math.round(x), Math.round(6 - Math.sin(Math.PI * ((v * 2) % 1)) * 4), penguinPalette); } },
    ],
  },
  {
    // Heavy steps, a huge bear… who is only hungry.
    id: 'ours', title: 'L’ours', room: 62,
    beats: [
      { for: 4.5, say: 'Boum… boum… des pas lourds approchent.', penguin: pose('right'), draw: (p, s) => { sweat(p, s); if (beat(s, 1.2)) exclaim(p); } },
      {
        for: 4.5, who: 'Pingouin', say: 'Un ours polaire ! Au secours !', penguin: (s) => ({ pose: 'scared', dx: 0, dy: s < 0.3 ? -2 : 0 }),
        draw: (p, s, u) => { ice(p, p.floe - 1, L(p, 50)); walkingBear(p, lerp(p.width, L(p, 33), ease(u)), s); },
      },
      { for: 4.5, say: 'Mais l’ours se met à pleurer…', penguin: pose('surprised'), draw: (p, s) => { ice(p, p.floe - 1, L(p, 50)); sittingBear(p, L(p, 34), 'sad', s); } },
      { for: 4.5, who: 'Nounours', say: 'J’ai si faim… mon ventre gargouille.', penguin: pose('thinking'), draw: (p, s) => { ice(p, p.floe - 1, L(p, 50)); sittingBear(p, L(p, 34), 'sad', s); } },
      {
        for: 4.5, who: 'Pingouin', say: 'Tiens, prends mon poisson !', penguin: (s, u) => ({ pose: u < 0.4 ? 'eating' : 'pleased', dx: 0, dy: 0 }),
        draw: (p, s, u) => {
          ice(p, p.floe - 1, L(p, 50)); sittingBear(p, L(p, 34), u < 0.8 ? 'sad' : 'happy', s);
          const v = part(u, 0.4, 0.85);
          if (v > 0 && v < 1) put(p.canvas, smallFish, Math.round(lerp(L(p, 16), L(p, 37), v)), Math.round(10 - Math.sin(Math.PI * v) * 6));
        },
      },
      { for: 4.5, who: 'Nounours', say: 'Merci ! Moi, c’est Nounours. Amis ?', penguin: startle('surprised'), draw: (p, s) => { ice(p, p.floe - 1, L(p, 50)); sittingBear(p, L(p, 34), 'happy', s); } },
      { for: 5, say: 'Le plus gros des amis… et le plus gourmand.', penguin: bounce('love', 1), draw: (p, s) => { ice(p, p.floe - 1, L(p, 50)); sittingBear(p, L(p, 34), 'happy', s); hearts(p, L(p, 30), 7, s); } },
    ],
  },
  {
    // A giant spout, a whale, and a ride under the stars.
    id: 'baleine', title: 'La baleine', room: 66,
    beats: [
      { for: 4.5, say: 'Pas une vague, pas un bruit…', penguin: pose('right') },
      { for: 3.5, say: 'Pschhh ! Un jet d’eau géant !', penguin: startle('surprised'), draw: (p, s) => spout(p, L(p, 47), 11, s) },
      {
        for: 5, who: 'Bernadette', say: 'Bonsoir, petit ! Je suis Bernadette.', penguin: pose('right'),
        draw: (p, s, u) => { const y = Math.round(lerp(20, 15, ease(part(u, 0, 0.6)))); bernadette(p, L(p, 40), y, s); if (u > 0.6) spout(p, L(p, 47), y - 4, s); },
      },
      { for: 4.5, who: 'Bernadette', say: 'Monte sur mon dos, on fait un tour !', penguin: bounce('waving', 2), draw: (p, s) => bernadette(p, L(p, 40), 15, s) },
      {
        for: 5, say: 'Il grimpe sur le dos de la baleine !', caption: 14, penguin: (s) => aboard(walk(0, 14, 4, 'right')(s)),
        draw: (p, s, u) => bernadette(p, Math.round(lerp(L(p, 40), L(p, 24), ease(part(u, 0, 0.4)))), 15, s),
      },
      { for: 5.5, who: 'Pingouin', say: 'Wouhou ! Quelle balade !', caption: 14, penguin: (s) => aboard({ pose: 'happy', dx: 14 + Math.round(Math.sin(s * 1.2) * 2), dy: beat(s, 1) ? -1 : 0 }), draw: (p, s) => { bernadette(p, L(p, 24) + Math.round(Math.sin(s * 1.2) * 2), 15, s); starry(p, s); } },
      {
        for: 4, say: 'Pschhh ! Une douche en prime !', caption: 14, penguin: (s) => aboard({ pose: 'surprised', dx: 14, dy: s < 0.3 ? -1 : 0 }),
        draw: (p, s, u) => { bernadette(p, L(p, 24), 15, s); spout(p, L(p, 31), 10, s); for (let i = 0; i < 6; i++) dot(p.canvas, L(p, 18 + i * 2), Math.round(2 + ((u * 6 + i) % 4)), i % 2 ? '58b4ff' : '9fe3ff'); },
      },
      {
        for: 4.5, who: 'Pingouin', say: 'Merci, Bernadette !', caption: 14, penguin: (s) => aboard(walk(14, 0, 3.5, 'left')(s)),
        draw: (p, s, u) => bernadette(p, Math.round(lerp(L(p, 24), L(p, 44), part(u, 0.5, 1))), Math.round(lerp(15, 20, part(u, 0.6, 1))), s),
      },
    ],
  },
  {
    // A seal's trick, a snowball on the head, and a game for two.
    id: 'phoque', title: 'Le phoque', room: 58,
    beats: [
      { for: 4.5, who: 'Pistache', say: 'Mesdames et messieurs, mon numéro !', penguin: pose('right'), draw: (p, s) => { ice(p, p.floe - 1, L(p, 48)); pistache(p, s, 1); } },
      { for: 4, say: 'Une boule de neige… en équilibre !', penguin: startle('surprised'), draw: (p, s) => { ice(p, p.floe - 1, L(p, 48)); pistache(p, s, 0.2); } },
      { for: 4, who: 'Pingouin', say: 'À moi ! Ça a l’air facile…', penguin: pose('juggling'), draw: (p, s) => { ice(p, p.floe - 1, L(p, 48)); pistache(p, s, 0); put(p.canvas, penguinProps.ball, L(p, 9) + beat(s, 3), 0 + beat(s, 2), penguinPalette); } },
      {
        for: 4.5, say: 'Boing ! Elle lui tombe sur la tête.', penguin: (s) => ({ pose: s < 0.5 ? 'surprised' : 'closed', dx: 0, dy: s < 0.6 && s > 0.4 ? 1 : 0 }),
        draw: (p, s, u) => { ice(p, p.floe - 1, L(p, 48)); pistache(p, s, 0); if (u < 0.2) put(p.canvas, penguinProps.ball, L(p, 9), Math.round(u * 5), penguinPalette); else sparkles(p, L(p, 10), 2, s, 6); },
      },
      { for: 4.5, who: 'Pistache', say: 'Doucement… regarde-moi faire !', penguin: pose('thinking'), draw: (p, s) => { ice(p, p.floe - 1, L(p, 48)); pistache(p, s, 0.6); } },
      {
        for: 5, say: 'Et les voilà qui jonglent à deux !', penguin: (s) => ({ pose: Math.floor(s * 2) % 2 ? 'juggling2' : 'juggling', dx: 0, dy: 0 }),
        draw: (p, s) => {
          ice(p, p.floe - 1, L(p, 48)); pistache(p, s, 0, false);
          const v = (s % 2) / 2, w = v < 0.5 ? v * 2 : 2 - v * 2;
          put(p.canvas, penguinProps.ball, Math.round(lerp(L(p, 11), L(p, 28), w)), Math.round(7 - Math.sin(Math.PI * ((v * 2) % 1)) * 5), penguinPalette);
        },
      },
      { for: 4.5, who: 'Gaspard', say: 'Bravo ! Bravo ! Encore !', penguin: alternate('happy', 'pleased', 2), draw: (p, s) => { ice(p, p.floe - 1, L(p, 48)); pistache(p, s, 0.2); flying(p, L(p, 40), 4 + beat(s, 3), s * 1.5); hearts(p, L(p, 22), 8, s); } },
    ],
  },
  {
    // The sky lights up, and everyone comes to watch.
    id: 'aurore', title: 'L’aurore', room: 50,
    beats: [
      { for: 4.5, say: 'Une lueur étrange sur les montagnes…', penguin: pose('right'), draw: (p, s, u) => northernLights(p, s, 0.15 + u * 0.25) },
      { for: 3.5, who: 'Pingouin', say: 'Oh ! Le ciel s’allume !', penguin: startle('surprised'), draw: (p, s, u) => northernLights(p, s, 0.4 + u * 0.6) },
      { for: 5, say: 'Une aurore boréale ! Le ciel danse !', penguin: alternate('happy', 'right', 1), draw: (p, s) => northernLights(p, s, 1) },
      {
        for: 5, who: 'Gaspard', say: 'Bulle ! Viens voir ça !', penguin: pose('right'),
        draw: (p, s, u) => { northernLights(p, s, 1); ice(p, p.floe - 1, L(p, 42)); if (u < 0.6) flight(p, s, part(u, 0, 0.6), p.width, 4, L(p, 31), 9); else standing(p, L(p, 31)); swimming(p, lerp(p.width - 4, L(p, 46), clamp(u * 1.5))); },
      },
      { for: 5, say: 'Ils restent là, sans un mot…', penguin: pose('pleased'), draw: (p, s) => { northernLights(p, s, 1); ice(p, p.floe - 1, L(p, 42)); standing(p, L(p, 31)); swimming(p, L(p, 46)); } },
      { for: 5, who: 'Bulle', say: 'C’est le plus beau spectacle du monde.', penguin: bounce('love', 0.8), draw: (p, s, u) => { northernLights(p, s, 1 - u * 0.5); ice(p, p.floe - 1, L(p, 42)); standing(p, L(p, 31), true); swimming(p, L(p, 46)); hearts(p, L(p, 18), 8, s, 1); } },
    ],
  },
  {
    // A midnight swim, and a fish who keeps it company.
    id: 'baignade', title: 'La baignade', room: 70,
    beats: [
      { for: SWIM.jump, who: 'Pingouin', say: 'Un plongeon ?', penguin: (s) => swimFrame(s), draw: swimDrawing(0) },
      { for: SWIM.plunge - SWIM.jump + 1, say: 'Plouf !', penguin: (s) => swimFrame(SWIM.jump + s), draw: swimDrawing(SWIM.jump) },
      { for: 4.5, who: 'Pingouin', say: 'Ahhh… qu’on est bien !', penguin: (s) => swimFrame(SWIM.plunge + 1 + s), draw: (p, s, u) => { swimDrawing(SWIM.plunge + 1)(p, s, u); swimming(p, lerp(p.width - 4, L(p, 58), u)); } },
      { for: SWIM.float - SWIM.plunge - 5.5, who: 'Bulle', say: 'Je peux nager avec toi ?', penguin: (s) => swimFrame(SWIM.plunge + 5.5 + s), draw: (p, s, u) => { swimDrawing(SWIM.plunge + 5.5)(p, s, u); leap(p, part(u, 0.1, 0.6), L(p, 68), L(p, 58), 9, true); hearts(p, L(p, 56), 8, s, 1); } },
      { for: SWIM.home - SWIM.float, who: 'Pingouin', say: 'Demain, promis ! Je suis gelé !', penguin: (s) => swimFrame(SWIM.float + s), draw: swimDrawing(SWIM.float) },
    ],
  },
];

/** Nounours walking along the ice, paw after paw. */
function walkingBear(place: StoryPlace, x: number, s: number): void {
  put(place.canvas, Math.floor(s * 3) % 2 ? bear.step : bear.walk, Math.round(x), FLOE - bear.walk.length);
}

/** Nounours sitting, facing us: tears when he is sad, a smile and pink cheeks when he is happy. */
function sittingBear(place: StoryPlace, x: number, mood: 'sad' | 'happy', s: number): void {
  const y = FLOE - bear.sit.length;
  put(place.canvas, bear.sit, x, y);
  if (mood === 'sad') {
    const drop = Math.floor((s * 2) % 3);
    dot(place.canvas, x + 3, y + 4 + drop, '58b4ff');
    dot(place.canvas, x + 8, y + 4 + ((drop + 1) % 3), '58b4ff');
  } else {
    for (const [dx, dy] of [[4, 6], [5, 7], [6, 7], [7, 6]] as const) dot(place.canvas, x + dx, y + dy, '0a0d16');
    dot(place.canvas, x + 2, y + 5, 'ffa6c4'); dot(place.canvas, x + 9, y + 5, 'ffa6c4');
  }
}

/** A whale's spout, its drops dancing. */
function spout(place: StoryPlace, x: number, y: number, s: number): void {
  put(place.canvas, whale.spout[Math.floor(s * 4) % 2]!, x, y);
}

/** Bernadette, her back at row `y` (lower is further under), her tail waving behind her. */
function bernadette(place: StoryPlace, x: number, y: number, s: number): void {
  put(place.canvas, whale.back, x, y);
  put(place.canvas, whale.tail, x + whale.back[0]!.length, y - 2 + beat(s, 1.5));
}

/** Out over the sea, the penguin stands on Bernadette's back, a little higher than the ice. */
function aboard(frame: Frame): Frame {
  return frame.dx >= 8 ? { ...frame, dy: frame.dy - 2 } : frame;
}

/** Pistache on the ice, a snowball on his nose wobbling by `wobble` (0: still, 1: bouncing). */
function pistache(place: StoryPlace, s: number, wobble: number, ball = true): void {
  const x = L(place, 30), y = FLOE - seal.length;
  put(place.canvas, seal, x, y);
  if (!ball) return;
  const bounce = Math.round(Math.abs(Math.sin(s * 3)) * 3 * Math.max(0, wobble - 0.5) * 2);
  put(place.canvas, penguinProps.ball, x - 1 + Math.round(Math.sin(s * 4) * wobble), y - 2 - bounce, penguinPalette);
}

const mixHex = (a: string, b: string, t: number) => [0, 2, 4]
  .map((i) => Math.round(parseInt(a.slice(i, i + 2), 16) * (1 - t) + parseInt(b.slice(i, i + 2), 16) * t).toString(16).padStart(2, '0')).join('');

/** The northern lights: curtains of green and violet waving over the mountains, `strength` 0 → 1. */
function northernLights(place: StoryPlace, s: number, strength: number): void {
  for (let x = L(place, 22); x < place.width; x++) {
    const top = 2.5 + Math.sin(x * 0.11 + s * 0.7) * 1.6 + Math.sin(x * 0.037 - s * 0.4) * 1.4;
    const height = 6 + Math.sin(x * 0.2 + s) * 1.5;
    for (let y = Math.max(1, Math.floor(top)); y <= Math.min(12, top + height); y++) {
      // Only the sky itself glows: the stars and the moon stay in front.
      if (place.canvas[y]?.[x] !== backdrop(y)) continue;
      const k = (y - top) / height, glow = 1.35 * strength * (0.7 + 0.3 * Math.sin(x * 0.27 + s * 1.6)) * Math.max(0, 1 - Math.abs(k - 0.5) * 1.1);
      const color = k < 0.35 ? aurora[4]! : k < 0.6 ? aurora[3]! : aurora[2]!;
      place.canvas[y]![x] = mixHex(backdrop(y), color, clamp(glow));
    }
  }
}

/** Bulle hooked, hanging from the line by his mouth, wriggling. */
function hooked(place: StoryPlace, s: number): void {
  put(place.canvas, Math.floor(s * 3) % 2 ? fish.swim : fish.flick, L(place, 24), 7 + (Math.floor(s * 3) % 2));
}

/** Gaspard as a shadow in the night: only his eyes shine. */
function ghost(place: StoryPlace, shape: 'up' | 'down' | 'stand', x: number, y: number): void {
  put(place.canvas, gull[shape], x, y, shadow);
  const [ex, ey] = ({ up: [3, 5], down: [4, 3], stand: [2, 1] } as const)[shape];
  dot(place.canvas, x + ex, y + ey, 'ffd23f');
  dot(place.canvas, x + ex + 1, y + ey, 'ffd23f');
}

/** Gaspard's head poking out of the igloo's door. */
function peek(place: StoryPlace): void {
  put(place.canvas, gullHead, L(place, 34), FLOE - 4);
}
/** Gaspard asleep in the igloo: little z's rise from its door. */
function snoring(place: StoryPlace, s: number): void {
  for (let i = 0; i < 2; i++) {
    const u = (s * 0.5 + i / 2) % 1;
    put(place.canvas, zed, L(place, 38 + i * 3) + Math.round(u * 3), Math.round(FLOE - 8 - u * 6));
  }
}

/** A little floe out at sea, Gaspard's nest. */
function nest(place: StoryPlace): void {
  ice(place, L(place, 48), L(place, 66));
}

/** The fallen star, dim on the ice, blinking weakly. */
function fallen(place: StoryPlace, s: number): void {
  const dim = Math.floor(s * 2) % 2 ? star.head.map((row) => row.replace(/W/g, 'Y')) : star.head;
  put(place.canvas, dim, L(place, 31), FLOE - star.head.length);
}

/** Snowballs juggled over its head, `count` of them. */
function juggled(place: StoryPlace, s: number, count: number): void {
  for (let i = 0; i < count; i++) {
    const u = (s / 1.5 + i / 3) % 1;
    if (u > 0.8) continue;
    const v = u / 0.8;
    put(place.canvas, penguinProps.ball, place.left - 3 + Math.round(v * 24), Math.round(6 - Math.sin(Math.PI * v) * 7), penguinPalette);
  }
}

/** Paint on the easel's canvas, where the wing knocked the palette. */
function splashed(place: StoryPlace): void {
  const colors = ['ee4250', 'ffd23f', '58b4ff', '74d27a', 'ffa6c4'];
  [[17, 10], [19, 9], [21, 12], [18, 13], [20, 11], [22, 10]].forEach(([x, y], i) => dot(place.canvas, place.left + x!, y!, colors[i % 5]!));
}

/** The flower patch beyond the floe, the can's water falling on it. */
function garden(place: StoryPlace, s: number, stage: number, watering = true): void {
  ice(place, place.floe - 1, place.left + 40);
  const bloom = flower[stage]!;
  put(place.canvas, bloom, place.left + 28, FLOE - bloom.length);
  if (watering) for (let i = 0; i < 3; i++) dot(place.canvas, place.left + 30 + (i % 2), Math.floor(13 + ((s * 1.5 + i / 3) % 1) * 4), '6cbcfd');
}

/** The balloon on its string, swaying behind the penguin, `dx` pixels from its place. */
function balloonBehind(place: StoryPlace, s: number, dx = 0): void {
  put(place.canvas, penguinProps.balloon, place.left + dx + 18, Math.sin(s * 2.2) > 0.3 ? 1 : 0, penguinPalette);
}

/** The swim's ring, splashes and ripples, at `from` seconds into the swim. */
function swimDrawing(from: number): Draw {
  return (place, s) => {
    const seconds = from + s;
    drawActivity({ name: 'swim', seconds }, swimFrame(seconds), { canvas: place.canvas, left: place.left, sea: place.sea, floe: place.floe });
  };
}

/** Seconds the story lasts. */
export function storyLength(story: Story): number {
  return TITLE_FOR + story.beats.reduce((sum, beat) => sum + beat.for, 0);
}
/** Seconds the episode's title shows alone, like a card, before its first shot. */
export const TITLE_FOR = 2.5;

/** The shot playing `seconds` into the story, how far into it, and where it starts. */
export function storyBeat(story: Story, seconds: number): { beat: Beat; index: number; s: number; u: number; start: number; title?: true } | undefined {
  // The title card: the first shot's scene, still, under the episode's name.
  if (seconds < TITLE_FOR) return { beat: story.beats[0]!, index: 0, s: 0, u: 0, start: 0, title: true };
  let start = TITLE_FOR;
  for (const [index, beat] of story.beats.entries()) {
    if (seconds < start + beat.for) {
      const s = Math.max(0, seconds - start);
      return { beat, index, s, u: s / beat.for, start };
    }
    start += beat.for;
  }
  return undefined;
}

/** Whether the story fits a band `columns` wide, the penguin's box at `left`. */
export function storyFits(story: Story, columns: number, left: number, snowman: boolean): boolean {
  return columns >= left + story.room + (snowman ? storyShift(story) : 0) && (!story.snowman || snowman);
}

const shifts = new Map<string, number>();
/**
 * Pixels the penguin stands further right for the whole episode when Flocon
 * is beside it: its widest poses (a palette, a cape) would cover him. The
 * same for every shot, so it never jumps from one to the next.
 */
export function storyShift(story: Story): number {
  let shift = shifts.get(story.id);
  if (shift === undefined) {
    let leftmost = 0;
    for (const beat of story.beats) {
      for (let s = 0; s <= beat.for; s += 0.25) {
        const frame = beat.penguin(s, Math.min(1, s / beat.for)), rows = penguinPoses[frame.pose];
        const first = Math.min(...rows.map((row) => { const i = row.search(/[^.]/); return i < 0 ? Infinity : i; }));
        leftmost = Math.min(leftmost, (PENGUIN_WIDTH - rows[0]!.length) / 2 + first + frame.dx);
      }
    }
    // One pixel of the box may stay empty on the left: the gap to Flocon.
    shift = Math.max(0, -1 - leftmost);
    shifts.set(story.id, shift);
  }
  return shift;
}

