import { IMiningTimer } from "./types/IMiningTimer";

export class MiningTimer implements IMiningTimer {
  constructor(
    private _blockTime: number,
    private readonly _mineFunction: () => void
  ) {}
  public getBlockTime(): number {
    return this._blockTime;
  }

  public setBlockTime(blockTime: number): void {
    if (blockTime <= 0) {
      throw Error("New block time must be greater than 0 ms");
    }
    this._blockTime = blockTime;
  }

  public start(): void {}

  public stop(): void {}
}
