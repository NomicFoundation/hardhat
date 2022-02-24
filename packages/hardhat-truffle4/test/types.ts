import { Artifacts } from "hardhat/types/artifacts";

type Dummy = unknown;

type IERC20Contract = Dummy;

type Equals<X, Y> = (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y
  ? 1
  : 2
  ? true
  : false;

declare function assert<A>(a: A): void;
declare const dummyArtifacts: Artifacts;

// end of test helpers

declare module "hardhat/types/artifacts" {
  export interface Artifacts {
    require(name: "IERC20"): IERC20Contract;
  }
}

// doesn't get called, only typechecks
export function test() {
  const ierc20Artifact = dummyArtifacts.require("IERC20");
  const unknownArtifact = dummyArtifacts.require("UnknownArtifact");

  assert<Equals<IERC20Contract, typeof ierc20Artifact>>(true);
  assert<Equals<any, typeof unknownArtifact>>(true);
}
