/**
 * This module defines different Buidler execution modes and autodetects them.
 *
 * IMPORTANT: This will have to be revisited once Yarn PnP and npm's tink get
 * widely adopted.
 */
export enum ExecutionMode {
  EXECUTION_MODE_TS_NODE_TESTS,
  EXECUTION_MODE_LINKED,
  EXECUTION_MODE_GLOBAL_INSTALLATION,
  EXECUTION_MODE_LOCAL_INSTALLATION
}

const workingDirectoryOnLoad = process.cwd();

export function getExecutionMode(): ExecutionMode {
  const isInstalled = __filename.includes("node_modules");

  if (!isInstalled) {
    // When running the tests with ts-node we set the CWD to the root of
    // buidler-core. We could check if the __filename ends with .ts
    if (__dirname.startsWith(workingDirectoryOnLoad)) {
      return ExecutionMode.EXECUTION_MODE_TS_NODE_TESTS;
    }

    return ExecutionMode.EXECUTION_MODE_LINKED;
  }

  if (require("is-installed-globally")) {
    return ExecutionMode.EXECUTION_MODE_GLOBAL_INSTALLATION;
  }

  return ExecutionMode.EXECUTION_MODE_LOCAL_INSTALLATION;
}
