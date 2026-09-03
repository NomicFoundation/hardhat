import type { HardhatUserConfig } from "../../../../../../src/config.js";
import type { TestProject } from "../resolver/helpers.js";
import type { TestContext } from "node:test";

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { useTestProjectTemplate } from "../resolver/helpers.js";

/**
 * What a build prints, compared between the two implementations.
 *
 * The plan keeps all terminal output in TypeScript and has the Rust port
 * return structured results for it to print, so "the output is the same" isn't
 * a hope about two pieces of formatting code agreeing — the formatting is one
 * piece of code, in `build-system/printing.ts`, and both implementations call
 * it. What could still differ is what they call it *with*, and in what order,
 * and that is what these compare.
 *
 * The whole build is driven twice through the `build` task, in one process, so
 * the comparison is of the same project, the same compiler, and the same
 * console.
 */

const solidityConfig: HardhatUserConfig = {
  solidity: {
    profiles: {
      default: {
        compilers: [{ version: "0.8.28" }],
      },
    },
  },
};

const projectWithSeveralRoots = {
  name: "rust-port-output",
  version: "1.0.0",
  files: {
    "contracts/A.sol": `// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import "./B.sol";

contract A {
  B public b;
}
`,
    "contracts/B.sol": `// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

contract B {
  uint256 public x;
}
`,
    "contracts/C.sol": `// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

contract C {
  function f() public pure returns (uint256) {
    return 1;
  }
}
`,
  },
};

const projectWithAWarning = {
  name: "rust-port-output-warning",
  version: "1.0.0",
  files: {
    // No SPDX identifier and an unused parameter, which are two warnings the
    // compiler emits and a build shows.
    "contracts/Warned.sol": `pragma solidity 0.8.28;

contract Warned {
  function f(uint256 unused) public pure returns (uint256) {
    return 1;
  }
}
`,
  },
};

const projectThatFailsToCompile = {
  name: "rust-port-output-failure",
  version: "1.0.0",
  files: {
    "contracts/Broken.sol": `// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

contract Broken {
  function f() public pure returns (uint256) {
    return notDeclared;
  }
}
`,
  },
};

/**
 * Everything a build printed, in order, with the stream it went to.
 *
 * `console.log`, `console.warn` and `console.error` are what the printing uses;
 * the spinner writes to the stream directly and is deliberately not compared,
 * since it's overwritten as it goes and leaves nothing behind.
 */
async function printedBy(
  t: TestContext,
  project: TestProject,
  useRustPort: boolean,
): Promise<string[]> {
  const printed: string[] = [];

  for (const stream of ["log", "warn", "error"] as const) {
    t.mock.method(console, stream, (...args: unknown[]) => {
      printed.push(`${stream}: ${args.map((arg) => String(arg)).join(" ")}`);
    });
  }

  const hre = await project.getHRE(solidityConfig, {
    rustBuildSystem: useRustPort,
  });

  try {
    await hre.tasks.getTask("build").run({ force: true });
  } catch (error) {
    // A build that fails prints before it throws, and what it printed is the
    // point. The failure itself is compared by whether both implementations
    // threw.
    printed.push(
      `threw: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  return printed;
}

describe("build system - what the Rust port prints", function () {
  it("Should print what the TypeScript implementation prints", async (t) => {
    await using project = await useTestProjectTemplate(projectWithSeveralRoots);

    const typescript = await printedBy(t, project, false);
    const rust = await printedBy(t, project, true);

    assert.deepEqual(rust, typescript);

    // And it printed something, so that two silent builds can't pass this.
    assert.ok(
      typescript.some((line) => line.includes("Compiled")),
      `the build should have said what it compiled: ${JSON.stringify(typescript)}`,
    );
  });

  it("Should print the same warnings", async (t) => {
    await using project = await useTestProjectTemplate(projectWithAWarning);

    const typescript = await printedBy(t, project, false);
    const rust = await printedBy(t, project, true);

    assert.deepEqual(rust, typescript);

    assert.ok(
      typescript.some((line) => line.startsWith("warn:")),
      `the build should have warned: ${JSON.stringify(typescript)}`,
    );
  });

  it("Should print the same errors when a build fails", async (t) => {
    await using project = await useTestProjectTemplate(
      projectThatFailsToCompile,
    );

    const typescript = await printedBy(t, project, false);
    const rust = await printedBy(t, project, true);

    assert.deepEqual(rust, typescript);

    assert.ok(
      typescript.some((line) => line.startsWith("error:")),
      `the build should have reported an error: ${JSON.stringify(typescript)}`,
    );
    assert.ok(
      typescript.some((line) => line.startsWith("threw:")),
      `the build should have failed: ${JSON.stringify(typescript)}`,
    );
  });

  it("Should print nothing extra when the build is quiet", async (t) => {
    await using project = await useTestProjectTemplate(projectWithSeveralRoots);

    const printed: string[][] = [];

    for (const useRustPort of [false, true]) {
      const lines: string[] = [];

      for (const stream of ["log", "warn", "error"] as const) {
        t.mock.method(console, stream, (...args: unknown[]) => {
          lines.push(`${stream}: ${args.map(String).join(" ")}`);
        });
      }

      const hre = await project.getHRE(solidityConfig, {
        rustBuildSystem: useRustPort,
      });

      await hre.tasks.getTask("build").run({ force: true, quiet: true });

      printed.push(lines);
    }

    assert.deepEqual(printed[1], printed[0]);

    // `quiet` drops the summary line and keeps the diagnostics, and a project
    // with no diagnostics still gets the blank line that
    // `printSolcErrorsAndWarnings` writes before them — unconditionally, since
    // an empty list of errors isn't the same as no list. Both implementations
    // do it, which is what this file is about; that it happens at all is
    // Hardhat's behavior rather than something the port chose.
    assert.deepEqual(printed[0], ["log: "]);
  });
});
