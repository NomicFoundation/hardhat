import { weeks } from "./weeks";

/**
 * Converts years into seconds
 */
export function years(n: number): number {
  return weeks(n) * 52;
}
