# Henriksen ⚽

**Ucz się, ucz.** Prosta aplikacja do ćwiczenia matematyki dla dzieci, działająca jako PWA:
instaluje się na ekranie telefonu, działa bez internetu i pamięta postęp.

👉 **Aplikacja:** https://marcinszyc.github.io/henriksen/

## Co potrafi

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
  - za 6 losowa animacja gola (jedna z 4).
- **Postęp zapisuje się automatycznie.** Po zamknięciu aplikacja wraca w to samo miejsce, a reset jest tylko po potwierdzeniu.
- **Gratulacje co 5 zadań** (młodzieżowe teksty), fajerwerki, a co 10 zadań animacja gola.
- **Menu ☰:** motyw jasny/ciemny, kropki postępu, procent i ocena na bieżąco, podpowiedzi,
  okienka z gratulacjami, animacje, dźwięki, ekran bez wygaszania.

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
anim/                  animacje goli (Lottie JSON)
vendor/                lottie_light.min.js (lottie-web 5.12.2, MIT)
.nojekyll              GitHub Pages bez Jekylla
```

## Animacje

Animacje goli pochodzą z [LottieFiles](https://lottiefiles.com) i są na licencji
[Lottie Simple License](https://lottiefiles.com/page/license):

- `gol-1.json` – [Football Freekick](https://lottiefiles.com/free-animation/football-freekick-UycnHhgCB5), autor: Zaid
- `gol-2.json` – [Soccer player kick on the goal post](https://lottiefiles.com/free-animation/soccer-player-kick-on-the-goal-post-HB0Yj8GCuM), autor: Abdul Latif
- `gol-3.json` – [Soccer player kick the ball on goal post](https://lottiefiles.com/free-animation/soccer-player-kick-the-ball-on-goal-post-ndbbpx7cCQ), autor: Abdul Latif
- `gol-4.json` – [Soccer player flying kick the ball](https://lottiefiles.com/free-animation/soccer-player-flying-kick-the-ball-XPMiq5OvFB), autor: Abdul Latif

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
