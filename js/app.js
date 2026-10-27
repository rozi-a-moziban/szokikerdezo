/* Képernyők és kezelőfelület. A játékszabályok az engine.js-ben,
   a tárolás a store.js-ben, a fájlbeolvasás az importers.js-ben,
   a helyesírás a spell.js-ben, a kiejtés a speech.js-ben van. */
(function () {
  'use strict';
  const CFG = window.APP_CONFIG;
  const E = window.Engine;
  const S = window.Store;
  const SP = window.Spell;
  const IM = window.Importers;
  const SPEECH = window.Speech;
  const I18N = window.I18N;
  const T = I18N.t;
  const root = document.getElementById('app');
  const html = document.documentElement;

  let view = { name: 'home', folderId: null };
  let timers = [];
  let deferredInstall = null;

  /* Szólisták forrása: beépítve (egyfájlos változat) vagy a dict mappából */
  SP.setSource(function (lang) {
    if (window.SZK_DICT && window.SZK_DICT[lang]) return window.SZK_DICT[lang];
    if (!CFG.LANGS[lang] || !CFG.LANGS[lang].dict) return null;
    return fetch('dict/' + lang + '.txt').then(function (r) { return r.ok ? r.text() : null; });
  });

  /* ---------- segédek ---------- */
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  const PATHS = {
    folder: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7"/>',
    x: '<path d="M6 6l12 12M18 6L6 18"/>',
    help: '<circle cx="12" cy="12" r="9"/><path d="M9.6 9.4a2.5 2.5 0 1 1 3.4 2.4c-.6.3-1 .8-1 1.5v.4"/><path d="M12 17.2h.01"/>',
    gear: '<path d="M4 7h9M18 7h2M4 17h3M12 17h8"/><circle cx="15.5" cy="7" r="2.3"/><circle cx="9.5" cy="17" r="2.3"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    back: '<path d="M15 18l-6-6 6-6"/>',
    play: '<path d="M8 5.5v13l10.5-6.5z"/>',
    pause: '<path d="M9 6v12M15 6v12"/>',
    dot: '<circle cx="12" cy="12" r="5.5"/>',
    file: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/>',
    camera: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
    pen: '<path d="M4 20h4L19 9l-4-4L4 16v4z"/>',
    download: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
    upload: '<path d="M12 16V5M7 9l5-5 5 5M5 20h14"/>',
    move: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
    swap: '<path d="M7 7h12l-3-3M17 17H5l3 3"/>',
    redo: '<path d="M4 12a8 8 0 1 0 3-6.2M4 4v5h5"/>',
    speaker: '<path d="M4 9.5h3.5L12 6v12l-4.5-3.5H4z"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/>',
    warn: '<path d="M12 4l9 16H3z"/><path d="M12 10v4M12 17h.01"/>',
    undo: '<path d="M9 14L4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/>',
    book: '<path d="M5 4h10a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z"/><path d="M5 17a3 3 0 0 1 3-3h10"/>',
    print: '<path d="M7 9V4h10v5M7 17H5v-6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v6h-2"/><path d="M7 14h10v6H7z"/>',
    edit: '<path d="M4 20h4L19 9l-4-4L4 16v4z"/>',
    chevron: '<path d="M9 6l6 6-6 6"/>',
    install: '<path d="M12 4v11M7 10l5 5 5-5"/><rect x="4" y="17" width="16" height="3" rx="1.5"/>'
  };
  function ico(name, cls) { return '<svg class="i' + (cls ? ' ' + cls : '') + '" viewBox="0 0 24 24" aria-hidden="true">' + PATHS[name] + '</svg>'; }

  function langName(code) { return T('lang_' + code); }
  function langAdv(code) { return T('langAdv_' + code); }
  function langNative(code) { return (CFG.LANGS[code] && CFG.LANGS[code].native) || code; }
  function langShort(code) { return (CFG.LANGS[code] && CFG.LANGS[code].short) || code.toUpperCase(); }
  function cap(s) { return s ? s[0].toUpperCase() + s.slice(1) : s; }
  function dirLangs(l, dir) { return dir === 'ba' ? { q: l.languages.b, ans: l.languages.a } : { q: l.languages.a, ans: l.languages.b }; }
  function dirLabel(l, dir, short) {
    const d = dirLangs(l, dir);
    return short ? langShort(d.q) + ' → ' + langShort(d.ans) : cap(langName(d.q)) + ' → ' + cap(langName(d.ans));
  }
  function settings() { return S.state().settings; }
  /* A két irány sorrendje a beállítás szerint: 'fromHu' = magyarról idegen nyelvre felül,
     'toHu' = idegen nyelvről magyarra felül. Magyar oszlop nélküli listánál az oszlopsorrend dönt. */
  function dirOrder(l) {
    const toHu = l.languages.b === 'hu' ? 'ab' : (l.languages.a === 'hu' ? 'ba' : null);
    if (!toHu) return ['ab', 'ba'];
    const fromHu = toHu === 'ab' ? 'ba' : 'ab';
    return (settings().dirOrder || 'fromHu') === 'toHu' ? [toHu, fromHu] : [fromHu, toHu];
  }
  function accent() { return settings().accent || 'GB'; }
  function canSpeak(lang) { return lang !== 'hu' && SPEECH.canSpeak(lang, accent()); }
  function speakBtn(text, lang, extraCls) {
    if (!canSpeak(lang)) return '';
    return '<button class="icb speak ' + (extraCls || '') + '" data-act="speak" data-text="' + esc(text) + '" data-lang="' + esc(lang) + '" aria-label="' + esc(T('speak')) + '">' + ico('speaker') + '</button>';
  }

  function later(fn, ms) { const id = setTimeout(fn, ms); timers.push(id); return id; }
  function clearTimers() { timers.forEach(clearTimeout); timers = []; }

  function toast(msg) {
    const el = document.createElement('div');
    el.className = 'toast'; el.setAttribute('role', 'status'); el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(function () { el.remove(); }, 2600);
  }

  /* felugró ablak: Promise-t ad vissza a megnyomott gomb értékével */
  function modal(o) {
    return new Promise(function (resolve) {
      const ov = document.createElement('div');
      ov.className = 'overlay';
      let h = '<div class="dialog' + (o.sheet ? ' sheet' : '') + '" role="dialog" aria-modal="true" aria-label="' + esc(o.title || '') + '">';
      if (o.icon) h += '<div class="dlg-ico ' + (o.iconCls || '') + '">' + ico(o.icon) + '</div>';
      h += '<h3>' + esc(o.title || '') + '</h3>';
      if (o.text) h += '<p>' + esc(o.text) + '</p>';
      if (o.html) h += o.html;
      if (o.input) h += '<input class="field" id="search_dlg" name="search_dlg" value="' + esc(o.input.value || '') + '" aria-label="' + esc(o.input.label || '') + '">';
      if (o.choices) {
        o.choices.forEach(function (c, i) { h += '<button class="btn choice" data-i="' + i + '">' + (c.icon ? ico(c.icon) : '') + '<span>' + esc(c.label) + '</span></button>'; });
      }
      h += '<div class="acts">';
      (o.buttons || []).forEach(function (b, i) {
        h += '<button class="btn ' + (b.cls || '') + '" data-b="' + i + '">' + esc(b.label) + '</button>';
      });
      h += '</div></div>';
      ov.innerHTML = h;
      document.body.appendChild(ov);
      function collect() {
        const out = {};
        ov.querySelectorAll('input[type=checkbox][data-k]').forEach(function (c) { out[c.getAttribute('data-k')] = c.checked; });
        return out;
      }
      function done(v) { document.removeEventListener('keydown', onKey, true); ov.remove(); resolve(v); }
      function onKey(e) {
        if (e.key === 'Escape') { e.preventDefault(); done(null); }
        if (e.key === 'Enter' && o.input && document.activeElement && document.activeElement.id === 'search_dlg') {
          e.preventDefault(); done({ value: ov.querySelector('#search_dlg').value });
        }
      }
      document.addEventListener('keydown', onKey, true);
      ov.addEventListener('click', function (e) {
        const b = e.target.closest('[data-b]');
        const c = e.target.closest('[data-i]');
        if (c) { done(o.choices[+c.getAttribute('data-i')].v); return; }
        if (b) {
          const bt = o.buttons[+b.getAttribute('data-b')];
          if (o.input && bt.v === 'ok') done({ value: ov.querySelector('#search_dlg').value });
          else if (o.collect && bt.v === 'ok') done({ v: 'ok', checks: collect() });
          else done(bt.v);
          return;
        }
        if (e.target === ov && !o.noBackdropClose) done(null);
      });
      const inp = ov.querySelector('#search_dlg');
      if (inp) { inp.focus(); inp.select(); }
      else { const p = ov.querySelector('.btn.primary') || ov.querySelector('.btn'); if (p) p.focus(); }
    });
  }

  function download(name, text, mime) {
    const blob = new Blob([text], { type: mime || 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
  }
  function safeName(s) { return String(s).replace(/[\\/:*?"<>|]+/g, '_').trim() || 'lista'; }

  function isStandalone() {
    return (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone === true;
  }

  /* ---------- megjelenés: téma és betűméret ---------- */
  function applySettings() {
    const st = settings();
    if (st.theme === 'light' || st.theme === 'dark') html.setAttribute('data-theme', st.theme);
    else html.removeAttribute('data-theme');
    html.style.fontSize = (16 * (st.fontScale || 1)) + 'px';
    const dark = st.theme === 'dark' || (st.theme !== 'light' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', dark ? '#0B0A1D' : '#ECEEFB');
  }

  /* ---------- keret ---------- */
  function header(opts) {
    let h = '<header class="top">';
    if (opts && opts.back) {
      h += '<button class="icb" data-act="' + opts.back + '" aria-label="' + esc(T('back')) + '">' + ico('back') + '</button>' +
        '<h1 class="ttl small">' + esc(opts.title || '') + '</h1>';
      if (opts.right) h += opts.right;
    } else {
      h += '<div class="logo" aria-hidden="true">Sz</div><h1 class="ttl">' + esc(CFG.APP_NAME) + '</h1>' +
        '<button class="icb" data-act="help" aria-label="' + esc(T('helpTitle')) + '">' + ico('help') + '</button>' +
        '<button class="icb" data-act="settings" aria-label="' + esc(T('settingsTitle')) + '">' + ico('gear') + '</button>';
    }
    return h + '</header>';
  }
  function page(inner, cls) { return '<div class="wrap ' + (cls || '') + '">' + inner + '</div>'; }

  function badge(state, extra) {
    const icon = state === 'done' ? 'check' : state === 'paused' ? 'pause' : 'dot';
    return '<span class="badge b-' + state + '">' + ico(icon) + esc(T('state_' + state)) + (extra ? '<span class="bx">' + esc(extra) + '</span>' : '') + '</span>';
  }
  function gameExtra(listId, dir) {
    const g = S.getGame(listId, dir);
    if (!g) return '';
    if (g.phase === 'roundEnd') return T('roundShort', { r: g.round }) + ' · ' + T('roundDone');
    return T('roundShort', { r: g.round }) + ' · ' + (g.pos + 1) + '/' + g.queue.length;
  }

  function installLink() {
    if (isStandalone()) return '';
    return '<div class="install"><button class="linkbtn" data-act="install">' + ico('install') + esc(T('installLink')) + '*</button>' +
      '<p class="fine">* ' + esc(T('installNote')) + '</p></div>';
  }

  /* ---------- kezdőképernyő ---------- */
  function viewHome() {
    const st = S.state();
    let fid = view.folderId;
    if (fid && !S.getFolder(fid)) { fid = view.folderId = null; }
    if (!st.lists.length && !st.folders.length) return viewEmpty();

    const lists = fid ? st.lists.filter(function (l) { return l.folder_id === fid; }) : st.lists;
    let h = header();
    h += '<nav class="chips" aria-label="' + esc(T('folders')) + '">' +
      '<button class="chip' + (fid ? '' : ' on') + '" data-act="openFolder" data-id="" data-drop="root">' + esc(T('allLists')) + ' · ' + st.lists.length + '</button>';
    st.folders.forEach(function (f) {
      const n = st.lists.filter(function (l) { return l.folder_id === f.id; }).length;
      h += '<button class="chip' + (fid === f.id ? ' on' : '') + '" data-act="openFolder" data-id="' + f.id + '" data-drop="' + f.id + '">' + ico('folder') + esc(f.name) + ' · ' + n + '</button>';
    });
    h += '<button class="chip" data-act="newFolder">' + ico('plus') + esc(T('createFolder')) + '</button></nav>';
    if (fid) {
      const f = S.getFolder(fid);
      h += '<div class="folderbar"><span>' + ico('folder') + esc(f.name) + '</span>' +
        '<button class="btn sm" data-act="renameFolder">' + ico('edit') + esc(T('renameFolder')) + '</button>' +
        '<button class="btn sm danger" data-act="deleteFolder">' + ico('trash') + esc(T('deleteFolder')) + '</button></div>';
    }
    h += '<h2 class="sect">' + esc(T('yourLists')) + '</h2><div class="cards">';
    if (!lists.length) h += '<p class="muted">' + esc(T('folderEmpty')) + '</p>';
    lists.forEach(function (l) {
      const f = !fid && l.folder_id ? S.getFolder(l.folder_id) : null;
      h += '<div class="glass card" role="button" tabindex="0" draggable="true" data-act="openList" data-id="' + l.list_id + '">' +
        '<div class="card-h"><span class="name">' + esc(l.name) + '</span></div>' +
        '<div class="meta">' + esc(T('words', { n: l.pairs.length })) + (f ? ' · ' + esc(f.name) : '') + '</div>' +
        '<div class="dirs">';
      dirOrder(l).forEach(function (d) {
        const stt = S.listState(l.list_id, d);
        h += '<div class="dirrow"><span class="dl">' + esc(dirLabel(l, d, true)) + '</span>' + badge(stt, stt === 'paused' ? gameExtra(l.list_id, d) : '') + '</div>';
      });
      h += '</div></div>';
    });
    h += '</div>';
    if (st.folders.length) h += '<p class="fine center">' + esc(T('dragHint')) + '</p>';
    if (S.isMemoryOnly()) h += '<div class="note warn">' + esc(T('memoryWarn')) + '</div>';
    h += installLink();
    h += '<div class="dock glass"><div class="dock-t">' + esc(T('newList')) + '</div><div class="dock-b">' +
      '<button class="btn primary" data-act="newList">' + ico('pen') + esc(T('typeIn')) + '</button>' +
      '<button class="btn" data-act="loadFile">' + ico('file') + esc(T('file')) + '</button>' +
      '<button class="btn" data-act="photo">' + ico('camera') + esc(T('photo')) + '</button></div></div>';
    return page(h, 'home');
  }

  function viewEmpty() {
    let h = header();
    h += '<div class="hero" aria-hidden="true">' +
      '<span class="hc glass c1">take</span><span class="hc glass c2">fogni, venni, vinni</span>' +
      '<span class="hc glass c3">look up</span><span class="hc glass c4">utánanéz</span>' +
      '<span class="hc ok c5">' + ico('check') + '</span></div>' +
      '<h2 class="big-t">' + esc(T('emptyTitle')) + '</h2><p class="lead">' + esc(T('emptyText')) + '</p>' +
      '<div class="tiles">' +
      '<button class="tile primary" data-act="newList"><span class="ti">' + ico('pen') + '</span><span><b>' + esc(T('typeIn')) + '</b><small>' + esc(T('typeInSub')) + '</small></span></button>' +
      '<button class="tile" data-act="loadFile"><span class="ti">' + ico('file') + '</span><span><b>' + esc(T('fromFile')) + '</b><small>' + esc(T('fromFileSub')) + '</small></span></button>' +
      '<button class="tile" data-act="photo"><span class="ti">' + ico('camera') + '</span><span><b>' + esc(T('fromPhoto')) + '</b><small>' + esc(T('fromPhotoSub')) + '</small></span></button>' +
      '</div>';
    if (S.isMemoryOnly()) h += '<div class="note warn">' + esc(T('memoryWarn')) + '</div>';
    h += installLink();
    return page(h, 'home empty');
  }

  /* ---------- lista ---------- */
  function viewList() {
    const l = S.getList(view.listId);
    if (!l) { view = { name: 'home', folderId: null }; return viewHome(); }
    const f = l.folder_id ? S.getFolder(l.folder_id) : null;
    let h = header({ back: 'home', title: l.name });
    h += '<p class="meta pad">' + esc(T('words', { n: l.pairs.length })) + ' · ' + esc(langNative(l.languages.a)) + ' – ' + esc(langNative(l.languages.b)) +
      (f ? ' · ' + esc(f.name) : '') + '</p>';
    h += '<div class="dirtiles">';
    dirOrder(l).forEach(function (d, di) {
      const stt = S.listState(l.list_id, d);
      const chk = E.checkPlayable(E.orient(l.pairs, d), CFG.MIN_PAIRS);
      const pc = di === 0 ? 'btn primary' : 'btn';
      h += '<section class="glass dirtile' + (di === 0 ? ' first' : '') + '"><div class="dt-h"><h3>' + esc(dirLabel(l, d)) + '</h3>' + badge(stt, stt === 'paused' ? gameExtra(l.list_id, d) : '') + '</div>';
      if (chk.tooFew) h += '<div class="note warn">' + esc(T('needMore', { n: chk.need - chk.have, min: chk.need })) + '</div>';
      else if (!chk.ok) h += '<div class="note bad">' + esc(T('cantStart', { words: chk.problems.slice(0, 8).join(', ') })) + '</div>';
      h += '<div class="row">';
      if (stt === 'paused') {
        h += '<button class="' + pc + '" data-act="resume" data-dir="' + d + '">' + ico('play') + esc(T('resume')) + '</button>' +
          '<button class="btn" data-act="restart" data-dir="' + d + '">' + ico('redo') + esc(T('restart')) + '</button>';
      } else {
        h += '<button class="' + pc + '" data-act="start" data-dir="' + d + '"' + (chk.ok ? '' : ' disabled') + '>' + ico('play') + esc(stt === 'done' ? T('again') : T('start')) + '</button>';
      }
      h += '</div></section>';
    });
    h += '</div>';
    h += '<div class="tools">' +
      '<button class="btn" data-act="edit">' + ico('edit') + esc(T('edit')) + '</button>' +
      '<button class="btn" data-act="moveList">' + ico('folder') + esc(T('move')) + '</button>' +
      '<button class="btn" data-act="pdf">' + ico('print') + esc(T('pdf')) + '</button>' +
      '<button class="btn" data-act="saveFile">' + ico('download') + esc(T('saveFile')) + '</button>' +
      '<button class="btn danger" data-act="deleteList">' + ico('trash') + esc(T('del')) + '</button></div>';
    h += '<section class="glass pairsbox"><h3>' + esc(T('pairsTitle')) + '</h3><ol class="pairs">';
    l.pairs.forEach(function (p) {
      h += '<li><span lang="' + esc(l.languages.a) + '"><b>' + esc(p.a) + '</b></span> – <span lang="' + esc(l.languages.b) + '">' + esc(p.b) + '</span></li>';
    });
    h += '</ol></section>';
    return page(h, 'listpage');
  }

  /* ======================================================================
     SZERKESZTŐ
     ====================================================================== */
  function newEdit(listId, name, text, langs, ignore, folderId) {
    return {
      listId: listId, name: name || '', text: text || '', langs: langs || { a: 'en', b: 'hu' },
      ignore: (ignore || []).slice(), undo: null, importInfo: null, dirDismissed: false,
      cur: -1, errors: [], init: null, folderId: folderId || null, spellState: 'idle'
    };
  }
  function editSnapshot(e) { return JSON.stringify([e.name, e.text, e.langs, e.ignore]); }

  function langSelect(id, value) {
    let h = '<select class="lsel" id="' + id + '" aria-label="' + esc(id === 'langA' ? T('col1') : T('col2')) + '">';
    Object.keys(CFG.LANGS).forEach(function (k) {
      h += '<option value="' + k + '"' + (k === value ? ' selected' : '') + '>' + esc(langNative(k)) + '</option>';
    });
    return h + '</select>';
  }

  function viewEdit() {
    const e = view.edit;
    let h = header({ back: 'cancelEdit', title: e.listId ? T('editList') : T('newListTitle'),
      right: '<button class="btn primary" id="esave" data-act="saveEdit">' + esc(T('save')) + '</button>' });
    h += '<div class="frow"><label class="flbl" for="search_title">' + esc(T('listName')) + '</label>' +
      '<input class="field" id="search_title" name="search_title" data-form-type="other" autocapitalize="sentences" value="' + esc(e.name) + '" autocomplete="off" placeholder="' + esc(T('listNamePh')) + '"></div>';
    h += '<div class="frow"><span class="flbl">' + esc(T('loadVocab')) + '</span><div class="row two">' +
      '<button class="btn" data-act="loadFile">' + ico('file') + esc(T('file')) + '</button>' +
      '<button class="btn" data-act="photo">' + ico('camera') + esc(T('photo')) + '</button></div></div>';
    h += '<div class="frow"><span class="flbl">' + esc(T('vocabOrder')) + '</span><div class="langs glass"><label class="lcol"><span>' + esc(T('col1')) + '</span>' + langSelect('langA', e.langs.a) + '</label>' +
      '<button class="icb swap" data-act="swapCols" aria-label="' + esc(T('swapCols')) + '" title="' + esc(T('swapCols')) + '">' + ico('swap') + '</button>' +
      '<label class="lcol"><span>' + esc(T('col2')) + '</span>' + langSelect('langB', e.langs.b) + '</label></div></div>';
    h += '<div id="banners"></div>';
    h += '<section class="addrow glass" aria-label="' + esc(T('addTitle')) + '"><div class="add-h">' + esc(T('addTitle')) + '</div><div class="add-f">' +
      '<input class="field" id="search_q" name="search_q" autocomplete="off" data-form-type="other" autocapitalize="off" autocorrect="off" spellcheck="false" enterkeyhint="next" aria-label="' + esc(cap(langName(e.langs.a))) + '" placeholder="' + esc(cap(langName(e.langs.a))) + '">' +
      '<input class="field" id="search_r" name="search_r" autocomplete="off" data-form-type="other" autocapitalize="off" autocorrect="off" spellcheck="false" enterkeyhint="enter" aria-label="' + esc(cap(langName(e.langs.b))) + '" placeholder="' + esc(cap(langName(e.langs.b))) + '">' +
      '<button class="btn primary" data-act="addPair">' + ico('plus') + esc(T('addBtn')) + '</button></div><div id="addSpell"></div>' +
      '<p class="fine">' + esc(T('addHint')) + '</p></section>';
    h += '<div class="rulerow"><span id="ehint"></span><span id="emin"></span></div>';
    h += '<div class="ed glass" id="edbox"><div class="ed-back" id="edback" aria-hidden="true"></div>' +
      '<textarea class="ed-ta" id="search_text" name="search_text" spellcheck="false" autocapitalize="off" autocomplete="off" autocorrect="off" aria-label="' + esc(T('pairsLabel')) + '" placeholder="' +
      esc(T('placeholder')) + '">' + esc(e.text) + '</textarea></div>';
    h += '<div class="sbar glass" id="sbar" aria-live="polite"></div>';
    h += '<div id="chk"></div>';
    h += '<div class="savebar"><div id="saveWhy"></div><button class="btn primary big" id="esave2" data-act="saveEdit">' + ico('check') + esc(T('saveList')) + '</button></div>';
    return page(h, 'editpage');
  }

  function edEls() {
    return { ta: document.getElementById('search_text'), back: document.getElementById('edback'), box: document.getElementById('edbox') };
  }

  function packFor(lang) { return SP.get(lang); }
  function spellLangs(e) {
    return [e.langs.a, e.langs.b].filter(function (l, i, a) { return CFG.LANGS[l] && CFG.LANGS[l].dict && a.indexOf(l) === i; });
  }

  function ensurePacks(e) {
    const need = spellLangs(e).filter(function (l) { return !packFor(l); });
    if (!need.length) { e.spellState = spellLangs(e).length ? 'ready' : 'none'; return Promise.resolve(); }
    e.spellState = 'loading';
    return Promise.all(need.map(function (l) { return SP.load(l); })).then(function () {
      e.spellState = spellLangs(e).every(function (l) { return packFor(l); }) ? 'ready' : 'failed';
    });
  }

  function computeErrors(e) {
    if (e.spellState !== 'ready') { e.errors = []; return; }
    const extra = [S.dictSet(), new Set(e.ignore)];
    e.errors = SP.checkText(e.text, e.langs, extra);
    if (e.cur >= e.errors.length) e.cur = e.errors.length ? e.errors.length - 1 : -1;
  }

  function renderBackdrop() {
    const e = view.edit;
    const el = edEls();
    if (!el.back) return;
    let h = '';
    let pos = 0;
    e.errors.forEach(function (er, i) {
      h += esc(e.text.slice(pos, er.start)) + '<mark data-i="' + i + '" class="' + (i === e.cur ? 'cur' : '') + '">' + esc(e.text.slice(er.start, er.end)) + '</mark>';
      pos = er.end;
    });
    h += esc(e.text.slice(pos)) + '\n ';
    el.back.innerHTML = h;
    fitBackdrop();
  }

  /* A jelölő réteg pontosan a szövegdoboz alá kerül: a görgetősáv szélességét is követi. */
  function fitBackdrop() {
    const el = edEls();
    if (!el.ta || !el.back) return;
    const cs = getComputedStyle(el.ta);
    const bl = parseFloat(cs.borderLeftWidth) || 0, br = parseFloat(cs.borderRightWidth) || 0;
    const sb = Math.max(0, el.ta.offsetWidth - el.ta.clientWidth - bl - br);
    el.back.style.paddingRight = (parseFloat(cs.paddingRight) + sb) + 'px';
    el.back.scrollTop = el.ta.scrollTop;
  }

  function caretLine(e, pos) {
    const before = e.text.slice(0, pos);
    const start = before.lastIndexOf('\n') + 1;
    let end = e.text.indexOf('\n', pos);
    if (end < 0) end = e.text.length;
    return e.text.slice(start, end);
  }

  function foreignOfLine(e, line) {
    const sp = E.splitLine(line || '');
    if (!sp) return null;
    if (e.langs.a !== 'hu' && sp[0].trim()) return { text: sp[0].trim(), lang: e.langs.a };
    if (e.langs.b !== 'hu' && sp[1].trim()) return { text: sp[1].trim(), lang: e.langs.b };
    return null;
  }

  function updateStatus() {
    const e = view.edit;
    const bar = document.getElementById('sbar');
    if (!bar) return;
    const parsed = E.parseLines(e.text);
    const n = parsed.pairs.length;
    let h = '<div class="sb-row"><span class="pill">' + esc(T('pairCount', { n: n })) + '</span>';
    if (e.spellState === 'loading') h += '<span class="sb-info">' + esc(T('spellLoading')) + '</span>';
    else if (e.spellState === 'none') h += '<span class="sb-info">' + esc(T('spellNone')) + '</span>';
    else if (e.spellState === 'failed') h += '<span class="sb-info">' + esc(T('spellFailed')) + '</span>';
    else if (e.spellState === 'ready') {
      if (e.errors.length) {
        h += '<span class="badge b-paused">' + ico('warn') + esc(e.cur >= 0 ? T('suspectPos', { i: e.cur + 1, n: e.errors.length }) : T('suspectN', { n: e.errors.length })) + '</span>' +
          '<button class="btn sm primary nextbtn" data-act="nextErr">' + esc(e.cur >= 0 ? T('nextErr') : T('firstErr')) + ico('chevron') + '</button>';
      }
    }
    h += '</div>';
    if (e.cur >= 0 && e.errors[e.cur]) {
      const er = e.errors[e.cur];
      const lang = sideLang(e, er.start);
      const sug = SP.suggest(lang, er.word, 3);
      h += '<div class="sb-row sugg"><span class="sw"><span class="typo">' + esc(er.word) + '</span> →</span>';
      if (!sug.length) h += '<span class="sb-info">' + esc(T('noSuggest')) + '</span>';
      sug.forEach(function (s, i) { h += '<button class="btn sm' + (i === 0 ? ' good' : '') + '" data-act="fixErr" data-s="' + esc(s) + '">' + esc(s) + '</button>'; });
      h += '</div><div class="sb-row"><button class="btn sm" data-act="ignoreErr">' + esc(T('ignoreWord')) + '</button>' +
        '<button class="btn sm" data-act="dictErr">' + ico('book') + esc(T('addDict')) + '</button></div>';
    } else if (e.errors.length) {
      h += '<p class="fine">' + esc(T('spellHint')) + '</p>';
    }
    bar.innerHTML = h;
    updateSaveState();
  }

  /* Mentés gombok: tiltva, ha nincs szópár, vagy van befejezett hibás sor / ismétlődés. */
  function updateSaveState() {
    const e = view.edit;
    const parsed = E.parseLines(e.text);
    const lineErr = parsed.errors.filter(function (er) { return er.line !== e.activeLine; });
    const dups = E.findDuplicates(parsed.pairs).length;
    const blocked = !parsed.pairs.length || lineErr.length > 0 || dups > 0;
    ['esave', 'esave2'].forEach(function (id) { const b = document.getElementById(id); if (b) b.disabled = blocked; });
    const why = document.getElementById('saveWhy');
    if (!why) return;
    let h = '';
    if (lineErr.length) h += '<p class="why">' + ico('warn') + '<span>' + esc(T('saveBlockedLines', { n: lineErr.length })) + '</span><button class="linkbtn" data-act="gotoLine" data-line="' + lineErr[0].line + '">' + esc(T('showMe')) + '</button></p>';
    if (dups) h += '<p class="why">' + ico('warn') + '<span>' + esc(T('saveBlockedDups', { n: dups })) + '</span></p>';
    why.innerHTML = h;
    const mn = document.getElementById('emin');
    if (mn) {
      const ok = parsed.pairs.length >= CFG.MIN_PAIRS;
      mn.className = ok ? 'okt' : '';
      mn.textContent = ok ? T('minOk', { n: parsed.pairs.length }) : T('minPairs', { min: CFG.MIN_PAIRS });
    }
  }

  function sideLang(e, absPos) {
    const before = e.text.slice(0, absPos);
    const ls = before.lastIndexOf('\n') + 1;
    const line = caretLine(e, absPos);
    const sp = E.splitAt(line);
    return sp && absPos - ls >= sp.end ? e.langs.b : e.langs.a;
  }

  let checkTimer = null;
  function updateCheck() {
    const e = view.edit;
    const box = document.getElementById('chk');
    if (!box) return;
    const parsed = E.parseLines(e.text);
    const dups = E.findDuplicates(parsed.pairs);
    const lineErr = parsed.errors.filter(function (er) { return er.line !== e.activeLine; });
    let h = '';
    if (lineErr.length) {
      h += '<div class="note bad"><b>' + esc(T('lineErrTitle', { n: lineErr.length })) + '</b><ul>';
      lineErr.slice(0, 12).forEach(function (er) {
        h += '<li><button class="linkbtn" data-act="gotoLine" data-line="' + er.line + '">' + esc(T('errLine', { n: er.line, why: T('err_' + er.code) })) + '</button>: <i>' + esc(er.text.slice(0, 60)) + '</i></li>';
      });
      if (lineErr.length > 12) h += '<li>…</li>';
      h += '</ul></div>';
    }
    if (dups.length) {
      h += '<div class="note warn"><b>' + esc(T('dupTitle')) + '</b><div class="fine">' + esc(T('dupNote')) + '</div>';
      if (dups.length > 1) h += '<div class="row"><button class="btn sm" data-act="mergeAll">' + esc(T('mergeAll', { n: dups.length })) + '</button></div>';
      dups.slice(0, 4).forEach(function (g, gi) {
        const lines = g.indexes.map(function (i) { return parsed.pairs[i].line; });
        h += '<div class="dup"><span>' + esc(T('dupRows', { w: g.word, lines: lines.join(', ') })) + '</span><span class="row">' +
          '<button class="btn sm" data-act="merge" data-g="' + gi + '">' + esc(T('merge')) + '</button>' +
          '<button class="btn sm" data-act="fix" data-g="' + gi + '">' + esc(T('fix')) + '</button></span></div>';
      });
      if (dups.length > 4) h += '<p class="fine">' + esc(T('dupMore', { n: dups.length - 4 })) + '</p>';
      h += '</div>';
    }
    box.innerHTML = h;
    renderBanners();
    updateSaveState();
  }

  function renderBanners() {
    const e = view.edit;
    const box = document.getElementById('banners');
    if (!box) return;
    let h = '';
    if (e.importInfo) {
      h += '<div class="banner glass">' + ico('check', 'okc') + '<span class="bt"><b>' + esc(T('importedN', { n: e.importInfo.n })) + '</b><small>' + esc(e.importInfo.name) + '</small></span>' +
        (e.undo != null ? '<button class="btn sm" data-act="undoImport">' + ico('undo') + esc(T('undo')) + '</button>' : '') +
        '<button class="icb sm" data-act="closeBanner" aria-label="' + esc(T('close')) + '">' + ico('x') + '</button></div>';
    }
    if (!e.dirDismissed && e.langs.a !== e.langs.b) {
      const parsed = E.parseLines(e.text);
      if (SP.detectOrientation(parsed.pairs, e.langs) === 'reversed') {
        h += '<div class="banner warnb">' + ico('warn') + '<span class="bt"><b>' + esc(T('dirWarnTitle')) + '</b><small>' +
          esc(T('dirWarnText', { a: langName(e.langs.b), b: langName(e.langs.a) })) + '</small></span>' +
          '<span class="row"><button class="btn sm primary" data-act="swapCols">' + ico('swap') + esc(T('swapWords')) + '</button>' +
          '<button class="btn sm" data-act="dirDismiss">' + esc(T('noNeed')) + '</button></span></div>';
      }
    }
    box.innerHTML = h;
    const hint = document.getElementById('ehint');
    if (hint) hint.textContent = T('pairsHint', { a: langName(e.langs.a), b: langName(e.langs.b) });
    const aa = document.getElementById('search_q'), bb = document.getElementById('search_r');
    if (aa) { aa.placeholder = cap(langName(e.langs.a)); aa.setAttribute('aria-label', aa.placeholder); }
    if (bb) { bb.placeholder = cap(langName(e.langs.b)); bb.setAttribute('aria-label', bb.placeholder); }
  }

  function edRefresh(full) {
    const e = view.edit;
    computeErrors(e);
    renderBackdrop();
    updateStatus();
    if (full) { updateCheck(); return; }
    clearTimeout(checkTimer);
    checkTimer = setTimeout(function () { if (view.name === 'edit') updateCheck(); }, 250);
  }

  function setEditText(text, keepScroll) {
    const e = view.edit;
    const el = edEls();
    const top = el.ta ? el.ta.scrollTop : 0;
    e.text = text;
    if (el.ta) { el.ta.value = text; if (keepScroll) el.ta.scrollTop = top; }
    edRefresh(true);
    fitBackdrop();
  }

  function scrollToError(i) {
    const el = edEls();
    const m = el.back && el.back.querySelector('mark[data-i="' + i + '"]');
    if (!m) return;
    const top = m.offsetTop - el.back.offsetTop;
    const want = Math.max(0, top - el.ta.clientHeight / 3);
    if (top < el.ta.scrollTop || top > el.ta.scrollTop + el.ta.clientHeight - 30) el.ta.scrollTop = want;
    el.back.scrollTop = el.ta.scrollTop;
    const r = el.box.getBoundingClientRect();
    if (r.top < 0 || r.bottom > window.innerHeight) el.box.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }

  function lineOf(text, pos) { return String(text).slice(0, pos).split('\n').length; }

  /* Beviteli sor: két mező, Enterrel léptet; a pár a szövegdoboz végére kerül. */
  function addPair() {
    const e = view.edit;
    const fa = document.getElementById('search_q'), fb = document.getElementById('search_r');
    const a = fa.value.trim().replace(/\s+/g, ' '), b = fb.value.trim().replace(/\s+/g, ' ');
    if (!a) { fa.focus(); return; }
    if (!b) { fb.focus(); return; }
    const base = e.text.replace(/\s*$/, '');
    setEditText((base ? base + '\n' : '') + a + ' - ' + b);
    fa.value = ''; fb.value = '';
    document.getElementById('addSpell').innerHTML = '';
    fa.focus();
    const el = edEls();
    el.ta.scrollTop = el.ta.scrollHeight; el.back.scrollTop = el.ta.scrollTop;
  }

  function addSpell() {
    const e = view.edit;
    const box = document.getElementById('addSpell');
    if (!box) return;
    const extra = [S.dictSet(), new Set(e.ignore)];
    let hit = null;
    [['search_q', e.langs.a], ['search_r', e.langs.b]].forEach(function (f) {
      if (hit || !SP.get(f[1])) return;
      const val = document.getElementById(f[0]).value;
      SP.tokens(val, 0).forEach(function (t) {
        if (hit || t.w.length < 2 || /\p{Lu}/u.test(t.w.slice(1))) return;
        // a még gépelt utolsó szót nem jelöljük
        if (t.end === val.length && !/\s$/.test(val) && document.activeElement && document.activeElement.id === f[0]) return;
        if (!SP.known(SP.get(f[1]), t.w, extra)) hit = { field: f[0], lang: f[1], w: t.w, start: t.start, end: t.end };
      });
    });
    if (!hit) { box.innerHTML = ''; return; }
    view.addHit = hit;
    const sug = SP.suggest(hit.lang, hit.w, 3);
    box.innerHTML = '<div class="sb-row sugg"><span class="sw"><span class="typo">' + esc(hit.w) + '</span> →</span>' +
      (sug.length ? sug.map(function (x, i) { return '<button class="btn sm' + (i === 0 ? ' good' : '') + '" data-act="addFix" data-s="' + esc(x) + '">' + esc(x) + '</button>'; }).join('') : '<span class="sb-info">' + esc(T('noSuggest')) + '</span>') +
      '<button class="btn sm" data-act="addIgnore">' + esc(T('ignoreShort')) + '</button></div>';
  }

  function onCaret() {
    const e = view.edit;
    const el = edEls();
    if (!el.ta) return;
    const pos = el.ta.selectionStart;
    e.activeLine = lineOf(e.text, pos);
    view.caretLine = caretLine(e, pos);
    let hit = -1;
    e.errors.forEach(function (er, i) { if (pos >= er.start && pos <= er.end) hit = i; });
    if (hit >= 0 && hit !== e.cur) { e.cur = hit; renderBackdrop(); }
    updateStatus();
  }

  function nextError() {
    const e = view.edit;
    if (!e.errors.length) return;
    e.cur = (e.cur + 1) % e.errors.length;
    const er = e.errors[e.cur];
    view.caretLine = caretLine(e, er.start);
    renderBackdrop();
    updateStatus();
    scrollToError(e.cur);
  }

  function fixError(s) {
    const e = view.edit;
    const er = e.errors[e.cur];
    if (!er) return;
    const idx = e.cur;
    setEditText(e.text.slice(0, er.start) + s + e.text.slice(er.end), true);
    e.cur = e.errors.length ? Math.min(idx, e.errors.length - 1) : -1;
    renderBackdrop(); updateStatus();
  }

  function ignoreError(toDict) {
    const e = view.edit;
    const er = e.errors[e.cur];
    if (!er) return;
    const w = er.word.normalize('NFC').replace(/’/g, "'").toLowerCase();
    const idx = e.cur;
    if (toDict) {
      S.addWord(w);
      if (!S.state().flags.dictInfo) {
        S.setFlag('dictInfo', true);
        modal({ title: T('dictInfoTitle'), html: '<p>' + esc(T('dictInfoText')).replace('{path}', '<b><i>' + esc(T('dictPath')) + '</i></b>') + '</p>', icon: 'book', buttons: [{ label: T('ok'), v: 'ok', cls: 'primary' }] });
      } else toast(T('dictAdded', { w: er.word }));
    } else {
      if (e.ignore.indexOf(w) < 0) e.ignore.push(w);
      toast(T('ignored', { w: er.word }));
    }
    computeErrors(e);
    e.cur = e.errors.length ? Math.min(idx, e.errors.length - 1) : -1;
    renderBackdrop(); updateStatus();
  }

  function gotoLine(ln) {
    const el = edEls();
    const parts = view.edit.text.split('\n');
    let off = 0;
    for (let i = 0; i < ln - 1 && i < parts.length; i++) off += parts[i].length + 1;
    el.ta.focus();
    el.ta.setSelectionRange(off, off + (parts[ln - 1] || '').length);
    const lh = parseFloat(getComputedStyle(el.ta).lineHeight) || 26;
    el.ta.scrollTop = Math.max(0, (ln - 3) * lh);
    el.back.scrollTop = el.ta.scrollTop;
  }

  function mergeGroup(gi) {
    const e = view.edit;
    const parsed = E.parseLines(e.text);
    const g = E.findDuplicates(parsed.pairs)[gi];
    if (!g) return;
    const lines = e.text.split('\n');
    const members = g.indexes.map(function (i) { return parsed.pairs[i]; });
    const merged = E.mergeDuplicates(members)[0];
    lines[members[0].line - 1] = merged.a + ' - ' + merged.b;
    members.slice(1).map(function (m) { return m.line - 1; }).sort(function (x, y) { return y - x; })
      .forEach(function (li) { lines.splice(li, 1); });
    setEditText(lines.join('\n'), true);
  }

  function mergeAll() {
    const e = view.edit;
    const parsed = E.parseLines(e.text);
    const merged = E.mergeDuplicates(parsed.pairs);
    const firstLine = {};
    merged.forEach(function (m) { firstLine[m.line] = m; });
    const keyFirst = {};
    parsed.pairs.forEach(function (p) { const k = E.norm(p.a); if (!keyFirst[k]) keyFirst[k] = p.line; });
    const drop = {};
    parsed.pairs.forEach(function (p) { if (keyFirst[E.norm(p.a)] !== p.line) drop[p.line] = true; });
    const out = [];
    e.text.split('\n').forEach(function (line, i) {
      const ln = i + 1;
      if (drop[ln]) return;
      out.push(firstLine[ln] ? firstLine[ln].a + ' - ' + firstLine[ln].b : line);
    });
    setEditText(out.join('\n'), true);
    toast(T('mergedAll'));
  }

  function fixGroup(gi) {
    const parsed = E.parseLines(view.edit.text);
    const g = E.findDuplicates(parsed.pairs)[gi];
    if (g) gotoLine(parsed.pairs[g.indexes[0]].line);
  }

  function changeLang(which, value) {
    const e = view.edit;
    const other = which === 'a' ? 'b' : 'a';
    if (e.langs[other] === value) e.langs[other] = e.langs[which];
    e.langs[which] = value;
    document.getElementById('langA').value = e.langs.a;
    document.getElementById('langB').value = e.langs.b;
    e.dirDismissed = false;
    ensurePacks(e).then(function () { if (view.name === 'edit') edRefresh(true); });
    edRefresh(true);
  }

  function bindEditor() {
    const e = view.edit;
    const el = edEls();
    const n = document.getElementById('search_title');
    n.addEventListener('input', function () { e.name = n.value; });
    el.ta.addEventListener('input', function () { e.activeLine = lineOf(el.ta.value, el.ta.selectionStart); e.text = el.ta.value; e.importInfo = e.importInfo && e.undo != null ? e.importInfo : null; edRefresh(false); fitBackdrop(); });
    el.ta.addEventListener('scroll', function () { el.back.scrollTop = el.ta.scrollTop; });
    const track = function () { e.activeLine = lineOf(e.text, el.ta.selectionStart); };
    el.ta.addEventListener('focus', track);
    el.ta.addEventListener('blur', function () { e.activeLine = null; updateCheck(); });
    const fa = document.getElementById('search_q'), fb = document.getElementById('search_r');
    fa.addEventListener('keydown', function (ev) { if (ev.key === 'Enter') { ev.preventDefault(); if (fa.value.trim()) fb.focus(); } });
    fb.addEventListener('keydown', function (ev) { if (ev.key === 'Enter') { ev.preventDefault(); addPair(); } });
    fa.addEventListener('input', addSpell);
    fb.addEventListener('input', addSpell);
    el.ta.addEventListener('click', onCaret);
    el.ta.addEventListener('keyup', function (ev) { if (/Arrow|Home|End|Page/.test(ev.key)) onCaret(); });
    document.getElementById('langA').addEventListener('change', function (ev) { changeLang('a', ev.target.value); });
    document.getElementById('langB').addEventListener('change', function (ev) { changeLang('b', ev.target.value); });
    if (window.ResizeObserver) new ResizeObserver(fitBackdrop).observe(el.ta);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { if (view.name === 'edit') renderBackdrop(); });
    if (e.init == null) e.init = editSnapshot(e);
    ensurePacks(e).then(function () { if (view.name === 'edit' && view.edit === e) edRefresh(true); });
    edRefresh(true);
  }

  async function saveEdit() {
    const e = view.edit;
    const name = e.name.trim();
    const parsed = E.parseLines(e.text);
    if (!name) { toast(T('needName')); document.getElementById('search_title').focus(); return; }
    if (parsed.pairs.length === 0) { toast(T('noPairs')); return; }
    if (parsed.errors.length || E.findDuplicates(parsed.pairs).length) { toast(T('fixFirst')); updateCheck(); return; }
    const old = e.listId ? S.getList(e.listId) : null;
    const byKey = new Map();
    if (old) old.pairs.forEach(function (p) { byKey.set(E.norm(p.a), p); });
    const pairs = parsed.pairs.map(function (p, i) {
      const prev = byKey.get(E.norm(p.a));
      return { id: prev ? prev.id : E.uid(), a: p.a, b: p.b, order: i + 1 };
    });
    const langs = { a: e.langs.a, b: e.langs.b };
    if (old) {
      const sig = function (arr) { return JSON.stringify(arr.map(function (p) { return [p.a, p.b]; })); };
      const changed = sig(old.pairs) !== sig(pairs) || old.languages.a !== langs.a || old.languages.b !== langs.b;
      if (changed && S.hasAnyGame(old.list_id)) {
        const r = await modal({ title: T('warnEditTitle'), text: T('warnEditText'), icon: 'warn', iconCls: 'warnc',
          buttons: [{ label: T('cancel'), v: null }, { label: T('warnEditBtn'), v: 'ok', cls: 'primary' }] });
        if (r !== 'ok') return;
      }
      S.updateList(old.list_id, { name: name, pairs: changed ? pairs : old.pairs, languages: langs, spell_ignore: e.ignore }, changed);
      view = { name: 'list', listId: old.list_id, folderId: view.folderId };
    } else {
      const l = S.addList(name, pairs, e.folderId, langs, e.ignore);
      view = { name: 'list', listId: l.list_id, folderId: view.folderId };
    }
    toast(T('saved'));
    render(); window.scrollTo(0, 0);
  }

  async function cancelEdit() {
    const e = view.edit;
    if (e.init != null && editSnapshot(e) !== e.init) {
      const r = await modal({ title: T('discardTitle'), text: T('discardText'),
        buttons: [{ label: T('keepEditing'), v: null }, { label: T('discard'), v: 'ok', cls: 'danger' }] });
      if (r !== 'ok') return;
    }
    go(e.listId ? { name: 'list', listId: e.listId, folderId: view.folderId } : { name: 'home', folderId: view.folderId });
  }

  /* ======================================================================
     FÁJLBETÖLTÉS
     ====================================================================== */
  function pickFile(mode) {
    view.importMode = mode;
    const inp = document.getElementById('file');
    inp.value = '';
    inp.setAttribute('accept', mode === 'backup' ? '.json,application/json' : '.txt,.docx,.xlsx,.json,text/plain');
    inp.click();
  }

  function readBytes(file) {
    return new Promise(function (resolve, reject) {
      const r = new FileReader();
      r.onload = function () { resolve(new Uint8Array(r.result)); };
      r.onerror = function () { reject(r.error); };
      r.readAsArrayBuffer(file);
    });
  }

  async function handleFile(file) {
    let bytes;
    try { bytes = await readBytes(file); } catch (err) { toast(T('importErr', { why: '' })); return; }
    const res = IM.readFile(file.name, bytes);
    if (res.error) { toast(T('importErr', { why: T('imp_' + res.error) })); return; }
    const mode = view.importMode;
    if (res.kind === 'json') return handleJson(res.text, file.name, mode);
    const st = IM.stats(res);
    if (!st.pairs && !st.problemLines) { toast(T('importNothing')); return; }
    const langs = view.name === 'edit' ? view.edit.langs : { a: 'en', b: 'hu' };
    const tmp = newEdit(null, '', '', langs);
    await ensurePacks(tmp);
    const choice = await importSheet(res, file.name, langs);
    if (!choice) return;
    let text = IM.toText(res, choice.flipBlocks);
    if (choice.flipLines) {
      const n = (res.blocks || []).reduce(function (s, b) { return s + b.pairs.length; }, 0);
      const lines = text.split('\n');
      text = lines.slice(0, n).concat(E.swapText(lines.slice(n).join('\n')).split('\n')).join('\n');
    }
    const baseName = file.name.replace(/\.[^.]+$/, '');
    if (view.name === 'edit') {
      const e = view.edit;
      e.undo = e.text;
      e.importInfo = { n: st.pairs, name: file.name };
      if (!e.name.trim()) { e.name = baseName; document.getElementById('search_title').value = baseName; }
      e.dirDismissed = false;
      setEditText(e.text.trim() ? e.text.replace(/\s*$/, '') + '\n' + text : text);
    } else {
      const e = newEdit(null, baseName, '', langs, [], view.folderId);
      e.init = editSnapshot(e);
      e.text = text; e.undo = ''; e.importInfo = { n: st.pairs, name: file.name };
      go({ name: 'edit', folderId: view.folderId, edit: e });
    }
  }

  async function importSheet(res, name, langs) {
    const st = IM.stats(res);
    const blocks = res.blocks || [];
    const rev = [];
    blocks.forEach(function (b, i) { if (SP.detectOrientation(b.pairs, langs) === 'reversed') rev.push(i); });
    const lineParsed = E.parseLines((res.lines || []).join('\n'));
    const linesRev = SP.detectOrientation(lineParsed.pairs, langs) === 'reversed';
    // a gyanús szavak száma a javasolt megfordítások után (ahogy a szerkesztőbe kerül)
    let allText = IM.toText(res, blocks.map(function (b, i) { return rev.indexOf(i) >= 0; }));
    if (linesRev) {
      const nb = blocks.reduce(function (s2, b) { return s2 + b.pairs.length; }, 0);
      const ls = allText.split('\n');
      allText = ls.slice(0, nb).concat(E.swapText(ls.slice(nb).join('\n')).split('\n')).join('\n');
    }
    const sus = spellLangs({ langs: langs }).some(function (l) { return SP.get(l); }) ? SP.checkText(allText, langs, [S.dictSet()]).length : 0;
    let h = '<p class="sheet-file">' + esc(name) + '</p><div class="stats3">' +
      '<div class="st"><b>' + st.pairs + '</b><span>' + esc(T('stPairs')) + '</span></div>' +
      (st.blocks > 1 ? '<div class="st"><b>' + st.blocks + '</b><span>' + esc(T('stBlocks')) + '</span></div>' : '') +
      (sus ? '<div class="st"><b class="warnt">' + sus + '</b><span>' + esc(T('stSuspect')) + '</span></div>' : '') +
      (st.problemLines ? '<div class="st"><b class="badt">' + st.problemLines + '</b><span>' + esc(T('stProblem')) + '</span></div>' : '') + '</div>';
    if (st.skippedCols) h += '<p class="fine">' + esc(T('skippedCols', { n: st.skippedCols })) + '</p>';
    if (rev.length || linesRev) {
      h += '<div class="revbox"><div class="rv-h">' + ico('warn') + '<b>' + esc(T('revTitle')) + '</b></div><p>' +
        esc(T('revText', { a: langName(langs.a), b: langName(langs.b) })) + '</p>';
      rev.forEach(function (i) {
        const b = blocks[i];
        const ex = b.pairs.slice(0, 2).map(function (p) { return p.a + ' – ' + p.b; }).join(' · ');
        h += '<label class="chk"><input type="checkbox" data-k="b' + i + '" checked><span><b>' + esc(T('flipBlock', { label: b.label, n: b.pairs.length })) + '</b><small>' + esc(ex) + '</small></span></label>';
      });
      if (linesRev) {
        const ex = lineParsed.pairs.slice(0, 2).map(function (p) { return p.a + ' – ' + p.b; }).join(' · ');
        h += '<label class="chk"><input type="checkbox" data-k="lines" checked><span><b>' + esc(T('flipAll')) + '</b><small>' + esc(ex) + '</small></span></label>';
      }
      h += '</div>';
    }
    h += '<p class="fine">' + esc(T('sheetHint')) + '</p>';
    const r = await modal({ title: T('importDone'), icon: 'check', iconCls: 'okc', html: h, sheet: true, collect: true,
      buttons: [{ label: T('cancel'), v: null }, { label: T('loadIt'), v: 'ok', cls: 'primary' }] });
    if (!r || r.v !== 'ok') return null;
    const flipBlocks = blocks.map(function (b, i) { return !!r.checks['b' + i]; });
    return { flipBlocks: flipBlocks, flipLines: !!r.checks.lines };
  }

  function handleJson(text, fileName, mode) {
    const p = S.parseImport(text, fileName);
    if (p.error) { toast(T('importErr', { why: T('imp_' + p.error, { rows: (p.rows || []).join(', ') }) })); return; }
    if (p.kind === 'backup') {
      const n = S.importBackup(p.data);
      toast(n ? T('importOk', { n: n }) : T('importNone'));
      return render();
    }
    if (view.name === 'edit') {
      const e = view.edit;
      e.undo = e.text;
      e.importInfo = { n: p.pairs.length, name: fileName };
      if (!e.name.trim()) { e.name = p.name; document.getElementById('search_title').value = p.name; }
      setEditText((e.text.trim() ? e.text.replace(/\s*$/, '') + '\n' : '') + E.serialize(p.pairs));
      return;
    }
    const l = S.importList(p, view.folderId);
    toast(T('importOk', { n: 1 }));
    go({ name: 'list', listId: l.list_id, folderId: view.folderId });
  }

  /* ======================================================================
     JÁTÉK
     ====================================================================== */
  function gamePairs(l, dir) { return E.orient(l.pairs, dir); }

  function startGame(listId, dir) {
    const l = S.getList(listId);
    const pairs = gamePairs(l, dir);
    const chk = E.checkPlayable(pairs, CFG.MIN_PAIRS);
    if (!chk.ok) { render(); return; }
    const g = E.newGame(l.list_id, l.version, pairs, null, dir);
    S.setGame(l.list_id, dir, g);
    go({ name: 'game', listId: l.list_id, dir: dir, folderId: view.folderId });
  }

  function answeredState(g) {
    const q = g && g.current;
    if (!q || q.selected === null) return null;
    return q.options[q.selected].correct ? 'right' : 'wrong';
  }

  function viewGame() {
    const l = S.getList(view.listId);
    const g = l && S.getGame(view.listId, view.dir);
    if (!g || !l) { view = { name: 'home', folderId: null }; return viewHome(); }
    if (g.phase === 'roundEnd') return viewRound(g, l);
    const q = g.current;
    const total = g.queue.length;
    const st = answeredState(g);
    if (st && view.revealed === undefined) view.revealed = true;
    const shown = g.pos + (st ? 1 : 0);
    const langs = dirLangs(l, view.dir);
    let h = '<div class="gbar">' +
      '<button class="icb" data-act="exit" aria-label="' + esc(T('exitSaved')) + '">' + ico('x') + '</button>' +
      '<span class="pill">' + esc(T('round', { r: g.round })) + '</span>' +
      '<span class="pill grow">' + (g.pos + 1) + ' / ' + total + '</span>' +
      '<span class="pill okp" aria-label="' + esc(T('correctN')) + '">' + ico('check') + g.correct + '</span></div>' +
      '<div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="' + total + '" aria-valuenow="' + shown + '"><i style="width:' + Math.round(shown * 100 / total) + '%"></i></div>';
    h += '<div class="glass qcard"><div class="qprompt">' + esc(T('prompt', { lang: langAdv(langs.ans) })) + '</div>' +
      '<div class="qword-row"><div class="qword" lang="' + esc(langs.q) + '">' + esc(q.a) + '</div>' + speakBtn(q.a, langs.q) + '</div>';
    if (st && view.revealed && langs.ans !== 'hu' && canSpeak(langs.ans)) {
      const right = q.options.find(function (o) { return o.correct; });
      h += '<div class="ansline"><span lang="' + esc(langs.ans) + '">' + esc(right.text) + '</span>' + speakBtn(right.text, langs.ans) + '</div>';
    }
    h += '</div><div class="opts" role="group" aria-label="' + esc(T('options')) + '">';
    q.options.forEach(function (o, i) {
      let cls = 'opt', mark = '';
      if (st) {
        const showOk = o.correct && (st === 'right' || view.revealed);
        if (showOk && o.correct && st === 'wrong' && view.flipNow) cls += ' flip';
        if (showOk) { cls += ' ok'; mark = '<span class="mark" aria-label="' + esc(T('right')) + '">' + ico('check') + '</span>'; }
        else if (i === q.selected) { cls += ' bad'; mark = '<span class="mark" aria-label="' + esc(T('wrong')) + '">' + ico('x') + '</span>'; }
        else cls += ' dim';
      }
      h += '<button class="' + cls + '" data-act="pick" data-i="' + i + '"' + (st ? ' aria-disabled="true"' : '') + ' lang="' + esc(langs.ans) + '">' +
        '<span class="k">' + (i + 1) + '</span><span class="tx">' + esc(o.text) + '</span>' + mark + '</button>';
    });
    h += '</div>';
    if (st === 'wrong' && view.revealed) {
      h += '<button class="btn primary nextwide" data-act="next">' + esc(T('next')) + ico('chevron') + '</button>';
    }
    if (st === 'right' && !S.state().flags.gameHint) {
      h += '<div class="taphint glass" role="note">' + esc(T('tapHint', { s: settings().autoNext || CFG.AUTO_NEXT_DEFAULT })) + '</div>';
      view.hintShown = true;
    }
    if (st === 'right') {
      h += '<button class="boomer" data-act="next" aria-label="' + esc(T('next')) + '"><svg viewBox="0 0 100 100" aria-hidden="true">' +
        '<defs><linearGradient id="bg1" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFFFFF"/><stop offset="1" stop-color="#E9E5FF"/></linearGradient></defs>' +
        '<path d="M22 12 C48 20 70 36 82 50 C70 64 48 80 22 88 C33 75 45 63 51 50 C45 37 33 25 22 12 Z" fill="url(#bg1)" stroke="url(#bg1)" stroke-width="5" stroke-linejoin="round"/></svg></button>';
    }
    h += '<p class="sr" role="status">' + (st ? esc(st === 'right' ? T('right') : T('wrong')) : '') + '</p>';
    return page(h, 'gamepage' + (st === 'right' ? ' tapnext' : ''));
  }

  function viewRound(g, l) {
    const r = E.lastRound(g);
    const pct = E.percent(r.correct, r.total);
    const pairs = gamePairs(l, view.dir);
    const C = 2 * Math.PI * 52;
    let h = '<div class="center-t"><div class="eyebrow">' + esc(l.name) + ' · ' + esc(dirLabel(l, view.dir, true)) + '</div><h2 class="big-t">' + esc(T('roundEnd', { r: r.round })) + '</h2></div>' +
      '<div class="glass result"><div class="ring"><svg viewBox="0 0 124 124" role="img" aria-label="' + pct + '%">' +
      '<circle cx="62" cy="62" r="52" class="ring-bg"/><circle cx="62" cy="62" r="52" class="ring-fg" stroke-dasharray="' + (C * pct / 100).toFixed(1) + ' ' + C.toFixed(1) + '" transform="rotate(-90 62 62)"/></svg>' +
      '<span>' + pct + '%</span></div><div class="rstats">' +
      '<div class="rs ok">' + ico('check') + '<b>' + r.correct + '</b><span>' + esc(T('correctN')) + '</span></div>' +
      '<div class="rs bad">' + ico('x') + '<b>' + r.wrong.length + '</b><span>' + esc(T('wrongN')) + '</span></div></div></div>';
    if (r.wrong.length) {
      h += '<section class="glass pairsbox"><h3>' + esc(T('againList')) + '</h3><ul class="plain">';
      r.wrong.forEach(function (id) {
        const p = E.byId(pairs, id);
        if (p) h += '<li><b>' + esc(p.a) + '</b> – ' + esc(p.b) + '</li>';
      });
      h += '</ul></section>';
    }
    h += '<div class="stack mt"><button class="btn primary big" data-act="nextRound">' + esc(T('nextRound', { n: r.wrong.length })) + ico('chevron') + '</button>' +
      '<button class="btn big" data-act="exit">' + esc(T('exitSaved')) + '</button></div>';
    return page(h, 'roundpage');
  }

  function viewDone() {
    const s = view.summary;
    const l = S.getList(view.listId);
    return page('<div class="glass celebrate"><div class="logo big" aria-hidden="true">' + ico('check') + '</div>' +
      '<h2 class="big-t">' + esc(T('doneTitle')) + '</h2>' +
      (l ? '<div class="eyebrow">' + esc(l.name) + ' · ' + esc(dirLabel(l, view.dir)) + '</div>' : '') +
      '<div class="huge">100%</div>' +
      '<p class="lead">' + esc(T('doneText', { r: s.rounds })) + '<br>' + esc(T('doneFirst', { p: s.firstPercent })) + '</p>' +
      '<div class="stack"><button class="btn primary big" data-act="backToList">' + esc(T('backToList')) + '</button>' +
      '<button class="btn big" data-act="home">' + esc(T('backHome')) + '</button></div></div>', 'donepage');
  }

  function pick(i) {
    const l = S.getList(view.listId);
    const g = S.getGame(view.listId, view.dir);
    if (!g || !l || g.phase !== 'question') return;
    const r = E.answer(g, i);
    if (!r) return;
    S.setGame(view.listId, view.dir, g);
    clearTimers();
    view.answeredAt = Date.now();
    if (r.correct) {
      view.revealed = true;
      later(advance, (settings().autoNext || CFG.AUTO_NEXT_DEFAULT) * 1000);
      render();
    } else {
      view.revealed = false;
      render();
      later(function () {
        view.revealed = true;
        view.flipNow = true;
        render();
        view.flipNow = false;
        const nb = root.querySelector('[data-act="next"]');
        if (nb) nb.focus();
      }, CFG.REVEAL_MS);
    }
  }

  function advance() {
    clearTimers();
    const l = S.getList(view.listId);
    const g = S.getGame(view.listId, view.dir);
    if (!g || !l || view.name !== 'game') return;
    const st = answeredState(g);
    if (!st || (st === 'wrong' && !view.revealed)) return;
    if (view.hintShown) { S.setFlag('gameHint', true); view.hintShown = false; }
    E.next(g, gamePairs(l, view.dir));
    view.revealed = undefined;
    if (g.phase === 'roundEnd' && E.isComplete(g)) {
      const dir = view.dir;
      S.markCompleted(l.list_id, dir);
      view = { name: 'done', summary: E.summary(g), listId: l.list_id, dir: dir, folderId: view.folderId };
    } else {
      S.setGame(l.list_id, view.dir, g);
    }
    render();
    window.scrollTo(0, 0);
  }

  function advanceRound() {
    const l = S.getList(view.listId);
    const g = S.getGame(view.listId, view.dir);
    E.nextRound(g, gamePairs(l, view.dir));
    S.setGame(l.list_id, view.dir, g);
    render();
    window.scrollTo(0, 0);
  }

  function resumeTimers() {
    if (view.name !== 'game') return;
    const g = S.getGame(view.listId, view.dir);
    if (answeredState(g) === 'right' && !timers.length) later(advance, (settings().autoNext || CFG.AUTO_NEXT_DEFAULT) * 1000);
  }

  /* ======================================================================
     SÚGÓ, BEÁLLÍTÁSOK, SAJÁT SZÓTÁR
     ====================================================================== */
  function ul(items) { return '<ul class="dots">' + items.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>'; }
  function ol(items) { return '<ol class="steps">' + items.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ol>'; }

  function viewHelp() {
    let h = header({ back: 'home', title: T('helpTitle') });
    h += '<section class="glass sec"><h3>' + esc(T('howTitle')) + '</h3>' + ul(T('how')) + '</section>' +
      '<section class="glass sec"><h3>' + esc(T('dirsTitle')) + '</h3>' + ul(T('dirsHelp')) + '</section>' +
      '<section class="glass sec"><h3>' + esc(T('loadTitle')) + '</h3>' + ul(T('loadHelp')) + '</section>' +
      '<section class="glass sec"><h3>' + esc(T('spellTitle')) + '</h3>' + ul(T('spellHelp')) + '</section>' +
      '<section class="glass sec"><h3>' + esc(T('speakTitle')) + '</h3>' + ul(T('speakHelp')) + '</section>' +
      '<section class="glass sec" id="install"><h3>' + esc(T('installTitle')) + '</h3><p>' + esc(T('installWhy')) + '</p>' +
      '<h4>' + esc(T('installIosTitle')) + '</h4>' + ol(T('installIos')) +
      '<h4>' + esc(T('installAndroidTitle')) + '</h4>' + ol(T('installAndroid')) +
      '<h4>' + esc(T('installPcTitle')) + '</h4>' + ol(T('installPc')) + '</section>' +
      '<section class="glass sec"><h3>' + esc(T('backupTitle')) + '</h3><p>' + esc(T('backupNote')) + '</p></section>';
    return page(h, 'helppage');
  }

  function seg(name, value, options) {
    return '<div class="seg" role="radiogroup">' + options.map(function (o) {
      return '<button role="radio" aria-checked="' + (o.v === value) + '" class="' + (o.v === value ? 'on' : '') + '" data-act="set" data-k="' + name + '" data-v="' + esc(String(o.v)) + '">' + esc(o.label) + '</button>';
    }).join('') + '</div>';
  }

  function viewSettings() {
    const st = settings();
    let h = header({ back: 'home', title: T('settingsTitle') });
    h += '<section class="glass sec"><h3>' + esc(T('language')) + '</h3>' +
      seg('lang', I18N.getLang(), [{ v: 'hu', label: 'Magyar' }, { v: 'en', label: 'English' }]) + '</section>';
    h += '<section class="glass sec"><h3>' + esc(T('appearance')) + '</h3>' +
      seg('theme', st.theme, [{ v: 'system', label: T('themeSystem') }, { v: 'light', label: T('themeLight') }, { v: 'dark', label: T('themeDark') }]) +
      '<h4>' + esc(T('fontSize')) + '</h4>' +
      seg('fontScale', st.fontScale, [{ v: 0.9, label: 'A−' }, { v: 1, label: 'A' }, { v: 1.12, label: 'A+' }, { v: 1.25, label: 'A++' }]) + '</section>';
    h += '<section class="glass sec"><h3>' + esc(T('speakTitle')) + '</h3>';
    if (SPEECH.supported()) {
      h += seg('accent', st.accent, [{ v: 'GB', label: T('accentGB') }, { v: 'US', label: T('accentUS') }]) +
        '<div class="row mt"><button class="btn sm" data-act="speak" data-text="Good morning! How are you today?" data-lang="en">' + ico('speaker') + esc(T('speakTest')) + '</button></div>' +
        '<p class="fine">' + esc(T('speakNote')) + '</p>';
    } else {
      h += '<p class="fine">' + esc(T('speakUnsupported')) + '</p>';
    }
    h += '</section>';
    h += '<section class="glass sec"><h3>' + esc(T('gameSettings')) + '</h3><h4>' + esc(T('dirOrderTitle')) + '</h4>' +
      seg('dirOrder', st.dirOrder || 'fromHu', [{ v: 'fromHu', label: T('dirFromHu') }, { v: 'toHu', label: T('dirToHu') }]) +
      '<p class="fine">' + esc(T('dirOrderNote')) + '</p><h4>' + esc(T('autoNext')) + '</h4>' +
      seg('autoNext', st.autoNext, CFG.AUTO_NEXT_CHOICES.map(function (s) { return { v: s, label: s + ' ' + T('sec') }; })) + '</section>';
    h += '<section class="glass sec"><h3>' + esc(T('dictTitle')) + '</h3><p>' + esc(T('dictCount', { n: S.state().dict.length })) + '</p>' +
      '<button class="btn" data-act="openDict">' + ico('book') + esc(T('dictOpen')) + '</button></section>';
    h += '<section class="glass sec"><h3>' + esc(T('dataTitle')) + '</h3><div class="stack">' +
      '<button class="btn" data-act="exportAll">' + ico('download') + esc(T('exportAll')) + '</button>' +
      '<button class="btn" data-act="importAll">' + ico('upload') + esc(T('importAll')) + '</button>' +
      '<button class="btn danger" data-act="resetAll">' + ico('trash') + esc(T('resetAll')) + '</button></div>' +
      '<p class="fine">' + esc(T('backupNote')) + '</p></section>';
    h += '<p class="fine center">' + esc(CFG.APP_NAME) + ' · ' + esc(T('version')) + ' ' + esc(CFG.VERSION) + '</p>';
    return page(h, 'settingspage');
  }

  function viewDict() {
    const words = S.state().dict;
    let h = header({ back: 'settings', title: T('dictTitle') });
    h += '<p class="lead">' + esc(T('dictIntro')) + '</p>';
    if (!words.length) h += '<div class="glass sec"><p>' + esc(T('dictEmpty')) + '</p></div>';
    else {
      h += '<div class="glass dictlist">';
      words.forEach(function (w) {
        const where = S.whereIs(w);
        const loc = where.length ? where.map(function (x) { return (x.folder ? x.folder + ' / ' : '') + x.list; }).join(', ') : T('dictNowhere');
        h += '<div class="dw"><div><b>' + esc(w) + '</b><small>' + esc(loc) + '</small></div>' +
          '<button class="icb sm" data-act="dictDel" data-w="' + esc(w) + '" aria-label="' + esc(T('dictRemove', { w: w })) + '">' + ico('trash') + '</button></div>';
      });
      h += '</div>';
    }
    return page(h, 'dictpage');
  }

  /* ---------- PDF (nyomtatás) ---------- */
  function printList(id) {
    const l = S.getList(id);
    const box = document.getElementById('print');
    let h = '<h1>' + esc(l.name) + '</h1><div class="sub">' + esc(langNative(l.languages.a)) + ' – ' + esc(langNative(l.languages.b)) + ' · ' + esc(T('words', { n: l.pairs.length })) + '</div><ol>';
    l.pairs.forEach(function (p) { h += '<li><b>' + esc(p.a) + '</b> – ' + esc(p.b) + '</li>'; });
    box.innerHTML = h + '</ol>';
    document.body.classList.add('printing');
    const old = document.title;
    document.title = safeName(l.name);
    setTimeout(function () { window.print(); document.title = old; }, 60);
  }
  window.addEventListener('afterprint', function () { document.body.classList.remove('printing'); });

  /* ---------- megjelenítés ---------- */
  function render() {
    let out;
    switch (view.name) {
      case 'list': out = viewList(); break;
      case 'edit': out = viewEdit(); break;
      case 'game': out = viewGame(); break;
      case 'done': out = viewDone(); break;
      case 'help': out = viewHelp(); break;
      case 'settings': out = viewSettings(); break;
      case 'dict': out = viewDict(); break;
      default: out = viewHome();
    }
    root.innerHTML = out;
    if (view.name === 'edit') bindEditor();
    if (view.name === 'game') resumeTimers();
  }

  function go(v) { clearTimers(); view = v; render(); window.scrollTo(0, 0); }

  /* ---------- események ---------- */
  async function act(name, el) {
    const id = el.getAttribute('data-id');
    const dir = el.getAttribute('data-dir');
    switch (name) {
      case 'home': return go({ name: 'home', folderId: view.folderId || null });
      case 'help': return go({ name: 'help', folderId: view.folderId });
      case 'settings': return go({ name: 'settings', folderId: view.folderId });
      case 'openDict': return go({ name: 'dict', folderId: view.folderId });
      case 'openFolder': return go({ name: 'home', folderId: id || null });
      case 'openList': return go({ name: 'list', listId: id, folderId: view.folderId });
      case 'backToList': return go({ name: 'list', listId: view.listId, folderId: view.folderId });
      case 'newList': return go({ name: 'edit', folderId: view.folderId, edit: newEdit(null, '', '', null, [], view.folderId) });
      case 'newFolder': {
        const r = await modal({ title: T('newFolder'), input: { label: T('folderName'), value: '' },
          buttons: [{ label: T('cancel'), v: null }, { label: T('save'), v: 'ok', cls: 'primary' }] });
        if (r && r.value && r.value.trim()) { const f = S.addFolder(r.value.trim()); go({ name: 'home', folderId: f.id }); }
        return;
      }
      case 'renameFolder': {
        const f = S.getFolder(view.folderId);
        const r = await modal({ title: T('renameFolder'), input: { label: T('folderName'), value: f.name },
          buttons: [{ label: T('cancel'), v: null }, { label: T('save'), v: 'ok', cls: 'primary' }] });
        if (r && r.value && r.value.trim()) { S.renameFolder(f.id, r.value.trim()); render(); }
        return;
      }
      case 'deleteFolder': {
        const f = S.getFolder(view.folderId);
        const r = await modal({ title: T('deleteFolder'), text: T('folderDeleteQ', { name: f.name }),
          buttons: [{ label: T('cancel'), v: null }, { label: T('del'), v: 'ok', cls: 'danger' }] });
        if (r === 'ok') { S.deleteFolder(f.id); go({ name: 'home', folderId: null }); }
        return;
      }
      case 'loadFile': return pickFile(view.name === 'edit' ? 'editor' : 'any');
      case 'photo':
        return modal({ title: T('photoTitle'), text: T('photoText'), icon: 'camera', buttons: [{ label: T('ok'), v: 'ok', cls: 'primary' }] });
      case 'install': {
        if (deferredInstall) {
          const p = deferredInstall; deferredInstall = null;
          p.prompt();
          return;
        }
        go({ name: 'help', folderId: view.folderId });
        setTimeout(function () { const s = document.getElementById('install'); if (s) s.scrollIntoView({ block: 'start' }); }, 30);
        return;
      }
      case 'edit': {
        const l = S.getList(view.listId);
        return go({ name: 'edit', folderId: view.folderId, edit: newEdit(l.list_id, l.name, E.serialize(l.pairs), { a: l.languages.a, b: l.languages.b }, l.spell_ignore, l.folder_id) });
      }
      case 'cancelEdit': return cancelEdit();
      case 'saveEdit': return saveEdit();
      case 'merge': return mergeGroup(+el.getAttribute('data-g'));
      case 'mergeAll': return mergeAll();
      case 'fix': return fixGroup(+el.getAttribute('data-g'));
      case 'gotoLine': return gotoLine(+el.getAttribute('data-line'));
      case 'swapCols': {
        view.edit.dirDismissed = true;
        setEditText(E.swapText(view.edit.text), true);
        return toast(T('swapped'));
      }
      case 'dirDismiss': view.edit.dirDismissed = true; return renderBanners();
      case 'undoImport': {
        const e = view.edit;
        if (e.undo == null) return;
        const u = e.undo; e.undo = null; e.importInfo = null;
        setEditText(u);
        return toast(T('undone'));
      }
      case 'closeBanner': view.edit.importInfo = null; view.edit.undo = null; return renderBanners();
      case 'nextErr': return nextError();
      case 'addPair': return addPair();
      case 'addFix': {
        const hgt = view.addHit; if (!hgt) return;
        const f = document.getElementById(hgt.field);
        f.value = f.value.slice(0, hgt.start) + el.getAttribute('data-s') + f.value.slice(hgt.end);
        return addSpell();
      }
      case 'addIgnore': {
        const hgt = view.addHit; if (!hgt) return;
        const w = hgt.w.normalize('NFC').replace(/’/g, "'").toLowerCase();
        if (view.edit.ignore.indexOf(w) < 0) view.edit.ignore.push(w);
        return addSpell();
      }
      case 'fixErr': return fixError(el.getAttribute('data-s'));
      case 'ignoreErr': return ignoreError(false);
      case 'dictErr': return ignoreError(true);
      case 'speak': return SPEECH.speak(el.getAttribute('data-text'), el.getAttribute('data-lang'), accent());
      case 'start': return startGame(view.listId, dir);
      case 'resume': return go({ name: 'game', listId: view.listId, dir: dir, folderId: view.folderId });
      case 'restart': {
        if (S.getGame(view.listId, dir)) {
          const r = await modal({ title: T('restart'), text: T('restartQ'),
            buttons: [{ label: T('cancel'), v: null }, { label: T('restart'), v: 'ok', cls: 'primary' }] });
          if (r !== 'ok') return;
        }
        S.clearGame(view.listId, dir);
        return startGame(view.listId, dir);
      }
      case 'moveList': {
        const st = S.state();
        const choices = [{ label: T('noFolder'), v: 'root', icon: 'move' }].concat(
          st.folders.map(function (f) { return { label: f.name, v: f.id, icon: 'folder' }; }),
          [{ label: T('newFolderCreate'), v: '__new', icon: 'plus' }]);
        let r = await modal({ title: T('moveTo'), choices: choices, buttons: [{ label: T('cancel'), v: null }] });
        if (r === '__new') {
          const nf = await modal({ title: T('createFolder'), input: { label: T('folderName'), value: '' },
            buttons: [{ label: T('cancel'), v: null }, { label: T('createAndMove'), v: 'ok', cls: 'primary' }] });
          if (!nf || !nf.value || !nf.value.trim()) return;
          r = S.addFolder(nf.value.trim()).id;
        }
        if (r) { S.moveList(view.listId, r === 'root' ? null : r); toast(T('moved')); render(); }
        return;
      }
      case 'pdf': return printList(view.listId);
      case 'saveFile': {
        const l = S.getList(view.listId);
        return download(safeName(l.name) + '.json', S.exportList(l.list_id));
      }
      case 'deleteList': {
        const l = S.getList(view.listId);
        const r = await modal({ title: T('del'), text: T('delQ', { name: l.name }),
          buttons: [{ label: T('cancel'), v: null }, { label: T('del'), v: 'ok', cls: 'danger' }] });
        if (r === 'ok') { S.deleteList(l.list_id); go({ name: 'home', folderId: view.folderId }); }
        return;
      }
      case 'pick': {
        const g = S.getGame(view.listId, view.dir);
        const st = answeredState(g);
        if (!st) return pick(+el.getAttribute('data-i'));
        // már megválaszolt kérdés: jó válasz után a koppintás továbbléptet
        if (st === 'right' && Date.now() - (view.answeredAt || 0) > CFG.TAP_GUARD_MS) return advance();
        return;
      }
      case 'next': return advance();
      case 'nextRound': return advanceRound();
      case 'exit': return go({ name: 'list', listId: view.listId, folderId: view.folderId });
      case 'set': {
        const k = el.getAttribute('data-k');
        let v = el.getAttribute('data-v');
        if (k === 'fontScale' || k === 'autoNext') v = parseFloat(v);
        if (k === 'lang') { I18N.setLang(v); }
        if (k === 'autoNext') S.setSetting('autoNextSet', true);
        S.setSetting(k, v);
        applySettings();
        return render();
      }
      case 'dictDel': S.removeWord(el.getAttribute('data-w')); return render();
      case 'exportAll': return download(safeName(CFG.APP_NAME) + '-mentes.json', S.exportAll());
      case 'importAll': return pickFile('backup');
      case 'resetAll': {
        const r = await modal({ title: T('resetAll'), text: T('resetQ'), icon: 'warn', iconCls: 'badc',
          buttons: [{ label: T('cancel'), v: null }, { label: T('del'), v: 'ok', cls: 'danger' }] });
        if (r === 'ok') { S.resetAll(); go({ name: 'home', folderId: null }); }
        return;
      }
    }
  }

  document.addEventListener('click', function (e) {
    if (e.target.closest('.overlay')) return;
    const el = e.target.closest('[data-act]');
    if (el && !el.disabled) { act(el.getAttribute('data-act'), el); return; }
    // jó válasz után: koppintás bárhol a képernyőn (a letiltott válaszgombokon is) -> tovább
    if (view.name === 'game' && Date.now() - (view.answeredAt || 0) > CFG.TAP_GUARD_MS) {
      const g = S.getGame(view.listId, view.dir);
      if (answeredState(g) === 'right') advance();
    }
  });

  document.addEventListener('keydown', function (e) {
    if (document.querySelector('.overlay')) return;
    const t = e.target;
    const typing = t && /INPUT|TEXTAREA|SELECT/.test(t.tagName);
    if ((e.key === 'Enter' || e.key === ' ') && t && t.getAttribute && t.getAttribute('role') === 'button') {
      e.preventDefault(); act(t.getAttribute('data-act'), t); return;
    }
    if (view.name === 'game' && !typing) {
      const g = S.getGame(view.listId, view.dir);
      if (/^[1-5]$/.test(e.key) && g && !answeredState(g)) { pick(+e.key - 1); return; }
      if ((e.key === 'Enter' || e.key === 'ArrowRight' || e.key === ' ') && answeredState(g)) {
        if (t && t.tagName === 'BUTTON' && t.getAttribute('data-act') === 'next') return; // a gomb maga kezeli
        e.preventDefault(); advance();
      }
    }
  });

  /* húzás mappára (egérrel) */
  let dragId = null;
  document.addEventListener('dragstart', function (e) {
    const el = e.target.closest && e.target.closest('[data-act="openList"]');
    if (!el) return;
    dragId = el.getAttribute('data-id');
    e.dataTransfer.setData('text/plain', dragId);
    e.dataTransfer.effectAllowed = 'move';
  });
  document.addEventListener('dragover', function (e) {
    const el = e.target.closest && e.target.closest('[data-drop]');
    if (el && dragId) { e.preventDefault(); el.classList.add('dropping'); }
  });
  document.addEventListener('dragleave', function (e) {
    const el = e.target.closest && e.target.closest('[data-drop]');
    if (el) el.classList.remove('dropping');
  });
  document.addEventListener('drop', function (e) {
    const el = e.target.closest && e.target.closest('[data-drop]');
    if (!el || !dragId) return;
    e.preventDefault();
    const to = el.getAttribute('data-drop');
    S.moveList(dragId, to === 'root' ? null : to);
    dragId = null;
    toast(T('moved'));
    render();
  });
  document.addEventListener('dragend', function () {
    dragId = null;
    document.querySelectorAll('.dropping').forEach(function (n) { n.classList.remove('dropping'); });
  });

  document.getElementById('file').addEventListener('change', function (e) {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    if (view.importMode === 'backup') {
      readBytes(f).then(function (b) { handleJson(IM.decodeText(b), f.name, 'backup'); });
      return;
    }
    handleFile(f);
  });

  window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); deferredInstall = e; });
  window.addEventListener('appinstalled', function () { deferredInstall = null; if (view.name === 'home') render(); });
  if (window.matchMedia) {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onScheme = function () { applySettings(); };
    if (mq.addEventListener) mq.addEventListener('change', onScheme); else if (mq.addListener) mq.addListener(onScheme);
  }
  window.addEventListener('resize', function () { if (view.name === 'edit') fitBackdrop(); });
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) clearTimers(); else resumeTimers();
  });

  /* ---------- indítás ---------- */
  document.title = CFG.APP_NAME;
  I18N.setLang(settings().lang);
  applySettings();
  render();

  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol) && !window.SZK_SINGLE) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js').catch(function () { /* offline-gyorsítás nélkül is működik */ });
    });
  }
})();
