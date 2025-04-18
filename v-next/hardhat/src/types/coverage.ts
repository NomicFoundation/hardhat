export interface CoverageHits {
  [markerIds: string]: number;
}

export interface CoverageManager {
  saveProviderHits(): Promise<void>;
  loadProviderHits(): Promise<CoverageHits>;
}
