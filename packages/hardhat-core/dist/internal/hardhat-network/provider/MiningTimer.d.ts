import { IntervalMiningConfig } from "./node-types";
/**
 * Timer used to periodically call the given mining function.
 *
 * `_blockTime` can be a number or a pair of numbers (of milliseconds).  If it
 * is a number, it will call the given function repeatedly every `_blockTime`
 * milliseconds. If it is a pair of numbers, then after each call it will
 * randomly choose how much to wait until the next call.
 *
 * `_mineFunction` is the function to call. It can be async, and it is assumed
 * that it will never throw.
 */
export declare class MiningTimer {
    private _blockTime;
    private readonly _mineFunction;
    private _state;
    private _timeout;
    constructor(_blockTime: IntervalMiningConfig, _mineFunction: () => Promise<any>);
    getBlockTime(): IntervalMiningConfig;
    enabled(): boolean;
    setBlockTime(blockTime: IntervalMiningConfig): void;
    start(): void;
    stop(): void;
    private _validateBlockTime;
    private _loop;
    private _getNextBlockTime;
}
//# sourceMappingURL=MiningTimer.d.ts.map