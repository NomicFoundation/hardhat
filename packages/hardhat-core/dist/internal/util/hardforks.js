"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hardforkGte = exports.getHardforkName = exports.HardforkName = void 0;
const errors_1 = require("../core/errors");
var HardforkName;
(function (HardforkName) {
    HardforkName["FRONTIER"] = "chainstart";
    HardforkName["HOMESTEAD"] = "homestead";
    HardforkName["DAO"] = "dao";
    HardforkName["TANGERINE_WHISTLE"] = "tangerineWhistle";
    HardforkName["SPURIOUS_DRAGON"] = "spuriousDragon";
    HardforkName["BYZANTIUM"] = "byzantium";
    HardforkName["CONSTANTINOPLE"] = "constantinople";
    HardforkName["PETERSBURG"] = "petersburg";
    HardforkName["ISTANBUL"] = "istanbul";
    HardforkName["MUIR_GLACIER"] = "muirGlacier";
    HardforkName["BERLIN"] = "berlin";
    HardforkName["LONDON"] = "london";
    HardforkName["ARROW_GLACIER"] = "arrowGlacier";
})(HardforkName = exports.HardforkName || (exports.HardforkName = {}));
const HARDFORKS_ORDER = [
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
function getHardforkName(name) {
    const hardforkName = Object.values(HardforkName)[Object.values(HardforkName).indexOf(name)];
    (0, errors_1.assertHardhatInvariant)(hardforkName !== undefined, `Invalid harfork name ${name}`);
    return hardforkName;
}
exports.getHardforkName = getHardforkName;
/**
 * Check if `hardforkA` is greater than or equal to `hardforkB`,
 * that is, if it includes all its changes.
 */
function hardforkGte(hardforkA, hardforkB) {
    // This function should not load any ethereumjs library, as it's used during
    // the Hardhat initialization, and that would make it too slow.
    const indexA = HARDFORKS_ORDER.lastIndexOf(hardforkA);
    const indexB = HARDFORKS_ORDER.lastIndexOf(hardforkB);
    return indexA >= indexB;
}
exports.hardforkGte = hardforkGte;
//# sourceMappingURL=hardforks.js.map