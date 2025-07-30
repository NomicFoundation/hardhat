import type {
  FuzzTestKind,
  InvariantTestKind,
  StandardTestKind,
  SuiteResult,
} from "@nomicfoundation/edr";

import path from "node:path";

import { assertHardhatInvariant } from "@nomicfoundation/hardhat-errors";
import { formatMarkdownTable } from "@nomicfoundation/hardhat-utils/format";
import { writeUtf8File } from "@nomicfoundation/hardhat-utils/fs";
import chalk from "chalk";
import debug from "debug";

const log = debug("hardhat:solidity-test:gas-reporter");

type StandardTestGasUsage = { kind: "StandardTestKind" } & StandardTestKind;
type FuzzTestGasUsage = { kind: "FuzzTestKind" } & FuzzTestKind;
type InvariantTestGasUsage = { kind: "InvariantTestKind" } & InvariantTestKind;

export type GasUsage =
  | StandardTestGasUsage
  | FuzzTestGasUsage
  | InvariantTestGasUsage;

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
): Promise<void> {
  const report = getReport(suiteResults);

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

  const markdownReport = formatMarkdownReport(report);
  console.log();
  console.log(markdownReport);
  log("Printed markdown report");
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
  return JSON.stringify(report, (_, value) => {
    if (typeof value === "bigint") {
      return value.toString();
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

// NOTE: This is exposed for testing only
export function formatMarkdownReport(report: Report): string {
  const headerRow = [
    chalk.bold("Contract / Function Name 📄"),
    chalk.bold("Median Gas ⛽️"),
    chalk.bold("Mean Gas ⛽️"),
    chalk.bold("Runs 👟"),
  ];

  const rows: string[][] = [];

  for (const [contractName, { gasUsageByFunctionName }] of Object.entries(
    report,
  )) {
    if (Object.keys(gasUsageByFunctionName).length === 0) {
      continue;
    }

    rows.push([chalk.bold(contractName)]);

    for (const [functionName, gasUsage] of Object.entries(
      gasUsageByFunctionName,
    )) {
      switch (gasUsage.kind) {
        case "StandardTestKind":
          rows.push([
            functionName,
            gasUsage.consumedGas.toString(),
            gasUsage.consumedGas.toString(),
            "1",
          ]);
          break;
        case "FuzzTestKind":
          rows.push([
            functionName,
            gasUsage.medianGas.toString(),
            gasUsage.meanGas.toString(),
            gasUsage.runs.toString(),
          ]);
          break;
        case "InvariantTestKind":
          // NOTE: Invariant tests are not included in the markdown report
          break;
      }
    }
  }

  return formatMarkdownTable(headerRow, rows, undefined);
}
