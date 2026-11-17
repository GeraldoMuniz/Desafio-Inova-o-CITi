export type Severity = "alta" | "media" | "baixa";
export type FindingCategory = "ausente" | "desatualizada" | "contraditoria" | "clareza";
export type Rigor = "moderado" | "rigoroso";

export interface Finding {
  title: string;
  category: FindingCategory;
  severity: Severity;
  explanation: string;
  suggestion: string;
  evidence: { path: string; excerpt: string };
}

export interface Criterion {
  name: string;
  met: boolean;
  reason: string;
}

export interface AnalysisReport {
  id: string;
  repository: string;
  url: string;
  branch: string;
  analyzedAt: string;
  analyzedFiles: string[];
  coverage: number;
  criteria: Criterion[];
  summary: string;
  findings: Finding[];
  model: string;
}
