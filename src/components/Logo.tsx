interface LogoProps {
  size?: "sm" | "md" | "lg";
  dark?: boolean;
}

const sizes = { sm: "text-lg", md: "text-2xl", lg: "text-4xl" };

export function Logo({ size = "md", dark = true }: LogoProps) {
  const wordColor = dark ? "#FFFFFF" : "#111111";
  return (
    <span
      style={{
        fontFamily: "var(--font-inter-tight), 'Inter Tight', sans-serif",
        fontWeight: 700,
        letterSpacing: "-0.04em",
        lineHeight: 1,
        color: wordColor,
      }}
      className={sizes[size]}
    >
      <span style={{ color: "#FF5A1F" }}>&lt;</span>
      cierge
      <span style={{ color: "#FF5A1F" }}>&gt;</span>
    </span>
  );
}
