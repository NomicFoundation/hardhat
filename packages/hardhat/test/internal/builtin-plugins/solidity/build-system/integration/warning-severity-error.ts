import type {
  SolidityCompilerConfig,
  HardhatUserConfig,
} from "../../../../../../src/types/config.js";
import type {
  HookContext,
  SolidityHooks,
} from "../../../../../../src/types/hooks.js";
import type { HardhatPlugin } from "../../../../../../src/types/plugins.js";
import type {
  Compiler,
  CompilerInput,
  CompilerOutput,
  CompilerOutputError,
} from "../../../../../../src/types/solidity.js";

import assert from "node:assert/strict";
import path from "node:path";
import { describe, it } from "node:test";

import { FileBuildResultType } from "../../../../../../src/types/solidity.js";
import { useTestProjectTemplate } from "../resolver/helpers.js";

// These tests specify how Hardhat categorizes warnings vs errors for
// solc compiler outputs.
// Initially we operated based only on the `severity` field, but there are
// solc outputs with a type of "Warning" and a severity of "error"
// (e.g. the 5574 size warning).
describe("build system - checking warnings and errors", function () {
  const basicProjectTemplate = {
    name: "warning-severity-error-test",
    version: "1.0.0",
    files: {
      "contracts/Foo.sol": `// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;
contract Foo {}
`,
    },
  };

  const sizeWarningWithSeverityError: CompilerOutputError = {
    type: "Warning",
    component: "general",
    message:
      'Contract code size is 38511 bytes and exceeds 24576 bytes (a limit introduced in Spurious Dragon). This contract may not be deployable on Mainnet. Consider enabling the optimizer (with a low "runs" value!), turning off revert strings, or using libraries.',
    severity: "error",
    errorCode: "5574",
    formattedMessage: "Warning: Contract code size...",
  };

  const typeError: CompilerOutputError = {
    type: "TypeError",
    component: "general",
    message: "Identifier not found or not unique.",
    severity: "error",
    errorCode: "7576",
    formattedMessage: "TypeError: Identifier not found or not unique.",
  };

  const plainWarning: CompilerOutputError = {
    type: "Warning",
    component: "general",
    message: "This is a normal warning.",
    severity: "warning",
    errorCode: "1234",
    formattedMessage: "Warning: This is a normal warning.",
  };

  it("should succeed on a normal Warning (severity=warning) and surface it via warnings", async () => {
    await using project = await useTestProjectTemplate(basicProjectTemplate);

    const hre = await project.getHRE(
      configWithPlugin(makeInvokeSolcOverridePlugin([plainWarning])),
    );

    const rootFilePath = path.join(project.path, "contracts/Foo.sol");
    const result = await hre.solidity.build([rootFilePath], {
      force: true,
      quiet: true,
    });

    assert.ok(result instanceof Map, "Build result should be a Map");

    const entry = result.values().next().value;
    assert.ok(entry !== undefined, "Expected at least one file build result");
    assert.equal(
      entry.type,
      FileBuildResultType.BUILD_SUCCESS,
      "A plain warning must produce BUILD_SUCCESS",
    );
  });

  it("should still treat a non-Warning entry with severity=error as a build failure", async () => {
    await using project = await useTestProjectTemplate(basicProjectTemplate);

    const hre = await project.getHRE(
      configWithPlugin(makeInvokeSolcOverridePlugin([typeError])),
    );

    const rootFilePath = path.join(project.path, "contracts/Foo.sol");
    const result = await hre.solidity.build([rootFilePath], {
      force: true,
      quiet: true,
    });

    assert.ok(result instanceof Map, "Build result should be a Map");

    const entry = result.values().next().value;
    assert.ok(entry !== undefined, "Expected at least one file build result");
    assert.equal(
      entry.type,
      FileBuildResultType.BUILD_FAILURE,
      "A TypeError with severity=error must still produce BUILD_FAILURE",
    );
  });

  it("should treat an entry with type=Warning and severity=error as a warning, not a build failure", async () => {
    await using project = await useTestProjectTemplate(basicProjectTemplate);

    const hre = await project.getHRE(
      configWithPlugin(
        makeInvokeSolcOverridePlugin([sizeWarningWithSeverityError]),
      ),
    );

    const rootFilePath = path.join(project.path, "contracts/Foo.sol");
    const result = await hre.solidity.build([rootFilePath], {
      force: true,
      quiet: true,
    });

    assert.ok(result instanceof Map, "Build result should be a Map");

    const entry = result.values().next().value;
    assert.ok(entry !== undefined, "Expected at least one file build result");
    assert.equal(
      entry.type,
      FileBuildResultType.BUILD_SUCCESS,
      "Entry should be BUILD_SUCCESS despite a severity=error Warning",
    );
    assert.ok(
      entry.type === FileBuildResultType.BUILD_SUCCESS &&
        entry.warnings.some(
          (w) => w.errorCode === sizeWarningWithSeverityError.errorCode,
        ),
      "The Warning should be surfaced on the SuccessfulFileBuildResult.warnings",
    );
  });
});

function configWithPlugin(plugin: HardhatPlugin): HardhatUserConfig {
  return {
    solidity: "0.8.23",
    plugins: [plugin],
  };
}

function makeInvokeSolcOverridePlugin(
  errors: CompilerOutputError[],
): HardhatPlugin {
  const fakeOutput: CompilerOutput = {
    contracts: {},
    sources: {},
    errors,
  };

  return {
    id: "test-invoke-solc-synthetic-output",
    hookHandlers: {
      solidity: async () => ({
        default: async () => {
          const handlers: Partial<SolidityHooks> = {
            invokeSolc: async (
              _context: HookContext,
              _compiler: Compiler,
              _solcInput: CompilerInput,
              _solcConfig: SolidityCompilerConfig,
            ) => {
              return fakeOutput;
            },
          };

          return handlers;
        },
      }),
    },
  };
}
