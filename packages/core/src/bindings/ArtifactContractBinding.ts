import { Contract } from "../types";

import { InternalBinding } from "./InternalBinding";
import { ArtifactContractOptions } from "./types";
import { combineArgsAndLibrariesAsDeps } from "./utils";

export class ArtifactContractBinding extends InternalBinding<
  ArtifactContractOptions,
  Contract
> {
  public getDependencies(): InternalBinding[] {
    return combineArgsAndLibrariesAsDeps(
      this.input.args,
      this.input.libraries ?? {}
    );
  }
}
