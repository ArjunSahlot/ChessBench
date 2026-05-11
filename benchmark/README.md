# ChessBench Benchmark Site

Static Next.js site for publishing ChessBench results with an optional Supabase
backend for the full game archive.

## Local development

```bash
cd benchmark
npm install
npm run dev
```

The site does not bundle local result data. Set the public Supabase variables to
see live benchmark data in development:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

## Static export

```bash
cd benchmark
npm run build
```

The app uses `output: "export"` and writes the deployable static site to
`benchmark/out`.

## Supabase sync

1. Run `supabase/schema.sql` in your Supabase project.
2. Set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.
3. Sync local results:

```bash
uv run llm-chess sync-supabase --dry-run
uv run llm-chess sync-supabase
```

The public app reads from Supabase when `NEXT_PUBLIC_SUPABASE_URL` and
`NEXT_PUBLIC_SUPABASE_ANON_KEY` are present at build time. Without those values,
data-heavy pages intentionally show a setup notice instead of falling back to
local files.
