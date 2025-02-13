/**
 * If this file's path contains "node_modules", we know that we're running
 * a version of Hardhat that has been installed by an user, and not the
 * development version.
 */
const IS_THIS_FILE_IN_NODE_MODULES: boolean = import.meta.dirname.includes(
  "node_modules",
);

/**
 * We set this environment variable to "true" when running our own CI.
 */
const IS_OUR_OWN_CI: boolean =
  process.env.__DO_NOT_USE_IS_HARDHAT_CI !== undefined;

/**
 * A flag to indicate whether we should warn about inline task actions and
 * hook handlers.
 */
export const SHOULD_WARN_ABOUT_INLINE_TASK_ACTIONS_AND_HOOK_HANDLERS: boolean =
  !IS_OUR_OWN_CI && IS_THIS_FILE_IN_NODE_MODULES;
