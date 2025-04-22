import type { EdrProvider } from "../../network-manager/edr/edr-provider.js";

export interface CoverageHits {
  [markerIds: string]: number;
}

export interface InternalCoverageManager {
  addProvider(id: string, provider: EdrProvider): Promise<void>;
  removeProvider(id: string): Promise<void>;
  getProviderHits(): Promise<CoverageHits>;
  clearProviderHits(): Promise<void>;
}
