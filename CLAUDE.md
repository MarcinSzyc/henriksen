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
- **Widoki:** `#home` (kafle Matematyka i Polski, Historia jako „Wkrótce” – `[data-soon]`, tylko potrząśnięcie; pasek Statystyki), `#play` (gra), `#stats-v` (statystyki); `go(v)` + `history.pushState`
  (`#gra`, `#statystyki`), więc „wstecz” w telefonie wraca na start. Aplikacja zawsze startuje na `#home`.
  Wczytanie zapisanej sesji (`load()` → `render0()`/`finish(true)`) jest na samym końcu skryptu – `finish()` zapisuje
  do historii i używa stałych zdefiniowanych niżej (wcześniej powodowało to błąd TDZ przy starcie).
- **Polski** (widoki `#pl` → `#plws`/`#plw` Słówka, `#pld`/`#pldt` Dyktanda; hashe `#polski`, `#slowka`, `#slowka-gra`, `#dyktanda`, `#dyktando`;
  `showView` przełącza wszystko z `VIEWS`, `plLeave()` zapisuje przerwaną sesję, `plShow()` rysuje listy):
  - `WORDS`: `"g[ó]ra|podpowiedź|reguła|opis"` – opis = trudne słowo (pokazywane znaczenie, bez całego słowa). Para (ó/u, rz/ż, ch/h) z `plPair()`.
  - `DICTS`: `{id,len:"s"|"m"|"l",title,text}`, luki w tekście jako `[litery]`; długość i liczba słów liczone same.
  - Ustawienia w `localStorage` pod `henriksen-polski` (`PLP`: pairs, n, len, now = „Sprawdzaj od razu”).
  - Gra w Słówka (`PW`) i Dyktando (`PD`) używa tych samych `playFx`/`sfx`/`celebrate`/`showGoal` co matematyka:
    efekty rysują się na karcie z `FXC={card,eq,box}` (null = karta matematyki). Dyktando bez „od razu” sprawdza się na końcu, bez efektów na luce.
  - Sesje w historii z `subj:"pl"`, `cfg.mode` = `slowka`/`dyktando`, `recs[].t` = całe słowo. Szczegóły rodzica, Top 10, `allHard`, `setLast` biorą tylko `subj` mat.
- **Historia:** `localStorage` pod `henriksen-historia`, tablica sesji
  `{id,subj,start,end,status:"done"|"przerwana",cfg,n,done,recs:[{t,ok,tries,h,ms}],pct,grade,errors,hints}`.
  `archive(status)` przy `finish()` i przy rozpoczęciu nowych działań w trakcie (przerwana). Bieżąca sesja trzyma `SID`, `T0`
  i `log[k]={tries,h,ms}` w zapisie postępu. Kopia: eksport/import JSON w menu (łączenie po `id`).
- **Statystyki dla dziecka (`renderKid`, na górze):** zakładki przedmiotu `SUBJ` (all/mat/pl/his; Polski i Historia = „wkrótce”),
  sesje mają `subj` (brak = `"mat"`). Seria, zadania dziś / wczoraj / w tygodniu (od poniedziałku, z `done` sesji + bieżąca),
  słupki tygodnia, jedno zdanie motywacji (seria → rekord dnia → wczoraj), szóstki i najszybszy czas w tygodniu.
  Reszta jest zwinięta pod „Szczegóły dla rodzica” (`#par`).
- **Statystyki (`renderStats`):** filtr `SF` po działaniu; `lineChart()` (SVG, jedna seria, jedna oś) dla % i czasu;
  rozkład ocen; `topHard()` – odsetek złych pierwszych odpowiedzi, dokładne działanie, min. 2 wystąpienia, znika po 3 dobrych
  z rzędu; `heatmap()` 1–10 (mnożenie i dzielenie z tabliczki, jeden odcień); „Poćwicz trudne” = Top 10 × 2 z `CFG.practice`.
- **Stan sesji:** `N` (liczba zadań), `tasks` (tablica `[a, op, b]`, op ∈ `+ − × :`),
  `i` (bieżące zadanie), `state[k]` (`"ok"` = dobrze za 1. razem, `"fix"` = był błąd), `errors` (liczba działań z błędem, nie prób; przeliczane z `state` przy wczytaniu), `hintsUsed` (pokazane kroki podpowiedzi, zapisywane jako `hints`).
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
