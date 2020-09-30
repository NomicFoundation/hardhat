import { assert, expect } from "chai";
import "hardhat/types/artifact";
import "hardhat/types/runtime";

import { TruffleEnvironmentArtifacts } from "./artifacts";

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

declare module "hardhat/types/artifact" {
  export interface Artifacts {
    require: TruffleEnvironmentArtifacts["require"];
  }
}
