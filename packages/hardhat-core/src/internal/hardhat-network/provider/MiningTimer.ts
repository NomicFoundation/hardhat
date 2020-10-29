import { IMiningTimer } from "./types/IMiningTimer";

enum MiningTimerState {
  RUNNING,
  STOP,
}

// tslint:disable only-hardhat-error

export class MiningTimer implements IMiningTimer {
  private _state = MiningTimerState.STOP;
  private _timeout: any = null;

  constructor(
    private _blockTime: number,
    private readonly _mineFunction: () => Promise<void>
  ) {}

  public getBlockTime(): number {
    return this._blockTime;
  }

  public setBlockTime(blockTime: number): void {
    if (blockTime <= 0) {
      throw new Error("New block time must be greater than 0 ms");
    }
    this._blockTime = blockTime;
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
