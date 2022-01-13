import { BN } from "ethereumjs-util";
/**
 * This function turns a wei value in a human readable string. It shows values
 * in ETH, gwei or wei, depending on how large it is.
 *
 * It never show more than 99999 wei or gwei, moving to the larger denominator
 * when necessary.
 *
 * It never shows more than 4 decimal digits. Adapting denominator and
 * truncating as necessary.
 */
export declare function weiToHumanReadableString(wei: BN | number): string;
//# sourceMappingURL=wei-values.d.ts.map