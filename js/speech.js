/* Kiejtés a böngésző beépített felolvasójával (Web Speech API).
   Csak gombnyomásra szól. A hang minősége és a választható hangok
   eszközönként eltérnek. */
(function () {
  'use strict';
  const CFG = window.APP_CONFIG;
  const synth = window.speechSynthesis || null;
  let voices = [];

  function refresh() { try { voices = synth ? synth.getVoices() : []; } catch (e) { voices = []; } }
  if (synth) {
    refresh();
    if (typeof synth.addEventListener === 'function') synth.addEventListener('voiceschanged', refresh);
    else synth.onvoiceschanged = refresh;
  }

  function tagFor(lang, accent) {
    const l = CFG.LANGS[lang];
    if (!l || !l.tts) return null;
    if (typeof l.tts === 'string') return l.tts;
    return l.tts[accent] || l.tts[Object.keys(l.tts)[0]];
  }

  function pickVoice(tag) {
    if (!voices.length) refresh();
    const t = tag.toLowerCase().replace('_', '-');
    const base = t.split('-')[0];
    const norm = function (v) { return String(v.lang || '').toLowerCase().replace('_', '-'); };
    const exact = voices.filter(function (v) { return norm(v) === t; });
    const pool = exact.length ? exact : voices.filter(function (v) { return norm(v).split('-')[0] === base; });
    if (!pool.length) return null;
    return pool.find(function (v) { return v.localService; }) || pool[0];
  }

  function supported() { return !!(synth && window.SpeechSynthesisUtterance); }

  /* Van-e hang ehhez a nyelvhez. Ha a böngésző még nem adta meg a hanglistát,
     igent mondunk (a lejátszáskor a böngésző választ). */
  function canSpeak(lang, accent) {
    if (!supported()) return false;
    const tag = tagFor(lang, accent);
    if (!tag) return false;
    if (!voices.length) refresh();
    if (!voices.length) return true;
    return !!pickVoice(tag);
  }

  function speak(text, lang, accent) {
    if (!supported() || !text) return false;
    const tag = tagFor(lang, accent);
    if (!tag) return false;
    try {
      synth.cancel();
      const u = new SpeechSynthesisUtterance(String(text).replace(/\s*\([^)]*\)/g, ' ').trim());
      u.lang = tag;
      const v = pickVoice(tag);
      if (v) u.voice = v;
      u.rate = 0.9;
      synth.speak(u);
      return true;
    } catch (e) { return false; }
  }

  window.Speech = { supported: supported, canSpeak: canSpeak, speak: speak };
})();
