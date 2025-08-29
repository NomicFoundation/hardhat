import type { HardhatUserConfig } from "../../../../src/types/config.js";
import type { HardhatRuntimeEnvironment } from "../../../../src/types/hre.js";
import type { HardhatPlugin } from "../../../../src/types/plugins.js";

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import { assertRejectsWithHardhatError } from "@nomicfoundation/hardhat-test-utils";

import { createHardhatRuntimeEnvironment } from "hardhat/hre";

import solidityTestPlugin from "../../../../src/internal/builtin-plugins/solidity-test/index.js";
import { resolveProjectRoot } from "../../../../src/internal/core/hre.js";
import { resolvePluginList } from "../../../../src/internal/core/plugins/resolve-plugin-list.js";

describe("config validation", () => {
  it("should validate an acceptable `test.solidity` config", async () => {
    const hre = await _createHardhatRuntimeEnvironmentWithOnlyBuiltinPlugin(
      {
        test: {
          solidity: {
            timeout: 5000,
          },
        },
      },
      solidityTestPlugin,
    );

    assert.equal(hre.config.test.solidity.timeout, 5000);
  });

  it("should not throw when the `test.solidity` config is not set by the user", async () => {
    await _createHardhatRuntimeEnvironmentWithOnlyBuiltinPlugin(
      {
        test: {},
      },
      solidityTestPlugin,
    );
  });

  it("should throw when the `test.solidity` properties are invalid", async () => {
    const userConfig: HardhatUserConfig = {
      test: {
        /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions
          -- intentionally violating the types for the test */
        solidity: {
          timeout: "not a number",
        } as any,
      },
    };

    await assertRejectsWithHardhatError(
      _createHardhatRuntimeEnvironmentWithOnlyBuiltinPlugin(
        userConfig,
        solidityTestPlugin,
      ),
      HardhatError.ERRORS.CORE.GENERAL.INVALID_CONFIG,
      {
        errors:
          "\t* Config error in config.test.solidity.timeout: Expected number, received string",
      },
    );
  });
});

async function _createHardhatRuntimeEnvironmentWithOnlyBuiltinPlugin(
  config: HardhatUserConfig,
  builtinPlugin: HardhatPlugin,
): Promise<HardhatRuntimeEnvironment> {
  const projectRoot = undefined;
  const resolvedProjectRoot = await resolveProjectRoot(projectRoot);

  const resolvedPlugins = await resolvePluginList(resolvedProjectRoot, [
    builtinPlugin,
  ]);

  return createHardhatRuntimeEnvironment(config, {}, resolvedProjectRoot, {
    resolvedPlugins,
  });
}
