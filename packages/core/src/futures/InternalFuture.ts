import { Future } from "./Future";
import { FutureOutput } from "./types";

export abstract class InternalFuture<
  I = unknown,
  O extends FutureOutput = any
> extends Future<I, O> {
  constructor(
    public readonly recipeId: string,
    public readonly id: string,
    public readonly input: I
  ) {
    super();
  }

  abstract getDependencies(): InternalFuture[];

  public static isFuture(x: unknown): x is InternalFuture {
    return x instanceof InternalFuture;
  }
}
