import { assertHardhatInvariant } from "../core/errors";

export enum HardforkName {
  FRONTIER = "chainstart",
  HOMESTEAD = "homestead",
  DAO = "dao",
  TANGERINE_WHISTLE = "tangerineWhistle",
  SPURIOUS_DRAGON = "spuriousDragon",
  BYZANTIUM = "byzantium",
  CONSTANTINOPLE = "constantinople",
  PETERSBURG = "petersburg",
  ISTANBUL = "istanbul",
  MUIR_GLACIER = "muirGlacier",
  BERLIN = "berlin",
  LONDON = "london",
}

const HARDFORKS_ORDER: HardforkName[] = [
  HardforkName.FRONTIER,
  HardforkName.HOMESTEAD,
  HardforkName.DAO,
  HardforkName.TANGERINE_WHISTLE,
  HardforkName.SPURIOUS_DRAGON,
  HardforkName.BYZANTIUM,
  HardforkName.CONSTANTINOPLE,
  HardforkName.PETERSBURG,
  HardforkName.ISTANBUL,
  HardforkName.MUIR_GLACIER,
  HardforkName.BERLIN,
  HardforkName.LONDON,
];

export function getHardforkName(name: string): HardforkName {
  const hardforkName =
    Object.values(HardforkName)[
      Object.values<string>(HardforkName).indexOf(name)
    ];

  assertHardhatInvariant(
    hardforkName !== undefined,
    `Invalid harfork name ${name}`
  );

  return hardforkName;
}

/**
 * Check if `hardforkA` is greater than or equal to `hardforkB`,
 * that is, if it includes all its changes.
 */
export function hardforkGte(
  hardforkA: HardforkName,
  hardforkB: HardforkName
): boolean {
  // This function should not load any ethereumjs library, as it's used during
  // the Hardhat initialization, and that would make it too slow.
  const indexA = HARDFORKS_ORDER.lastIndexOf(hardforkA);
  const indexB = HARDFORKS_ORDER.lastIndexOf(hardforkB);

  return indexA >= indexB;
}
