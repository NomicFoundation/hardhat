import { assert, expect } from "chai";
import "hardhat/types/artifacts";
import "hardhat/types/runtime";

declare module "hardhat/types/artifacts" {
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
