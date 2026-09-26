import { GlobalFonts, loadImage } from '@napi-rs/canvas';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

const FONT_BASE = 'https://raw.githubusercontent.com/google/fonts/main/ofl/';
const FONTS = {
  display: ['anton/Anton-Regular.ttf', 'Anton'],
  black: ['poppins/Poppins-Black.ttf', 'PoppinsBlack'],
  xb: ['poppins/Poppins-ExtraBold.ttf', 'PoppinsXB'],
  sb: ['poppins/Poppins-SemiBold.ttf', 'PoppinsSB'],
};

async function get(url, tries = 3) {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (alve-studio)' } });
      if (r.ok) return Buffer.from(await r.arrayBuffer());
      if (r.status === 404) return null;
    } catch (e) { /* nouvel essai */ }
    await new Promise((r) => setTimeout(r, 1500 * (i + 1)));
  }
  return null;
}

export async function loadFonts(dir) {
  const F = {};
  for (const [k, [path, name]] of Object.entries(FONTS)) {
    const buf = await get(FONT_BASE + path);
    if (!buf) throw new Error('Police introuvable : ' + name);
    const f = join(dir, name + '.ttf');
    writeFileSync(f, buf);
    GlobalFonts.registerFromPath(f, name);
    F[k] = name;
  }
  return F;
}

// Polices « affiche » : une différente à chaque vidéo (identité du jour).
const LOOK_FONTS = {
  anton: 'ofl/anton/Anton-Regular.ttf', bebas: 'ofl/bebasneue/BebasNeue-Regular.ttf', archivo: 'ofl/archivoblack/ArchivoBlack-Regular.ttf',
  bungee: 'ofl/bungee/Bungee-Regular.ttf', russo: 'ofl/russoone/RussoOne-Regular.ttf', righteous: 'ofl/righteous/Righteous-Regular.ttf',
  marker: 'apache/permanentmarker/PermanentMarker-Regular.ttf', bangers: 'ofl/bangers/Bangers-Regular.ttf', titan: 'ofl/titanone/TitanOne-Regular.ttf',
  staatliches: 'ofl/staatliches/Staatliches-Regular.ttf', blackops: 'ofl/blackopsone/BlackOpsOne-Regular.ttf', bowlby: 'ofl/bowlbyone/BowlbyOne-Regular.ttf',
  alfaslab: 'ofl/alfaslabone/AlfaSlabOne-Regular.ttf', abril: 'ofl/abrilfatface/AbrilFatface-Regular.ttf', rubikmono: 'ofl/rubikmonoone/RubikMonoOne-Regular.ttf',
  luckiest: 'apache/luckiestguy/LuckiestGuy-Regular.ttf',
};
export async function loadLookFont(dir, key) {
  const path = LOOK_FONTS[key];
  if (!path) return null;
  const buf = await get('https://raw.githubusercontent.com/google/fonts/main/' + path);
  if (!buf) return null;
  const name = 'Look_' + key, f = join(dir, name + '.ttf');
  writeFileSync(f, buf);
  GlobalFonts.registerFromPath(f, name);
  return name;
}

export async function loadImg(url) {
  if (!url) return null;
  const buf = await get(url);
  if (!buf) return null;
  try { const img = await loadImage(buf); return img && img.width > 0 ? img : null; } catch (e) { return null; }
}

// Emoji 3D Noto (image) : les polices système n'ont pas d'emoji en couleur.
export async function loadEmoji(ch) {
  const code = Array.from(String(ch || '')).map((c) => c.codePointAt(0).toString(16)).filter((x) => x !== 'fe0f').join('_');
  if (!code) return null;
  return loadImg('https://fonts.gstatic.com/s/e/notoemoji/latest/' + code + '/512.png');
}
