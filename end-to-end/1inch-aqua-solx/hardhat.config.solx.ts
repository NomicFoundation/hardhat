// Wrapper config dropped over the pinned 1inch Aqua fork's hardhat.config.ts
// by preinstall.sh (which renames the original to hardhat.config.base.ts and
// copies the shared profile factory in as ./solx-profiles.ts).
//
// The fork's single compiler entry mirrors upstream foundry.toml: via-IR with
// optimizer runs 10_000_000 — upstream ships via-IR only (and its own
// [profile.solx], running solx through forge). We re-express it as the
// benchmark's matrix of profiles — {solc, solx} x {legacy, via-IR} — all
// seeded from that entry's settings; because the base ships viaIR: true, the
// factory's legacy cells explicitly flip it to false (see solx-profiles.ts).
// Neither upstream config nor the base sets evmVersion, so every cell
// inherits Hardhat's default for solc 0.8.34 (osaka) — which also matches
// forge 1.7.1's default for the cross-tool cell. Everything else (paths,
// test) is preserved from the base.
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
      baseSettings: base.solidity.compilers[0].settings,
    }),
  },
};
