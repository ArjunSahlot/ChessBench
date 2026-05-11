"use client";

import { useMemo, useState } from "react";
import { ChevronRight, Code2, Database, Gauge, Swords, Trophy } from "lucide-react";

import type { SiteSummary } from "@/lib/types";
import { formatInteger } from "@/lib/format";

const steps = [
  {
    id: "generate",
    title: "Generate",
    icon: Code2,
    metric: "Raw engines",
    copy: "A model receives the same engine-building task and writes code into an isolated workspace.",
  },
  {
    id: "compile",
    title: "Compile",
    icon: Gauge,
    metric: "Registered engines",
    copy: "The harness records manifest metadata and only tournament-ready commands enter the arena.",
  },
  {
    id: "play",
    title: "Play",
    icon: Swords,
    metric: "Finished games",
    copy: "Engines play scheduled pairings with persisted openings, clocks, PGN, legal move traces, and errors.",
  },
  {
    id: "rate",
    title: "Rate",
    icon: Trophy,
    metric: "Top ELO",
    copy: "A Bradley-Terry style iterative ELO estimate turns the head-to-head table into a ranked leaderboard.",
  },
  {
    id: "publish",
    title: "Publish",
    icon: Database,
    metric: "Indexed games",
    copy: "Compact static files power the first paint. Supabase carries the expanding game archive.",
  },
];

export function MethodologyFlow({ summary }: { summary: SiteSummary }) {
  const [active, setActive] = useState(0);
  const activeStep = steps[active];
  const values = useMemo(
    () => ({
      generate: formatInteger(summary.raw_engines),
      compile: formatInteger(summary.models),
      play: formatInteger(summary.finished_games),
      rate: summary.top_elo ? formatInteger(summary.top_elo) : "n/a",
      publish: formatInteger(summary.total_games),
    }),
    [summary],
  );

  return (
    <section className="flow-panel" aria-label="Interactive methodology flow">
      <div className="flow-rail">
        {steps.map((step, index) => {
          const Icon = step.icon;
          return (
            <button className={index === active ? "active" : ""} key={step.id} onClick={() => setActive(index)}>
              <Icon size={18} />
              <span>{step.title}</span>
              {index < steps.length - 1 && <ChevronRight className="flow-chevron" size={16} />}
            </button>
          );
        })}
      </div>
      <div className="flow-detail">
        <div className="flow-index">0{active + 1}</div>
        <div>
          <p className="eyebrow">{activeStep.metric}</p>
          <strong>{values[activeStep.id as keyof typeof values]}</strong>
          <h2>{activeStep.title}</h2>
          <p>{activeStep.copy}</p>
        </div>
      </div>
    </section>
  );
}
