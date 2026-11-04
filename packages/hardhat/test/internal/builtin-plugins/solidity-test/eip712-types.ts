import type { TestResult } from "@nomicfoundation/edr";

import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";

import {
  createEnvChanges,
  useFixtureProject,
} from "@nomicfoundation/hardhat-test-utils";

import { createHardhatRuntimeEnvironment } from "../../../../src/internal/hre-initialization.js";
import hardhatConfig from "../../../fixture-projects/solidity-test-eip712/hardhat.config.js";

/** Keeps the two clashing `Permit` declarations down to the project's one. */
const VENDOR_EXCLUDE_GLOB = "contracts/vendor/**";

/**
 * Excludes the vendored `Permit`, the only file declaring `OnlyExcluded`, and
 * the test source declaring `SelfDeclared`.
 */
const PROJECT_EXCLUDE_GLOBS = [
  VENDOR_EXCLUDE_GLOB,
  "contracts/excluded/**",
  "test/excluded/**",
];

/** A dependency is addressed by its path under the project root. */
const PACKAGE_EXCLUDE_GLOB = "node_modules/vendor-structs/**";

interface SuiteResults {
  suiteResults: Array<{ testResults: TestResult[] }>;
}

/** Every test result of one fixture run, by test name. */
type ResultsByName = Map<string, TestResult>;

/**
 * Runs every suite in the fixture project with `exclude` configured, and keys
 * the results by test name. Each case is one test function, so a name
 * identifies exactly one result.
 */
async function runFixture(exclude: string[]): Promise<ResultsByName> {
  const hre = await createHardhatRuntimeEnvironment({
    ...hardhatConfig,
    test: { solidity: { eip712Types: { exclude } } },
  });

  const result = await hre.tasks.getTask(["test", "solidity"]).run({});

  // A failing run reports the same shape under `error` instead of `value`.
  const { suiteResults }: SuiteResults =
    result.success === true ? result.value : result.error;

  return new Map(
    suiteResults
      .flatMap(({ testResults }) => testResults)
      .map((testResult) => [testResult.name, testResult]),
  );
}

function resultOf(results: ResultsByName, name: string): TestResult {
  const testResult = results.get(name);

  assert.ok(testResult !== undefined, `The run should include ${name}`);

  return testResult;
}

/**
 * Asserts that the case passed, which means its hand-written canonical type
 * hashed to what the cheatcode returned.
 */
function assertPassed(results: ResultsByName, name: string): void {
  const testResult = resultOf(results, name);

  assert.equal(
    testResult.status,
    "Success",
    `Expected ${name} to pass, got: ${testResult.reason ?? ""}`,
  );
}

/** Asserts that the case failed, and that the reason explains why. */
function assertFailedWith(
  results: ResultsByName,
  name: string,
  reason: RegExp,
): void {
  const testResult = resultOf(results, name);

  assert.equal(testResult.status, "Failure", `Expected ${name} to fail`);
  assert.match(testResult.reason ?? "", reason);
}

describe("solidity-test/eip712-types", () => {
  // The fixture declares only the `default` profile, so an ambient
  // `HARDHAT_TEST_PROFILE` would fail the runs. The shield lasts the whole
  // file.
  const envChanges = createEnvChanges();

  useFixtureProject("solidity-test-eip712");

  before(() => {
    envChanges.unsetEnvVar("HARDHAT_TEST_PROFILE");
  });

  after(() => {
    envChanges.restoreEnvVars();
  });

  describe("with nothing excluded", () => {
    let results: ResultsByName;

    before(async () => {
      results = await runFixture([]);
    });

    it("hashes a struct of primitives", () => {
      assertPassed(results, "test_emitsASingleHeadForAPrimitivesOnlyStruct()");
    });

    it("inlines a dependency named twice only once", () => {
      assertPassed(results, "test_inlinesADependencyNamedTwiceOnlyOnce()");
    });

    it("sorts dependencies by name", () => {
      assertPassed(results, "test_sortsDependenciesByName()");
    });

    it("inlines transitive dependencies", () => {
      assertPassed(results, "test_inlinesTransitiveDependencies()");
    });

    it("treats an array of structs as a dependency", () => {
      assertPassed(results, "test_treatsAnArrayOfStructsAsADependency()");
    });

    it("keeps fixed-size and nested array suffixes", () => {
      assertPassed(results, "test_keepsFixedSizeAndNestedArraySuffixes()");
    });

    it("ignores self-references", () => {
      assertPassed(results, "test_ignoresSelfReferences()");
    });

    it("encodes enum, interface and user-defined value members", () => {
      assertPassed(
        results,
        "test_encodesEnumInterfaceAndUserDefinedValueMembers()",
      );
    });

    it("hashes a struct value the way EIP-712 prescribes", () => {
      assertPassed(
        results,
        "test_hashesAStructValueAgainstItsManualEncoding()",
      );
    });

    it("collects a struct declared inside a contract", () => {
      assertPassed(results, "test_collectsAStructDeclaredInsideAContract()");
    });

    it("collects a struct declared inside an interface", () => {
      assertPassed(results, "test_collectsAStructDeclaredInsideAnInterface()");
    });

    it("collects a struct from a package dependency", () => {
      assertPassed(results, "test_collectsAStructFromAPackageDependency()");
    });

    it("inlines a dependency from a package dependency", () => {
      assertPassed(results, "test_inlinesADependencyFromAPackageDependency()");
    });

    it("collapses identical declarations of one name", () => {
      assertPassed(results, "test_collapsesIdenticalDeclarationsOfOneName()");
    });

    it("collects a struct only one unexcluded file declares", () => {
      assertPassed(results, "test_theOnlyFileDeclaringTheName()");
    });

    it("collects a struct depending on that name", () => {
      assertPassed(results, "test_aStructDependingOnThatName()");
    });

    it("collects a struct the test source itself declares", () => {
      assertPassed(results, "test_aStructTheTestSourceItselfDeclares()");
    });

    it("fails a lookup that two reachable sources declare", () => {
      assertFailedWith(
        results,
        "test_hashesTheProjectPermitType()",
        /EIP-712 type `Permit` cannot be used: conflicting definitions/,
      );
    });

    it("fails a lookup two contracts in one file declare", () => {
      assertFailedWith(
        results,
        "test_twoContractsInOneFileDeclareTheName()",
        /EIP-712 type `Conflict` cannot be used: conflicting definitions in: [^,]*contracts\/conflict\/InOneFile\.sol\./,
      );
    });

    it("fails a lookup two reachable files declare differently", () => {
      assertFailedWith(
        results,
        "test_twoFilesDeclareTheName()",
        /EIP-712 type `Clash` cannot be used: conflicting definitions in: .*Clash\.sol, .*ClashOther\.sol/,
      );
    });

    it("fails a struct that depends on the clashing name", () => {
      assertFailedWith(
        results,
        "test_aStructDependsOnTheClashingName()",
        /EIP-712 type `Wrapper` cannot be used: struct references ambiguously-named type: `Clash`/,
      );
    });

    it("fails a struct whose member EIP-712 cannot encode", () => {
      assertFailedWith(
        results,
        "test_aMemberHasNoEip712Encoding()",
        /EIP-712 type `WithMapping` cannot be used: struct has non-encodable member: `balances`/,
      );
    });

    it("fails a struct whose dependency EIP-712 cannot encode", () => {
      assertFailedWith(
        results,
        "test_aDependencyHasNoEip712Encoding()",
        /EIP-712 type `HoldsMapping` cannot be used: struct references unusable type: `WithMapping`/,
      );
    });

    it("fails a lookup no import reaches", () => {
      assertFailedWith(
        results,
        "test_aStructNoImportReaches()",
        /EIP-712 type `Unreachable` was not found/,
      );
    });
  });

  describe("with project files excluded", () => {
    let results: ResultsByName;

    before(async () => {
      results = await runFixture(PROJECT_EXCLUDE_GLOBS);
    });

    it("settles the clash when `exclude` drops one of the sources", () => {
      assertPassed(results, "test_hashesTheProjectPermitType()");
    });

    it("fails a struct only excluded files declare", () => {
      assertFailedWith(
        results,
        "test_theOnlyFileDeclaringTheName()",
        /EIP-712 type `OnlyExcluded` cannot be used: struct is declared only in a file excluded from EIP-712 type collection/,
      );
    });

    it("fails a struct depending on one only excluded files declare", () => {
      assertFailedWith(
        results,
        "test_aStructDependingOnThatName()",
        /EIP-712 type `NeedsExcluded` cannot be used: struct references unusable type: `OnlyExcluded`/,
      );
    });

    it("excludes the test source's own declarations", () => {
      assertFailedWith(
        results,
        "test_aStructTheTestSourceItselfDeclares()",
        /EIP-712 type `SelfDeclared` cannot be used: struct is declared only in a file excluded from EIP-712 type collection/,
      );
    });
  });

  describe("with a package dependency excluded", () => {
    let results: ResultsByName;

    before(async () => {
      results = await runFixture([PACKAGE_EXCLUDE_GLOB]);
    });

    it("fails a struct only the excluded package declares", () => {
      assertFailedWith(
        results,
        "test_collectsAStructFromAPackageDependency()",
        /EIP-712 type `VendorPermit` cannot be used: struct is declared only in a file excluded from EIP-712 type collection/,
      );
    });

    it("fails a struct depending on the excluded package's", () => {
      assertFailedWith(
        results,
        "test_inlinesADependencyFromAPackageDependency()",
        /EIP-712 type `Delegation` cannot be used: struct references unusable type: `VendorPermit`/,
      );
    });
  });
});
