import type { ReactNode } from "react";
import type { Source, Topic } from "../../../src/content/types.ts";

export const LETTERS = ["A", "B", "C", "D", "E"];

export const themeClass = (topic: Topic | null | undefined): string => (topic ? `t-${topic.color}` : "");

/** The view's main heading: receives focus after navigation (see useViewFocus). */
export const Heading = ({ level = 1, children, className }: { level?: 1 | 2; children: ReactNode; className?: string }) => {
  const Tag = level === 1 ? "h1" : "h2";
  return <Tag tabIndex={-1} data-focus className={className}>{children}</Tag>;
};

const clamp = (value: number): number => Math.max(0, Math.min(100, value));

export const Bar = ({ value }: { value: number }) => (
  <div className="bar" role="presentation"><i style={{ width: `${clamp(value)}%` }} /></div>
);

export const ProgressLine = ({ value }: { value: number }) => (
  <div className="progress-line" role="presentation"><i style={{ width: `${clamp(value)}%` }} /></div>
);

export const Ring = ({ value, size = 46 }: { value: number; size?: number }) => {
  const r = 18;
  const c = 2 * Math.PI * r;
  return (
    <svg className="ring" width={size} height={size} viewBox="0 0 44 44" aria-hidden="true">
      <circle cx={22} cy={22} r={r} fill="none" stroke="currentColor" strokeOpacity={0.15} strokeWidth={5} />
      <circle cx={22} cy={22} r={r} fill="none" style={{ stroke: "var(--t-strong)" }} strokeWidth={5} strokeLinecap="round"
        strokeDasharray={`${(c * value) / 100} ${c}`} transform="rotate(-90 22 22)" />
      <text x={22} y={25.5} textAnchor="middle" className="ring-label">{`${value}%`}</text>
    </svg>
  );
};

export const SourceChip = ({ source }: { source: Source }) =>
  source === "slides" ? <span className="chip">📑 From the slides</span> : <span className="chip warn">🔭 Beyond the slides</span>;

export const DifficultyChip = ({ level }: { level: number }) => (
  <span className="chip" aria-label={`Difficulty ${level} of 3`}>{"●".repeat(level) + "○".repeat(3 - level)}</span>
);
