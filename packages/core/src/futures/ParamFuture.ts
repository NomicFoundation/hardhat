import { InternalFuture } from "./InternalFuture";
import { ParamOptions } from "./types";

export class ParamFuture extends InternalFuture<ParamOptions, any> {
  public getDependencies(): Array<InternalFuture<unknown, any>> {
    return [];
  }
}
