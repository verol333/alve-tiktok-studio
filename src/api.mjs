import { writeFileSync } from 'node:fs';
const API = process.env.API_URL, ID = process.env.SCRIPT_ID, TOKEN = process.env.JOB_TOKEN;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// Appel au serveur AL VE CAPITAL (jeton à usage unique du montage).
export async function api(action, extra = {}) {
  let last;
  for (let i = 0; i < 4; i++) {
    try {
      const r = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.assign({ script_id: ID, token: TOKEN, action }, extra)) });
      const j = await r.json().catch(() => ({}));
      if (r.ok) return j;
      last = new Error(j.error || ('HTTP ' + r.status));
      if (r.status === 400 || r.status === 403) throw Object.assign(last, { fatal: true });
    } catch (e) { last = e; if (e.fatal) throw e; }
    await wait(2000 * (i + 1));
  }
  throw last;
}

export async function download(url, path) {
  for (let i = 0; i < 3; i++) {
    try {
      const r = await fetch(url);
      if (r.ok) { writeFileSync(path, Buffer.from(await r.arrayBuffer())); return; }
    } catch (e) { /* nouvel essai */ }
    await wait(1500 * (i + 1));
  }
  throw new Error('Téléchargement impossible : ' + url);
}
