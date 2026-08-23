import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const USAGE = `
scripts/benchmark/relax-pragmas.ts — Relax exact solidity pragmas to caret ranges

DESCRIPTION
  Rewrites every \`pragma solidity <x.y.z>;\` in .sol files under the current
  working directory to \`pragma solidity ^<x.y.z>;\`, so sources pinned to an
  older solc also compile at the version the solx benchmark profiles pin
  (0.8.34, the only version in hardhat-slang-solx's Solidity→solx map).
  Scenario
  preinstall scripts (any end-to-end/ dir with a hardhat.config.solx.ts,
  conventionally named <project>-solx) run it inside the cloned repo
  checkout.

  node_modules and .git are always skipped: node_modules does not even exist
  at preinstall time — dependency pragmas are a prime step's job (see
  end-to-end/1inch-swap-vm-solx/relax-dep-pragmas.cjs) — and .git must never
  be rewritten. Fails loudly when nothing was patched: that means the pinned
  commit changed, and an unexpected source tree should not be benchmarked.
  Fails just as loudly when a --skip-dir or --skip-path never matched
  anything: a typo'd or upstream-renamed skip stops protecting the tree it
  was added for, silently.

OPTIONS
  --scenario <name>   Required. Scenario name, so logs and failures stay
                      attributable (e.g. aave-v4-solx)
  --from <x.y.z>      Required. The exact pragma version to relax
  --skip-dir <name>   Directory NAME to skip wherever it appears; repeatable.
                      E.g. lib, for submodule checkouts whose pragmas are
                      already ranges and whose edits would break the
                      harness's re-init submodule update. Must match at
                      least one directory
  --skip-path <path>  Path relative to the working directory to skip;
                      repeatable. E.g. contracts/upgrade, for a tree that
                      must keep its exact pragmas. Must match at least one
                      directory

EXAMPLE
  node scripts/benchmark/relax-pragmas.ts --scenario aave-v4-solx --from 0.8.28 --skip-dir lib
`;

export interface RelaxOptions {
  /** Scenario name, so failures stay attributable. */
  scenario: string;
  /** The exact pragma version to relax. */
  from: string;
  skipDirs: string[];
  skipPaths: string[];
}

const ALWAYS_SKIPPED_DIRS = new Set(["node_modules", ".git"]);

/**
 * Rewrites the exact pragmas under `root` in place, returning the number of
 * patched files. Throws when nothing was patched, and when a skip value
 * matched no directory during the walk.
 */
export function relaxPragmas(root: string, options: RelaxOptions): number {
  const FROM = `pragma solidity ${options.from};`;
  const TO = `pragma solidity ^${options.from};`;
  const skipDirs = new Set(options.skipDirs);
  // Normalized so "contracts/upgrade/" matches the walker's path.join output.
  const skipPaths = new Set(
    options.skipPaths.map((p) => {
      const normalized = path.normalize(p);
      return normalized.endsWith(path.sep)
        ? normalized.slice(0, -path.sep.length)
        : normalized;
    }),
  );

  const unmatchedSkipDirs = new Set(skipDirs);
  const unmatchedSkipPaths = new Set(skipPaths);
  let patched = 0;

  const walk = (relativeDir: string): void => {
    const entries = readdirSync(path.join(root, relativeDir), {
      withFileTypes: true,
    });
    for (const entry of entries) {
      const entryPath = path.join(relativeDir, entry.name);
      if (entry.isDirectory()) {
        if (ALWAYS_SKIPPED_DIRS.has(entry.name)) {
          continue;
        }
        unmatchedSkipDirs.delete(entry.name);
        unmatchedSkipPaths.delete(entryPath);
        if (!skipDirs.has(entry.name) && !skipPaths.has(entryPath)) {
          walk(entryPath);
        }
      } else if (entry.name.endsWith(".sol")) {
        const filePath = path.join(root, entryPath);
        const source = readFileSync(filePath, "utf8");
        if (source.includes(FROM)) {
          writeFileSync(filePath, source.replaceAll(FROM, TO));
          patched++;
        }
      }
    }
  };
  walk(".");

  if (patched === 0) {
    throw new Error(
      `${options.scenario} preinstall: no \`${FROM}\` pragmas found — the ` +
        `pinned commit may have changed. Refusing to benchmark an unexpected ` +
        `source tree.`,
    );
  }

  const unmatched = [
    ...[...unmatchedSkipDirs].map((dir) => `--skip-dir ${dir}`),
    ...[...unmatchedSkipPaths].map((p) => `--skip-path ${p}`),
  ];
  if (unmatched.length > 0) {
    throw new Error(
      `${options.scenario} preinstall: ${unmatched.join(", ")} matched no ` +
        `directory — the pinned commit may have renamed it. Refusing to ` +
        `relax a tree the skip was added to protect.`,
    );
  }

  return patched;
}

function main(): void {
  const argv = process.argv.slice(2);
  if (argv.length === 0) {
    console.log(USAGE);
    process.exit(1);
  }

  const KNOWN_FLAGS = ["--scenario", "--from", "--skip-dir", "--skip-path"];
  const fail = (message: string): never => {
    console.error(`relax-pragmas: ${message}`);
    console.error(USAGE);
    process.exit(1);
  };

  let scenario: string | undefined;
  let from: string | undefined;
  const extraSkipDirs: string[] = [];
  const skipPathArgs: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i];
    if (!KNOWN_FLAGS.includes(flag)) {
      // A typo'd flag must not degrade into a laxer run (e.g. a misspelled
      // --skip-path would silently relax a protected tree).
      fail(`unknown option "${flag}" (known: ${KNOWN_FLAGS.join(", ")})`);
    }
    const value = argv[i + 1];
    if (value === undefined || value.startsWith("--")) {
      fail(`${flag} requires a value`);
    }
    i++;
    if (flag === "--scenario") {
      scenario = value;
    } else if (flag === "--from") {
      from = value;
    } else if (flag === "--skip-dir") {
      extraSkipDirs.push(value);
    } else {
      skipPathArgs.push(value);
    }
  }

  if (scenario === undefined) {
    fail("--scenario is required");
  }
  if (from === undefined) {
    fail("--from is required");
  }
  if (!/^\d+\.\d+\.\d+$/.test(from)) {
    fail(`--from must be x.y.z (got "${from}")`);
  }

  let patched: number;
  try {
    patched = relaxPragmas(process.cwd(), {
      scenario,
      from,
      skipDirs: extraSkipDirs,
      skipPaths: skipPathArgs,
    });
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }

  console.log(
    `${scenario} preinstall: relaxed the pinned pragma in ${patched} files`,
  );
}

if (process.argv[1] === import.meta.filename) {
  main();
}
