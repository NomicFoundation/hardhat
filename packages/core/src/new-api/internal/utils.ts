import { Future } from "../types/module";

import { BaseFuture } from "./module";

export function isFuture(potential: unknown): potential is Future {
  return potential instanceof BaseFuture;
}
