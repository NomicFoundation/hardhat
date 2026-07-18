// Wrapper config dropped over the pinned Uniswap V4 core fork's
// hardhat.config.ts by preinstall.sh (which renames the original to
// hardhat.config.base.ts).
//
// The fork's config uses a profiles map whose DEFAULT profile compiles via IR
// (matching upstream foundry.toml). We re-express it as the benchmark's 2x2
// matrix of profiles — {solc, solx} x {legacy, via-IR} — all seeded from the
// default profile's compiler settings. Because the base default has
// `viaIR: true`, the legacy cells must explicitly flip it to false; the base's
// optimizer settings and `metadata.bytecodeHash: "none"` carry over to every
// cell. The base's `debug` profile is dropped. Everything else (paths, test)
// is preserved from the base.
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
const solcSettings = { ...structuredClone(baseSettings), viaIR: false };
const solxSettings = { ...structuredClone(baseSettings), viaIR: false };

// via-IR variants: same settings, only `viaIR` flips. Both solc and solx read
// `settings.viaIR` (there is no `--via-ir` CLI flag — it's config-only).
const solcViaIRSettings = { ...structuredClone(baseSettings), viaIR: true };
const solxViaIRSettings = { ...structuredClone(baseSettings), viaIR: true };

// The "solx" profiles always measure the version the plugin ships (its
// Solidity→solx version map). The "solx-0.1.5" profiles pin a release under
// comparison via the plugin's `path` compiler option; preinstall.sh downloads
// the binary (see scripts/benchmark/download-solx.ts).
const solx015Path = path.join(import.meta.dirname, ".solx", "solx-v0.1.5");

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
      "solc-via-ir": { version: "0.8.34", settings: solcViaIRSettings },
      solx: { type: "solx", version: "0.8.34", settings: solxSettings },
      "solx-via-ir": {
        type: "solx",
        version: "0.8.34",
        settings: solxViaIRSettings,
      },
      "solx-0.1.5": {
        type: "solx",
        version: "0.8.34",
        path: solx015Path,
        settings: structuredClone(solxSettings),
      },
      "solx-0.1.5-via-ir": {
        type: "solx",
        version: "0.8.34",
        path: solx015Path,
        settings: structuredClone(solxViaIRSettings),
      },
    },
  },
};
