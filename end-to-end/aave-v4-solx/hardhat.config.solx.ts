// Wrapper config dropped over the pinned Aave v4 fork's hardhat.config.ts by
// preinstall.sh (which renames the original to hardhat.config.base.ts).
//
// The fork's config already uses a profiles map, so we re-express it as the
// benchmark's 2x2 matrix of profiles — {solc, solx} x {legacy, via-IR} — all
// seeded from the default profile's compiler settings so the only differences
// are the compiler and the viaIR flag. The base's coverage profile is dropped,
// but its two per-file viaIR overrides (src/hub/Hub.sol,
// src/spoke/instances/SpokeInstance.sol) are kept in the legacy cells:
// upstream never builds those contracts through the legacy pipeline — solc
// rejects them with stack-too-deep, and solx "resolves" the same error by
// re-running full LLVM passes with a memory spill area, which took 30+ min
// wall on aave-v4 — so uniform legacy cells would benchmark a configuration
// no user ships. The via-IR cells compile everything via-IR and need no
// overrides. Everything else (plugins, paths, networks, test) is preserved
// from the base.
import path from "node:path";

import hardhatSolx from "@nomicfoundation/hardhat-solx";
import { definePlugin } from "hardhat/plugins";

import baseConfig from "./hardhat.config.base.ts";
import { noDwarfBenchmarkPlugin } from "./no-dwarf-plugin.ts";

const base = baseConfig as unknown as {
  plugins: unknown[];
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

// The "solx" profiles always measure the version the plugin ships (its
// Solidity→solx version map). The "solx-0.1.5" profiles pin a release under
// comparison via the plugin's `path` compiler option; preinstall.sh downloads
// the binary (see scripts/benchmark/download-solx.ts).
const solx015Path = path.join(import.meta.dirname, ".solx", "solx-v0.1.5");

// Upstream's per-file escape hatches, re-pinned to 0.8.34; optimizer runs
// match the base config's overrides.
function upstreamViaIROverrides(type?: "solx", solxPath?: string) {
  const override = (runs: number) => ({
    ...(type === undefined ? {} : { type }),
    ...(solxPath === undefined ? {} : { path: solxPath }),
    version: "0.8.34",
    settings: {
      ...structuredClone(baseSettings),
      optimizer: { enabled: true, runs },
      viaIR: true,
    },
  });
  return {
    "src/hub/Hub.sol": override(22_300),
    "src/spoke/instances/SpokeInstance.sol": override(750),
  };
}

export default {
  ...base,
  // noDwarfBenchmarkPlugin MUST come after hardhatSolx: Hardhat runs config
  // hooks in reverse registration order, so the later plugin wraps the earlier
  // one and can strip the DWARF selectors hardhat-solx injected (only when
  // HARDHAT_SOLX_DISABLE_DEBUG_INFO=true; otherwise a no-op passthrough).
  plugins: [...base.plugins, hardhatSolx, definePlugin(noDwarfBenchmarkPlugin)],
  // The plugin only allows type: "solx" in the profile named "solx"; this
  // benchmark needs a second solx profile ("solx-via-ir") for the viaIR sweep,
  // so opt out of that guard. Throwaway benchmark scenario, not production.
  solx: { dangerouslyAllowSolxInProduction: true },
  solidity: {
    profiles: {
      default: {
        compilers: [{ version: "0.8.34", settings: solcSettings }],
        overrides: upstreamViaIROverrides(),
      },
      "solc-via-ir": { version: "0.8.34", settings: solcViaIRSettings },
      solx: {
        compilers: [
          { type: "solx", version: "0.8.34", settings: solxSettings },
        ],
        overrides: upstreamViaIROverrides("solx"),
      },
      "solx-via-ir": {
        type: "solx",
        version: "0.8.34",
        settings: solxViaIRSettings,
      },
      "solx-0.1.5": {
        compilers: [
          {
            type: "solx",
            version: "0.8.34",
            path: solx015Path,
            settings: structuredClone(solxSettings),
          },
        ],
        overrides: upstreamViaIROverrides("solx", solx015Path),
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
