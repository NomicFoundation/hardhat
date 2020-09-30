import { assert, expect } from "chai";
import "hardhat/types/artifact";
import "hardhat/types/runtime";

declare module "hardhat/types/artifact" {
  export interface Artifacts {
    require: (name: string) => any;
  }
}

declare module "hardhat/types/runtime" {
  export interface HardhatRuntimeEnvironment {
    assert: typeof assert;
    expect: typeof expect;
    contract: (
      description: string,
      definition: (accounts: string[]) => any
    ) => void;
  }
}
