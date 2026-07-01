import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";

import {
  SOLX_DEBUG_INFO_SELECTORS,
  noDwarfBenchmarkPlugin,
  resolveUserConfigWithoutDebugInfo,
  stripSolxDebugInfoSelectors,
} from "./no-dwarf-plugin.ts";

// A resolved config shaped as hardhat-solx leaves it: DWARF selectors injected
// into the solx-typed compiler and override, alongside the -O1/viaIR defaults.
function resolvedConfigWithDwarf() {
  return {
    solidity: {
      profiles: {
        solx: {
          compilers: [
            {
              type: "solx",
              settings: {
                optimizer: { mode: "1" },
                viaIR: false,
                outputSelection: {
                  "*": { "*": ["abi", ...SOLX_DEBUG_INFO_SELECTORS] },
                },
              },
            },
          ],
          overrides: {
            "contracts/Special.sol": {
              type: "solx",
              settings: {
                outputSelection: {
                  "*": { "*": [...SOLX_DEBUG_INFO_SELECTORS] },
                },
              },
            },
          },
        },
        default: {
          compilers: [
            { settings: { outputSelection: { "*": { "*": ["abi"] } } } },
          ],
          overrides: {},
        },
      },
    },
  };
}

function wildcardSelectors(entry: any): any {
  return entry.settings.outputSelection["*"]["*"];
}

describe("stripSolxDebugInfoSelectors", () => {
  it("removes the DWARF selectors from solx compilers and overrides, keeping the rest", () => {
    const profiles = stripSolxDebugInfoSelectors(
      resolvedConfigWithDwarf().solidity.profiles,
    );

    const compilerSelectors = wildcardSelectors(profiles.solx.compilers[0]);
    for (const selector of SOLX_DEBUG_INFO_SELECTORS) {
      assert.ok(!compilerSelectors.includes(selector));
    }
    assert.ok(compilerSelectors.includes("abi"));

    const overrideSelectors = wildcardSelectors(
      profiles.solx.overrides["contracts/Special.sol"],
    );
    for (const selector of SOLX_DEBUG_INFO_SELECTORS) {
      assert.ok(!overrideSelectors.includes(selector));
    }
  });

  it("leaves non-solx compilers untouched", () => {
    const profiles = stripSolxDebugInfoSelectors(
      resolvedConfigWithDwarf().solidity.profiles,
    );
    assert.deepEqual(wildcardSelectors(profiles.default.compilers[0]), ["abi"]);
  });
});

describe("noDwarfBenchmarkPlugin", () => {
  // Hardhat resolves a config handler as `(await hookHandlers.config()).default`,
  // then calls that factory. Guard that our plugin object exposes exactly that
  // module shape (a plain handlers object would load but silently do nothing).
  it("exposes resolveUserConfig through the config category factory's default", async () => {
    const factory = (await noDwarfBenchmarkPlugin.hookHandlers.config())
      .default;
    const handlers = await factory();
    assert.equal(handlers.resolveUserConfig, resolveUserConfigWithoutDebugInfo);
  });
});

describe("resolveUserConfigWithoutDebugInfo", () => {
  const originalEnv = process.env.HARDHAT_SOLX_DISABLE_DEBUG_INFO;
  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.HARDHAT_SOLX_DISABLE_DEBUG_INFO;
    } else {
      process.env.HARDHAT_SOLX_DISABLE_DEBUG_INFO = originalEnv;
    }
  });

  // The handler must strip what the *upstream* (hardhat-solx) hook injected, so
  // `next()` here returns a DWARF-laden config — the same ordering as production.
  it("strips DWARF from the resolved config when the env var is set", async () => {
    process.env.HARDHAT_SOLX_DISABLE_DEBUG_INFO = "true";

    const resolved = await resolveUserConfigWithoutDebugInfo(
      {},
      undefined,
      async () => resolvedConfigWithDwarf(),
    );

    const compiler = resolved.solidity.profiles.solx.compilers[0];
    for (const selector of SOLX_DEBUG_INFO_SELECTORS) {
      assert.ok(!wildcardSelectors(compiler).includes(selector));
    }
    // Only DWARF is stripped; the optimizer/viaIR defaults survive.
    assert.equal(compiler.settings.optimizer.mode, "1");
    assert.equal(compiler.settings.viaIR, false);
  });

  it("passes the resolved config through unchanged when the env var is unset", async () => {
    delete process.env.HARDHAT_SOLX_DISABLE_DEBUG_INFO;

    const resolved = await resolveUserConfigWithoutDebugInfo(
      {},
      undefined,
      async () => resolvedConfigWithDwarf(),
    );

    const compiler = resolved.solidity.profiles.solx.compilers[0];
    for (const selector of SOLX_DEBUG_INFO_SELECTORS) {
      assert.ok(wildcardSelectors(compiler).includes(selector));
    }
  });
});
