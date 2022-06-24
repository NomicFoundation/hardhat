import { BindingOutput } from "./types";

export abstract class Binding<I = unknown, O extends BindingOutput = any> {
  // dummy variables needed by the type-checker to work correctly when opaque
  // types are used in a module definition
  protected _dummyInput!: I;
  protected _dummyOutput!: O;
}
