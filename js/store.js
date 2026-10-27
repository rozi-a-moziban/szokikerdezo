/* Tárolás (helyi tároló) és import/export. Később IndexedDB-re cserélhető,
   ha a felület fölötte nem változik.
   Adatséma 2 (0.2.0): irányonkénti játék és teljesítés, saját szótár,
   listánkénti kihagyott szavak. Az 1-es sémát betöltéskor átalakítja. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory;
  else root.Store = factory(root.APP_CONFIG, root.Engine, root.localStorage ? {
    get: function (k) { return root.localStorage.getItem(k); },
    set: function (k, v) { root.localStorage.setItem(k, v); }
  } : null);
})(typeof self !== 'undefined' ? self : this, function (CFG, E, storage) {
  'use strict';

  let state = null;
  let memoryOnly = false;
  let memoryCopy = null;

  function defaults() {
    return { lang: 'hu', theme: 'system', fontScale: 1, accent: 'GB', autoNext: CFG.AUTO_NEXT_DEFAULT, autoNextSet: false, dirOrder: 'fromHu' };
  }
  function fresh() {
    return { v: 2, folders: [], lists: [], games: {}, settings: defaults(), dict: [], flags: {} };
  }

  /* ---------- átalakítás régebbi sémáról ---------- */
  function migrateList(l) {
    if (!l.languages) l.languages = { a: 'en', b: 'hu' };
    if (!l.completed) {
      l.completed = { ab: l.completed_at || null, ba: null };
    }
    delete l.completed_at;
    if (!Array.isArray(l.spell_ignore)) l.spell_ignore = [];
    if (!Array.isArray(l.pairs)) l.pairs = [];
    return l;
  }
  function migrateGames(games) {
    const out = {};
    Object.keys(games || {}).forEach(function (id) {
      const g = games[id];
      if (!g) return;
      if (g.queue) { g.dir = 'ab'; out[id] = { ab: g }; }        // 1-es séma: egy játék listánként
      else out[id] = { ab: g.ab || undefined, ba: g.ba || undefined };
      if (!out[id].ab) delete out[id].ab;
      if (!out[id].ba) delete out[id].ba;
      if (!out[id].ab && !out[id].ba) delete out[id];
    });
    return out;
  }
  function migrate(s) {
    const st = Object.assign(fresh(), s || {});
    st.settings = Object.assign(defaults(), (s && s.settings) || {});
    // amíg a felhasználó nem állította be, az időzítés a program alapértéke (0.2.1: 3 mp)
    if (!st.settings.autoNextSet) st.settings.autoNext = CFG.AUTO_NEXT_DEFAULT;
    st.folders = Array.isArray(st.folders) ? st.folders : [];
    st.lists = (Array.isArray(st.lists) ? st.lists : []).map(migrateList);
    st.games = migrateGames(st.games);
    st.dict = Array.isArray(st.dict) ? st.dict : [];
    st.flags = st.flags || {};
    st.v = 2;
    return st;
  }

  function load() {
    if (state) return state;
    let raw = null;
    if (storage) {
      try { raw = storage.get(CFG.STORAGE_KEY); } catch (e) { memoryOnly = true; }
    } else {
      memoryOnly = true;
    }
    if (raw) {
      try { state = migrate(JSON.parse(raw)); } catch (e) { state = fresh(); }
    } else {
      state = memoryCopy || fresh();
    }
    return state;
  }

  function save() {
    const s = load();
    if (!storage) { memoryOnly = true; memoryCopy = s; return; }
    try {
      storage.set(CFG.STORAGE_KEY, JSON.stringify(s));
    } catch (e) {
      memoryOnly = true;
      memoryCopy = s;
    }
  }

  function isMemoryOnly() { return memoryOnly; }

  /* ---------- mappák ---------- */
  function addFolder(name) {
    const s = load();
    const f = { id: E.uid(), name: name, parent_id: null, order: s.folders.length };
    s.folders.push(f); save(); return f;
  }
  function renameFolder(id, name) {
    const f = load().folders.find(function (x) { return x.id === id; });
    if (f) { f.name = name; save(); }
  }
  function deleteFolder(id) { // a mappa listái a főmappába kerülnek
    const s = load();
    s.lists.forEach(function (l) { if (l.folder_id === id) l.folder_id = null; });
    s.folders = s.folders.filter(function (f) { return f.id !== id; });
    save();
  }
  function getFolder(id) { return load().folders.find(function (f) { return f.id === id; }) || null; }

  /* ---------- listák ---------- */
  function getList(id) { return load().lists.find(function (l) { return l.list_id === id; }) || null; }

  function addList(name, pairs, folderId, languages, ignore) {
    const s = load();
    const l = migrateList({
      format: 'vocabulary-list', schema_version: CFG.SCHEMA_VERSION,
      list_id: E.uid(), name: name, languages: languages || { a: 'en', b: 'hu' },
      folder_id: folderId || null, version: 1, created: Date.now(), updated: Date.now(),
      completed: { ab: null, ba: null }, spell_ignore: ignore || [], pairs: pairs
    });
    s.lists.push(l); save(); return l;
  }

  /* contentChanged: a szópárok vagy a nyelvek változtak -> a játékok és a
     teljesítés törlődik, a verzió nő. Csak névváltozásnál ezek megmaradnak. */
  function updateList(id, fields, contentChanged) {
    const s = load();
    const l = getList(id);
    if (!l) return null;
    ['name', 'pairs', 'languages', 'spell_ignore'].forEach(function (k) { if (fields[k] !== undefined) l[k] = fields[k]; });
    l.updated = Date.now();
    if (contentChanged) {
      l.version++;
      l.completed = { ab: null, ba: null };
      delete s.games[id];
    }
    save(); return l;
  }

  function moveList(id, folderId) {
    const l = getList(id);
    if (l) { l.folder_id = folderId || null; save(); }
  }

  function deleteList(id) {
    const s = load();
    s.lists = s.lists.filter(function (l) { return l.list_id !== id; });
    delete s.games[id];
    save();
  }

  /* ---------- játék (irányonként: 'ab' vagy 'ba') ---------- */
  function getGame(listId, dir) { const g = load().games[listId]; return (g && g[dir]) || null; }
  function hasAnyGame(listId) { const g = load().games[listId]; return !!(g && (g.ab || g.ba)); }
  function setGame(listId, dir, game) {
    const s = load();
    if (!s.games[listId]) s.games[listId] = {};
    s.games[listId][dir] = game; save();
  }
  function clearGame(listId, dir) {
    const s = load();
    if (!s.games[listId]) return;
    if (dir) delete s.games[listId][dir]; else delete s.games[listId];
    if (s.games[listId] && !s.games[listId].ab && !s.games[listId].ba) delete s.games[listId];
    save();
  }
  function markCompleted(listId, dir) {
    const l = getList(listId);
    if (l) l.completed[dir] = Date.now();
    clearGame(listId, dir);
  }

  /* Számított állapot irányonként: new | paused | done */
  function listState(listId, dir) {
    if (getGame(listId, dir)) return 'paused';
    const l = getList(listId);
    return l && l.completed && l.completed[dir] ? 'done' : 'new';
  }

  /* ---------- saját szótár (minden listában érvényes) ---------- */
  function dictSet() { return new Set(load().dict); }
  function addWord(w) {
    const s = load();
    const k = String(w).normalize('NFC').replace(/’/g, "'").toLowerCase();
    if (s.dict.indexOf(k) < 0) { s.dict.push(k); s.dict.sort(); save(); }
  }
  function removeWord(w) {
    const s = load();
    s.dict = s.dict.filter(function (x) { return x !== w; });
    save();
  }
  /* Melyik listában fordul elő a szó (a saját szótár képernyőjéhez) */
  function whereIs(word) {
    const s = load();
    const re = new RegExp('(^|[^\\p{L}])' + word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '($|[^\\p{L}])', 'iu');
    return s.lists.filter(function (l) {
      return l.pairs.some(function (p) { return re.test(p.a) || re.test(p.b); });
    }).map(function (l) {
      const f = l.folder_id ? getFolder(l.folder_id) : null;
      return { list: l.name, folder: f ? f.name : null, id: l.list_id };
    });
  }

  /* ---------- beállítások ---------- */
  function setSetting(k, v) { load().settings[k] = v; save(); }
  function setFlag(k, v) { load().flags[k] = v; save(); }

  /* ---------- export / import ---------- */
  function exportList(id) {
    const l = getList(id);
    return JSON.stringify({
      format: 'vocabulary-list', schema_version: CFG.SCHEMA_VERSION,
      list_id: l.list_id, name: l.name, languages: l.languages, spell_ignore: l.spell_ignore,
      pairs: l.pairs.map(function (p, i) { return { id: p.id, a: p.a, b: p.b, order: i + 1 }; })
    }, null, 2);
  }

  function exportAll() {
    const s = load();
    return JSON.stringify({
      format: 'vocabulary-backup', schema_version: CFG.SCHEMA_VERSION,
      folders: s.folders, lists: s.lists, games: s.games, dict: s.dict
    }, null, 2);
  }

  function normalizePairs(arr) {
    return arr.map(function (p, i) {
      const a = p.a != null ? p.a : p.english;
      const b = p.b != null ? p.b : p.magyar;
      return { id: p.id || E.uid(), a: String(a == null ? '' : a).trim(), b: String(b == null ? '' : b).trim(), order: i + 1 };
    });
  }

  /* JSON beolvasása: lista vagy teljes mentés.
     Visszaad: {kind:'list'|'backup', ...} vagy {error:'...'} */
  function parseImport(text, fileName) {
    const t = String(text || '').replace(/^﻿/, '').trim();
    if (!t) return { error: 'empty' };
    let obj;
    try { obj = JSON.parse(t); } catch (e) { return { error: 'json' }; }
    if (obj.schema_version && obj.schema_version > CFG.SCHEMA_VERSION) return { error: 'version' };
    if (obj.format === 'vocabulary-backup') return { kind: 'backup', data: obj };
    const pairs = obj.pairs || obj.words;
    if (!Array.isArray(pairs)) return { error: 'format' };
    const np = normalizePairs(pairs);
    const bad = [];
    np.forEach(function (p, i) { if (!p.a || !p.b) bad.push(i + 1); });
    if (bad.length) return { error: 'rows', rows: bad };
    return {
      kind: 'list', name: obj.name || String(fileName || '').replace(/\.[^.]+$/, '') || 'Lista', pairs: np,
      list_id: obj.list_id, languages: obj.languages && obj.languages.a && obj.languages.b ? obj.languages : null,
      spell_ignore: Array.isArray(obj.spell_ignore) ? obj.spell_ignore : []
    };
  }

  function importList(parsed, folderId) {
    let name = parsed.name;
    if (parsed.list_id && getList(parsed.list_id)) name = name + ' (2)';
    return addList(name, parsed.pairs, folderId, parsed.languages, parsed.spell_ignore);
  }

  function importBackup(data) {
    const s = load();
    let n = 0;
    const folderMap = {};
    (data.folders || []).forEach(function (f) {
      const have = s.folders.find(function (x) { return x.name === f.name; });
      if (have) folderMap[f.id] = have.id;
      else { const nf = addFolder(f.name); folderMap[f.id] = nf.id; }
    });
    const games = migrateGames(data.games || {});
    (data.lists || []).forEach(function (l) {
      if (getList(l.list_id)) return;
      const copy = migrateList(Object.assign({}, l, { pairs: normalizePairs(l.pairs || []) }));
      copy.folder_id = l.folder_id ? (folderMap[l.folder_id] || null) : null;
      s.lists.push(copy); n++;
      if (games[l.list_id]) s.games[l.list_id] = games[l.list_id];
    });
    (data.dict || []).forEach(function (w) { if (s.dict.indexOf(w) < 0) s.dict.push(w); });
    s.dict.sort();
    save();
    return n;
  }

  function resetAll() {
    const keep = load().settings;
    state = fresh(); state.settings = keep; save();
  }

  return {
    state: load, save: save, isMemoryOnly: isMemoryOnly, migrate: migrate,
    addFolder: addFolder, renameFolder: renameFolder, deleteFolder: deleteFolder, getFolder: getFolder,
    getList: getList, addList: addList, updateList: updateList, moveList: moveList, deleteList: deleteList,
    getGame: getGame, hasAnyGame: hasAnyGame, setGame: setGame, clearGame: clearGame, markCompleted: markCompleted,
    listState: listState, setSetting: setSetting, setFlag: setFlag,
    dictSet: dictSet, addWord: addWord, removeWord: removeWord, whereIs: whereIs,
    exportList: exportList, exportAll: exportAll, parseImport: parseImport,
    importList: importList, importBackup: importBackup, resetAll: resetAll
  };
});
