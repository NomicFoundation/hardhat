import type { HardhatUserConfig } from "../../../../../../src/config.js";

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { SUPPRESSED_WARNINGS } from "../../../../../../src/internal/builtin-plugins/solidity/build-system/build-system.js";
import { useTestProjectTemplate } from "../resolver/helpers.js";

const NATSPEC_MEMORY_SAFE_WARNING = SUPPRESSED_WARNINGS[0];

const projectWithNatspecWarning = {
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

const solidity0833Config: HardhatUserConfig = {
  solidity: {
    profiles: {
      default: {
        compilers: [{ version: "0.8.33" }],
      },
    },
  },
};

describe("build system - warning filtering", function () {
  it("should filter out the deprecated natspec memory-safe-assembly warning", async (t) => {
    const consoleWarnMock = t.mock.method(console, "warn");

    await using project = await useTestProjectTemplate(
      projectWithNatspecWarning,
    );

    const hre = await project.getHRE(solidity0833Config);

    await hre.tasks.getTask("build").run({ force: true });

    // Check that the natspec warning was not printed to console.warn
    for (const call of consoleWarnMock.mock.calls) {
      const message = String(call.arguments[0] ?? "");
      assert.ok(
        !message.includes(NATSPEC_MEMORY_SAFE_WARNING),
        `Expected natspec memory-safe-assembly warning to be filtered out, but found: ${message}`,
      );
    }
  });
});
