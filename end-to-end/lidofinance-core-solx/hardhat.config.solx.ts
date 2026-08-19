// Wrapper config dropped over the pinned Lido core fork's hardhat.config.ts
// by preinstall.sh (which renames the original to hardhat.config.base.ts).
//
// The fork's config compiles five solc versions: the 0.4.24-0.8.9 legacy trees
// plus the modern vaults tree at 0.8.25 (via-IR, cancun). solx only embeds
// 0.8.34, and the older trees predate the 0.8.x language era entirely, so the
// benchmark re-expresses the modern tree as its matrix of profiles, {solc,
// solx} x {legacy, via-IR}, seeded from the base's 0.8.25 settings and
// re-pinned to 0.8.34 (preinstall relaxes that tree's exact pragmas to caret
// ranges). The older trees pass through on upstream's own compilers in every
// profile — including the solx ones, where solx handles the tree it can and
// stock solc handles the rest. That mixed shape is what adopting solx would
// actually look like here, and it keeps every cell compiling the same whole
// source graph instead of a slice of it. Two paths the base declares stay out
// of every cell — test/ and contracts/upgrade — for the reasons documented at
// EXCLUDED_SOURCE_DIRS below; the forge cells skip the same two.
//
// Upstream ships the vaults tree via-IR only, and it cannot compile any other
// way: SRLib hits stack-too-deep, and RefSlotCache copies a struct array to
// storage, which solc's legacy codegen rejects with an UnimplementedFeatureError
// (IR-only feature). So only the via-IR cells are benchmarked; the legacy/no-opt
// profiles below exist for the plugin's mandatory "solx" profile and for
// reproducing the failure (`--build-profile solc-no-opt`), and their FAIL is the
// datum, annotated in render-solx-tables' CELL_NOTES. The contract sizer's
// compile hook would time an unrelated post-compile pass in every cell, so it's
// disabled. Everything else (plugins, tasks, npmFilesToBuild, test, warnings) is
// preserved from the base.
import { readdirSync } from "node:fs";
import path from "node:path";

import hardhatSolx from "@nomicfoundation/hardhat-solx";
import baseConfig from "./hardhat.config.base.ts";

interface CompilerEntry {
  version: string;
  settings: Record<string, unknown>;
}

const base = baseConfig as unknown as {
  plugins: unknown[];
  paths: Record<string, unknown>;
  contractSizer: Record<string, unknown>;
  solidity: {
    npmFilesToBuild: string[];
    compilers: CompilerEntry[];
  };
  [key: string]: unknown;
};

// Upstream's modern-tree compiler, and the version every cell re-pins it to:
// 0.8.34 is the only entry in hardhat-solx's Solidity→solx version map.
const MODERN_VERSION = "0.8.25";
const BENCHMARK_VERSION = "0.8.34";

// Seed every profile's modern-tree entry from upstream's (optimizer runs 200,
// viaIR: true, evmVersion cancun — cancun is in solx's supported set).
const modernEntry = base.solidity.compilers.find(
  (c) => c.version === MODERN_VERSION,
);
if (modernEntry === undefined) {
  throw new Error(
    `lidofinance-core-solx: no ${MODERN_VERSION} compiler entry in the base config — the pinned commit may have changed`,
  );
}

// The legacy trees are benchmark ballast, not a subject: no compiler under
// comparison can build them, so they carry upstream's own settings unchanged
// through every cell and contribute the same cost to each.
const legacyCompilers = base.solidity.compilers.filter(
  (c) => c.version !== MODERN_VERSION,
);
if (legacyCompilers.length === 0) {
  throw new Error(
    "lidofinance-core-solx: no legacy compiler entries in the base config — the pinned commit may have changed",
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

// Source roots: every directory under contracts/, minus the one subtree no
// solc cell can build. contracts/upgrade/UpgradeVoteScript.sol compiles via-IR
// at upstream's 0.8.25 but hits a Yul stack-too-deep ("1 too deep") from 0.8.26
// on — 0.8.28, 0.8.30, 0.8.32 and 0.8.34 all reproduce it, at every optimizer
// runs value — so it cannot build at the 0.8.34 the solx cells force. solx 0.1.7
// does compile it (it spills the stack), but a cell with no solc counterpart is
// not a comparison, so the subtree stays out of every cell rather than turning
// the solc column into a FAIL. Enumerating the roots rather than listing them
// keeps a new upstream tree from silently falling out of the benchmark.
//
// test/ is out for a different reason: the base lists it as a source root to
// reach ./test/mocks, but its contents are harnesses and fixtures, and
// --no-tests only excludes what the build system scopes as tests. The forge
// cells skip both paths to match.
const EXCLUDED_SOURCE_DIRS = new Set(["upgrade"]);
const contractDirs = readdirSync(path.join(import.meta.dirname, "contracts"), {
  withFileTypes: true,
})
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name);
const missingExclusions = [...EXCLUDED_SOURCE_DIRS].filter(
  (dir) => !contractDirs.includes(dir),
);
if (missingExclusions.length > 0) {
  throw new Error(
    `lidofinance-core-solx: contracts/${missingExclusions.join(", contracts/")} no longer exists — the pinned commit may have changed; re-check whether the exclusion is still warranted`,
  );
}
const sourceRoots = contractDirs
  .filter((dir) => !EXCLUDED_SOURCE_DIRS.has(dir))
  .map((dir) => `contracts/${dir}`);

// The "solx" profiles always measure the version the plugin ships (its
// Solidity→solx version map). The "solx-0.1.7" profiles pin a release under
// comparison via the plugin's `path` compiler option; preinstall.sh downloads
// the binary (see scripts/benchmark/download-solx.ts).
const solx017Path = path.join(import.meta.dirname, ".solx", "solx-v0.1.7");

// One profile per cell: the legacy trees on upstream's compilers, plus the
// modern tree on the compiler under test.
function profileFor(
  settings: Record<string, unknown>,
  type?: "solx",
  solxPath?: string,
) {
  return {
    compilers: [
      ...structuredClone(legacyCompilers),
      {
        ...(type === undefined ? {} : { type }),
        ...(solxPath === undefined ? {} : { path: solxPath }),
        version: BENCHMARK_VERSION,
        settings,
      },
    ],
    overrides: vaultHubOverride(type, solxPath),
  };
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
      version: BENCHMARK_VERSION,
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
  paths: { ...base.paths, sources: { solidity: sourceRoots } },
  // Upstream runs the sizer on every compile unless SKIP_CONTRACT_SIZE is
  // set; it would time an unrelated post-compile pass in every cell.
  contractSizer: { ...base.contractSizer, runOnCompile: false },
  solidity: {
    // The base's Aragon/OZ roots belong to the legacy trees, which every
    // profile still compiles, so they stay part of the build.
    npmFilesToBuild: base.solidity.npmFilesToBuild,
    profiles: {
      default: profileFor(solcSettings),
      "solc-no-opt": profileFor(solcNoOptSettings),
      "solc-via-ir": profileFor(solcViaIRSettings),
      solx: profileFor(solxSettings, "solx"),
      "solx-via-ir": profileFor(solxViaIRSettings, "solx"),
      "solx-0.1.7": profileFor(
        structuredClone(solxSettings),
        "solx",
        solx017Path,
      ),
      "solx-0.1.7-via-ir": profileFor(
        structuredClone(solxViaIRSettings),
        "solx",
        solx017Path,
      ),
    },
  },
};
