#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { playIntro } from '../dist/intro.js';

const [command, ...rest] = process.argv.slice(2);
const run = (script, args) => {
  // The scripts read their own arguments from process.argv.
  process.argv = [process.argv[0], script, ...args];
  return import(new URL(`../scripts/${script}`, import.meta.url));
};

const help = `icecrew : un pingouin compagnon qui vit sous ton IA en terminal.

Usage :
  icecrew codex [arguments]             Lance Codex avec le pingouin
  icecrew claude [arguments]            Lance Claude Code avec le pingouin
  icecrew gemini [arguments]            Lance Gemini CLI avec le pingouin
  icecrew intro                         Rejoue l'intro KK LAB
  icecrew --version`;

try {
  if (!command || command === '--help' || command === '-h' || command === 'help') console.log(help);
  else if (command === '--version' || command === '-v') {
    console.log(JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')).version);
  } else if (command === 'intro') await playIntro();
  else if (['setup', 'serve', 'demo', 'watch'].includes(command)) {
    // The keywords and their MCP server are gone: the penguin needs no setup.
    throw new Error(`la commande ${command} n'existe plus : le pingouin réagit tout seul, il n'y a rien à configurer. Lance par exemple : icecrew codex`);
  } else await run('session.mjs', [command, ...rest]);
} catch (error) {
  console.error(`icecrew : ${error.message}`);
  process.exitCode = 1;
}
