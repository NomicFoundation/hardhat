import { IMiningTimer } from "./types/IMiningTimer";

enum MiningTimerState {
  STOP,
  RUNNING,
}

// tslint:disable only-hardhat-error

export class MiningTimer implements IMiningTimer {
  private _state = MiningTimerState.STOP;
  private _timeout: any = null;

  constructor(
    private _blockTime: number,
    private readonly _mineFunction: () => Promise<void>
  ) {
    if (_blockTime <= 0) {
      throw new Error(
        "Block time passed to the constructor must be greater than 0 ms"
      );
    }
  }

  public getBlockTime(): number {
    return this._blockTime;
  }

  public setBlockTime(blockTime: number): void {
    if (blockTime <= 0) {
      throw new Error("New block time must be greater than 0 ms");
    }

    if (blockTime === this._blockTime) {
      return;
    }

    this._blockTime = blockTime;

    if (this._state === MiningTimerState.RUNNING) {
      this.stop();
      this.start();
    }
  }

  public start(): void {
    if (this._state === MiningTimerState.RUNNING) {
      return;
    }

    this._state = MiningTimerState.RUNNING;
    this._timeout = setTimeout(
      () => this._loop().catch(console.error),
      this._blockTime
    );
  }

  public stop(): void {
    if (this._state === MiningTimerState.STOP) {
      return;
    }

    this._state = MiningTimerState.STOP;
    clearTimeout(this._timeout);
  }

  private async _loop() {
    if (this._state === MiningTimerState.STOP) {
      return;
    }

    await this._mineFunction();

    this._timeout = setTimeout(() => {
      this._loop().catch(console.error);
    }, this._blockTime);
  }
}
