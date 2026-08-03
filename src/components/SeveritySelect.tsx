"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { ChevronDown } from "lucide-react";

const SEVERITIES = [
  {
    value: "LOW",
    label: "Low",
    hint: "Cosmetic / minor",
    accent: "#9ca3af",
    surface: "rgba(156, 163, 175, 0.14)",
  },
  {
    value: "MEDIUM",
    label: "Medium",
    hint: "Functional issue",
    accent: "#fbbf24",
    surface: "rgba(251, 191, 36, 0.14)",
  },
  {
    value: "HIGH",
    label: "High",
    hint: "Major feature broken",
    accent: "#f97316",
    surface: "rgba(249, 115, 22, 0.14)",
  },
  {
    value: "CRITICAL",
    label: "Critical",
    hint: "Crash / data loss",
    accent: "#ef4444",
    surface: "rgba(239, 68, 68, 0.14)",
  },
] as const;

type SeveritySelectProps = {
  value: string;
  onChange: (value: string) => void;
};

export default function SeveritySelect({ value, onChange }: SeveritySelectProps) {
  const [open, setOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedIndex = SEVERITIES.findIndex((s) => s.value === value);
  const hasSelection = selectedIndex >= 0;
  const selectOption = useCallback(
    (index: number) => {
      onChange(SEVERITIES[index].value);
      setOpen(false);
      setHighlightIndex(-1);
    },
    [onChange],
  );

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setHighlightIndex(-1);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (!open) {
      if (event.key === "ArrowDown" || event.key === "ArrowUp" || event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        setOpen(true);
        setHighlightIndex(hasSelection ? selectedIndex : 0);
      }
      return;
    }

    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        setHighlightIndex((i) => (i + 1) % SEVERITIES.length);
        break;
      case "ArrowUp":
        event.preventDefault();
        setHighlightIndex((i) => (i - 1 + SEVERITIES.length) % SEVERITIES.length);
        break;
      case "Enter":
      case " ":
        event.preventDefault();
        if (highlightIndex >= 0) selectOption(highlightIndex);
        break;
      case "Escape":
        event.preventDefault();
        setOpen(false);
        setHighlightIndex(-1);
        break;
      case "Home":
        event.preventDefault();
        setHighlightIndex(0);
        break;
      case "End":
        event.preventDefault();
        setHighlightIndex(SEVERITIES.length - 1);
        break;
    }
  };

  const triggerStyle = hasSelection
    ? ({
        "--severity-accent": SEVERITIES[selectedIndex].accent,
        "--severity-surface": SEVERITIES[selectedIndex].surface,
      } as CSSProperties)
    : undefined;

  return (
    <div
      ref={containerRef}
      className={[
        "severity-dropdown",
        open ? "severity-dropdown-open" : "",
        hasSelection ? "" : "severity-dropdown-unselected",
      ]
        .filter(Boolean)
        .join(" ")}
      onKeyDown={handleKeyDown}
    >
      <button
        type="button"
        className="severity-dropdown-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={hasSelection ? `Severity: ${SEVERITIES[selectedIndex].label}` : "Severity: not selected"}
        onClick={() => {
          setOpen((prev) => !prev);
          if (!open) setHighlightIndex(hasSelection ? selectedIndex : 0);
        }}
        style={triggerStyle}
      >
        <div className="severity-gauge" aria-hidden="true">
          {SEVERITIES.map((level, index) => (
            <span
              key={level.value}
              className={`severity-gauge-bar${hasSelection && index <= selectedIndex ? " severity-gauge-bar-active" : ""}`}
              style={{ "--severity-accent": level.accent } as CSSProperties}
            />
          ))}
        </div>

        <span className="severity-dropdown-trigger-text">
          {hasSelection ? (
            <>
              <span className="severity-dropdown-label">{SEVERITIES[selectedIndex].label}</span>
              <span className="severity-dropdown-hint">{SEVERITIES[selectedIndex].hint}</span>
            </>
          ) : (
            <span className="severity-dropdown-placeholder">Select...</span>
          )}
        </span>

        <ChevronDown size={16} strokeWidth={2.25} className="severity-dropdown-chevron" />
      </button>

      <ul
        className="severity-dropdown-menu"
        role="listbox"
        aria-label="Issue severity"
        hidden={!open}
      >
        {SEVERITIES.map((option, index) => {
          const isSelected = value === option.value;
          const isHighlighted = highlightIndex === index;

          return (
            <li
              key={option.value}
              role="option"
              aria-selected={isSelected}
              className={[
                "severity-dropdown-option",
                isSelected ? "severity-dropdown-option-selected" : "",
                isHighlighted ? "severity-dropdown-option-highlighted" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              style={
                {
                  "--severity-accent": option.accent,
                  "--severity-surface": option.surface,
                } as CSSProperties
              }
              onMouseEnter={() => setHighlightIndex(index)}
              onClick={() => selectOption(index)}
            >
              <span className="severity-dropdown-option-text">
                <span className="severity-dropdown-option-label">{option.label}</span>
                <span className="severity-dropdown-option-hint">{option.hint}</span>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
