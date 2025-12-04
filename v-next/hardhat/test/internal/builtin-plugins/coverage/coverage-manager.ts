import type { CoverageTestScenario } from "./coverage-scenarios/types.js";

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { CoverageManagerImplementation } from "../../../../src/internal/builtin-plugins/coverage/coverage-manager.js";

import { COVERAGE_TEST_SCENARIO_DO_WHILE_LOOP } from "./coverage-scenarios/do-while-loop/coverage-edr-info.js";
import { COVERAGE_TEST_SCENARIO_FOR_LOOP } from "./coverage-scenarios/for-loop/coverage-edr-info.js";
import { COVERAGE_TEST_SCENARIO_IF_ELSE } from "./coverage-scenarios/if-else/coverage-edr-info.js";
import { COVERAGE_TEST_SCENARIO_IGNORE_COMMENTS } from "./coverage-scenarios/ignore-comments/coverage-edr-info.js";
import { COVERAGE_TEST_SCENARIO_ONE_LINER } from "./coverage-scenarios/one-liner/coverage-edr-info.js";
import { COVERAGE_TEST_SCENARIO_RANDOM_FORMATTING } from "./coverage-scenarios/random-formatting/coverage-edr-info.js";
import { COVERAGE_TEST_SCENARIO_REQUIRE } from "./coverage-scenarios/require/coverage-edr-info.js";
import { COVERAGE_TEST_SCENARIO_REVERT } from "./coverage-scenarios/revert/coverage-edr-info.js";
import { COVERAGE_TEST_SCENARIO_WHILE_LOOP } from "./coverage-scenarios/while-loop/coverage-edr-info.js";

const testScenarios: CoverageTestScenario[] = [
  // TODO
  COVERAGE_TEST_SCENARIO_RANDOM_FORMATTING,

  // TODO
  // add more scenraios
  // same behavior as vitest when line is counted as executed?

  COVERAGE_TEST_SCENARIO_ONE_LINER,

  COVERAGE_TEST_SCENARIO_IGNORE_COMMENTS,
  COVERAGE_TEST_SCENARIO_IF_ELSE,
  COVERAGE_TEST_SCENARIO_FOR_LOOP,
  COVERAGE_TEST_SCENARIO_WHILE_LOOP,
  COVERAGE_TEST_SCENARIO_DO_WHILE_LOOP,
  COVERAGE_TEST_SCENARIO_REQUIRE,
  COVERAGE_TEST_SCENARIO_REVERT,

  // Category	Constructs
  // Function exit	return
  // Try/catch	try / catch(Error) / catch(Panic) / catch(bytes)
  // Contract ops	new, call, delegatecall, staticcall, transfer, send
  // Data ops	assignments, delete, pushes, pops
  // Events	emit
  // Inline assembly	assembly {...}, Yul switch/if
  // Expressions	increments, arithmetic, function calls

  // Function call

  // TODO: normal code with for, if, etc
];

describe("CoverageManager", () => {
  const coverageManager = new CoverageManagerImplementation("");

  for (const testScenario of testScenarios) {
    it(`${testScenario.description}`, async () => {
      coverageManager.metadata = testScenario.metadata;
      coverageManager.data = testScenario.data;

      const report = await coverageManager.getReport();

      assert.deepEqual(report, testScenario.expectedResult);
    });
  }
});
