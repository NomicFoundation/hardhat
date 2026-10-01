/* eslint-disable @typescript-eslint/consistent-type-assertions -- test */
import type { HardhatUserConfig } from "hardhat/types/config";
import type { HardhatUserConfigValidationError } from "hardhat/types/hooks";

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { SLANG_RELEASES } from "../src/internal/constants.js";
import {
  resolveUserConfig,
  validateResolvedConfig,
  validateUserConfig,
} from "../src/internal/hook-handlers/config.js";
import { SLANG_DEBUG_INFO_SELECTORS } from "../src/internal/slang-compiler.js";

const PINNED_VERSION = "0.1.0-pre.2026-10-01";
const { minSolidity: PINNED_MIN, maxSolidity: PINNED_MAX } =
  SLANG_RELEASES[PINNED_VERSION];

/**
 * A user config with a `slang` build profile holding the given compiler
 * entries, pinned to the slang prerelease unless told otherwise. Pass
 * `slangVersion: null` to leave `slang.version` out entirely.
 */
function slangProfileConfig(
  compilers: any[],
  options: {
    overrides?: Record<string, any>;
    slangVersion?: string | null;
  } = {},
): HardhatUserConfig {
  const { overrides, slangVersion = PINNED_VERSION } = options;
  return {
    solidity: {
      profiles: {
        slang: { compilers, overrides },
      },
    },
    ...(slangVersion === null ? {} : { slang: { version: slangVersion } }),
  };
}

function rangeErrors(errors: HardhatUserConfigValidationError[]) {
  return errors.filter((e) => e.message.includes("is not supported by slang"));
}

describe("hardhat-slang plugin config validation", () => {
  it("accepts valid config with dangerouslyAllowSlangInProduction", async () => {
    const errors = await validateUserConfig({
      slang: {
        dangerouslyAllowSlangInProduction: true,
      },
    });
    assert.deepEqual(errors, []);
  });

  it("accepts empty plugin config", async () => {
    const errors = await validateUserConfig({
      slang: {},
    });
    assert.deepEqual(errors, []);
  });

  it("accepts config without plugin config key", async () => {
    const errors = await validateUserConfig({});
    assert.deepEqual(errors, []);
  });

  it("rejects invalid dangerouslyAllowSlangInProduction type", async () => {
    const errors = await validateUserConfig({
      slang: { dangerouslyAllowSlangInProduction: "yes" as any },
    });
    assert.ok(errors.length > 0, "Should have validation errors");
  });

  it("rejects non-boolean dangerouslyAllowSlangInProduction", async () => {
    const errors = await validateUserConfig({
      slang: {
        dangerouslyAllowSlangInProduction: 1 as any,
      },
    });
    assert.ok(errors.length > 0, "Should have validation errors");
  });

  it("accepts a known slang.version", async () => {
    const errors = await validateUserConfig({
      slang: { version: PINNED_VERSION },
    });
    assert.deepEqual(errors, []);
  });

  it("rejects an unknown slang.version, listing the known releases", async () => {
    const errors = await validateUserConfig({
      slang: { version: "9.9.9" },
    });
    assert.equal(errors.length, 1, "exactly one error is expected");
    assert.deepEqual(errors[0].path, ["slang", "version"]);
    assert.match(errors[0].message, /Unknown slang version "9\.9\.9"/);
    assert.ok(
      errors[0].message.includes(PINNED_VERSION),
      `the error should list the known releases, got: ${errors[0].message}`,
    );
  });

  it("rejects a non-string slang.version", async () => {
    const errors = await validateUserConfig({
      slang: { version: 1 as any },
    });
    assert.ok(errors.length > 0, "Should have validation errors");
    assert.deepEqual(errors[0].path, ["slang", "version"]);
  });

  it("does not report range errors for an unknown slang.version, only the unknown version", async () => {
    const errors = await validateUserConfig(
      slangProfileConfig([{ version: "0.7.6", type: "slang" }], {
        slangVersion: "9.9.9",
      }),
    );
    assert.equal(errors.length, 1, "only the unknown version is reported");
    assert.deepEqual(errors[0].path, ["slang", "version"]);
  });
});

describe("hardhat-slang plugin config resolution", () => {
  function makeNext(profiles: Record<string, any>) {
    return async (config: any, _resolve: any) => ({
      ...config,
      solidity: {
        profiles,
        npmFilesToBuild: [],
        registeredCompilerTypes: ["solc"],
      },
    });
  }

  it("resolves with defaults when no plugin config provided", async () => {
    const resolvedConfig = await resolveUserConfig(
      {},
      undefined as any,
      makeNext({
        default: {
          isolated: false,
          preferWasm: false,
          compilers: [{ version: "0.8.34", settings: {} }],
          overrides: {},
        },
      }),
    );

    assert.equal(resolvedConfig.slang.dangerouslyAllowSlangInProduction, false);
    assert.equal(resolvedConfig.slang.version, undefined);
  });

  it("resolves dangerouslyAllowSlangInProduction from user config", async () => {
    const resolvedConfig = await resolveUserConfig(
      { slang: { dangerouslyAllowSlangInProduction: true } },
      undefined as any,
      makeNext({
        default: {
          isolated: false,
          preferWasm: false,
          compilers: [{ version: "0.8.34", settings: {} }],
          overrides: {},
        },
      }),
    );

    assert.equal(resolvedConfig.slang.dangerouslyAllowSlangInProduction, true);
  });

  it("resolves the pinned slang.version from user config", async () => {
    const resolvedConfig = await resolveUserConfig(
      { slang: { version: PINNED_VERSION } },
      undefined as any,
      makeNext({
        default: {
          isolated: false,
          preferWasm: false,
          compilers: [{ version: "0.8.34", settings: {} }],
          overrides: {},
        },
      }),
    );

    assert.equal(resolvedConfig.slang.version, PINNED_VERSION);
  });

  it("registers 'slang' as a compiler type", async () => {
    const resolvedConfig = await resolveUserConfig(
      {},
      undefined as any,
      makeNext({
        default: {
          isolated: false,
          preferWasm: false,
          compilers: [{ version: "0.8.34", settings: {} }],
          overrides: {},
        },
      }),
    );

    assert.deepEqual(
      resolvedConfig.solidity.registeredCompilerTypes,
      ["solc", "slang"],
      "the plugin registers 'slang' and leaves core's 'solc' in place, and registers nothing else",
    );
  });

  it("does not inject any additional profiles", async () => {
    const resolvedConfig = await resolveUserConfig(
      {},
      undefined as any,
      makeNext({
        default: {
          isolated: false,
          preferWasm: false,
          compilers: [{ version: "0.8.34", settings: {} }],
          overrides: {},
        },
      }),
    );

    const profileNames = Object.keys(resolvedConfig.solidity.profiles);
    assert.deepEqual(profileNames, ["default"]);
  });

  it("adds slang debugInfo selectors to slang-typed compilers in resolved config", async () => {
    const resolvedConfig = await resolveUserConfig(
      {},
      undefined as any,
      makeNext({
        slang: {
          isolated: false,
          preferWasm: false,
          compilers: [
            {
              version: "0.8.34",
              type: "slang",
              settings: { outputSelection: { "*": { "*": ["abi"] } } },
            },
          ],
          overrides: {},
        },
      }),
    );

    const slangCompiler = resolvedConfig.solidity.profiles.slang.compilers[0];
    const wildcardSelectors = slangCompiler.settings.outputSelection["*"][
      "*"
    ] as string[];
    for (const selector of SLANG_DEBUG_INFO_SELECTORS) {
      assert.ok(
        wildcardSelectors.includes(selector),
        `expected resolved slang compiler config to include "${selector}", got: ${wildcardSelectors.join(", ")}`,
      );
    }
    assert.ok(
      wildcardSelectors.includes("abi"),
      "user-provided selectors must be preserved alongside the augmentation",
    );
  });

  it("does NOT add slang selectors to non-slang compilers", async () => {
    const resolvedConfig = await resolveUserConfig(
      {},
      undefined as any,
      makeNext({
        default: {
          isolated: false,
          preferWasm: false,
          compilers: [
            {
              version: "0.8.34",
              settings: { outputSelection: { "*": { "*": ["abi"] } } },
            },
          ],
          overrides: {},
        },
      }),
    );

    const solcCompiler = resolvedConfig.solidity.profiles.default.compilers[0];
    const wildcardSelectors = solcCompiler.settings.outputSelection["*"][
      "*"
    ] as string[];
    for (const selector of SLANG_DEBUG_INFO_SELECTORS) {
      assert.ok(
        !wildcardSelectors.includes(selector),
        `solc-typed compiler must NOT receive slang selector "${selector}"; got: ${wildcardSelectors.join(", ")}`,
      );
    }
  });

  it("augments slang-typed override entries too", async () => {
    const resolvedConfig = await resolveUserConfig(
      {},
      undefined as any,
      makeNext({
        slang: {
          isolated: false,
          preferWasm: false,
          compilers: [{ version: "0.8.34", type: "slang", settings: {} }],
          overrides: {
            "contracts/Special.sol": {
              version: "0.8.34",
              type: "slang",
              settings: {},
            },
          },
        },
      }),
    );

    const override =
      resolvedConfig.solidity.profiles.slang.overrides["contracts/Special.sol"];
    const wildcardSelectors = override.settings.outputSelection["*"][
      "*"
    ] as string[];
    for (const selector of SLANG_DEBUG_INFO_SELECTORS) {
      assert.ok(
        wildcardSelectors.includes(selector),
        `expected slang override to include "${selector}", got: ${wildcardSelectors.join(", ")}`,
      );
    }
  });

  it("augments every slang-typed compiler when several Solidity versions use slang", async () => {
    const resolvedConfig = await resolveUserConfig(
      { slang: { version: PINNED_VERSION } },
      undefined as any,
      makeNext({
        slang: {
          isolated: false,
          preferWasm: false,
          compilers: [
            { version: "0.8.34", type: "slang", settings: {} },
            { version: "0.8.20", type: "slang", settings: {} },
            { version: "0.7.6", settings: {} },
          ],
          overrides: {},
        },
      }),
    );

    const [first, second, solc] =
      resolvedConfig.solidity.profiles.slang.compilers;
    for (const compiler of [first, second]) {
      assert.equal(compiler.settings.optimizer.mode, "1");
      const wildcardSelectors = compiler.settings.outputSelection["*"][
        "*"
      ] as string[];
      for (const selector of SLANG_DEBUG_INFO_SELECTORS) {
        assert.ok(
          wildcardSelectors.includes(selector),
          `slang ${compiler.version} should include "${selector}"`,
        );
      }
    }
    assert.deepEqual(
      solc.settings,
      {},
      "the solc entry in the same profile must be left untouched",
    );
  });

  it("defaults the optimizer mode on slang-typed compilers in resolved config", async () => {
    const resolvedConfig = await resolveUserConfig(
      {},
      undefined as any,
      makeNext({
        slang: {
          isolated: false,
          preferWasm: false,
          compilers: [{ version: "0.8.34", type: "slang", settings: {} }],
          overrides: {},
        },
      }),
    );

    const slangCompiler = resolvedConfig.solidity.profiles.slang.compilers[0];
    assert.equal(slangCompiler.settings.optimizer.mode, "1");
  });

  it("lets a user-set optimizer mode win over the slang default", async () => {
    const resolvedConfig = await resolveUserConfig(
      {},
      undefined as any,
      makeNext({
        slang: {
          isolated: false,
          preferWasm: false,
          compilers: [
            {
              version: "0.8.34",
              type: "slang",
              settings: { optimizer: { enabled: true, mode: "z" } },
            },
          ],
          overrides: {},
        },
      }),
    );

    const slangCompiler = resolvedConfig.solidity.profiles.slang.compilers[0];
    assert.deepEqual(slangCompiler.settings.optimizer, {
      enabled: true,
      mode: "z",
    });
  });

  it("fills the optimizer mode without clobbering other user optimizer fields", async () => {
    const resolvedConfig = await resolveUserConfig(
      {},
      undefined as any,
      makeNext({
        slang: {
          isolated: false,
          preferWasm: false,
          compilers: [
            {
              version: "0.8.34",
              type: "slang",
              settings: { optimizer: { enabled: true } },
            },
          ],
          overrides: {},
        },
      }),
    );

    const slangCompiler = resolvedConfig.solidity.profiles.slang.compilers[0];
    assert.deepEqual(slangCompiler.settings.optimizer, {
      enabled: true,
      mode: "1",
    });
  });

  it("does not let an undefined user optimizer mode clobber the default", async () => {
    const resolvedConfig = await resolveUserConfig(
      {},
      undefined as any,
      makeNext({
        slang: {
          isolated: false,
          preferWasm: false,
          compilers: [
            {
              version: "0.8.34",
              type: "slang",
              settings: { optimizer: { enabled: true, mode: undefined } },
            },
          ],
          overrides: {},
        },
      }),
    );

    const slangCompiler = resolvedConfig.solidity.profiles.slang.compilers[0];
    assert.equal(slangCompiler.settings.optimizer.mode, "1");
  });

  it("does not inject viaIR, and passes a user-set viaIR through untouched", async () => {
    const resolvedConfig = await resolveUserConfig(
      {},
      undefined as any,
      makeNext({
        slang: {
          isolated: false,
          preferWasm: false,
          compilers: [{ version: "0.8.34", type: "slang", settings: {} }],
          overrides: {
            "contracts/ViaIR.sol": {
              version: "0.8.34",
              type: "slang",
              settings: { viaIR: true },
            },
          },
        },
      }),
    );

    const slangCompiler = resolvedConfig.solidity.profiles.slang.compilers[0];
    assert.ok(
      !("viaIR" in slangCompiler.settings),
      `viaIR must not be injected, got settings: ${JSON.stringify(slangCompiler.settings)}`,
    );
    const override =
      resolvedConfig.solidity.profiles.slang.overrides["contracts/ViaIR.sol"];
    assert.equal(override.settings.viaIR, true);
    assert.equal(override.settings.optimizer.mode, "1");
  });

  it("preserves user-set settings (e.g. evmVersion) while adding slang defaults", async () => {
    const resolvedConfig = await resolveUserConfig(
      {},
      undefined as any,
      makeNext({
        slang: {
          isolated: false,
          preferWasm: false,
          compilers: [
            {
              version: "0.8.34",
              type: "slang",
              settings: { evmVersion: "prague" },
            },
          ],
          overrides: {},
        },
      }),
    );

    const slangCompiler = resolvedConfig.solidity.profiles.slang.compilers[0];
    // An arbitrary user solc setting survives config resolution untouched...
    assert.equal(slangCompiler.settings.evmVersion, "prague");
    // ...alongside a default the plugin fills in.
    assert.equal(slangCompiler.settings.optimizer.mode, "1");
  });
});

describe("hardhat-slang EVM version validation", () => {
  it("rejects type: 'slang' with pre-cancun evmVersion", async () => {
    const errors = await validateUserConfig(
      slangProfileConfig([
        {
          version: "0.8.34",
          type: "slang",
          settings: { evmVersion: "paris" },
        },
      ]),
    );
    assert.ok(errors.length > 0, "Should have validation errors");
    assert.ok(
      errors.some((e) => e.message.includes("EVM versions")),
      `Expected EVM version error, got: ${errors.map((e) => e.message).join(", ")}`,
    );
  });

  it("rejects type: 'slang' with shanghai evmVersion", async () => {
    const errors = await validateUserConfig(
      slangProfileConfig([
        {
          version: "0.8.34",
          type: "slang",
          settings: { evmVersion: "shanghai" },
        },
      ]),
    );
    assert.ok(errors.length > 0, "Should have validation errors");
  });

  for (const evmVersion of ["cancun", "prague", "osaka"]) {
    it(`accepts type: 'slang' with ${evmVersion} evmVersion`, async () => {
      const errors = await validateUserConfig(
        slangProfileConfig([
          {
            version: "0.8.34",
            type: "slang",
            settings: { evmVersion },
          },
        ]),
      );
      assert.deepEqual(errors, []);
    });
  }

  it("accepts type: 'slang' without evmVersion", async () => {
    const errors = await validateUserConfig(
      slangProfileConfig([{ version: "0.8.34", type: "slang" }]),
    );
    assert.deepEqual(errors, []);
  });

  it("ignores evmVersion on non-slang compiler entries", async () => {
    const errors = await validateUserConfig(
      slangProfileConfig([
        {
          version: "0.8.34",
          settings: { evmVersion: "paris" },
        },
      ]),
    );
    const evmErrors = errors.filter((e) => e.message.includes("EVM versions"));
    assert.deepEqual(evmErrors, []);
  });

  it("reports errors for overrides with unsupported evmVersion", async () => {
    const errors = await validateUserConfig(
      slangProfileConfig([{ version: "0.8.34" }], {
        overrides: {
          "contracts/Old.sol": {
            version: "0.8.34",
            type: "slang",
            settings: { evmVersion: "london" },
          },
        },
      }),
    );
    assert.ok(errors.length > 0, "Should have validation errors");
    assert.ok(
      errors[0].path.includes("overrides"),
      `Error path should include 'overrides', got: ${JSON.stringify(errors[0].path)}`,
    );
  });
});

describe("hardhat-slang Solidity version validation", () => {
  it("rejects type: 'slang' entries when slang.version is missing", async () => {
    const errors = await validateUserConfig(
      slangProfileConfig([{ version: "0.8.34", type: "slang" }], {
        slangVersion: null,
      }),
    );
    assert.equal(errors.length, 1, "exactly one error is expected");
    assert.deepEqual(errors[0].path, ["slang", "version"]);
    assert.match(errors[0].message, /slang\.version is required/);
    assert.ok(
      errors[0].message.includes(PINNED_VERSION),
      `the error should list the known releases, got: ${errors[0].message}`,
    );
  });

  it("does not require slang.version when every slang entry has a custom path", async () => {
    const errors = await validateUserConfig(
      slangProfileConfig(
        [{ version: "0.8.34", type: "slang", path: "/tmp/slang-custom" }],
        { slangVersion: null },
      ),
    );
    assert.deepEqual(errors, []);
  });

  it("does not require slang.version when no entry uses type: 'slang'", async () => {
    const errors = await validateUserConfig(
      slangProfileConfig([{ version: "0.8.34" }], { slangVersion: null }),
    );
    assert.deepEqual(errors, []);
  });

  it(`accepts the lowest Solidity version of the pinned prerelease, ${PINNED_MIN}`, async () => {
    const errors = await validateUserConfig(
      slangProfileConfig([{ version: PINNED_MIN, type: "slang" }]),
    );
    assert.deepEqual(errors, []);
  });

  it(`accepts the highest Solidity version of the pinned prerelease, ${PINNED_MAX}`, async () => {
    const errors = await validateUserConfig(
      slangProfileConfig([{ version: PINNED_MAX, type: "slang" }]),
    );
    assert.deepEqual(errors, []);
  });

  it("accepts a Solidity version in the middle of the range", async () => {
    const errors = await validateUserConfig(
      slangProfileConfig([{ version: "0.8.20", type: "slang" }]),
    );
    assert.deepEqual(errors, []);
  });

  it("rejects a Solidity version below the range, naming the release and its range", async () => {
    const errors = await validateUserConfig(
      slangProfileConfig([{ version: "0.7.6", type: "slang" }]),
    );
    assert.equal(errors.length, 1, "exactly one error is expected");
    assert.deepEqual(errors[0].path, [
      "solidity",
      "profiles",
      "slang",
      "compilers",
      0,
      "version",
    ]);
    assert.match(
      errors[0].message,
      new RegExp(
        `0\\.7\\.6 is not supported by slang ${PINNED_VERSION}.*${PINNED_MIN}.*${PINNED_MAX}`,
      ),
    );
  });

  it("rejects a Solidity version above the range", async () => {
    const errors = await validateUserConfig(
      slangProfileConfig([{ version: "0.9.0", type: "slang" }]),
    );
    assert.equal(rangeErrors(errors).length, 1);
  });

  it("reports the range error for each offending entry, by index", async () => {
    const errors = await validateUserConfig(
      slangProfileConfig([
        { version: "0.8.34", type: "slang" },
        { version: "0.7.6", type: "slang" },
        { version: "0.9.0", type: "slang" },
      ]),
    );
    const paths = rangeErrors(errors).map((e) => e.path);
    assert.deepEqual(paths, [
      ["solidity", "profiles", "slang", "compilers", 1, "version"],
      ["solidity", "profiles", "slang", "compilers", 2, "version"],
    ]);
  });

  it("checks the range of slang-typed overrides", async () => {
    const errors = await validateUserConfig(
      slangProfileConfig([{ version: "0.8.34", type: "slang" }], {
        overrides: {
          "contracts/Old.sol": { version: "0.7.6", type: "slang" },
        },
      }),
    );
    const paths = rangeErrors(errors).map((e) => e.path);
    assert.deepEqual(paths, [
      [
        "solidity",
        "profiles",
        "slang",
        "overrides",
        "contracts/Old.sol",
        "version",
      ],
    ]);
  });

  it("checks the range of a single-version build profile", async () => {
    const errors = await validateUserConfig({
      solidity: {
        profiles: {
          slang: { type: "slang", version: "0.7.6" },
        },
      },
      slang: { version: PINNED_VERSION },
    });
    const paths = rangeErrors(errors).map((e) => e.path);
    assert.deepEqual(paths, [["solidity", "profiles", "slang", "version"]]);
  });

  it("checks the range of top-level compilers outside build profiles", async () => {
    const errors = await validateUserConfig({
      solidity: {
        compilers: [{ type: "slang", version: "0.7.6" }],
      },
      slang: { version: PINNED_VERSION },
    });
    const paths = rangeErrors(errors).map((e) => e.path);
    assert.deepEqual(paths, [["solidity", "compilers", 0, "version"]]);
  });

  it("ignores the range of non-slang entries", async () => {
    const errors = await validateUserConfig(
      slangProfileConfig([
        { version: "0.8.34", type: "slang" },
        { version: "0.7.6" },
        { version: "0.9.0", type: "solc" },
      ]),
    );
    assert.deepEqual(errors, []);
  });

  it("accepts an out-of-range version when path is set", async () => {
    const errors = await validateUserConfig(
      slangProfileConfig([
        {
          version: "0.7.6",
          type: "slang",
          path: "/tmp/slang-nightly",
        },
      ]),
    );
    assert.deepEqual(errors, []);
  });

  it("rejects an out-of-range version when path is an empty string", async () => {
    const errors = await validateUserConfig(
      slangProfileConfig([{ version: "0.7.6", type: "slang", path: "" }]),
    );
    assert.equal(rangeErrors(errors).length, 1);
  });

  it("rejects a Solidity version that isn't MAJOR.MINOR.PATCH", async () => {
    const errors = await validateUserConfig(
      slangProfileConfig([{ version: "0.8", type: "slang" }]),
    );
    assert.equal(rangeErrors(errors).length, 1);
  });
});

describe("hardhat-slang resolved config validation", () => {
  function makeResolvedConfig(
    profiles: Record<string, any>,
    opts?: { dangerouslyAllowSlangInProduction?: boolean },
  ): any {
    return {
      solidity: {
        profiles,
        npmFilesToBuild: [],
        registeredCompilerTypes: ["solc", "slang"],
      },
      slang: {
        version: PINNED_VERSION,
        dangerouslyAllowSlangInProduction:
          opts?.dangerouslyAllowSlangInProduction ?? false,
      },
    };
  }

  it("errors when no 'slang' build profile exists", async () => {
    const errors = await validateResolvedConfig(
      makeResolvedConfig({
        default: {
          isolated: false,
          preferWasm: false,
          compilers: [{ version: "0.8.34", settings: {} }],
          overrides: {},
        },
      }),
    );
    assert.ok(errors.length > 0, "Should have validation errors");
    assert.ok(
      errors.some((e) => e.message.includes('no "slang" build profile')),
      `Expected missing slang profile error, got: ${errors.map((e) => e.message).join(", ")}`,
    );
  });

  it("passes when 'slang' build profile exists", async () => {
    const errors = await validateResolvedConfig(
      makeResolvedConfig({
        default: {
          isolated: false,
          preferWasm: false,
          compilers: [{ version: "0.8.34", settings: {} }],
          overrides: {},
        },
        slang: {
          isolated: false,
          preferWasm: false,
          compilers: [{ version: "0.8.34", type: "slang", settings: {} }],
          overrides: {},
        },
      }),
    );
    assert.deepEqual(errors, []);
  });

  it("errors when type: 'slang' appears in a non-slang profile", async () => {
    const errors = await validateResolvedConfig(
      makeResolvedConfig({
        default: {
          isolated: false,
          preferWasm: false,
          compilers: [{ version: "0.8.34", type: "slang", settings: {} }],
          overrides: {},
        },
        slang: {
          isolated: false,
          preferWasm: false,
          compilers: [{ version: "0.8.34", type: "slang", settings: {} }],
          overrides: {},
        },
      }),
    );
    assert.ok(
      errors.some((e) =>
        e.message.includes('only supported in the "slang" build profile'),
      ),
      `Expected non-slang profile error, got: ${errors.map((e) => e.message).join(", ")}`,
    );
    assert.ok(
      errors.some((e) => e.path.includes("default")),
      `Error path should reference 'default' profile`,
    );
  });

  it("errors when type: 'slang' appears in non-slang profile overrides", async () => {
    const errors = await validateResolvedConfig(
      makeResolvedConfig({
        default: {
          isolated: false,
          preferWasm: false,
          compilers: [{ version: "0.8.34", settings: {} }],
          overrides: {
            "MyContract.sol": {
              version: "0.8.34",
              type: "slang",
              settings: {},
            },
          },
        },
        slang: {
          isolated: false,
          preferWasm: false,
          compilers: [{ version: "0.8.34", type: "slang", settings: {} }],
          overrides: {},
        },
      }),
    );
    assert.ok(
      errors.some((e) =>
        e.message.includes('only supported in the "slang" build profile'),
      ),
      `Expected non-slang profile error, got: ${errors.map((e) => e.message).join(", ")}`,
    );
    assert.ok(
      errors.some((e) => e.path.includes("overrides")),
      `Error path should include 'overrides'`,
    );
  });

  it("allows type: 'slang' in non-slang profiles with dangerouslyAllowSlangInProduction", async () => {
    const errors = await validateResolvedConfig(
      makeResolvedConfig(
        {
          default: {
            isolated: false,
            preferWasm: false,
            compilers: [{ version: "0.8.34", type: "slang", settings: {} }],
            overrides: {},
          },
          slang: {
            isolated: false,
            preferWasm: false,
            compilers: [{ version: "0.8.34", type: "slang", settings: {} }],
            overrides: {},
          },
        },
        { dangerouslyAllowSlangInProduction: true },
      ),
    );
    assert.deepEqual(errors, []);
  });

  it("allows type: 'slang' in the slang profile", async () => {
    const errors = await validateResolvedConfig(
      makeResolvedConfig({
        default: {
          isolated: false,
          preferWasm: false,
          compilers: [{ version: "0.8.34", settings: {} }],
          overrides: {},
        },
        slang: {
          isolated: false,
          preferWasm: false,
          compilers: [{ version: "0.8.34", type: "slang", settings: {} }],
          overrides: {},
        },
      }),
    );
    assert.deepEqual(errors, []);
  });

  it("still requires slang profile even with dangerouslyAllowSlangInProduction", async () => {
    const errors = await validateResolvedConfig(
      makeResolvedConfig(
        {
          default: {
            isolated: false,
            preferWasm: false,
            compilers: [{ version: "0.8.34", type: "slang", settings: {} }],
            overrides: {},
          },
        },
        { dangerouslyAllowSlangInProduction: true },
      ),
    );
    assert.ok(
      errors.some((e) => e.message.includes('no "slang" build profile')),
      `Should still require slang profile, got: ${errors.map((e) => e.message).join(", ")}`,
    );
  });
});

describe("hardhat-slang optimizer mode validation", () => {
  async function validateMode(mode: string) {
    return await validateUserConfig(
      slangProfileConfig([
        {
          version: "0.8.34",
          type: "slang",
          settings: { optimizer: { mode } },
        },
      ]),
    );
  }

  for (const mode of ["1", "2", "3", "s", "z"]) {
    it(`accepts the optimizer mode "${mode}"`, async () => {
      assert.deepEqual(await validateMode(mode), []);
    });
  }

  // The likeliest mistake: there is no mode that turns optimization off.
  it('rejects the optimizer mode "0"', async () => {
    const errors = await validateMode("0");

    assert.ok(
      errors.some((e) => e.message.includes("optimizer modes")),
      `Expected an optimizer mode error, got: ${errors.map((e) => e.message).join(", ")}`,
    );
  });

  it("rejects an uppercase size mode, which slang does not accept", async () => {
    const errors = await validateMode("Z");

    assert.ok(
      errors.some((e) => e.message.includes("optimizer modes")),
      `Expected an optimizer mode error, got: ${errors.map((e) => e.message).join(", ")}`,
    );
  });

  it("leaves the other optimizer settings alone", async () => {
    const errors = await validateUserConfig(
      slangProfileConfig([
        {
          version: "0.8.34",
          type: "slang",
          settings: { optimizer: { enabled: true, runs: 200 } },
        },
      ]),
    );

    assert.deepEqual(errors, []);
  });
});
