export interface Subject {
  key: string;
  name: string;
  short: string;
}
export interface Bin {
  lowerBound: number;
  upperBound: number;
  upperInclusive: boolean;
  count: number;
}
export interface SubjectReport extends Subject {
  valid: number;
  missing: number;
  mean: number | null;
  median: number | null;
  std: number | null;
  min: number | null;
  max: number | null;
  zero: number;
  ten: number;
  bins: Bin[];
  bands: number[];
}
export interface Levels {
  year: number;
  source: string;
  ready: boolean;
  total: number;
  subjects: SubjectReport[];
}
export interface Combination {
  key: string;
  subjects: string[];
  english: boolean;
}
export interface Ranking extends Combination {
  valid: number;
  mean: number | null;
  max: number | null;
  bins: Bin[];
  top: { position: number; sbd: string; scores: number[]; total: number }[];
}
export interface Candidate {
  year: number;
  sbd: string;
  language: string | null;
  scores: (number | null)[];
}
export const integer = (value: number) => value.toLocaleString("en-US");
export const decimal = (value: number | null) =>
  value === null
    ? "No data"
    : value.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
export const percentage = (count: number, total: number) =>
  total ? (count / total) * 100 : 0;
export const interval = (bin: Bin) =>
  `[${decimal(bin.lowerBound)}; ${decimal(bin.upperBound)}${bin.upperInclusive ? "]" : ")"}`;
export const groupNames = (group: Combination, subjects: Subject[]) =>
  group.subjects
    .map((key) =>
      group.english && key === "ngoai_ngu"
        ? "English"
        : (subjects.find((s) => s.key === key)?.short ?? key),
    )
    .join(" + ");
