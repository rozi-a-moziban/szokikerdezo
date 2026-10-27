/* Egyetlen hely a program nevének és alapbeállításainak.
   Ha a nevet át akarod írni, csak az APP_NAME értéket kell módosítani. */
window.APP_CONFIG = {
  APP_NAME: 'Szókikérdező program',
  VERSION: '0.2.1',
  MIN_PAIRS: 10,
  STORAGE_KEY: 'szk:v1',
  SCHEMA_VERSION: 2,

  /* Játék időzítései */
  REVEAL_MS: 300,          // rossz válasz után ennyi idő múlva kezd átfordulni a helyes válasz kártyája
  AUTO_NEXT_DEFAULT: 3,    // jó válasz után ennyi másodperc múlva lép tovább (Beállításokban állítható)
  AUTO_NEXT_CHOICES: [2, 3, 4, 5],
  TAP_GUARD_MS: 350,       // a válasz utáni koppintás ennyi ideig nem léptet (dupla koppintás ellen)

  /* Nyelvek. dict: van-e helyesírási szólista (dict/<kód>.txt).
     Új nyelv: új sor ide, a felület nyelvi nevei az i18n.js-ben (lang_<kód>). */
  LANGS: {
    en: { native: 'English', short: 'EN', dict: true, tts: { GB: 'en-GB', US: 'en-US' } },
    hu: { native: 'Magyar', short: 'HU', dict: false, tts: 'hu-HU' },
    de: { native: 'Deutsch', short: 'DE', dict: false, tts: 'de-DE' },
    it: { native: 'Italiano', short: 'IT', dict: false, tts: 'it-IT' },
    es: { native: 'Español', short: 'ES', dict: false, tts: 'es-ES' }
  }
};
