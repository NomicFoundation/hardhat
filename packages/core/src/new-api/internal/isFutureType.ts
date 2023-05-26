import { FutureType } from "../types/module";

export function isFutureType(potential: unknown): potential is FutureType {
  return (
    typeof potential === "string" &&
    (FutureType as any)[potential] !== undefined
  );
}
