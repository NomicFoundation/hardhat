export interface CoverageMetadata {
  [markerId: string]: {
    sourceName: string;
    kind: "statement";
    location: {
      start: number;
      end: number;
    };
  };
}

export interface CoverageHits {
  [markerIds: string]: number;
}

export interface CoverageManager {
  saveProviderHits(): Promise<void>;
  loadProviderHits(): Promise<CoverageHits>;
}
