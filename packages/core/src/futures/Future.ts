import { FutureOutput } from "./types";

export abstract class Future<I = unknown, O extends FutureOutput = any> {
  // dummy variables needed by the type-checker to work correctly when opaque
  // types are used in a module definition
  protected _dummyInput!: I;
  protected _dummyOutput!: O;
}
