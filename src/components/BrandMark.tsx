type BrandMarkProps = {
  size?: number;
  className?: string;
  title?: string;
};

/** Broken-corner booth frame — Testicon mark */
export function BrandMark({ size = 28, className = "", title }: BrandMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden={title ? undefined : true}
      role={title ? "img" : undefined}
    >
      {title ? <title>{title}</title> : null}
      {/* Outer booth frame with one broken corner */}
      <path
        d="M4 10V4h6M22 4h6v6M28 22v6h-6M10 28H4v-6"
        stroke="currentColor"
        strokeWidth="2.25"
        strokeLinecap="square"
      />
      {/* Missing top-left inner continuity = broken corner */}
      <path
        d="M11 8h10v16H11V12"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="square"
        opacity="0.9"
      />
      <path
        d="M11 8V12H7"
        stroke="var(--accent)"
        strokeWidth="2.25"
        strokeLinecap="square"
      />
    </svg>
  );
}

type BrandWordmarkProps = {
  size?: number;
  className?: string;
  markClassName?: string;
  subtitle?: string;
  compact?: boolean;
};

export function BrandWordmark({
  size = 28,
  className = "",
  markClassName = "",
  subtitle,
  compact = false,
}: BrandWordmarkProps) {
  return (
    <span className={`inline-flex items-center gap-2 min-w-0 ${className}`}>
      <BrandMark size={size} className={`shrink-0 text-[var(--text-main)] ${markClassName}`} />
      <span className="min-w-0 flex flex-col">
        <span
          className={`font-heading font-bold tracking-tight text-[var(--text-main)] leading-none ${
            compact ? "text-base" : "text-lg"
          }`}
        >
          TESTICON
        </span>
        {subtitle ? (
          <span className="text-xs text-[var(--text-muted)] truncate mt-0.5">{subtitle}</span>
        ) : null}
      </span>
    </span>
  );
}
