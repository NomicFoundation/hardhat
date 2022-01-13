/// <reference types="node" />
import { BN } from "ethereumjs-util";
/**
 * Represents the returnData of a transaction, whose contents are unknown.
 */
export declare class ReturnData {
    value: Buffer;
    private _selector;
    constructor(value: Buffer);
    isEmpty(): boolean;
    matchesSelector(selector: Buffer): boolean;
    isErrorReturnData(): boolean;
    isPanicReturnData(): boolean;
    decodeError(): string;
    decodePanic(): BN;
}
//# sourceMappingURL=return-data.d.ts.map