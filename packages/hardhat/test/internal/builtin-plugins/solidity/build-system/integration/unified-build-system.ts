import assert from "node:assert/strict";
import path from "node:path";
import { describe, it } from "node:test";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import { assertRejectsWithHardhatError } from "@nomicfoundation/hardhat-test-utils";
import { exists } from "@nomicfoundation/hardhat-utils/fs";

import { useTestProjectTemplate } from "../resolver/helpers.js";

const basicProjectTemplate = {
  name: "test",
  version: "1.0.0",
  files: {
    "contracts/Foo.sol": `// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

contract Foo {
    uint256 x;
}`,
    "contracts/Foo.t.sol": `// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "./Foo.sol";

contract FooTest {
    Foo foo;

    constructor() {
        foo = new Foo();
    }

    function test_Assertion() public view {
        assert(address(foo) != address(0));
    }
}`,
    "test/OtherFooTest.sol": `// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "../contracts/Foo.sol";

contract OtherFooTest {
    Foo foo;

    constructor() {
        foo = new Foo();
    }

    function test_Assertion() public view {
        assert(address(foo) != address(0));
    }
}`,
  },
};

const unifiedTestsCompilationConfig = {
  solidity: {
    version: "0.8.28",
    splitTestsCompilation: false,
  },
};

describe("build system - splitTestsCompilation: false - build system API", function () {
  describe("getRootFilePaths", function () {
    it("returns contract, test, and npm roots for scope 'contracts'", async () => {
      await using project = await useTestProjectTemplate(basicProjectTemplate);
      const hre = await project.getHRE(unifiedTestsCompilationConfig);

      const roots = await hre.solidity.getRootFilePaths({
        scope: "contracts",
      });

      // Should contain the contract file
      assert.ok(
        roots.some((r) => r.endsWith("Foo.sol") && !r.endsWith(".t.sol")),
        "Expected contract root Foo.sol in unified roots",
      );
      // Should contain the .t.sol test file
      assert.ok(
        roots.some((r) => r.endsWith("Foo.t.sol")),
        "Expected test root Foo.t.sol in unified roots",
      );
      // Should contain the test directory test file
      assert.ok(
        roots.some((r) => r.endsWith("OtherFooTest.sol")),
        "Expected test root OtherFooTest.sol in unified roots",
      );
    });

    it("throws for scope 'tests'", async () => {
      await using project = await useTestProjectTemplate(basicProjectTemplate);
      const hre = await project.getHRE(unifiedTestsCompilationConfig);

      await assertRejectsWithHardhatError(
        hre.solidity.getRootFilePaths({ scope: "tests" }),
        HardhatError.ERRORS.CORE.SOLIDITY.SPLIT_TESTS_COMPILATION_DISABLED,
        {},
      );
    });
  });

  describe("getArtifactsDirectory", function () {
    it("returns the main artifacts dir for scope 'tests'", async () => {
      await using project = await useTestProjectTemplate(basicProjectTemplate);
      const hre = await project.getHRE(unifiedTestsCompilationConfig);

      const contractsDir =
        await hre.solidity.getArtifactsDirectory("contracts");
      const testsDir = await hre.solidity.getArtifactsDirectory("tests");

      assert.equal(contractsDir, testsDir);
    });
  });

  describe("low-level scope:'tests' rejection", function () {
    it("build() throws for scope 'tests'", async () => {
      await using project = await useTestProjectTemplate(basicProjectTemplate);
      const hre = await project.getHRE(unifiedTestsCompilationConfig);

      await assertRejectsWithHardhatError(
        hre.solidity.build([], { scope: "tests" }),
        HardhatError.ERRORS.CORE.SOLIDITY.SPLIT_TESTS_COMPILATION_DISABLED,
        {},
      );
    });

    it("getCompilationJobs() throws for scope 'tests'", async () => {
      await using project = await useTestProjectTemplate(basicProjectTemplate);
      const hre = await project.getHRE(unifiedTestsCompilationConfig);

      await assertRejectsWithHardhatError(
        hre.solidity.getCompilationJobs([], { scope: "tests" }),
        HardhatError.ERRORS.CORE.SOLIDITY.SPLIT_TESTS_COMPILATION_DISABLED,
        {},
      );
    });

    it("emitArtifacts() throws for scope 'tests'", async () => {
      await using project = await useTestProjectTemplate(basicProjectTemplate);
      const hre = await project.getHRE(unifiedTestsCompilationConfig);

      // We need a real compilation job to call emitArtifacts.
      // Build first so we can get a compilation job.
      const roots = await hre.solidity.getRootFilePaths({
        scope: "contracts",
      });
      const contractRoots = roots.filter(
        (r) =>
          !r.endsWith(".t.sol") && !r.includes(path.sep + "test" + path.sep),
      );
      const result = await hre.solidity.getCompilationJobs(contractRoots, {
        scope: "contracts",
      });

      assert.ok(result.success, "Expected compilation jobs to succeed");

      const firstJob = [...result.compilationJobsPerFile.values()][0];
      const runResult = await hre.solidity.runCompilationJob(firstJob);

      await assertRejectsWithHardhatError(
        hre.solidity.emitArtifacts(firstJob, runResult.output, {
          scope: "tests",
        }),
        HardhatError.ERRORS.CORE.SOLIDITY.SPLIT_TESTS_COMPILATION_DISABLED,
        {},
      );
    });

    it("cleanupArtifacts() throws for scope 'tests'", async () => {
      await using project = await useTestProjectTemplate(basicProjectTemplate);
      const hre = await project.getHRE(unifiedTestsCompilationConfig);

      await assertRejectsWithHardhatError(
        hre.solidity.cleanupArtifacts([], { scope: "tests" }),
        HardhatError.ERRORS.CORE.SOLIDITY.SPLIT_TESTS_COMPILATION_DISABLED,
        {},
      );
    });
  });

  describe("emitArtifacts - type declarations", function () {
    it("skips per-source artifacts.d.ts for test roots in unified contracts-scope builds", async () => {
      await using project = await useTestProjectTemplate(basicProjectTemplate);
      const hre = await project.getHRE(unifiedTestsCompilationConfig);

      await hre.tasks.getTask("build").run();

      const artifactsPath =
        await hre.solidity.getArtifactsDirectory("contracts");

      // Contract root should have artifacts.d.ts
      assert.equal(
        await exists(
          path.join(artifactsPath, "contracts", "Foo.sol", "artifacts.d.ts"),
        ),
        true,
      );

      // Test roots should NOT have artifacts.d.ts
      assert.equal(
        await exists(
          path.join(artifactsPath, "contracts", "Foo.t.sol", "artifacts.d.ts"),
        ),
        false,
      );
      assert.equal(
        await exists(
          path.join(
            artifactsPath,
            "test",
            "OtherFooTest.sol",
            "artifacts.d.ts",
          ),
        ),
        false,
      );
    });
  });
});
