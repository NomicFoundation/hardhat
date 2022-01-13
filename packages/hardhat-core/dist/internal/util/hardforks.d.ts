export declare enum HardforkName {
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
    ARROW_GLACIER = "arrowGlacier"
}
export declare function getHardforkName(name: string): HardforkName;
/**
 * Check if `hardforkA` is greater than or equal to `hardforkB`,
 * that is, if it includes all its changes.
 */
export declare function hardforkGte(hardforkA: HardforkName, hardforkB: HardforkName): boolean;
//# sourceMappingURL=hardforks.d.ts.map