import "@nomiclabs/buidler/types";

import { TruffleEnvironmentArtifacts } from "./artifacts";

declare module "@nomiclabs/buidler/types" {
  export interface BuidlerRuntimeEnvironment {
    artifacts: TruffleEnvironmentArtifacts;
  }
}
