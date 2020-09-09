export const TASK_CHECK = "check";

export const TASK_CLEAN = "clean";

// fvtodo add meta-compile task
// fvtodo check what can be deleted here
export const TASK_COMPILE = "compile";
export const TASK_COMPILE_GET_COMPILATION_TASKS =
  "compile:get-compilation-tasks";
export const TASK_COMPILE_SOLIDITY = "compile:solidity";
export const TASK_COMPILE_GET_SOURCE_PATHS =
  "compile:solidity:get-source-paths";
export const TASK_COMPILE_GET_SOURCE_NAMES =
  "compile:solidity:get-source-names";
export const TASK_COMPILE_GET_RESOLVED_SOURCES =
  "compile:solidity:get-resolved-sources";
export const TASK_COMPILE_GET_DEPENDENCY_GRAPH =
  "compile:solidity:get-dependency-graph";
export const TASK_COMPILE_GET_COMPILATION_GROUPS =
  "compile:solidity:get-compilation-groups";
export const TASK_COMPILE_GET_COMPILATION_GROUP_FOR_FILE =
  "compile:solidity:get-compilation-group-for-file";
export const TASK_COMPILE_FILTER_COMPILATION_GROUPS =
  "compile:solidity:filter-compilation-groups";
export const TASK_COMPILE_MERGE_COMPILATION_GROUPS =
  "compile:solidity:merge-compilation-groups";
export const TASK_COMPILE_COMPILE_GROUP = "compile:solidity:compile-group";
export const TASK_COMPILE_COMPILE_GROUPS = "compile:solidity:compile-groups";
export const TASK_COMPILE_GET_COMPILER_INPUT =
  "compile:solidity:get-compiler-input";
export const TASK_COMPILE_RUN_COMPILER = "compile:solidity:run-compiler";
export const TASK_COMPILE_COMPILE = "compile:solidity:compile";
export const TASK_COMPILE_COMPILE_SOLCJS = "compile:solidity:solcjs:compile";
export const TASK_COMPILE_CHECK_CACHE = "compile:solidity:cache";
export const TASK_COMPILE_CHECK_ERRORS = "compile:solidity:check-errors";
export const TASK_COMPILE_EMIT_ARTIFACTS = "compile:solidity:emit-artifacts";
export const TASK_COMPILE_HANDLE_COMPILATION_GROUPS_FAILURES =
  "compile:solidity:handle-compilation-groups-failures";
export const TASK_COMPILE_GET_COMPILATION_GROUPS_FAILURES_MESSAGE =
  "compile:solidity:get-compilation-groups-failures-message";

export const TASK_BUILD_ARTIFACTS = "compile:solidity:build-artifacts";

export const TASK_CONSOLE = "console";

export const TASK_FLATTEN = "flatten";
export const TASK_FLATTEN_GET_FLATTENED_SOURCE =
  "flatten:get-flattened-sources";

export const TASK_HELP = "help";

export const TASK_RUN = "run";

export const TASK_NODE = "node";

export const TASK_TEST = "test";

export const TASK_TEST_RUN_MOCHA_TESTS = "test:run-mocha-tests";
export const TASK_TEST_GET_TEST_FILES = "test:get-test-files";
export const TASK_TEST_SETUP_TEST_ENVIRONMENT = "test:setup-test-environment";
