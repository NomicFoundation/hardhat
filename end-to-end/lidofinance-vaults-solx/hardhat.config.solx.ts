// Wrapper config dropped over the pinned Lido core fork's hardhat.config.ts
// by preinstall.sh (which renames the original to hardhat.config.base.ts).
//
// One of two lido scenarios answering different questions. The
// lidofinance-core-solx scenario measures the whole-repo adoption cost:
// every cell compiles all five of upstream's compiler trees, so its wall
// clock is dominated by legacy ballast no compiler under test can touch.
// This scenario is the like-for-like compiler comparison: identical sources
// to both compilers at 0.8.34, only the compiler varies. It scopes sources
// to the modern vaults tree (contracts/0.8.25) — the one tree lido could
// realistically move to solx — and re-expresses it as the benchmark's matrix
// of profiles, {solc, solx} x {legacy, via-IR}, all seeded from the base's
// 0.8.25 compiler settings and re-pinned to 0.8.34 (the only version in
// hardhat-solx's Solidity→solx map; preinstall relaxes the exact pragmas to
// caret ranges). The tree's transitive imports (contracts/common, vendored +
// npm OpenZeppelin) carry range pragmas and compile at 0.8.34 unpatched.
//
// LIDO_BENCH_SOURCES=upgrade redirects the build to contracts/upgrade
// instead: that tree builds via-IR at upstream's 0.8.25 but hits a Yul
// stack-too-deep from solc 0.8.26 on (every optimizer setting), while solx
// builds it at 0.8.34 by spilling the stack — so the benchmark times the
// solx cell and annotates solc's FAIL as the datum (the "via-IR, upgrade
// tree" row in render-solx-tables). The whole-repo scenario instead keeps
// that tree on upstream's own 0.8.25 in every cell.
//
// Upstream ships the vaults tree via-IR only, and it cannot compile any
// other way: SRLib hits stack-too-deep, and RefSlotCache copies a struct
// array to storage, which solc's legacy codegen rejects with an
// UnimplementedFeatureError (IR-only feature).
// So only the via-IR cells are benchmarked; the legacy/no-opt profiles below
// exist for the plugin's mandatory "solx" profile and for reproducing the
// failure (`--build-profile solc-no-opt`), and their FAIL is the datum,
// annotated in render-solx-tables' CELL_NOTES. The base's
// npmFilesToBuild (Aragon/OZ roots) belong to the dropped legacy trees; the
// contract sizer's compile hook would time an unrelated post-compile pass in
// every cell, so it's disabled. Everything else (plugins, tasks, test,
// warnings) is preserved from the base.
import path from "node:path";

import hardhatSolx from "@nomicfoundation/hardhat-solx";
import baseConfig from "./hardhat.config.base.ts";

const base = baseConfig as unknown as {
  plugins: unknown[];
  paths: Record<string, unknown>;
  contractSizer: Record<string, unknown>;
  solidity: {
    compilers: Array<{ version: string; settings: Record<string, unknown> }>;
  };
  [key: string]: unknown;
};

// Seed every profile from upstream's modern-tree entry (optimizer runs 200,
// viaIR: true, evmVersion cancun — cancun is in solx's supported set).
const modernEntry = base.solidity.compilers.find((c) => c.version === "0.8.25");
if (modernEntry === undefined) {
  throw new Error(
    "lidofinance-vaults-solx: no 0.8.25 compiler entry in the base config — the pinned commit may have changed",
  );
}

// Independent settings objects per profile so the solx profiles can't bleed into
// the solc profile. The solx optimization level (-O1) and DWARF debug info both
// come from the hardhat-solx plugin defaults: DWARF is force-emitted, so solx
// maps sources just as solc does (Hardhat force-emits solc sourceMaps), keeping
// the comparison apples-to-apples. We intentionally don't override the optimizer
// here so the benchmark measures the realistic plugin-default config.
const baseSettings = modernEntry.settings;
const solcViaIRSettings = structuredClone(baseSettings);
const solxViaIRSettings = structuredClone(baseSettings);

// Legacy variants: same settings, only `viaIR` flips (the base default is IR).
// Both solc and solx read `settings.viaIR` (there is no `--via-ir` CLI flag —
// it's config-only).
const solcSettings = { ...structuredClone(baseSettings), viaIR: false };
const solxSettings = { ...structuredClone(baseSettings), viaIR: false };

// Optimizer-off legacy solc — the Foundry test-run default and solc at its
// fastest, so it's the real-world compile-time bar for a test-only compiler.
const solcNoOptSettings = {
  ...structuredClone(solcSettings),
  optimizer: { enabled: false },
};

// The "solx" profiles always measure the version the plugin ships (its
// Solidity→solx version map). The "solx-0.1.7" profiles pin a release under
// comparison via the plugin's `path` compiler option; preinstall.sh downloads
// the binary (see scripts/benchmark/download-solx.ts).
const solx017Path = path.join(import.meta.dirname, ".solx", "solx-v0.1.7");

// Source scope, switched per cell by scenario.json (see the header comment).
function benchSources(): string[] {
  const scope = process.env.LIDO_BENCH_SOURCES ?? "vaults";
  const sources: Record<string, string[]> = {
    vaults: ["contracts/0.8.25"],
    upgrade: ["contracts/upgrade"],
  };
  const selected = sources[scope];
  if (selected === undefined) {
    throw new Error(
      `lidofinance-vaults-solx: unknown LIDO_BENCH_SOURCES "${scope}" — expected ${Object.keys(sources).join(" or ")}`,
    );
  }
  return selected;
}

// Upstream's single per-file escape hatch, re-pinned to 0.8.34: VaultHub
// builds via-IR at optimizer runs 100 in every profile (upstream ships it
// that way to keep the contract under the size limit; keeping it in the
// legacy cells is the aave precedent for per-file via-IR overrides).
function vaultHubOverride(type?: "solx", solxPath?: string) {
  return {
    "contracts/0.8.25/vaults/VaultHub.sol": {
      ...(type === undefined ? {} : { type }),
      ...(solxPath === undefined ? {} : { path: solxPath }),
      version: "0.8.34",
      settings: {
        ...structuredClone(baseSettings),
        optimizer: { enabled: true, runs: 100 },
        viaIR: true,
      },
    },
  };
}

export default {
  ...base,
  plugins: [...base.plugins, hardhatSolx],
  // The plugin only allows type: "solx" in the profile named "solx"; this
  // benchmark needs a second solx profile ("solx-via-ir") for the viaIR sweep,
  // so opt out of that guard. Throwaway benchmark scenario, not production.
  solx: { dangerouslyAllowSolxInProduction: true },
  // Scope to the modern tree, or to contracts/upgrade for the upgrade-tree
  // cells (see the header comment). test/ stays out via --no-tests on every
  // cell: paths.tests.solidity defaults to test/, whose fixtures span
  // 0.4.24-0.8.9.
  paths: { ...base.paths, sources: { solidity: benchSources() } },
  // Upstream runs the sizer on every compile unless SKIP_CONTRACT_SIZE is
  // set; it would time an unrelated post-compile pass in every cell.
  contractSizer: { ...base.contractSizer, runOnCompile: false },
  solidity: {
    // No npmFilesToBuild on purpose: the base's Aragon/OZ roots belong to the
    // legacy trees; the modern tree's OpenZeppelin needs are ordinary imports
    // that Hardhat resolves automatically.
    profiles: {
      default: {
        compilers: [{ version: "0.8.34", settings: solcSettings }],
        overrides: vaultHubOverride(),
      },
      "solc-no-opt": {
        compilers: [{ version: "0.8.34", settings: solcNoOptSettings }],
        overrides: vaultHubOverride(),
      },
      "solc-via-ir": {
        compilers: [{ version: "0.8.34", settings: solcViaIRSettings }],
        overrides: vaultHubOverride(),
      },
      solx: {
        compilers: [
          { type: "solx", version: "0.8.34", settings: solxSettings },
        ],
        overrides: vaultHubOverride("solx"),
      },
      "solx-via-ir": {
        compilers: [
          { type: "solx", version: "0.8.34", settings: solxViaIRSettings },
        ],
        overrides: vaultHubOverride("solx"),
      },
      "solx-0.1.7": {
        compilers: [
          {
            type: "solx",
            version: "0.8.34",
            path: solx017Path,
            settings: structuredClone(solxSettings),
          },
        ],
        overrides: vaultHubOverride("solx", solx017Path),
      },
      "solx-0.1.7-via-ir": {
        compilers: [
          {
            type: "solx",
            version: "0.8.34",
            path: solx017Path,
            settings: structuredClone(solxViaIRSettings),
          },
        ],
        overrides: vaultHubOverride("solx", solx017Path),
      },
    },
  },
};
