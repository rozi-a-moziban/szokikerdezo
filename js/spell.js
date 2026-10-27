/* Helyesírás-ellenőrzés és nyelvfelismerés nyelvi csomagokkal.
   Egy nyelvi csomag = egy szólista (dict/<nyelv>.txt, soronként egy szó,
   kisbetűvel; a '!' kezdetű szavak érvényesek, de javaslatként nem jelennek meg).
   Új nyelv: a szólistát a dict mappába kell tenni, és a config.js LANGS
   bejegyzésében a "dict" értéket true-ra állítani. Kód nem kell hozzá.
   Böngészőben: window.Spell, Node-ban: require('./spell.js'). */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./engine.js'));
  else root.Spell = factory(root.Engine);
})(typeof self !== 'undefined' ? self : this, function (Engine) {
  'use strict';

  const packs = {};
  const loading = {};
  let source = null; // function(lang) -> Promise<string>

  /* Szótárlistákban gyakori rövidítések (somebody, something stb.) */
  const ABBR = {
    en: ['sb', 'sth', 'smb', 'smth', 'sy', 'st', 'etc', 'eg', 'ie', 'vs', 'adj', 'adv', 'prep', 'conj', 'pron',
      'pl', 'sg', 'inf', 'fml', 'usu', 'esp', 'cf', 'ok', 'okay', 'bre', 'ame', 'n', 'v', 'sb\'s', 'sth\'s']
  };

  /* Nyelvre jellemző betűk (a szótár nélküli nyelvek felismeréséhez) */
  const SIGNS = {
    hu: /[őűŐŰáéíóöúüÁÉÍÓÖÚÜ]/,
    de: /[äöüßÄÖÜ]/,
    es: /[ñÑ¿¡áéíóúÁÉÍÓÚ]/,
    it: /[àèéìòùÀÈÉÌÒÙ]/
  };

  const WORD_RE = /[\p{L}]+(?:['’][\p{L}]+)*/gu;

  function setSource(fn) { source = fn; }

  function parsePack(text, lang) {
    const words = new Set();
    const nosug = new Set();
    String(text).split('\n').forEach(function (l) {
      l = l.trim();
      if (!l) return;
      if (l[0] === '!') nosug.add(l.slice(1)); else words.add(l);
    });
    (ABBR[lang] || []).forEach(function (w) { nosug.add(w); });
    const byLen = {};
    return { lang: lang, words: words, nosug: nosug, byLen: byLen };
  }

  function load(lang) {
    if (packs[lang]) return Promise.resolve(packs[lang]);
    if (loading[lang]) return loading[lang];
    if (!source) return Promise.resolve(null);
    loading[lang] = Promise.resolve().then(function () { return source(lang); }).then(function (text) {
      if (!text) return null;
      packs[lang] = parsePack(text, lang);
      return packs[lang];
    }).catch(function () { delete loading[lang]; return null; });
    return loading[lang];
  }

  function get(lang) { return packs[lang] || null; }
  function register(lang, text) { packs[lang] = parsePack(text, lang); return packs[lang]; }

  function tokens(str, offset) {
    const out = [];
    WORD_RE.lastIndex = 0;
    let m;
    while ((m = WORD_RE.exec(str))) out.push({ w: m[0], start: offset + m.index, end: offset + m.index + m[0].length });
    return out;
  }

  function low(w) { return w.normalize('NFC').replace(/’/g, "'").toLowerCase(); }

  function known(pack, word, extra) {
    const w = low(word);
    if (pack.words.has(w) || pack.nosug.has(w)) return true;
    if (extra) for (let i = 0; i < extra.length; i++) if (extra[i] && extra[i].has(w)) return true;
    if (/'s$/.test(w)) return known(pack, w.slice(0, -2), extra);
    return false;
  }

  /* Ellenőrizni kell-e a szót: rövid szó, nagybetűs rövidítés (UTC, BrE) nem. */
  function checkable(word) {
    if (word.length < 2) return false;
    if (/\p{Lu}/u.test(word.slice(1))) return false;
    return true;
  }

  /* A teljes szöveg ellenőrzése. langs: {a:'en', b:'hu'}.
     Visszaad: [{start, end, word, line}] a szövegbeli pozíciókkal. */
  function checkText(text, langs, extra) {
    const out = [];
    const lines = String(text).split('\n');
    let off = 0;
    for (let li = 0; li < lines.length; li++) {
      const line = lines[li];
      const sp = Engine.splitAt(line);
      const sides = sp ? [[0, sp.start, langs.a], [sp.end, line.length, langs.b]] : [];
      sides.forEach(function (sd) {
        const pack = packs[sd[2]];
        if (!pack) return;
        tokens(line.slice(sd[0], sd[1]), off + sd[0]).forEach(function (t) {
          if (!checkable(t.w)) return;
          if (!known(pack, t.w, extra)) out.push({ start: t.start, end: t.end, word: t.w, line: li + 1 });
        });
      });
      off += line.length + 1;
    }
    return out;
  }

  /* ---------- javaslatok (szerkesztési távolság 1, ha kevés: 2) ---------- */
  const ALPHA = 'abcdefghijklmnopqrstuvwxyz\'';

  function edits1(w) {
    const out = new Set();
    for (let i = 0; i <= w.length; i++) {
      const L = w.slice(0, i), R = w.slice(i);
      if (R) out.add(L + R.slice(1));
      if (R.length > 1) out.add(L + R[1] + R[0] + R.slice(2));
      for (let k = 0; k < ALPHA.length; k++) {
        const c = ALPHA[k];
        if (R) out.add(L + c + R.slice(1));
        out.add(L + c + R);
      }
    }
    out.delete(w);
    return out;
  }

  /* Nagyon gyakori angol szavak: azonos távolságnál ezek kerülnek előre. */
  const COMMON = new Set(('the be to of and in that have it for not on with he as you do at this but his by from they we ' +
    'say her she or an will my one all would there their what so up out if about who get which go me when make can like ' +
    'time no just him know take people into year your good some could them see other than then now look only come its ' +
    'over think also back after use two how our work first well way even new want because any these give day most us ' +
    'receive believe friend because school teacher study learn write read speak listen answer question english word ' +
    'supply simply really quite quiet while where were wear weather whether through though thought tomorrow necessary').split(' '));

  /* Mássalhangzó-váz (az első betű + mássalhangzók, ismétlés nélkül):
     a hasonló hangzású elírásokat (suppile ~ supply, wich ~ which) előre sorolja. */
  function skeleton(w) {
    let s = w[0] || '';
    for (let i = 1; i < w.length; i++) {
      const c = w[i];
      if ('aeiouyw\''.indexOf(c) >= 0) continue;
      if (s[s.length - 1] !== c) s += c;
    }
    return s;
  }

  /* Rangsor: kisebb távolság, hasonló váz, gyakori szó, azonos kezdőbetű, hasonló hossz. */
  function score(orig, cand, dist) {
    let s = dist * 100;
    if (skeleton(cand) === skeleton(orig)) s -= 45;
    if (COMMON.has(cand)) s -= 20;
    if (cand[0] !== orig[0]) s += 30;
    s += Math.abs(cand.length - orig.length) * 4;
    let p = 0;
    while (p < cand.length && p < orig.length && cand[p] === orig[p]) p++;
    s -= Math.min(p, 6) * 2;
    if (cand.indexOf("'") >= 0) s += 15;
    return s;
  }

  const cache = {};
  function suggest(lang, word, n) {
    const pack = packs[lang];
    if (!pack) return [];
    n = n || 4;
    const key = lang + ':' + n + ':' + word;
    if (cache[key]) return cache[key].slice();
    const w = low(word);
    const found = new Map();
    const e1 = edits1(w);
    e1.forEach(function (c) { if (pack.words.has(c)) found.set(c, score(w, c, 1)); });
    if (found.size < n && w.length <= 14) {
      e1.forEach(function (c) {
        if (c.length < 2) return;
        edits1(c).forEach(function (c2) {
          if (c2 !== w && !found.has(c2) && pack.words.has(c2)) found.set(c2, score(w, c2, 2));
        });
      });
    }
    // két szóra bontás (penpal -> pen pal)
    for (let i = 3; i <= w.length - 3; i++) {
      const x = w.slice(0, i), y = w.slice(i);
      if (pack.words.has(x) && pack.words.has(y) && x.length > 1 && y.length > 1) found.set(x + ' ' + y, 160);
    }
    found.forEach(function (v, k) { if (!/[aeiouy]/.test(k)) found.delete(k); });
    const list = Array.from(found.entries()).sort(function (x, y) { return x[1] - y[1] || (x[0] < y[0] ? -1 : 1); })
      .slice(0, n).map(function (e) { return e[0]; });
    const cap = word[0] !== word[0].toLowerCase();
    cache[key] = list.map(function (s) { return cap ? s[0].toUpperCase() + s.slice(1) : s; });
    return cache[key].slice();
  }

  /* ---------- nyelvfelismerés ----------
     fit(oszlop, nyelv): 0..1, mennyire illik az oszlop a nyelvhez.
     Szótáras nyelvnél az ismert szavak aránya, egyébként a jellemző betűk. */
  function fit(col, lang) {
    if (!col.length) return 0;
    const pack = packs[lang];
    let hit = 0;
    col.forEach(function (s) {
      if (pack) {
        const ws = tokens(s, 0).filter(function (t) { return t.w.length > 1; });
        if (!ws.length) return;
        const k = ws.filter(function (t) { return known(pack, t.w); }).length;
        if (k * 2 >= ws.length) hit++;
      } else if (SIGNS[lang] && SIGNS[lang].test(s)) {
        hit++;
      }
    });
    return hit / col.length;
  }

  function canDetect(lang) { return !!packs[lang] || !!SIGNS[lang]; }

  /* Visszaad: 'ok' | 'reversed' | 'unknown' */
  function detectOrientation(pairs, langs) {
    if (!pairs || pairs.length < 5 || langs.a === langs.b) return 'unknown';
    if (!canDetect(langs.a) && !canDetect(langs.b)) return 'unknown';
    const A = pairs.map(function (p) { return p.a; });
    const B = pairs.map(function (p) { return p.b; });
    const straight = fit(A, langs.a) + fit(B, langs.b);
    const crossed = fit(A, langs.b) + fit(B, langs.a);
    if (crossed - straight > 0.4) return 'reversed';
    if (straight - crossed > 0.2) return 'ok';
    return 'unknown';
  }

  return { setSource: setSource, load: load, get: get, register: register, parsePack: parsePack,
    tokens: tokens, known: known, checkText: checkText, suggest: suggest,
    fit: fit, detectOrientation: detectOrientation, canDetect: canDetect };
});
