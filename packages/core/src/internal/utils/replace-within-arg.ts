import { isFuture, isRuntimeValue } from "../../type-guards";
import {
  AccountRuntimeValue,
  ArgumentType,
  Future,
  ModuleParameterRuntimeValue,
  ModuleParameterType,
  RuntimeValueType,
} from "../../types/module";

type Composable<T> =
  | T
  | Array<Composable<T>>
  | { [field: string]: Composable<T> };

interface Replacers<T> {
  accountRuntimeValue: (arg: AccountRuntimeValue) => Composable<T>;
  moduleParameterRuntimeValue: (
    arg: ModuleParameterRuntimeValue<ModuleParameterType>
  ) => Composable<T>;
  bigint: (arg: bigint) => Composable<T>;
  future: (arg: Future) => Composable<T>;
}

/**
 * Recursively replace values with an argument based on given replacer
 * functions. This is useful for substituting for futures and runtime
 * arguments within the constructor or call args of a future.
 *
 * @example
 * const args = [1, { nested: { insideArray: [1, new Future(1), 3] }}, "abc"]
 *
 * const updated = replaceWithinArg(args, {
 *   ...,
 *   future: (f) => ({_kind: "Future", id: f.id })
 * })
 *
 * assert.equal(updated, [
 *   1,
 *   { nested: { insideArray: [1, {_kind: "Future", id: 1 }, 3] }},
 *   "abc"]
 * )
 *
 * @param arg - the argument to be replaced
 * @param replacers - substituters for each special value found in the args
 * @returns the args with any special subvalue replaced
 */
export function replaceWithinArg<T>(
  arg: ArgumentType,
  replacers: Replacers<T>
): Composable<T | string | number | boolean> {
  if (typeof arg === "bigint") {
    return replacers.bigint(arg);
  }

  if (isFuture(arg)) {
    return replacers.future(arg);
  }

  if (isRuntimeValue(arg)) {
    if (arg.type === RuntimeValueType.ACCOUNT) {
      return replacers.accountRuntimeValue(arg);
    }

    return replacers.moduleParameterRuntimeValue(arg);
  }

  if (Array.isArray(arg)) {
    return arg.map((a) => replaceWithinArg(a, replacers));
  }

  if (typeof arg === "object" && arg !== null) {
    return Object.fromEntries(
      Object.entries(arg).map(([k, v]) => [k, replaceWithinArg(v, replacers)])
    );
  }

  return arg;
}
