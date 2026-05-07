import { spawnSync } from "node:child_process";
import { styleText } from "node:util";

import { getRootDir, groupByPackage } from "./lib/file-package.ts";

const ROOT_DIR = getRootDir();
const PREFIX = "[lint-file]";
const IS_WINDOWS = process.platform === "win32";

interface PackageResult {
  name: string;
  prettierFailed: boolean;
  eslintFailed: boolean;
}

function main(): void {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
    printUsage();
    process.exit(args.length === 0 ? 1 : 0);
  }

  let groups;
  try {
    groups = groupByPackage(args);
  } catch (error) {
    logError((error as Error).message);
    process.exit(1);
  }

  const results: PackageResult[] = [];

  for (const { pkg, files } of groups.values()) {
    log(`Linting ${files.length} file(s) in ${styleText("bold", pkg.name)}`);

    log(`Building ${pkg.name} and its deps...`);
    const buildResult = spawnSync(
      "pnpm",
      ["--filter", `${pkg.name}...`, "build"],
      {
        cwd: ROOT_DIR,
        stdio: ["ignore", "pipe", "pipe"],
        encoding: "utf-8",
        shell: IS_WINDOWS,
      },
    );
    if (buildResult.status !== 0) {
      process.stdout.write(buildResult.stdout ?? "");
      process.stderr.write(buildResult.stderr ?? "");
      logError(`Build failed for ${pkg.name}`);
      process.exit(1);
    }

    const prettierResult = spawnSync(
      "pnpm",
      ["exec", "prettier", "--check", ...files],
      { cwd: pkg.path, stdio: "inherit", shell: IS_WINDOWS },
    );

    const eslintResult = spawnSync("pnpm", ["exec", "eslint", ...files], {
      cwd: pkg.path,
      stdio: "inherit",
      shell: IS_WINDOWS,
    });

    results.push({
      name: pkg.name,
      prettierFailed: prettierResult.status !== 0,
      eslintFailed: eslintResult.status !== 0,
    });
  }

  printSummary(results);

  const failed = results.some((r) => r.prettierFailed || r.eslintFailed);
  process.exit(failed ? 1 : 0);
}

function printSummary(results: PackageResult[]): void {
  if (results.length < 2) {
    return;
  }

  const allPassed = results.every((r) => !r.prettierFailed && !r.eslintFailed);

  if (allPassed) {
    log(`All ${results.length} package(s) passed`);
    return;
  }

  log(styleText("bold", "Summary:"));
  for (const r of results) {
    if (!r.prettierFailed && !r.eslintFailed) {
      console.log(`  ${styleText("green", "✓")} ${r.name} — passed`);
    } else {
      const parts: string[] = [];
      if (r.prettierFailed) parts.push("prettier");
      if (r.eslintFailed) parts.push("eslint");
      console.log(
        `  ${styleText("red", "✗")} ${r.name} — ${parts.join(" + ")} failed`,
      );
    }
  }
}

function printUsage(): void {
  console.log(`
lint-file - Run prettier --check and eslint on individual files within a workspace package.

USAGE
  node scripts/lint-file.ts <file...>
  pnpm lint:file <file...>

DESCRIPTION
  Resolves each file's owning workspace package, builds that package and its
  dependencies (incremental tsc --build, ~100ms no-op when up to date), and
  then runs prettier and eslint on the files. Files are grouped by package so
  multi-package invocations work in a single command.

  Exits 0 only if every file passes both prettier and eslint. The aggregate
  command (pnpm lint at the repo root) is still the right call when you want
  full coverage.

EXAMPLES
  pnpm lint:file packages/hardhat/src/internal/cli/main.ts
  pnpm lint:file packages/hardhat/src/a.ts packages/hardhat-utils/src/b.ts
`);
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
