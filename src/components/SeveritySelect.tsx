"use client";

import type { CSSProperties } from "react";

const SEVERITIES = [
  {
    value: "LOW",
    label: "Low",
    hint: "Cosmetic",
    accent: "#8a8680",
    surface: "rgba(138, 134, 128, 0.16)",
  },
  {
    value: "MEDIUM",
    label: "Medium",
    hint: "Functional",
    accent: "#ffb020",
    surface: "rgba(255, 176, 32, 0.16)",
  },
  {
    value: "HIGH",
    label: "High",
    hint: "Major break",
    accent: "#ff7a3d",
    surface: "rgba(255, 122, 61, 0.16)",
  },
  {
    value: "CRITICAL",
    label: "Critical",
    hint: "Crash / loss",
    accent: "#ff3b30",
    surface: "rgba(255, 59, 48, 0.18)",
  },
] as const;

type SeveritySelectProps = {
  value: string;
  onChange: (value: string) => void;
};

export default function SeveritySelect({ value, onChange }: SeveritySelectProps) {
  return (
    <div className="severity-stamps" role="radiogroup" aria-label="Issue severity">
      {SEVERITIES.map((option) => {
        const selected = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            className={`severity-stamp ${selected ? "severity-stamp-selected" : ""}`}
            style={
              {
                "--severity-accent": option.accent,
                "--severity-surface": option.surface,
              } as CSSProperties
            }
            onClick={() => onChange(option.value)}
          >
            <span className="severity-stamp-label">{option.label}</span>
            <span className="severity-stamp-hint">{option.hint}</span>
          </button>
        );
      })}
    </div>
  );
}
