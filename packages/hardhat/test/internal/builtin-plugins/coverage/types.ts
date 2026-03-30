import type { FileReport } from "../../../../src/internal/builtin-plugins/coverage/coverage-manager.js";

export interface CoverageTestScenario {
  description: `should${string}`;
  expectedResult: FileReport;
  sourceFilePath: string;
  testFilePath: string;
}
