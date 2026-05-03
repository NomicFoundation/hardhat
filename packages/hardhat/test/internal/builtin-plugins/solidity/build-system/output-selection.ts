import type { CompilerOutput } from "../../../../../src/types/solidity.js";
import type { SemverVersion } from "@nomicfoundation/hardhat-utils/fast-semver";

import assert from "node:assert/strict";
import path from "node:path";
import { describe, it } from "node:test";

import { assertHardhatInvariant } from "@nomicfoundation/hardhat-errors";
import {
  greaterThanOrEqual,
  parseVersion,
} from "@nomicfoundation/hardhat-utils/fast-semver";

import { createHardhatRuntimeEnvironment } from "../../../../../src/internal/hre-initialization.js";

import { useTestProjectTemplate } from "./resolver/helpers.js";

const FIRST_VERSION_WITH_IMMUTABLE_REFERENCES: SemverVersion = [0, 6, 5];

const CONTRACTS: Record<string, string> = {
  // Oldest version supported by hardhat
  "0.4.11": `pragma solidity ^0.4.11;\ncontract Foo {}`,
  // Last version without immutable references
  "0.6.4": `pragma solidity ^0.6.4;\ncontract Foo {}`,
  // First version with immutable references
  "0.6.5": [
    "pragma solidity ^0.6.5;",
    "contract Foo {",
    "  uint256 public immutable x;",
    "  constructor() public { x = 1; }",
    "}",
  ].join("\n"),
  // Modern version
  "0.8.28": [
    "// SPDX-License-Identifier: UNLICENSED",
    "pragma solidity ^0.8.0;",
    "contract Foo {",
    "  uint256 public immutable x;",
    "  constructor() { x = 1; }",
    "}",
  ].join("\n"),
};

/**
 * Returns the first contract output from a CompilerOutput.
 */
function getContractOutput(output: CompilerOutput) {
  assert(output.contracts !== undefined, "Expected contracts in output");

  const sourceEntries = Object.values(output.contracts);
  assert(sourceEntries.length > 0, "Expected at least one source in output");

  const contractEntries = Object.values(sourceEntries[0]);
  assert(
    contractEntries.length > 0,
    "Expected at least one contract in output",
  );

  return contractEntries[0];
}

describe(
  "Default output selection compatibility across solc versions",
  { skip: process.env.HARDHAT_DISABLE_SLOW_TESTS === "true" },
  () => {
    for (const [version, contractSource] of Object.entries(CONTRACTS)) {
      it(`should produce expected output fields with solc ${version}`, async () => {
        await using project = await useTestProjectTemplate({
          name: "output-selection-test",
          version: "1.0.0",
          files: {
            "contracts/Foo.sol": contractSource,
          },
        });

        const hre = await createHardhatRuntimeEnvironment(
          { solidity: { version } },
          {},
          project.path,
        );

        const rootFilePath = path.join(project.path, "contracts/Foo.sol");

        const jobsResult = await hre.solidity.getCompilationJobs(
          [rootFilePath],
          { force: true, quiet: true },
        );

        assert(jobsResult.success, `getCompilationJobs failed for ${version}`);

        const compilationJob = jobsResult.compilationJobsPerFile
          .values()
          .next().value;
        assert(compilationJob !== undefined, "Expected a compilation job");

        const { output } = await hre.solidity.runCompilationJob(
          compilationJob,
          { quiet: true },
        );

        const errors = (output.errors ?? []).filter(
          (e) => e.severity === "error",
        );
        assert.equal(
          errors.length,
          0,
          `Compilation errors with solc ${version}: ${errors.map((e) => e.message).join(", ")}`,
        );

        const contract = getContractOutput(output);

        assert(contract.abi !== undefined, "Expected abi in output");

        assert(contract.evm !== undefined, "Expected evm in output");

        assert(
          contract.evm.bytecode !== undefined,
          "Expected evm.bytecode in output",
        );
        assert(
          typeof contract.evm.bytecode.object === "string",
          "Expected evm.bytecode.object",
        );
        assert(
          typeof contract.evm.bytecode.opcodes === "string",
          "Expected evm.bytecode.opcodes",
        );
        assert(
          typeof contract.evm.bytecode.sourceMap === "string",
          "Expected evm.bytecode.sourceMap",
        );
        assert(
          contract.evm.bytecode.linkReferences !== undefined,
          "Expected evm.bytecode.linkReferences",
        );

        assert(
          contract.evm.deployedBytecode !== undefined,
          "Expected evm.deployedBytecode in output",
        );
        assert(
          typeof contract.evm.deployedBytecode.object === "string",
          "Expected evm.deployedBytecode.object",
        );
        assert(
          typeof contract.evm.deployedBytecode.opcodes === "string",
          "Expected evm.deployedBytecode.opcodes",
        );
        assert(
          typeof contract.evm.deployedBytecode.sourceMap === "string",
          "Expected evm.deployedBytecode.sourceMap",
        );
        assert(
          contract.evm.deployedBytecode.linkReferences !== undefined,
          "Expected evm.deployedBytecode.linkReferences",
        );

        assert(
          contract.evm.methodIdentifiers !== undefined,
          "Expected evm.methodIdentifiers in output",
        );

        const parsedVersion = parseVersion(version);
        assertHardhatInvariant(
          parsedVersion !== undefined,
          `Invalid solc version: ${version}`,
        );
        const supportsImmutables = greaterThanOrEqual(
          parsedVersion,
          FIRST_VERSION_WITH_IMMUTABLE_REFERENCES,
        );

        if (supportsImmutables) {
          assert(
            contract.evm.deployedBytecode.immutableReferences !== undefined,
            `Expected evm.deployedBytecode.immutableReferences in solc ${version} output`,
          );
        } else {
          assert.equal(
            contract.evm.deployedBytecode.immutableReferences,
            undefined,
            `Did not expect evm.deployedBytecode.immutableReferences in solc ${version} output`,
          );
        }
      });
    }
  },
);
