import type { CoverageManager } from "../../../types/coverage.js";
import "../../../types/global-options.js";
import "../../../types/hre.js";

declare module "../../../types/global-options.js" {
  export interface GlobalOptions {
    coverage: boolean;
  }
}

declare module "../../../types/hre.js" {
  interface HardhatRuntimeEnvironment {
    coverage: CoverageManager;
  }
}
