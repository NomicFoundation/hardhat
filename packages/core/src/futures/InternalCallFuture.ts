import { Tx } from "../types";

import { InternalFuture } from "./InternalFuture";
import { CallOptions, Unflattened } from "./types";
import { deepFlatten } from "./utils";

export class InternalCallFuture extends InternalFuture<CallOptions, Tx> {
  public getDependencies(): InternalFuture[] {
    const mapToFutures = (x: unknown): Unflattened<InternalFuture> => {
      if (Array.isArray(x)) {
        return x.map(mapToFutures);
      }

      if (InternalFuture.isFuture(x)) {
        return [x];
      }

      if (typeof x === "object" && x !== null) {
        return Object.values(x).map(mapToFutures);
      }

      return [];
    };

    const dependencies = deepFlatten(
      mapToFutures([this.input.contract, ...this.input.args])
    );

    return dependencies;
  }
}
