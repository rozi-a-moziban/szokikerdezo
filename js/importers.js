/* Fájlok beolvasása: .txt, .docx (Word), .xlsx (Excel).
   Az eredmény szópár-blokkok listája (egy blokk = egy oszloppár) és a
   táblázaton kívüli szövegsorok. A JSON-mentéseket a store.js kezeli.
   Böngészőben: window.Importers, Node-ban: require('./importers.js'). */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./unzip.js'), require('./engine.js'));
  } else {
    root.Importers = factory(root.Unzip, root.Engine);
  }
})(typeof self !== 'undefined' ? self : this, function (Unzip, Engine) {
  'use strict';

  /* Fejléc-szavak: ha egy oszloppár első sora ilyen, nem szópár. */
  const HEADER_WORDS = new Set(['english', 'angol', 'magyar', 'hungarian', 'word', 'words', 'szó', 'szavak',
    'meaning', 'jelentés', 'translation', 'fordítás', 'german', 'német', 'deutsch', 'italian', 'olasz',
    'italiano', 'spanish', 'spanyol', 'español', 'en', 'hu', 'de', 'it', 'es']);

  /* ---------- szöveg dekódolása: UTF-8, ha hibás, Windows-1250 (közép-európai) ---------- */
  function decodeText(bytes) {
    const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
    let t;
    try { t = new TextDecoder('utf-8', { fatal: true }).decode(b); }
    catch (e) {
      try { t = new TextDecoder('windows-1250').decode(b); }
      catch (e2) { t = new TextDecoder('utf-8').decode(b); }
    }
    return t.replace(/^﻿/, '');
  }

  function xmlText(s) {
    return String(s).replace(/&(lt|gt|amp|quot|apos|#(\d+)|#x([0-9a-fA-F]+));/g, function (m, n, d, h) {
      if (d) return String.fromCodePoint(+d);
      if (h) return String.fromCodePoint(parseInt(h, 16));
      return { lt: '<', gt: '>', amp: '&', quot: '"', apos: "'" }[n];
    });
  }

  function clean(s) { return String(s == null ? '' : s).replace(/\s+/g, ' ').trim(); }

  function colName(i) {
    let s = '';
    i++;
    while (i > 0) { const m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); }
    return s;
  }

  /* ---------- táblázat -> oszloppár-blokkok ----------
     Az egymás melletti, üres oszloppal elválasztott oszlopcsoportokat keresi.
     Két oszlop = egy blokk. Páros szélességű csoport párokra bomlik,
     páratlannál az utolsó oszlop kimarad (ezt a jelentés jelzi). */
  function tableToBlocks(rows, labelFn) {
    let width = 0;
    rows.forEach(function (r) { width = Math.max(width, r.length); });
    const used = [];
    for (let c = 0; c < width; c++) {
      used[c] = rows.some(function (r) { return clean(r[c]) !== ''; });
    }
    const runs = [];
    let c = 0;
    while (c < width) {
      if (!used[c]) { c++; continue; }
      const start = c;
      while (c < width && used[c]) c++;
      runs.push([start, c - 1]);
    }
    const blocks = [];
    let skippedCols = 0;
    runs.forEach(function (run) {
      const w = run[1] - run[0] + 1;
      if (w < 2) { skippedCols += 1; return; }
      if (w % 2 === 1) skippedCols += 1;
      for (let k = run[0]; k + 1 <= run[1]; k += 2) {
        const pairs = [];
        let incomplete = 0;
        rows.forEach(function (r, ri) {
          const a = clean(r[k]), b = clean(r[k + 1]);
          if (!a && !b) return;
          if (ri === 0 && HEADER_WORDS.has(a.toLowerCase()) && HEADER_WORDS.has(b.toLowerCase())) return;
          if (!a || !b) { incomplete++; return; }
          pairs.push({ a: a, b: b });
        });
        if (pairs.length || incomplete) {
          blocks.push({ label: labelFn ? labelFn(k, k + 1) : (colName(k) + '–' + colName(k + 1)), pairs: pairs, incomplete: incomplete });
        }
      }
    });
    return { blocks: blocks, skippedCols: skippedCols };
  }

  /* ---------- .txt ----------
     Ha a sorok többsége tabulátorral több oszlopra bomlik (Excelből másolt
     táblázat), táblázatként kezeljük; különben soronként egy szópár. */
  function fromText(text) {
    const lines = String(text).split(/\r?\n/);
    const nonEmpty = lines.filter(function (l) { return l.trim(); });
    const multi = nonEmpty.filter(function (l) { return l.split('\t').filter(function (x) { return x.trim(); }).length >= 3; });
    if (nonEmpty.length && multi.length >= nonEmpty.length / 2) {
      const t = tableToBlocks(nonEmpty.map(function (l) { return l.split('\t'); }), function (a, b) { return (a + 1) + '–' + (b + 1) + '.'; });
      return { blocks: t.blocks, lines: [], skippedCols: t.skippedCols };
    }
    return { blocks: [], lines: nonEmpty, skippedCols: 0 };
  }

  /* ---------- .docx ---------- */
  function docxParagraph(xml) {
    let s = '';
    const re = /<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>|<w:tab\/>|<w:br\/>|<w:cr\/>/g;
    let m;
    while ((m = re.exec(xml))) {
      if (m[1] != null) s += xmlText(m[1]);
      else if (m[0] === '<w:tab/>') s += '\t';
      else s += '\n';
    }
    return s;
  }

  function fromDocx(bytes) {
    const z = Unzip.open(bytes);
    const xml = z.text('word/document.xml');
    if (!xml) throw new Error('nodoc');
    const body = (xml.match(/<w:body>([\s\S]*)<\/w:body>/) || [null, xml])[1];
    const blocks = [];
    const lines = [];
    let skippedCols = 0;
    let tableNo = 0;
    const re = /<w:tbl>[\s\S]*?<\/w:tbl>|<w:p[ >][\s\S]*?<\/w:p>|<w:p\/>/g;
    let m;
    while ((m = re.exec(body))) {
      const part = m[0];
      if (part.indexOf('<w:tbl>') === 0) {
        tableNo++;
        const rows = [];
        (part.match(/<w:tr[ >][\s\S]*?<\/w:tr>/g) || []).forEach(function (tr) {
          const cells = (tr.match(/<w:tc>[\s\S]*?<\/w:tc>/g) || []).map(function (tc) {
            return (tc.match(/<w:p[ >][\s\S]*?<\/w:p>/g) || []).map(docxParagraph).join(' ');
          });
          rows.push(cells);
        });
        const no = tableNo;
        const t = tableToBlocks(rows, function (a, b) { return no + '. táblázat ' + (a + 1) + '–' + (b + 1) + '.'; });
        t.blocks.forEach(function (bl) { blocks.push(bl); });
        skippedCols += t.skippedCols;
      } else {
        docxParagraph(part).split('\n').forEach(function (l) { if (l.trim()) lines.push(l); });
      }
    }
    return { blocks: blocks, lines: lines, skippedCols: skippedCols };
  }

  /* ---------- .xlsx ---------- */
  function colIndex(ref) {
    const letters = (ref.match(/^[A-Z]+/) || ['A'])[0];
    let n = 0;
    for (let i = 0; i < letters.length; i++) n = n * 26 + (letters.charCodeAt(i) - 64);
    return n - 1;
  }

  function fromXlsx(bytes) {
    const z = Unzip.open(bytes);
    const shared = [];
    const ss = z.text('xl/sharedStrings.xml');
    if (ss) {
      (ss.match(/<si>[\s\S]*?<\/si>|<si\/>/g) || []).forEach(function (si) {
        let t = '';
        const re = /<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g;
        let m;
        while ((m = re.exec(si))) t += xmlText(m[1]);
        shared.push(t);
      });
    }
    // munkalapok a munkafüzet sorrendjében
    let sheets = [];
    const wb = z.text('xl/workbook.xml');
    const rels = z.text('xl/_rels/workbook.xml.rels');
    if (wb && rels) {
      const relMap = {};
      (rels.match(/<Relationship\b[^>]*>/g) || []).forEach(function (r) {
        const id = (r.match(/\bId="([^"]+)"/) || [])[1];
        const target = (r.match(/\bTarget="([^"]+)"/) || [])[1];
        if (id && target) relMap[id] = target.replace(/^\/?xl\//, '').replace(/^\//, '');
      });
      (wb.match(/<sheet\b[^>]*>/g) || []).forEach(function (s) {
        const name = xmlText((s.match(/\bname="([^"]*)"/) || [])[1] || '');
        const rid = (s.match(/\br:id="([^"]+)"/) || [])[1];
        if (rid && relMap[rid]) sheets.push({ name: name, path: 'xl/' + relMap[rid] });
      });
    }
    if (!sheets.length) {
      sheets = z.names.filter(function (n) { return /^xl\/worksheets\/sheet\d+\.xml$/.test(n); }).sort()
        .map(function (p, i) { return { name: String(i + 1), path: p }; });
    }
    const blocks = [];
    let skippedCols = 0;
    sheets.forEach(function (sh) {
      const xml = z.text(sh.path);
      if (!xml) return;
      const rows = [];
      (xml.match(/<row\b[\s\S]*?<\/row>|<row\b[^>]*\/>/g) || []).forEach(function (row) {
        const cells = [];
        (row.match(/<c\b[^>]*\/>|<c\b[^>]*>[\s\S]*?<\/c>/g) || []).forEach(function (c) {
          const ref = (c.match(/\br="([A-Z]+)\d+"/) || [])[1];
          const type = (c.match(/\bt="([^"]+)"/) || [])[1];
          const ci = ref ? colIndex(ref) : cells.length;
          let v = '';
          if (type === 'inlineStr') {
            const re = /<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g;
            let m;
            while ((m = re.exec(c))) v += xmlText(m[1]);
          } else {
            const mv = c.match(/<v>([\s\S]*?)<\/v>/);
            if (mv) v = type === 's' ? (shared[+mv[1]] || '') : xmlText(mv[1]);
          }
          cells[ci] = v;
        });
        rows.push(cells);
      });
      const multi = sheets.length > 1;
      const t = tableToBlocks(rows, function (a, b) { return (multi ? sh.name + ': ' : '') + colName(a) + '–' + colName(b); });
      t.blocks.forEach(function (bl) { blocks.push(bl); });
      skippedCols += t.skippedCols;
    });
    return { blocks: blocks, lines: [], skippedCols: skippedCols };
  }

  /* ---------- belépési pont ----------
     Visszaad: { kind: 'json', text } | { kind: 'pairs', blocks, lines, skippedCols }
     vagy { error: 'oldword'|'oldexcel'|'type'|'read' } */
  function readFile(name, bytes) {
    const ext = (String(name).match(/\.([^.]+)$/) || [])[1];
    const e = ext ? ext.toLowerCase() : '';
    try {
      if (e === 'json') return { kind: 'json', text: decodeText(bytes) };
      if (e === 'docx') return Object.assign({ kind: 'pairs' }, fromDocx(bytes));
      if (e === 'xlsx' || e === 'xlsm') return Object.assign({ kind: 'pairs' }, fromXlsx(bytes));
      if (e === 'doc') return { error: 'oldword' };
      if (e === 'xls') return { error: 'oldexcel' };
      if (e === 'txt' || e === 'text' || e === '') {
        const text = decodeText(bytes);
        if (/^\s*\{/.test(text)) return { kind: 'json', text: text };
        return Object.assign({ kind: 'pairs' }, fromText(text));
      }
      return { error: 'type' };
    } catch (err) {
      return { error: 'read', detail: String(err && err.message || err) };
    }
  }

  /* Blokkok és sorok szövegként (a szerkesztőbe), a megfordítandó blokkokkal. */
  function toText(result, flip) {
    const out = [];
    (result.blocks || []).forEach(function (bl, i) {
      bl.pairs.forEach(function (p) {
        out.push(flip && flip[i] ? p.b + ' - ' + p.a : p.a + ' - ' + p.b);
      });
    });
    (result.lines || []).forEach(function (l) { out.push(l); });
    return out.join('\n');
  }

  function stats(result) {
    let pairs = 0, incomplete = 0;
    (result.blocks || []).forEach(function (b) { pairs += b.pairs.length; incomplete += b.incomplete; });
    const parsed = Engine.parseLines((result.lines || []).join('\n'));
    return { pairs: pairs + parsed.pairs.length, blocks: (result.blocks || []).length, problemLines: parsed.errors.length + incomplete, skippedCols: result.skippedCols || 0 };
  }

  return { readFile: readFile, decodeText: decodeText, fromText: fromText, fromDocx: fromDocx, fromXlsx: fromXlsx,
    tableToBlocks: tableToBlocks, toText: toText, stats: stats };
});
