type Tag = string;
export interface Statement {
  relativePath: string;
  tag: Tag;
  startUtf16: number;
  endUtf16: number;
}
export interface ReportCoverageStatement {
  startUtf16: number;
  endUtf16: number;
  executed: boolean;
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
