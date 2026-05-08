import { spawnSync } from "node:child_process";
import { styleText } from "node:util";

import { getRootDir, groupByPackage } from "./lib/file-package.ts";

const ROOT_DIR = getRootDir();
const PREFIX = "[test-file]";
const IS_WINDOWS = process.platform === "win32";

const USAGE = `
test-file - Run individual test file(s) with the workspace's node-test setup.

USAGE
  node scripts/test-file.ts [--only] <file...>
  pnpm test:file [--only] <file...>

DESCRIPTION
  Resolves each test file's owning workspace package, builds that package and
  its dependencies (incremental tsc --build), then invokes node --test with
  tsx/esm and the hardhat-node-test-reporter from inside the package
  directory. Files are grouped by package so a multi-package invocation runs
  one node-test process per package.

  Pass --only to add Node's --test-only flag, mirroring the package-level
  test:only script (use together with .only on a test).

EXAMPLES
  pnpm test:file packages/hardhat/test/utils.ts
  pnpm test:file --only packages/hardhat-utils/test/fs.ts
`;

// Packages whose `test` script doesn't use `node --import tsx/esm --test`.
// These use Mocha or composite runners and aren't supported by test:file.
// Remove entries here once a package migrates to node --test.
const UNSUPPORTED_TEST_RUNNERS = new Set([
  "@nomicfoundation/ignition-ui",
  "@nomicfoundation/hardhat-ignition",
  "@nomicfoundation/ignition-core",
  "@nomicfoundation/example-project",
]);

interface PackageResult {
  name: string;
  failed: boolean;
}

function main(): void {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
    console.log(USAGE);
    process.exit(0);
  }

  let testOnly = false;
  const paths: string[] = [];
  for (const arg of args) {
    if (arg === "--only") {
      testOnly = true;
    } else {
      paths.push(arg);
    }
  }

  if (paths.length === 0) {
    logError("No test files specified");
    process.exit(1);
  }

  let groups;
  try {
    groups = groupByPackage(paths);
  } catch (error) {
    logError((error as Error).message);
    process.exit(1);
  }

  const unsupported = [...groups.values()]
    .map((g) => g.pkg.name)
    .filter((name) => UNSUPPORTED_TEST_RUNNERS.has(name));
  if (unsupported.length > 0) {
    logError(
      `${unsupported.join(", ")} ${unsupported.length === 1 ? "doesn't" : "don't"} use node --test (Mocha or composite runner). ` +
        `Run \`pnpm test\` in the package directory instead.`,
    );
    process.exit(1);
  }

  const results: PackageResult[] = [];

  for (const { pkg, files } of groups.values()) {
    log(`Testing ${files.length} file(s) in ${styleText("bold", pkg.name)}`);

    log(`Building ${pkg.name} and its deps...`);
    const buildResult = spawnSync(
      "pnpm",
      ["--filter", `${pkg.name}...`, "run", "--if-present", "build"],
      {
        cwd: ROOT_DIR,
        stdio: ["ignore", "pipe", "pipe"],
        encoding: "utf-8",
        maxBuffer: 50 * 1024 * 1024,
        shell: IS_WINDOWS,
      },
    );
    if (buildResult.status !== 0) {
      process.stdout.write(buildResult.stdout ?? "");
      process.stderr.write(buildResult.stderr ?? "");
      logError(`Build failed for ${pkg.name}`);
      process.exit(1);
    }

    const nodeArgs = [
      "--import",
      "tsx/esm",
      "--test",
      "--test-reporter=@nomicfoundation/hardhat-node-test-reporter",
    ];
    if (testOnly) {
      nodeArgs.push("--test-only");
    }
    nodeArgs.push(...files);

    const testResult = spawnSync("node", nodeArgs, {
      cwd: pkg.path,
      stdio: "inherit",
      shell: IS_WINDOWS,
    });

    results.push({ name: pkg.name, failed: testResult.status !== 0 });
  }

  printSummary(results);

  const failed = results.some((r) => r.failed);
  process.exit(failed ? 1 : 0);
}

function printSummary(results: PackageResult[]): void {
  if (results.length < 2) {
    return;
  }

  const allPassed = results.every((r) => !r.failed);

  if (allPassed) {
    log(`All ${results.length} package(s) passed`);
    return;
  }

  log(styleText("bold", "Summary:"));
  for (const r of results) {
    if (r.failed) {
      console.log(`  ${styleText("red", "✗")} ${r.name} — tests failed`);
    } else {
      console.log(`  ${styleText("green", "✓")} ${r.name} — passed`);
    }
  }
}

function log(msg: string): void {
  console.log(`${styleText("cyan", PREFIX)} ${msg}`);
}

function logError(msg: string): void {
  console.error(styleText("red", `${PREFIX} Error: ${msg}`));
}

if (import.meta.main) {
  main();
}
