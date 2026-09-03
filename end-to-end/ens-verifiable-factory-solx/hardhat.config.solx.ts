// Wrapper config dropped over the pinned ENS verifiable-factory fork's
// hardhat.config.ts by preinstall.sh (which renames the original to
// hardhat.config.base.ts and copies the shared profile factory in as
// ./solx-profiles.ts).
//
// The fork's config uses the multi-compiler `solidity: { compilers: [...] }`
// shape with a single entry, but hardhat-slang-solx requires a `slang-solx`
// build profile and Hardhat won't mix that shape with a profiles map. So we
// re-express `solidity` as the benchmark's matrix of profiles — {solc, solx} x
// {legacy, via-IR} — all seeded from the base compiler's settings so the only
// differences are the compiler and the viaIR flag (see solx-profiles.ts for
// the matrix and its settings hygiene). Everything else (paths) is preserved
// from the base.
import hardhatSlangSolx from "@nomicfoundation/hardhat-slang-solx";

import baseConfig from "./hardhat.config.base.ts";
import { buildSolxProfiles, withPinnedFuzzSeed } from "./solx-profiles.ts";

const base = baseConfig as unknown as {
  plugins?: unknown[];
  solidity: { compilers: Array<{ settings: Record<string, unknown> }> };
  [key: string]: unknown;
};

export default {
  ...base,
  plugins: [...(base.plugins ?? []), hardhatSlangSolx],
  // The plugin only allows type: "slang-solx" in the profile named
  // "slang-solx"; this benchmark's solx cells live in profiles named after the
  // compiler version they measure, so opt out of that guard. Throwaway
  // benchmark scenario, not production.
  "slang-solx": { dangerouslyAllowSlangSolxInProduction: true },
  // The test-execution evaluation (test-under-solx.ts) pins the
  // solidity-test fuzz seed. The solx and solc control runs then see
  // identical fuzz inputs, and failures reproduce.
  test: withPinnedFuzzSeed(base.test),
  solidity: {
    profiles: buildSolxProfiles({
      baseSettings: base.solidity.compilers[0].settings,
    }),
  },
};
