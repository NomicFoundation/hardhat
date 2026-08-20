import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const USAGE = `
scripts/benchmark/relax-pragmas.ts — Relax exact solidity pragmas to caret ranges

DESCRIPTION
  Rewrites every \`pragma solidity <x.y.z>;\` in .sol files under the current
  working directory to \`pragma solidity ^<x.y.z>;\`, so sources pinned to an
  older solc also compile at the version the solx benchmark profiles pin
  (0.8.34, the only version in hardhat-solx's Solidity→solx map). Scenario
  preinstall scripts (any end-to-end/ dir with a hardhat.config.solx.ts,
  conventionally named <project>-solx) run it inside the cloned repo
  checkout.

  node_modules and .git are always skipped: node_modules does not even exist
  at preinstall time — dependency pragmas are a prime step's job (see
  end-to-end/1inch-swap-vm-solx/relax-dep-pragmas.cjs) — and .git must never
  be rewritten. Fails loudly when nothing was patched: that means the pinned
  commit changed, and an unexpected source tree should not be benchmarked.

OPTIONS
  --scenario <name>   Required. Scenario name, so logs and failures stay
                      attributable (e.g. aave-v4-solx)
  --from <x.y.z>      Required. The exact pragma version to relax
  --skip-dir <name>   Directory NAME to skip wherever it appears; repeatable.
                      E.g. lib, for submodule checkouts whose pragmas are
                      already ranges and whose edits would break the
                      harness's re-init submodule update
  --skip-path <path>  Path relative to the working directory to skip;
                      repeatable. E.g. contracts/upgrade, for a tree that
                      must keep its exact pragmas

EXAMPLE
  node scripts/benchmark/relax-pragmas.ts --scenario aave-v4-solx --from 0.8.28 --skip-dir lib
`;

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

  const FROM = `pragma solidity ${from};`;
  const TO = `pragma solidity ^${from};`;
  const skipDirs = new Set(["node_modules", ".git", ...extraSkipDirs]);
  // Normalized so "contracts/upgrade/" matches the walker's path.join output.
  const skipPaths = new Set(
    skipPathArgs.map((p) => {
      const normalized = path.normalize(p);
      return normalized.endsWith(path.sep)
        ? normalized.slice(0, -path.sep.length)
        : normalized;
    }),
  );

  let patched = 0;

  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const entryPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!skipDirs.has(entry.name) && !skipPaths.has(entryPath)) {
          walk(entryPath);
        }
      } else if (entry.name.endsWith(".sol")) {
        const source = readFileSync(entryPath, "utf8");
        if (source.includes(FROM)) {
          writeFileSync(entryPath, source.replaceAll(FROM, TO));
          patched++;
        }
      }
    }
  };
  walk(".");

  if (patched === 0) {
    console.error(
      `${scenario} preinstall: no \`${FROM}\` pragmas found — the pinned ` +
        `commit may have changed. Refusing to benchmark an unexpected source tree.`,
    );
    process.exit(1);
  }

  console.log(
    `${scenario} preinstall: relaxed the pinned pragma in ${patched} files`,
  );
}

main();
