import type { LeaderboardRow, ModelSummary } from "@/lib/types";
import { providerLabel } from "@/lib/format";

type MarkModel = Pick<LeaderboardRow | ModelSummary, "label" | "provider" | "logo" | "accent">;

export function ModelMark({ model, compact = false }: { model: MarkModel; compact?: boolean }) {
  return (
    <span className={`model-mark ${compact ? "compact" : ""}`}>
      <span className="logo-shell" style={{ borderColor: model.accent }}>
        {model.logo ? <img src={model.logo} alt="" /> : <span>{model.label.slice(0, 1)}</span>}
      </span>
      <span className="model-copy">
        <strong>{model.label}</strong>
        {!compact && <small>{providerLabel(model.provider)}</small>}
      </span>
    </span>
  );
}
