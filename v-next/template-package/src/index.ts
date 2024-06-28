import { concat } from "./utils/string.js";

export function foo(): string {
  return "foo";
}

export function bar(): string {
  return "bar";
}

export function foobar(): string {
  return concat(foo(), bar());
}
