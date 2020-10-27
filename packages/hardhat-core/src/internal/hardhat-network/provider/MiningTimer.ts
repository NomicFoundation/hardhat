import { IMiningTimer } from "./types/IMiningTimer";

export class MiningTimer implements IMiningTimer {
  constructor(
    private _blockTime: number,
    private readonly _mineFunction: () => void
  ) {}

  public setBlockTime(blockTime: number): void {}

  public start(): void {}

  public stop(): void {}
}
