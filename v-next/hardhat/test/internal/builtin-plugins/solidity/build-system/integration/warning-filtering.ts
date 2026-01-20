import type { HardhatUserConfig } from "../../../../../../src/config.js";

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { SUPPRESSED_WARNINGS } from "../../../../../../src/internal/builtin-plugins/solidity/build-system/build-system.js";
import { useTestProjectTemplate } from "../resolver/helpers.js";

const NATSPEC_MEMORY_SAFE_WARNING = SUPPRESSED_WARNINGS[0].message;

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

describe("build system - warning filtering", function () {
  it("should NOT filter out the deprecated natspec warning from regular files", async (t) => {
    const consoleWarnMock = t.mock.method(console, "warn", noop);

    await using project = await useTestProjectTemplate(
      projectWithNatspecWarningInRegularFile,
    );

    const hre = await project.getHRE(solidity0833Config);

    await hre.tasks.getTask("build").run({ force: true });

    // Check that the natspec warning WAS printed to console.warn
    const warningWasShown = consoleWarnMock.mock.calls.some((call) => {
      const message = String(call.arguments[0] ?? "");
      return message.includes(NATSPEC_MEMORY_SAFE_WARNING);
    });

    assert.ok(
      warningWasShown,
      "Expected natspec memory-safe-assembly warning to be shown for regular files",
    );
  });

  it("should filter out the deprecated natspec warning from console.sol", async (t) => {
    const consoleWarnMock = t.mock.method(console, "warn", noop);

    await using project = await useTestProjectTemplate(
      projectWithNatspecWarningInConsole,
    );

    const hre = await project.getHRE(solidity0833Config);

    await hre.tasks.getTask("build").run({ force: true });

    // Check that the natspec warning was NOT printed to console.warn
    for (const call of consoleWarnMock.mock.calls) {
      const message = String(call.arguments[0] ?? "");

      assert.ok(
        !message.includes(NATSPEC_MEMORY_SAFE_WARNING),
        `Expected natspec memory-safe-assembly warning to be filtered out for console.sol, but found: ${message}`,
      );
    }
  });
});
