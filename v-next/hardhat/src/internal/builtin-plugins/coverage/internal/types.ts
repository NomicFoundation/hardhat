import type { CoverageHits } from "../../../../types/coverage.js";
import type { EdrProvider } from "../../network-manager/edr/edr-provider.js";

export interface InternalCoverageManager {
  addProvider(id: string, provider: EdrProvider): Promise<void>;
  removeProvider(id: string): Promise<void>;
  getProviderHits(): Promise<CoverageHits>;
  clearProviderHits(): Promise<void>;
}
