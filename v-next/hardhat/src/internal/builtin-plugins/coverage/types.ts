export type Tag = string;
export interface Statement {
  sourceName: string;
  tag: Tag;
  startLine: number;
  endLine: number;
}
export type CoverageMetadata = Statement[];
export type CoverageData = Tag[];
export interface CoverageManager {
  addData(data: CoverageData): Promise<void>;
  saveData(): Promise<void>;
  loadData(): Promise<void>;
  clearData(): Promise<void>;
  addMetadata(metadata: CoverageMetadata): Promise<void>;
  saveLcovReport(): Promise<void>;
  printMarkdownReport(): Promise<void>;
}
