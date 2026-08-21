// Wrapper config dropped over the pinned solady fork's hardhat.config.ts by
// preinstall.sh (which renames the original to hardhat.config.base.ts and
// copies the shared profile factory in as ./solx-profiles.ts).
//
// The fork's default profile mirrors upstream's [profile.post_osaka] CI
// profile (osaka; upstream's paris default profile depends on `skip` globs
// Hardhat can't express — see the fork's config header). We re-express it as
// the benchmark's matrix of profiles — {solc, solx} x {legacy, via-IR} — all
// seeded from the default profile's compiler settings so the only differences
// are the compiler and the viaIR flag (see solx-profiles.ts).
//
// The scenario has NO cell for the factory's solc-no-opt profile:
// test/RedBlackTree.t.sol (1 of 246 files) hits stack-too-deep when
// RedBlackTreeLib's inline assembly is inlined without the optimizer, and
// upstream only ships optimizer = true — the failure is the datum (see the
// OZ scenario for the same pattern). The profile stays so the failure is
// reproducible: `npx hardhat compile --build-profile solc-no-opt`.
//
// Everything else (paths, test) is preserved from the base.
import hardhatSlangSolx from "@nomicfoundation/hardhat-slang-solx";

import baseConfig from "./hardhat.config.base.ts";
import { buildSolxProfiles, withPinnedFuzzSeed } from "./solx-profiles.ts";

const base = baseConfig as unknown as {
  plugins?: unknown[];
  solidity: {
    profiles: {
      default: { compilers: Array<{ settings: Record<string, unknown> }> };
    };
  };
  [key: string]: unknown;
};

export default {
  ...base,
  plugins: [...(base.plugins ?? []), hardhatSlangSolx],
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
      baseSettings: base.solidity.profiles.default.compilers[0].settings,
    }),
  },
};
