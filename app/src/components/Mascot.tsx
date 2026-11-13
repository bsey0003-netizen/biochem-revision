/** Beta, the mascot. Decorative only (aria-hidden). */
export type Mood = "happy" | "cheer" | "sleepy";

const INK = "#2a2438";
const line = { stroke: INK, strokeWidth: 3, strokeLinecap: "round" as const, fill: "none" };

export const Mascot = ({ mood = "happy", size = 72 }: { mood?: Mood; size?: number }) => (
  <svg className="mascot" width={size} height={size} viewBox="0 0 90 90" aria-hidden="true">
    <g className="bob">
      <line x1={32} y1={24} x2={22} y2={9} stroke="#9a82ff" strokeWidth={4} strokeLinecap="round" />
      <circle cx={21} cy={8} r={6.5} fill="#ff9ab6" />
      <line x1={58} y1={24} x2={68} y2={9} stroke="#9a82ff" strokeWidth={4} strokeLinecap="round" />
      <circle cx={69} cy={8} r={6.5} fill="#7dd8b5" />
      <circle cx={45} cy={50} r={31} fill="#b7a4ff" />
      <ellipse cx={35} cy={34} rx={11} ry={7} fill="#fff" fillOpacity={0.35} />
      <circle cx={26} cy={54} r={5} fill="#ff9ab6" fillOpacity={0.75} />
      <circle cx={64} cy={54} r={5} fill="#ff9ab6" fillOpacity={0.75} />
      {mood === "sleepy" ? (
        <>
          <path d="M29 44 q5 4 10 0" {...line} />
          <path d="M51 44 q5 4 10 0" {...line} />
          <path d="M41 57 h8" {...line} />
          <text x={70} y={30} fontSize={12} fill="#9a82ff" fontWeight={900}>z</text>
        </>
      ) : (
        <>
          <circle cx={34} cy={44} r={4.5} fill={INK} />
          <circle cx={56} cy={44} r={4.5} fill={INK} />
          <circle cx={35.5} cy={42.5} r={1.4} fill="#fff" />
          <circle cx={57.5} cy={42.5} r={1.4} fill="#fff" />
          {mood === "cheer" ? <path d="M37 53 q8 11 16 0 z" fill={INK} /> : <path d="M38 54 q7 7 14 0" {...line} />}
        </>
      )}
      {mood === "cheer" && (
        <>
          <text x={78} y={34} fontSize={13} fill="#f0a038">✦</text>
          <text x={4} y={40} fontSize={10} fill="#f0a038">✦</text>
        </>
      )}
    </g>
  </svg>
);
