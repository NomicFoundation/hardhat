export type CoverageMetadata = Array<{
  sourceName: string;
  tag: string;
  kind: string;
  startUtf16: number;
  endUtf16: number;
}>;
export type CoverageData = string[];
export interface CoverageManager {
  addData(data: CoverageData): Promise<void>;
  saveData(): Promise<void>;
  loadData(): Promise<void>;
  clearData(): Promise<void>;
  addMetadata(metadata: CoverageMetadata): Promise<void>;
  saveLcovInfo(): Promise<void>;
}
