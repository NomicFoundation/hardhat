import type { Report } from "../../../../../src/internal/builtin-plugins/coverage/coverage-manager.js";
import type {
  CoverageData,
  CoverageMetadata,
} from "../../../../../src/internal/builtin-plugins/coverage/types.js";

export interface CoverageTestScenario {
  description: `should${string}`;
  expectedResult: Report;

  // The following variables can be collected for every test scenario folder by running the code coverage for
  // the Coverage.t.sol test file against the Coverage.sol source file located in the same folder.
  metadata: CoverageMetadata;
  data: CoverageData;
}
