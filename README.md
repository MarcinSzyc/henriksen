# Henriksen ⚽

**Ucz się, ucz.** Prosta aplikacja do ćwiczenia matematyki dla dzieci, działająca jako PWA:
instaluje się na ekranie telefonu, działa bez internetu i pamięta postęp.

👉 **Aplikacja:** https://marcinszyc.github.io/henriksen/

## Co potrafi

- **Ekran startowy** z dwoma kaflami: *Matematyka* (wybór ćwiczeń albo dokończenie rozpoczętych) i *Statystyki*.
- **Statystyki i historia każdej sesji:**
  - wykres wyniku za 1. razem i średniego czasu na działanie,
  - ile było jakich ocen,
  - Top 10 najtrudniejszych działań i przycisk „Poćwicz trudne”,
  - tabliczka mnożenia pokolorowana według błędów,
  - tabela sesji z typem ćwiczeń; po dotknięciu wszystkie odpowiedzi (złe próby, podpowiedzi, czas),
  - filtr według działania, kopia historii do pliku i wczytanie jej z powrotem.
- **Cztery działania:** dodawanie, odejmowanie, mnożenie i dzielenie, osobno albo wymieszane.
- **Ustawienia sesji:**
  - zakres liczb (10, 20, 100, 1000 albo własny),
  - liczba zadań (5–200),
  - wielokrotności 10.
- **Dzielenie na dwa sposoby:**
  - *odwrotność tabliczki* (np. 56 : 7 = 8), poziom 4 klasy,
  - *dowolne*, opcjonalnie z ułamkami (np. 7 : 2 = 3,5).
- **Własny zakres a, b i wyniku c** dla `a + b = c`, `a − b = c`, `a × b = c` i `a : b = c`.
- **Ocena na koniec** według szkolnej skali procentowej (1–6), z grafiką:
  - za 1–3 „do porzygu”,
  - za 4 strzał w słupek,
  - za 5 gol,
  - za 6 losowy filmik z golem (jeden z 4).
- **Postęp zapisuje się automatycznie.** Po zamknięciu aplikacja wraca w to samo miejsce, a reset jest tylko po potwierdzeniu.
- **Gratulacje co 5 zadań** (młodzieżowe teksty), fajerwerki, a co 10 zadań krótki filmik z golem.
- **Menu ☰:** motyw jasny/ciemny, kropki postępu, procent i ocena na bieżąco, podpowiedzi,
  okienka z gratulacjami, filmiki, dźwięki, ekran bez wygaszania.

## Instalacja na telefonie

**iPhone (Safari lub Chrome):** otwórz link → **Udostępnij** → **Dodaj do ekranu początkowego**.

**Android (Chrome):** otwórz link → menu **⋮** → **Zainstaluj aplikację** (albo „Dodaj do ekranu głównego”).

> Postęp jest zapisywany w pamięci przeglądarki na danym urządzeniu (`localStorage`).
> Na iPhonie zainstaluj aplikację na ekranie początkowym. Inaczej Safari może skasować
> dane strony, której nie otwierano przez 7 dni.

## Struktura

```
index.html             cała aplikacja (HTML + CSS + JS w jednym pliku)
manifest.webmanifest   manifest PWA (nazwa, ikony, kolory)
sw.js                  service worker – działanie offline
icons/                 ikony aplikacji (SVG + PNG 32/180/192/512 + maskable)
video/                 filmiki z golami (MP4 360p, bez dźwięku)
sound/                 próbki dźwięków (AAC .m4a)
.nojekyll              GitHub Pages bez Jekylla
```

## Nagrody (filmiki i GIF-y)

Klipy w `video/` (licencje pozwalają używać ich w aplikacji bez podpisu, dla porządku podajemy źródła):

- `n6-san-siro.mp4` – [Goal on San Siro](https://www.pexels.com/video/goal-on-san-siro-16651367/) (Pexels)
- `n6-fajerwerki.mp4` – [Fireworks display at a football stadium](https://www.pexels.com/video/low-angle-view-of-fireworks-display-at-a-football-stadium-13082848/) (Pexels)
- `n6-puchar.mp4` – [Man holding a trophy while celebrating](https://www.pexels.com/video/man-holding-a-trophy-while-celebrating-9502523/) (Pexels)
- `n5-stadion.mp4` – [Energetic crowd celebrating at soccer stadium](https://www.pexels.com/video/energetic-crowd-celebrating-at-soccer-stadium-35117249/) (Pexels, przycięte do 10 s)
- `n4-kibice.mp4` – [Excited soccer fans cheering in stadium](https://www.pexels.com/video/excited-soccer-fans-cheering-in-stadium-39711248/) (Pexels)
- `n4-plonaca-pilka.mp4` – [Football soccer robot leg fire](https://pixabay.com/videos/football-soccer-robot-leg-fire-140210/) (Pixabay, przycięte do 8 s)

GIF-y nie są kopiowane do repo – aplikacja pokazuje je prosto z Giphy / Tenor (tylko z internetem), z podpisem źródła:

- Captain Tsubasa – [strzał Tsubasy i Misakiego](https://giphy.com/gifs/c7m7mnMZNH93weBxlA), [strzał Niemca](https://giphy.com/gifs/tQlAjwnbmk59YYzSuK) (Giphy, Bandai Namco)
- [Strzał Hyugi](https://giphy.com/gifs/C9anstl2NoEwedj9PY) (Giphy, DJ Chimo Bayo), [Supa Strikas](https://giphy.com/gifs/ytwDCq6bm69EMef2JG) (Giphy, Supa Strikas)
- [Tsubasa z piłką](https://tenor.com/view/captain-tsubasa-gif-21171827), [okrzyk](https://tenor.com/view/captain-tsubasa-tsubasa-gif-26298037), [przewrotka](https://tenor.com/view/captain-tsubasa-tsubasa-tsubasa-ozora-overhead-kick-soccer-gif-25871030) (Tenor)
- Pudła przy słabej ocenie: [1](https://giphy.com/gifs/funny-fail-KGTTNpVuGVhN6), [2](https://giphy.com/gifs/soccer-owned-pdAiipxDMCHni), [3](https://giphy.com/gifs/FpFtdGPi2frTq) (Giphy)

## Dźwięki

Pozostałe dźwięki są syntezowane w przeglądarce (Web Audio). Start rakiety pochodzi z [Mixkit](https://mixkit.co)
i jest na licencji [Mixkit Sound Effects Free License](https://mixkit.co/license/#sfxFree):

- `sound/rakieta.m4a` – [Fast rocket whoosh](https://mixkit.co/free-sound-effects/rocket/) (przycięty do 2,6 s, z wyciszeniem)

## Uruchomienie lokalnie

Service worker działa tylko przez `http(s)`, więc zamiast otwierać plik z dysku uruchom serwer:

```bash
python3 -m http.server 8000
# http://localhost:8000
```

## Publikacja

Hosting: **GitHub Pages**. Ustawienia: Settings → Pages → *Deploy from a branch* → `main` / `(root)`.
Każdy push na `main` publikuje nową wersję po ok. minucie.

Strona ładuje się najpierw z sieci, więc zmiany w `index.html` docierają od razu. Po większych zmianach
(ikony, manifest) podbij `VERSION` w `sw.js`, żeby telefony odświeżyły zapisane pliki.

## Plany

- Widok **Historia**: jakie zadania dziecko rozwiązywało, oceny, dobre i złe odpowiedzi.
- Synchronizacja wyników między urządzeniami (np. Supabase).
- Kolejne przedmioty, nie tylko matematyka.
