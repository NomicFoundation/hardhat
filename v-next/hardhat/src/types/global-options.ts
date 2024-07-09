import "@ignored/hardhat-vnext-core/types/global-options";

declare module "@ignored/hardhat-vnext-core/types/global-options" {
  export interface GlobalOptions {
    config: string;
    help: boolean;
    init: boolean;
    showStackTraces: boolean;
    version: boolean;
  }
}

export type * from "@ignored/hardhat-vnext-core/types/global-options";
export * from "@ignored/hardhat-vnext-core/types/global-options";
