export type PathwayStep = {
  n: number;
  from: string;
  to: string;
  enzyme: string;
  phase: "preparatory" | "payoff";
  reversible: boolean;
  energy: string;
  regulation: string;
  note: string;
};

export type Pathway = {
  id: string;
  name: string;
  unit: number;
  part: number;
  summary: string;
  net: string;
  steps: PathwayStep[];
  whatIf: { q: string; a: string }[];
};
