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
}

const HARDFORK_ORDER = Object.values(HardforkName);

export const LATEST_HARDFORK: HardforkName =
  HARDFORK_ORDER[HARDFORK_ORDER.length - 1];

/**
 * Check if `hardforkA` is greater than or equal to `hardforkB`,
 * that is, if it includes all its changes.
 */
export function hardforkGte(
  hardforkA: HardforkName,
  hardforkB: HardforkName,
): boolean {
  const indexA = HARDFORK_ORDER.lastIndexOf(hardforkA);
  const indexB = HARDFORK_ORDER.lastIndexOf(hardforkB);

  return indexA >= indexB;
}
