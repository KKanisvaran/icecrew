import pty from 'node-pty';
import { join } from 'node:path';
import { ambientEnabled } from '../dist/ambient.js';
import { playIntro } from '../dist/intro.js';
import { InputReader, leftClick, MOUSE_OFF, MOUSE_ON } from '../dist/mouse.js';
import { SessionTerminal } from '../dist/session-terminal.js';
import { ensureSpawnHelper } from './pty-helper.mjs';

const args = process.argv.slice(2);
if (args[0] === '--') args.shift();
if (args[0] === '--help') {
  console.log('Usage : icecrew codex [arguments] (ou claude, gemini)\n'
    + 'Un pingouin vit dans un bandeau sous l’IA et réagit tout seul à ce qu’elle fait,\n'
    + 'sans jamais la recouvrir (ICECREW_AMBIENT=0 pour le retirer). Clique dessus : il te répond.');
} else if (!process.stdin.isTTY || !process.stdout.isTTY) {
  console.error('Lancez icecrew codex directement dans un terminal interactif (sans capture ni pipeline).');
  process.exitCode = 1;
} else {
  // The KK LAB mascot draws itself at every launch.
  if (process.env.ICECREW_INTRO !== '0') await playIntro(process.stdout, process.stdin);
  await run(args.length ? args : ['codex']);
  // ConPTY can retain worker handles after onExit. The child has already
  // exited and the screen is restored; flush output before closing our host.
  process.stdout.write('', () => process.exit(process.exitCode ?? 0));
}

async function run(command) {
  let child, screen, stop = false, entered = false;
  let input, resize;
  const wasRaw = process.stdin.isRaw;
  try {
    screen = new SessionTerminal(process.stdout, { ambient: ambientEnabled() });
    let executable = command[0], arguments_ = command.slice(1);
    if (process.platform === 'win32') {
      if (['codex', 'gemini', 'npm', 'npx'].includes(executable)) executable += '.cmd';
      // PowerShell resolves npm .cmd shims as well as native executables.
      // Every user argument is a single-quoted literal, never executable code.
      // PowerShell also closes single quotes on typographic quotes: double them all.
      const quote = (value) => `'${value.replace(/['‘’‚‛]/g, '$&$&')}'`;
      const script = `$ErrorActionPreference = 'Stop'; try { & ${quote(executable)} ${arguments_.map(quote).join(' ')}; if ($null -ne $LASTEXITCODE) { exit $LASTEXITCODE } } catch { [Console]::Error.WriteLine($_.Exception.Message); exit 1 }`;
      executable = join(process.env.SystemRoot ?? 'C:\\Windows', 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
      arguments_ = ['-NoLogo', '-NoProfile', '-EncodedCommand', Buffer.from(script, 'utf16le').toString('base64')];
    }
    ensureSpawnHelper();
    child = pty.spawn(executable, arguments_, {
      name: 'xterm-256color', cols: screen.terminal.cols, rows: screen.terminal.rows,
      useConptyDll: true,
      cwd: process.cwd(), env: { ...process.env, TERM: 'xterm-256color' },
    });
    const exited = new Promise((resolve) => child.onExit(resolve));
    child.onData((data) => { void screen.write(data); });
    // Replies to terminal protocol queries, not synthetic user input.
    screen.terminal.onData((data) => { if (!stop) child.write(data); });
    // The mouse wheel scrolls the AI's history, like a page; any key brings
    // the live screen back. An AI that asked for the mouse gets it instead.
    // Below the AI, a click goes to the penguin.
    const terminalInput = new InputReader();
    input = (data) => {
      if (stop) return;
      const { keys, wheel, reports } = terminalInput.read(data.toString('utf8'));
      const band = reports.filter((report) => report.row > screen.terminal.rows);
      for (const report of band) if (leftClick(report)) screen.click(report.column - 1, report.row - screen.terminal.rows - 1);
      if (screen.terminal.modes.mouseTrackingMode !== 'none') {
        for (const report of reports) if (report.row <= screen.terminal.rows) child.write(report.raw);
      } else if (wheel) screen.scroll(wheel * 3);
      if (!keys) return;
      if (screen.scrolledBack) screen.scroll(0);
      screen.noteInput();
      child.write(keys);
    };
    resize = () => {
      if (stop) return;
      const cols = Math.max(1, process.stdout.columns), rows = Math.max(1, process.stdout.rows);
      screen.resize(cols, rows);
      try { child.resize(screen.terminal.cols, screen.terminal.rows); } catch { /* The child may just have exited. */ }
    };
    process.stdout.write(`\x1b[?1049h${MOUSE_ON}\x1b[2J\x1b[H`);
    entered = true;
    process.stdin.setRawMode(true);
    process.stdin.setEncoding('utf8');
    process.stdin.resume();
    process.stdin.on('data', input);
    process.stdout.on('resize', resize);
    const { exitCode } = await exited;
    stop = true;
    process.exitCode = exitCode;
  } catch (error) {
    stop = true;
    process.exitCode = 1;
    if (entered) process.stdout.write(`${MOUSE_OFF}\x1b[?1049l`);
    entered = false;
    console.error(`Lancement impossible : ${error.message}`);
  } finally {
    stop = true;
    if (input) process.stdin.off('data', input);
    if (resize) process.stdout.off('resize', resize);
    process.stdin.setRawMode(Boolean(wasRaw));
    process.stdin.pause();
    await screen?.dispose();
    if (entered) process.stdout.write(`\x1b[?2026l\x1b[0m\x1b[?1l\x1b[?2004l${MOUSE_OFF}\x1b[?25h\x1b[?1049l`);
  }
}
