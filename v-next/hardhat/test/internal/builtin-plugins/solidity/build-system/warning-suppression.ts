import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  shouldSuppressWarning,
  SUPPRESSED_WARNINGS,
} from "../../../../../src/internal/builtin-plugins/solidity/build-system/warning-suppression.js";

describe("shouldSuppressWarning", () => {
  const NATSPEC_WARNING = SUPPRESSED_WARNINGS[0].message;
  const SPDX_WARNING = SUPPRESSED_WARNINGS[1].message;
  const PRAGMA_WARNING = SUPPRESSED_WARNINGS[2].message;

  describe("Natspec memory-safe-assembly warning (specific-file scope)", () => {
    const scenarios = [
      {
        name: "should suppress warnings from console.sol",
        path: "./hardhat/console.sol",
        expected: true,
      },
      {
        name: "should suppress warnings from console.sol with absolute path",
        path: "/home/user/project/hardhat/console.sol",
        expected: true,
      },
      {
        name: "should NOT suppress warnings from regular contract files",
        path: "./contracts/Example.sol",
        expected: false,
      },
      {
        name: "should NOT suppress warnings from test files",
        path: "./contracts/Counter.t.sol",
        expected: false,
      },
    ];

    for (const scenario of scenarios) {
      it(scenario.name, () => {
        const message = `Warning: ${NATSPEC_WARNING}\n  --> ${scenario.path}:1:1:`;
        assert.equal(shouldSuppressWarning(message), scenario.expected);
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
          path: "./contracts/Counter.t.sol",
        },
        {
          name: "from .t.sol files in subdirectories",
          path: "./test/solidity/Example.t.sol",
        },
      ];

      for (const warning of testFileWarnings) {
        for (const scenario of scenarios) {
          it(`should suppress ${warning.name} warning ${scenario.name}`, () => {
            const message = `Warning: ${warning.message}\n  --> ${scenario.path}:1:1:`;
            assert.equal(shouldSuppressWarning(message), true);
          });
        }
      }
    });

    describe("should suppress from test/contracts/ directory", () => {
      const scenarios = [
        {
          name: "from test/contracts/ directory",
          path: "./test/contracts/Example.sol",
        },
        {
          name: "from nested test/contracts/ subdirectories",
          path: "./test/contracts/utils/Helper.sol",
        },
        {
          name: "with Windows-style paths",
          path: ".\\test\\contracts\\Example.sol",
        },
        {
          name: "with absolute paths",
          path: "/home/user/project/test/contracts/Example.sol",
        },
      ];

      for (const warning of testFileWarnings) {
        for (const scenario of scenarios) {
          it(`should suppress ${warning.name} warning ${scenario.name}`, () => {
            const message = `Warning: ${warning.message}\n  --> ${scenario.path}:1:1:`;
            assert.equal(shouldSuppressWarning(message), true);
          });
        }
      }
    });

    describe("should NOT suppress from non-test files", () => {
      const scenarios = [
        {
          name: "from regular contracts directory",
          path: "./contracts/Counter.sol",
        },
        {
          name: "from test/ directory (only test/contracts/ is suppressed)",
          path: "./test/Example.sol",
        },
        {
          name: "from files with 'test' in the filename",
          path: "./contracts/TestHelper.sol",
        },
        {
          name: "from directories with 'test' as substring (laTEST)",
          path: "./contracts/latest/Example.sol",
        },
        {
          name: "from test/utils directory (only test/contracts/ is suppressed)",
          path: "./test/utils/Helper.sol",
        },
        {
          name: "from test/contracts.sol file (not a directory)",
          path: "./test/contracts.sol",
        },
      ];

      for (const warning of testFileWarnings) {
        for (const scenario of scenarios) {
          it(`should NOT suppress ${warning.name} warning ${scenario.name}`, () => {
            const message = `Warning: ${warning.message}\n  --> ${scenario.path}:1:1:`;
            assert.equal(shouldSuppressWarning(message), false);
          });
        }
      }
    });
  });

  describe("non-matching warnings", () => {
    it("should NOT suppress warnings that don't match any rule", () => {
      const message = `Warning: Some other warning message\n  --> ./test/contracts/Example.sol:1:1:`;
      assert.equal(shouldSuppressWarning(message), false);
    });
  });
});
