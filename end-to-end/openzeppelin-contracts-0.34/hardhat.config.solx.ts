// Wrapper config dropped over the pinned OpenZeppelin fork's hardhat.config.ts
// by preinstall.sh (which renames the original to hardhat.config.base.ts and
// copies the shared profile factory in as ./solx-profiles.ts).
//
// The fork's config uses the flat `solidity: { version, settings }` shape, but
// hardhat-solx requires a `solx` build profile and Hardhat won't mix the flat
// shape with a profiles map. So we re-express `solidity` as the benchmark's
// matrix of profiles — {solc, solx} x {legacy, via-IR} — all sharing the base
// settings so the only differences are the compiler and the viaIR flag (see
// solx-profiles.ts for the matrix and its settings hygiene).
//
// This repo DOES NOT COMPILE under the factory's solc-no-opt profile: legacy
// codegen hits stack-too-deep in 12 P256/WebAuthn-family files (the two
// ERC7913 verifiers, 8 exposed wrappers, 2 .t.sol) — that failure is the
// benchmark datum, so no scenario cell times this profile. It stays so the
// FAIL is reproducible with `--build-profile solc-no-opt`. We deliberately
// don't rescue it with per-file via-IR overrides: upstream ships none (unlike
// aave-v4), and a benchmark-authored override set would be a config no user
// runs.
//
// Everything else (plugins, paths, networks, test, warnings, exposed) is
// preserved from the base.
import hardhatSolx from "@nomicfoundation/hardhat-solx";

import baseConfig from "./hardhat.config.base.ts";
import { buildSolxProfiles } from "./solx-profiles.ts";

const base = baseConfig as unknown as {
  plugins: unknown[];
  solidity: { settings: Record<string, unknown> };
  [key: string]: unknown;
};

export default {
  ...base,
  plugins: [...base.plugins, hardhatSolx],
  // The plugin only allows type: "solx" in the profile named "solx"; this
  // benchmark needs a second solx profile ("solx-via-ir") for the viaIR sweep,
  // so opt out of that guard. Throwaway benchmark scenario, not production.
  solx: { dangerouslyAllowSolxInProduction: true },
  solidity: {
    profiles: buildSolxProfiles({
      baseSettings: base.solidity.settings,
    }),
  },
};
