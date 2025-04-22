import type { CoverageManager as PublicCoverageManager } from "../../../types/coverage.js";
import type { EdrProvider } from "../network-manager/edr/edr-provider.js";

export interface CoverageHits {
  [markerIds: string]: number;
}

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

export interface CoverageManager extends PublicCoverageManager {
  addProvider(id: string, provider: EdrProvider): Promise<void>;
  removeProvider(id: string): Promise<void>;
  updateMetadata(metadata: CoverageMetadata): void;
}
