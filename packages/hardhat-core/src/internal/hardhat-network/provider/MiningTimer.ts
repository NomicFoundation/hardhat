import { IntervalMiningConfig } from "./node-types";

enum MiningTimerState {
  STOP,
  RUNNING,
}

// tslint:disable only-hardhat-error

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
export class MiningTimer {
  private _state = MiningTimerState.STOP;
  private _timeout: NodeJS.Timeout | null = null;

  constructor(
    private _blockTime: IntervalMiningConfig,
    private readonly _mineFunction: () => Promise<any>
  ) {
    this._validateBlockTime(_blockTime);
  }

  public getBlockTime(): IntervalMiningConfig {
    return this._blockTime;
  }

  public enabled(): boolean {
    return this._blockTime !== 0;
  }

  public setBlockTime(blockTime: IntervalMiningConfig): void {
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

  public start(): void {
    if (this._state === MiningTimerState.RUNNING || !this.enabled()) {
      return;
    }

    const blockTime = this._getNextBlockTime();

    this._state = MiningTimerState.RUNNING;
    this._timeout = setTimeout(() => this._loop(), blockTime);
  }

  public stop(): void {
    if (this._state === MiningTimerState.STOP) {
      return;
    }

    this._state = MiningTimerState.STOP;

    if (this._timeout !== null) {
      clearTimeout(this._timeout);
    }
  }

  private _validateBlockTime(blockTime: IntervalMiningConfig) {
    if (Array.isArray(blockTime)) {
      const [rangeStart, rangeEnd] = blockTime;
      if (rangeEnd < rangeStart) {
        throw new Error("Invalid block time range");
      }
    } else {
      if (blockTime < 0) {
        throw new Error("Block time cannot be negative");
      }
    }
  }

  private async _loop() {
    if (this._state === MiningTimerState.STOP) {
      return;
    }

    await this._mineFunction();

    const blockTime = this._getNextBlockTime();

    this._timeout = setTimeout(() => {
      this._loop(); // tslint:disable-line no-floating-promises
    }, blockTime);
  }

  private _getNextBlockTime(): number {
    if (Array.isArray(this._blockTime)) {
      const [minBlockTime, maxBlockTime] = this._blockTime;

      return (
        minBlockTime + Math.floor(Math.random() * (maxBlockTime - minBlockTime))
      );
    }

    return this._blockTime;
  }
}
