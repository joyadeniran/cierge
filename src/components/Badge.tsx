const SENTIMENT: Record<string, { bg: string; color: string; label: string }> = {
  Positive:   { bg: "#E7F8EE", color: "#15803D", label: "Positive" },
  Neutral:    { bg: "#F0F1F4", color: "#475467", label: "Neutral" },
  Confused:   { bg: "#FFF1EB", color: "#C2410C", label: "Confused" },
  Frustrated: { bg: "#FFF1EB", color: "#C2410C", label: "Frustrated" },
  Angry:      { bg: "#FEECEB", color: "#B42318", label: "Angry" },
};

const STATUS: Record<string, { bg: string; color: string; label: string }> = {
  queued:      { bg: "#EEF1FF", color: "#3538CD", label: "Queued" },
  in_progress: { bg: "#EEF1FF", color: "#3538CD", label: "In progress" },
  completed:   { bg: "#E7F8EE", color: "#15803D", label: "Completed" },
  failed:      { bg: "#FEECEB", color: "#B42318", label: "Failed" },
  canceled:    { bg: "#F0F1F4", color: "#475467", label: "Cancelled" },
};

const ACTIVATION: Record<string, { bg: string; color: string; label: string }> = {
  Activated:           { bg: "#E7F8EE", color: "#15803D",  label: "Activated" },
  Interested:          { bg: "#EEF1FF", color: "#3538CD",  label: "Interested" },
  NotInterested:       { bg: "#F0F1F4", color: "#475467",  label: "Not interested" },
  NeedsHumanFollowUp: { bg: "#FFF1EB", color: "#C2410C",  label: "Needs human" },
};

function Pill({ bg, color, label }: { bg: string; color: string; label: string }) {
  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 500,
        background: bg,
        color,
        borderRadius: 9999,
        padding: "3px 9px",
        whiteSpace: "nowrap",
        display: "inline-block",
      }}
    >
      {label}
    </span>
  );
}

export function SentimentBadge({ value }: { value: string | null }) {
  if (!value) return <span style={{ color: "#C9CED8" }}>—</span>;
  const t = SENTIMENT[value] ?? { bg: "#F0F1F4", color: "#475467", label: value };
  return <Pill {...t} />;
}

export function StatusBadge({ value }: { value: string | null }) {
  if (!value) return <span style={{ color: "#C9CED8" }}>—</span>;
  const t = STATUS[value] ?? { bg: "#F0F1F4", color: "#475467", label: value };
  return <Pill {...t} />;
}

export function ActivationBadge({ value }: { value: string | null }) {
  if (!value) return <span style={{ color: "#C9CED8" }}>—</span>;
  const t = ACTIVATION[value] ?? { bg: "#F0F1F4", color: "#475467", label: value };
  return <Pill {...t} />;
}

export function FollowUpBadge({ needed }: { needed: boolean | null }) {
  if (!needed) return <span style={{ color: "#C9CED8" }}>—</span>;
  return <Pill bg="#EEF1FF" color="#3538CD" label="Needed" />;
}
