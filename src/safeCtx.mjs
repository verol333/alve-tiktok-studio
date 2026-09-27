// Protection globale : une échelle nulle (début/fin d'animation) rend la matrice non inversible
// et fait planter le dessin (« Invert matrix failed »). On la remplace par une échelle infime, invisible.
import { createCanvas } from '@napi-rs/canvas';
const P = Object.getPrototypeOf(createCanvas(1, 1).getContext('2d'));
const nz = (v) => (Number.isFinite(v) && Math.abs(v) >= 1e-3 ? v : (v < 0 ? -1e-3 : 1e-3));
if (!P.__safeScale) {
  const scale = P.scale;
  P.scale = function (x, y) { return scale.call(this, nz(x), nz(y)); };
  const setT = P.setTransform;
  P.setTransform = function (a, b, c, d, e, f) {
    if (typeof a === 'number' && Math.abs(a * d - b * c) < 1e-6) { a = nz(a); d = nz(d); }
    return setT.apply(this, typeof a === 'number' ? [a, b, c, d, e, f] : arguments);
  };
  P.__safeScale = true;
}
