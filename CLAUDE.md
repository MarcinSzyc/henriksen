# Henriksen – kontekst dla Claude Code

Aplikacja PWA do ćwiczenia matematyki dla dziecka (poziom ok. 4 klasy), docelowo także inne przedmioty.
Hosting: GitHub Pages (`main` / root) → https://marcinszyc.github.io/henriksen/

## Zasady projektu
- **Nowa sekcja / kafel = znaczek „nowe”:** dodaj `data-new="rrrr-mm-dd"` (dzień dodania) do kafla; `newBadges()` (z `showView`, także po rysowaniu
  kafli w JS) przez 7 dni dokleja ukośny pasek `.nowe` w prawym górnym rogu i oznacza kafel `.has-new`. Znaki wodne `.wm` są zawsze w lewym górnym rogu (prawy róg jest na znaczek); ramka wyniku `.mt-last` stoi nad tytułem, nie w rogu.
- **Każdy quiz ma swoją lekcję** w Angielski › Nauka (`LX`) – nowy quiz = nowa lekcja z zasadami, które sprawdza.
- **Bez builda i bez zależności.** Cała aplikacja to jeden plik `index.html` (HTML + CSS + JS inline).
- **Interfejs po polsku**, młodzieżowy ton, duże przyciski pod telefon (głównie iPhone).
- Tryb jasny/ciemny przez zmienne CSS na `:root`.
- Zaznaczanie tekstu i menu po przytrzymaniu są celowo wyłączone (poza polami `input`).
- Interfejs nie może „pływać”: rozmiar działania (`EQFS` w `fitEq()`) jest jeden na sesję,
  dopasowany do najdłuższego działania; liczony od nowa tylko po zmianie rozmiaru okna i po wczytaniu czcionek.
- Po zmianie ikon/manifestu podbij `VERSION` w `sw.js`.

## Architektura `index.html`
- **Widoki:** `#home` (kwadratowe kafle nauki: Matematyka, Polski, Angielski, Edukacja zdrowotna oraz Historia i Przyroda jako „Wkrótce”; pod cienką linią „Gry” (`#games-sep`, znika, gdy obie gry wyłączone) osobna siatka `#games`: Szachy i Łamigłówki; pod nimi linia „Ustawienia” nad paskami Statystyki, Nagrody, Ligi, Instrukcje – `applyMods()` zawsze przenosi kafle `[data-soon]` na koniec siatki – `[data-soon]`, tylko potrząśnięcie; pasek Statystyki), `#play` (gra), `#stats-v` (statystyki); `go(v)` + `history.pushState`
  (`#gra`, `#statystyki`), więc „wstecz” w telefonie wraca na start. Obok strzałki wstecz w nagłówku każdego ekranu jest logo
  aplikacji (`.home-btn`, wstawiane w JS do każdego `header [data-back]`) = `go("home")`; rozpoczęte gry zostają do dokończenia. Aplikacja zawsze startuje na `#home`.
  Wczytanie zapisanej sesji (`load()` → `render0()`/`finish(true)`) jest na samym końcu skryptu – `finish()` zapisuje
  do historii i używa stałych zdefiniowanych niżej (wcześniej powodowało to błąd TDZ przy starcie).
- **Polski** (widoki `#pl` → `#plws`/`#plw` Słówka, `#pld`/`#pldt` Dyktanda, `#plzs`/`#plz`/`#plzk` Znaczenie słów; hashe `#polski`, `#slowka`, `#slowka-gra`, `#dyktanda`, `#dyktando`, `#znaczenia`, `#znaczenia-gra`, `#slownik`;
  `showView` przełącza wszystko z `VIEWS`, `plLeave()` zapisuje przerwaną sesję, `plShow()` rysuje listy):
  - `WORDS`: `"g[ó]ra|podpowiedź|reguła|opis"` – opis = trudne słowo (pokazywane znaczenie, bez całego słowa). Para (ó/u, rz/ż, ch/h) z `plPair()`.
  - `DICTS`: `{id,len:"s"|"m"|"l",title,text}`, luki w tekście jako `[litery]`; długość i liczba słów liczone same.
  - Znaczenie słów: `MEAN_RAW` (3 poziomy, ~300 słów) `"słowo|p/r/c/s|znaczenie|przykład z [słowem]|synonim|przeciwieństwo"`.
    Pytania `pzQuestion()`: def (słowo → znaczenie), rev (znaczenie → słowo), syn, ant, gap (zdanie z luką; nie dla przysłówków).
    Złe odpowiedzi z tej samej części mowy, bez słów bliskich (`pzNear`: synonimy, wspólne przeciwieństwo, grupy `MEAN_NEAR` –
    tam dopisuj słowa, które mogą się mylić). Stan słów liczony z historii (`pzStats`): „znasz” = dobrze za 1. razem w 3 różne dni
    i ostatnio dobrze. Poziom 2/3 otwiera się po 30 słowach poprzedniego odpowiedzianych dobrze. Słowo dnia (`pzDaily`) na ekranie Polskiego.
  - Ustawienia w `localStorage` pod `henriksen-polski` (`PLP`: pairs, n, len, now = „Sprawdzaj od razu”).
  - Gra w Słówka (`PW`) i Dyktando (`PD`) używa tych samych `playFx`/`sfx`/`celebrate`/`showGoal` co matematyka:
    efekty rysują się na karcie z `FXC={card,eq,box}` (null = karta matematyki). Dyktando bez „od razu” sprawdza się na końcu, bez efektów na luce.
  - Sesje w historii z `subj:"pl"`, `cfg.mode` = `slowka`/`dyktando`, `recs[].t` = całe słowo. Matematyczne szczegóły rodzica, Top 10, `allHard`, `setLast` biorą tylko `subj` mat.
    Rekord słowa ma też `a` (brakująca litera) i `m` (słowo z „_” w miejscu luki).
  - Szczegóły rodzica z polskiego (`#par-pl`, `renderPlPar()`, filtr `PSF` słówka/dyktanda): wykres %, skuteczność ó/u · rz/ż · ch/h,
    Top 10 mylonych słów (znika po 3 dobrych z rzędu), tabela dyktand (razy, ostatnio, najlepiej) i historia sesji z rozwinięciem.
- **Angielski** (widoki `#en` = 3 kafle, `#ent` ustawienia To be, `#enset` ustawienia Słówek/Zdań (`ENM` = tryb), `#enq` wspólny quiz;
  hashe `#angielski`, `#to-be`, `#angielski-cwicz`, `#angielski-gra`). `enStart(make,cfg)` – `make()` zwraca pytania `{lab,q,c,opts,why,long?,three?}`,
  „Jeszcze raz” woła je od nowa. Sesje w historii z `subj:"en"`, `cfg.mode` = `tobe` / `slowka` / `zdania`.
  - **To be:** generowane z `EN_P` (osoby z polskim odpowiednikiem i rodzajem) i `EN_C` (kolory w 4 formach). `enTask(kind)`:
    `form` (ja jestem ↔ I am, She ___ red.), `ask` (Czy on jest czerwony? ↔ Is he red?, Who/What z `EN_WH`),
    `short` (Is she red? – Tak → Yes, she is.; pytanie z „you” → odpowiedź o sobie). Ustawienia `PLP.et` / `PLP.en`.
  - **Słówka:** `EN_TOPICS` (16 tematów, m.in. Piłka nożna; ok. 640 słów, w każdym temacie `a1` i `a2`:
    `"angielski=polski;…"`, część mowy z `p` tematu albo po `@`: n/v/a/o). Złe odpowiedzi z tej samej części mowy, najpierw z tego samego tematu.
    Wybór tematów w ustawieniach (`PLP.ev.topics`, pusta lista = wszystkie). **Zdania:** `EN_SENT`
    (`"angielski|polski|3 złe angielskie;…|3 złe polskie;…"` – typowe pomyłki). Ustawienia `PLP.ev` / `PLP.ez` (lvl a1/a2/all, dir pl/en/mix, n).
  - W statystykach zakładka Angielski bez szczegółów rodzica.
  - Ekran Angielski ma dwie części: **📘 Nauka** (kafel `#en-t-learn` → `#enl` lista lekcji, `#enlv` lekcja; hashe `#angielski-nauka`, `#angielski-lekcja`,
    moduł `en-nauka`) i **🎯 Quizy** (To be, Słówka, Zdania, Podstawy A1). Lekcje `LX` `{id,name,ic,tone,quiz,b}` – `b` = bloki HTML albo funkcja
    (Słówka: słowniczek z `ENW` w tematach, Zdania: pułapki + lista z `ENS`); pomocnicze `lxT` tabela, `lxE` przykłady EN/PL, `lxTip`, `lxBad` (❌/✅).
    „Sprawdź się – quiz” na końcu lekcji, a na ekranach quizów przycisk „📘 Lekcja” (`[data-lxgo]`). Przeczytane lekcje: `henriksen-lekcje` (✓ na kaflu).
  - **Podstawy A1** (kafel `#en-t-a1`, widok `#ena`, hash `#angielski-a1`, moduł `en-a1`, puchar `en-a1`): 10 tematów `A1_TOPICS` – skróty isn't/aren't/I'm,
    have/has/haven't, can/can't, do/does/don't, there is/are, a/an, liczba mnoga, my/your/his/her, this/that/these/those, słowa pytające.
    Temat = generatory `gen` zwracające `{lab,q,c,bad,why}` (`a1Q` tasuje), `a1Qs(id,12)` bez powtórek, „Wszystko na raz” = `mix`. Quiz `enStart`,
    sesja `cfg:{mode:"a1",topic}`, punkty: wybór formy 1, całe zdanie 2 (`ptsW`, `PTS_INFO`).
- **Szachy** (kafel `#t-sz`, widoki `#sz` (3 kafle), `#szl` lekcje, `#szz` ustawienia zadań, `#szo` przeciwnicy, `#szg` jedna szachownica `#szb`;
  hashe `#szachy…`; przedmiot `subj:"sz"`, moduły `sz-nauka` / `sz-zadania` / `sz-gra`). Pliki w `chess/`: `chess.js` (chess.js 1.4.0 ESM, BSD,
  wczytywany `szLoad()` przez `import()`), `puzzles.json` (480 zadań mat w 1/2/3 z bazy Lichess, CC0; skrypt `tools/lichess_puzzles.py`),
  licencje w `chess/LICENSES.md`; oba pliki w `SHELL`. Figury cburnett (CC BY-SA) jako `SZ_IMG` w kodzie. Stan planszy `SZ`
  (`kind`: star – lekcje „zbierz gwiazdki” liczone w `szStarMoves`, minimum ruchów `szStarPar`; rule – jeden ruch z celem
  check/mate/castle/promo/ep; puzzle – pierwszy ruch z bazy robi przeciwnik, każdy mat też zalicza; game). Lekcje `SZ_LESSONS`
  (kolejna po ukończeniu poprzedniej, gwiazdki z % plansz bez pomyłki). Zadania: ranking z historii `szRating()` (start 400, jak Elo,
  rekord ma `pr`), dobór blisko rankingu, nierozwiązane najpierw; punkty mat w 1/2/3 = 2/3/5. Przeciwnicy `SZ_OPP` (250–1000 ELO:
  `depth`, `rand` = szansa losowego ruchu, `noise` = szum oceny, `mate1`, `undo`/`hint`, `pts` za wygraną), następny po wygranej
  z poprzednim (`szOppOpen` z historii). Silnik `szBest`/`szSearch`/`szEval`: alfa-beta na wewnętrznych `_moves`/`_makeMove`/`_undoMove`
  chess.js (30× szybciej niż publiczne `move()`; przy aktualizacji chess.js sprawdź, czy te metody nadal są). Sesje `szArchive`
  (gra: `pct` 100/50/0, `recs[0].c` = w/d/l). Puchary `sz-nauka`/`sz-zadania`/`sz-gra`, zakładka Szachy w statystykach, ligi `LIG_CATS.sz`,
  cele rodzica (`szCurEx`, `szRun`). Partia z komputerem zapisuje się po każdym ruchu (`szSave` → `resPut` miejsce `sz` w `henriksen-wznow`:
  ruchy SAN, przeciwnik, kolor, 2D/3D, `as`, `cfg`); przycisk „⏸ Przerwij” (`pause`) i zwykłe wyjście zostawiają ją do dokończenia – kafel „Dokończ”
  na starcie (`renderResume`, `k:"sz"`) i na górze listy przeciwników (`szResBar`); `szResume` odtwarza partię bez liczenia do dziennego limitu;
  ✕ usuwa bez zapisu w historii; nowa partia pyta o zastąpienie; koniec partii (`szGameEnd`) kasuje zapis. Gość nie zapisuje. Lekcje i zadania bez zapisu.
  Limit partii z komputerem dziennie: `PREFS.szLimit` (0 = bez limitu, klucz rodzica w `PARENT_KEYS`), ustawiany w „Co widzi dziecko” (`#kc-szlim`, `KC.szLimit`);
  `szLeft()` = limit − rozpoczęte dziś (licznik `henriksen-szdzien` albo ukończone z historii, większe); `szGame` blokuje start, `#szo-lim` pokazuje stan.
  Moduł `sz-3d` ukrywa kafel Szachy 3D.
  Otwarcia (kafel `#sz-t-open`, widok `#szop`, hash `#szachy-otwarcia`, moduł `sz-otwarcia`): `SZ_OPEN` = 11 otwarć `{id,name,ico,side,moves (SAN),
  n (komentarz do każdego półruchu),who,why[],fun}` – złote zasady, włoska, hiszpańska, obrona przed matem szewskim, sycylijska, francuska, Caro-Kann,
  skandynawska, gambit hetmański, królewsko-indyjska, gambit królewski. `szOpening(k)` = karta „Skąd się wzięło? / Dlaczego to ma sens? / Ciekawostka”,
  „Zagraj otwarcie” → `szOpStart`; `SZ.kind="open"`: dziecko gra stronę `side`, komputer odpowiada ruchem z teorii (`szOpNext`), zły ruch = podpowiedź
  (pole figury, potem cały ruch) i cofnięcie (`szOpCheck`). Koniec `szOpEnd`: gwiazdki jak w lekcjach, zapis `cfg:{mode:"nauka",open:id}` (puchar Samouczka),
  gwiazdki z historii `szOpenStars`. Da się zapisać jako cel rodzica (`szCurEx`/`szRun` z `cfg.open`).
  Ciekawostki (kafel `#sz-t-facts`, widok `#szcf`, `#szachy-ciekawostki`, moduł `sz-ciekawostki`): `SZ_FACTS` = [emoji, tytuł, tekst]. Nowe fakty dopisuj
  sprawdzone (daty, nazwiska).
  Zasady szachów (rodzic: przycisk „Zasady szachów dla dziecka” na ekranie Szachy → `#szrules`, `#szachy-zasady`, `renderSzRules`, `SZR`;
  zapis `szLimit` + `szRules` do wiersza `settings` dziecka, oba w `PARENT_KEYS`). Przełączniki: limit (wyłączony = 0, ostatnia liczba w
  `szRules.limPrev`) i wyjątki (`daysOn`; `days` = daty `rrrr-mm-dd` → partie, −1 = bez limitu, zostają po wyłączeniu). `extra` / `gate` = pakiet z biblioteki rodzica
  (`szrPacks` z `LIB().pk`, kopiowany: `{pk:{id,name,ex:[{id,name,spec,pts}]}, name, g}`, `g` = wymagana ocena, wspólna dla obu): liczą się dzisiejsze
  pełne przejścia pakietu (`szPkState`: sesje z `cfg.goal` = "szx"/"szgate" i `cfg.gx` = id ćwiczenia, ocena ≥ g); extra = `extra.n` partii za przejście (suwak 1–10, domyślnie 1),
  najwyżej `extra.max` dodatkowych dziennie (suwak 0–20, 0 = bez ograniczenia; `szBonus()`, suwaki `szrRange`), gate = szachy otwarte po pierwszym. Dziecko widzi listę ćwiczeń z ✓ (`szRuleList`, `[data-szrun]` → `exRun`) na karcie blokady `[data-szgate]`
  i w karcie limitu. Starsze zapisy (`goal` = cel dziecka, `spec` = jedno ćwiczenie) nadal działają (`szRuleOk`, `szRuleDone`).
  `szLimitToday()`, `szLeft()`, `szGateOk()`; `szGame`/`szLesson`/`szPuzzles` i `szGuard` pilnują blokady.
  Plakietki nad piłkarzami: `PREFS.szBadges`, przycisk ♟ w `#sz3-view` (tylko skórka piłkarze), `S3.setBadges`.
  `szGuard()` (z `applyMods`, więc też po synchronizacji): gdy rodzic wyłączy szachy albo moduł, w którym dziecko jest (także w trakcie partii),
  wraca na start albo na ekran Szachy z komunikatem. Na ekranie Szachy / Szachy 3D `szGuard` rysuje go od nowa (`renderSz`), bo zasady rodzica (blokada, limit) mogą dojść już po jego otwarciu; Ciekawostki zostają otwarte mimo blokady. Telefon dziecka (aplikacja na ekranie) co 60 s pyta tylko o `settings.updated_at`;
  pełna synchronizacja tylko, gdy rodzic coś zmienił. `ligPublish` wysyła podsumowanie tylko, gdy się zmieniło (`LIGSENT`).
  Gra na czas: wybór „Tempo” na ekranie przeciwników (`#szo-tc`, `SZ_TCS`: bez czasu / 10 min / 5 min / 3+2, ostatni wybór w `henriksen-sztc`, `SZTC`),
  `cfg.tc` w sesji; zegar `SZ.ck={w,b,inc,t0}` (ms), `#szg-clock` (`szClockDraw`), czas zużyty i dodatek liczy `szCkMove` w `szGameAfter`, interwał 250 ms
  chodzi tylko na ekranie partii przy widocznej aplikacji (wyjście = zegar stoi; zapis i wznowienie partii niosą `ck`); poniżej 30 s czerwony, poniżej 10 s tyka.
  Flaga (`szFlag`): przegrana, a remis, gdy przeciwnik nie ma czym dać mata (`szCanMate`); `SZ.flag` zmienia teksty końca i `szWhy`.
  Osobny ranking na czas: `szElo(H,true)` liczy tylko sesje z `cfg.tc`, `szElo(H)` tylko bez – rangi i okno awansu tylko z głównego;
  na karcie rankingu „· na czas X”, w Statystykach › Szachy „Ranking na czas”.
  Ranking gry (Elo, `szElo(historia)`): z ukończonych partii z komputerem, start 400, K 40 przez 20 partii, potem 20, ELO bota z `SZ_OPP`;
  partia z cofnięciem albo podpowiedzią (`SZ.as` → `recs[0].as`) jest towarzyska i nie zmienia rankingu. Rangi `SZ_RANKS` (Pion <400,
  Skoczek, Goniec, Wieża, Hetman, Król ≥1200). Karta `[data-szelo]` na ekranach Szachy i Szachy 3D (`renderSzElo`: ranking, ranga, zmiana
  w 7 dni, ranking zadań; dotknięcie = Statystyki › Szachy), na kaflach przeciwników szansa i +/− rankingu, na końcu partii odliczanie
  zmiany i okno awansu `#szrank` (`szRankUp`), w Statystykach › Szachy `#sz-st` (`renderSzSt`: wykres rankingu, najwyżej, bilans W·R·P z botami).
  Wygląd 2D (`#szw`, `#szachy-wyglad`, pasek „Wygląd szachownicy” na ekranie Szachy, `renderSzw`): `PREFS.szBoard` = kolor z `SZ_COLORS`
  albo skórka z `SZ_SKINS` (lawa, boisko, kosmos, klocki, roboty: klasa `sk-<id>` na `.szb`, kolory pól w `--sz-lt`/`--sz-dk`, tekstury
  Klocków rysowane `szMcTex()`), `szLookApply(plansza)`. Figury: `PREFS.szPcs` = „auto” (skórka: `set` albo przekolorowane klasyczne `rc`
  przez `szRecolor`) lub zestaw z `SZ_SETS` (`chess/pieces/<zestaw>/<wK…>.svg`, z Lichess, licencje w `chess/LICENSES.md`); `szPcImg(pc)`.
  Przełączniki na ekranie Wygląd (`SZ_SW`, `#szw-sw`): `szTalk` dymki, `szVoice` głos, `szEmo` emoji u góry, `szFx` animacje zbicia (`SZ_CAP`),
  `szAnim` płynne ruchy (`szSlide`) – każdy działa osobno.
  Komentatorzy (`PREFS.szTalk`, `PREFS.szVoice`): `SZ_TALKERS` Zbyszek/Janusz/Grażyna/Kazek (awatary `chess/avatars`; wszyscy mają nagrania z ElevenLabs: jeden plik ze wszystkimi kwestiami po kolei, pocięty po znacznikach czasu słów z Whispera – `sz_voices.py` już nic nie nagrywa; po podmianie nagrań podbij `SZ_VOICE_V[kto]`, bo pliki mają te same nazwy), każdy ma własne kwestie
  w `SZ_LINES` (JSON między `/*LINES*/` i `/*END*/` – czyta go `tools/sz_voices.py`) i własny głos: nagrania `chess/voices/<kto>/<kategoria>-<nr>.m4a`
  z głosów Piper (CC0: bass, darkman, gosia), robione `bash tools/sz_voices.sh`; po zmianie kwestii uruchom skrypt ponownie. Brak nagrania = sam dymek.
  `szReact(ruch)` (mat > zbicie > promocja > szach > roszada; ruch dziecka: zbita figura się żali, ruch komputera: kategorie `capBy`/`checkBy`/
  `promoBy`/`castleBy` – dogryzanie i ostrzeżenia) → `szSay(kategoria)` → dymek `#szg-talk` + `szClip`: jeden element `<audio>`
  (`SZ_AUD`, odblokowany cichym WAV przy pierwszym dotknięciu – na iPhonie Web Audio milczało), zapasowo Web Audio; `navigator.audioSession.type="playback"`.
  `ac()` wznawia AudioContext z każdego stanu ≠ running (iOS: „interrupted” po powiadomieniu albo cudzym dźwięku); po powrocie do aplikacji `<audio>` odblokowuje się
  znów przy dotknięciu. `SZ_CLIPS[u]=false` tylko dla brakującego pliku (404 / kod błędu 4) – przerwane albo zablokowane odtwarzanie nie wycisza nagrania na resztę partii.
  Kibic nad planszą 2D (`#szg-bust`, `data-m` = mina): popiersie wybranego komentatora (`szBustSvg(kto)`, wygląd z `SZ_LOOK` jak awatary:
  Zbyszek, Janusz w binoklach, Grażyna, Kazek z brodą), SVG + animacje CSS `bz…` (części `bzo on-<mina>`), całe popiersie nad planszą (dół ucięty `clip-path`, ręce i para mogą wychodzić w górę).
  Miny: calm (głowa na ręce, oczy wodzą po planszy), bored (ziewa), hum (nuci, nutki), angry, cry, joy, shock, laugh, nod.
  `SZ_BUST[kategoria kwestii]` → mina (lista = losowo), `szSay` przekazuje kategorię i komentatora do `szFace(mina,kat,kto)`; po 3,2 s wraca calm,
  a po 9 s bez ruchu `szIdle` na zmianę nuci albo się nudzi. Kibic stoi po lewej, a dymek `#szg-talk` (klasa `bz-say`, `top` = `offsetTop` kibica) wychodzi od niego w prawo, więc nie zasłania `#szg-info`. Przełącznik `PREFS.szEmo` („Kibic u góry”). W 3D zostaje
  miniatura u góry ekranu gry (`#szg-face`, `szFace(mina)`): animowane emoji Noto (Google, CC BY 4.0, WebP z fonts.gstatic.com, `SZ_EMO`):
  zwykle 😎, komputer myśli 🤔🧐, `SZ_MOOD[kategoria]`: dziecko zbija 😭😢🥺😩, komputer zbija/wygrywa 🥳😜💃😂😆, szach od dziecka 😱😨😰, promocja 🤩😍; po 3 s wraca.
  W 2D zamiast emoji popiersie komentatora (`szBustSvg`, `#szg-bust[data-m]`, mina z `SZ_BUST[kategoria]`): calm, hum, bored (bezczynność), angry, cry, joy, laugh,
  shock, nod oraz palm (dłoń na twarzy), sweat (kropla potu), love (serca w oczach), dizzy (spirale i gwiazdki). `SZ_FLOCK`: przez 2,8 s po reakcji
  „myślę” i „spokój” komputera jej nie przerywają (wcześniej płacz po biciu znikał, gdy komputer zaczynał myśleć).
  Figury „Klocki” (`set:"mc"`, `szMcPiece`): płaskie głowy w stylu Minecrafta (`szCube`: twarz 8×8 z `MC_HEAD` na całe pole, kolory `MC_PAL`;
  białe: Steve, Alex, golem, wieśniak, koń, kurczak; czarne: szkielet Withera, Enderman, zombie, wiedźma, pająk, Creeper) z plakietką figury (`SZ_MCP`)
  w rogu; TNT przy zbiciu też płaskie.
  Skórka „Robaki” (`set:"bugs"`): w spoczynku statyczne emoji Noto `chess/bugs/<K…P>.svg` (król skorpion, hetman pszczoła, wieża ślimak,
  goniec pająk, skoczek konik polny, pion mrówka), w ruchu animowany WebP z fonts.gstatic.com (`SZ_BUG`, `szBugAnim`, tylko gdy wczytany –
  `SZ_BUG_OK`, `szBugPreload`); `szSlide` prowadzi robaka wolniej (ślimak ×1,5), z kołysaniem, głową w stronę ruchu (`SZ_BUG_FACE`), konik skacze;
  drużyny: obwódka `bug-w`/`bug-b` i plakietka `.szpb` z figurą; zbicie `SZ_CAP.robaki` (na plecy + chmurka). `SZ_FXEND` czeka na koniec marszu.
  Zestawy robaków opisuje `SZ_BUGS[set]` (`c` = kody emoji, `face` = "L" profil w lewo albo kąt głowy z góry, `slow`, `trail`).
  Skórka „Robale” (`set:"robale"`, `chess/robale/`): obrzydliwe – król szczur, hetman pająk, wieża dżdżownica, goniec komar,
  skoczek mucha, pion karaluch; zostawiają ślady (`szTrail`/`SZ_TRAIL`: łapki, brud, śluz, muszyce, krew, nitka pajęczyny), które
  znikają po ok. 4 s; zbicie `SZ_CAP.robale` = rozgniecenie + plama glutów.
  Figury „Kosmos” (`set:"space"`, `szSpacePiece`, SVG, kolory drużyn `SZ_SPC`): król = Słońce, hetman = planeta z pierścieniem, wieża = rakieta,
  goniec = kometa, skoczek = UFO, pion = gwiazdka; plakietka z białą figurą cburnett na jasnym/ciemnym kółku. Komentuje zawsze wybrany komentator (`PREFS.szWho`, dotknięcie awatara na ekranie Wygląd).
  Koniec partii: `szGameEnd(res)` najpierw czeka, aż ostatni ruch dojedzie (`SZ_FXEND`, min. 420 ms w 2D), potem ok. 1,6 s (wygrana 0,9 s, w 3D przewrócony król
  i 2,2 s) i dopiero pokazuje kartę; `szGameEnd(res,true)` = od razu (poddanie). Wyjaśnienie (`szWhy`): dlaczego przegrana (mat – kto szachuje, poddanie) albo remis (pat, powtórzenie, za mało figur, 50 ruchów)
  i największy błąd z partii (`szBlunder`: spadek oceny ≥ 200 po ruchu dziecka, odpowiedź przeciwnika – bicie albo mat – i lepszy ruch;
  liczony w tle po kawałkach ok. 12 ms – karta końca pokazuje się od razu, akapit `#sz-blunder` i przycisk „Pokaż błąd” `#sz-whyerr` dochodzą po analizie).
  Na górze karty duży napis PRZEGRANA / PAT / REMIS (`SZ.why.big`). Mała plansza „Ostatnie 2 ruchy” (`SZ.why.rp`, `szRpShow(k,anim)`,
  `szRpPlay` odtwarza sama, ◀ ▶ i suwak `#sz-rpr`; przy ruchu komentarz `szReact(ruch,plansza,dymek)`).
  Przyciski „Pokaż na planszy” / „Pokaż błąd” (`szReview`, krok po kroku `szReviewNext`, `SZ.rv` = prawdziwa partia, „Wróć do wyniku”).
  Zbicia w skórkach 2D (`SZ_CAP[id skórki]`, wołane z `szSlide`): klocki = atakujący jedzie jako TNT (`szTnt()`), miga, wybucha
  pikselami (`szBurst`, wstrząs `szShake`) i wraca do swojej postaci; lawa = popiół i iskry; boisko = wykop za planszę z piłką;
  kosmos = czarna dziura; roboty = zwarcie z iskrami. Cząstki w warstwie fixed (`szLayer`). `SZ_FXEND` + `szWait(ms)` opóźniają ruch
  komputera, odpowiedź w zadaniach i kolejną planszę lekcji, aż efekt się skończy.
  Płynne ruchy 2D: `szDraw()` pamięta ostatnią pozycję tej samej planszy (`SZ.pp`, klucz = `SZ.g`/`SZ.pos` + `flip`), a `szSlide()`
  przesuwa figury z pola na pole (Web Animations, skoczek podskakuje, zbita znika pod nadjeżdżającą; roszada, promocja, cofanie też).
- **Szachy 3D** (kafel `#sz-t-3d` na ekranie Szachy → widok `#sz3` z tymi samymi trzema trybami; `SZ3D` = wejście przez 3D, plansza ma `SZ.d3`):
  moduł ES `chess/3d/sz3d.js` (import map w `<head>`: `three` → `chess/3d/three.module.min.js` r170, `three/addons/` → wybrane dodatki,
  fizyka `chess/3d/cannon-es.js`), ładowany `sz3Ready()` przy pierwszej planszy 3D. Model `chess/3d/chess3d.glb` = „A Beautiful Game”
  (Khronos, CC BY 4.0) zmniejszony skryptem `tools/chess3d_model.sh` (gltf-transform: weld, simplify, resize 512, webp, meshopt).
  `szDraw()` przy `SZ.d3` woła `S3.sync(pozycja, {sel,tg,last,chk,hint,stars,flip})` – ruchy, zbicia (odłamki z fizyką, iskry, błysk, fala),
  promocje i gwiazdki wynikają z różnicy pozycji; dotyk przez `szTap(pole)`. Efekty: `S3.fireworks(1–3)`, `S3.topple(pole króla)` przy macie
  (lekcje, zadania, koniec partii – `szGameEnd` najpierw pokazuje efekt, potem ekran końcowy). Wydajność: bez poświaty (bloom), rozdzielczość ≤ 2×,
  zwykłe cienie PCF, rysowanie tylko gdy coś się dzieje (`dirty`; piłkarze w spoczynku 30 kl./s), fizyka tylko przy odłamkach.
  Kamera: OrbitControls (`chess/3d/addons/controls`, r170) – jeden palec obraca, dwa przybliżają i przesuwają; przyciski Skos / Z góry / ⟲
  (`#sz3-view` → `S3.view`). Dotyk: krótkie dotknięcie bez przesuwania; najpierw trafiona figura, wolne pole-cel ma pierwszeństwo.
  Skórki (`PREFS.szSkin`, wybór „Wygląd” na ekranie Szachy 3D, `S3.setSkin`): „classic” = marmurowy zestaw, „pilkarze” = boisko (`makePitch`,
  murawa w kratę, linie, bramki) i zawodnik `chess/3d/skins/footballer.glb` („Casual Character”, Quaternius, CC0, z Poly Pizza) klonowany
  `SkeletonUtils.clone`, stroje przez kolory materiałów (`KIT`: białe = niebiescy, czarne = czerwoni), wzrost `PL_SIZE` (pion najmniejszy),
  numer na plecach i piersi: król 9, hetman 10, wieża w stroju bramkarza (`KIT.gk`), nad głową każdego plakietka z figurą (`BADGE`, sprite
  bez testu głębi, obrazki figur z `SZ_IMG` przez `mount({img})`). Animacje z modelu (`play`): Idle, Run (ruch – `run`), Kick_Left/Right + HitRecieve (zbicie – `kickOut`:
  piłka, zbity wylatuje łukiem za boisko), Death (mat – `topple`) i Wave (cieszynka drużyny). Skórka „dino” (`makeDino`, `makeJungle`): modele Quaternius (CC0) `chess/3d/skins/dino/*.glb` z `tools/chess3d_dino.sh` –
  król T-Rex, hetman apatozaur, wieża triceratops, goniec parazaurolof, skoczek raptor, pion stegozaur (`DINO`, długość `DINO_L`);
  drużyny: odcień `DINO_TINT` + kółko pod nogami; zbicie `bite` (Attack → ofiara Death i `sinkAway`), wygrani skaczą (Jump).
  Skórka „roboty” (`makeRobot`, `makeArena`): transformersy według projektu z Claude Design (Gwardia Pulsara = białe, Legion Cienia = czarne;
  paleta `RB_PAL` z projektu: P/S lakier, A biel, C chrom, M mechanika, T opony, G szyby, E oczy, L reflektory, K kolce, X znak, O kontur/kółko),
  bryły z fazowanymi krawędziami (`rbBox`). Każda figura w `RB[typ]`: szkielet `RB_BASE` z poprawkami `o` (null = bez części), postać pojazdu
  `v` (wymiar, pozycja, obrót – części mogą zmieniać rozmiar) i dodatki `x`; nazwa z „L” = para lewa/prawa (lustro). Pojazdy: król ciężarówka
  z naczepą, hetman supersamochód, wieża czołg, goniec terenówka (karabin → bagażnik), skoczek myśliwiec (w ruchu robi beczkę), pion rajdówka.
  Legion dostaje kolce, rogi i wizjer V (`RB_EVIL`). `setForm(o,0…1)`: nogi ruszają pierwsze, głowa ostatnia, części lecą łukiem;
  część bez pozycji w danej postaci chowa się (skala 0). Ruch `drive` = przemiana w pojazd, jazda, przemiana z powrotem; zbicie `laser` + `breakApart`
  (części rozlatują się), mat = król się rozpada, reszta podskakuje (`hop`). Zbicia postaci idą przez
  `userData.cap(ofiara, atakujący)` (zwraca, ile ms czekać przed ruchem) i `userData.die`; plakietki `addBadge` w kolorach `TEAMC`.
  `S3.busy()` = ile ms trwa jeszcze animacja: `szDraw` przesuwa `SZ_FXEND`, więc komputer i ekran końcowy czekają, aż figura dojedzie.
- **Łamigłówki** (kafel `#t-lg`, widoki `#lg` (kafle: Block Out, Mosty „Wkrótce”), `#lgb` lista poziomów, `#lgg` gra; hashe `#lamiglowki`, `#block-out`,
  `#block-out-gra`; przedmiot `subj:"lg"`, moduł `lg-blockout`, puchar `lg-blockout`, ligi `LIG_CATS.lg`). **Block Out** (jak „Block Out! – Color Sort Puzzle”):
  kolorowe klocki (oczka, odblask; SVG `boSvg`) wyjeżdżają drzwiami swojego koloru na brzegu planszy. Silnik i solver `BO_CORE` (między `/*BO-CORE*/` i
  `/*BO-END*/`, kopia z `tools/blockout_core.js` – zmieniaj oba): `reach` (gdzie klocek dojedzie, także za róg), `exitAt` (kolor, szerokość drzwi,
  wolna droga do brzegu), `solve` (BFS po ruchach). Ruch = jedno przeciągnięcie (`pointer*` na `#bo-board`: klocek idzie za palcem kratka po kratce,
  za brzeg przy swoich drzwiach albo dotknięcie stojącego przy drzwiach = wyjazd, `boOver`). Strzałka `lk` = tylko poziomo/pionowo, lód `ice` = stoi,
  aż wyjedzie tyle innych. 40 poziomów `BO_LEVELS` w 4 światach (`BO_WORLDS`: zwykłe, zakręty, strzałki, lód) z `tools/blockout_levels.js`
  (poziom budowany od końca – klocki wjeżdżają drzwiami – więc zawsze da się przejść; par = BFS albo długość budowy). Gwiazdki: ≤ par 3, ≤ par+3 2,
  podpowiedź (`boHint`: klocek, który już wyjedzie → ruch, po którym ktoś wyjedzie → krótki BFS) najwyżej 2. Sesja `cfg:{mode:"blockout",lvl}`,
  `recs[0]` = `{st,mv,par,w}`, punkty `gwiazdki × (świat+1)`. Cofnij / Od nowa. Następny poziom po przejściu poprzedniego.
  **Mosty** (jak Bridge Constructor; widoki `#lgm` lista, `#lgs` gra; hashe `#mosty`, `#mosty-gra`; moduł `lg-mosty`, puchar `lg-mosty`):
  fizyka `BR_CORE` (między `/*BR-CORE*/` i `/*BR-END*/`, kopia `tools/bridge_core.js` – zmieniaj oba): węzły-przeguby i belki jako więzy XPBD
  (SUB 30 kroków × IT 4 iteracje na klatkę), siła belki z mnożnika λ, belka pęka po kilku krokach ponad `MAT[m].str`. Materiały `MAT`: droga
  (po niej jedzie auto), drewno, stal (dłuższa i mocniejsza), lina (tania, do 6 kratek, tylko ciągnie). Odblokowanie `BR_UNLOCK`: stal po Moście 7,
  lina po Moście 12 – potem na każdym moście z drewnem (`brMats`); pasek „Twoje materiały” na liście, „🎁 Nowy materiał” na karcie wygranej.
  Klasyczny most wiszący (łańcuch przegubów) jest w tej fizyce mechanizmem i się składa – poziomy z linami są podwieszane (liny prosto z pylonu). Pojazdy `CARS` (auto, ciężarówka, pociąg = lokomotywa + 2 wagony): każda część na dwóch kołach (`parts[].w` = przesunięcia), ciężar dzielony na wszystkie koła; rysunek `brCar` (część przechyla się z mostem, kręcące się koła, kierowcy, dym z komina `brPuffs`), koła szukają podpory (`support`:
  teren albo droga), ciężar idzie na węzły belki pod kołem; rusza po 1 s (most najpierw układa się pod własnym ciężarem); woda = `WATER`.
  15 poziomów `BR_LEVELS` (2 z pociągiem, 3 podwieszane z linami i pylonami – kotwy nad ziemią rysowane jako pylony) z `tools/bridge_levels.js` (każdy ma most wzorcowy sprawdzany fizyką, a „naiwny” musi się zawalić; budżet = wzorzec × 1,6,
  3★ ≤ koszt wzorca, 2★ ≤ × 1,25). Budowa: przeciągnij od kotwy/węzła, koniec przyciąga się do kratki w zasięgu materiału (`brTarget`), 🗑️ usuwa belkę,
  Cofnij, Zburz; projekt każdego poziomu zapisany w `henriksen-mosty`. Jazda: belki kolorowane obciążeniem (zielone → czerwone), pęknięte spadają.
  Wygrana: gwiazdki z kosztu, punkty `gwiazdki × (1 + nr/3)`, ciekawostka o mostach (`BR_FACTS`). Sesja `cfg:{mode:"mosty",lvl}`, `recs[0]={st,cost,w}`.
  **Trójki** (jak Threes!; widok `#lgt`, hash `#trojki`, moduł `lg-trojki`, puchar `lg-trojki`): plansza 4×4, 5×5 albo 6×6 (`TH_SIZES`, `#th-size`,
  ostatni wybór `henriksen-trojki-n`, `cfg.n`, rekord i progi gwiazdek `thStarsAt` osobno dla każdej wielkości). Kafle mają numery (`TH.id`) i zostają w DOM –
  `thRender(an)` tylko przesuwa je (CSS transition), łączony kafel najeżdża na drugi i znika (`die`). Przesunięcie palcem/strzałką
  (`thGo`): każdy kafel o jedno pole, 1+2=3, od 3 łączą się równe (`thCan`); nowy kafel wjeżdża z brzegu w jednym z ruszonych rzędów,
  talia po 4× 1/2/3 + czasem bonus (`thDraw`), podgląd „Następny”. Wynik jak w Threes (3^(log2(v/3)+1)), przy łączeniu dymek „6+6”, przy nowym
  największym kaflu podpowiedź „48 = 3 × 16”. Gra zapisuje się po każdym ruchu (`henriksen-trojki`) i wraca po wyjściu; koniec = brak ruchów
  (`thEnd`: gwiazdki z największego kafla 96/192, punkty = log2(max/3)+1, sesja `cfg:{mode:"trojki"}`, `recs[0]={sc,mx}`). Nowa gra liczy się do limitu. Pod planszą ranking `thRank`: 5 najlepszych wyników (wszystkie plansze) i 8 ostatnich partii.
  Id sesji łamigłówek to liczby (`Date.now()`) – baza ma `bigint`; starsze tekstowe „lg…” są zamieniane przy starcie.
  Poziomy Block Out i Mostów są otwarte do najdalej zaliczonego + 1.
  **Flow** (jak Flow Free; widoki `#lgf` lista, `#lgfg` gra; hashe `#flow`, `#flow-gra`; moduł `lg-flow`, puchar `lg-flow`): połącz kropki w tym samym
  kolorze rurkami, bez krzyżowania, całą planszę. 40 poziomów `FL_LEVELS` (5×5, 6×6, 7×7, 8×8) z `tools/flow_levels.js` – plansza losowo podzielona na ścieżki
  (≥ 3 pola, nie dotykają same siebie, kropki pary nie obok siebie), więc rozwiązanie istnieje; zapis „n|ścieżki” (pola jako znaki `FL_ABC`), kropki = końce.
  Rysowanie (`flStep`): od kropki albo końca rurki, cofanie skraca, wjechanie w cudzą rurkę ją przecina, szybki ruch palcem idzie po polach. Wygrana: wszystkie pary
  połączone i plansza pełna (`flCheck`). Gwiazdki: ruchy ≤ liczba par 3★, ≤ +3 2★; „Pomoc” pokazuje jedną rurkę z rozwiązania (najwyżej 2★). Kolory po angielsku
  (`FL_COL`: kolor, en, pl) – przy połączeniu pary dymek „RED – czerwony”, na końcu lista słówek. Sesja `cfg:{mode:"flow",lvl}`, punkty `gwiazdki × (świat+1)`.
  Zasady rodzica **osobno dla każdej gry** (`LGG`: bo = Block Out, br = Mosty, th = Trójki, fl = Flow; klucze `boLimit`/`boRules`, `brLimit`/`brRules`,
  `thLimit`/`thRules` w `PARENT_KEYS`, znaczniki `box`/`bogate` itd., `RSEC[g]` z `lgSecOf`): „limit gier” dziennie (jednostka `gier(n)`: gra/gry/gier – każdy rozpoczęty poziom albo partia to jedna gra),
  wyjątki na dni, „najpierw pakiet” i dodatkowe za pakiet. Licznik `henriksen-lgdzien` = `{d, n:{bo,br,th}}`, `lgPlayedToday(g)` (też z historii po `cfg.mode`),
  `lgCount(g)`, karta `lgLimCard(g)` (lista poziomów, w Trójkach `#th-lim`), blokady na ekranie `#lg` w `#lg-gates` (zablokowana gra znika z kafli),
  `lgGuard` sprawdza grę bieżącego ekranu. Edytor `#szrules` z zakładkami gier `#szr-games` (`SZR.sec` = bo/br/th/fl); przycisk rodzica „Zasady gry … dla dziecka” (`[data-lgr]`) na ekranie Łamigłówek i na liście każdej gry. Stare wspólne `lgLimit`/`lgRules` nic już nie robią.
  Dawny opis wspólnych zasad: `RSEC` (sz / lg: klucze `szLimit`/`szRules` i `lgLimit`/`lgRules`, znaczniki `szx`/`szgate` i `lgx`/`lggate`,
  teksty edytora), `rlR(s)`, `szLimitToday(s)`, `szBonus(s)`, `szLeft(s)`, `szGateOk(s)`; edytor `#szrules` z `SZR.sec` (przycisk „Zasady łamigłówek”
  na ekranie `#lg`). Limit liczy rozpoczęte poziomy (`lgPlayedToday`, licznik `henriksen-lgdzien`); `lgLimCard`, `lgGuard` (z `applyMods`).
- **Edukacja zdrowotna** (widok `#zd`, hash `#zdrowie`, przedmiot `subj:"zd"`): kafel „Sprawdzian 29.10” (`ZD_DATE`, wszystkie pytania
  w losowej kolejności, `cfg.mode:"spr"`) i 4 tematy z lekcji (`ZD_TOPICS`: wartosc, styl, cialo, zach – `cfg.mode` = id tematu).
  Pytanie `{q,c,bad,why}` albo prawda/fałsz `PF(q,ok,why)`; `why` = zdanie z notatki. Gra w quizie angielskim (`enStart`,
  `cfg.subj/title/unit` nadpisują angielskie domyślne). Punkty: prawda/fałsz 1, reszta 2; puchar w jednej kategorii `zd`;
  zakładka „Zdrowie” w statystykach (bez szczegółów rodzica); moduły `zd-spr` i `zd-<id tematu>` w „Co widzi dziecko”.
  Temat „Miejsce zdrowia w hierarchii” bez notatek – nowe pytania dopisuj do `ZD_TOPICS` (z notatek dziecka, nie z głowy).
- **Konto (Supabase, etap 1 – tylko logowanie, bez synchronizacji):** schemat i reguły w `supabase/schema.sql`
  (rodziny, profile parent/student, sesje, ustawienia; RLS: uczeń tylko swoje, rodzic czyta rodzinę i zmienia ustawienia dzieci;
  rodzina tylko przez funkcje `create_family` / `join_family`). W `index.html`: `SB_URL` i publishable key (publiczne),
  `supabase-js` ładowany z jsDelivr dopiero przy potrzebie (`sbLoad`, cache w `sw.js`). Okno `#acct` z menu ☰:
  rodzic e-mail + hasło → kod rodziny; telefon dziecka: kod + imię + hasło (wpisuje rodzic) → konto `imię.kod@dziecko.henriksen.app`,
  potem 4-cyfrowy PIN (`#pinlock`, skrót SHA-256 w `henriksen-pin`, raz na uruchomienie). Profil w `henriksen-me`, sesja w `henriksen-auth`.
- **Zatwierdzanie kont (`supabase/approval.sql`, bez maili):** nowa rodzina ma status `pending`, dopóki nie zaakceptuje jej admin
  (`app_admins`, `admin_requests` / `admin_decide`); dziecko dołączające kodem czeka na rodzica (`family_requests` / `decide_member`).
  Nieaktywne konto nie zapisuje wyników, ustawień, podsumowań ani lig (reguły z `is_active()`); w aplikacji `ME.active`/`ME.pend`,
  ramka „Czeka na akceptację” w Koncie rodziny i pasek „Prośby o zgodę” na górze startu (`#reqs`, `loadReqs`).
- **Administracja (`#admin`, `#administracja`, `supabase/admin.sql`):** kafel na dole startu tylko dla admina (`ME.admin`).
  `admin_stats()` (security definer, rzuca błąd dla nie-admina) zwraca liczby: użytkownicy, nowi w 7 dni, rodzice, dzieci
  (czekające), rodziny (czekające), aktywni i sesje w 7 dni, ligi, konta bez profilu, ostatnia sesja. `renderAdmin()` rysuje kafle
  `.adm-k` (przyciski); brak funkcji w bazie = komunikat „uruchom admin.sql”. SQL testowany lokalnie na Postgresie z atrapą `auth`.
  Karty dzieci „Co robią dzieci” (`renderAdmKids`, `admin_kids` w `supabase/admin3.sql`): sesje, szachy (partie, W·R·P, minuty w 7 dni)
  i łamigłówki (`admin_lg_mode`: dla blockout / mosty / flow / trojki – partie dziś / 7 dni / razem, minuty gry z end−start (max 60 min na sesję),
  najdalszy poziom, liczba 3★, rekord i największy kafel Trójek, 5 ostatnich partii). Po zmianie admin3.sql trzeba go uruchomić w Supabase ponownie.
  Kafel otwiera okno `#admd` z listą z `admin_details(p_kind)` (`supabase/admin2.sql`; users/families/parents/students/active/
  sessions/leagues/nofamily), wiersze rysuje `ADM_ROW[kind]`.
  Pod kaflami „Co robią dzieci” (`renderAdmKids`, `#adm-kids`, `supabase/admin3.sql`: `admin_kids()`): karta każdego dziecka – sesje dziś / w 7 dni, punkty w tygodniu,
  przedmioty w 7 dni, a w szachach partie z komputerem dziś / 7 dni / razem, pasek W·R·P, przeciwnicy (id z `SZ_OPP`), partie na czas, zadania i lekcje.
  Kafel „Goście w 7 dni” (`supabase/guests.sql`): `admin_guest_stats()` i lista `admin_guests()` (imię, urządzenie z UA, wejścia, sesje, dni).
- **Ruch gości (`guests.sql`, `guestPing(kind,subj)`):** gość wysyła zwykłym `fetch` do RPC `guest_ping` (anon): `open` przy starcie,
  `session` przy nowej ukończonej sesji w `saveHist` (sam przedmiot, `GSENT` bez powtórek), `name` przy zmianie imienia w `savePrefs`.
  Identyfikator urządzenia w `henriksen-dev` (poza `STATE_KEYS`). Z localhost / 127.0.0.1 nic nie wysyła. Tabele `guest_devices`
  i `guest_days` bez reguł RLS – zapis tylko przez funkcję, odczyt tylko admin.
- **Gość (bez konta rodziny, `isGuest()` = brak roli w `henriksen-me`):** może ćwiczyć, ale nic nie jest zapisywane.
  Na początku skryptu `Storage.prototype.setItem` pomija zapis kluczy `STATE_KEYS` (ustawienia, postęp, historia, polski) dla gościa,
  a przy starcie kasuje je na telefonie bez `henriksen-auth` i bez `henriksen-sync` (wygasłe logowanie zostawia sync, więc
  niewysłane wyniki czekają; wylogowanie najpierw wysyła i czyści sync). Statystyki, Puchary i Ligi: okno `#guest` z zaproszeniem
  do Konta rodziny (nasłuch kliknięć w fazie przechwytywania), podpisy kafli „Zaloguj się…”. Kopii gość nie wczyta.
  Imię gościa: przy starcie bez zapisanego imienia okno `#gname` (bez pomijania, min. 2 litery); imię w `henriksen-gimie` (`GNAMEK`, poza `STATE_KEYS`),
  `savePrefs` je aktualizuje i wysyła `guestPing("name")`, więc w Administracji › Goście widać imię zamiast „(bez imienia)”.
- **Synchronizacja (etap 2):** `localStorage` zostaje główną pamięcią. `saveHist()` zapisuje lokalnie (`saveHistLocal`) i budzi
  `syncSoon()` → `syncNow()`: wysyła sesje, których podpis `sesSig` zmienił się od ostatniej wysyłki, pobiera nowsze z bazy
  (po `updated_at`) i łączy po `id` (ukończona > przerwana > dłuższa); ustawienia `PREFS`/`PLP` – wygrywa nowszy zapis
  (`markSettings()` z `savePrefs`/`savePLP`). Stan w `henriksen-sync` per konto. Rodzic: wybór dziecka nad Statystykami (`#who`,
  `renderWho`) – sesje dziecka trafiają do `VIEW_HIST`, a `loadHist()` w widoku statystyk zwraca je zamiast własnych
  (`loadOwnHist()` = zawsze własna, używaj jej przy zapisie i kopii).
- **Punkty:** najłatwiejsze zadanie = 1 pkt, trudniejsze więcej (`wMath` dla matematyki, `ptsW(sesja, odpowiedź)` dla reszty);
  tylko za odpowiedź dobrą za 1. razem (po błędzie 0). Waga zapisuje się w odpowiedzi (`r.w`), sesja ma `pts` / `ptsMax`; starsze sesje
  liczą wagę z reguł (`recW`, `sesPts`). Tabela `PTS_INFO` to ekran Ustawienia › Punktacja zadań (`#ptsinfo`) – przy zmianie reguł
  popraw ją razem z `wMath`/`ptsW`. Zestaw losuje się już na ekranie ustawień (`pre()` / `take()` z `PRE`), żeby było widać
  „Za ten zestaw: do X pkt”, a „Start” dostaje ten sam zestaw. Punkty na bieżąco: trzecia pastylka w `#live` (`PREFS.pts`).
  Przy każdym zadaniu plakietka `.tpts` („4 pkt”, po błędzie przekreślona): `setTpts()` z `show()` w matematyce i z `plLiveNow()` w grach językowych.
- **Nagrody (`#cups`, `#puchary`, pasek „Nagrody” na starcie):** jeden ekran z zakładkami (`#nag-tabs`, `nagTab`, `NAGT`):
  Puchary, Animacje (`renderFxs("nag-fx-list")` – lista efektów z poziomami i przełącznikami) i Filmiki (`renderRewards`:
  `REWARDS` pogrupowane wg pierwszej puli `REW_GROUPS`, obejrzane z `PREFS.rewSeen` można puścić jeszcze raz, reszta „Jeszcze nieodkryty”).
  `playGoal` zapisuje obejrzaną nagrodę (`rewSeenAdd`) przy starcie odtwarzania; każda nagroda ma `name`.
  Miniatury: animacje = rysunki SVG `FX_ICON[id]`, filmiki = `rewThumb(r)` (lokalne `video/thumb/*.jpg` z Quick Look, w `SHELL`;
  GIF-y jako nieruchoma klatka z serwera: Giphy `200w_s.gif`, Tenor kod `AAAAe` zamiast `AAAPo`). Zablokowane = sama kłódka zamiast miniatury (filmik też bez nazwy – niespodzianka);
  nowy lokalny klip = dorób miniaturę (`qlmanage -t -s 360`, potem `sips` do JPG) i dopisz ją do `SHELL`. Rodzic oglądający
  dziecko widzi tylko Puchary. W menu ☰ zostały same przełączniki (gratulacje, filmik co 10, animacje, dźwięk, punktacja).
- **Puchary (zakładka Nagród):** brąz/srebro/złoto/diament (`CUP_LV`, progi ×1/×3/×8/×20) za punkty z odpowiedzi dobrych za 1. razem
  w kategoriach `CUP_CATS` (mnożenie, dzielenie, dodawanie, odejmowanie, słówka, dyktanda, znaczenie słów, To be, słówka ang., zdania;
  kategoria sesji z `cupCat()`). Liczone z historii (`cupCounts`). Próg brązu i nagrody ustawia rodzic: `PREFS.cups[kat]`,
  `PREFS.cupRewards[b/s/g/d]` (okno `#cupset`; „Dopasuj do wyników dziecka” = `cupAuto`: brąz = 4 × średnia dzienna z 14 dni); dla dziecka zapis idzie do jego wiersza `settings` w bazie, a przy konflikcie
  synchronizacji pola z `PARENT_KEYS` biorą wersję z bazy. `cupsCheck()` po zapisie sesji (po gratulacjach) i po synchronizacji
  pokazuje „Nowy puchar!” (`#cupnew`, kolejka `CUPQ`); `PREFS.cupSeen` = pokazane poziomy (pierwsze uruchomienie bez okienek).
  Pasek Puchary na starcie i w Statystykach (rodzic z wybranym dzieckiem widzi jego puchary: `VIEW_PREFS`).
- **Ligi (`#lig`, `#ligi`, SQL w `supabase/leagues.sql`):** dziecko zakłada ligę (`create_league`) albo dołącza kodem (`join_league`);
  liga i każde dołączenie dziecka czekają na zgodę jego rodzica (`decide_league`, prośby na górze ekranu Ligi i na pasku startu).
  Ranking (`league_ranking`) czyta tylko `public_stats` – podsumowanie (`histSummary`: punkty w tygodniu i od początku, seria,
  najwyższe puchary), które telefon wysyła na końcu `syncNow()` (`ligPublish`, osobny try, żeby brak tabel nie psuł synchronizacji).
  Sesji innych dzieci nikt nie widzi. Wypisanie: `leave_league` (dziecko albo jego rodzic). Ranking ma okres (tydzień / od początku),
  przedmiot (`LIG_CATS`, punkty z `public_stats.subj` – `supabase/leagues2.sql`), podium 1–3, paski i „Mistrzów przedmiotów”.
- **Instrukcje (`#help`, `#pomoc`):** wszystkie instrukcje w jednym miejscu, zwijane (konto rodzica, telefon dziecka, PIN, ekran początkowy,
  wyniki dziecka, puchary i progi, punkty, ligi); przycisk na starcie, a `openHelp(id)` otwiera konkretną (np. z ekranu Ligi).
- **Co widzi dziecko (`#kidcfg`, kafel rodzica na górze startu):** rodzic włącza i wyłącza moduły dziecka (`MODS`: każdy przedmiot
  ma własną sekcję; Historia `his` i Przyroda `nat` mają przełącznik, choć są „Wkrótce”; „Inne” (`always`, zawsze rozwinięte)
  to tylko paski z dołu startu: `stats`, `cups`, `lig`, `help`;
  dawne `mods.soon:false` wyłącza obie). Moduł dodany później ma w `MODS` znacznik `nw`: bez zapisu u dziecka jest wyłączony, gdy rodzic wyłączył wszystkie starsze moduły przedmiotu (`MOD_OLD` w `modOn`) – inaczej nowy kafel „otwierałby” wyłączony przedmiot; włączenie zapisuje `true`. Zapis w `PREFS.mods` dziecka (klucz w `PARENT_KEYS`),
  `applyMods()` ukrywa kafle; przedmiot znika, gdy wszystkie jego moduły są wyłączone. `subj._on` w podsumowaniu lig wyklucza
  dziecko z rankingu przedmiotu, którego nie ma.
- **Cele od rodzica (`#ptask`, `#zadania`, pasek rodzica „Cele dla dziecka”, zakładki `#pt-tabs` Cele / Pakiety / Ćwiczenia, `PTT`):**
  - Ćwiczenie: rodzic uruchamia dowolne ćwiczenie jak dziecko; w grze (widoki `GAME_V`: play, plw, pldt, plz, enq) pod nagłówkiem ma przycisk
    „Dodaj do zapisanych celów” (`.addgoal`, `curEx(widok)` czyta stan gry, `addGoalUpd()` z `showView`; już zapisane = „✓ Zapisane w celach”).
    „Poćwicz trudne” zapisuje się jako `{k:"hard"}` (punkty `null` = „zależą od błędów”, `ptsTxt`): u dziecka `exRun` woła `practice(allHard(),true,tag)`,
    a bez trudnych działań startuje pierwszy zestaw z `SETS`. Rodzic zwykle nie ma własnych trudnych działań, więc w zakładce
    Ćwiczenia jest gotowy przycisk „＋ Matematyka: Poćwicz trudne” (`data-addhard`), dopóki go nie zapisze. `practice` zdejmuje stare oznaczenia celu (`untag`). Bez przycisku: trudne słówka, słowo dnia. Spec: mat `{cfg,n}`, pw `{pairs,n}`, pd `{dict}`, pz `{lvl,n}`, en `{cfg,n}` (też zdrowie).
    Biblioteka w ustawieniach rodzica `PREFS.lib = {ex:[{id,name,spec,pts}], pk:[{id,name,ex:[id]}]}` (`LIB()`); zakładka Ćwiczenia: zmiana nazwy, usuwanie.
  - Pakiet: 1+ zapisanych ćwiczeń (`#pked`, `openPk`). Cel: kopia 1+ pakietów w `PREFS.tasks` dziecka (klucz w `PARENT_KEYS`, `ptSave` = upsert
    jego ustawień) `{id,packs:[{id,name,ex:[…]}],g?,reps?|days?,until?,reward,at,given?}` (`#tasked`, `openGoalEd`, `TE_COND`: ocena dla każdego
    ćwiczenia, ile razy albo codziennie – wykluczają się, termin). Stare zadania bez `packs` są odrzucane przy wczytaniu.
  - Postęp `taskProg`: liczą się tylko sesje z `cfg.goal = id celu` i `cfg.gx = "nr pakietu:id ćwiczenia"` (ukończone, ocena ≥ g, od `at` do `until`).
    Przejście = każde ćwiczenie celu; reps = min. liczba zaliczeń ćwiczeń, days = dni, w których zaliczone było całe przejście, z rzędu.
  - Dziecko: kafel z tarczą (`taskTile`, `dartSvg`) w `#ptasks` nad „Dokończ”; dotknięcie = lista ćwiczeń z ✓ (`#goalv`, `openGoal`),
    ćwiczenie startuje `exRun(x,{goal,gx})` ze świeżym losowaniem. `tasksCheck()` raz pokazuje „Cel zaliczony!” (`#tasknew`, `PREFS.taskSeen`).
- **Pytania Tak/Nie:** `askYes(tytuł,opis,tak,nie)` = okno `#yesno` (Promise) zamiast `confirm()`, które w części przeglądarek od razu zwraca „nie”;
  używane przy ✕ „Dokończ”, porzuceniu działań (`matDrop` jest async) i usuwaniu w Celach.
- **Dokończ sesję (`#resume` na górze startu, `renderResume`):** niedokończona sesja z dowolnego modułu = kafel „Dokończ: …” z ✕.
  Matematyka: zapis `KEY` (jak dotąd). Gry `PW`/`PD`/`PZ`/`EN`: migawka `gameSnap()` zapisywana w `plLiveNow()` (po każdej
  zmianie) do `henriksen-wznow` = `{[id konta]:{game,mat}}` – poza `STATE_KEYS`, więc przeżywa wylogowanie (przy „Wyloguj”
  matematyka też trafia do `mat`, `resumeRestoreMat()` oddaje ją po zalogowaniu). Gość nic nie zapisuje. Wyjście z gry
  (`plLeave`) już nie archiwizuje – robi to ✕ (`resArchive` → „przerwana”) albo start innej gry (`gameBegin()` na początku
  `pwStart/pdStart/pzStart/enStart`). `resumeGame(g)` odtwarza stan (słowa z `WORDS`/`MEAN_BY`, dyktando z `DICTS`, quiz z
  zapisanych pytań, „Jeszcze raz” z `enMakeFor(cfg)`). Dyktando bez „od razu” przy ✕ nie trafia do historii (jak wcześniej).
- **Historia:** `localStorage` pod `henriksen-historia`, tablica sesji
  `{id,subj,start,end,status:"done"|"przerwana",cfg,n,done,recs:[{t,ok,tries,h,ms}],pct,grade,errors,hints}`.
  `archive(status)` przy `finish()` i przy rozpoczęciu nowych działań w trakcie (przerwana). Bieżąca sesja trzyma `SID`, `T0`
  i `log[k]={tries,h,ms}` w zapisie postępu. Kopia: eksport/import JSON w menu (łączenie po `id`).
- **Statystyki dla dziecka (`renderKid`, na górze):** zakładki przedmiotu `SUBJ` (all/mat/pl/his; Polski i Historia = „wkrótce”),
  sesje mają `subj` (brak = `"mat"`). Seria (dni z ćwiczeniem), **punkty** dziś / wczoraj / w tygodniu (od poniedziałku, `sesPts` + bieżąca;
  pod liczbą też liczba zadań), słupki tygodnia w punktach, jedno zdanie motywacji w punktach (seria → rekord dnia → wczoraj),
  szóstki i najszybszy czas w tygodniu. Pasek Statystyki na starcie: „Dziś X pkt · w tygodniu Y pkt”.
  Reszta jest zwinięta pod „Szczegóły dla rodzica” (`#par`).
- **Statystyki (`renderStats`):** filtr `SF` po działaniu; `lineChart()` (SVG, jedna seria, jedna oś) dla % i czasu;
  rozkład ocen; `topHard()` – odsetek złych pierwszych odpowiedzi, dokładne działanie, min. 2 wystąpienia, znika po 3 dobrych
  z rzędu; `heatmap()` 1–10 (mnożenie i dzielenie z tabliczki, jeden odcień); „Poćwicz trudne” = Top 10 × 2 z `CFG.practice`.
- **Stan sesji:** `N` (liczba zadań), `tasks` (tablica `[a, op, b]`, op ∈ `+ − × :`),
  `i` (bieżące zadanie), `state[k]` (`"ok"` = dobrze za 1. razem, `"fix"` = był błąd), `errors` (liczba działań z błędem, nie prób; przeliczane z `state` przy wczytaniu), `hintsUsed` (pokazane kroki podpowiedzi, zapisywane jako `hints`).
- **Ekran Matematyka (`#mat`, `#matematyka`, `renderMat`):** kafle „Poćwicz trudne”, zestawy `SETS` (punkty i ostatni wynik)
  i „Ułóż własne” (otwiera `#ask` od razu na ustawieniach, `ASKOWN`); pasek „Dokończ działania”. Obok niego ✕ (`#mat-drop`): porzuca rozpoczęte
  działania (`archive("przerwana")`, czyści zapis postępu). „Nowe działania” w grze wraca tutaj.
  Każdy kafel to moduł w „Co widzi dziecko” (`mat-<id zestawu>`, `mat-hard`, `mat-own`).
  Kafle zestawów i tematów zdrowia mają ramkę `statBox(doneStats(sesje))`: ostatni wynik, średnia, ile razy, kiedy (`agoTxt`);
  w liście `#sets` i na pasku Sprawdzianu to samo w jednej linijce (`lastTxt`). `setLast(id)` / `zdLast(mode)` zwracają te statystyki.
- **Matematyka › Nauka** (kafel `#mat-t-learn` nad ćwiczeniami, `#matl` lista, `#matlv` lekcja; hashe `#matematyka-nauka`, `#matematyka-lekcja`, moduł `mat-nauka`):
  12 sposobów z różnych krajów `MX` `{id,name,ic,tone,from,b:()=>[…]}` – `b` losuje nowy przykład przy każdym otwarciu i „🔄 Inny przykład”: mnożenie kreskami
  (`mxLines`: kreski i kolorowe przecięcia, obrót −45°, setki/dziesiątki/jedności), w kratkę/gelosia (`mxLattice`, cyfry po skosach), połowa i podwójnie (rosyjskie),
  egipskie (podwajanie), razy 9 na palcach (`mxFingers`), razy 11, metoda okienek, na krzyż, dzielenie „na przystanku”, kawałkami (chunking), egipskie, cechy podzielności.
  Pochodzenie opisane ostrożnie (np. „japońskie” kreski – nie wiadomo skąd). „✏️ Spróbuj sam” (`mxTry`, odpowiedź po dotknięciu), przeczytane w `henriksen-lekcje-mat`.
- **Nowa sesja (`#ask`):** najpierw lista zestawów `SETS` (`{id,name,n,cfg,info?}`, brakujące pola z `CFG0`;
  ostatni wynik po `cfg.set` w historii) plus „Poćwicz trudne” (`practice(allHard())`), potem „Ułóż własne”:
  działania, „Liczby do”, licznik `NSTEPS` i zwinięte „Więcej opcji” (dzielenie, dziesiątki, ułamki, zakres a/b/c, inny zakres).
- **Ustawienia:** obiekt `CFG`:
  - `m`: zakres liczb,
  - `ops`: lista działań,
  - `tens`: wielokrotności 10,
  - `div`: `"tab"` = odwrotność tabliczki (domyślne) albo `"any"`,
  - `frac`: ułamki, tylko przy `div:"any"`,
  - `ab`, `ar`, `br`, `cr`: własne zakresy a, b i wyniku c (`null` = bez limitu).
  - `set`: id zestawu z `SETS`, gdy sesja wystartowała z zestawu (tytuł = nazwa zestawu).
- **Zapis:** `localStorage` pod kluczem `tabliczka100-postep`, zapisywany po każdej odpowiedzi.
  Reset tylko przyciskiem „Nowe działania” po potwierdzeniu.
- **Ustawienia (menu ☰):** `PREFS` w `localStorage` pod `henriksen-ustawienia`:
  `name` (nazwa w nagłówku `#app-name` i w tytule karty, pusta = „Henriksen”),
  `badge` (znaczek przy nazwie z `BADGES`: ball/crown/bolt/rocket/none), `sub` (linijka nad nazwą na starcie:
  `streak` = seria dni z `streak()` liczona z historii, `date`, `none`); edycja w oknie `#hdr` (ołówek przy nazwie albo menu),
  `theme` (`auto` / `light` / `dark` → `data-theme` na `<html>`, ustawiane już w `<head>`, żeby nie migało)
  i `awake` (Wake Lock: ekran nie gaśnie, ponawiane przy `visibilitychange` i dotknięciu).
  Widok: `dots` (kropki postępu), `pct` i `grade` (procent i ocena na bieżąco w `#live`,
  `updateLive()` liczy z działań `0…i-1`, tą samą skalą `GRADES` co ekran końcowy),
  `hints` (przycisk „Podpowiedź”).
- **Podpowiedzi:** `hints(t)` zwraca kroki (HTML) dla `+ − × :`; przycisk pokazuje kolejny krok,
  widoczny jest tylko ostatni (każdy musi mieć sens sam). Dzielenie tłumaczone jako odwrotność mnożenia
  („ile piątek potrzebujesz…”). Każdy pokazany krok zwiększa `hintsUsed` (stopka i ekran końcowy);
  podpowiedzi celowo nie wpływają na procent ani ocenę.
- **Generator:** `makeTask(op, M, tens, cfg)`, `tabDiv`, `fracDiv`, `multPair`, `pickIn`.
  Wynik liczy `answer(t)`, a `fmt()` formatuje go z przecinkiem.
  Semantyka zakresów: przy dzieleniu `a` to dzielna, `b` to dzielnik, `c` to wynik.
- **Ocena:** `GRADES` (skala %: 6 ≥98, 5 ≥86, 4 ≥70, 3 ≥51, 2 ≥31, 1 poniżej),
  liczona z odsetka zadań rozwiązanych dobrze za pierwszym razem.
- **Ekran końcowy:** `art(g)` = nagłówek oceny + pole `.end-anim` z losową nagrodą z puli tej oceny (bez rysunków;
  „DO PORZYGU” usunięte na życzenie), przycisk „Obejrzyj jeszcze raz”. Odtwarzanie po zniknięciu modala (matematyka `finish`,
  quizy `plEnd`).
- **Nagrody (`REWARDS`):** `{id,src,t:[pule],max?,ext?}`; pule: 6 / 5 / 4 = ocena, 3 = oceny 1–3 (`rewTier`), 10 = co 10 dobrych
  (`showGoal`). Lokalne klipy `video/n6-*`, `n5-*`, `n4-*` (Pexels / Pixabay, 360p, bez dźwięku, źródła w README) – nie są w `SHELL`,
  zapisują się offline przy pierwszym pokazaniu (`rangeFromCache` w SW odpowiada 206 na Range – Safari tego wymaga).
  `ext` = GIF z Giphy/Tenor pokazywany jako MP4 prosto z ich serwera (tylko online, nie kopiujemy do repo) z podpisem `.rew-cr`;
  krótkie GIF-y zapętlane do ok. 6 s, długie klipy ucinane na `max`. `nextGoal(pula)` losuje bez powtórki, offline pomija `ext`;
  błąd wczytania → `localFor(pula)`, a gdy pula nie ma lokalnych (porażki) – pole nagrody się chowa.
  Przełączniki `modals` i `goals` w menu.
- **Efekty odpowiedzi (`FX`, przełącznik `fx` w ustawieniach):** `FX` to lista `{id,kind:"ok"|"bad",tier,name,ms,boom?,run(g)}`.
  `playFx(kind)` losuje dostępny efekt (odblokowany i nie w `PREFS.fxOff`), rysuje go w warstwie `.fx` (position: fixed)
  i zwraca `{ms,boom,end}` albo `null` (wtedy zwykłe potrząśnięcie). Cyfry lecące daleko to kopie z `ghost()`,
  żeby strona nie poszerzała się na telefonie. Poziomy `TIERS`: 1 = rakieta, bomba; 2 = piłkarz, tornado (od 1000
  rozwiązanych zadań); 3 = skok w nadprzestrzeń, stopa (od 2000 dobrych za 1. razem); liczone w `fxCounts()` z historii.
  `checkUnlock()` po dobrej odpowiedzi pokazuje okienko „Nowa animacja!” (`PREFS.fxTier` pamięta ostatni poziom).
  Wybór animacji: zakładka Animacje na ekranie Nagrody (stary arkusz `#fxs` zostaje, ale menu go już nie otwiera). Decyduje przełącznik `fx`; `prefers-reduced-motion`
  („Ogranicz ruch” na iPhonie) ustawia tylko wartość domyślną (wcześniej blokowało efekty mimo włączonego przełącznika).
- **Gratulacje co 5 zadań:** modal na 2,6 s (`celebrate`) plus fajerwerki na `<canvas id="fw">`.
  Hasło z `praise` + osobisty tekst z `praiseSub` (losowane, bez powtórki z poprzednim), młodzieżowy ton.
- **Dźwięki:** `SFX` (ok / bad / cheer / final, a dla efektów launch / fuse / boom) syntezowane przez Web Audio w `tone()`
  i `noise()` (szum przez filtr); wyjątek: start rakiety to próbka `sound/rakieta.m4a` (Mixkit, `SAMPLES` / `sample()`, w `SHELL`); efekt podaje swoje dźwięki w `sounds`, bomba gra własny wybuch zamiast `bad`;
  przełącznik `sound` w menu, `AudioContext` odblokowywany przy dotknięciu.

## Testowanie
Lokalnie: `python3 -m http.server 8000`. Do testów automatycznych sprawdzał się Playwright (Chromium):
przejście całej sesji, walidacja generatora (tysiące losowań, czy liczby mieszczą się w zakresach),
zrzuty ekranu przy szerokości 360–390 px.

## Następny krok: widok „Historia”
Na razie bez bazy, w `localStorage` (model danych gotowy pod późniejszą synchronizację, np. Supabase):
- **Sesja:** id, data start/koniec, `CFG`, `N`, ocena, procent.
- **Zadanie:** `[a, op, b]`, poprawny wynik, **wszystkie wpisane odpowiedzi** (także błędne), czas odpowiedzi.
- **Widok:** lista sesji (data, ustawienia, ocena), a po kliknięciu szczegóły z ✓/✗ i tym, co dziecko wpisało.
- **Kopia zapasowa:** eksport i import historii do pliku JSON. Safari kasuje dane nieodwiedzanych stron po 7 dniach,
  chyba że aplikacja jest dodana do ekranu początkowego.
