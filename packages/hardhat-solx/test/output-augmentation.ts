import type {
  CompilationJob,
  CompilerOutputContract,
} from "hardhat/types/solidity";

import assert from "node:assert/strict";
import path from "node:path";
import { describe, it } from "node:test";

import { useFixtureProject } from "@nomicfoundation/hardhat-test-utils";
import {
  createHardhatRuntimeEnvironment,
  importUserConfig,
  resolveHardhatConfigPath,
} from "hardhat/hre";

// Side-effect-import the type augmentation for `debugInfo`.
import "../src/type-extensions.js";

// Compiles small contracts with solx (downloads binary on first run) and
// asserts evm.{deployed,}Bytecode.debugInfo is populated. Gated behind
// HARDHAT_DISABLE_SLOW_TESTS to mirror other compile-heavy tests.

// `\x7fELF` magic hex-encoded — solx debugInfo is a hex-encoded ELF blob.
const ELF_MAGIC_HEX = "7f454c46";

describe(
  "hardhat-solx output augmentation",
  { skip: process.env.HARDHAT_DISABLE_SLOW_TESTS === "true" },
  () => {
    useFixtureProject("with-debug-info");

    async function createHre() {
      const configPath = await resolveHardhatConfigPath();
      const userConfig = await importUserConfig(configPath);
      return await createHardhatRuntimeEnvironment(userConfig);
    }

    // Each fixture exercises a different bytecode shape: Counter (runtime),
    // ConstructorRevert (CREATE), InlineAsm (assembly).
    const FIXTURES: ReadonlyArray<{ source: string; contract: string }> = [
      { source: "Counter.sol", contract: "Counter" },
      { source: "ConstructorRevert.sol", contract: "ConstructorRevert" },
      { source: "InlineAsm.sol", contract: "InlineAsm" },
    ];

    it("solx-compiled artifacts carry evm.bytecode.debugInfo and evm.deployedBytecode.debugInfo", async () => {
      const hre = await createHre();

      const rootFilePaths = await hre.solidity.getRootFilePaths({
        scope: "contracts",
      });
      const fixturePaths = FIXTURES.map(({ source }) => {
        const found = rootFilePaths.find((p) => path.basename(p) === source);
        assert.ok(
          found !== undefined,
          `${source} should be a build root, got: ${rootFilePaths.join(", ")}`,
        );
        return found;
      });

      const jobsResult = await hre.solidity.getCompilationJobs(fixturePaths, {
        force: true,
        quiet: true,
        buildProfile: "solx",
      });
      assert.ok(
        jobsResult.success,
        "getCompilationJobs should succeed for the solx profile",
      );

      // The fixtures are independent (no shared imports) so they can land in
      // separate jobs; run each one and merge outputs by source path.
      const seenJobs = new Set<CompilationJob>();
      const mergedContracts: Record<
        string,
        Record<string, CompilerOutputContract>
      > = {};
      const mergedErrors: Array<{ severity: string; message: string }> = [];
      for (const job of jobsResult.compilationJobsPerFile.values()) {
        if (seenJobs.has(job)) continue;
        seenJobs.add(job);
        const { output } = await hre.solidity.runCompilationJob(job, {
          quiet: true,
          buildProfile: "solx",
        });
        for (const e of output.errors ?? []) {
          mergedErrors.push(e);
        }
        for (const [src, contracts] of Object.entries(output.contracts ?? {})) {
          mergedContracts[src] = {
            ...(mergedContracts[src] ?? {}),
            ...contracts,
          };
        }
      }

      const errors = mergedErrors.filter((e) => e.severity === "error");
      assert.equal(
        errors.length,
        0,
        `solx compilation produced errors: ${errors.map((e) => e.message).join(", ")}`,
      );

      for (const { source, contract } of FIXTURES) {
        const sourcePath = `project/contracts/${source}`;
        const compiled = mergedContracts[sourcePath]?.[contract];
        assert.ok(
          compiled !== undefined,
          `${contract} not found at ${sourcePath}. Sources: ${Object.keys(mergedContracts).join(", ")}`,
        );

        const evm = compiled.evm;
        assert.ok(evm !== undefined, `${contract}: expected evm in output`);

        const { bytecode, deployedBytecode } = evm;
        assert.ok(bytecode !== undefined, `${contract}: expected evm.bytecode`);
        assert.ok(
          deployedBytecode !== undefined,
          `${contract}: expected evm.deployedBytecode`,
        );

        const { debugInfo: creationDebugInfo } = bytecode;
        const { debugInfo: runtimeDebugInfo } = deployedBytecode;

        // Core assertion: the plugin must add debugInfo to outputSelection so
        // EDR can render solx-aware stack traces. solc artifacts wouldn't
        // carry this field at all; solx artifacts must.
        assert.ok(
          creationDebugInfo !== undefined && creationDebugInfo.length > 0,
          `${contract}: expected evm.bytecode.debugInfo to be a non-empty hex string`,
        );
        assert.ok(
          runtimeDebugInfo !== undefined && runtimeDebugInfo.length > 0,
          `${contract}: expected evm.deployedBytecode.debugInfo to be a non-empty hex string`,
        );

        // Sanity-check the blobs are hex-encoded ELFs (EDR's wire format).
        assert.ok(
          creationDebugInfo.toLowerCase().startsWith(ELF_MAGIC_HEX),
          `${contract}: evm.bytecode.debugInfo should start with the ELF magic bytes (${ELF_MAGIC_HEX})`,
        );
        assert.ok(
          runtimeDebugInfo.toLowerCase().startsWith(ELF_MAGIC_HEX),
          `${contract}: evm.deployedBytecode.debugInfo should start with the ELF magic bytes (${ELF_MAGIC_HEX})`,
        );
      }
    });
  },
);
