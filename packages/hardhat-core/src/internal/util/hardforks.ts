import picocolors from "picocolors";

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
  ARROW_GLACIER = "arrowGlacier",
  GRAY_GLACIER = "grayGlacier",
  MERGE = "merge",
  SHANGHAI = "shanghai",
  CANCUN = "cancun",
  PRAGUE = "prague",
  OSAKA = "osaka",
  AMSTERDAM = "amsterdam",
}

/** All hardforks, from oldest to newest. */
export const HARDFORKS_ORDER: HardforkName[] = [
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
  HardforkName.GRAY_GLACIER,
  HardforkName.MERGE,
  HardforkName.SHANGHAI,
  HardforkName.CANCUN,
  HardforkName.PRAGUE,
  HardforkName.OSAKA,
  HardforkName.AMSTERDAM,
];

/**
 * The latest stable hardfork, which is also the default.
 */
export const LATEST_STABLE_HARDFORK: HardforkName = HardforkName.OSAKA;

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

const warnedHardforks = new Set<HardforkName>();

/**
 * Warns, once per process, that `hardfork` is experimental if it comes after
 * `LATEST_STABLE_HARDFORK`.
 */
export function warnIfExperimentalHardfork(
  hardfork: HardforkName,
  warn: (message: string) => void = (message) => console.warn(message)
): void {
  if (
    hardfork === LATEST_STABLE_HARDFORK ||
    !hardforkGte(hardfork, LATEST_STABLE_HARDFORK) ||
    warnedHardforks.has(hardfork)
  ) {
    return;
  }

  warnedHardforks.add(hardfork);

  const label = picocolors.bold(picocolors.yellow("Warning:"));
  warn(
    `${label} you have configured the "${hardfork}" hardfork, which is ` +
      `experimental and not yet finalized, so its behavior may change or be ` +
      `incomplete. The latest stable hardfork is "${LATEST_STABLE_HARDFORK}". ` +
      `Keep Hardhat up to date to track changes to "${hardfork}" and to pick ` +
      `up its stable version once it activates on mainnet.\n`
  );
}
