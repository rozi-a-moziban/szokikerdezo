/* ZIP-kicsomagoló a .docx és .xlsx fájlokhoz (ezek valójában zip-csomagok).
   Saját, külső könyvtár nélküli DEFLATE-dekódoló (RFC 1951). Csak olvas.
   Böngészőben: window.Unzip, Node-ban: require('./unzip.js'). */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Unzip = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const LEN_BASE = [3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 15, 17, 19, 23, 27, 31, 35, 43, 51, 59, 67, 83, 99, 115, 131, 163, 195, 227, 258];
  const LEN_EXTRA = [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0];
  const DIST_BASE = [1, 2, 3, 4, 5, 7, 9, 13, 17, 25, 33, 49, 65, 97, 129, 193, 257, 385, 513, 769, 1025, 1537, 2049, 3073, 4097, 6145, 8193, 12289, 16385, 24577];
  const DIST_EXTRA = [0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13];
  const CL_ORDER = [16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15];

  /* Huffman-tábla: counts[hossz] és symbols (kanonikus sorrend) */
  function buildTree(lengths, n) {
    const counts = new Uint16Array(16);
    const offs = new Uint16Array(16);
    const symbols = new Uint16Array(n);
    for (let i = 0; i < n; i++) counts[lengths[i]]++;
    counts[0] = 0;
    for (let i = 1; i < 16; i++) offs[i] = offs[i - 1] + counts[i - 1];
    for (let i = 0; i < n; i++) if (lengths[i]) symbols[offs[lengths[i]]++] = i;
    return { counts: counts, symbols: symbols };
  }

  function inflateRaw(src, sizeHint) {
    let pos = 0, bitBuf = 0, bitCnt = 0;
    let out = new Uint8Array(sizeHint > 0 ? sizeHint : Math.max(1024, src.length * 4));
    let outPos = 0;

    function need(n) {
      if (outPos + n <= out.length) return;
      let size = out.length * 2;
      while (size < outPos + n) size *= 2;
      const bigger = new Uint8Array(size);
      bigger.set(out.subarray(0, outPos));
      out = bigger;
    }
    function bits(n) {
      while (bitCnt < n) {
        if (pos >= src.length) throw new Error('inflate: váratlan fájlvég');
        bitBuf |= src[pos++] << bitCnt; bitCnt += 8;
      }
      const v = bitBuf & ((1 << n) - 1);
      bitBuf >>>= n; bitCnt -= n;
      return v;
    }
    function decode(t) {
      let code = 0, first = 0, index = 0;
      for (let len = 1; len < 16; len++) {
        code |= bits(1);
        const count = t.counts[len];
        if (code - first < count) return t.symbols[index + code - first];
        index += count; first += count;
        first <<= 1; code <<= 1;
      }
      throw new Error('inflate: hibás Huffman-kód');
    }

    let fixedL = null, fixedD = null;
    function fixedTrees() {
      if (!fixedL) {
        const l = new Uint8Array(288);
        for (let i = 0; i < 144; i++) l[i] = 8;
        for (let i = 144; i < 256; i++) l[i] = 9;
        for (let i = 256; i < 280; i++) l[i] = 7;
        for (let i = 280; i < 288; i++) l[i] = 8;
        fixedL = buildTree(l, 288);
        const d = new Uint8Array(30).fill(5);
        fixedD = buildTree(d, 30);
      }
      return [fixedL, fixedD];
    }
    function dynamicTrees() {
      const hlit = bits(5) + 257, hdist = bits(5) + 1, hclen = bits(4) + 4;
      const cl = new Uint8Array(19);
      for (let i = 0; i < hclen; i++) cl[CL_ORDER[i]] = bits(3);
      const clTree = buildTree(cl, 19);
      const lens = new Uint8Array(hlit + hdist);
      let i = 0;
      while (i < hlit + hdist) {
        const sym = decode(clTree);
        if (sym < 16) { lens[i++] = sym; continue; }
        let rep = 0, val = 0;
        if (sym === 16) { if (!i) throw new Error('inflate: hibás ismétlés'); val = lens[i - 1]; rep = 3 + bits(2); }
        else if (sym === 17) rep = 3 + bits(3);
        else rep = 11 + bits(7);
        while (rep--) lens[i++] = val;
      }
      return [buildTree(lens.subarray(0, hlit), hlit), buildTree(lens.subarray(hlit), hdist)];
    }

    let last = 0;
    while (!last) {
      last = bits(1);
      const type = bits(2);
      if (type === 0) {
        bitBuf = 0; bitCnt = 0;
        const len = src[pos] | (src[pos + 1] << 8);
        pos += 4;
        need(len);
        out.set(src.subarray(pos, pos + len), outPos);
        pos += len; outPos += len;
      } else if (type === 1 || type === 2) {
        const trees = type === 1 ? fixedTrees() : dynamicTrees();
        for (;;) {
          const sym = decode(trees[0]);
          if (sym < 256) { need(1); out[outPos++] = sym; }
          else if (sym === 256) break;
          else {
            const li = sym - 257;
            if (li >= 29) throw new Error('inflate: hibás hossz');
            const len = LEN_BASE[li] + bits(LEN_EXTRA[li]);
            const di = decode(trees[1]);
            if (di >= 30) throw new Error('inflate: hibás távolság');
            const dist = DIST_BASE[di] + bits(DIST_EXTRA[di]);
            if (dist > outPos) throw new Error('inflate: hibás visszautalás');
            need(len);
            for (let k = 0; k < len; k++) { out[outPos] = out[outPos - dist]; outPos++; }
          }
        }
      } else {
        throw new Error('inflate: ismeretlen blokktípus');
      }
    }
    return out.subarray(0, outPos);
  }

  function u16(b, o) { return b[o] | (b[o + 1] << 8); }
  function u32(b, o) { return (b[o] | (b[o + 1] << 8) | (b[o + 2] << 16)) + b[o + 3] * 16777216; }

  /* A zip tartalomjegyzéke: { 'word/document.xml': Uint8Array, ... } (lustán bontva) */
  function open(bytes) {
    const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
    let eocd = -1;
    for (let i = b.length - 22; i >= Math.max(0, b.length - 65557); i--) {
      if (u32(b, i) === 0x06054b50) { eocd = i; break; }
    }
    if (eocd < 0) throw new Error('nem zip');
    const count = u16(b, eocd + 10);
    let p = u32(b, eocd + 16);
    const entries = {};
    const dec = new TextDecoder('utf-8');
    for (let n = 0; n < count; n++) {
      if (u32(b, p) !== 0x02014b50) throw new Error('hibás zip-tartalomjegyzék');
      const method = u16(b, p + 10);
      const csize = u32(b, p + 20), usize = u32(b, p + 24);
      const nlen = u16(b, p + 28), xlen = u16(b, p + 30), clen = u16(b, p + 32);
      const local = u32(b, p + 42);
      const name = dec.decode(b.subarray(p + 46, p + 46 + nlen));
      entries[name] = { method: method, csize: csize, usize: usize, local: local };
      p += 46 + nlen + xlen + clen;
    }
    return {
      names: Object.keys(entries),
      has: function (name) { return !!entries[name]; },
      read: function (name) {
        const e = entries[name];
        if (!e) return null;
        const lp = e.local;
        if (u32(b, lp) !== 0x04034b50) throw new Error('hibás zip-bejegyzés');
        const start = lp + 30 + u16(b, lp + 26) + u16(b, lp + 28);
        const data = b.subarray(start, start + e.csize);
        if (e.method === 0) return data;
        if (e.method === 8) return inflateRaw(data, e.usize);
        throw new Error('nem támogatott tömörítés');
      },
      text: function (name) {
        const d = this.read(name);
        return d ? dec.decode(d) : null;
      }
    };
  }

  return { open: open, inflateRaw: inflateRaw };
});
