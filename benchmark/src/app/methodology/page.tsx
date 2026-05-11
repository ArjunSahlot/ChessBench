import { ArrowRight, Braces, CheckCircle2, Code2, Database, Gauge, Swords } from "lucide-react";
import Link from "next/link";

import { MethodologyFlow } from "@/components/MethodologyFlow";
import { SiteNav } from "@/components/SiteNav";
import { formatDate, formatInteger } from "@/lib/format";
import { getSiteData } from "@/lib/static-data";

export default function MethodologyPage() {
  const site = getSiteData();

  return (
    <>
      <SiteNav />
      <main className="method-page page-pad">
        <section className="method-hero">
          <div>
            <p className="eyebrow">Benchmark methodology</p>
            <h1>From generated code to public ELO</h1>
            <p>
              ChessBench asks models to produce chess engines, compiles the generated projects, runs a persistent
              round-robin competition, and publishes the tournament trail behind every rating.
            </p>
          </div>
          <div className="method-stats" aria-label="Benchmark summary">
            <div>
              <span>Models</span>
              <strong>{formatInteger(site.summary.models)}</strong>
            </div>
            <div>
              <span>Raw engines</span>
              <strong>{formatInteger(site.summary.raw_engines)}</strong>
            </div>
            <div>
              <span>Latest game</span>
              <strong>{formatDate(site.summary.latest_finished_at)}</strong>
            </div>
          </div>
        </section>

        <MethodologyFlow summary={site.summary} />

        <section className="method-grid">
          <MethodCard
            icon={<Code2 />}
            title="Generation contract"
            body="Each run is isolated under generations/provider-model/run-id. The model writes a C++ engine with a root Makefile through confined file tools, then the harness compiles it."
          />
          <MethodCard
            icon={<CheckCircle2 />}
            title="Engine discovery"
            body="Compiled engines are discovered from the local generation tree and registered with provider, model, run id, root, command, manifest, and timestamps."
          />
          <MethodCard
            icon={<Swords />}
            title="Tournament scheduler"
            body="The runner schedules least-played ordered pairings, randomizes openings from the book, validates legal moves with python-chess, and persists every move."
          />
          <MethodCard
            icon={<Gauge />}
            title="Clock discipline"
            body="Games can use fixed movetime or clock plus increment. Time controls, clocks, move latencies, and termination reasons stay attached to each game."
          />
          <MethodCard
            icon={<Braces />}
            title="ELO estimator"
            body="Ratings are estimated from decisive and drawn results with optional anchors. Current public data is anchor-free, so the field floats around the default pool mean."
          />
          <MethodCard
            icon={<Database />}
            title="Publishing path"
            body="The static site ships compact leaderboard data. Supabase stores the full game, move, error, capability, and leaderboard history for interactive browsing."
          />
        </section>

        <section className="schema-callout">
          <div>
            <p className="eyebrow">Data model</p>
            <h2>Built for static publishing and a full archive</h2>
            <p>
              Supabase mirrors the SQLite source of truth into normalized engine, game, move, error, capability, UCI,
              and leaderboard tables. Public views join model metadata for fast client queries.
            </p>
          </div>
          <Link className="primary-action" href="/games/">
            Browse games <ArrowRight size={18} />
          </Link>
        </section>
      </main>
    </>
  );
}

function MethodCard({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <article className="method-card">
      <div className="signal-icon">{icon}</div>
      <h2>{title}</h2>
      <p>{body}</p>
    </article>
  );
}
