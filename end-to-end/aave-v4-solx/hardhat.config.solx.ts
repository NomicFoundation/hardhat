// Wrapper config dropped over the pinned Aave v4 fork's hardhat.config.ts by
// preinstall.sh (which renames the original to hardhat.config.base.ts).
//
// The fork's config already uses a profiles map, so we re-express it as the
// benchmark's 2x2 matrix of profiles — {solc, solx} x {legacy, via-IR} — all
// seeded from the default profile's compiler settings so the only differences
// are the compiler and the viaIR flag. The base's per-file viaIR overrides
// (src/hub/Hub.sol, src/spoke/instances/SpokeInstance.sol) and its coverage
// profile are intentionally dropped: uniform cells keep each profile a single
// compiler run, so the solc/solx comparison isn't muddied by two files being
// compiled differently. Everything else (plugins, paths, networks, test) is
// preserved from the base.
import hardhatSolx from "@nomicfoundation/hardhat-solx";

import baseConfig from "./hardhat.config.base.ts";

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

export default {
  ...base,
  plugins: [...base.plugins, hardhatSolx],
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
    },
  },
};
