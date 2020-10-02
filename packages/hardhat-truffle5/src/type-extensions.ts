import { assert, expect } from "chai";
import "hardhat/types/runtime";

import { TruffleEnvironmentArtifacts } from "./artifacts";

declare module "hardhat/types/runtime" {
  export interface HardhatRuntimeEnvironment {
    artifacts: TruffleEnvironmentArtifacts;

    assert: typeof assert;
    expect: typeof expect;
    contract: (
      description: string,
      definition: (accounts: string[]) => any
    ) => void;
  }
}
