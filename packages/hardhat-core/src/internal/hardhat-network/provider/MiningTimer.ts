import { IntervalMiningConfig } from "./node-types";

enum MiningTimerState {
  STOP,
  RUNNING,
}

// tslint:disable only-hardhat-error

export class MiningTimer {
  private _state = MiningTimerState.STOP;
  private _timeout: any = null;

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

    if (blockTime === this._blockTime) {
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
    this._timeout = setTimeout(
      () => this._loop().catch(console.error),
      blockTime
    );
  }

  public stop(): void {
    if (this._state === MiningTimerState.STOP) {
      return;
    }

    this._state = MiningTimerState.STOP;
    clearTimeout(this._timeout);
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
      this._loop().catch(console.error);
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
