#!/usr/bin/env node
// A tiny interactive CLI used as the system under test.
import readline from 'node:readline';

const rl = readline.createInterface({ input: process.stdin, output: process.stdout, prompt: 'todo> ' });
const items = [];

console.log('Welcome to Todo CLI');
console.log('Commands: add <text>, list, done <n>, quit');
rl.prompt();

rl.on('line', (line) => {
  const [cmd, ...rest] = line.trim().split(' ');
  const arg = rest.join(' ');
  if (cmd === 'add' && arg) {
    items.push({ text: arg, done: false });
    console.log(`Added: ${arg}`);
  } else if (cmd === 'list') {
    if (!items.length) console.log('Nothing to do');
    items.forEach((it, i) => console.log(`${i + 1}. [${it.done ? 'x' : ' '}] ${it.text}`));
  } else if (cmd === 'done' && items[Number(arg) - 1]) {
    items[Number(arg) - 1].done = true;
    console.log(`Completed: ${items[Number(arg) - 1].text}`);
  } else if (cmd === 'quit') {
    console.log('Bye');
    process.exit(0);
  } else if (cmd) {
    console.log(`Unknown command: ${cmd}`);
  }
  rl.prompt();
});
