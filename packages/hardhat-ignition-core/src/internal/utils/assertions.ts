import { IgnitionError } from "../../errors";
import { ERRORS } from "../errors-list";

export function assertIgnitionInvariant(
  invariant: boolean,
  description: string
): asserts invariant {
  if (!invariant) {
    throw new IgnitionError(ERRORS.GENERAL.ASSERTION_ERROR, { description });
  }
}
