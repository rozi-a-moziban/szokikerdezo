/* Tiszta játéklogika: nincs benne felületkód, Node-ban is tesztelhető.
   Az adatmodell nyelvsemleges: a szópár "a" és "b" oldala. A kikérdezés iránya
   "ab" (a kérdés az a oldal, a válasz a b) vagy "ba" (fordítva). */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Engine = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const MIN_PAIRS = 10;
  const DIRS = ['ab', 'ba'];

  /* ---------- szöveg ---------- */
  function norm(s) {
    return String(s == null ? '' : s).normalize('NFC').trim().replace(/\s+/g, ' ').toLowerCase();
  }

  /* Egy jelentéscsoport részei: vessző, pontosvessző vagy perjel választja el. */
  function parts(s) {
    return String(s == null ? '' : s).split(/[,;\/]/).map(norm).filter(Boolean);
  }

  function overlaps(x, y) {
    const px = parts(x);
    if (!px.length) return false;
    const py = new Set(parts(y));
    for (let i = 0; i < px.length; i++) if (py.has(px[i])) return true;
    return false;
  }

  function shuffle(arr, rng) {
    rng = rng || Math.random;
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      const t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function uid() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
    return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
  }

  /* ---------- beírt szöveg beolvasása ----------
     Elválasztók: tabulátor, "=", vagy " - " / " – " / " — " (szóközökkel).
     A kötőjeles szó (e-mail, know-it-all) nem esik szét. */
  function splitAt(line) {
    let i = line.indexOf('\t');
    if (i >= 0) return { start: i, end: i + 1 };
    i = line.indexOf('=');
    if (i >= 0) return { start: i, end: i + 1 };
    const m = /\s[-–—]\s/.exec(line);
    if (m) return { start: m.index, end: m.index + m[0].length };
    return null;
  }

  function splitLine(line) {
    const s = splitAt(line);
    return s ? [line.slice(0, s.start), line.slice(s.end)] : null;
  }

  function parseLines(text) {
    const pairs = [];
    const errors = [];
    String(text == null ? '' : text).split(/\r?\n/).forEach(function (raw, idx) {
      if (!raw.trim()) return;
      const parts2 = splitLine(raw);
      if (!parts2) { errors.push({ line: idx + 1, text: raw, code: 'nosep' }); return; }
      const a = parts2[0].trim().replace(/\s+/g, ' ');
      const b = parts2[1].trim().replace(/\s+/g, ' ');
      if (!a) { errors.push({ line: idx + 1, text: raw, code: 'emptyA' }); return; }
      if (!b) { errors.push({ line: idx + 1, text: raw, code: 'emptyB' }); return; }
      pairs.push({ a: a, b: b, line: idx + 1 });
    });
    return { pairs: pairs, errors: errors };
  }

  function serialize(pairs) {
    return pairs.map(function (p) { return p.a + ' - ' + p.b; }).join('\n');
  }

  /* Oszlopcsere a szövegben: minden szópár-sorban a két oldal helyet cserél.
     Az elválasztó nélküli sorok változatlanok maradnak. */
  function swapText(text) {
    return String(text == null ? '' : text).split('\n').map(function (raw) {
      const p = splitLine(raw.replace(/\r$/, ''));
      if (!p || !p[0].trim() || !p[1].trim()) return raw;
      return p[1].trim() + ' - ' + p[0].trim();
    }).join('\n');
  }

  /* ---------- lista-ellenőrzés ---------- */
  function findDuplicates(pairs) {
    const map = new Map();
    pairs.forEach(function (p, i) {
      const k = norm(p.a);
      if (!map.has(k)) map.set(k, []);
      map.get(k).push(i);
    });
    const out = [];
    map.forEach(function (idxs) {
      if (idxs.length > 1) out.push({ word: pairs[idxs[0]].a, indexes: idxs });
    });
    return out;
  }

  /* Azonos "a" oldal összevonása: a "b" jelentések egy sorba kerülnek,
     ismétlődés nélkül. Az első előfordulás helyén marad az összevont sor. */
  function mergeDuplicates(pairs) {
    const out = [];
    const seen = new Map();
    pairs.forEach(function (p) {
      const k = norm(p.a);
      if (!seen.has(k)) {
        const copy = Object.assign({}, p);
        seen.set(k, copy);
        out.push(copy);
      } else {
        const target = seen.get(k);
        const have = new Set(target.b.split(',').map(norm));
        p.b.split(',').forEach(function (part) {
          const t = part.trim();
          if (t && !have.has(norm(t))) { target.b += ', ' + t; have.add(norm(t)); }
        });
      }
    });
    return out;
  }

  /* A kikérdezés irányához igazított szópárok (az azonosító megmarad). */
  function orient(pairs, dir) {
    if (dir !== 'ba') return pairs;
    return pairs.map(function (p) { return { id: p.id, a: p.b, b: p.a, order: p.order }; });
  }

  /* Hibás válaszlehetőségek egy kérdéshez. Kimarad:
     - a saját válasszal azonos felirat, és az egymással azonos feliratok;
     - az a szópár, amelynek kérdésoldala átfed a feltett kérdéssel
       (pl. fordított irányban a "bizonyíték" kérdésnél a proof és az evidence
       is helyes lenne, ezért a másik nem lehet hibás opció). */
  function candidatesFor(pairs, pair) {
    const own = norm(pair.b);
    const seen = new Set([own]);
    const out = [];
    pairs.forEach(function (p) {
      if (p.id === pair.id) return;
      const k = norm(p.b);
      if (seen.has(k)) return;
      if (overlaps(p.a, pair.a)) return;
      seen.add(k);
      out.push(p);
    });
    return out;
  }

  function checkPlayable(pairs, minPairs) {
    minPairs = minPairs || MIN_PAIRS;
    const problems = [];
    if (pairs.length < minPairs) {
      return { ok: false, tooFew: true, have: pairs.length, need: minPairs, problems: problems };
    }
    pairs.forEach(function (p) {
      if (candidatesFor(pairs, p).length < 4) problems.push(p.a);
    });
    return { ok: problems.length === 0, tooFew: false, have: pairs.length, need: minPairs, problems: problems };
  }

  function buildQuestion(pairs, pair, rng) {
    const cands = candidatesFor(pairs, pair);
    if (cands.length < 4) throw new Error('Nincs elég különböző hibás válasz: ' + pair.a);
    const wrong = shuffle(cands, rng).slice(0, 4);
    const options = shuffle([{ text: pair.b, correct: true }].concat(
      wrong.map(function (w) { return { text: w.b, correct: false }; })), rng);
    return { pairId: pair.id, a: pair.a, options: options, selected: null };
  }

  /* ---------- játék (JSON-ba menthető állapot) ----------
     A "pairs" paraméter mindig a játék irányához igazított lista (orient). */
  function byId(pairs, id) {
    for (let i = 0; i < pairs.length; i++) if (pairs[i].id === id) return pairs[i];
    return null;
  }

  function ensureCurrent(game, pairs, rng) {
    if (game.phase !== 'question') return;
    if (game.current) return;
    const id = game.queue[game.pos];
    game.current = buildQuestion(pairs, byId(pairs, id), rng);
  }

  function newGame(listId, listVersion, pairs, rng, dir) {
    const game = {
      list_id: listId, list_version: listVersion, dir: dir === 'ba' ? 'ba' : 'ab',
      round: 1,
      queue: shuffle(pairs.map(function (p) { return p.id; }), rng),
      pos: 0, wrong: [], correct: 0,
      phase: 'question', current: null, rounds: [],
      started: Date.now()
    };
    ensureCurrent(game, pairs, rng);
    return game;
  }

  /* Válasz rögzítése. Csak az első választás számít. */
  function answer(game, index) {
    if (game.phase !== 'question' || !game.current || game.current.selected !== null) return null;
    if (!game.current.options[index]) return null;
    game.current.selected = index;
    const ok = !!game.current.options[index].correct;
    if (ok) game.correct++; else game.wrong.push(game.current.pairId);
    return { correct: ok };
  }

  /* Tovább: a következő kérdés, vagy a kör vége. */
  function next(game, pairs, rng) {
    if (game.phase !== 'question' || !game.current || game.current.selected === null) return game;
    game.pos++;
    game.current = null;
    if (game.pos >= game.queue.length) {
      game.rounds.push({ round: game.round, total: game.queue.length, correct: game.correct, wrong: game.wrong.slice() });
      game.phase = 'roundEnd';
    } else {
      ensureCurrent(game, pairs, rng);
    }
    return game;
  }

  function lastRound(game) { return game.rounds[game.rounds.length - 1] || null; }

  function isComplete(game) {
    const r = lastRound(game);
    return game.phase === 'roundEnd' && !!r && r.wrong.length === 0;
  }

  /* Következő kör: csak az előző kör hibás szavai, új sorrendben. */
  function nextRound(game, pairs, rng) {
    const r = lastRound(game);
    if (game.phase !== 'roundEnd' || !r || r.wrong.length === 0) return game;
    game.round++;
    game.queue = shuffle(r.wrong, rng);
    game.pos = 0; game.wrong = []; game.correct = 0;
    game.phase = 'question'; game.current = null;
    ensureCurrent(game, pairs, rng);
    return game;
  }

  function percent(correct, total) { return total ? Math.round(correct * 100 / total) : 0; }

  function summary(game) {
    const first = game.rounds[0];
    return {
      rounds: game.rounds.length,
      firstPercent: first ? percent(first.correct, first.total) : 0
    };
  }

  return {
    MIN_PAIRS: MIN_PAIRS, DIRS: DIRS, norm: norm, parts: parts, overlaps: overlaps, shuffle: shuffle, uid: uid,
    splitAt: splitAt, splitLine: splitLine, parseLines: parseLines, serialize: serialize, swapText: swapText,
    findDuplicates: findDuplicates, mergeDuplicates: mergeDuplicates, orient: orient,
    candidatesFor: candidatesFor, checkPlayable: checkPlayable, buildQuestion: buildQuestion,
    newGame: newGame, ensureCurrent: ensureCurrent, answer: answer, next: next,
    nextRound: nextRound, lastRound: lastRound, isComplete: isComplete,
    percent: percent, summary: summary, byId: byId
  };
});
