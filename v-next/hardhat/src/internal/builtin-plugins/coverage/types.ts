export type CoverageMetadata = Array<{
  tag: Buffer
  kind: string
  startUtf16: number
  endUtf16: number
}>;
export type CoverageData = Buffer[];
export interface CoverageManager {
	addData(data: CoverageData): Promise<void>;
	saveData(): Promise<void>;
	loadData(): Promise<void>;
	clearData(): Promise<void>;
	addMetadata(metadata: CoverageMetadata): Promise<void>;
}
