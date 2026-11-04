# Szachy – pliki z zewnątrz

- `chess.js` – [chess.js](https://github.com/jhlywa/chess.js) 1.4.0 (`dist/esm/chess.js`), © Jeff Hlywa, licencja BSD-2-Clause.
- `puzzles.json` – wybór zadań z [bazy zadań Lichess](https://database.lichess.org/#puzzles) (CC0): mat w 1 (ocena 400–1100),
  mat w 2 (500–1300), mat w 3 (600–1500), popularność ≥ 85, min. 300 rozwiązań. Format: `[id, FEN, ruchy UCI, ocena]`;
  pierwszy ruch wykonuje przeciwnik. Plik zrobiony skryptem `tools/lichess_puzzles.py`:
  `curl -sL https://database.lichess.org/lichess_db_puzzle.csv.zst | zstd -dc | python3 tools/lichess_puzzles.py 160 chess/puzzles.json`
- Figury (wbudowane w `index.html`) – zestaw „cburnett” z [Lichess](https://github.com/lichess-org/lila/tree/master/public/piece/cburnett),
  autor Colin M.L. Burnett, licencja CC BY-SA 3.0.
- `3d/three.module.min.js`, `3d/addons/` – [Three.js](https://github.com/mrdoob/three.js) r170, MIT (`3d/LICENSE-three.txt`).
- `3d/cannon-es.js` – [cannon-es](https://github.com/pmndrs/cannon-es) 0.20.0, MIT (`3d/LICENSE-cannon-es.txt`).
- `3d/chess3d.glb` – „A Beautiful Game” z [Khronos glTF Sample Assets](https://github.com/KhronosGroup/glTF-Sample-Assets/tree/main/Models/ABeautifulGame):
  Moeen Sayed i Mujtaba Sayed dla SideFX, konwersja glTF Ed Mackey (MaterialX Project), CC BY 4.0; zmniejszony skryptem `tools/chess3d_model.sh`.
- `3d/skins/footballer.glb` – „Casual Character” z paczki Ultimate Animated Character Pack, [Quaternius](https://quaternius.com), CC0 (pobrany z [Poly Pizza](https://poly.pizza/m/kZ3DmIoGip)).
- `3d/addons/utils/SkeletonUtils.js` – Three.js r170, MIT.

## Zestawy figur 2D (`chess/pieces/`) – z repozytorium Lichess (lila, `public/piece/`)
- `pixel` – therealqtpi, AGPLv3+
- `horsey` – cham, michael1241, CC BY-NC-SA 4.0
- `anarcandy` – caderek, CC BY-NC-SA 4.0
- `california` – Jerry S., CC BY-NC-SA 4.0
- `fantasy`, `spatial` – Maurizio Monge (github.com/maurimo/chess-art), MIT
- `rhosgfx` – RhosGFX (rhosgfx.itch.io), CC0 1.0

## Awatary komentatorów (`chess/avatars/`)
- Avataaars, Pablo Stanley (avataaars.com), wygenerowane w DiceBear (dicebear.com) – free for personal and commercial use.

## Głosy komentatorów (`chess/voices/`, nagrywane `tools/sz_voices.sh`)
- Piper (rhasspy/piper-voices), polski głos `gosia` (Grażyna; wcześniej też `bass`, `darkman`) – zbiory danych CC0.
- Kazek (`chess/voices/kazek/`): nagrania z ElevenLabs (głos „Marek – Conversational”) przygotowane przez właściciela aplikacji; skrypt ich nie nadpisuje.
- Janusz (`chess/voices/janusz/`): nagrania z ElevenLabs (głos „Alex – Warm Storyteller”), jeden plik pocięty na kwestie; skrypt ich nie nadpisuje.
- Zbyszek (`chess/voices/zbyszek/`): nagrania z ElevenLabs (głos „Tomasz Z – Expressive and Deep”), pocięte tak samo.

## Miniatura komentatora (emoji)
- Noto Animated Emoji, Google (googlefonts.github.io/noto-emoji-animation), CC BY 4.0 – wczytywane z fonts.gstatic.com.

## Robaki i Robale (`chess/bugs/`, `chess/robale/`)
- Noto Emoji, Google – statyczne SVG (Apache 2.0); animacje w ruchu: Noto Animated Emoji (CC BY 4.0) z fonts.gstatic.com.

## Szachy 3D – Dinozaury (`chess/3d/skins/dino/`)
- „Animated Dinosaur Pack” – Quaternius (quaternius.com), CC0 1.0, pobrane z Poly Pizza (T-Rex, Apatosaurus, Triceratops,
  Parasaurolophus, Velociraptor, Stegosaurus); zmniejszone skryptem `tools/chess3d_dino.sh`.
- Roboty (skórka „Roboty”) są zbudowane w kodzie (`makeRobot` w `chess/3d/sz3d.js`), bez zewnętrznych modeli; wygląd, kolory i przemiany według własnego projektu zrobionego w Claude Design (postacie oryginalne, nie z Transformers).
