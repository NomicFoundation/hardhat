import { BaseFuture } from "./module";

// TODO: convert this to type guard, but how do we type that?
export function isFuture(potential: unknown): boolean {
  return potential instanceof BaseFuture;
}
