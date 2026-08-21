// Shared build-profile factory for the solx benchmark scenarios.
//
// CANONICAL SOURCE — scripts/benchmark/solx-profiles.ts. Each solx scenario's
// preinstall.sh copies this file into the checkout next to the wrapper
// hardhat.config.ts, which imports it as "./solx-profiles.ts": the wrapper
// executes inside the cloned scenario repo at hardhat runtime, where this
// monorepo is not importable. Edit the file under scripts/benchmark/, never
// a copy found in a checkout.
//
// buildSolxProfiles() expands one seed settings object into the benchmark's
// profile matrix — {solc, shipped solx, pinned solx} x {legacy, via-IR},
// plus the optimizer-off solc datum:
//
//   default            solc, legacy pipeline
//   solc-no-opt        solc, legacy, optimizer off — the Foundry test-run
//                      default and solc at its fastest, so it's the
//                      real-world compile-time bar for a test-only compiler
//   solc-via-ir        solc, via-IR
//   solx               solx, legacy
//   solx-via-ir        solx, via-IR
//   solx-0.1.7         pinned solx, legacy
//   solx-0.1.7-via-ir  pinned solx, via-IR
//
// The "solx" profiles always measure the version the plugin ships (its
// Solidity→solx version map). The "solx-0.1.7" profiles pin a release under
// comparison via the plugin's `path` compiler option; preinstall.sh downloads
// the binary to ./.solx/solx-v0.1.7 (see scripts/benchmark/download-solx.ts).
// The pinned names and path are deliberate literals — workflow and
// scenario.json cells refer to the profile names — and must stay in lockstep
// with SOLX_PINNED_VERSION in scripts/benchmark/pinned-tool-versions.sh;
// pinned-tool-versions.test.ts fails on drift.
//
// Settings hygiene: every profile gets an independent structuredClone of the
// seed settings, so the solx profiles can't bleed into the solc ones. The
// solx optimization level (-O1) and DWARF debug info both come from the
// hardhat-solx plugin defaults. The optimizer is intentionally not overridden
// so the benchmark measures the realistic plugin-default config.
//
// Source mapping is NOT equivalent between the two compilers, and the timed
// cells inherit that asymmetry. solx 0.1.4 and later leave the standard-JSON
// `sourceMap` empty and ship DWARF in `debugInfo` instead (see
// packages/hardhat-solx/src/type-extensions.ts). Every profile still requests
// the same `outputSelection`, so the two compilers are asked for the same
// artifacts, but solc generates and pays for sourceMaps while solx returns
// them empty and pays for DWARF instead. Treat compile-time deltas on the
// timed cells as including that difference rather than as like-for-like work,
// and expect Solidity stack frames to decode differently between the two.
//
// via-IR handling: both solc and solx read `settings.viaIR` (there is no
// `--via-ir` CLI flag — it's config-only), and the factory derives the flag
// from the seed. When the seed already enables via-IR (repos that ship
// via-IR only), the legacy cells explicitly flip it to false and the via-IR
// cells inherit it; otherwise the via-IR cells set it and the legacy cells
// carry the seed untouched — a legacy cell never gains a `viaIR` key the
// seed didn't have.
import path from "node:path";

/** Compiler settings as they appear in a hardhat config (treated as opaque). */
export type CompilerSettings = Record<string, unknown>;

/** One cell of the profile matrix, as handed to the `overrides` callback. */
export interface SolxProfileCell {
  /** Profile name, e.g. "solc-no-opt" or "solx-0.1.7-via-ir". */
  name: string;
  /** "solx" on the solx cells; undefined on the solc cells. */
  type?: "solx";
  /** Pinned solx binary path — only set on the "solx-0.1.7*" cells. */
  path?: string;
  /** The solc version every cell compiles at (0.8.34). */
  version: string;
  /** Whether this cell compiles via-IR. */
  viaIR: boolean;
}

export interface SolxProfilesOptions {
  /**
   * The settings every profile is seeded from (typically the base config's
   * production compiler entry). Never mutated; each profile gets its own
   * clone.
   */
  baseSettings: CompilerSettings;
  /**
   * Per-file compiler overrides for a cell (hardhat's `overrides` map);
   * return undefined for cells that need none. Cells with overrides are
   * emitted in the `{ compilers: [...], overrides }` profile shape, the rest
   * stay flat. Build the entries with `overrideEntry(cell, settings)` so
   * they follow the cell's compiler.
   */
  overrides?: (cell: SolxProfileCell) => Record<string, unknown> | undefined;
  /**
   * Compiler entries carried unchanged into every profile, ahead of the
   * subject entry. For trees no compiler under comparison can build
   * (lidofinance-core-solx's legacy trees): they stay on upstream's own
   * compilers and contribute the same cost to each cell. Cloned per profile.
   */
  ballastCompilers?: Array<Record<string, unknown>>;
}

// 0.8.34 is the only version in hardhat-solx's Solidity→solx map, so it's
// the version every cell compiles the subject sources at. Exported for the
// test-execution evaluation (test-under-solx.ts), which scopes its build-info
// provenance assert to this version.
export const BENCHMARK_SOLC_VERSION = "0.8.34";

// This file sits next to the wrapper config in the checkout (or in the
// workspace package for monorepo scenarios), so the pinned binary preinstall
// downloaded is a sibling .solx directory away.
const PINNED_SOLX_PATH = path.join(import.meta.dirname, ".solx", "solx-v0.1.7");

/**
 * A compiler entry (for `overrides` maps) that follows the cell's compiler:
 * solc for the solc cells, `type: "solx"` for the solx cells, plus the
 * pinned binary `path` on the pinned cells.
 */
export function overrideEntry(
  cell: SolxProfileCell,
  settings: CompilerSettings,
): Record<string, unknown> {
  return {
    ...(cell.type === undefined ? {} : { type: cell.type }),
    ...(cell.path === undefined ? {} : { path: cell.path }),
    version: cell.version,
    settings,
  };
}

/**
 * Pinned fuzz seed for solx-vs-solc test comparisons (test-under-solx.ts).
 * Runs under both compilers must see identical fuzz inputs, and failures
 * must reproduce. Hardhat 3 already defaults the solidity-test fuzz seed to
 * a fixed constant (DEFAULT_FUZZ_SEED in the solidity-test builtin's
 * config.ts), so runs are deterministic by default. The explicit pin makes
 * the comparison independent of that default, and of any seed an upstream
 * base config might set. The value is arbitrary: the ASCII bytes of
 * "solx-test-execution-evaluation.1".
 */
export const PINNED_FUZZ_SEED =
  "0x736f6c782d746573742d657865637574696f6e2d6576616c756174696f6e2e31";

/**
 * Env var that overrides PINNED_FUZZ_SEED for one run of the wrapper config.
 *
 * A single pinned seed makes one comparison exact and explores exactly one
 * corpus, forever. Repeated runs want a different corpus each time while both
 * sides of a single pair still see identical inputs, and the wrapper config
 * executes inside the cloned repo where no CLI flag reaches it — so the seed
 * arrives through the child environment instead. test-under-solx.ts sets it
 * per repetition and holds it fixed across the pair's two runs.
 */
export const FUZZ_SEED_ENV_VAR = "SOLX_BENCH_FUZZ_SEED";

/** The seed this process should pin: the env override, else PINNED_FUZZ_SEED. */
export function resolveFuzzSeed(
  env: Record<string, string | undefined> = process.env,
): string {
  const override = env[FUZZ_SEED_ENV_VAR];
  if (override === undefined || override === "") {
    return PINNED_FUZZ_SEED;
  }
  if (!/^0x[0-9a-fA-F]{1,64}$/.test(override)) {
    throw new Error(
      `${FUZZ_SEED_ENV_VAR} must be a 0x-prefixed hex value of at most 32 bytes, got: ${override}`,
    );
  }
  return override;
}

/**
 * The wrapper configs' `test` entry: the base config's `test` with the
 * solidity-test fuzz seed pinned to resolveFuzzSeed() — PINNED_FUZZ_SEED
 * unless SOLX_BENCH_FUZZ_SEED overrides it. Handles both shapes of
 * `test.solidity` — flat, and the `{ profiles: { default: ... } }` wrapper —
 * and preserves every other setting (mocha config, fuzz runs, fsPermissions,
 * ffi, ...).
 */
export function withPinnedFuzzSeed(baseTest: unknown): Record<string, unknown> {
  const test = { ...((baseTest ?? {}) as Record<string, unknown>) };
  const solidity = (test.solidity ?? {}) as Record<string, unknown>;
  const seed = resolveFuzzSeed();

  const pinProfile = (profile: unknown): Record<string, unknown> => {
    const p = (profile ?? {}) as Record<string, unknown>;
    return {
      ...p,
      fuzz: {
        ...((p.fuzz ?? {}) as Record<string, unknown>),
        seed,
      },
    };
  };

  if ("profiles" in solidity) {
    const profiles = solidity.profiles as Record<string, unknown>;
    const pinned: Record<string, unknown> = {};
    for (const [name, profile] of Object.entries(profiles)) {
      pinned[name] = pinProfile(profile);
    }
    return { ...test, solidity: { ...solidity, profiles: pinned } };
  }
  return { ...test, solidity: pinProfile(solidity) };
}

/** Build the benchmark's 7-profile map. See the header for the matrix. */
export function buildSolxProfiles(
  options: SolxProfilesOptions,
): Record<string, unknown> {
  const { baseSettings, overrides, ballastCompilers } = options;

  const seedViaIR = baseSettings.viaIR === true;
  const seed = (viaIR: boolean): CompilerSettings => {
    const settings = structuredClone(baseSettings);
    if (viaIR && !seedViaIR) {
      settings.viaIR = true;
    }
    if (!viaIR && seedViaIR) {
      settings.viaIR = false;
    }
    return settings;
  };

  const version = BENCHMARK_SOLC_VERSION;
  const cells: SolxProfileCell[] = [
    { name: "default", version, viaIR: false },
    { name: "solc-no-opt", version, viaIR: false },
    { name: "solc-via-ir", version, viaIR: true },
    { name: "solx", type: "solx", version, viaIR: false },
    { name: "solx-via-ir", type: "solx", version, viaIR: true },
    {
      name: "solx-0.1.7",
      type: "solx",
      path: PINNED_SOLX_PATH,
      version,
      viaIR: false,
    },
    {
      name: "solx-0.1.7-via-ir",
      type: "solx",
      path: PINNED_SOLX_PATH,
      version,
      viaIR: true,
    },
  ];

  const profiles: Record<string, unknown> = {};
  for (const cell of cells) {
    const settings = seed(cell.viaIR);
    if (cell.name === "solc-no-opt") {
      settings.optimizer = { enabled: false };
    }

    const compiler = overrideEntry(cell, settings);
    const cellOverrides = overrides === undefined ? undefined : overrides(cell);

    profiles[cell.name] =
      ballastCompilers === undefined && cellOverrides === undefined
        ? compiler
        : {
            compilers: [...structuredClone(ballastCompilers ?? []), compiler],
            ...(cellOverrides === undefined
              ? {}
              : { overrides: cellOverrides }),
          };
  }
  return profiles;
}
