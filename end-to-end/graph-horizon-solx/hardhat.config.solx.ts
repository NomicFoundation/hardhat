// Wrapper config dropped over packages/horizon/hardhat.config.ts of the
// pinned graphprotocol contracts fork by preinstall.sh (which renames the
// original to hardhat.config.base.ts). Unlike the other solx scenarios this
// repo is a pnpm monorepo; the wrapper lives inside packages/horizon, so
// import.meta.dirname-relative paths work exactly as in the single-package
// scenarios.
//
// The fork's config has two profiles: a fast `default` (0.8.35, no optimizer,
// no via-IR) for iteration and `production` (0.8.35, optimizer runs 100,
// via-IR, cancun — from @graphprotocol/toolshed's base config), the deployed
// configuration. We seed the benchmark's matrix of profiles — {solc, solx} x
// {legacy, via-IR} — from the production settings, re-pinned to 0.8.34 (the
// only version in hardhat-solx's Solidity→solx map; contracts and tests
// carry ^0.8.27-style range pragmas, so no source patching). Upstream's fast
// `default` profile is intentionally replaced: the wrapper's `default` is the
// production-derived legacy cell, and the optimizer-off datum lives in
// `solc-no-opt`. npmFilesToBuild (the two OZ proxy roots) is part of
// upstream's build and is kept in every profile. Everything else (plugins,
// tasks, networks, paths, typechain) is preserved from the base.
import path from "node:path";

import hardhatSolx from "@nomicfoundation/hardhat-solx";
import baseConfig from "./hardhat.config.base.ts";

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

// Independent settings objects per profile so the solx profiles can't bleed into
// the solc profile. The solx optimization level (-O1) and DWARF debug info both
// come from the hardhat-solx plugin defaults: DWARF is force-emitted, so solx
// maps sources just as solc does (Hardhat force-emits solc sourceMaps), keeping
// the comparison apples-to-apples. We intentionally don't override the optimizer
// here so the benchmark measures the realistic plugin-default config.
const baseSettings = base.solidity.profiles.production?.settings;
if (baseSettings === undefined) {
  throw new Error(
    "graph-horizon-solx: no production profile in the base config — the pinned commit may have changed",
  );
}

const solcViaIRSettings = structuredClone(baseSettings);
const solxViaIRSettings = structuredClone(baseSettings);

// Legacy variants: same settings, only `viaIR` flips (the production default
// is IR). Both solc and solx read `settings.viaIR` (there is no `--via-ir`
// CLI flag — it's config-only).
const solcSettings = { ...structuredClone(baseSettings), viaIR: false };
const solxSettings = { ...structuredClone(baseSettings), viaIR: false };

// Optimizer-off legacy solc — the Foundry test-run default and solc at its
// fastest, so it's the real-world compile-time bar for a test-only compiler.
// (Also the closest cell to upstream's own fast `default` profile.)
const solcNoOptSettings = {
  ...structuredClone(solcSettings),
  optimizer: { enabled: false },
};

// The "solx" profiles always measure the version the plugin ships (its
// Solidity→solx version map). The "solx-0.1.7" profiles pin a release under
// comparison via the plugin's `path` compiler option; preinstall.sh downloads
// the binary (see scripts/benchmark/download-solx.ts).
const solx017Path = path.join(import.meta.dirname, ".solx", "solx-v0.1.7");

export default {
  ...base,
  plugins: [...base.plugins, hardhatSolx],
  // The plugin only allows type: "solx" in the profile named "solx"; this
  // benchmark needs a second solx profile ("solx-via-ir") for the viaIR sweep,
  // so opt out of that guard. Throwaway benchmark scenario, not production.
  solx: { dangerouslyAllowSolxInProduction: true },
  solidity: {
    npmFilesToBuild: base.solidity.npmFilesToBuild,
    profiles: {
      default: { version: "0.8.34", settings: solcSettings },
      "solc-no-opt": { version: "0.8.34", settings: solcNoOptSettings },
      "solc-via-ir": { version: "0.8.34", settings: solcViaIRSettings },
      solx: { type: "solx", version: "0.8.34", settings: solxSettings },
      "solx-via-ir": {
        type: "solx",
        version: "0.8.34",
        settings: solxViaIRSettings,
      },
      "solx-0.1.7": {
        type: "solx",
        version: "0.8.34",
        path: solx017Path,
        settings: structuredClone(solxSettings),
      },
      "solx-0.1.7-via-ir": {
        type: "solx",
        version: "0.8.34",
        path: solx017Path,
        settings: structuredClone(solxViaIRSettings),
      },
    },
  },
};
