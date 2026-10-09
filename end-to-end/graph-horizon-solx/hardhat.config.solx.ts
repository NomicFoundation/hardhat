// Wrapper config dropped over packages/horizon/hardhat.config.ts of the
// pinned graphprotocol contracts fork by preinstall.sh (which renames the
// original to hardhat.config.base.ts and copies the shared profile factory
// in as ./solx-profiles.ts). Unlike the other solx scenarios this repo is a
// pnpm monorepo; the wrapper and factory live inside packages/horizon, so
// import.meta.dirname-relative paths work exactly as in the single-package
// scenarios.
//
// The fork's config has two profiles: a fast `default` (0.8.35, no optimizer,
// no via-IR) for iteration and `production` (0.8.35, optimizer runs 100,
// via-IR, cancun — from @graphprotocol/toolshed's base config), the deployed
// configuration. We seed the benchmark's matrix of profiles — {solc, solx} x
// {legacy, via-IR} — from the production settings, re-pinned to 0.8.34 (the
// only version in hardhat-slang-solx's Solidity→solx map; contracts and tests
// carry ^0.8.27-style range pragmas, so no source patching). Because the
// production settings ship viaIR: true, the factory's legacy cells
// explicitly flip it to false (see solx-profiles.ts). Upstream's fast
// `default` profile is intentionally replaced: the wrapper's `default` is
// the production-derived legacy cell, and the optimizer-off datum lives in
// `solc-no-opt`. npmFilesToBuild (the two OZ proxy roots) is part of
// upstream's build and is kept in every profile. Everything else (plugins,
// tasks, networks, paths, typechain) is preserved from the base.
import hardhatSlangSolx from "@nomicfoundation/hardhat-slang-solx";

import baseConfig from "./hardhat.config.base.ts";
import { buildSolxProfiles, withPinnedFuzzSeed } from "./solx-profiles.ts";

const base = baseConfig as unknown as {
  plugins: unknown[];
  solidity: {
    npmFilesToBuild: string[];
    profiles: {
      production: { version: string; settings: Record<string, unknown> };
    };
  };
  [key: string]: unknown;
};

const baseSettings = base.solidity.profiles.production?.settings;
if (baseSettings === undefined) {
  throw new Error(
    "graph-horizon-solx: no production profile in the base config — the pinned commit may have changed",
  );
}

export default {
  ...base,
  plugins: [...base.plugins, hardhatSlangSolx],
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
    npmFilesToBuild: base.solidity.npmFilesToBuild,
    profiles: buildSolxProfiles({ baseSettings }),
  },
};
