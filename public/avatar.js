// Show up avatars: shared by the page (in the browser) and the Worker (to serve faces to waywo).
// Flat shapes only: no scripts, no outside images or fonts.

/* ============================================================
   Avatar maker — original chunky heads, bold ink lines
   ============================================================ */
const INK = '#1c1b1f';
const FACE = ['#F0614B','#F7C23E','#3DBA6F','#F4A3C8','#7B92CF','#F59A30','#A8D0D8','#D2559A','#F2C9A0','#D9A06B','#A86F4C','#B7D86A','#B49BE0'];
const HAIR = ['#1c1b1f','#4A2F24','#8A5A3B','#D9672E','#E8C25E','#B9B6BF','#F08FB8','#5B7FD1','#F4F1EA','#3DBA6F','#8E6BD0'];
const PASTEL = ['#BAC5A3','#A2BBC4','#F2D29F','#EC9C91','#B4ABC7','#A7C6BE','#DED6C5','#C8B6BE'];
const PARTS = { shape: 6, hair: 18, fringe: 4, hat: 14, eyes: 9, nose: 5, mouth: 10, extra: 11, pet: 8 };
const PART_LABELS = { shape: 'Head', hair: 'Hair', fringe: 'Fringe', hat: 'Hat', eyes: 'Eyes', nose: 'Nose', mouth: 'Mouth', extra: 'Extra', pet: 'Pet' };
let uid = 0;

function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function randomAvatar() {
  const r = Math.random, a = {};
  for (const k in PARTS) a[k] = Math.floor(r() * PARTS[k]);
  a.fringe = r() < .55 ? 0 : 1 + Math.floor(r() * 3);
  a.hat = r() < .55 ? 0 : 1 + Math.floor(r() * (PARTS.hat - 1));
  a.pet = r() < .6 ? 0 : 1 + Math.floor(r() * (PARTS.pet - 1));
  a.hatc = Math.floor(r() * FACE.length);
  a.breed = Math.floor(r() * BREEDS[a.pet].length);
  if (a.pet === 1 && r() < .5) a.breed = Math.floor(r() * BREEDS[1].length);
  [a.petc, a.petm] = petDefaults(a.pet, a.breed);
  if (r() < .3) { const pal = petPalette(a.pet); a.petc = pal[Math.floor(r() * pal.length)]; }
  a.petacc = hasMarkings(a.pet) && r() < .35 ? 1 + Math.floor(r() * (PET_ACC.length - 1)) : 0;
  a.petaccc = Math.floor(r() * FACE.length);
  a.hairc = r() < .55 ? 0 : Math.floor(r() * HAIR.length);
  a.skin = Math.floor(r() * FACE.length); a.bg = Math.floor(r() * PASTEL.length); a.seed = Math.floor(r() * 1e9);
  return a;
}
const PET_NAMES = ['None', 'Dog', 'Cat', 'Bunny', 'Frog', 'Bird', 'Hamster', 'Fish'];
const BREEDS = [[''],
  ['Floppy-eared', 'Husky', 'Pug', 'Dalmatian', 'Poodle', 'Sausage dog', 'Scottie', 'Frenchie', 'Scruffy', 'Cockapoo', 'Golden retriever', 'Beagle', 'Border collie', 'Corgi', 'Staffie', 'Jack Russell', 'Spaniel', 'Shih Tzu', 'Chihuahua', 'Whippet', 'Bulldog', 'Dachshund', 'Samoyed', 'Shaggy lurcher'],
  ['Tabby', 'Plain', 'Tuxedo', 'Calico', 'Sphynx', 'Fluffy'],
  ['Classic', 'Lop-eared', 'Dutch'],
  ['Classic', 'Spotty', 'Frog prince'],
  ['Macaw', 'Budgie', 'Cockatoo', 'Toucan'],
  ['Classic', 'Snack cheeks', 'Guinea pig'],
  ['Goldfish', 'Clownfish', 'Pufferfish']];
// 0 tan, 1 golden, 2 brown, 3 dark brown, 4 white, 5 grey, 6 orange, 7 green, 8 red, 9 blue, 10 pink, 11 purple, 12 black, 13 cream, 14 ginger
const PETC = ['#D9A06B', '#E8C25E', '#8A5A3B', '#4A2F24', '#F4F1EA', '#B9B6BF', '#F59A30', '#3DBA6F', '#F0614B', '#7B92CF', '#F4A3C8', '#B49BE0', '#2E2A2B', '#F2DDB4', '#C9773A', '#6B4334', '#C98A55', '#6E6A70'];
// Default [main colour, markings colour] for each breed
const PET_DEFAULTS = [[[0, 0]],
  [[0, 15], [5, 4], [13, 12], [4, 12], [4, 4], [0, 15], [12, 12], [5, 4], [5, 13], [1, 1], [1, 14], [14, 15], [12, 4], [14, 4], [15, 4], [4, 14], [4, 15], [4, 1], [13, 1], [5, 4], [4, 14], [15, 0], [4, 4], [5, 12]],
  [[14, 15], [5, 5], [12, 4], [4, 14], [13, 13], [5, 4]],
  [[4, 4], [4, 4], [15, 4]],
  [[7, 7], [7, 7], [7, 7]],
  [[8, 9], [7, 7], [4, 4], [12, 12]],
  [[1, 1], [1, 1], [14, 4]],
  [[6, 6], [6, 6], [1, 1]]];
// 8 colours per kind of pet: fur tones for furry ones, brights for frogs, birds and fish
const FUR = [4, 13, 1, 0, 14, 15, 5, 12], BRIGHT = [7, 8, 9, 1, 6, 10, 12, 4];
const petPalette = (pet) => [4, 5, 7].includes(pet) ? BRIGHT : FUR;
const PET_DEFAULT_COLOUR = [0, 0, 6, 4, 7, 8, 1, 6];
const petDefaults = (pet, breed) => (PET_DEFAULTS[pet] && PET_DEFAULTS[pet][breed]) || [0, 0];
const hasMarkings = (pet) => pet === 1 || pet === 2;
const PET_ACC = ['None', 'Collar', 'Bandana', 'Bow', 'Flower'];
function isDark(hex) { const n = parseInt(hex.slice(1), 16); return (0.299 * (n >> 16) + 0.587 * (n >> 8 & 255) + 0.114 * (n & 255)) < 90; }

// Draws the pet in its own little corner space (head roughly centred on 34,180)
function petSVG(type, breed, colourIdx, markIdx, uidStr, accType = 0, accIdx = 3) {
  if (!type) return '';
  const C = PETC[colourIdx], M = PETC[markIdx], W2 = '#F4F1EA', PINK = '#F4A3C8', clip = `pc${uidStr}`;
  const dk = (d, o = .2) => `<path d="${d}" fill="#000" opacity="${o}"/>`;
  const lt = (d, o = .45) => `<path d="${d}" fill="#fff" opacity="${o}"/>`;
  const ln = (d, w = 2.4, c = INK) => `<path d="${d}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
  const ell = (cx, cy, rx, ry) => `M${cx - rx} ${cy} a${rx} ${ry} 0 1 0 ${2 * rx} 0 a${rx} ${ry} 0 1 0 ${-2 * rx} 0`;
  const blob = (cx, cy, rx, ry, fill, rot = 0) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}"${rot ? ` transform="rotate(${rot} ${cx} ${cy})"` : ''} fill="${fill}"/>`;
  const circ = (cx, cy, r, fill) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}"/>`;
  // big shiny eyes; a pale ring when the fur behind them is dark
  const eye = (x, y, r = 3.6, bgc = C) => (isDark(bgc) ? circ(x, y, r + 1.6, '#fff') : '') + circ(x, y, r, INK) + circ((x - r * .35).toFixed(1), (y - r * .38).toFixed(1), (r * .36).toFixed(1), '#fff');
  const eyes = (y = 176, dx = 7.5, r = 3.6, bg = C) => eye(34 - dx, y, r, bg) + eye(34 + dx, y, r, bg);
  const blush = (y = 186, dx = 13) => blob(34 - dx, y, 4.2, 2.6, PINK) + blob(34 + dx, y, 4.2, 2.6, PINK);
  const nose = (y = 184.5, rx = 5, ry = 3.8) => `<ellipse cx="34" cy="${y}" rx="${rx}" ry="${ry}" fill="${INK}"/>` + circ(32.5, y - 1.3, 1.1, '#fff');
  const wmouth = (y = 189) => ln(`M29.5 ${y} Q31.8 ${y + 3.2} 34 ${y} Q36.2 ${y + 3.2} 38.5 ${y}`, 1.8);
  const tongue = (y = 190) => `<path d="M31 ${y} Q31 ${y + 8} 34 ${y + 8} Q37 ${y + 8} 37 ${y} Z" fill="#F0614B"/>` + ln(`M34 ${y + 1.5} V${y + 5}`, 1.2, 'rgba(0,0,0,.25)');
  const head = (rx = 21, ry = 19, fill = C, cy = 180) => blob(34, cy, rx, ry, fill);
  const muzzle = (fill = W2, rx = 10, ry = 7, cy = 188) => blob(34, cy, rx, ry, fill);
  const floppy = (fill, rx = 8, ry = 16, cy = 174, spread = 19, rot = 20) => blob(34 - spread, cy, rx, ry, fill, rot) + blob(34 + spread, cy, rx, ry, fill, -rot);
  const pointy = (fill, inner = true, h = 146, base = 172) => `<path d="M15 ${base} L17 ${h} L31 ${base - 10} Z M53 ${base} L51 ${h} L37 ${base - 10} Z" fill="${fill}"/>` + (inner ? `<path d="M19 ${base - 6} L20 ${h + 6} L27 ${base - 11} Z M49 ${base - 6} L48 ${h + 6} L41 ${base - 11} Z" fill="${PINK}"/>` : '');
  const fluff = (cx, cy, R, n, r, fill, a0 = 0, a1 = 6.283) => { let o = ''; for (let i = 0; i < n; i++) { const a = a0 + (a1 - a0) * i / (n - 1 || 1); o += circ((cx + R * Math.cos(a)).toFixed(1), (cy + R * Math.sin(a)).toFixed(1), r, fill); } return o; };
  let o = '';
  if (type === 1) { // ---------------- dogs ----------------
    switch (breed) {
      case 0: o = floppy(M) + head() + muzzle() + eyes() + nose() + wmouth() + blush(); break;
      case 1: o = pointy(C) + head() + `<path d="M21 198 Q18 182 27 179 Q34 186 41 179 Q50 182 47 198 Z" fill="${M}"/>` + circ(27, 167.5, 2.2, M) + circ(41, 167.5, 2.2, M) + eyes() + nose(185) + wmouth(190) + blush(187); break;
      case 2: o = `<path d="M13 170 L22 160 L26 173 Z M55 170 L46 160 L42 173 Z" fill="${M}"/>` + head(22, 19) + blob(34, 188.5, 12.5, 9, M) + ln('M27 166 Q34 162 41 166 M29 170 Q34 167.5 39 170', 1.8, 'rgba(0,0,0,.3)') +
        eye(24.5, 177, 4.6) + eye(43.5, 177, 4.6) + nose(185.5, 4.4, 3.2) + tongue(191) + blush(184, 16); break;
      case 3: o = floppy(M) + head() + [[23, 167, 3], [45, 165, 2.6], [49, 189, 3], [19, 189, 2.6], [40, 196, 2], [30, 164, 1.8]].map(([x, y, r]) => circ(x, y, r, M)).join('') + muzzle() + eyes() + nose() + wmouth() + blush(); break;
      case 4: o = fluff(12, 182, 6, 4, 8, C, -1.6, 1.6) + fluff(56, 182, 6, 4, 8, C, 1.6, 4.7) + dk(ell(12, 184, 8, 12), .12) + dk(ell(56, 184, 8, 12), .12) + head(18, 18) + fluff(34, 161, 8, 5, 8, C, 3.4, 6.0) +
        `<path d="M40 151 L33 146 L33 156 Z M40 151 L47 146 L47 156 Z" fill="${PINK}"/>` + circ(40, 151, 2.4, PINK) + eyes(178, 6.5) + nose(186, 4.4, 3.4) + wmouth(190) + blush(187, 11); break;
      case 5: o = blob(19, 183, 7, 16, M, 15) + blob(31, 178, 17, 16, C) + blob(51, 186, 16, 8.5, C) + eye(30, 172, 3.6) + `<ellipse cx="66" cy="184" rx="4.6" ry="4" fill="${INK}"/>` + ln('M48 192 Q56 195 62 190', 2) + blob(40, 187, 4, 2.5, PINK); break;
      case 6: o = `<path d="M18 168 L20 150 L30 162 Z M50 168 L48 150 L38 162 Z" fill="${C}"/>` + head() + `<path d="M20 170 L31 168 L31 173 Z M48 170 L37 168 L37 173 Z" fill="${M}"/>` + lt('M20 170 L31 168 L31 173 Z M48 170 L37 168 L37 173 Z', .35) +
        `<path d="M17 185 L19 201 L25 195 L29 204 L34 196 L39 204 L43 195 L49 201 L51 185 Q34 177 17 185 Z" fill="${C}"/>` + lt('M17 185 L19 201 L25 195 L29 204 L34 196 L39 204 L43 195 L49 201 L51 185 Q34 177 17 185 Z', .22) + eyes(177) + nose(184.5); break;
      case 7: o = blob(17, 157, 9.5, 17, C, -18) + blob(51, 157, 9.5, 17, C, 18) + blob(17, 158, 5, 11, PINK, -18) + blob(51, 158, 5, 11, PINK, 18) + head(21, 18, C, 182) + blob(26, 176, 7, 6, M) + blob(34, 190, 9, 6, '#3A3132') + eyes(178, 8.5, 4) + nose(187, 4, 3) + blush(188, 15); break;
      case 8: { // scruffy
        let d = ''; for (let i = 0; i <= 24; i++) { const a = i / 24 * 6.283, r = i % 2 ? 19 : 25; d += `${i ? 'L' : 'M'}${(34 + r * Math.cos(a)).toFixed(1)} ${(181 + r * 0.95 * Math.sin(a)).toFixed(1)} `; }
        o = blob(14, 178, 7, 13, C, 30) + dk(ell(14, 178, 6, 12), .15) + `<path d="M50 172 L58 152 L46 166 Z" fill="${C}"/>` + `<path d="${d}Z" fill="${C}"/>` + `<path d="M20 172 L24 166 L27 172 L30 165 L33 172 Z M35 172 L38 165 L41 172 L44 166 L48 172 Z" fill="${M}"/>` +
          `<path d="M22 188 L24 200 L28 195 L31 203 L34 196 L37 203 L40 195 L44 200 L46 188 Q34 182 22 188 Z" fill="${M}"/>` + eyes(178, 7.5, 3.6) + nose(186) + tongue(193) + blush(185, 15); break; }
      case 9: o = fluff(13, 186, 7, 5, 6.5, C, -1.6, 1.6) + fluff(55, 186, 7, 5, 6.5, C, 1.6, 4.7) + dk(ell(13, 186, 7, 13), .1) + dk(ell(55, 186, 7, 13), .1) + fluff(34, 180, 19, 12, 6.5, C) + head(18, 17) + muzzle(lighter(C), 8, 6, 188) + eyes(177, 7) + nose(185, 4.4, 3.4) + wmouth(189.5) + blush(185, 12); break;
      case 10: o = floppy(M, 8.5, 15, 177, 19, 12) + fluff(15, 190, 2, 3, 4, M, 1.2, 2.2) + fluff(53, 190, 2, 3, 4, M, 1, 2) + head() + muzzle(lighter(C), 11, 8, 188) + eyes() + nose() + tongue(190) + blush(); break;
      case 11: o = blob(13, 182, 9, 19, M, 12) + blob(55, 182, 9, 19, M, -12) + head() + `<path d="M31 160 L37 160 L39 180 Q46 186 44 194 Q34 200 24 194 Q22 186 29 180 Z" fill="${W2}"/>` + eyes(176, 8.5) + nose(185) + wmouth(190) + blush(186, 15); break;
      case 12: o = `<path d="M15 172 L16 150 L30 162 Z M53 172 L52 150 L38 162 Z" fill="${C}"/><path d="M16 150 L24 156 L19 160 Z M52 150 L44 156 L49 160 Z" fill="#000" opacity=".25"/>` + head() + `<path d="M31.5 160 L36.5 160 L38 178 Q46 184 45 196 Q34 202 23 196 Q22 184 30 178 Z" fill="${M}"/>` + eyes(176, 8.5, 3.6) + nose(185) + wmouth(190) + blush(187, 15); break;
      case 13: o = pointy(C, true, 140, 170) + head(21, 18, C, 181) + `<path d="M31 162 L37 162 L39 178 Q48 182 47 196 Q34 202 21 196 Q20 182 29 178 Z" fill="${M}"/>` + eyes(177, 8.5) + nose(185.5) + tongue(190.5) + blush(186, 15); break;
      case 14: o = `<path d="M11 172 Q14 160 24 164 Q18 168 18 174 Z M57 172 Q54 160 44 164 Q50 168 50 174 Z" fill="${C}"/>` + head(24, 19) + `<path d="M31 162 L37 162 L36 176 L32 176 Z" fill="${M}"/>` + muzzle(M, 12, 7.5, 189) + eyes(176, 9.5) + nose(184.5, 5.5, 4) +
        `<path d="M24 189 Q34 200 44 189 Z" fill="${INK}"/><path d="M30 191 Q34 197 38 191 Z" fill="#F0614B"/>` + blush(184, 17); break;
      case 15: o = `<path d="M14 166 Q18 158 26 164 Q20 172 16 176 Z M54 166 Q50 158 42 164 Q48 172 52 176 Z" fill="${M}"/>` + `<clipPath id="${clip}"><ellipse cx="34" cy="180" rx="21" ry="19"/></clipPath>` + head() +
        `<g clip-path="url(#${clip})"><ellipse cx="24" cy="172" rx="10" ry="9" fill="${M}"/><ellipse cx="48" cy="166" rx="9" ry="6" fill="${M}"/></g>` + muzzle() + eyes(176, 8) + nose() + wmouth() + blush(186, 15); break;
      case 16: o = fluff(12, 184, 5, 6, 6, M, -1.6, 1.6) + fluff(56, 184, 5, 6, 6, M, 1.6, 4.7) + blob(12, 184, 7, 15, M) + blob(56, 184, 7, 15, M) + head(20, 18) + muzzle(lighter(C), 10, 7, 188) + eyes(177) + nose(185) + wmouth(190) + blush(186, 13); break;
      case 17: o = `<path d="M12 176 Q10 200 22 204 L46 204 Q58 200 56 176 Q34 168 12 176 Z" fill="${C}"/>` + dk('M12 176 Q10 200 22 204 L18 182 Z M56 176 Q58 200 46 204 L50 182 Z', .1) + head(19, 18, C, 180) +
        fluff(34, 160, 6, 4, 6.5, C, 3.5, 5.9) + `<path d="M34 152 L26 147 L26 157 Z M34 152 L42 147 L42 157 Z" fill="${PINK}"/>` + circ(34, 152, 2.6, PINK) + muzzle(M, 9, 6.5, 188) + eyes(178, 7) + nose(186, 4.2, 3.2) + blush(187, 12); break;
      case 18: o = `<path d="M18 172 L4 140 L30 160 Z M50 172 L64 140 L38 160 Z" fill="${C}"/><path d="M18 166 L9 148 L26 162 Z M50 166 L59 148 L42 162 Z" fill="${PINK}"/>` + head(17, 16, C, 182) + blob(34, 189, 8, 5.5, M) + eye(27, 179, 4.6) + eye(41, 179, 4.6) + nose(187, 3.4, 2.6) + blush(188, 12); break;
      case 19: o = `<path d="M20 168 Q16 158 26 160 L28 170 Z M48 168 Q52 158 42 160 L40 170 Z" fill="${C}"/>` + blob(34, 180, 15, 21, C) + blob(34, 193, 8, 10, M) + eyes(173, 6.5, 3.2) + nose(196, 3.6, 2.8) + blush(186, 10); break;
      case 20: o = `<path d="M12 170 Q14 160 24 164 Q18 166 18 172 Z M56 170 Q54 160 44 164 Q50 166 50 172 Z" fill="${C}"/>` + `<clipPath id="${clip}"><ellipse cx="34" cy="181" rx="24" ry="18"/></clipPath>` + head(24, 18, C, 181) +
        `<g clip-path="url(#${clip})"><ellipse cx="44" cy="172" rx="10" ry="9" fill="${M}"/></g>` + `<path d="M18 186 Q16 200 28 198 Q34 194 40 198 Q52 200 50 186 Q34 180 18 186 Z" fill="${C}"/>` + dk('M18 186 Q16 200 28 198 Q34 194 40 198 Q52 200 50 186 Q34 192 18 186 Z', .12) +
        eyes(175, 9, 3.4) + nose(184, 5.5, 3.8) + `<rect x="27" y="191" width="3" height="4" rx="1" fill="#fff"/><rect x="38" y="191" width="3" height="4" rx="1" fill="#fff"/>` + blush(186, 17); break;
      case 21: // dachshund, front-on: long ears, tan brows and muzzle
        o = blob(13, 188, 8.5, 19, C, 8) + blob(55, 188, 8.5, 19, C, -8) + dk(ell(13, 188, 7, 17), .14) + dk(ell(55, 188, 7, 17), .14) + blob(34, 177, 17, 19, C) +
          blob(34, 190, 10, 9.5, M) + blob(23.5, 185, 4.5, 3.5, M) + blob(44.5, 185, 4.5, 3.5, M) + circ(27, 165.5, 2.6, M) + circ(41, 165.5, 2.6, M) +
          eye(26.5, 174.5, 4.4) + eye(41.5, 174.5, 4.4) + `<ellipse cx="34" cy="188.5" rx="6" ry="4.6" fill="#3A2622"/>` + circ(32.2, 187, 1.3, '#fff') + ln('M31 194 Q34 196.5 37 194', 1.6); break;
      case 22: { // samoyed: big fluffy cloud, pointy ears, huge smile
        o = pointy(C, true, 142, 170) + fluff(34, 182, 20, 16, 7, C) + blob(34, 182, 20, 18, C) + dk(ell(34, 196, 13, 5), .05) +
          eye(28, 175, 3.1, '#fff') + eye(40, 175, 3.1, '#fff') + nose(183.5, 5.2, 4) + `<path d="M23 187 Q34 199 45 187 Q34 191 23 187 Z" fill="${INK}"/><path d="M30.5 190 Q30 205 34 205 Q38 205 37.5 190 Z" fill="#EE7FA0"/>` + ln('M34 192 V200', 1.2, 'rgba(0,0,0,.2)') + blush(186, 15); break; }
      case 23: { // shaggy lurcher: long wiry face, fringe over the eyes, dark muzzle, tongue
        const wisp = (cx, cy, rx, ry, n, len) => { let d = ''; for (let i = 0; i <= n * 2; i++) { const a = i / (n * 2) * 6.283, r = i % 2 ? 1 : 1 + len * (0.7 + 0.3 * Math.sin(i * 2.3)); d += `${i ? 'L' : 'M'}${(cx + rx * r * Math.cos(a)).toFixed(1)} ${(cy + ry * r * Math.sin(a)).toFixed(1)} `; } return d + 'Z'; };
        o = `<path d="M17 168 Q8 166 10 180 Q16 176 21 176 Z M51 168 Q60 166 58 180 Q52 176 47 176 Z" fill="${M}"/>` + `<path d="${wisp(34, 181, 17, 21, 14, .2)}" fill="${C}"/>` + lt(wisp(34, 181, 12, 15, 10, .15), .18) +
          `<path d="${wisp(34, 196, 10, 8, 9, .3)}" fill="${M}"/>` + eyes(176, 7, 3.2) +
          `<path d="M18 176 L20 168 L23 175 L25 165 L28 174 L31 164 L34 173 L37 164 L40 174 L43 165 L45 175 L48 168 L50 176 Q50 160 34 158 Q18 160 18 176 Z" fill="${C}"/>` + lt('M23 175 L25 165 L28 174 M37 164 L40 174 L43 165', .25) +
          `<ellipse cx="34" cy="189" rx="5" ry="3.8" fill="${INK}"/>` + circ(32.5, 187.7, 1.1, '#fff') + `<path d="M30.5 195 Q30 207 34 207 Q38 207 37.5 195 Z" fill="#EE7FA0"/>` + ln('M28 194 Q34 197 40 194', 1.6); break; }
    }
  } else if (type === 2) { // ---------------- cats ----------------
    const ears = (big) => big ? `<path d="M12 174 L12 140 L32 160 Z M56 174 L56 140 L36 160 Z" fill="${C}"/><path d="M16 166 L16 150 L26 160 Z M52 166 L52 150 L42 160 Z" fill="${PINK}"/>`
      : `<path d="M16 172 L17 146 L32 162 Z M52 172 L51 146 L36 162 Z" fill="${C}"/><path d="M20 166 L21 154 L28 162 Z M48 166 L47 154 L40 162 Z" fill="${PINK}"/>`;
    const face = eyes(178, 7.5, 3.4) + `<path d="M31 184 L37 184 L34 187.5 Z" fill="${PINK}"/>` + ln('M34 187.5 Q31.5 191 29 189 M34 187.5 Q36.5 191 39 189', 1.6) + ln('M7 184 L20 187 M7 191 L20 190 M61 184 L48 187 M61 191 L48 190', 1.3) + blush(187, 14);
    const head = circ(34, 182, 20, C);
    switch (breed) {
      case 0: o = ears() + head + ln('M28 166 V173 M34 164 V172 M40 166 V173 M15 181 H22 M46 181 H53', 2.8, M) + face; break;
      case 1: o = ears() + head + face; break;
      case 2: o = ears() + head + `<path d="M34 170 Q30 178 24 192 Q34 204 44 192 Q38 178 34 170 Z" fill="${M}"/>` + face; break;
      case 3: o = ears() + `<clipPath id="${clip}"><circle cx="34" cy="182" r="20"/></clipPath>` + head + `<g clip-path="url(#${clip})"><ellipse cx="22" cy="168" rx="13" ry="10" fill="${M}"/><ellipse cx="50" cy="190" rx="11" ry="12" fill="#3A3132"/></g>` + face; break;
      case 4: o = ears(true) + head + ln('M28 168 Q34 165 40 168 M29 172 Q34 170 39 172', 1.6, 'rgba(0,0,0,.3)') + face; break;
      case 5: o = ears() + fluff(34, 186, 18, 9, 8, C, 0.3, 2.85) + head + lt(ell(34, 196, 11, 6), .35) + face; break;
    }
  } else if (type === 3) { // ---------------- bunnies ----------------
    const head = circ(34, 184, 18, C), face = eyes(181, 6.5, 3.2) + `<path d="M31.5 186 L36.5 186 L34 189 Z" fill="${PINK}"/>` + ln('M34 189 V191.5 M34 191.5 Q31.5 194.5 29.5 192.5 M34 191.5 Q36.5 194.5 38.5 192.5', 1.5) + blush(188, 12);
    const up = blob(26, 152, 6.5, 20, C) + blob(42, 152, 6.5, 20, C) + blob(26, 154, 3, 13, PINK) + blob(42, 154, 3, 13, PINK);
    switch (breed) {
      case 0: o = up + head + face; break;
      case 1: o = head + blob(15, 186, 7, 18, C, 18) + blob(53, 186, 7, 18, C, -18) + dk(ell(15, 186, 7, 18), .12) + dk(ell(53, 186, 7, 18), .12) + face; break;
      case 2: o = up + `<clipPath id="${clip}"><circle cx="34" cy="184" r="18"/></clipPath>` + head + `<g clip-path="url(#${clip})"><path d="M30 164 L38 164 L40 184 Q34 200 28 184 Z" fill="${W2}"/><rect x="14" y="192" width="40" height="12" fill="${W2}"/></g>` + face; break;
    }
  } else if (type === 4) { // ---------------- frogs ----------------
    o = circ(22, 170, 9, C) + circ(46, 170, 9, C) + blob(34, 186, 25, 16, C) + circ(22, 170, 5.5, '#fff') + circ(46, 170, 5.5, '#fff') + eye(23, 171, 3, '#fff') + eye(47, 171, 3, '#fff') + ln('M20 188 Q34 197 48 188', 2.5) + blush(186, 18);
    if (breed === 1) o += [[16, 182, 3], [50, 180, 2.5], [28, 197, 2.5], [44, 195, 2]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#000" opacity=".2"/>`).join('');
    if (breed === 2) o += `<path d="M26 166 L26 154 L30 160 L34 150 L38 160 L42 154 L42 166 Z" fill="#F7C23E"/>` + circ(34, 161, 1.8, '#F0614B');
  } else if (type === 5) { // ---------------- birds ----------------
    const wing = C === '#7B92CF' ? '#F7C23E' : '#5B7FD1';
    switch (breed) {
      case 0: o = blob(34, 186, 16, 18, C) + blob(41, 188, 9, 14, wing) + circ(34, 160, 14, C) + `<path d="M44 156 Q58 158 47 170 Z" fill="#F7C23E"/>` + circ(37, 156, 5, '#fff') + eye(38, 156, 2.6, '#fff') + blob(33, 165, 3.5, 2.2, PINK); break;
      case 1: o = blob(34, 188, 14, 16, C) + circ(34, 166, 13, C) + `<path d="M22 168 Q34 154 46 168 Q34 182 22 168 Z" fill="#F7C23E"/>` + circ(28, 176, 1.6, INK) + circ(40, 176, 1.6, INK) +
        `<path d="M32 168 L36 168 L34 173 Z" fill="#F59A30"/>` + eye(29, 163, 2.6, '#F7C23E') + eye(39, 163, 2.6, '#F7C23E') + ln('M28 190 Q34 194 40 190 M28 196 Q34 200 40 196', 1.6, 'rgba(0,0,0,.25)'); break;
      case 2: o = `<path d="M30 152 Q24 134 34 130 M34 150 Q32 132 42 130 M38 152 Q42 136 50 138" fill="none" stroke="#F7C23E" stroke-width="4" stroke-linecap="round"/>` + blob(34, 186, 16, 18, C) + circ(34, 162, 14, C) + dk(ell(36, 188, 8, 12), .12) +
        `<path d="M42 160 Q52 164 44 172 Z" fill="${INK}"/>` + eye(35, 158, 2.8) + blob(37, 166, 3.5, 2.2, PINK); break;
      case 3: o = blob(30, 186, 15, 18, C) + circ(30, 162, 13, C) + circ(34, 166, 7, W2) + `<path d="M38 154 Q66 150 64 166 Q54 172 38 168 Z" fill="#F59A30"/><path d="M58 154 Q66 154 64 166 Q60 162 58 154 Z" fill="${INK}"/>` + eye(31, 158, 2.8); break;
    }
  } else if (type === 6) { // ---------------- hamsters ----------------
    switch (breed) {
      case 0: o = circ(20, 168, 6, C) + circ(48, 168, 6, C) + circ(20, 168, 3.5, PINK) + circ(48, 168, 3.5, PINK) + circ(34, 186, 20, C) + lt(ell(34, 194, 11, 7), .5) + blush(188, 13) + eyes(181, 6.5, 3) + circ(34, 186, 2, '#F0614B') + wmouth(189); break;
      case 1: o = circ(20, 166, 6, C) + circ(48, 166, 6, C) + circ(20, 166, 3.5, PINK) + circ(48, 166, 3.5, PINK) + circ(34, 182, 17, C) + circ(16, 192, 12, C) + circ(52, 192, 12, C) + blob(16, 192, 6, 4, PINK) + blob(52, 192, 6, 4, PINK) +
        eyes(178, 6.5, 3) + circ(34, 184, 2, '#F0614B') + wmouth(187); break;
      case 2: o = blob(34, 188, 27, 17, C) + `<path d="M20 180 L24 170 L28 178 L32 168 L36 178 L40 168 L44 178 L48 170 L50 182 Z" fill="${W2}"/>` + blob(16, 176, 6, 4, C) + blob(52, 176, 6, 4, C) + eyes(184, 7.5, 3.2) + blob(34, 191, 3, 2, '#F0614B') + blush(191, 14); break;
    }
  } else if (type === 7) { // ---------------- fish in a bowl ----------------
    o = circ(34, 176, 23, '#A8D0D8') + `<path d="M14 166 Q34 170 54 166" fill="none" stroke="#fff" stroke-width="3" opacity=".8"/>`;
    if (breed === 0) o += blob(36, 182, 10, 7, C) + `<path d="M26 182 L18 176 L18 188 Z" fill="${C}"/>` + eye(41, 180, 2.2);
    if (breed === 1) o += `<clipPath id="${clip}"><ellipse cx="36" cy="182" rx="11" ry="7.5"/></clipPath>` + blob(36, 182, 11, 7.5, C) + `<path d="M25 182 L17 176 L17 188 Z" fill="${C}"/><g clip-path="url(#${clip})"><rect x="30" y="170" width="4" height="24" fill="#fff"/><rect x="40" y="170" width="3" height="24" fill="#fff"/></g>` + eye(43, 180, 2.2);
    if (breed === 2) { let sp = ''; for (let i = 0; i < 12; i++) { const a = i * 0.5236; sp += `M${(34 + 10 * Math.cos(a)).toFixed(1)} ${(181 + 10 * Math.sin(a)).toFixed(1)} L${(34 + 14 * Math.cos(a)).toFixed(1)} ${(181 + 14 * Math.sin(a)).toFixed(1)} `; }
      o += ln(sp, 2, C) + circ(34, 181, 11, C) + eye(30, 178, 2.4) + eye(39, 178, 2.4) + circ(34.5, 185, 2, INK) + blush(184, 8); }
    o += `<rect x="18" y="152" width="32" height="7" rx="3.5" fill="#fff" opacity=".7"/>`;
  }
  if (type === 1 || type === 2) {
    const A = FACE[accIdx] || FACE[3];
    const chest = blob(34, 206, 15, 13, C) + (type === 1 && breed === 21 ? blob(34, 208, 3.6, 2.6, W2) : '');
    let acc = '';
    if (accType === 1) acc = `<rect x="20.5" y="196.5" width="27" height="5" rx="2.5" fill="${A}"/>` + circ(34, 204.5, 3, '#E8C25E') + circ(34, 204.5, 1, '#B8902E');
    if (accType === 2) acc = `<path d="M20 196.5 L48 196.5 L34 213 Z" fill="${A}"/>` + dk('M34 196.5 L48 196.5 L34 213 Z', .12) + `<rect x="20" y="195" width="28" height="4" rx="2" fill="${A}"/>`;
    if (accType === 3) acc = `<path d="M34 199 L23 192 L23 206 Z M34 199 L45 192 L45 206 Z" fill="${A}"/>` + circ(34, 199, 3.4, A) + dk('M30.6 199 a3.4 3.4 0 1 0 6.8 0 a3.4 3.4 0 1 0 -6.8 0', .15);
    if (accType === 4) { let f = ''; for (let i = 0; i < 5; i++) { const a = i * 1.2566 - 1.57; f += circ((17 + 6 * Math.cos(a)).toFixed(1), (161 + 6 * Math.sin(a)).toFixed(1), 4.6, A); } acc = f + circ(17, 161, 3.4, '#F7C23E'); }
    o = accType === 4 ? `<g transform="translate(0 -8)">${chest}${o}${acc}</g>` : `<g transform="translate(0 -8)">${chest}${acc}${o}</g>`;
  }
  return o;
}
function lighter(hex) { const n = parseInt(hex.slice(1), 16), m = (v) => Math.round(v + (255 - v) * .45); return '#' + [m(n >> 16), m(n >> 8 & 255), m(n & 255)].map(v => v.toString(16).padStart(2, '0')).join(''); }

function cleanAvatar(a) {
  const o = {};
  for (const k in PARTS) o[k] = clampInt(a && a[k], 0, PARTS[k] - 1);
  o.hairc = clampInt(a && a.hairc, 0, HAIR.length - 1); o.hatc = clampInt(a && a.hatc, 0, FACE.length - 1); o.breed = clampInt(a && a.breed, 0, 30); o.petc = (a && a.petc != null) ? clampInt(a.petc, 0, PETC.length - 1) : -1; o.petm = (a && a.petm != null) ? clampInt(a.petm, 0, PETC.length - 1) : -1; o.petacc = clampInt(a && a.petacc, 0, PET_ACC.length - 1); o.petaccc = (a && a.petaccc != null) ? clampInt(a.petaccc, 0, FACE.length - 1) : 3; o.skin = clampInt(a && a.skin, 0, FACE.length - 1); o.bg = clampInt(a && a.bg, 0, PASTEL.length - 1);
  o.seed = clampInt(a && a.seed, 0, 1e9);
  if (o.breed >= BREEDS[o.pet].length) o.breed = 0;
  if (o.petc < 0) o.petc = PET_DEFAULT_COLOUR[o.pet];
  if (o.petm < 0) o.petm = petDefaults(o.pet, o.breed)[1];
  return o;
}
function clampInt(v, lo, hi) { v = Math.round(Number(v)); return Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : lo; }

function avatarSVG(raw, opts = {}) {
  const a = cleanAvatar(raw), id = 'av' + (++uid), skin = FACE[a.skin], rand = rng(a.seed);
  const W = [56, 54, 46, 66, 50, 54][a.shape], T = [56, 56, 50, 68, 52, 54][a.shape];
  const L = 100 - W, R = 100 + W;
  const HC = HAIR[a.hairc];
  const CAP = `<path d="M${L+4} ${T+28} Q100 ${T-14} ${R-4} ${T+28} Q100 ${T+8} ${L+4} ${T+28} Z" fill="${HC}"/>`;
  const sh = (d, w = 5) => `<path d="${d}" fill="none" stroke="${HC}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
  const s = (d, w = 5) => `<path d="${d}" fill="none" stroke="${INK}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
  let behind = '', head = '', front = '';

  // hair that sits behind the head
  if (a.hair === 6) behind += `<rect x="${L-12}" y="${T-8}" width="${2*W+24}" height="128" rx="${W}" fill="${HC}"/>`;
  if (a.hair === 9) behind += `<path d="M${L-12} ${T+34} C${L-16} ${T-18} ${R+16} ${T-18} ${R+12} ${T+34} C${R+16} ${T+80} ${R+22} ${T+112} ${R+30} 240 L${L-30} 240 C${L-22} ${T+112} ${L-16} ${T+80} ${L-12} ${T+34} Z" fill="${HC}"/>`;
  if (a.hair === 10) for (let i = 0; i <= 8; i++) { const ang = Math.PI * (1.05 + i * 0.1125); behind += `<circle cx="${(100 + (W + 6) * Math.cos(ang)).toFixed(1)}" cy="${(T + 46 + (W + 2) * Math.sin(ang)).toFixed(1)}" r="${W * 0.5}" fill="${HC}"/>`; }
  if (a.hair === 14) for (let i = 0; i < 5; i++) { const y = T + 42 + i * 22; behind += `<circle cx="${L-6}" cy="${y}" r="${11 - i}" fill="${HC}"/><circle cx="${R+6}" cy="${y}" r="${11 - i}" fill="${HC}"/>`; }
  if (a.hair === 17) behind += `<path d="M${L-2} ${T+30} L${L-10} ${T+106} Q100 ${T+128} ${R+10} ${T+106} L${R+2} ${T+30} Z" fill="${HC}"/>`;
  if (a.hair === 3) behind += `<circle cx="${100-W*0.72}" cy="${T+2}" r="21" fill="${HC}"/><circle cx="${100+W*0.72}" cy="${T+2}" r="21" fill="${HC}"/>`;

  // neck — sits behind the head, in front of any long hair
  behind += `<rect x="85" y="140" width="30" height="100" rx="6" fill="${skin}"/><rect x="85" y="150" width="30" height="34" fill="#000" opacity=".12"/>`;
  // shoulders and a plain tee
  behind += `<path d="M28 240 Q30 196 84 186 L116 186 Q170 196 172 240 Z" fill="#F4F1EA"/><path d="M84 186 Q100 204 116 186 Z" fill="${skin}"/><path d="M84 186 Q100 204 116 186" fill="none" stroke="#000" stroke-opacity=".12" stroke-width="4"/>`;

  // ears
  const showEars = a.hair !== 6 && a.hair !== 9;
  if (showEars) {
    behind += `<circle cx="${L+2}" cy="116" r="13" fill="${skin}"/><circle cx="${R-2}" cy="116" r="13" fill="${skin}"/>`;
    front += s(`M${L-2} 110 q-5 6 1 12`, 3.5) + s(`M${R+2} 110 q5 6 -1 12`, 3.5);
  }

  // head
  const shapes = [
    `<circle cx="100" cy="112" r="56" fill="${skin}"/>`,
    `<rect x="46" y="56" width="108" height="114" rx="28" fill="${skin}"/>`,
    `<ellipse cx="100" cy="112" rx="46" ry="62" fill="${skin}"/>`,
    `<ellipse cx="100" cy="118" rx="66" ry="50" fill="${skin}"/>`,
    `<path d="M100 52 C72 52 64 78 62 98 C52 122 46 170 100 172 C154 170 148 122 138 98 C136 78 128 52 100 52 Z" fill="${skin}"/>`,
    `<path d="M62 72 C82 46 152 50 154 102 C156 142 140 172 98 170 C54 168 42 94 62 72 Z" fill="${skin}"/>`
  ];
  head += shapes[a.shape];
  // speckle grain
  let speck = '';
  for (let i = 0; i < 26; i++) speck += `<circle cx="${(L + 8 + rand() * (2*W - 16)).toFixed(1)}" cy="${(T + 14 + rand() * 96).toFixed(1)}" r="${(0.7 + rand() * 1.2).toFixed(1)}" fill="#fff" opacity="${(0.25 + rand() * .3).toFixed(2)}"/>`;


  // hair in front
  switch (a.hair) {
    case 1: for (let x = 80; x <= 120; x += 8) front += sh(`M${x} ${T+6} L${x} ${T+22}`, 4); break;
    case 2: front += `<path d="M${L-4} ${T+42} Q${L-6} ${T-12} 100 ${T-10} Q${R+6} ${T-12} ${R+4} ${T+42} Q${R-14} ${T+16} 100 ${T+20} Q${L+14} ${T+16} ${L-4} ${T+42} Z" fill="${HC}"/>`; break;
    case 3: front += `<path d="M${L+6} ${T+26} Q100 ${T-14} ${R-6} ${T+26} Q100 ${T+8} ${L+6} ${T+26} Z" fill="${HC}"/>`; break;
    case 4: {
      let d = ''; for (let i = 0; i < 7; i++) { const x = L + 12 + i * ((2*W - 24) / 6), y = T + 2 + (i % 2) * 6; d += `M${x+7} ${y} a7 7 0 1 1 -0.1 0 `; }
      front += sh(d, 3.5) + sh(`M100 ${T} C78 ${T-48} 124 ${T-52} 102 ${T-4} C90 ${T-34} 132 ${T-36} 106 ${T}`, 3.5); break; }
    case 5: front += `<path d="M${L-2} ${T+34} C${L-2} ${T-8} ${R} ${T-16} ${R+6} ${T+28} C${R-22} ${T+6} ${L+40} ${T+6} ${L-2} ${T+34} Z" fill="${HC}"/>`; break;
    case 6: front += `<path d="M${L} ${T+36} Q100 ${T-14} ${R} ${T+36} Q${R-8} ${T+14} 100 ${T+16} Q${L+8} ${T+14} ${L} ${T+36} Z" fill="${HC}"/>`; break;
    case 7: front += `<path d="M${100-24} ${T+8} L${100+6} ${T-46} L${100+28} ${T+6} Z" fill="${INK}"/><circle cx="${100+6}" cy="${T-48}" r="7" fill="${FACE[(a.skin+3)%FACE.length]}"/>`; break;
    case 8: front += `<path d="M${L+4} ${T+30} Q100 ${T-14} ${R-4} ${T+30} Q100 ${T+10} ${L+4} ${T+30} Z" fill="${HC}"/>` +
      sh(`M${L+10} ${T+16} L${L-16} ${T-2} M${L+10} ${T+16} L${L-12} ${T-12}`, 5) + sh(`M${R-10} ${T+16} L${R+16} ${T-2} M${R-10} ${T+16} L${R+12} ${T-12}`, 5) +
      `<circle cx="${L+8}" cy="${T+16}" r="5" fill="${FACE[(a.skin+2)%FACE.length]}"/><circle cx="${R-8}" cy="${T+16}" r="5" fill="${FACE[(a.skin+2)%FACE.length]}"/>`; break;
    case 9: front += `<path d="M99 ${T-9} Q${L-8} ${T-8} ${L-6} ${T+50} Q${L+8} ${T+12} 99 ${T+2} Z M101 ${T-9} Q${R+8} ${T-8} ${R+6} ${T+50} Q${R-8} ${T+12} 101 ${T+2} Z" fill="${HC}"/>`; break;
    case 10: front += `<path d="M${L+2} ${T+30} Q100 ${T-6} ${R-2} ${T+30} Q100 ${T+16} ${L+2} ${T+30} Z" fill="${HC}"/>`; break;
    case 11: front += `<path d="M86 ${T+12} L90 ${T-30} L97 ${T-4} L100 ${T-40} L104 ${T-4} L111 ${T-30} L114 ${T+12} Z" fill="${HC}"/>`; break;
    case 12: { const n = 6, step = (2 * W - 16) / n; let d = `M${L+8} ${T+20}`; for (let i = 0; i < n; i++) { const x = L + 8 + i * step; d += ` L${(x + step / 2).toFixed(1)} ${T - 18 + (i % 2) * 8} L${(x + step).toFixed(1)} ${T + 14}`; } front += `<path d="${d} Q100 ${T+30} ${L+8} ${T+20} Z" fill="${HC}"/>`; break; }
    case 13: front += CAP + `<circle cx="100" cy="${T-16}" r="17" fill="${HC}"/><rect x="88" y="${T-4}" width="24" height="7" rx="3" fill="${FACE[(a.skin+4)%FACE.length]}"/>`; break;
    case 14: front += CAP + `<circle cx="${L-6}" cy="${T+136}" r="5" fill="${FACE[(a.skin+3)%FACE.length]}"/><circle cx="${R+6}" cy="${T+136}" r="5" fill="${FACE[(a.skin+3)%FACE.length]}"/>`; break;
    case 15: front += `<path d="M${L+2} ${T+30} C${L} ${T-10} 96 ${T-34} ${R+12} ${T-16} C${R} ${T-6} ${R-4} ${T+8} ${R-2} ${T+30} Q100 ${T+8} ${L+2} ${T+30} Z" fill="${HC}"/>`; break;
    case 16: { let c = CAP; for (let i = 0; i < 9; i++) { const ang = Math.PI * (1.08 + i * 0.105); c += `<circle cx="${(100 + (W - 6) * Math.cos(ang)).toFixed(1)}" cy="${(T + 40 + (W - 8) * Math.sin(ang)).toFixed(1)}" r="10" fill="${HC}"/>`; } front += c; break; }
    case 17: front += CAP; break;
  }

  // fringe — sits over any hairstyle
  const B = Math.min(T + 36, 93);
  switch (a.fringe) {
    case 1: front += `<path d="M${L+3} ${B} C${L} ${T+6} ${L+12} ${T-8} 100 ${T-8} C${R-12} ${T-8} ${R} ${T+6} ${R-3} ${B} Q100 ${B+6} ${L+3} ${B} Z" fill="${HC}"/>`; break;
    case 2: front += `<path d="M${L} ${B+6} C${L-4} ${T+2} ${L+16} ${T-10} 104 ${T-9} C${R-6} ${T-8} ${R+4} ${T+8} ${R+1} ${B-12} Q${R-30} ${B-14} ${L} ${B+6} Z" fill="${HC}"/>`; break;
    case 3: {
      const n = 7, step = (2 * W - 10) / n; let d = `M${L+5} ${B} C${L+1} ${T+6} ${L+12} ${T-8} 100 ${T-8} C${R-12} ${T-8} ${R-1} ${T+6} ${R-5} ${B}`;
      for (let i = n - 1; i >= 0; i--) { const x = L + 5 + i * step; d += ` L${(x + step / 2).toFixed(1)} ${B - 10} L${x.toFixed(1)} ${B}`; }
      front += `<path d="${d} Z" fill="${HC}"/>`; break; }
  }

  // hats — on top of any hair
  const HT = FACE[a.hatc], shade = (d) => `<path d="${d}" fill="#000" opacity=".16"/>`;
  switch (a.hat) {
    case 1: { const d = `M${L-2} ${T+22} C${L-2} ${T-28} ${R+2} ${T-28} ${R+2} ${T+22} Z`; front += `<path d="${d}" fill="${HT}"/><rect x="${L-5}" y="${T+10}" width="${2*W+10}" height="16" rx="7" fill="${HT}"/>` + shade(`M${L-5} ${T+17} h${2*W+10} v9 h-${2*W+10} Z`) + `<circle cx="100" cy="${T-24}" r="10" fill="#F4F1EA"/>`; break; }
    case 2: { const d = `M${L} ${T+18} C${L} ${T-24} ${R} ${T-24} ${R} ${T+18} Z`, b = `M${R-12} ${T+10} Q${R+30} ${T+6} ${R+36} ${T+20} Q${R+8} ${T+24} ${R-12} ${T+20} Z`; front += `<path d="${d}" fill="${HT}"/><path d="${b}" fill="${HT}"/>` + shade(b) + `<circle cx="100" cy="${T-13}" r="4" fill="${INK}"/>`; break; }
    case 3: { const b = `M${L-16} ${T+30} Q100 ${T+2} ${R+16} ${T+30} Q100 ${T+18} ${L-16} ${T+30} Z`; front += `<path d="M${L+10} ${T+18} L${L+16} ${T-18} Q100 ${T-28} ${R-16} ${T-18} L${R-10} ${T+18} Z" fill="${HT}"/><path d="${b}" fill="${HT}"/>` + shade(b); break; }
    case 4: front += `<ellipse cx="96" cy="${T+2}" rx="${W+8}" ry="17" transform="rotate(-8 96 ${T+2})" fill="${HT}"/>` + s(`M98 ${T-14} L101 ${T-24}`, 4); break;
    case 5: front += `<path d="M78 ${T+10} L104 ${T-50} L126 ${T+8} Z" fill="${HT}"/>` + `<path d="M88 ${T-12} L118 ${T-14} M96 ${T-30} L112 ${T-32}" stroke="#fff" stroke-width="5" stroke-linecap="round"/><circle cx="104" cy="${T-52}" r="8" fill="#F7C23E"/>`; break;
    case 6: front += `<path d="M${L+8} ${T+14} L${L+6} ${T-26} L${L+26} ${T-6} L100 ${T-36} L${R-26} ${T-6} L${R-6} ${T-26} L${R-8} ${T+14} Z" fill="#F7C23E"/><circle cx="100" cy="${T+2}" r="5" fill="#F0614B"/><circle cx="${L+24}" cy="${T+5}" r="4" fill="#7B92CF"/><circle cx="${R-24}" cy="${T+5}" r="4" fill="#3DBA6F"/>`; break;
    case 7: front += `<path d="M${L-6} ${T+60} C${L-8} ${T-36} ${R+8} ${T-36} ${R+6} ${T+60}" fill="none" stroke="${INK}" stroke-width="8" stroke-linecap="round"/><rect x="${L-18}" y="${T+42}" width="22" height="36" rx="10" fill="${HT}"/><rect x="${R-4}" y="${T+42}" width="22" height="36" rx="10" fill="${HT}"/>`; break;
    case 8: { const cx = R - 12, cy = T + 10; let f = ''; for (let i = 0; i < 5; i++) { const ang = i * 1.2566 - 1.57; f += `<circle cx="${(cx + 11 * Math.cos(ang)).toFixed(1)}" cy="${(cy + 11 * Math.sin(ang)).toFixed(1)}" r="9" fill="${HT}"/>`; } front += f + `<circle cx="${cx}" cy="${cy}" r="7" fill="#F7C23E"/>`; break; }
    case 9: front += `<rect x="70" y="${T-54}" width="60" height="64" rx="6" fill="${INK}"/><rect x="70" y="${T-6}" width="60" height="11" fill="${HT}"/><rect x="50" y="${T+5}" width="100" height="11" rx="5" fill="${INK}"/>`; break;
    case 10: { const b = `M${L-28} ${T} Q${L-22} ${T+26} 100 ${T+24} Q${R+22} ${T+26} ${R+28} ${T} Q${R} ${T+16} 100 ${T+14} Q${L} ${T+16} ${L-28} ${T} Z`; front += `<path d="M70 ${T+10} C68 ${T-30} 86 ${T-36} 100 ${T-22} C114 ${T-36} 132 ${T-30} 130 ${T+10} Z" fill="#8A5A3B"/><rect x="70" y="${T}" width="60" height="9" fill="${HT}"/><path d="${b}" fill="#8A5A3B"/>` + shade(b); break; }
    case 11: { const cx = R - 16, cy = T + 4; front += `<path d="M${cx} ${cy} L${cx-24} ${cy-16} L${cx-24} ${cy+16} Z M${cx} ${cy} L${cx+24} ${cy-16} L${cx+24} ${cy+16} Z" fill="${HT}"/><circle cx="${cx}" cy="${cy}" r="7" fill="${HT}"/>` + shade(`M${cx-7} ${cy} a7 7 0 1 0 14 0 a7 7 0 1 0 -14 0`); break; }
    case 12: front += `<path d="M${L+4} ${T+8} Q${L-26} ${T-2} ${L-20} ${T-38} Q${L-8} ${T-12} ${L+14} ${T-4} Z M${R-4} ${T+8} Q${R+26} ${T-2} ${R+20} ${T-38} Q${R+8} ${T-12} ${R-14} ${T-4} Z" fill="#F4F1EA"/><path d="M${L} ${T+20} C${L} ${T-24} ${R} ${T-24} ${R} ${T+20} Z" fill="#B9B6BF"/><rect x="${L-4}" y="${T+12}" width="${2*W+8}" height="12" rx="5" fill="${HT}"/>`; break;
    case 13: front += `<g clip-path="url(#${id}c)"><rect x="0" y="${T+26}" width="200" height="16" fill="${HT}"/><rect x="0" y="${T+32}" width="200" height="4" fill="#fff" opacity=".7"/></g>`; break;
  }

  // eyes
  const ey = 108, ex = [80, 120];
  ex.forEach((x, i) => {
    switch (a.eyes) {
      case 0: front += `<circle cx="${x}" cy="${ey}" r="5.5" fill="${INK}"/>`; break;
      case 1: front += `<circle cx="${x}" cy="${ey}" r="12" fill="#fff" stroke="${INK}" stroke-width="4"/><path d="M${x} ${ey-12} A12 12 0 0 ${i ? 1 : 0} ${x} ${ey+12} Z" fill="${INK}"/>`; break;
      case 2: front += `<ellipse cx="${x}" cy="${ey}" rx="13" ry="8" fill="#fff" stroke="${INK}" stroke-width="4"/><circle cx="${x+6}" cy="${ey}" r="4.5" fill="${INK}"/>` + s(`M${x-10} ${ey-16} L${x+10} ${ey-18}`, 4); break;
      case 3: front += s(`M${x-10} ${ey+2} Q${x} ${ey-8} ${x+10} ${ey+2}`, 4) + s(`M${x-7} ${ey-6} l-3 -6 M${x} ${ey-8} l0 -7 M${x+7} ${ey-6} l3 -6`, 3); break;
      case 4: front += s(`M${x-11} ${ey} Q${x} ${ey+6} ${x+11} ${ey}`, 4) + `<circle cx="${x}" cy="${ey+5}" r="4" fill="${INK}"/>`; break;
      case 6: front += i ? s(`M${x-10} ${ey} Q${x} ${ey-8} ${x+10} ${ey}`, 4) : `<circle cx="${x}" cy="${ey}" r="5.5" fill="${INK}"/>`; break;
      case 7: front += `<path d="M${x} ${ey+8} C${x-15} ${ey-2} ${x-8} ${ey-13} ${x} ${ey-4} C${x+8} ${ey-13} ${x+15} ${ey-2} ${x} ${ey+8} Z" fill="${INK}"/>`; break;
      case 8: front += s(i ? `M${x+8} ${ey-7} L${x-6} ${ey} L${x+8} ${ey+7}` : `M${x-8} ${ey-7} L${x+6} ${ey} L${x-8} ${ey+7}`, 4); break;
      case 5: front += `<circle cx="${x}" cy="${ey}" r="10\" fill="#fff" stroke="${INK}" stroke-width="4"/><circle cx="${x-2}" cy="${ey+2}" r="4.5" fill="${INK}"/>` + s(i ? `M${x-8} ${ey-17} L${x+9} ${ey-13}` : `M${x-9} ${ey-13} L${x+8} ${ey-17}`, 4); break;
    }
  });

  // nose
  front += s([
    'M100 112 L72 133 L98 135',
    'M102 108 Q120 128 100 135',
    'M93 127 Q100 135 107 127',
    'M100 110 L90 132 L108 132',
    'M98 112 L132 129 L104 133'
  ][a.nose], 4.5);

  // mouth
  switch (a.mouth) {
    case 0: front += s('M84 148 Q100 160 116 148', 4.5); break;
    case 1: front += s('M88 152 L112 152', 4.5); break;
    case 2: front += `<rect x="80" y="143" width="40" height="17" rx="7" fill="#fff" stroke="${INK}" stroke-width="4"/>` + s('M80 151.5 H120 M90 143 V160 M100 143 V160 M110 143 V160', 3); break;
    case 3: front += `<ellipse cx="100" cy="152" rx="5.5" ry="7" fill="${INK}"/>`; break;
    case 4: front += s('M82 152 q4.5 -7 9 0 t9 0 t9 0 t9 0', 4); break;
    case 5: front += s('M86 156 Q100 144 114 156', 4.5); break;
    case 6: front += s('M86 150 Q106 156 117 141', 4.5); break;
    case 7: front += `<clipPath id="${id}m"><path d="M76 142 Q100 178 124 142 Z"/></clipPath><path d="M76 142 Q100 178 124 142 Z" fill="${INK}"/><g clip-path="url(#${id}m)"><rect x="74" y="140" width="52" height="7" fill="#fff"/><ellipse cx="100" cy="164" rx="13" ry="8" fill="#F0614B"/></g>` + s('M76 142 Q100 178 124 142 Z', 4.5) + s('M72 139 Q76 140 77 144 M128 139 Q124 140 123 144', 3.5); break;
    case 8: front += `<path d="M93 151 Q93 168 101 168 Q109 168 109 151 Z" fill="#F0614B"/>` + s('M84 148 Q100 158 116 148', 4.5) + s('M101 154 V162', 2.5); break;
    case 9: front += s('M84 147 Q92 156 100 148 Q108 156 116 147', 4.5); break;
  }

  // extras
  switch (a.extra) {
    case 1: front += `<path d="M100 184 L83 174 L83 194 Z M100 184 L117 174 L117 194 Z" fill="${INK}"/><circle cx="100" cy="184" r="4" fill="${INK}"/>`; break;
    case 2: front += `<circle cx="80" cy="108" r="16" fill="none" stroke="${INK}" stroke-width="4"/><circle cx="120" cy="108" r="16" fill="none" stroke="${INK}" stroke-width="4"/>` + s('M96 106 Q100 102 104 106', 4); break;
    case 3: [[70,128],[75,124],[78,131],[122,128],[127,124],[130,131]].forEach(([x,y]) => front += `<circle cx="${x}" cy="${y}" r="2.2" fill="${INK}" opacity=".75"/>`); break;
    case 4: front += `<path d="M78 142 Q100 126 122 142 Q111 148 100 140 Q89 148 78 142 Z" fill="${HC}"/>`; break;
    case 5: if (showEars) front += `<circle cx="${L+2}" cy="133" r="6.5" fill="${INK}"/><circle cx="${R-2}" cy="133" r="6.5" fill="${INK}"/>`; else front += `<circle cx="72" cy="128" r="7" fill="#fff" opacity=".35"/><circle cx="128" cy="128" r="7" fill="#fff" opacity=".35"/>`; break;
    case 6: front += `<ellipse cx="70" cy="128" rx="9" ry="6" fill="#fff" opacity=".35"/><ellipse cx="130" cy="128" rx="9" ry="6" fill="#fff" opacity=".35"/>`; break;
  }

  switch (a.extra) {
    case 7: front += `<rect x="62" y="98" width="34" height="22" rx="9" fill="${INK}"/><rect x="104" y="98" width="34" height="22" rx="9" fill="${INK}"/>` + s('M96 104 Q100 100 104 104', 4) + `<rect x="68" y="102" width="10" height="4" rx="2" fill="#fff" opacity=".5"/><rect x="110" y="102" width="10" height="4" rx="2" fill="#fff" opacity=".5"/>`; break;
    case 8: front += `<path d="M${L+10} 126 Q${L+12} 182 100 184 Q${R-12} 182 ${R-10} 126 Q${R-16} 166 100 170 Q${L+16} 166 ${L+10} 126 Z" fill="${HC}"/>`; break;
    case 9: front += `<circle cx="103" cy="139" r="5" fill="none" stroke="#F7C23E" stroke-width="3"/>`; break;
    case 10: front += `<g transform="rotate(-25 130 132)"><rect x="114" y="126" width="32" height="13" rx="6" fill="#F2D29F"/><rect x="125" y="126" width="10" height="13" fill="#E5BE85"/><circle cx="128" cy="130" r="1" fill="${INK}"/><circle cx="132" cy="135" r="1" fill="${INK}"/></g>`; break;
  }

  // pets — peeking into the bottom-left corner
  const petSvg = petSVG(a.pet, a.breed, a.petc, a.petm, id, hasMarkings(a.pet) ? a.petacc : 0, a.petaccc);
  const petLayer = petSvg ? `<g transform="translate(0 200) scale(1.5) translate(0 -200)">${petSvg}</g>` : '';

  const bg = opts.noBg ? '' : `<rect width="200" height="200" fill="${PASTEL[a.bg]}"/>`;
  const clip = shapes[a.shape].replace(/fill="[^"]*"/, '');
  return `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <defs>
      <clipPath id="${id}c">${clip}</clipPath>
      <filter id="${id}f" x="-10%" y="-10%" width="120%" height="120%"><feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="${a.seed % 97}"/><feDisplacementMap in="SourceGraphic" scale="3.2"/></filter>
    </defs>
    ${bg}<g filter="url(#${id}f)"><g transform="translate(18 -4) scale(.9)">${behind}${head}${front}</g>${petLayer}</g></svg>`;
}

export { INK, FACE, HAIR, PASTEL, PARTS, PART_LABELS, rng, randomAvatar, PET_NAMES, BREEDS, PETC, PET_DEFAULTS, FUR, BRIGHT, petPalette, PET_DEFAULT_COLOUR, petDefaults, hasMarkings, PET_ACC, isDark, petSVG, lighter, cleanAvatar, clampInt, avatarSVG };
