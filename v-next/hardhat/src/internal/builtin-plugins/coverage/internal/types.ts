import type { CoverageReport } from "../../../../types/coverage.js";
import type { EdrProvider } from "../../network-manager/edr/edr-provider.js";

export interface CoverageManager {
  addProvider(id: string, provider: EdrProvider): Promise<void>;
  removeProvider(id: string): Promise<void>;
  getReport(): Promise<CoverageReport>;
}
