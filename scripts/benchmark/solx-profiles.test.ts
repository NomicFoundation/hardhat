// Unit tests for the shared build-profile factory the solx scenarios import.
//
// This file is copied into every solx checkout by preinstall.sh and executes
// inside the child hardhat process, so a throw here aborts a sweep run rather
// than a build script. The seed resolution in particular decides whether both
// sides of a pair see identical fuzz inputs.
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  BENCHMARK_SOLC_VERSION,
  buildSolxProfiles,
  FUZZ_SEED_ENV_VAR,
  MANDATORY_PROFILE,
  overrideEntry,
  PINNED_FUZZ_SEED,
  resolveFuzzSeed,
  SOLX_COMPILER_TYPE,
  withPinnedFuzzSeed,
} from "./solx-profiles.ts";
import { isNoOptProfile } from "./test-under-solx.ts";

describe("resolveFuzzSeed", () => {
  it("returns the pinned seed when nothing overrides it", () => {
    assert.equal(resolveFuzzSeed({}), PINNED_FUZZ_SEED);
  });

  it("treats an empty override as absent", () => {
    // An env var exported as "" must not become a seed.
    assert.equal(
      resolveFuzzSeed({ [FUZZ_SEED_ENV_VAR]: "" }),
      PINNED_FUZZ_SEED,
    );
  });

  it("accepts a hex override and returns it unchanged", () => {
    assert.equal(resolveFuzzSeed({ [FUZZ_SEED_ENV_VAR]: "0xAbCd" }), "0xAbCd");
    const full = `0x${"f".repeat(64)}`;
    assert.equal(resolveFuzzSeed({ [FUZZ_SEED_ENV_VAR]: full }), full);
  });

  it("throws on an override that is not 0x-prefixed hex", () => {
    // Loudly, inside the child process: a silently ignored seed would make a
    // repetition look controlled while both sides drifted apart.
    for (const bad of ["1234", "0x", "0xzz", "seed", `0x${"a".repeat(65)}`]) {
      assert.throws(
        () => resolveFuzzSeed({ [FUZZ_SEED_ENV_VAR]: bad }),
        new RegExp(FUZZ_SEED_ENV_VAR),
        `expected ${bad} to be rejected`,
      );
    }
  });
});

describe("withPinnedFuzzSeed", () => {
  it("pins the seed on a flat test.solidity config", () => {
    const test = withPinnedFuzzSeed({
      solidity: { fuzz: { runs: 42 }, ffi: true },
    });
    const solidity = test.solidity as { fuzz: Record<string, unknown> };
    assert.equal(solidity.fuzz.seed, PINNED_FUZZ_SEED);
    // Every other setting survives.
    assert.equal(solidity.fuzz.runs, 42);
    assert.equal((test.solidity as { ffi?: boolean }).ffi, true);
  });

  it("pins the seed in every profile of the profiles shape", () => {
    const test = withPinnedFuzzSeed({
      solidity: {
        profiles: { default: { fuzz: { runs: 10 } }, ci: {} },
      },
    });
    const profiles = (test.solidity as { profiles: Record<string, unknown> })
      .profiles;
    for (const profile of Object.values(profiles)) {
      assert.equal(
        (profile as { fuzz: { seed: string } }).fuzz.seed,
        PINNED_FUZZ_SEED,
      );
    }
  });

  it("handles a config with no test entry at all", () => {
    const test = withPinnedFuzzSeed(undefined);
    assert.equal(
      (test.solidity as { fuzz: { seed: string } }).fuzz.seed,
      PINNED_FUZZ_SEED,
    );
  });
});

describe("buildSolxProfiles", () => {
  it("emits the whole matrix at the benchmark solc version", () => {
    const profiles = buildSolxProfiles({ baseSettings: { optimizer: {} } });
    assert.deepEqual(Object.keys(profiles).length, 9);
    assert.ok("solc-via-ir-no-opt" in profiles);
    for (const profile of Object.values(profiles)) {
      assert.equal(
        (profile as { version: string }).version,
        BENCHMARK_SOLC_VERSION,
      );
    }
  });

  it("emits a via-IR optimizer-off cell that is plain solc", () => {
    const profiles = buildSolxProfiles({
      baseSettings: { optimizer: { enabled: true, runs: 200 } },
    }) as Record<string, Record<string, unknown>>;
    const cell = profiles["solc-via-ir-no-opt"];
    const settings = cell.settings as Record<string, unknown>;
    assert.equal(settings.viaIR, true);
    assert.deepEqual(settings.optimizer, { enabled: false });
    // A solc cell: no plugin compiler type, no pinned solx binary.
    assert.equal(cell.type, undefined);
    assert.equal(cell.path, undefined);
  });

  it("names every optimizer-off cell so the harness recognizes it", () => {
    // The evaluation harness keeps optimizer-off legs out of its headline by
    // profile name, so a cell the two disagree on would silently enter it.
    const profiles = buildSolxProfiles({
      baseSettings: { optimizer: { enabled: true } },
    }) as Record<string, { settings: Record<string, unknown> }>;
    const off = Object.entries(profiles).filter(
      ([, profile]) =>
        (profile.settings.optimizer as { enabled?: boolean } | undefined)
          ?.enabled === false,
    );
    assert.equal(off.length, 2);
    for (const [name] of off) {
      assert.ok(
        isNoOptProfile(name),
        `${name} turns the optimizer off but isNoOptProfile does not match it`,
      );
    }
  });

  it('emits the profile the plugin mandates, mirroring "solx"', () => {
    // The plugin refuses to load without a profile of exactly this name. It
    // is never benchmarked, so it must not diverge from the "solx" cell it
    // stands in for.
    const profiles = buildSolxProfiles({
      baseSettings: { optimizer: {} },
    }) as Record<string, Record<string, unknown>>;
    assert.deepEqual(profiles[MANDATORY_PROFILE], profiles.solx);
    assert.equal(profiles[MANDATORY_PROFILE].type, SOLX_COMPILER_TYPE);
  });

  it("gives every profile its own settings object", () => {
    // Shared settings would let a solx profile's mutation bleed into a solc
    // one, and the comparison would stop being between two configurations.
    const profiles = buildSolxProfiles({
      baseSettings: { optimizer: {} },
    }) as Record<string, { settings: Record<string, unknown> }>;
    assert.notEqual(profiles.default.settings, profiles.solx.settings);
    profiles["solc-no-opt"].settings.optimizer = { enabled: false };
    assert.notDeepEqual(
      profiles.default.settings.optimizer,
      profiles["solc-no-opt"].settings.optimizer,
    );
  });

  it("derives the via-IR flag from the seed in both directions", () => {
    const fromLegacy = buildSolxProfiles({ baseSettings: {} }) as Record<
      string,
      { settings: Record<string, unknown> }
    >;
    // A legacy cell never gains a viaIR key the seed did not have.
    assert.equal("viaIR" in fromLegacy.default.settings, false);
    assert.equal(fromLegacy["solc-via-ir"].settings.viaIR, true);

    const fromViaIR = buildSolxProfiles({
      baseSettings: { viaIR: true },
    }) as Record<string, { settings: Record<string, unknown> }>;
    assert.equal(fromViaIR.default.settings.viaIR, false);
    assert.equal(fromViaIR["solc-via-ir"].settings.viaIR, true);
  });
});

describe("overrideEntry", () => {
  it("follows the cell's compiler", () => {
    assert.deepEqual(
      overrideEntry({ name: "default", version: "0.8.34", viaIR: false }, {}),
      { version: "0.8.34", settings: {} },
    );
    assert.deepEqual(
      overrideEntry(
        {
          name: "solx-pinned",
          type: "slang-solx",
          path: "/tmp/solx",
          version: "0.8.34",
          viaIR: true,
        },
        { viaIR: true },
      ),
      {
        type: "slang-solx",
        path: "/tmp/solx",
        version: "0.8.34",
        settings: { viaIR: true },
      },
    );
  });
});
