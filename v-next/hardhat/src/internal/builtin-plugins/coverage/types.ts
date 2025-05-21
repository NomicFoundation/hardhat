export type Tag = string;
export interface Statement {
  sourceName: string;
  fsPath: string;
  tag: Tag;
  startLine: number;
  endLine: number;
}
export type CoverageMetadata = Statement[];
export type CoverageData = Tag[];
export interface CoverageManager {
  addData(data: CoverageData): Promise<void>;
  addMetadata(metadata: CoverageMetadata): Promise<void>;

  clearData(id: string): Promise<void>;
  saveData(id: string): Promise<void>;

  report(...ids: string[]): Promise<void>;

  enableReport(): void;
  disableReport(): void;
}
