import { IgnitionError } from "../../errors";

export function assertIgnitionInvariant(
  invariant: boolean,
  description: string
): asserts invariant {
  if (!invariant) {
    throw new IgnitionError(
      `Internal Ignition invariant was violated: ${description}`
    );
  }
}
