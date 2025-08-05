import type { Colorizer } from "../../utils/colorizer.js";
import type {
  FuzzTestKind,
  InvariantTestKind,
  StandardTestKind,
  SuiteResult,
} from "@nomicfoundation/edr";

import path from "node:path";

import { assertHardhatInvariant } from "@nomicfoundation/hardhat-errors";
import { formatMarkdownTable } from "@nomicfoundation/hardhat-utils/format";
import {
  exists,
  readUtf8File,
  writeUtf8File,
} from "@nomicfoundation/hardhat-utils/fs";
import chalk from "chalk";
import debug from "debug";

import {
  bigIntAbs,
  bigIntDiv,
  bigIntFromNumber,
  bigIntPadEnd,
  bigIntToString,
} from "./utils/bigint.js";

const log = debug("hardhat:solidity-test:gas-reporter");

type StandardTestGasUsage = { kind: "StandardTestKind" } & StandardTestKind;
type FuzzTestGasUsage = { kind: "FuzzTestKind" } & FuzzTestKind;
type InvariantTestGasUsage = { kind: "InvariantTestKind" } & InvariantTestKind;

export type GasUsage =
  | StandardTestGasUsage
  | FuzzTestGasUsage
  | InvariantTestGasUsage;

export interface CommonGasUsage {
  medianGas: bigint;
  meanGas: bigint;
  runs: bigint;
}

// NOTE: This is exposed for testing only
export function kindToGasUsage(
  kind: StandardTestKind | FuzzTestKind | InvariantTestKind,
): StandardTestGasUsage | FuzzTestGasUsage | InvariantTestGasUsage {
  let gasUsage:
    | StandardTestGasUsage
    | FuzzTestGasUsage
    | InvariantTestGasUsage
    | undefined;
  if ("consumedGas" in kind) {
    gasUsage = {
      kind: "StandardTestKind",
      ...kind,
    };
  }
  if ("runs" in kind && "meanGas" in kind && "medianGas" in kind) {
    gasUsage = {
      kind: "FuzzTestKind",
      ...kind,
    };
  }
  if ("runs" in kind && "calls" in kind && "reverts" in kind) {
    gasUsage = {
      kind: "InvariantTestKind",
      ...kind,
    };
  }
  assertHardhatInvariant(gasUsage !== undefined, "Unknown test kind");
  return gasUsage;
}

// NOTE: This is exposed for testing only
export function gasUsageToCommonGasUsage(
  gasUsage?: GasUsage,
): CommonGasUsage | undefined {
  if (gasUsage === undefined) {
    return undefined;
  }

  switch (gasUsage.kind) {
    case "StandardTestKind":
      return {
        medianGas: gasUsage.consumedGas,
        meanGas: gasUsage.consumedGas,
        runs: BigInt(1),
      };
    case "FuzzTestKind":
      return {
        medianGas: gasUsage.medianGas,
        meanGas: gasUsage.meanGas,
        runs: gasUsage.runs,
      };
    case "InvariantTestKind":
      return undefined;
  }
}

// NOTE: This is exposed for testing only
export interface Report {
  [contractName: string]: {
    gasUsageByFunctionName: {
      [functionName: string]: GasUsage;
    };
  };
}

// TODO: When we introduce gas reporting for Node tests, we should extract this
// function out of the Solidity test plugin and implement it as a part of
// a reusable GasReportManager. It should be similar to CoverageManager which
// operates on data from all types of test tasks we natively support.
export async function reportGasUsage(
  reportPath: string,
  suiteResults: SuiteResult[],
  snapshot: boolean,
  diff: boolean,
  tolerance?: number,
): Promise<boolean> {
  const report = getReport(suiteResults);

  let previousReport: Report | undefined;
  if (diff || tolerance !== undefined) {
    const jsonReportPath = path.join(reportPath, "gas.json");
    const jsonReportExists = await exists(jsonReportPath);
    if (jsonReportExists) {
      const jsonReport = await readUtf8File(jsonReportPath);
      previousReport = parseJsonReport(jsonReport);
    }
  }

  if (snapshot) {
    const jsonReport = formatJsonReport(report);
    const jsonReportPath = path.join(reportPath, "gas.json");
    await writeUtf8File(jsonReportPath, jsonReport);
    log(`Saved JSON report to ${jsonReportPath}`);

    const snapshotReport = formatSnapshotReport(report);
    const snapshotReportPath = path.join(reportPath, "gas.snapshot");
    await writeUtf8File(snapshotReportPath, snapshotReport);
    log(`Saved snapshot report to ${snapshotReportPath}`);
  }

  let markdownReport: string;
  if (diff) {
    markdownReport = formatMarkdownReport(report, previousReport, tolerance);
  } else {
    markdownReport = formatMarkdownReport(report);
  }
  console.log();
  console.log(markdownReport);
  log("Printed markdown report");

  if (tolerance !== undefined && previousReport !== undefined) {
    return isReportWithinTolerance(report, previousReport, tolerance);
  } else {
    return true;
  }
}

// NOTE: This is exposed for testing only
export function getReport(suiteResults: SuiteResult[]): Report {
  const report: Report = {};
  for (const suiteResult of suiteResults) {
    const gasUsageByFunctionName: Record<string, GasUsage> = {};
    for (const testResult of suiteResult.testResults) {
      gasUsageByFunctionName[testResult.name] = kindToGasUsage(testResult.kind);
    }
    report[suiteResult.id.name] = {
      gasUsageByFunctionName,
    };
  }
  return report;
}

// NOTE: This is exposed for testing only
export function formatJsonReport(report: Report): string {
  return JSON.stringify(
    report,
    (_key, value) => {
      if (typeof value === "bigint") {
        return value.toString();
      } else {
        return value;
      }
    },
    2,
  );
}

// NOTE: This is exposed for testing only
export function parseJsonReport(report: string): Report {
  return JSON.parse(report, (_key, value) => {
    if (typeof value === "string") {
      try {
        return BigInt(value);
      } catch (_error) {
        return value;
      }
    } else {
      return value;
    }
  });
}

// NOTE: This is exposed for testing only
export function formatSnapshotReport(report: Report): string {
  const lines: string[] = [];
  for (const [contractName, { gasUsageByFunctionName }] of Object.entries(
    report,
  )) {
    for (const [functionName, gasUsage] of Object.entries(
      gasUsageByFunctionName,
    )) {
      switch (gasUsage.kind) {
        case "StandardTestKind":
          lines.push(
            `${contractName}::${functionName} (gas: ${gasUsage.consumedGas})`,
          );
          break;
        case "FuzzTestKind":
          lines.push(
            `${contractName}::${functionName} (runs: ${gasUsage.runs}, μ: ${gasUsage.meanGas}, ~: ${gasUsage.medianGas})`,
          );
          break;
        case "InvariantTestKind":
          // NOTE: Invariant tests are not included in the snapshot report
          break;
      }
    }
  }
  return lines.join("\n");
}

function formatMarkdownReportCell(
  value: bigint,
  previousValue?: bigint,
  tolerance?: number,
  colorizer: Colorizer = chalk,
): string {
  if (previousValue === undefined || previousValue === 0n) {
    return value.toString();
  }

  const precision = 3;

  const diff =
    bigIntDiv(value, previousValue, precision) -
    bigIntPadEnd(BigInt(1), precision);
  const diffString = bigIntToString(diff, precision);

  const cell = `${value} (${diffString}%)`;

  if (tolerance === undefined) {
    return cell;
  }

  const absDiff = bigIntAbs(diff);
  const absTolerance = bigIntAbs(bigIntFromNumber(tolerance, precision));

  if (absDiff > absTolerance) {
    return colorizer.red(cell);
  } else if (absDiff === 0n) {
    return colorizer.green(cell);
  } else {
    return colorizer.yellow(cell);
  }
}

function formatMarkdownReportRow(
  functionName: string,
  gasUsage: GasUsage,
  previousGasUsage?: GasUsage,
  tolerance?: number,
  colorizer: Colorizer = chalk,
): string[] | undefined {
  const usage = gasUsageToCommonGasUsage(gasUsage);
  const previousUsage = gasUsageToCommonGasUsage(previousGasUsage);

  if (usage !== undefined) {
    if (previousUsage !== undefined) {
      return [
        functionName,
        formatMarkdownReportCell(
          usage.medianGas,
          previousUsage.medianGas,
          tolerance,
          colorizer,
        ),
        usage.meanGas.toString(),
        usage.runs.toString(),
      ];
    }

    return [
      functionName,
      usage.medianGas.toString(),
      usage.meanGas.toString(),
      usage.runs.toString(),
    ];
  }

  return undefined;
}

// NOTE: This is exposed for testing only
export function formatMarkdownReport(
  report: Report,
  previousReport?: Report,
  tolerance?: number,
  colorizer: Colorizer = chalk,
): string {
  const headerRow = [
    colorizer.bold("Contract / Function Name 📄"),
    colorizer.bold("Median Gas ⛽️"),
    colorizer.bold("Mean Gas ⛽️"),
    colorizer.bold("Runs 👟"),
  ];

  const rows: string[][] = [];

  for (const [contractName, { gasUsageByFunctionName }] of Object.entries(
    report,
  )) {
    if (Object.keys(gasUsageByFunctionName).length === 0) {
      continue;
    }

    rows.push([colorizer.bold(contractName)]);

    for (const [functionName, gasUsage] of Object.entries(
      gasUsageByFunctionName,
    )) {
      const previousGasUsage =
        previousReport?.[contractName]?.gasUsageByFunctionName?.[functionName];
      const row = formatMarkdownReportRow(
        functionName,
        gasUsage,
        previousGasUsage,
        tolerance,
        colorizer,
      );
      if (row !== undefined) {
        rows.push(row);
      }
    }
  }

  return formatMarkdownTable(headerRow, rows, undefined);
}

// NOTE: This is exposed for testing only
export function isReportWithinTolerance(
  report: Report,
  previousReport: Report,
  tolerance: number,
): boolean {
  for (const [contractName, { gasUsageByFunctionName }] of Object.entries(
    report,
  )) {
    if (Object.keys(gasUsageByFunctionName).length === 0) {
      continue;
    }

    for (const [functionName, gasUsage] of Object.entries(
      gasUsageByFunctionName,
    )) {
      const previousGasUsage =
        previousReport?.[contractName]?.gasUsageByFunctionName?.[functionName];

      const usage = gasUsageToCommonGasUsage(gasUsage);
      const previousUsage = gasUsageToCommonGasUsage(previousGasUsage);

      if (
        usage !== undefined &&
        previousUsage !== undefined &&
        previousUsage.medianGas !== 0n
      ) {
        const precision = 3;
        const diff =
          bigIntDiv(usage.medianGas, previousUsage.medianGas, precision) -
          bigIntPadEnd(BigInt(1), precision);
        const absDiff = bigIntAbs(diff);
        const absTolerance = bigIntAbs(bigIntFromNumber(tolerance, precision));

        if (absDiff > absTolerance) {
          return false;
        }
      }
    }
  }

  return true;
}
