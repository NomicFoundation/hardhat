import type { Report } from "../coverage-manager.js";
import type { FileCoverageData } from "@nomicfoundation/hardhat-vendored/coverage/types";

import path from "node:path";

import { mkdir } from "@nomicfoundation/hardhat-utils/fs";
import {
  istanbulLibCoverage,
  istanbulLibReport,
  istanbulReports,
} from "@nomicfoundation/hardhat-vendored/coverage";

export async function generateHtmlReport(
  report: Report,
  htmlReportPath: string,
): Promise<void> {
  const baseDir = process.cwd();
  const coverageMap = istanbulLibCoverage.createCoverageMap({});

  await mkdir(htmlReportPath);

  // Construct coverage data for each tested file,
  // detailing whether each line was executed or not.
  for (const [p, coverageInfo] of Object.entries(report)) {
    const testedFilePath = path.join(baseDir, p);

    const fc: FileCoverageData = {
      path: testedFilePath,
      statementMap: {},
      fnMap: {}, // Cannot be derived from current report data
      branchMap: {}, // Cannot be derived from current report data
      s: {},
      f: {}, // Cannot be derived from current report data
      b: {},
    };

    for (const [line, count] of coverageInfo.lineExecutionCounts) {
      fc.statementMap[line] = {
        start: { line, column: 0 },
        end: { line, column: 0 },
      };

      // TODO: currently EDR does not provide per-statement coverage counts
      fc.s[line] = count > 0 ? 1 : 0; // mark as covered if hit at least once
    }

    coverageMap.addFileCoverage(fc);
  }

  const context = istanbulLibReport.createContext({
    dir: htmlReportPath,
    coverageMap,
  });

  istanbulReports.create("html", undefined).execute(context);
}
