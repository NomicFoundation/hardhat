import { assertHardhatInvariant } from "@nomicfoundation/hardhat-errors";

import { L1HardforkName, OpHardforkName } from "../types/hardfork.js";

export function getL1HardforkName(name: string): L1HardforkName {
  const hardforkName =
    Object.values(L1HardforkName)[
      Object.values<string>(L1HardforkName).indexOf(name)
    ];

  assertHardhatInvariant(
    hardforkName !== undefined,
    `Invalid hardfork name ${name}`,
  );

  return hardforkName;
}

export function getOpHardforkName(name: string): OpHardforkName {
  const hardforkName =
    Object.values(OpHardforkName)[
      Object.values<string>(OpHardforkName).indexOf(name)
    ];

  assertHardhatInvariant(
    hardforkName !== undefined,
    `Invalid hardfork name ${name}`,
  );

  return hardforkName;
}
