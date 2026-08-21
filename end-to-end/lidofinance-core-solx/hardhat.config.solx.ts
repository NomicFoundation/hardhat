// Wrapper config dropped over the pinned Lido core fork's hardhat.config.ts
// by preinstall.sh (which renames the original to hardhat.config.base.ts and
// copies the shared profile factory in as ./solx-profiles.ts).
//
// The fork's config compiles five solc versions: the 0.4.24-0.8.9 legacy trees
// plus the modern vaults tree at 0.8.25 (via-IR, cancun). solx only embeds
// 0.8.34, and the older trees predate the 0.8.x language era entirely, so the
// benchmark re-expresses the modern tree as its matrix of profiles, {solc,
// solx} x {legacy, via-IR}, seeded from the base's 0.8.25 settings and
// re-pinned to 0.8.34 (preinstall relaxes that tree's exact pragmas to caret
// ranges; because the settings ship viaIR: true, the factory's legacy cells
// explicitly flip it to false — see solx-profiles.ts). The older trees pass
// through on upstream's own compilers in every profile — including the solx
// ones, where solx handles the tree it can and stock solc handles the rest —
// and contracts/upgrade rides the same way on upstream's own 0.8.25 (see the
// comment above the ballast entries below). That mixed shape is what
// adopting solx would actually look like here, and it keeps every cell
// compiling the same whole source graph instead of a slice of it. One path
// the base declares stays out of every cell — test/, whose contents are
// harnesses and fixtures the base only lists as a source root to reach
// ./test/mocks; the forge cells skip it too.
//
// Upstream ships the vaults tree via-IR only, and it cannot compile any other
// way: SRLib hits stack-too-deep, and RefSlotCache copies a struct array to
// storage, which solc's legacy codegen rejects with an UnimplementedFeatureError
// (IR-only feature). So only the via-IR cells are benchmarked; the legacy/no-opt
// profiles exist for the plugin's mandatory "solx" profile and for
// reproducing the failure (`--build-profile solc-no-opt`), and their FAIL is the
// datum, annotated in render-solx-tables' CELL_NOTES. The contract sizer's
// compile hook would time an unrelated post-compile pass in every cell, so it's
// disabled. Everything else (plugins, tasks, npmFilesToBuild, test, warnings) is
// preserved from the base.
import { readdirSync } from "node:fs";
import path from "node:path";

import hardhatSolx from "@nomicfoundation/hardhat-solx";

import baseConfig from "./hardhat.config.base.ts";
import {
  buildSolxProfiles,
  overrideEntry,
  withPinnedFuzzSeed,
  type SolxProfileCell,
} from "./solx-profiles.ts";

interface CompilerEntry {
  version: string;
  settings: Record<string, unknown>;
}

const base = baseConfig as unknown as {
  plugins: unknown[];
  paths: Record<string, unknown>;
  contractSizer: Record<string, unknown>;
  solidity: {
    npmFilesToBuild: string[];
    compilers: CompilerEntry[];
  };
  [key: string]: unknown;
};

// Upstream's modern-tree compiler; every cell re-pins that tree to 0.8.34
// (the factory's version — the only entry in hardhat-solx's Solidity→solx
// version map).
const MODERN_VERSION = "0.8.25";

// Seed every profile's modern-tree entry from upstream's (optimizer runs 200,
// viaIR: true, evmVersion cancun — cancun is in solx's supported set).
const modernEntry = base.solidity.compilers.find(
  (c) => c.version === MODERN_VERSION,
);
if (modernEntry === undefined) {
  throw new Error(
    `lidofinance-core-solx: no ${MODERN_VERSION} compiler entry in the base config — the pinned commit may have changed`,
  );
}
const baseSettings = modernEntry.settings;

// The legacy trees are benchmark ballast, not a subject: no compiler under
// comparison can build them, so they carry upstream's own settings unchanged
// through every cell and contribute the same cost to each.
const legacyCompilers = base.solidity.compilers.filter(
  (c) => c.version !== MODERN_VERSION,
);
if (legacyCompilers.length === 0) {
  throw new Error(
    "lidofinance-core-solx: no legacy compiler entries in the base config — the pinned commit may have changed",
  );
}

// contracts/upgrade pins the same 0.8.25 as the vaults tree but cannot follow
// it to 0.8.34: UpgradeVoteScript.sol compiles via-IR at upstream's 0.8.25 and
// hits a Yul stack-too-deep ("1 too deep") from solc 0.8.26 on — 0.8.28,
// 0.8.30, 0.8.32 and 0.8.34 all reproduce it, at every optimizer runs value.
// solx 0.1.7 does compile it at 0.8.34 (it spills the stack), but a cell with
// no solc counterpart is not a comparison, so the tree is ballast on
// upstream's own compiler instead, like the older trees: preinstall's pragma
// walker leaves its exact 0.8.25 pragmas alone, and every profile carries
// upstream's 0.8.25 entry verbatim (the modernEntry ballast below). Its
// imports from the relaxed vaults tree compile twice per cell — once at
// 0.8.25 as upgrade dependencies, once at 0.8.34 as the subject — the same
// constant in every column.

// Source roots: every directory under contracts/. Enumerating them rather
// than listing them keeps a new upstream tree from silently falling out of
// the benchmark.
//
// test/ is out: the base lists it as a source root to reach ./test/mocks, but
// its contents are harnesses and fixtures, and --no-tests only excludes what
// the build system scopes as tests. The forge cells skip it to match.
const contractDirs = readdirSync(path.join(import.meta.dirname, "contracts"), {
  withFileTypes: true,
})
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name);
if (!contractDirs.includes("upgrade")) {
  throw new Error(
    "lidofinance-core-solx: contracts/upgrade no longer exists — the pinned commit may have changed; re-check the 0.8.25 ballast entry and preinstall's pragma-walker skip",
  );
}
const sourceRoots = contractDirs.map((dir) => `contracts/${dir}`);

// Test-execution evaluation opt-in (decision 3 of its plan): the benchmark
// cells keep test/ out of the source roots for measurement hygiene and forge
// parity, but the evaluation needs the Mocha suite's harnesses compiled.
// LIDO_BENCH_INCLUDE_TESTS=1 re-adds "test" — fixtures compile with
// upstream's own solc ballast entries, and the ^0.8.25 harnesses follow the
// modern tree to the compiler under test at 0.8.34. Benchmark runs never set
// the variable, so every timed cell is unchanged.
if (process.env.LIDO_BENCH_INCLUDE_TESTS === "1") {
  sourceRoots.push("test");
}

// Upstream's single per-file escape hatch, re-pinned to 0.8.34 and following
// each cell's compiler: VaultHub builds via-IR at optimizer runs 100 in every
// profile (upstream ships it that way to keep the contract under the size
// limit; keeping it in the legacy cells is the aave precedent for per-file
// via-IR overrides).
function vaultHubOverride(cell: SolxProfileCell) {
  return {
    "contracts/0.8.25/vaults/VaultHub.sol": overrideEntry(cell, {
      ...structuredClone(baseSettings),
      optimizer: { enabled: true, runs: 100 },
      viaIR: true,
    }),
  };
}

export default {
  ...base,
  plugins: [...base.plugins, hardhatSolx],
  // The plugin only allows type: "solx" in the profile named "solx"; this
  // benchmark needs a second solx profile ("solx-via-ir") for the viaIR sweep,
  // so opt out of that guard. Throwaway benchmark scenario, not production.
  solx: { dangerouslyAllowSolxInProduction: true },
  // The test-execution evaluation (test-under-solx.ts) pins the
  // solidity-test fuzz seed. The solx and solc control runs then see
  // identical fuzz inputs, and failures reproduce (evaluation decision 6).
  test: withPinnedFuzzSeed(base.test),
  paths: { ...base.paths, sources: { solidity: sourceRoots } },
  // Upstream runs the sizer on every compile unless SKIP_CONTRACT_SIZE is
  // set; it would time an unrelated post-compile pass in every cell.
  contractSizer: { ...base.contractSizer, runOnCompile: false },
  solidity: {
    // The base's Aragon/OZ roots belong to the legacy trees, which every
    // profile still compiles, so they stay part of the build.
    npmFilesToBuild: base.solidity.npmFilesToBuild,
    profiles: buildSolxProfiles({
      baseSettings,
      // Every cell: the legacy trees on upstream's compilers, plus upstream's
      // 0.8.25 for contracts/upgrade (its exact pragmas are the only ones
      // preinstall leaves un-relaxed, so nothing else resolves here — 0.8.34
      // is the max satisfying version for the caret ranges).
      ballastCompilers: [...legacyCompilers, modernEntry],
      overrides: vaultHubOverride,
    }),
  },
};
