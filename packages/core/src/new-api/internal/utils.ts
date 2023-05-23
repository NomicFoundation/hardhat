import { Future, FutureType } from "../types/module";

export function isFuture(potential: unknown): potential is Future {
  return (
    typeof potential === "object" &&
    potential !== null &&
    "type" in potential &&
    typeof potential.type === "number" &&
    FutureType[potential.type] !== undefined
  );
}
