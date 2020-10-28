export interface IMiningTimer {
  start(): void;
  getBlockTime(): number;
  setBlockTime(blockTime: number): void;
  stop(): void;
}
