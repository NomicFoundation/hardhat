import { assert } from "chai";

export function assertInstanceOf<ObjectT>(
  obj: unknown,
  klass: new (...args: any[]) => ObjectT
): asserts obj is ObjectT {
  assert.instanceOf(obj, klass, `Not a valid instace of ${klass.name}`);
}
