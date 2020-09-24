import "@nomiclabs/buidler/types";
import { assert, expect } from "chai";

import { TruffleEnvironmentArtifacts } from "./artifacts";

declare module "@nomiclabs/buidler/types" {
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
