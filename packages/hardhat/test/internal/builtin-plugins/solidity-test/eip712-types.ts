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

// Each of the test ids below names a single Solidity test function that is
// asserted on under more than one `exclude` configuration, so misspelling one
// copy would silently stop that assertion from matching anything.
const TEST_HASHES_THE_PROJECT_PERMIT_TYPE = "test_hashesTheProjectPermitType()";
const TEST_THE_ONLY_FILE_DECLARING_THE_NAME =
  "test_theOnlyFileDeclaringTheName()";
const TEST_A_STRUCT_DEPENDING_ON_THAT_NAME =
  "test_aStructDependingOnThatName()";
const TEST_A_STRUCT_THE_TEST_SOURCE_ITSELF_DECLARES =
  "test_aStructTheTestSourceItselfDeclares()";
const TEST_COLLECTS_A_STRUCT_FROM_A_PACKAGE_DEPENDENCY =
  "test_collectsAStructFromAPackageDependency()";
const TEST_INLINES_A_DEPENDENCY_FROM_A_PACKAGE_DEPENDENCY =
  "test_inlinesADependencyFromAPackageDependency()";

// Each of the two fragments below is asserted on by more than one case, so a
// typo in one copy would only ever be caught by the others silently matching
// less than intended.
const REASON_DECLARED_ONLY_IN_EXCLUDED_FILE =
  "struct is declared only in a file excluded from EIP-712 type collection";
const REASON_REFERENCES_UNUSABLE_TYPE = "struct references unusable type:";
const REASON_CONFLICTING_DEFINITIONS = "conflicting definitions in:";
const REASON_REFERENCES_AMBIGUOUS_TYPE =
  "struct references ambiguously-named type:";

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
      assertPassed(results, TEST_COLLECTS_A_STRUCT_FROM_A_PACKAGE_DEPENDENCY);
    });

    it("inlines a dependency from a package dependency", () => {
      assertPassed(
        results,
        TEST_INLINES_A_DEPENDENCY_FROM_A_PACKAGE_DEPENDENCY,
      );
    });

    it("collapses identical declarations of one name", () => {
      assertPassed(results, "test_collapsesIdenticalDeclarationsOfOneName()");
    });

    it("collects a struct only one unexcluded file declares", () => {
      assertPassed(results, TEST_THE_ONLY_FILE_DECLARING_THE_NAME);
    });

    it("collects a struct depending on that name", () => {
      assertPassed(results, TEST_A_STRUCT_DEPENDING_ON_THAT_NAME);
    });

    it("collects a struct the test source itself declares", () => {
      assertPassed(results, TEST_A_STRUCT_THE_TEST_SOURCE_ITSELF_DECLARES);
    });

    it("fails a lookup that two reachable sources declare", () => {
      assertFailedWith(
        results,
        TEST_HASHES_THE_PROJECT_PERMIT_TYPE,
        /EIP-712 type `Permit` cannot be used: conflicting definitions/,
      );
    });

    it("fails a lookup two contracts in one file declare", () => {
      assertFailedWith(
        results,
        "test_twoContractsInOneFileDeclareTheName()",
        new RegExp(
          `EIP-712 type \`Conflict\` cannot be used: ${REASON_CONFLICTING_DEFINITIONS} [^,]*contracts\\/conflict\\/InOneFile\\.sol\\.`,
        ),
      );
    });

    it("fails a lookup two reachable files declare differently", () => {
      assertFailedWith(
        results,
        "test_twoFilesDeclareTheName()",
        new RegExp(
          `EIP-712 type \`Clash\` cannot be used: ${REASON_CONFLICTING_DEFINITIONS} .*Clash\\.sol, .*ClashOther\\.sol`,
        ),
      );
    });

    it("fails a lookup of two declarations differing only in a non-encodable member", () => {
      assertFailedWith(
        results,
        "test_twoFilesDeclareTheNameDifferingOnlyInANonEncodableMember()",
        new RegExp(
          `EIP-712 type \`Ledger\` cannot be used: ${REASON_CONFLICTING_DEFINITIONS} .*LedgerA\\.sol, .*LedgerB\\.sol`,
        ),
      );
    });

    it("fails a struct that depends on the clashing name", () => {
      assertFailedWith(
        results,
        "test_aStructDependsOnTheClashingName()",
        new RegExp(
          `EIP-712 type \`Wrapper\` cannot be used: ${REASON_REFERENCES_AMBIGUOUS_TYPE} \`Clash\``,
        ),
      );
    });

    it("fails a struct that transitively reaches the clashing name two imports away", () => {
      assertFailedWith(
        results,
        "test_aStructTransitivelyReachesTheClashingName()",
        new RegExp(
          `EIP-712 type \`TransitiveClash\` cannot be used: ${REASON_REFERENCES_AMBIGUOUS_TYPE} \`Clash\``,
        ),
      );
    });

    it("lets the asking source's own declaration win a direct lookup despite a reachable clash", () => {
      assertPassed(results, "test_theAskingSourceWinsTheClash()");
    });

    it("fails a struct in the asking source that references the clashing name", () => {
      assertFailedWith(
        results,
        "test_aStructInTheAskingSourceReferencesTheClashingName()",
        new RegExp(
          `EIP-712 type \`AsksForClash\` cannot be used: ${REASON_REFERENCES_AMBIGUOUS_TYPE} \`Clash\``,
        ),
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
        new RegExp(
          `EIP-712 type \`HoldsMapping\` cannot be used: ${REASON_REFERENCES_UNUSABLE_TYPE} \`WithMapping\``,
        ),
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
      assertPassed(results, TEST_HASHES_THE_PROJECT_PERMIT_TYPE);
    });

    it("fails a struct only excluded files declare", () => {
      assertFailedWith(
        results,
        TEST_THE_ONLY_FILE_DECLARING_THE_NAME,
        new RegExp(
          `EIP-712 type \`OnlyExcluded\` cannot be used: ${REASON_DECLARED_ONLY_IN_EXCLUDED_FILE}`,
        ),
      );
    });

    it("fails a struct depending on one only excluded files declare", () => {
      assertFailedWith(
        results,
        TEST_A_STRUCT_DEPENDING_ON_THAT_NAME,
        new RegExp(
          `EIP-712 type \`NeedsExcluded\` cannot be used: ${REASON_REFERENCES_UNUSABLE_TYPE} \`OnlyExcluded\``,
        ),
      );
    });

    it("excludes the test source's own declarations", () => {
      assertFailedWith(
        results,
        TEST_A_STRUCT_THE_TEST_SOURCE_ITSELF_DECLARES,
        new RegExp(
          `EIP-712 type \`SelfDeclared\` cannot be used: ${REASON_DECLARED_ONLY_IN_EXCLUDED_FILE}`,
        ),
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
        TEST_COLLECTS_A_STRUCT_FROM_A_PACKAGE_DEPENDENCY,
        new RegExp(
          `EIP-712 type \`VendorPermit\` cannot be used: ${REASON_DECLARED_ONLY_IN_EXCLUDED_FILE}`,
        ),
      );
    });

    it("fails a struct depending on the excluded package's", () => {
      assertFailedWith(
        results,
        TEST_INLINES_A_DEPENDENCY_FROM_A_PACKAGE_DEPENDENCY,
        new RegExp(
          `EIP-712 type \`Delegation\` cannot be used: ${REASON_REFERENCES_UNUSABLE_TYPE} \`VendorPermit\``,
        ),
      );
    });
  });
});
