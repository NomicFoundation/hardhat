import { assertHardhatInvariant } from "@nomicfoundation/hardhat-errors";

import { HardforkName } from "../types/hardfork.js";

export function getHardforkName(name: string): HardforkName {
  const hardforkName =
    Object.values(HardforkName)[
      Object.values<string>(HardforkName).indexOf(name)
    ];

  assertHardhatInvariant(
    hardforkName !== undefined,
    `Invalid harfork name ${name}`,
  );

  return hardforkName;
}
