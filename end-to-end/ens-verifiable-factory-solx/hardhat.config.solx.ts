// Wrapper config dropped over the pinned ENS verifiable-factory fork's
// hardhat.config.ts by preinstall.sh (which renames the original to
// hardhat.config.base.ts).
//
// The fork's config uses the multi-compiler `solidity: { compilers: [...] }`
// shape with a single entry, but hardhat-solx requires a `solx` build profile
// and Hardhat won't mix that shape with a profiles map. So we re-express
// `solidity` as a 2x2 matrix of profiles — {solc, solx} x {legacy, via-IR} —
// all sharing the base compiler's settings so the only differences are the
// compiler and the viaIR flag. Everything else (paths) is preserved from the
// base.
import hardhatSolx from "@nomicfoundation/hardhat-solx";

import baseConfig from "./hardhat.config.base.ts";

const base = baseConfig as unknown as {
  plugins?: unknown[];
  solidity: { compilers: Array<{ settings: Record<string, unknown> }> };
  [key: string]: unknown;
};

// Independent settings objects per profile so the solx profiles can't bleed into
// the solc profile. The solx optimization level (-O1) and DWARF debug info both
// come from the hardhat-solx plugin defaults: DWARF is force-emitted, so solx
// maps sources just as solc does (Hardhat force-emits solc sourceMaps), keeping
// the comparison apples-to-apples. We intentionally don't override the optimizer
// here so the benchmark measures the realistic plugin-default config.
const baseSettings = base.solidity.compilers[0].settings;
const solcSettings = structuredClone(baseSettings);
const solxSettings = structuredClone(baseSettings);

// via-IR variants: same settings, only `viaIR` flips. Both solc and solx read
// `settings.viaIR` (there is no `--via-ir` CLI flag — it's config-only).
const solcViaIRSettings = { ...structuredClone(solcSettings), viaIR: true };
const solxViaIRSettings = { ...structuredClone(solxSettings), viaIR: true };

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
    },
  },
};
