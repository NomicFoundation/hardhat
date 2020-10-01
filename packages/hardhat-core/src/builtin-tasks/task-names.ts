export const TASKS = {
  CHECK: {
    MAIN: "check",
  },
  CLEAN: {
    MAIN: "clean",
  },
  COMPILE: {
    MAIN: "compile",
    GET_COMPILATION_TASKS: "compile:get-compilation-tasks",
    SOLIDITY: {
      MAIN: "compile:solidity",
      GET_SOURCE_PATHS: "compile:solidity:get-source-paths",
      GET_SOURCE_NAMES: "compile:solidity:get-source-names",
      GET_DEPENDENCY_GRAPH: "compile:solidity:get-dependency-graph",
      GET_COMPILATION_JOBS: "compile:solidity:get-compilation-jobs",
      GET_COMPILATION_JOB_FOR_FILE:
        "compile:solidity:get-compilation-job-for-file",
      FILTER_COMPILATION_JOBS: "compile:solidity:filter-compilation-jobs",
      MERGE_COMPILATION_JOBS: "compile:solidity:merge-compilation-jobs",
      COMPILE_JOB: "compile:solidity:compile-job",
      COMPILE_JOBS: "compile:solidity:compile-jobs",
      GET_COMPILER_INPUT: "compile:solidity:get-compiler-input",
      COMPILE: "compile:solidity:compile",
      CHECK_ERRORS: "compile:solidity:check-errors",
      EMIT_ARTIFACTS: "compile:solidity:emit-artifacts",
      GET_ARTIFACT_FROM_COMPILATION_OUTPUT:
        "compile:solidity:get-artifact-from-compilation-output",
      HANDLE_COMPILATION_JOBS_FAILURES:
        "compile:solidity:handle-compilation-jobs-failures",
      GET_COMPILATION_JOBS_FAILURES_MESSAGE:
        "compile:solidity:get-compilation-jobs-failures-message",
      SOLCJS: {
        MAIN: "compile:solidity:solcjs",
        GET_PATH: "compile:solidity:solcjs:get_path",
        RUN: "compile:solidity:solcjs:run",
      },
      LOG: {
        NOTHING_TO_COMPILE: "compile:solidity:log:nothing-to-compile",
        RUN_SOLCJS_START: "compile:solidity:log:run-solcjs-start",
        RUN_SOLCJS_END: "compile:solidity:log:run-soljs-end",
        DOWNLOAD_SOLCJS_START: "compile:solidity:log:download-solc-js-start",
        DOWNLOAD_SOLCJS_END: "compile:solidity:log:download-solc-js-end",
        COMPILATION_ERRORS: "compile:solidity:log:compilation-errors",
      },
    },
  },
  CONSOLE: {
    MAIN: "console",
  },
  FLATTEN: {
    MAIN: "flatten",
    GET_FLATTENED_SOURCES: "flatten:get-flattened-sources",
  },
  HELP: {
    MAIN: "help",
  },
  RUN: {
    MAIN: "run",
  },
  NODE: {
    MAIN: "node",
  },
  TEST: {
    MAIN: "test",
    GET_TEST_FILES: "test:get-test-files",
    RUN_MOCHA_TESTS: "test:run-mocha-tests",
    SETUP_TEST_ENVIRONMENT: "test:setup-test-environment",
    SHOW_FORK_RECOMMENDATIONS: "test:show-fork-recommendations",
  },
};

export function isABuiltinTaskName(
  taskName: string,
  tasks: object = TASKS
): boolean {
  for (const value of Object.values(tasks)) {
    if (value === taskName) {
      return true;
    }

    if (typeof value !== "string") {
      if (isABuiltinTaskName(taskName, value)) {
        return true;
      }
    }
  }

  return false;
}
