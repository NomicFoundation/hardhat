import { HardhatError } from "@nomicfoundation/hardhat-errors";

export function assertIgnitionInvariant(
  invariant: boolean,
  description: string,
): asserts invariant {
  if (!invariant) {
    throw new HardhatError(
      HardhatError.ERRORS.IGNITION.GENERAL.ASSERTION_ERROR,
      { description },
    );
  }
}
