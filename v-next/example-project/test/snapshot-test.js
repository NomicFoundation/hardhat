import { execSync } from "child_process";
import { readFileSync, writeFileSync, existsSync } from "fs";
import path from "path";

const GAS_STATS_SNAPSHOT_FILE = "gas-stats";

function getSnapshotPath(snapshotFile) {
  return path.resolve(process.cwd(), ".snapshots", snapshotFile);
}

function runTests() {
  console.log("Running tests...");

  try {
    const output = execSync("pnpm hardhat test nodejs --gas-stats", {
      cwd: import.meta.dirname,
      encoding: "utf8",
      env: {
        ...process.env,
        FORCE_COLOR: "0",
      },
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer
    });

    console.log("--------------- Finished running tests");
    console.log(output);
    console.log("---------------------------------------");
    return output;
  } catch (error) {
    console.log("--------------- Tests failed");
    console.log("Exit code:", error.status);
    console.log("Output:", error.stdout || "");
    console.log("Error:", error.stderr || "");
    console.log("---------------------------------------");
    throw error;
  }
}

function extractGasTable(output) {
  const lines = output.split("\n");
  const start = lines.findIndex((line) =>
    line.includes("Gas Usage Statistics"),
  );

  if (start === -1) {
    return "";
  }

  const end = lines.findIndex((line, i) => i > start && !line.startsWith("|"));
  return lines.slice(start, end === -1 ? undefined : end).join("\n");
}

function showColorizedDiff(expected, actual) {
  const expectedLines = expected.split("\n");
  const actualLines = actual.split("\n");

  console.log("\nSnapshot differs:");
  console.log("\n\x1b[32m+ Expected (snapshot)\x1b[0m");
  console.log("\x1b[31m- Actual (current)\x1b[0m\n");

  const maxLines = Math.max(expectedLines.length, actualLines.length);

  for (let i = 0; i < maxLines; i++) {
    const expectedLine = expectedLines[i] ?? "";
    const actualLine = actualLines[i] ?? "";

    if (expectedLine === actualLine) {
      console.log(`  ${expectedLine}`);
    } else {
      if (expectedLine) {
        console.log(`\x1b[32m+ ${expectedLine}\x1b[0m`);
      }
      if (actualLine) {
        console.log(`\x1b[31m- ${actualLine}\x1b[0m`);
      }
    }
  }
  console.log();
}

async function main() {
  const updateMode = process.argv.includes("--update");

  try {
    const output = runTests();
    const gasTable = extractGasTable(output);
    const gasStatsSnapshotPath = getSnapshotPath(GAS_STATS_SNAPSHOT_FILE);

    if (updateMode) {
      writeFileSync(gasStatsSnapshotPath, gasTable);
      console.log("Snapshot updated");
      return;
    }

    if (!existsSync(gasStatsSnapshotPath)) {
      writeFileSync(gasStatsSnapshotPath, gasTable);
      console.log("Initial snapshot created");
      return;
    }

    const saved = readFileSync(gasStatsSnapshotPath, "utf8");
    if (gasTable === saved) {
      console.log("Snapshot matches");
    } else {
      showColorizedDiff(saved, gasTable);
      process.exit(1);
    }
  } catch (error) {
    console.error("Error:", error.message);
    process.exit(1);
  }
}

main();
