declare module "../../../types/global-options.js" {
  export interface GlobalOptions {
    coverage: boolean;
  }
}

declare module "../../../types/config.js" {
  export interface CoverageUserConfig {
    /**
     * Globs of Solidity source files to exclude from coverage instrumentation.
     * A project file whose project-relative source name matches any of these
     * globs is not instrumented during a `--coverage` run, and so does not
     * appear in coverage reports.
     */
    skipFiles?: string[];
  }

  export interface HardhatUserConfig {
    coverage?: CoverageUserConfig;
  }

  export interface CoverageConfig {
    skipFiles: string[];
  }

  export interface HardhatConfig {
    coverage: CoverageConfig;
  }
}
