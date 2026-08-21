// Wrapper config dropped over the pinned Uniswap V4 core fork's
// hardhat.config.ts by preinstall.sh (which renames the original to
// hardhat.config.base.ts and copies the shared profile factory in as
// ./solx-profiles.ts).
//
// The fork's config uses a profiles map whose DEFAULT profile compiles via IR
// (matching upstream foundry.toml). We re-express it as the benchmark's
// matrix of profiles — {solc, solx} x {legacy, via-IR} — all seeded from the
// default profile's compiler settings. Because the base default has
// `viaIR: true`, the factory's legacy cells explicitly flip it to false (see
// solx-profiles.ts); the base's optimizer settings and
// `metadata.bytecodeHash: "none"` carry over to every cell. The base's
// `debug` profile is dropped. Everything else (paths, test) is preserved
// from the base.
import hardhatSolx from "@nomicfoundation/hardhat-solx";

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
  plugins: [...(base.plugins ?? []), hardhatSolx],
  // The plugin only allows type: "solx" in the profile named "solx"; this
  // benchmark needs a second solx profile ("solx-via-ir") for the viaIR sweep,
  // so opt out of that guard. Throwaway benchmark scenario, not production.
  solx: { dangerouslyAllowSolxInProduction: true },
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
