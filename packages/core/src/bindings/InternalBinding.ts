import { Binding } from "./Binding";
import { BindingOutput } from "./types";

export abstract class InternalBinding<
  I = unknown,
  O extends BindingOutput = any
> extends Binding<I, O> {
  constructor(
    public readonly moduleId: string,
    public readonly id: string,
    public readonly input: I
  ) {
    super();
  }

  abstract getDependencies(): InternalBinding[];

  public static isBinding(x: unknown): x is InternalBinding {
    return x instanceof InternalBinding;
  }
}
