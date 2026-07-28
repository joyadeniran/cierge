interface StatCardProps {
  label: string;
  value: string;
  trend?: string;
  up?: boolean;
}

export function StatCard({ label, value, trend, up }: StatCardProps) {
  return (
    <div
      style={{
        background: "#FFFFFF",
        border: "1px solid #E7E9EE",
        borderRadius: 10,
        padding: 14,
        boxShadow: "0 1px 2px rgba(17,17,17,.04)",
      }}
    >
      <div style={{ fontSize: 12, color: "#667085" }}>{label}</div>
      <div
        style={{
          fontFamily: "var(--font-inter-tight), 'Inter Tight', sans-serif",
          fontWeight: 600,
          fontSize: 26,
          marginTop: 4,
          letterSpacing: "-0.02em",
        }}
      >
        {value}
      </div>
      {trend && (
        <div
          style={{
            fontSize: 11,
            marginTop: 2,
            color: up === false ? "#B42318" : "#15803D",
          }}
        >
          {trend}
        </div>
      )}
    </div>
  );
}
