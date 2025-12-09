import type { Report } from "../../../../src/internal/builtin-plugins/coverage/coverage-manager.js";

export interface CoverageTestScenario {
  description: `should${string}`;
  expectedResult: Report;
  testFilePath: string;
}
