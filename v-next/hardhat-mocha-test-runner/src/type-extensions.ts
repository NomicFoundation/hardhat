import "@ignored/hardhat-vnext/types/config";

import type { MochaOptions } from "mocha";

declare module "@ignored/hardhat-vnext/types/config" {
  export interface HardhatUserConfig {
    mocha?: MochaOptions;
  }

  export interface TestPathsUserConfig {
    mocha?: string;
  }

  export interface HardhatConfig {
    mocha: MochaOptions;
  }

  export interface TestPathsConfig {
    mocha: string;
  }
}

declare module "@ignored/hardhat-vnext/types/hooks" {
  export interface HardhatHooks {
    mocha: MochaHooks;
  }

  export interface MochaHooks {
    initialize(
      context: HookContext,
      next: (context: HookContext) => Promise<void>,
    ): Promise<void>;
  }
}
