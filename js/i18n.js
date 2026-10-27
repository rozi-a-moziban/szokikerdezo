/* Feliratok magyarul és angolul. Új felületnyelv: új blokk a DICT-be
   (a hiányzó kulcsok magyarul jelennek meg). */
(function () {
  'use strict';
  const DICT = {
    hu: {
      /* nyelvnevek (melléknév) és "…ul/…ül" alak */
      lang_en: 'angol', lang_hu: 'magyar', lang_de: 'német', lang_it: 'olasz', lang_es: 'spanyol',
      langAdv_en: 'angolul', langAdv_hu: 'magyarul', langAdv_de: 'németül', langAdv_it: 'olaszul', langAdv_es: 'spanyolul',

      back: 'Vissza', close: 'Bezárás', ok: 'Rendben', cancel: 'Mégse', save: 'Mentés', del: 'Törlés', sec: 'mp',
      helpTitle: 'Súgó', settingsTitle: 'Beállítások',

      /* kezdőképernyő */
      emptyTitle: 'Még nincs listád',
      emptyText: 'Írd be a szavakat, tölts be egy fájlt, vagy fényképezd le a szószedetet.',
      typeIn: 'Beírás', typeInSub: 'Szavak beírása vagy bemásolása',
      fromFile: 'Fájlból', fromFileSub: 'Word, Excel vagy szöveges fájl',
      fromPhoto: 'Fényképről', fromPhotoSub: 'Kamera vagy kép a galériából',
      file: 'Fájl', photo: 'Fotó', newList: 'Új lista',
      installLink: 'Telepítés a kezdőképernyőre',
      installNote: 'Nem kötelező, a program böngészőben is működik. Telepítve saját ikonról, teljes képernyőn indul, internet nélkül is működik, és iPhone-on nem vesznek el a listáid.',
      folders: 'Mappák', allLists: 'Összes', newFolder: 'Új mappa', folderName: 'Mappa neve', createFolder: 'Mappa létrehozása',
      newFolderCreate: '+ Új mappa létrehozása', createAndMove: 'Létrehozás és áthelyezés',
      renameFolder: 'Átnevezés', deleteFolder: 'Mappa törlése',
      folderDeleteQ: 'Törlöd a(z) „{name}” mappát? A benne lévő listák megmaradnak, mappán kívülre kerülnek.',
      folderEmpty: 'Ebben a mappában még nincs lista.',
      yourLists: 'Listáid',
      words: '{n} szó',
      state_new: 'Nem kezdett', state_paused: 'Félbehagyott', state_done: 'Teljesített',
      roundShort: '{r}. kör', roundDone: 'kör vége',
      dragHint: 'Egérrel a listát egy mappa gombjára húzhatod. Érintőképernyőn a lista „Áthelyezés…” gombját használd.',
      memoryWarn: 'A böngésző nem engedi a mentést, az adatok csak a megnyitott oldalon maradnak meg.',

      /* lista */
      start: 'Indítás', resume: 'Folytatás', restart: 'Újrakezdés', again: 'Újra', edit: 'Szerkesztés',
      move: 'Áthelyezés…', pdf: 'PDF / nyomtatás', saveFile: 'Mentés fájlba',
      moveTo: 'Hova kerüljön a lista?', noFolder: 'Mappán kívül', moved: 'Áthelyezve',
      pairsTitle: 'Szópárok',
      needMore: 'Még {n} szópár kell az induláshoz (minimum {min}).',
      cantStart: 'Ebben az irányban nem indítható: ezekhez nem állítható össze négy különböző hibás válasz: {words}',
      restartQ: 'Újrakezded? Ennek az iránynak a félbehagyott játéka elvész.',
      delQ: 'Biztosan törlöd a(z) „{name}” listát?',

      /* szerkesztő */
      newListTitle: 'Új lista', editList: 'Lista szerkesztése',
      listName: 'Lista neve', listNamePh: 'pl. Unit 3 – School', pairsLabel: 'Szópárok',
      col1: '1. oszlop', col2: '2. oszlop', swapCols: 'A két oszlop szavainak cseréje',
      pairsHint: 'Soronként egy szópár: {a} - {b} (kötőjel szóközökkel), = vagy tabulátor.',
      loadVocab: 'Szókincs betöltése', vocabOrder: 'Szókincs sorrendje',
      addTitle: 'Új szópár', addBtn: 'Hozzáad', addHint: 'Enterrel lépsz a következő mezőre, a második mezőben az Enter hozzáadja a párt. A lista mindkét irányban kikérdezhető.',
      ignoreShort: 'Kihagyás', saveList: 'Lista mentése', showMe: 'Megmutatom',
      saveBlockedLines: 'Mentés előtt: {n} sorból hiányzik a pár.', saveBlockedDups: 'Mentés előtt: {n} szó többször szerepel (összevonás vagy módosítás kell).',
      minOk: '{n} szópár ✓',
      placeholder: 'take - fogni, venni, vinni\nlook up - utánanéz\ncareful - óvatos\njourney - utazás',
      pairCount: '{n} szópár',
      minPairs: 'Minimum {min} szópár',
      spellLoading: 'Helyesírás betöltése…',
      spellNone: 'Ehhez a nyelvhez még nincs helyesírás-ellenőrzés.',
      spellFailed: 'A helyesírási szólista nem tölthető be.',
      spellOk: 'Nincs gyanús szó', spellReady: 'Helyesírás-ellenőrzés bekapcsolva',
      suspectN: '{n} gyanús szó', suspectPos: '{i} / {n} gyanús szó',
      firstErr: 'Ugrás a hibára', nextErr: 'Következő hiba',
      spellHint: 'A pirossal aláhúzott szóra koppintva, vagy az „Ugrás a hibára” gombbal javíthatsz.',
      noSuggest: 'Nincs javaslat',
      ignoreWord: 'Kihagyás (csak ebben a listában)', addDict: 'Felvétel a saját szótárba',
      ignored: '„{w}” ebben a listában elfogadva', dictAdded: '„{w}” bekerült a saját szótárba',
      dictInfoTitle: 'Felvetted az első szót a saját szótáradba',
      dictInfoText: 'A saját szótár szavait a program minden listában helyesnek fogadja el. A szavakat itt találod: {path}. Ott azt is látod, melyik listában szerepelnek, és törölheted őket.', dictPath: 'Beállítások → Saját szótár',
      lineErrTitle: '{n} sorból hiányzik a szópár elválasztója',
      errLine: '{n}. sor: {why}',
      err_nosep: 'hiányzik a szópár elválasztója (pl. take - fogni)',
      err_emptyA: 'hiányzik az első oszlop', err_emptyB: 'hiányzik a második oszlop',
      dupTitle: 'Ez a szó többször szerepel',
      dupRows: '{w}: {lines}. sor', merge: 'Összevonás', fix: 'Módosítás',
      mergeAll: 'Mind a(z) {n} összevonása', mergedAll: 'Az ismétlődő szavak összevonva', dupMore: '…és még {n} ismétlődő szó.',
      dupNote: 'Az összevonás a jelentéseket egy sorba írja. A módosításnál te javítod a szöveget. Amíg ez nem történik meg, nem lehet menteni.',
      dirWarnTitle: 'Fordított oszlopok?',
      dirWarnText: 'Úgy tűnik, az 1. oszlopban {a}, a 2.-ban {b} szavak vannak, fordítva, mint a beállítás.',
      swapWords: 'Szavak cseréje', noNeed: 'Nem kell', swapped: 'Az oszlopok felcserélve',
      importedN: '{n} szópár betöltve', undo: 'Visszavonás', undone: 'Visszavonva',
      needName: 'Adj nevet a listának.', noPairs: 'Írj be legalább egy szópárt.',
      fixFirst: 'Mentés előtt javítsd a jelzett sorokat.',
      warnEditTitle: 'Félbehagyott játék',
      warnEditText: 'Ennek a listának van félbehagyott játéka. A módosítás mentése után a játék elvész.',
      warnEditBtn: 'Mentés, játék törlése',
      saved: 'Mentve',
      discardTitle: 'Elveted a módosításokat?', discardText: 'A mentés nélküli változtatások elvesznek.',
      discard: 'Elvetés', keepEditing: 'Szerkesztés folytatása',

      /* betöltés */
      importDone: 'Betöltés kész', loadIt: 'Betöltés',
      stPairs: 'szópár', stBlocks: 'oszloppárból', stSuspect: 'gyanús szó', stProblem: 'hiányos sor',
      skippedCols: '{n} különálló oszlop kimaradt (nem volt mellette pár).',
      revTitle: 'Fordítottnak tűnik', revText: 'A beállítás szerint az 1. oszlop {a}, a 2. {b}. Ezeknél fordítva van, ezért megfordítom őket:',
      flipBlock: '{label} oszlop ({n} pár)', flipAll: 'A teljes lista',
      sheetHint: 'Betöltés után a szópárokat a szerkesztőben ellenőrizheted és javíthatod.',
      importOk: 'Betöltve: {n} lista', importNone: 'Nem került be új lista (már megvolt).',
      importNothing: 'A fájlban nem találtam szópárokat.',
      importErr: 'A fájl nem olvasható: {why}',
      imp_empty: 'üres fájl', imp_json: 'hibás JSON', imp_format: 'ismeretlen formátum',
      imp_rows: 'hiányos szópárok a következő sorokban: {rows}', imp_version: 'újabb programverzió fájlja',
      imp_oldword: 'régi Word-formátum (.doc). Mentsd el .docx-ként.',
      imp_oldexcel: 'régi Excel-formátum (.xls). Mentsd el .xlsx-ként.',
      imp_type: 'nem támogatott fájltípus (Word, Excel, TXT vagy mentett lista)', imp_read: 'sérült vagy nem olvasható fájl',
      photoTitle: 'Fényképről betöltés – hamarosan',
      photoText: 'Ez a funkció a következő lépésben készül el. Addig a telefon beépített szövegfelismerésével (iPhone: Élő szöveg, Android: Google Lens) kimásolhatod a szöveget, és beillesztheted a szerkesztőbe.',

      /* játék */
      prompt: 'Mi ez {lang}?', options: 'Válaszlehetőségek',
      round: '{r}. kör', exitSaved: 'Kilépés (a játék elmentődik)', next: 'Tovább',
      right: 'Helyes', wrong: 'Hibás', speak: 'Kiejtés meghallgatása',
      roundEnd: '{r}. kör vége', correctN: 'helyes', wrongN: 'hibás',
      againList: 'Ezeket kérdezzük újra',
      nextRound: 'Következő kör · {n} szó',
      doneTitle: 'Kész!', doneText: '{r} kör alatt elérted a 100%-ot.', doneFirst: 'Az első kör eredménye: {p}%.',
      backToList: 'Vissza a listához', backHome: 'Kezdőképernyő',

      /* súgó */
      howTitle: 'Hogyan működik a játék?',
      how: [
        'Megjelenik egy szó, és öt válasz közül kell kiválasztanod a helyes jelentését.',
        'Jó válasznál pipa jelenik meg, és a program magától továbblép. Ha nem akarsz várni, koppints bárhová, vagy a nagy nyílra.',
        'Rossz válasznál ✗ jelenik meg, és a helyes válasz kártyája átfordul, zöld oldalával felfelé. A „Tovább” gombbal lépsz tovább.',
        'Csak az első választásod számít. A rosszul megválaszolt szavak új körbe kerülnek, amíg egy kör 100%-os nem lesz.',
        'Kilépéskor a játék elmentődik, és később ugyanonnan folytathatod.'
      ],
      dirsTitle: 'Két irány',
      dirsHelp: [
        'Minden lista két irányban kérdezhető ki (például Angol → Magyar és Magyar → Angol).',
        'A két irány külön mentődik: mindkettőnek saját félbehagyott vagy teljesített állapota van.',
        'Ha a lista szavait módosítod, mindkét irány elölről indul.'
      ],
      loadTitle: 'Lista betöltése',
      loadHelp: [
        'Beírás: soronként egy szópár, például „take - fogni, venni, vinni”. Elválasztó: kötőjel szóközökkel, egyenlőségjel vagy tabulátor.',
        'Fájl: Word (.docx), Excel (.xlsx) vagy szöveges (.txt) fájl. Excelben az egymás melletti oszloppárokat is felismeri.',
        'Ha egy oszloppár fordítottnak tűnik, a program szól, és felajánlja a megfordítást.',
        'Mentett lista vagy teljes adatmentés (.json) is betölthető.'
      ],
      spellTitle: 'Helyesírás-ellenőrzés',
      spellHelp: [
        'Az angol szavak helyesírását a program beíráskor, betöltéskor és utólagos javításkor is ellenőrzi.',
        'A gyanús szó pirosan alá van húzva. Koppints rá, vagy használd az „Ugrás a hibára” gombot, és válassz a javaslatok közül.',
        'Kihagyás: csak abban a listában fogadja el a szót. Felvétel a saját szótárba: minden listában elfogadja.',
        'A saját szótár a Beállításokban található.'
      ],
      speakTitle: 'Kiejtés',
      speakHelp: [
        'A hangszóró gombbal meghallgathatod a nem magyar szavakat. A program magától nem szól.',
        'A hang a készülék beépített felolvasója, ezért a minősége eszközönként eltér.',
        'A Beállításokban brit vagy amerikai kiejtés választható.'
      ],
      installTitle: 'Telepítés a kezdőképernyőre',
      installWhy: 'Nem kötelező: a program böngészőből is teljesen használható. Telepítve saját ikonja van, teljes képernyőn nyílik meg, internet nélkül is működik, és iPhone-on védettebbek az adataid.',
      installIosTitle: 'iPhone, iPad (Safari)',
      installIos: [
        'Nyisd meg az oldalt a Safariban.',
        'Koppints a Megosztás gombra (négyzet felfelé mutató nyíllal).',
        'Válaszd a „Hozzáadás a Főképernyőhöz” lehetőséget.',
        'Ezután a Főképernyőn lévő ikonról indítsd.'
      ],
      installAndroidTitle: 'Android (Chrome)',
      installAndroid: [
        'Nyisd meg az oldalt a Chrome böngészőben.',
        'Koppints a menüre (három pont), és válaszd a „Telepítés” vagy „Hozzáadás a kezdőképernyőhöz” lehetőséget.'
      ],
      installPcTitle: 'Windows (Chrome vagy Edge)',
      installPc: [
        'A címsor végén lévő telepítés ikonnal, vagy a menü „Telepítés” pontjával.'
      ],
      backupTitle: 'Adataid mentése',
      backupNote: 'A listák ezen az eszközön, a böngészőben tárolódnak. Mentsd időnként fájlba (Beállítások → Összes adat mentése), így nem vesznek el, ha törlődik a böngésző adata.',

      /* beállítások */
      language: 'Felület nyelve', appearance: 'Megjelenés',
      themeSystem: 'Rendszer szerint', themeLight: 'Világos', themeDark: 'Sötét',
      fontSize: 'Betűméret',
      accentGB: 'Brit', accentUS: 'Amerikai', speakTest: 'Próba',
      speakNote: 'Ha a választott kiejtéshez nincs hang a készüléken, a program a készülék angol hangját használja.',
      speakUnsupported: 'Ez a böngésző nem támogatja a felolvasást.',
      gameSettings: 'Játék', autoNext: 'Jó válasz után továbblépés',
      dirOrderTitle: 'Melyik irány legyen felül', dirFromHu: 'Magyarról idegen nyelvre', dirToHu: 'Idegen nyelvről magyarra',
      dirOrderNote: 'A listáknál ez az irány áll felül, kiemelt gombbal. Mindkét irány mindig elérhető. Magyar oszlop nélküli listánál az oszlopok sorrendje dönt.',
      tapHint: 'Továbblépés: koppints a nyílra vagy bárhová. Magától is továbblép {s} mp múlva, ez a Beállításokban módosítható.',
      dictTitle: 'Saját szótár', dictCount: '{n} szó', dictOpen: 'Megnyitás',
      dictIntro: 'Ezeket a szavakat a helyesírás-ellenőrzés minden listában helyesnek fogadja el.',
      dictEmpty: 'Még nincs szó a saját szótáradban. A szerkesztőben egy gyanús szónál a „Felvétel a saját szótárba” gombbal adhatsz hozzá.',
      dictNowhere: 'jelenleg egyik listában sem szerepel', dictRemove: '„{w}” törlése a saját szótárból',
      dataTitle: 'Adatok',
      exportAll: 'Összes adat mentése fájlba', importAll: 'Adatok betöltése fájlból',
      resetAll: 'Összes adat törlése', resetQ: 'Biztosan törlöd az összes listát, játékot és a saját szótárt? Ezt nem lehet visszavonni.',
      version: 'verzió'
    },

    en: {
      lang_en: 'English', lang_hu: 'Hungarian', lang_de: 'German', lang_it: 'Italian', lang_es: 'Spanish',
      langAdv_en: 'in English', langAdv_hu: 'in Hungarian', langAdv_de: 'in German', langAdv_it: 'in Italian', langAdv_es: 'in Spanish',

      back: 'Back', close: 'Close', ok: 'OK', cancel: 'Cancel', save: 'Save', del: 'Delete', sec: 's',
      helpTitle: 'Help', settingsTitle: 'Settings',

      emptyTitle: 'No lists yet',
      emptyText: 'Type in the words, load a file, or take a photo of the word list.',
      typeIn: 'Type in', typeInSub: 'Type or paste word pairs',
      fromFile: 'From a file', fromFileSub: 'Word, Excel or text file',
      fromPhoto: 'From a photo', fromPhotoSub: 'Camera or gallery image',
      file: 'File', photo: 'Photo', newList: 'New list',
      installLink: 'Install to the home screen',
      installNote: 'Optional, the app also works in the browser. Installed, it starts from its own icon in full screen, works offline, and on iPhone your lists are not lost.',
      folders: 'Folders', allLists: 'All', newFolder: 'New folder', folderName: 'Folder name', createFolder: 'Create folder',
      newFolderCreate: '+ Create a new folder', createAndMove: 'Create and move',
      renameFolder: 'Rename', deleteFolder: 'Delete folder',
      folderDeleteQ: 'Delete the folder “{name}”? Its lists are kept and moved out of the folder.',
      folderEmpty: 'There is no list in this folder yet.',
      yourLists: 'Your lists',
      words: '{n} words',
      state_new: 'Not started', state_paused: 'Unfinished', state_done: 'Completed',
      roundShort: 'Round {r}', roundDone: 'round over',
      dragHint: 'With a mouse you can drag a list onto a folder button. On a touch screen use the list’s “Move…” button.',
      memoryWarn: 'The browser does not allow saving. Data stays only while this page is open.',

      start: 'Start', resume: 'Resume', restart: 'Start over', again: 'Again', edit: 'Edit',
      move: 'Move…', pdf: 'PDF / print', saveFile: 'Save to file',
      moveTo: 'Where should the list go?', noFolder: 'Outside folders', moved: 'Moved',
      pairsTitle: 'Word pairs',
      needMore: '{n} more word pairs needed to start (minimum {min}).',
      cantStart: 'Cannot start in this direction: four different wrong answers cannot be built for: {words}',
      restartQ: 'Start over? The unfinished game of this direction will be lost.',
      delQ: 'Delete the list “{name}”?',

      newListTitle: 'New list', editList: 'Edit list',
      listName: 'List name', listNamePh: 'e.g. Unit 3 – School', pairsLabel: 'Word pairs',
      col1: 'Column 1', col2: 'Column 2', swapCols: 'Swap the words of the two columns',
      pairsHint: 'One pair per line: {a} - {b} (hyphen with spaces), = or tab.',
      loadVocab: 'Load vocabulary', vocabOrder: 'Column order',
      addTitle: 'New word pair', addBtn: 'Add', addHint: 'Enter moves to the next field; in the second field Enter adds the pair. The list can be practised in both directions.',
      ignoreShort: 'Ignore', saveList: 'Save list', showMe: 'Show me',
      saveBlockedLines: 'Before saving: {n} lines miss their pair.', saveBlockedDups: 'Before saving: {n} words appear more than once (merge or edit).',
      minOk: '{n} pairs ✓',
      placeholder: 'take - fogni, venni, vinni\nlook up - utánanéz\ncareful - óvatos\njourney - utazás',
      pairCount: '{n} pairs',
      minPairs: 'Minimum {min} word pairs',
      spellLoading: 'Loading spell check…',
      spellNone: 'No spell check for this language yet.',
      spellFailed: 'The spelling word list could not be loaded.',
      spellOk: 'No suspicious words', spellReady: 'Spell check is on',
      suspectN: '{n} suspicious words', suspectPos: '{i} / {n} suspicious words',
      firstErr: 'Go to the error', nextErr: 'Next error',
      spellHint: 'Tap a word underlined in red, or use “Go to the error” to fix it.',
      noSuggest: 'No suggestion',
      ignoreWord: 'Ignore (this list only)', addDict: 'Add to my dictionary',
      ignored: '“{w}” accepted in this list', dictAdded: '“{w}” added to your dictionary',
      dictInfoTitle: 'You added the first word to your dictionary',
      dictInfoText: 'Words in your dictionary are accepted in every list. You find them in {path}, where you can also see which lists contain them and delete them.', dictPath: 'Settings → My dictionary',
      lineErrTitle: '{n} lines miss the pair separator',
      errLine: 'Line {n}: {why}',
      err_nosep: 'the pair separator is missing (e.g. take - fogni)',
      err_emptyA: 'column 1 is missing', err_emptyB: 'column 2 is missing',
      dupTitle: 'This word appears more than once',
      dupRows: '{w}: lines {lines}', merge: 'Merge', fix: 'Edit',
      mergeAll: 'Merge all {n}', mergedAll: 'Repeated words merged', dupMore: '…and {n} more repeated words.',
      dupNote: 'Merging puts the meanings on one line. With Edit you fix the text yourself. Saving is possible only after this.',
      dirWarnTitle: 'Columns reversed?',
      dirWarnText: 'Column 1 seems to contain {a} words and column 2 {b} words, the opposite of the setting.',
      swapWords: 'Swap words', noNeed: 'Leave it', swapped: 'Columns swapped',
      importedN: '{n} word pairs loaded', undo: 'Undo', undone: 'Undone',
      needName: 'Give the list a name.', noPairs: 'Enter at least one word pair.',
      fixFirst: 'Fix the marked lines before saving.',
      warnEditTitle: 'Unfinished game',
      warnEditText: 'This list has an unfinished game. After saving the changes the game is lost.',
      warnEditBtn: 'Save, delete game',
      saved: 'Saved',
      discardTitle: 'Discard your changes?', discardText: 'Unsaved changes will be lost.',
      discard: 'Discard', keepEditing: 'Keep editing',

      importDone: 'Loaded', loadIt: 'Load',
      stPairs: 'word pairs', stBlocks: 'column pairs', stSuspect: 'suspicious words', stProblem: 'incomplete rows',
      skippedCols: '{n} single columns were skipped (no pair next to them).',
      revTitle: 'Looks reversed', revText: 'According to the setting column 1 is {a} and column 2 is {b}. These are the other way round, so I will flip them:',
      flipBlock: 'Columns {label} ({n} pairs)', flipAll: 'The whole list',
      sheetHint: 'After loading you can check and fix the pairs in the editor.',
      importOk: 'Loaded: {n} lists', importNone: 'No new list was added (already present).',
      importNothing: 'No word pairs were found in the file.',
      importErr: 'The file cannot be read: {why}',
      imp_empty: 'empty file', imp_json: 'invalid JSON', imp_format: 'unknown format',
      imp_rows: 'incomplete word pairs in rows: {rows}', imp_version: 'file from a newer version',
      imp_oldword: 'old Word format (.doc). Save it as .docx.',
      imp_oldexcel: 'old Excel format (.xls). Save it as .xlsx.',
      imp_type: 'unsupported file type (Word, Excel, TXT or a saved list)', imp_read: 'damaged or unreadable file',
      photoTitle: 'Loading from a photo – coming soon',
      photoText: 'This feature comes in the next step. Until then you can copy the text with your phone’s built-in text recognition (iPhone: Live Text, Android: Google Lens) and paste it into the editor.',

      prompt: 'What is it {lang}?', options: 'Answer options',
      round: 'Round {r}', exitSaved: 'Exit (the game is saved)', next: 'Next',
      right: 'Correct', wrong: 'Wrong', speak: 'Listen to the pronunciation',
      roundEnd: 'End of round {r}', correctN: 'correct', wrongN: 'wrong',
      againList: 'We will ask these again',
      nextRound: 'Next round · {n} words',
      doneTitle: 'Done!', doneText: 'You reached 100% in {r} rounds.', doneFirst: 'First round result: {p}%.',
      backToList: 'Back to the list', backHome: 'Home screen',

      howTitle: 'How does the game work?',
      how: [
        'A word appears. Pick its meaning out of five answers.',
        'A correct answer shows a tick and the app moves on by itself. Tap anywhere or the big arrow if you do not want to wait.',
        'A wrong answer shows ✗ and the correct answer’s card flips over to its green side. Tap “Next” to go on.',
        'Only your first choice counts. Wrong words go into a new round until a round is 100%.',
        'When you exit, the game is saved and you can resume it later.'
      ],
      dirsTitle: 'Two directions',
      dirsHelp: [
        'Every list can be practised in two directions (e.g. English → Hungarian and Hungarian → English).',
        'The two directions are saved separately, each with its own unfinished or completed state.',
        'If you change the words of the list, both directions start again.'
      ],
      loadTitle: 'Loading a list',
      loadHelp: [
        'Typing: one pair per line, e.g. “take - fogni, venni, vinni”. Separator: hyphen with spaces, equals sign or tab.',
        'File: Word (.docx), Excel (.xlsx) or text (.txt). In Excel, column pairs side by side are recognised too.',
        'If a column pair looks reversed, the app tells you and offers to flip it.',
        'A saved list or a full backup (.json) can be loaded too.'
      ],
      spellTitle: 'Spell check',
      spellHelp: [
        'English spelling is checked when typing, loading and editing later.',
        'Suspicious words are underlined in red. Tap one or use “Go to the error”, then pick a suggestion.',
        'Ignore: accepted in that list only. Add to my dictionary: accepted in every list.',
        'Your dictionary is in Settings.'
      ],
      speakTitle: 'Pronunciation',
      speakHelp: [
        'Use the speaker button to hear non-Hungarian words. The app never speaks by itself.',
        'The voice is the device’s built-in reader, so its quality differs between devices.',
        'British or American pronunciation can be chosen in Settings.'
      ],
      installTitle: 'Install to the home screen',
      installWhy: 'Optional: the app works fully in the browser. Installed, it has its own icon, opens in full screen, works offline, and your data is safer on iPhone.',
      installIosTitle: 'iPhone, iPad (Safari)',
      installIos: [
        'Open the page in Safari.',
        'Tap the Share button (square with an up arrow).',
        'Choose “Add to Home Screen”.',
        'Then start it from the Home Screen icon.'
      ],
      installAndroidTitle: 'Android (Chrome)',
      installAndroid: [
        'Open the page in Chrome.',
        'Tap the menu (three dots) and choose “Install app” or “Add to Home screen”.'
      ],
      installPcTitle: 'Windows (Chrome or Edge)',
      installPc: [
        'Use the install icon at the end of the address bar or “Install” in the menu.'
      ],
      backupTitle: 'Saving your data',
      backupNote: 'Lists are stored on this device, in the browser. Save them to a file now and then (Settings → Save all data) so they are not lost if browser data is cleared.',

      language: 'Interface language', appearance: 'Appearance',
      themeSystem: 'System', themeLight: 'Light', themeDark: 'Dark',
      fontSize: 'Text size',
      accentGB: 'British', accentUS: 'American', speakTest: 'Test',
      speakNote: 'If the device has no voice for the chosen accent, its English voice is used.',
      speakUnsupported: 'This browser does not support reading aloud.',
      gameSettings: 'Game', autoNext: 'Move on after a correct answer',
      dirOrderTitle: 'Which direction comes first', dirFromHu: 'From Hungarian', dirToHu: 'Into Hungarian',
      dirOrderNote: 'This direction is shown first on every list, highlighted. Both directions are always available. Lists without a Hungarian column keep the column order.',
      tapHint: 'To move on, tap the arrow or anywhere. It also moves on by itself after {s} s; you can change this in Settings.',
      dictTitle: 'My dictionary', dictCount: '{n} words', dictOpen: 'Open',
      dictIntro: 'The spell check accepts these words in every list.',
      dictEmpty: 'Your dictionary is empty. In the editor, use “Add to my dictionary” on a suspicious word.',
      dictNowhere: 'not in any list at the moment', dictRemove: 'Remove “{w}” from my dictionary',
      dataTitle: 'Data',
      exportAll: 'Save all data to file', importAll: 'Load data from file',
      resetAll: 'Delete all data', resetQ: 'Delete all lists, games and your dictionary? This cannot be undone.',
      version: 'version'
    }
  };

  let lang = 'hu';
  function setLang(l) { lang = DICT[l] ? l : 'hu'; document.documentElement.lang = lang; }
  function getLang() { return lang; }
  function t(key, vars) {
    let s = (DICT[lang] && DICT[lang][key] != null) ? DICT[lang][key] : (DICT.hu[key] != null ? DICT.hu[key] : key);
    if (typeof s === 'string' && vars) {
      s = s.replace(/\{(\w+)\}/g, function (m, k) { return vars[k] != null ? vars[k] : m; });
    }
    return s;
  }
  window.I18N = { t: t, setLang: setLang, getLang: getLang, languages: Object.keys(DICT) };
})();
