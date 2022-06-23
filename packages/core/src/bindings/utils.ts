import { Unflattened } from "./types";

export function deepFlatten<T>(array: Unflattened<T>): T[] {
  let result: T[] = [];

  array.forEach((elem) => {
    if (Array.isArray(elem)) {
      result = result.concat(deepFlatten(elem));
    } else {
      result.push(elem);
    }
  });

  return result;
}
