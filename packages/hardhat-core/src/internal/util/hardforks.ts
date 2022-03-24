import { assertHardhatInvariant } from "../core/errors";

export const BERLIN_EIPS = new Set([
  // Homestead
  2, 7, 8,
  // Tangerine Whistle
  150, 158,
  // Spurious Dragon
  155, 160, 161, 170,
  // Byzantium
  100, 140, 196, 197, 198, 211, 214, 649, 658,
  // Constantinople
  1014, 1052, 1234, 145,
  // Istanbul
  1108, 1344, 152, 1884, 2028, 2200,
  // Muir Glacier
  2384,
  // Berlin
  2565, 2718, 2929, 2930,
]);

export const LONDON_EIPS = new Set([
  ...BERLIN_EIPS,
  // London
  1559,
  3198,
  3529,
  3541,
  3554,
]);

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
  ARROW_GLACIER = "arrowGlacier",
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
  HardforkName.ARROW_GLACIER,
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
