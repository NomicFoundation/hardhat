export interface IMiningTimer {
  getBlockTime(): number;
  setBlockTime(blockTime: number): void;
  start(): void;
  stop(): void;
}
