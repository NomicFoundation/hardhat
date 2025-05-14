import { TestPathsConfig } from "../../../types/config.js";
import "../../../types/hooks.js";
declare module "../../../types/hooks.js" {
  export interface HardhatHooks {
    test: TestHooks;
  }

  export interface TestHooks {
    /**
     * This hook is triggered when test files are passed to the test plugin, but no test runner is specified. It runs before the tests are executed.
     * Each test plugin defines its own test runner and specifies a custom path in the Hardhat configuration where its associated tests reside.
     * When this hook is invoked, the plugin receives the file path and it should check whether it matches the configured test path.
     * If it does, the plugin should return its test runner; otherwise, it should call the next function to allow other plugins to process the file.
     *
     * @param context The hook context.
     * @param filePath The path to the test file.
     * @param next A function to call the next handler for this hook, or the
     * default implementation if no more handlers exist.
     */
    registerFileForTestRunner: (
      context: HookContext,
      filePath: string,
      next: (
        nextContext: HookContext,
        filePath: string,
      ) => Promise<string | undefined>,
    ) => Promise<string | undefined>;
  }
}
