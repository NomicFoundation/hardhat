import type { HardhatUserConfig } from "../../../../../../src/config.js";

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { SUPPRESSED_WARNINGS } from "../../../../../../src/internal/builtin-plugins/solidity/build-system/warning-suppression.js";
import { useTestProjectTemplate } from "../resolver/helpers.js";

//
// Integration smoke tests - full coverage is provided by
// unit tests in warning-suppression.ts
//

const NATSPEC_MEMORY_SAFE_WARNING = SUPPRESSED_WARNINGS[0].message;
const SPDX_WARNING = SUPPRESSED_WARNINGS[1].message;
const PRAGMA_WARNING = SUPPRESSED_WARNINGS[2].message;

// Project with the warning in a regular contract file (not console.sol)
const projectWithNatspecWarningInRegularFile = {
  name: "natspec-warning-test",
  version: "1.0.0",
  files: {
    "contracts/NatspecWarning.sol": `// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.33;

contract NatspecWarning {
  constructor() {
    /// @solidity memory-safe-assembly
    assembly {}
  }
}
`,
  },
};

// Project with the warning in console.sol (should be filtered)
const projectWithNatspecWarningInConsole = {
  name: "natspec-warning-console-test",
  version: "1.0.0",
  files: {
    "contracts/hardhat/console.sol": `// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.33;

library console {
  function log() internal pure {
    /// @solidity memory-safe-assembly
    assembly {}
  }
}
`,
  },
};

// Project with missing SPDX/pragma in a .t.sol test file (should suppress warnings)
const projectWithMissingSpdxPragmaInTestFile = {
  name: "missing-spdx-pragma-test-file",
  version: "1.0.0",
  files: {
    "contracts/Counter.t.sol": `contract CounterTest {
  function testIncrement() public {
    // test code
  }
}
`,
  },
};

// Project with missing SPDX/pragma in a regular contract (should show warnings)
const projectWithMissingSpdxPragmaInRegularFile = {
  name: "missing-spdx-pragma-test",
  version: "1.0.0",
  files: {
    "contracts/Counter.sol": `contract Counter {
  uint256 public count;

  function increment() public {
    count += 1;
  }
}
`,
  },
};

const solidity0833Config: HardhatUserConfig = {
  solidity: {
    profiles: {
      default: {
        compilers: [{ version: "0.8.33" }],
      },
    },
  },
};

const noop = () => {};

const testScenarios = [
  {
    name: "should NOT filter out the deprecated natspec warning from regular files",
    project: projectWithNatspecWarningInRegularFile,
    warnings: [NATSPEC_MEMORY_SAFE_WARNING],
    shouldSuppress: false,
  },
  {
    name: "should filter out the deprecated natspec warning from console.sol",
    project: projectWithNatspecWarningInConsole,
    warnings: [NATSPEC_MEMORY_SAFE_WARNING],
    shouldSuppress: true,
  },
  {
    name: "should filter out SPDX/pragma warnings from .t.sol test files (test-files scope)",
    project: projectWithMissingSpdxPragmaInTestFile,
    warnings: [SPDX_WARNING, PRAGMA_WARNING],
    shouldSuppress: true,
  },
  {
    name: "should NOT filter out SPDX/pragma warnings from regular contracts",
    project: projectWithMissingSpdxPragmaInRegularFile,
    warnings: [SPDX_WARNING, PRAGMA_WARNING],
    shouldSuppress: false,
  },
];

describe("build system - warning filtering", function () {
  for (const scenario of testScenarios) {
    it(scenario.name, async (t) => {
      const consoleWarnMock = t.mock.method(console, "warn", noop);

      await using project = await useTestProjectTemplate(scenario.project);

      const hre = await project.getHRE(solidity0833Config);

      await hre.tasks.getTask("build").run({ force: true });

      for (const warning of scenario.warnings) {
        const warningWasShown = consoleWarnMock.mock.calls.some((call) => {
          const message = String(call.arguments[0] ?? "");
          return message.includes(warning);
        });

        if (scenario.shouldSuppress) {
          assert.ok(
            !warningWasShown,
            `Expected warning "${warning}" to be suppressed, but it was shown`,
          );
        } else {
          assert.ok(
            warningWasShown,
            `Expected warning "${warning}" to be shown, but it was suppressed`,
          );
        }
      }
    });
  }
});
