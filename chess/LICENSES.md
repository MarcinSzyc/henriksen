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
