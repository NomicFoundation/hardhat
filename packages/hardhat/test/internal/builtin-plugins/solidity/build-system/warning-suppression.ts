import assert from "node:assert/strict";
import path from "node:path";
import { describe, it } from "node:test";

import { COVERAGE_LIBRARY_FILE_NAME } from "@nomicfoundation/edr";

import {
  shouldSuppressWarning,
  NATSPEC_MEMORY_SAFE_ASSEMBLY_WARNING,
  SPDX_WARNING,
  PRAGMA_WARNING,
} from "../../../../../src/internal/builtin-plugins/solidity/build-system/warning-suppression.js";

describe("shouldSuppressWarning", () => {
  const NATSPEC_WARNING = NATSPEC_MEMORY_SAFE_ASSEMBLY_WARNING;
  const CONTRACT_SIZE_WARNING =
    "Contract code size is 25002 bytes and exceeds 24576 bytes (a limit introduced in Spurious Dragon). This contract may not be deployable on Mainnet.";
  const INIT_CODE_SIZE_WARNING =
    "Contract initcode size is 50000 bytes and exceeds 49152 bytes (a limit introduced in Shanghai). This contract may not be deployable on Mainnet.";

  // Mock project paths for testing
  const PROJECT_ROOT = path.join("home", "user", "project");
  const SOLIDITY_TESTS_PATH = path.join(PROJECT_ROOT, "test", "contracts");

  describe("Natspec memory-safe-assembly warning (specific-file scope)", () => {
    const scenarios = [
      {
        name: "should suppress warnings from console.sol",
        path: path.join("hardhat", "console.sol"),
        expected: true,
      },
      {
        name: "should suppress warnings from console.sol with absolute path",
        path: path.join("home", "user", "project", "hardhat", "console.sol"),
        expected: true,
      },
      {
        name: "should NOT suppress warnings from regular contract files",
        path: path.join("contracts", "Example.sol"),
        expected: false,
      },
      {
        name: "should NOT suppress warnings from test files",
        path: path.join("contracts", "Counter.t.sol"),
        expected: false,
      },
    ];

    for (const scenario of scenarios) {
      it(scenario.name, () => {
        const message = `Warning: ${NATSPEC_WARNING}\n  --> ${scenario.path}:1:1:`;
        assert.equal(
          shouldSuppressWarning(
            message,
            SOLIDITY_TESTS_PATH,
            PROJECT_ROOT,
            false,
          ),
          scenario.expected,
        );
      });
    }
  });

  describe("SPDX and Pragma warnings (test-files scope)", () => {
    const testFileWarnings = [
      { name: "SPDX", message: SPDX_WARNING },
      { name: "Pragma", message: PRAGMA_WARNING },
    ];

    describe("should suppress from .t.sol files", () => {
      const scenarios = [
        {
          name: "from .t.sol files",
          path: path.join("contracts", "Counter.t.sol"),
        },
        {
          name: "from .t.sol files in subdirectories",
          path: path.join("test", "solidity", "Example.t.sol"),
        },
      ];

      for (const warning of testFileWarnings) {
        for (const scenario of scenarios) {
          it(`should suppress ${warning.name} warning ${scenario.name}`, () => {
            const message = `Warning: ${warning.message}\n  --> ${scenario.path}:1:1:`;
            assert.equal(
              shouldSuppressWarning(
                message,
                SOLIDITY_TESTS_PATH,
                PROJECT_ROOT,
                false,
              ),
              true,
            );
          });
        }
      }
    });

    describe("should suppress from test/contracts/ directory", () => {
      const scenarios = [
        {
          name: "from test/contracts/ directory",
          path: path.join("test", "contracts", "Example.sol"),
        },
        {
          name: "from nested test/contracts/ subdirectories",
          path: path.join("test", "contracts", "utils", "Helper.sol"),
        },
        {
          name: "with absolute paths",
          path: path.join(
            "home",
            "user",
            "project",
            "test",
            "contracts",
            "Example.sol",
          ),
        },
      ];

      for (const warning of testFileWarnings) {
        for (const scenario of scenarios) {
          it(`should suppress ${warning.name} warning ${scenario.name}`, () => {
            const message = `Warning: ${warning.message}\n  --> ${scenario.path}:1:1:`;
            assert.equal(
              shouldSuppressWarning(
                message,
                SOLIDITY_TESTS_PATH,
                PROJECT_ROOT,
                false,
              ),
              true,
            );
          });
        }
      }
    });

    describe("should NOT suppress from non-test files", () => {
      const scenarios = [
        {
          name: "from regular contracts directory",
          path: path.join("contracts", "Counter.sol"),
        },
        {
          name: "from test/ directory (only test/contracts/ is suppressed)",
          path: path.join("test", "Example.sol"),
        },
        {
          name: "from files with 'test' in the filename",
          path: path.join("contracts", "TestHelper.sol"),
        },
        {
          name: "from directories with 'test' as substring (laTEST)",
          path: path.join("contracts", "latest", "Example.sol"),
        },
        {
          name: "from test/utils directory (only test/contracts/ is suppressed)",
          path: path.join("test", "utils", "Helper.sol"),
        },
        {
          name: "from test/contracts.sol file (not a directory)",
          path: path.join("test", "contracts.sol"),
        },
      ];

      for (const warning of testFileWarnings) {
        for (const scenario of scenarios) {
          it(`should NOT suppress ${warning.name} warning ${scenario.name}`, () => {
            const message = `Warning: ${warning.message}\n  --> ${scenario.path}:1:1:`;
            assert.equal(
              shouldSuppressWarning(
                message,
                SOLIDITY_TESTS_PATH,
                PROJECT_ROOT,
                false,
              ),
              false,
            );
          });
        }
      }
    });
  });

  describe("Coverage library warnings", () => {
    const scenarios = [
      {
        name: "should suppress NatSpec warning from the coverage library file when coverage=true",
        path: COVERAGE_LIBRARY_FILE_NAME,
        coverage: true,
        expected: true,
      },
      {
        name: "should NOT suppress NatSpec warning from the coverage library file when coverage=false",
        path: COVERAGE_LIBRARY_FILE_NAME,
        coverage: false,
        expected: false,
      },
      {
        name: "should NOT suppress the same warning emitted against a user-file path",
        path: path.join("contracts", "MyContract.sol"),
        coverage: true,
        expected: false,
      },
    ];

    for (const scenario of scenarios) {
      it(scenario.name, () => {
        const message = `Warning: ${NATSPEC_WARNING}\n  --> ${scenario.path}:1:1:`;
        assert.equal(
          shouldSuppressWarning(
            message,
            SOLIDITY_TESTS_PATH,
            PROJECT_ROOT,
            scenario.coverage,
          ),
          scenario.expected,
        );
      });
    }

    it("should NOT suppress other diagnostics from the coverage library file", () => {
      const message = `Error: Some other compiler diagnostic\n  --> ${COVERAGE_LIBRARY_FILE_NAME}:1:1:`;
      assert.equal(
        shouldSuppressWarning(message, SOLIDITY_TESTS_PATH, PROJECT_ROOT, true),
        false,
      );
    });
  });

  describe("Contract-size warning", () => {
    it("should suppress contract-size warning on a user file when coverage=true", () => {
      const message = `Warning: ${CONTRACT_SIZE_WARNING}\n  --> ${path.join("contracts", "Foo.sol")}:1:1:`;
      assert.equal(
        shouldSuppressWarning(message, SOLIDITY_TESTS_PATH, PROJECT_ROOT, true),
        true,
      );
    });

    it("should NOT suppress contract-size warning on a user file when coverage=false", () => {
      const message = `Warning: ${CONTRACT_SIZE_WARNING}\n  --> ${path.join("contracts", "Foo.sol")}:1:1:`;
      assert.equal(
        shouldSuppressWarning(
          message,
          SOLIDITY_TESTS_PATH,
          PROJECT_ROOT,
          false,
        ),
        false,
      );
    });

    it("should suppress contract-size warning on a .t.sol file when coverage=false", () => {
      const message = `Warning: ${CONTRACT_SIZE_WARNING}\n  --> ${path.join("contracts", "Counter.t.sol")}:1:1:`;
      assert.equal(
        shouldSuppressWarning(
          message,
          SOLIDITY_TESTS_PATH,
          PROJECT_ROOT,
          false,
        ),
        true,
      );
    });

    it("should suppress contract-size warning on a file in the Solidity tests dir when coverage=false", () => {
      const message = `Warning: ${CONTRACT_SIZE_WARNING}\n  --> ${path.join("test", "contracts", "Helper.sol")}:1:1:`;
      assert.equal(
        shouldSuppressWarning(
          message,
          SOLIDITY_TESTS_PATH,
          PROJECT_ROOT,
          false,
        ),
        true,
      );
    });

    it("should fall through to other rules when coverage=true but no coverage warning matches", () => {
      const message = `Warning: ${SPDX_WARNING}\n  --> ${path.join("contracts", "Counter.t.sol")}:1:1:`;
      assert.equal(
        shouldSuppressWarning(message, SOLIDITY_TESTS_PATH, PROJECT_ROOT, true),
        true,
      );
    });
  });

  describe("Initcode-size warning", () => {
    it("should suppress initcode-size warning on a user file when coverage=true", () => {
      const message = `Warning: ${INIT_CODE_SIZE_WARNING}\n  --> ${path.join("contracts", "Foo.sol")}:1:1:`;
      assert.equal(
        shouldSuppressWarning(message, SOLIDITY_TESTS_PATH, PROJECT_ROOT, true),
        true,
      );
    });

    it("should NOT suppress initcode-size warning on a user file when coverage=false", () => {
      const message = `Warning: ${INIT_CODE_SIZE_WARNING}\n  --> ${path.join("contracts", "Foo.sol")}:1:1:`;
      assert.equal(
        shouldSuppressWarning(
          message,
          SOLIDITY_TESTS_PATH,
          PROJECT_ROOT,
          false,
        ),
        false,
      );
    });

    it("should suppress initcode-size warning on a .t.sol file when coverage=false", () => {
      const message = `Warning: ${INIT_CODE_SIZE_WARNING}\n  --> ${path.join("contracts", "Counter.t.sol")}:1:1:`;
      assert.equal(
        shouldSuppressWarning(
          message,
          SOLIDITY_TESTS_PATH,
          PROJECT_ROOT,
          false,
        ),
        true,
      );
    });

    it("should suppress initcode-size warning on a file in the Solidity tests dir when coverage=false", () => {
      const message = `Warning: ${INIT_CODE_SIZE_WARNING}\n  --> ${path.join("test", "contracts", "Helper.sol")}:1:1:`;
      assert.equal(
        shouldSuppressWarning(
          message,
          SOLIDITY_TESTS_PATH,
          PROJECT_ROOT,
          false,
        ),
        true,
      );
    });
  });

  describe("non-matching warnings", () => {
    it("should NOT suppress warnings that don't match any rule", () => {
      const message = `Warning: Some other warning message\n  --> ./test/contracts/Example.sol:1:1:`;
      assert.equal(
        shouldSuppressWarning(
          message,
          SOLIDITY_TESTS_PATH,
          PROJECT_ROOT,
          false,
        ),
        false,
      );
    });
  });
});
