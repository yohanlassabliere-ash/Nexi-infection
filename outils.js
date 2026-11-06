/* ==================================================================
   NEXI : INFECTION — OUTILS COMMUNS DE L'ATELIER
   Utilisés par atelier/ (modifier le code) et jouer/ (jouer à une version modifiée).

   Le principe : on n'envoie pas tout le code au téléphone (trop gros pour un
   QR code), seulement les DIFFÉRENCES avec la version d'origine, compressées.
   Le téléphone récupère la version d'origine sur le site et y réapplique
   les modifications du visiteur.
   ================================================================== */
"use strict";

// Empreinte d'un texte (FNV-1a 32 bits) : identifie la version d'origine
function empreinte(texte) {
  let h = 0x811c9dc5;
  for (const o of new TextEncoder().encode(texte)) { h ^= o; h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(16).padStart(8, "0");
}

// Différences ligne par ligne (algorithme de Myers).
// Renvoie une liste de « blocs » [position dans l'original, lignes supprimées, lignes ajoutées].
function differences(a, b, maxEtapes = 3000) {
  const N = a.length, M = b.length, max = N + M, off = max + 1;
  const v = new Int32Array(2 * max + 2), traces = [];
  let trouve = -1;
  for (let d = 0; d <= Math.min(max, maxEtapes); d++) {
    traces.push(v.slice());
    for (let k = -d; k <= d; k += 2) {
      let x = (k === -d || (k !== d && v[off + k - 1] < v[off + k + 1])) ? v[off + k + 1] : v[off + k - 1] + 1;
      let y = x - k;
      while (x < N && y < M && a[x] === b[y]) { x++; y++; }
      v[off + k] = x;
      if (x >= N && y >= M) { trouve = d; break; }
    }
    if (trouve >= 0) break;
  }
  if (trouve < 0) return [[0, N, b.slice()]];   // trop de changements : on remplace tout
  // on remonte le chemin pour retrouver les ajouts et suppressions
  const modifs = [];
  let x = N, y = M;
  for (let d = trouve; d > 0; d--) {
    const vv = traces[d], k = x - y;
    const kPrec = (k === -d || (k !== d && vv[off + k - 1] < vv[off + k + 1])) ? k + 1 : k - 1;
    const xPrec = vv[off + kPrec], yPrec = xPrec - kPrec;
    while (x > xPrec && y > yPrec) { x--; y--; }
    if (x === xPrec) modifs.push({ ajout: true, pos: xPrec, ligne: b[yPrec] });
    else modifs.push({ ajout: false, pos: xPrec });
    x = xPrec; y = yPrec;
  }
  modifs.reverse();
  // on regroupe les modifications voisines en blocs
  const blocs = [];
  for (const m of modifs) {
    const dernier = blocs[blocs.length - 1];
    const suite = dernier && m.pos === dernier[0] + dernier[1];
    if (m.ajout) { if (suite) dernier[2].push(m.ligne); else blocs.push([m.pos, 0, [m.ligne]]); }
    else { if (suite) dernier[1]++; else blocs.push([m.pos, 1, []]); }
  }
  return blocs;
}
function appliquerDifferences(lignes, blocs) {
  const r = lignes.slice();
  for (const [pos, sup, ajouts] of blocs.slice().sort((p, q) => q[0] - p[0])) r.splice(pos, sup, ...ajouts);
  return r;
}

// Compression (deflate) + encodage compatible avec une adresse web
async function compresser(texte) {
  const flux = new Blob([new TextEncoder().encode(texte)]).stream().pipeThrough(new CompressionStream("deflate-raw"));
  const o = new Uint8Array(await new Response(flux).arrayBuffer());
  let s = ""; for (const x of o) s += String.fromCharCode(x);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
async function decompresser(b64) {
  const s = atob(b64.replace(/-/g, "+").replace(/_/g, "/"));
  const o = Uint8Array.from(s, (c) => c.charCodeAt(0));
  const flux = new Blob([o]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return new TextDecoder().decode(await new Response(flux).arrayBuffer());
}
// Le « paquet » qui voyage dans le QR code : id de l'original ~ différences compressées
async function creerPaquet(original, modifie) {
  const blocs = differences(original.split("\n"), modifie.split("\n"));
  return { id: empreinte(original), blocs, texte: empreinte(original) + "~" + await compresser(JSON.stringify(blocs)) };
}
async function ouvrirPaquet(texte) {
  const [id, donnees] = texte.split("~");
  return { id, blocs: donnees ? JSON.parse(await decompresser(donnees)) : [] };
}

// ------------------------------------------------------------------
// QR code (mode octets, correction d'erreur « L », versions 1 à 25)
// Renvoie une grille de booléens, ou null si le texte est trop long.
// ------------------------------------------------------------------
function qrCode(texte) {
  const ECC = [-1, 7, 10, 15, 20, 26, 18, 20, 24, 30, 18, 20, 24, 26, 30, 22, 24, 28, 30, 28, 28, 28, 28, 30, 30, 26];
  const BLOCS = [-1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 4, 4, 4, 4, 4, 6, 6, 6, 6, 7, 8, 8, 9, 9, 10, 12];
  const octets = new TextEncoder().encode(texte);
  const brut = (v) => { let r = (16 * v + 128) * v + 64; if (v >= 2) { const n = Math.floor(v / 7) + 2; r -= (25 * n - 10) * n - 55; if (v >= 7) r -= 36; } return r; };
  const capacite = (v) => Math.floor(brut(v) / 8) - ECC[v] * BLOCS[v];
  const bitsNecessaires = (v) => 4 + (v < 10 ? 8 : 16) + octets.length * 8;
  let v = 1;
  while (v <= 25 && bitsNecessaires(v) > capacite(v) * 8) v++;
  if (v > 25) return null;
  const bits = [];
  const ajouter = (val, n) => { for (let i = n - 1; i >= 0; i--) bits.push((val >>> i) & 1); };
  ajouter(4, 4); ajouter(octets.length, v < 10 ? 8 : 16);
  for (const o of octets) ajouter(o, 8);
  const cap = capacite(v) * 8;
  ajouter(0, Math.min(4, cap - bits.length));
  while (bits.length % 8) bits.push(0);
  const donnees = [];
  for (let i = 0; i < bits.length; i += 8) donnees.push(parseInt(bits.slice(i, i + 8).join(""), 2));
  for (let p = 0xEC; donnees.length < capacite(v); p ^= 0xEC ^ 0x11) donnees.push(p);
  const mul = (x, y) => { let z = 0; for (let i = 7; i >= 0; i--) { z = (z << 1) ^ ((z >>> 7) * 0x11D); z ^= ((y >>> i) & 1) * x; } return z & 255; };
  const div = new Array(ECC[v]).fill(0); div[ECC[v] - 1] = 1;
  for (let i = 0, r = 1; i < ECC[v]; i++) {
    for (let j = 0; j < div.length; j++) { div[j] = mul(div[j], r); if (j + 1 < div.length) div[j] ^= div[j + 1]; }
    r = mul(r, 2);
  }
  const reste = (d) => { const r = new Array(div.length).fill(0); for (const b of d) { const f = b ^ r.shift(); r.push(0); div.forEach((c, i) => { r[i] ^= mul(c, f); }); } return r; };
  const nb = BLOCS[v], total = Math.floor(brut(v) / 8), courts = nb - total % nb, lgCourt = Math.floor(total / nb);
  const blocs = [];
  for (let i = 0, k = 0; i < nb; i++) {
    const d = donnees.slice(k, k + lgCourt - ECC[v] + (i < courts ? 0 : 1)); k += d.length;
    const e = reste(d); if (i < courts) d.push(0); blocs.push(d.concat(e));
  }
  const final = [];
  for (let i = 0; i < blocs[0].length; i++) blocs.forEach((b, j) => { if (i !== lgCourt - ECC[v] || j >= courts) final.push(b[i]); });
  const n = v * 4 + 17, mod = [], fixe = [];
  for (let y = 0; y < n; y++) { mod.push(new Array(n).fill(false)); fixe.push(new Array(n).fill(false)); }
  const poser = (x, y, noir) => { mod[y][x] = noir; fixe[y][x] = true; };
  for (let i = 0; i < n; i++) { poser(6, i, i % 2 === 0); poser(i, 6, i % 2 === 0); }
  for (const [cx, cy] of [[3, 3], [n - 4, 3], [3, n - 4]])
    for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) {
      const d = Math.max(Math.abs(dx), Math.abs(dy)), x = cx + dx, y = cy + dy;
      if (x >= 0 && x < n && y >= 0 && y < n) poser(x, y, d !== 2 && d !== 4);
    }
  if (v > 1) {
    const na = Math.floor(v / 7) + 2, pas = Math.ceil((v * 4 + 4) / (na * 2 - 2)) * 2, pos = [6];
    for (let p = n - 7; pos.length < na; p -= pas) pos.splice(1, 0, p);
    pos.forEach((a, i) => pos.forEach((b, j) => {
      if ((i === 0 && j === 0) || (i === 0 && j === na - 1) || (i === na - 1 && j === 0)) return;
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) poser(a + dx, b + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
    }));
  }
  const format = (masque) => {
    const d = (1 << 3) | masque; let r = d;   // niveau L = 01
    for (let i = 0; i < 10; i++) r = (r << 1) ^ ((r >>> 9) * 0x537);
    const b = ((d << 10) | r) ^ 0x5412, bit = (i) => ((b >>> i) & 1) === 1;
    for (let i = 0; i <= 5; i++) poser(8, i, bit(i));
    poser(8, 7, bit(6)); poser(8, 8, bit(7)); poser(7, 8, bit(8));
    for (let i = 9; i < 15; i++) poser(14 - i, 8, bit(i));
    for (let i = 0; i < 8; i++) poser(n - 1 - i, 8, bit(i));
    for (let i = 8; i < 15; i++) poser(8, n - 15 + i, bit(i));
    poser(8, n - 8, true);
  };
  format(0);
  if (v >= 7) {
    let r = v; for (let i = 0; i < 12; i++) r = (r << 1) ^ ((r >>> 11) * 0x1F25);
    const b = (v << 12) | r;
    for (let i = 0; i < 18; i++) { const bit = ((b >>> i) & 1) === 1, a = n - 11 + i % 3, c = Math.floor(i / 3); poser(a, c, bit); poser(c, a, bit); }
  }
  let i = 0;
  for (let droite = n - 1; droite >= 1; droite -= 2) {
    if (droite === 6) droite = 5;
    for (let vert = 0; vert < n; vert++) for (let j = 0; j < 2; j++) {
      const x = droite - j, monte = ((droite + 1) & 2) === 0, y = monte ? n - 1 - vert : vert;
      if (!fixe[y][x] && i < final.length * 8) { mod[y][x] = ((final[i >>> 3] >>> (7 - (i & 7))) & 1) === 1; i++; }
    }
  }
  const inverse = (m, x, y) => [(x + y) % 2, y % 2, x % 3, (x + y) % 3, (Math.floor(x / 3) + Math.floor(y / 2)) % 2, x * y % 2 + x * y % 3, (x * y % 2 + x * y % 3) % 2, ((x + y) % 2 + x * y % 3) % 2][m] === 0;
  const masquer = (m) => { for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (!fixe[y][x] && inverse(m, x, y)) mod[y][x] = !mod[y][x]; };
  const penalite = () => {
    let p = 0, noirs = 0;
    for (let a = 0; a < n; a++) for (const ligne of [true, false]) {
      let suite = 1;
      for (let b = 1; b <= n; b++) {
        const c = b < n && (ligne ? mod[a][b] === mod[a][b - 1] : mod[b][a] === mod[b - 1][a]);
        if (c) suite++; else { if (suite >= 5) p += suite - 2; suite = 1; }
      }
    }
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      if (mod[y][x]) noirs++;
      if (x < n - 1 && y < n - 1 && mod[y][x] === mod[y][x + 1] && mod[y][x] === mod[y + 1][x] && mod[y][x] === mod[y + 1][x + 1]) p += 3;
    }
    return p + Math.floor(Math.abs(noirs * 20 - n * n * 10) / (n * n)) * 10;
  };
  let meilleur = 0, min = Infinity;
  for (let m = 0; m < 8; m++) { masquer(m); format(m); const p = penalite(); if (p < min) { min = p; meilleur = m; } masquer(m); }
  masquer(meilleur); format(meilleur);
  return mod;
}
// Dessine un QR code dans un <canvas>, avec la marge blanche obligatoire
function dessinerQRCanvas(canvas, grille, taillePx) {
  const n = grille.length, k = Math.max(2, Math.floor(taillePx / (n + 8)));
  canvas.width = canvas.height = (n + 8) * k;
  const g = canvas.getContext("2d");
  g.fillStyle = "#fff"; g.fillRect(0, 0, canvas.width, canvas.height);
  g.fillStyle = "#000";
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (grille[y][x]) g.fillRect((x + 4) * k, (y + 4) * k, k, k);
}
// Pour les tests en ligne de commande (Node)
if (typeof module !== "undefined") module.exports = { empreinte, differences, appliquerDifferences, qrCode };
