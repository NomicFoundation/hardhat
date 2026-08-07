// Wrapper config dropped over the pinned solady fork's hardhat.config.ts by
// preinstall.sh (which renames the original to hardhat.config.base.ts).
//
// The fork's default profile mirrors upstream's [profile.post_osaka] CI
// profile (osaka; upstream's paris default profile depends on `skip` globs
// Hardhat can't express — see the fork's config header). We re-express it as
// the benchmark's matrix of profiles — {solc, solx} x {legacy, via-IR} — all
// seeded from the default profile's compiler settings so the only differences
// are the compiler and the viaIR flag. Everything else (paths, test) is
// preserved from the base.
import path from "node:path";

import hardhatSolx from "@nomicfoundation/hardhat-solx";
import baseConfig from "./hardhat.config.base.ts";

const base = baseConfig as unknown as {
  plugins?: unknown[];
  solidity: {
    profiles: {
      default: { compilers: Array<{ settings: Record<string, unknown> }> };
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
const baseSettings = base.solidity.profiles.default.compilers[0].settings;
const solcSettings = structuredClone(baseSettings);
const solxSettings = structuredClone(baseSettings);

// via-IR variants: same settings, only `viaIR` flips. Both solc and solx read
// `settings.viaIR` (there is no `--via-ir` CLI flag — it's config-only).
const solcViaIRSettings = { ...structuredClone(solcSettings), viaIR: true };
const solxViaIRSettings = { ...structuredClone(solxSettings), viaIR: true };

// Optimizer-off legacy solc — the Foundry test-run default. The scenario has
// NO cell for this profile: test/RedBlackTree.t.sol (1 of 246 files) hits
// stack-too-deep when RedBlackTreeLib's inline assembly is inlined without
// the optimizer, and upstream only ships optimizer = true — the failure is
// the datum (see the OZ scenario for the same pattern). The profile stays so
// the failure is reproducible: `npx hardhat compile --build-profile
// solc-no-opt`.
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
  plugins: [...(base.plugins ?? []), hardhatSolx],
  // The plugin only allows type: "solx" in the profile named "solx"; this
  // benchmark needs a second solx profile ("solx-via-ir") for the viaIR sweep,
  // so opt out of that guard. Throwaway benchmark scenario, not production.
  solx: { dangerouslyAllowSolxInProduction: true },
  solidity: {
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
