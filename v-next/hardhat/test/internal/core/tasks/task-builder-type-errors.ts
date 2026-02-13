import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, it } from "node:test";

import { useFixtureProject } from "@nomicfoundation/hardhat-test-utils";
import { findClosestPackageRoot } from "@nomicfoundation/hardhat-utils/package";

interface TypeTestScenario {
  name: string;
  category: string;
  code: string;
  shouldError: boolean;
  expectedError?: string | RegExp;
}

// All type error scenarios that should be validated by the TypeScript compiler.
const TYPE_TEST_SCENARIOS: TypeTestScenario[] = [
  //
  // User tasks - duplicate actions
  //
  {
    name: "duplicate setAction calls",
    category: "User tasks - duplicate actions",
    code: `
      task("test").setAction(async () => ({ default: () => {} }))
                  .setAction(async () => ({ default: () => {} }))
                  .build();
    `,
    shouldError: false,
  },
  {
    name: "duplicate setInlineAction calls",
    category: "User tasks - duplicate actions",
    code: `
      task("test").setInlineAction(() => {})
                  .setInlineAction(() => {})
                  .build();
    `,
    shouldError: false,
  },
  {
    name: "mixed setAction then setInlineAction",
    category: "User tasks - duplicate actions",
    code: `
      task("test").setAction(async () => ({ default: () => {} }))
                  .setInlineAction(() => {})
                  .build();
    `,
    shouldError: false,
  },
  {
    name: "mixed setInlineAction then setAction",
    category: "User tasks - duplicate actions",
    code: `
      task("test").setInlineAction(() => {})
                  .setAction(async () => ({ default: () => {} }))
                  .build();
    `,
    shouldError: false,
  },

  //
  // User tasks - missing action
  //
  {
    name: "task without action",
    category: "User tasks - missing action",
    code: `
      task("test").addOption({ name: "opt", defaultValue: "value" })
                  .build();
    `,
    shouldError: false,
  },

  //
  // User tasks - valid usage
  //
  {
    name: "task with setAction",
    category: "User tasks - valid usage",
    code: `
      task("test").setAction(async () => ({ default: () => {} }))
                  .build();
    `,
    shouldError: false,
  },
  {
    name: "task with setInlineAction",
    category: "User tasks - valid usage",
    code: `
      task("test").setInlineAction(() => {})
                  .build();
    `,
    shouldError: false,
  },

  //
  // Task overrides - duplicate actions
  //
  {
    name: "duplicate setAction calls in override",
    category: "Task overrides - duplicate actions",
    code: `
      overrideTask("compile").setAction(async () => ({ default: () => {} }))
                             .setAction(async () => ({ default: () => {} }))
                             .build();
    `,
    shouldError: false,
  },
  {
    name: "duplicate setInlineAction calls in override",
    category: "Task overrides - duplicate actions",
    code: `
      overrideTask("compile").setInlineAction(() => {})
                             .setInlineAction(() => {})
                             .build();
    `,
    shouldError: false,
  },
  {
    name: "mixed setInlineAction then setAction in override",
    category: "Task overrides - duplicate actions",
    code: `
      overrideTask("compile").setInlineAction(() => {})
                             .setAction(async () => ({ default: () => {} }))
                             .build();
    `,
    shouldError: false,
  },
  {
    name: "mixed setAction then setInlineAction in override",
    category: "Task overrides - duplicate actions",
    code: `
      overrideTask("compile").setAction(async () => ({ default: () => {} }))
                             .setInlineAction(() => {})
                             .build();
    `,
    shouldError: false,
  },

  //
  // Task overrides - valid usage
  //
  {
    name: "override with setAction",
    category: "Task overrides - valid usage",
    code: `
      overrideTask("compile").setAction(async () => ({ default: () => {} }))
                             .build();
    `,
    shouldError: false,
  },
  {
    name: "override with setInlineAction",
    category: "Task overrides - valid usage",
    code: `
      overrideTask("compile").setInlineAction(() => {})
                             .build();
    `,
    shouldError: false,
  },

  //
  // Plugin tasks - file-based actions
  //
  {
    name: "plugin task with setAction",
    category: "Plugin tasks - file-based actions",
    code: `
      const t: PluginTaskDefinition = task("test")
        .setAction(async () => ({ default: () => {} }))
        .build();
    `,
    shouldError: false,
  },
  {
    name: "plugin override with setAction",
    category: "Plugin tasks - file-based actions",
    code: `
      const t: PluginTaskDefinition = overrideTask("compile")
        .setAction(async () => ({ default: () => {} }))
        .build();
    `,
    shouldError: false,
  },

  //
  // Plugin tasks - inline action restrictions
  //
  {
    name: "plugin task with setInlineAction",
    category: "Plugin tasks - inline action restrictions",
    code: `
      const t: PluginTaskDefinition = task("test")
        .setInlineAction(() => {})
        .build();
    `,
    shouldError: true,
    expectedError: /is not assignable to type .PluginTaskDefinition./,
  },
  {
    name: "plugin override with setInlineAction",
    category: "Plugin tasks - inline action restrictions",
    code: `
      const t: PluginTaskDefinition = overrideTask("compile")
        .setInlineAction(() => {})
        .build();
    `,
    shouldError: true,
    expectedError: /is not assignable to type .PluginTaskDefinition./,
  },
  {
    name: "plugin task without action",
    category: "Plugin tasks - inline action restrictions",
    code: `
      const t: PluginTaskDefinition = task("test")
        .addOption({ name: "opt", defaultValue: "value" })
        .build();
    `,
    shouldError: true,
    expectedError: /is not assignable to type .PluginTaskDefinition./,
  },
];

/**
 * Runs TypeScript compiler on a code snippet to check for type errors.
 * Creates a temporary file in the fixture project directory.
 */
async function runTypeCheckOnCode(code: string) {
  const packageRoot = await findClosestPackageRoot(import.meta.url);
  // On Windows, binaries have .cmd extension
  const tscBin = process.platform === "win32" ? "tsc.cmd" : "tsc";
  const tscPath = join(packageRoot, "node_modules", ".bin", tscBin);
  const tsconfigPath = join(process.cwd(), "tsconfig.json");

  // Generate unique temp file name
  const timestamp = Date.now();
  const randomId = Math.random().toString(36).substring(7);
  const tempFilePath = join(
    process.cwd(),
    `.temp-type-test-${timestamp}-${randomId}.ts`,
  );

  try {
    // Write test file with imports and code
    await writeFile(
      tempFilePath,
      `import type { PluginTaskDefinition } from "../../../src/types/plugins.js";
import { task, overrideTask } from "../../../src/internal/core/config.js";

${code}
`,
    );

    // Run TypeScript compiler
    const result = await new Promise<{
      hasError: boolean;
      errorMessage: string;
    }>((resolve, reject) => {
      const child = spawn(tscPath, ["--project", tsconfigPath, "--noEmit"], {
        cwd: packageRoot,
      });

      let output = "";
      child.stdout.on("data", (data) => (output += data));
      child.stderr.on("data", (data) => (output += data));
      child.on("error", reject);
      child.on("close", (exitCode) =>
        resolve({
          hasError: exitCode !== 0,
          errorMessage: output,
        }),
      );
    });

    return result;
  } finally {
    await rm(tempFilePath, { force: true }).catch(() => {
      /* ignore cleanup errors */
    });
  }
}

/**
 * Asserts that a type error occurred and matches the expected pattern.
 */
function assertTypeError(
  result: { hasError: boolean; errorMessage: string },
  scenario: TypeTestScenario,
) {
  assert.ok(
    result.hasError,
    `Expected type error but compilation succeeded.\nCode:\n${scenario.code}`,
  );

  if (scenario.expectedError !== undefined) {
    const pattern = scenario.expectedError;
    if (typeof pattern === "string") {
      assert.ok(
        result.errorMessage.includes(pattern),
        `Expected error containing "${pattern}".\nActual:\n${result.errorMessage}`,
      );
    } else {
      assert.match(
        result.errorMessage,
        pattern,
        `Error message did not match pattern.\nActual:\n${result.errorMessage}`,
      );
    }
  }
}

/**
 * Asserts that no type error occurred.
 */
function assertNoTypeError(
  result: { hasError: boolean; errorMessage: string },
  scenario: TypeTestScenario,
) {
  assert.ok(
    !result.hasError,
    `Expected compilation to succeed.\nError:\n${result.errorMessage}\nCode:\n${scenario.code}`,
  );
}

//
// Run tests
//

// Use fixture project that contains tsconfig.json and .gitignore for temp files
useFixtureProject("task-builder-types");

// Group scenarios by category and generate tests
const scenariosByCategory = new Map<string, TypeTestScenario[]>();
for (const scenario of TYPE_TEST_SCENARIOS) {
  const scenarios = scenariosByCategory.get(scenario.category) ?? [];
  scenarios.push(scenario);
  scenariosByCategory.set(scenario.category, scenarios);
}

for (const [category, scenarios] of scenariosByCategory) {
  describe(category, () => {
    for (const scenario of scenarios) {
      const testName = `should ${scenario.shouldError ? "reject" : "allow"} ${scenario.name}`;

      it(testName, async () => {
        const result = await runTypeCheckOnCode(scenario.code);

        if (scenario.shouldError) {
          assertTypeError(result, scenario);
        } else {
          assertNoTypeError(result, scenario);
        }
      });
    }
  });
}
