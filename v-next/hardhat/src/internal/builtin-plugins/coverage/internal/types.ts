import type { EdrProvider } from "../../network-manager/edr/edr-provider.js";

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

export interface InternalCoverageManager {
  addProvider(id: string, provider: EdrProvider): Promise<void>;
  removeProvider(id: string): Promise<void>;
  getProviderHits(): Promise<CoverageHits>;
  clearProviderHits(): Promise<void>;
  updateMetadata(metadata: CoverageMetadata): void;
}
