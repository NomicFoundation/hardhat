/// <reference types="node" />
import { BN } from "ethereumjs-util";
import * as t from "io-ts";
export declare const rpcQuantity: t.Type<BN, BN, unknown>;
export declare const rpcData: t.Type<Buffer, Buffer, unknown>;
export declare const rpcHash: t.Type<Buffer, Buffer, unknown>;
export declare const rpcAddress: t.Type<Buffer, Buffer, unknown>;
export declare const rpcUnsignedInteger: t.Type<number, number, unknown>;
export declare const rpcQuantityAsNumber: t.Type<BN, BN, unknown>;
export declare const rpcFloat: t.Type<number, number, unknown>;
/**
 * Transforms a QUANTITY into a number. It should only be used if you are 100% sure that the value
 * fits in a number.
 */
export declare function rpcQuantityToNumber(quantity: string): number;
export declare function rpcQuantityToBN(quantity: string): BN;
export declare function numberToRpcQuantity(n: number | BN): string;
/**
 * Transforms a DATA into a number. It should only be used if you are 100% sure that the data
 * represents a value fits in a number.
 */
export declare function rpcDataToNumber(data: string): number;
export declare function rpcDataToBN(data: string): BN;
export declare function bufferToRpcData(buffer: Buffer, padToBytes?: number): string;
export declare function rpcDataToBuffer(data: string): Buffer;
//# sourceMappingURL=base-types.d.ts.map