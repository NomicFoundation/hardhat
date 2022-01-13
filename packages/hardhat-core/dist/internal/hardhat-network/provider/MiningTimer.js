"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MiningTimer = void 0;
var MiningTimerState;
(function (MiningTimerState) {
    MiningTimerState[MiningTimerState["STOP"] = 0] = "STOP";
    MiningTimerState[MiningTimerState["RUNNING"] = 1] = "RUNNING";
})(MiningTimerState || (MiningTimerState = {}));
/* eslint-disable @nomiclabs/hardhat-internal-rules/only-hardhat-error */
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
class MiningTimer {
    constructor(_blockTime, _mineFunction) {
        this._blockTime = _blockTime;
        this._mineFunction = _mineFunction;
        this._state = MiningTimerState.STOP;
        this._timeout = null;
        this._validateBlockTime(_blockTime);
    }
    getBlockTime() {
        return this._blockTime;
    }
    enabled() {
        return this._blockTime !== 0;
    }
    setBlockTime(blockTime) {
        this._validateBlockTime(blockTime);
        if (blockTime === 0) {
            this.stop();
            return;
        }
        this._blockTime = blockTime;
        if (this._state === MiningTimerState.RUNNING) {
            this.stop();
        }
        this.start();
    }
    start() {
        if (this._state === MiningTimerState.RUNNING || !this.enabled()) {
            return;
        }
        const blockTime = this._getNextBlockTime();
        this._state = MiningTimerState.RUNNING;
        this._timeout = setTimeout(() => this._loop(), blockTime);
    }
    stop() {
        if (this._state === MiningTimerState.STOP) {
            return;
        }
        this._state = MiningTimerState.STOP;
        if (this._timeout !== null) {
            clearTimeout(this._timeout);
        }
    }
    _validateBlockTime(blockTime) {
        if (Array.isArray(blockTime)) {
            const [rangeStart, rangeEnd] = blockTime;
            if (rangeEnd < rangeStart) {
                throw new Error("Invalid block time range");
            }
        }
        else {
            if (blockTime < 0) {
                throw new Error("Block time cannot be negative");
            }
        }
    }
    async _loop() {
        if (this._state === MiningTimerState.STOP) {
            return;
        }
        await this._mineFunction();
        const blockTime = this._getNextBlockTime();
        this._timeout = setTimeout(() => {
            this._loop(); // eslint-disable-line @typescript-eslint/no-floating-promises
        }, blockTime);
    }
    _getNextBlockTime() {
        if (Array.isArray(this._blockTime)) {
            const [minBlockTime, maxBlockTime] = this._blockTime;
            return (minBlockTime + Math.floor(Math.random() * (maxBlockTime - minBlockTime)));
        }
        return this._blockTime;
    }
}
exports.MiningTimer = MiningTimer;
//# sourceMappingURL=MiningTimer.js.map