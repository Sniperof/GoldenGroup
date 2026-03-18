import { spawn } from 'child_process';
import { start } from './index.js';

await start();

const vite = spawn('npx', ['vite'], {
  stdio: 'inherit',
  env: process.env,
  shell: true,
});

process.on('SIGTERM', () => {
  vite.kill();
  process.exit(0);
});

process.on('SIGINT', () => {
  vite.kill();
  process.exit(0);
});

vite.on('exit', (code) => {
  process.exit(code || 0);
});
