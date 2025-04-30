import type { CoverageData } from "../../../coverage/types.js";

export interface CoverageConfig {
  onCollectedCoverageCallback: (coverageData: CoverageData) => void;
}
