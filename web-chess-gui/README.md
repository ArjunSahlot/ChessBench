# LLM Chess Arena

Modern web viewer for the round-robin results stored in `results/competition.sqlite3`.

```bash
cd web-chess-gui
npm install
npm run dev
```

The dev and build scripts export the SQLite database to `public/data/competition.json` before starting Vite, so the browser can load the tournament without a backend.

Useful commands:

```bash
npm run export:data
npm run build
npm run preview
```
