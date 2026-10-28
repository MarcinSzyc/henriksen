# Henriksen – kontekst dla Claude Code

Aplikacja PWA do ćwiczenia matematyki dla dziecka (poziom ok. 4 klasy), docelowo także inne przedmioty.
Hosting: GitHub Pages (`main` / root) → https://marcinszyc.github.io/henriksen/

## Zasady projektu
- **Bez builda i bez zależności.** Cała aplikacja to jeden plik `index.html` (HTML + CSS + JS inline).
- **Interfejs po polsku**, młodzieżowy ton, duże przyciski pod telefon (głównie iPhone).
- Tryb jasny/ciemny przez zmienne CSS na `:root`.
- Zaznaczanie tekstu i menu po przytrzymaniu są celowo wyłączone (poza polami `input`).
- Interfejs nie może „pływać”: rozmiar działania (`EQFS` w `fitEq()`) jest jeden na sesję,
  dopasowany do najdłuższego działania; liczony od nowa tylko po zmianie rozmiaru okna i po wczytaniu czcionek.
- Po zmianie ikon/manifestu podbij `VERSION` w `sw.js`.

## Architektura `index.html`
- **Widoki:** `#home` (kwadratowe kafle 2×3: Matematyka, Polski, Angielski, Edukacja zdrowotna oraz Historia i Przyroda jako „Wkrótce” – `[data-soon]`, tylko potrząśnięcie; pasek Statystyki), `#play` (gra), `#stats-v` (statystyki); `go(v)` + `history.pushState`
  (`#gra`, `#statystyki`), więc „wstecz” w telefonie wraca na start. Aplikacja zawsze startuje na `#home`.
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
- **Edukacja zdrowotna** (widok `#zd`, hash `#zdrowie`, przedmiot `subj:"zd"`): kafel „Sprawdzian 29.10” (`ZD_DATE`, wszystkie pytania
  w losowej kolejności, `cfg.mode:"spr"`) i 4 tematy z lekcji (`ZD_TOPICS`: wartosc, styl, cialo, zach – `cfg.mode` = id tematu).
  Pytanie `{q,c,bad,why}` albo prawda/fałsz `PF(q,ok,why)`; `why` = zdanie z notatki. Gra w quizie angielskim (`enStart`,
  `cfg.subj/title/unit` nadpisują angielskie domyślne). Punkty: prawda/fałsz 1, reszta 2; puchar w jednej kategorii `zd`;
  zakładka „Zdrowie” w statystykach (bez szczegółów rodzica); moduły `zd-spr`, `zd-temat` w „Co widzi dziecko”.
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
  Kafel otwiera okno `#admd` z listą z `admin_details(p_kind)` (`supabase/admin2.sql`; users/families/parents/students/active/
  sessions/leagues/nofamily), wiersze rysuje `ADM_ROW[kind]`.
- **Gość (bez konta rodziny, `isGuest()` = brak roli w `henriksen-me`):** może ćwiczyć, ale nic nie jest zapisywane.
  Na początku skryptu `Storage.prototype.setItem` pomija zapis kluczy `STATE_KEYS` (ustawienia, postęp, historia, polski) dla gościa,
  a przy starcie kasuje je na telefonie bez `henriksen-auth` i bez `henriksen-sync` (wygasłe logowanie zostawia sync, więc
  niewysłane wyniki czekają; wylogowanie najpierw wysyła i czyści sync). Statystyki, Puchary i Ligi: okno `#guest` z zaproszeniem
  do Konta rodziny (nasłuch kliknięć w fazie przechwytywania), podpisy kafli „Zaloguj się…”. Kopii gość nie wczyta.
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
- **Puchary (`#cups`, `#puchary`):** brąz/srebro/złoto/diament (`CUP_LV`, progi ×1/×3/×8/×20) za punkty z odpowiedzi dobrych za 1. razem
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
- **Co widzi dziecko (`#kidcfg`, kafel rodzica na górze startu):** rodzic włącza i wyłącza moduły dziecka (`MODS`: matematyka,
  słówka/dyktanda/znaczenia, to be/słówka/zdania, ligi, kafle „Wkrótce”). Zapis w `PREFS.mods` dziecka (klucz w `PARENT_KEYS`),
  `applyMods()` ukrywa kafle; przedmiot znika, gdy wszystkie jego moduły są wyłączone. `subj._on` w podsumowaniu lig wyklucza
  dziecko z rankingu przedmiotu, którego nie ma.
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
- **Ekran końcowy:** `art(g)`:
  - 1–3: grafika „DO PORZYGU!”,
  - 4: piłka w słupek,
  - 5: gol,
  - 6: losowy filmik z `GOALS` w `.end-anim` (po zniknięciu modala), przycisk „Obejrzyj jeszcze raz”.
- **Filmiki z golami:** `video/gol-1..4.mp4` (Mixkit, Mixkit Stock Video Free License, 360p, bez dźwięku; źródła w README).
  `playGoal(el,k,onEnd)` wstawia `<video muted playsinline autoplay>` (iOS wymaga muted + playsinline).
  `showGoal()` co 10 dobrych: po zamknięciu modala (`celebrate(n,false,after)`), albo od razu gdy modale wyłączone.
  Pliki są w `SHELL` w `sw.js`; `rangeFromCache()` w SW odpowiada 206 na żądania Range (Safari bez tego nie odtworzy wideo offline).
  Przełączniki `modals` i `goals` w menu.
- **Efekty odpowiedzi (`FX`, przełącznik `fx` w ustawieniach):** `FX` to lista `{id,kind:"ok"|"bad",tier,name,ms,boom?,run(g)}`.
  `playFx(kind)` losuje dostępny efekt (odblokowany i nie w `PREFS.fxOff`), rysuje go w warstwie `.fx` (position: fixed)
  i zwraca `{ms,boom,end}` albo `null` (wtedy zwykłe potrząśnięcie). Cyfry lecące daleko to kopie z `ghost()`,
  żeby strona nie poszerzała się na telefonie. Poziomy `TIERS`: 1 = rakieta, bomba; 2 = piłkarz, tornado (od 1000
  rozwiązanych zadań); 3 = skok w nadprzestrzeń, stopa (od 2000 dobrych za 1. razem); liczone w `fxCounts()` z historii.
  `checkUnlock()` po dobrej odpowiedzi pokazuje okienko „Nowa animacja!” (`PREFS.fxTier` pamięta ostatni poziom).
  Wybór animacji: arkusz `#fxs` (Ustawienia › Wybierz animacje). Decyduje przełącznik `fx`; `prefers-reduced-motion`
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
