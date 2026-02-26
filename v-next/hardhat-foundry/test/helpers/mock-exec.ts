import type { ExecAsyncFn } from "../../src/internal/foundry/forge.js";

/**
 * Mock scenarios for forge commands.
 */
export const MOCK_SCENARIOS = {
  // forge remappings scenarios
  SUCCESS: {
    stdout:
      "@openzeppelin/=lib/openzeppelin-contracts/\nforge-std/=lib/forge-std/src/\n",
    stderr: "",
    code: 0,
  },
  EMPTY: {
    stdout: "",
    stderr: "",
    code: 0,
  },
  WINDOWS_LINE_ENDINGS: {
    stdout:
      "@openzeppelin/=lib/openzeppelin-contracts/\r\nforge-std/=lib/forge-std/src/\r\n",
    stderr: "",
    code: 0,
  },
  NOT_INSTALLED: {
    stdout: "",
    stderr: "forge: command not found",
    code: 127,
  },
  CONFIG_ERROR: {
    stdout: "",
    stderr: "Error: failed to parse foundry.toml",
    code: 1,
  },

  // forge --version scenarios
  FORGE_VERSION_SUCCESS: {
    stdout: "forge 0.2.0\n",
    stderr: "",
    code: 0,
  },
  FORGE_VERSION_NOT_INSTALLED: {
    stdout: "",
    stderr: "forge: command not found",
    code: 127,
  },
};

/**
 * Create a mock execAsync function for a specific scenario.
 *
 * @param scenario - The mock scenario to use (from MOCK_SCENARIOS).
 * @returns A mock execAsync function.
 */
export function createMockExec(
  scenario: (typeof MOCK_SCENARIOS)[keyof typeof MOCK_SCENARIOS],
): ExecAsyncFn {
  return async (_command: string, _options: any) => {
    if (scenario.code !== 0) {
      const error: any = new Error(scenario.stderr);
      error.code = scenario.code;
      error.stdout = scenario.stdout;
      error.stderr = scenario.stderr;
      throw error;
    }
    return { stdout: scenario.stdout, stderr: scenario.stderr };
  };
}

/**
 * Create a mock execAsync function that routes based on command.
 *
 * @param scenarios - Configuration for different commands.
 * @returns A mock execAsync function.
 */
export function createCommandAwareMockExec(scenarios: {
  forgeVersion?: (typeof MOCK_SCENARIOS)[keyof typeof MOCK_SCENARIOS];
  forgeRemappings?: (typeof MOCK_SCENARIOS)[keyof typeof MOCK_SCENARIOS];
}): ExecAsyncFn {
  return async (command: string, _options: any) => {
    const scenario = command.includes("forge --version")
      ? scenarios.forgeVersion ?? MOCK_SCENARIOS.FORGE_VERSION_SUCCESS
      : scenarios.forgeRemappings ?? MOCK_SCENARIOS.SUCCESS;

    if (scenario.code !== 0) {
      const error: any = new Error(scenario.stderr);
      error.code = scenario.code;
      error.stdout = scenario.stdout;
      error.stderr = scenario.stderr;
      throw error;
    }
    return { stdout: scenario.stdout, stderr: scenario.stderr };
  };
}
