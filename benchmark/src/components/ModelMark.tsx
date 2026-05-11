import type { LeaderboardRow } from "@/core/types";
import { modelLabel, providerLabel } from "@/core/format";

type MarkModel = Pick<LeaderboardRow, "name" | "provider_model" | "label" | "provider" | "logo" | "accent">;

export function ModelMark({ model, compact = false }: { model: MarkModel; compact?: boolean }) {
  const label = model.label || modelLabel(model);
  return (
    <span className={`model-mark ${compact ? "compact" : ""}`}>
      <span className="logo-shell" style={{ borderColor: model.accent }}>
        {model.logo ? <img src={model.logo} alt="" /> : <span>{label.slice(0, 1)}</span>}
      </span>
      <span className="model-copy">
        <strong>{label}</strong>
        {!compact && <small>{providerLabel(model.provider)}</small>}
      </span>
    </span>
  );
}
