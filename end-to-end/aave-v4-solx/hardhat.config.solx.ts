// Wrapper config dropped over the pinned Aave v4 fork's hardhat.config.ts by
// preinstall.sh (which renames the original to hardhat.config.base.ts and
// copies the shared profile factory in as ./solx-profiles.ts).
//
// The fork's config already uses a profiles map, so we re-express it as the
// benchmark's matrix of profiles — {solc, solx} x {legacy, via-IR} — all
// seeded from the default profile's compiler settings so the only differences
// are the compiler and the viaIR flag (see solx-profiles.ts). The base's
// coverage profile is dropped, but its two per-file viaIR overrides
// (src/hub/Hub.sol, src/spoke/instances/SpokeInstance.sol) are kept in the
// legacy cells: upstream never builds those contracts through the legacy
// pipeline — solc rejects them with stack-too-deep, and solx "resolves" the
// same error by re-running full LLVM passes with a memory spill area, which
// took 30+ min wall on aave-v4 — so uniform legacy cells would benchmark a
// configuration no user ships. The via-IR cells compile everything via-IR
// and need no overrides. Everything else (plugins, paths, networks, test) is
// preserved from the base.
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
  solidity: {
    profiles: {
      default: { compilers: Array<{ settings: Record<string, unknown> }> };
    };
  };
  [key: string]: unknown;
};

const baseSettings = base.solidity.profiles.default.compilers[0].settings;

// Upstream's per-file escape hatches, re-pinned to 0.8.34 and following each
// cell's compiler; optimizer runs match the base config's overrides. Legacy
// cells only — including solc-no-opt: the two files don't compile through
// plain legacy solc at any optimizer setting — the via-IR cells compile
// everything via-IR (see the header).
function upstreamViaIROverrides(cell: SolxProfileCell) {
  if (cell.viaIR) {
    return undefined;
  }
  const override = (runs: number) =>
    overrideEntry(cell, {
      ...structuredClone(baseSettings),
      optimizer: { enabled: true, runs },
      viaIR: true,
    });
  return {
    "src/hub/Hub.sol": override(22_300),
    "src/spoke/instances/SpokeInstance.sol": override(750),
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
  solidity: {
    profiles: buildSolxProfiles({
      baseSettings,
      overrides: upstreamViaIROverrides,
    }),
  },
};
