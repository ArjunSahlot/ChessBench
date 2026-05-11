# ChessBench Benchmark Site

Static Next.js site for publishing ChessBench results with an optional Supabase
backend for the full game archive.

## Local development

```bash
cd benchmark
npm install
npm run dev
```

`npm run dev` regenerates compact static data from `../results/competition.sqlite3`
and starts Next.js.

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
cd benchmark
npm run sync:supabase -- --dry-run
npm run sync:supabase
```

The public app reads from Supabase when `NEXT_PUBLIC_SUPABASE_URL` and
`NEXT_PUBLIC_SUPABASE_ANON_KEY` are present at build time. Without those values,
it falls back to the checked-in static data snapshots.
