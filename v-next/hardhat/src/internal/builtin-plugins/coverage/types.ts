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
  handleData(data: CoverageData): Promise<void>;
  handleMetadata(metadata: CoverageMetadata): Promise<void>;

  handleTestRunStart(id: string): Promise<void>;
  handleTestWorkerDone(id: string): Promise<void>;
  handleTestRunDone(id: string): Promise<void>;
}
