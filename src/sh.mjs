import { spawn } from 'node:child_process';

export function run(cmd, args) {
  return new Promise((res, rej) => {
    const p = spawn(cmd, args);
    let out = '', err = '';
    p.stdout.on('data', (d) => { out += d; });
    p.stderr.on('data', (d) => { err += d; });
    p.on('error', rej);
    p.on('close', (c) => (c === 0 ? res({ out, err }) : rej(new Error(cmd + ' a échoué : ' + err.slice(-400)))));
  });
}

export async function duration(file) {
  const { out } = await run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file]);
  return parseFloat(out);
}
