// Wrapper config dropped over the pinned 1inch SwapVM fork's
// hardhat.config.ts by preinstall.sh (which renames the original to
// hardhat.config.base.ts and copies the shared profile factory in as
// ./solx-profiles.ts).
//
// The fork's single compiler entry mirrors upstream foundry.toml: via-IR with
// optimizer runs 700 and custom Yul optimizerSteps — this repo is genuinely
// via-IR-forced upstream. We re-express it as the benchmark's matrix of
// profiles — {solc, solx} x {legacy, via-IR} — all seeded from that entry's
// settings; because the base ships viaIR: true, the factory's legacy cells
// explicitly flip it to false (see solx-profiles.ts). The Yul optimizerSteps
// ride along in every cell: solc honors them on the via-IR pipeline, solx
// parses and ignores them (its LLVM pipeline replaces Yul optimization) —
// each compiler measured at its realistic pipeline. Everything else (paths,
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
