export type PaperWidth = "58" | "80";

export function isPaperWidth(value: unknown): value is PaperWidth {
  return value === "58" || value === "80";
}

export function columnsForPaper(paper: PaperWidth): number {
  return paper === "80" ? 48 : 32;
}
