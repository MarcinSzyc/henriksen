# Henriksen – kontekst dla Claude Code

Aplikacja PWA do ćwiczenia matematyki dla dziecka (poziom ok. 4 klasy), docelowo także inne przedmioty.
Hosting: GitHub Pages (`main` / root) → https://marcinszyc.github.io/henriksen/

## Zasady projektu
- **Bez builda i bez zależności.** Cała aplikacja to jeden plik `index.html` (HTML + CSS + JS inline).
- **Interfejs po polsku**, młodzieżowy ton, duże przyciski pod telefon (głównie iPhone).
- Tryb jasny/ciemny przez zmienne CSS na `:root`.
- Zaznaczanie tekstu i menu po przytrzymaniu są celowo wyłączone (poza polami `input`).
- Po zmianie ikon/manifestu podbij `VERSION` w `sw.js`.

## Architektura `index.html`
- **Stan sesji:** `N` (liczba zadań), `tasks` (tablica `[a, op, b]`, op ∈ `+ − × :`),
  `i` (bieżące zadanie), `state[k]` (`"ok"` = dobrze za 1. razem, `"fix"` = był błąd), `errors` (liczba działań z błędem, nie prób; przeliczane z `state` przy wczytaniu), `hintsUsed` (pokazane kroki podpowiedzi, zapisywane jako `hints`).
- **Ustawienia:** obiekt `CFG`:
  - `m`: zakres liczb,
  - `ops`: lista działań,
  - `tens`: wielokrotności 10,
  - `div`: `"tab"` = odwrotność tabliczki (domyślne) albo `"any"`,
  - `frac`: ułamki, tylko przy `div:"any"`,
  - `ab`, `ar`, `br`, `cr`: własne zakresy a, b i wyniku c (`null` = bez limitu).
- **Zapis:** `localStorage` pod kluczem `tabliczka100-postep`, zapisywany po każdej odpowiedzi.
  Reset tylko przyciskiem „Nowe działania” po potwierdzeniu.
- **Ustawienia (menu ☰):** `PREFS` w `localStorage` pod `henriksen-ustawienia`:
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
- **Gratulacje co 5 zadań:** modal na 2,6 s (`celebrate`) plus fajerwerki na `<canvas id="fw">`.
  Hasło z `praise` + osobisty tekst z `praiseSub` (losowane, bez powtórki z poprzednim), młodzieżowy ton.
- **Dźwięki:** `SFX` (ok / bad / cheer / final) syntezowane przez Web Audio w `tone()`, bez plików;
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
