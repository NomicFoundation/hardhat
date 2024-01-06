import { Typed } from "ethers";

export function tryDereference(value: any, type: string) {
  try {
    return Typed.dereference(value, type);
  } catch {
    return undefined;
  }
}
