import { Contract } from "../types";

import { InternalFuture } from "./InternalFuture";
import { ArtifactContractOptions } from "./types";
import { combineArgsAndLibrariesAsDeps } from "./utils";

export class ArtifactContractFuture extends InternalFuture<
  ArtifactContractOptions,
  Contract
> {
  public getDependencies(): InternalFuture[] {
    return combineArgsAndLibrariesAsDeps(
      this.input.args,
      this.input.libraries ?? {}
    );
  }
}
