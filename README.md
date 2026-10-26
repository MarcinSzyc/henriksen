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

## Filmiki

Filmiki z golami pochodzą z [Mixkit](https://mixkit.co) i są na licencji
[Mixkit Stock Video Free License](https://mixkit.co/license/#videoFree):

- `gol-1.mp4` – [Soccer football player does an overhead kick goal](https://mixkit.co/free-stock-video/soccer-football-player-does-an-overhead-kick-goal-2916/)
- `gol-2.mp4` – [Goal play in a semi-professional soccer game](https://mixkit.co/free-stock-video/goal-play-in-a-semi-professional-soccer-game-43499/)
- `gol-3.mp4` – [Skillful soccer player shoots on goal](https://mixkit.co/free-stock-video/skillful-soccer-player-shoots-on-goal-43497/)
- `gol-4.mp4` – [Friends from different countries celebrating a goal](https://mixkit.co/free-stock-video/friends-from-different-countries-celebrating-a-goal-44602/)

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
