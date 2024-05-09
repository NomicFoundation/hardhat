import { concat } from "./utils/string.js";

export function foo() {
  return "foo";
}

export function bar() {
  return "bar";
}

export function foobar() {
  return concat(foo(), bar());
}
