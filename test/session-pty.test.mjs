import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import xterm from '@xterm/headless';

// The driver's terminal: 27 rows, the AI on the first 17, the band on the last 10.
const ROWS = 27, BAND = 10;

test('real PTY launcher: the penguin reacts on its own below the AI, input is forwarded and it exits with its child', { timeout: 55000 }, async (t) => {
  const child = spawn(process.execPath, [
    fileURLToPath(new URL('./fixtures/pty-driver.mjs', import.meta.url)),
    process.execPath, fileURLToPath(new URL('./fixtures/session-ai.mjs', import.meta.url)),
  ], {
    windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, ICECREW_INTRO: '0' },
  });
  // Only the cells that change are sent, so a caption may arrive in pieces:
  // the output is replayed on a screen and the band is read from it, as a user sees it.
  const screen = new xterm.Terminal({ cols: 80, rows: ROWS, allowProposedApi: true });
  const captions = ['SUSPECT · Hmm… louche.', 'FACEPALM · Bruh.'], seen = new Set();
  const band = () => {
    const buffer = screen.buffer.active;
    return Array.from({ length: BAND }, (_, i) => buffer.getLine(buffer.viewportY + ROWS - BAND + i)?.translateToString(true) ?? '').join('\n');
  };
  let output = '', errors = '';
  const exited = once(child, 'close');
  // Decoded as a stream: a multibyte character (« … ») may straddle two chunks.
  child.stdout.setEncoding('utf8');
  child.stderr.setEncoding('utf8');
  child.stdout.on('data', (data) => {
    output += data;
    screen.write(data, () => { const text = band(); for (const caption of captions) if (text.includes(caption)) seen.add(caption); });
  });
  child.stderr.on('data', (data) => { errors += data; });
  t.after(() => { if (child.exitCode === null) child.kill(); screen.dispose(); });
  const [exitCode] = await exited;
  await new Promise((resolve) => screen.write('', resolve));
  assert.equal(exitCode, 0, errors + output.slice(-3000));
  assert.match(output, /SESSION_READY/, 'the child runs interactively');
  // A permission prompt, then an interruption: suspense, then a facepalm.
  assert.deepEqual(captions.filter((caption) => !seen.has(caption)), [], 'band captions');
  assert.match(output, /Interrupted by user/, 'the AI stays on screen');
  assert.match(output, /SESSION_DONE/);
  assert.match(output, /WORK_[4-9]\d/, 'AI output keeps flowing');
});
