import { IgnitionError } from "../../errors.js";
import { ERRORS } from "../errors-list.js";

export function assertIgnitionInvariant(
  invariant: boolean,
  description: string,
): asserts invariant {
  if (!invariant) {
    throw new IgnitionError(ERRORS.GENERAL.ASSERTION_ERROR, { description });
  }
}
