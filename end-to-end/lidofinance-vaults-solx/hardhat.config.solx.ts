// Wrapper config dropped over the pinned Lido core fork's hardhat.config.ts
// by preinstall.sh (which renames the original to hardhat.config.base.ts and
// copies the shared profile factory in as ./solx-profiles.ts).
//
// One of two lido scenarios answering different questions. The
// lidofinance-core-solx scenario measures the whole-repo adoption cost:
// every cell compiles all five of upstream's compiler trees, so its wall
// clock is dominated by legacy ballast no compiler under test can touch.
// This scenario is the like-for-like compiler comparison: identical sources
// to both compilers at 0.8.34, only the compiler varies. It scopes sources
// to the modern vaults tree (contracts/0.8.25) — the one tree lido could
// realistically move to solx — and re-expresses it as the benchmark's matrix
// of profiles, {solc, solx} x {legacy, via-IR}, all seeded from the base's
// 0.8.25 compiler settings and re-pinned to 0.8.34 (the only version in
// hardhat-slang-solx's Solidity→solx map; preinstall relaxes the exact
// pragmas to caret ranges, and because the settings ship viaIR: true the
// factory's legacy cells explicitly flip it to false — see solx-profiles.ts).
// The
// tree's transitive imports (contracts/common, vendored + npm OpenZeppelin)
// carry range pragmas and compile at 0.8.34 unpatched.
//
// LIDO_BENCH_SOURCES=upgrade redirects the build to contracts/upgrade
// instead: that tree builds via-IR at upstream's 0.8.25 but hits a Yul
// stack-too-deep from solc 0.8.26 on (every optimizer setting), while solx
// builds it at 0.8.34 by spilling the stack — so the benchmark times the
// solx cell and annotates solc's FAIL as the datum (the "via-IR, upgrade
// tree" row in render-solx-tables). The whole-repo scenario instead keeps
// that tree on upstream's own 0.8.25 in every cell.
//
// Upstream ships the vaults tree via-IR only, and it cannot compile any
// other way: SRLib hits stack-too-deep, and RefSlotCache copies a struct
// array to storage, which solc's legacy codegen rejects with an
// UnimplementedFeatureError (IR-only feature).
// So only the via-IR cells are benchmarked; the legacy/no-opt profiles exist
// for reproducing the failure (`--build-profile solc-no-opt`), and their FAIL
// is the datum, annotated in render-solx-tables' CELL_NOTES. The base's
// npmFilesToBuild (Aragon/OZ roots) belong to the dropped legacy trees; the
// contract sizer's compile
// hook would time an unrelated post-compile pass in every cell, so it's
// disabled. Everything else (plugins, tasks, test, warnings) is preserved
// from the base.
import hardhatSlangSolx from "@nomicfoundation/hardhat-slang-solx";

import baseConfig from "./hardhat.config.base.ts";
import {
  buildSolxProfiles,
  overrideEntry,
  withPinnedFuzzSeed,
  type SolxProfileCell,
} from "./solx-profiles.ts";

const base = baseConfig as unknown as {
  plugins: unknown[];
  paths: Record<string, unknown>;
  contractSizer: Record<string, unknown>;
  solidity: {
    compilers: Array<{ version: string; settings: Record<string, unknown> }>;
  };
  [key: string]: unknown;
};

// Seed every profile from upstream's modern-tree entry (optimizer runs 200,
// viaIR: true, evmVersion cancun — cancun is in solx's supported set).
const modernEntry = base.solidity.compilers.find((c) => c.version === "0.8.25");
if (modernEntry === undefined) {
  throw new Error(
    "lidofinance-vaults-solx: no 0.8.25 compiler entry in the base config — the pinned commit may have changed",
  );
}
const baseSettings = modernEntry.settings;

// Source scope, switched per cell by scenario.json (see the header comment).
function benchSources(): string[] {
  const scope = process.env.LIDO_BENCH_SOURCES ?? "vaults";
  const sources: Record<string, string[]> = {
    vaults: ["contracts/0.8.25"],
    upgrade: ["contracts/upgrade"],
  };
  const selected = sources[scope];
  if (selected === undefined) {
    throw new Error(
      `lidofinance-vaults-solx: unknown LIDO_BENCH_SOURCES "${scope}" — expected ${Object.keys(sources).join(" or ")}`,
    );
  }
  return selected;
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
  plugins: [...base.plugins, hardhatSlangSolx],
  // The plugin only allows type: "slangSolx" in the profile named
  // "slangSolx"; this benchmark's solx cells live in profiles named after the
  // compiler version they measure, so opt out of that guard. Throwaway
  // benchmark scenario, not production.
  slangSolx: { dangerouslyAllowSlangSolxInProduction: true },
  // The test-execution evaluation (test-under-solx.ts) pins the
  // solidity-test fuzz seed. The solx and solc control runs then see
  // identical fuzz inputs, and failures reproduce.
  test: withPinnedFuzzSeed(base.test),
  // Scope to the modern tree, or to contracts/upgrade for the upgrade-tree
  // cells (see the header comment). test/ stays out via --no-tests on every
  // cell: paths.tests.solidity defaults to test/, whose fixtures span
  // 0.4.24-0.8.9.
  paths: { ...base.paths, sources: { solidity: benchSources() } },
  // Upstream runs the sizer on every compile unless SKIP_CONTRACT_SIZE is
  // set; it would time an unrelated post-compile pass in every cell.
  contractSizer: { ...base.contractSizer, runOnCompile: false },
  solidity: {
    // No npmFilesToBuild on purpose: the base's Aragon/OZ roots belong to the
    // legacy trees; the modern tree's OpenZeppelin needs are ordinary imports
    // that Hardhat resolves automatically.
    profiles: buildSolxProfiles({
      baseSettings,
      overrides: vaultHubOverride,
    }),
  },
};
