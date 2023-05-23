import { Future } from "../types/module";

import { BaseFutureImplementation } from "./module";

export function isFuture(potential: unknown): potential is Future {
  return potential instanceof BaseFutureImplementation;
}
