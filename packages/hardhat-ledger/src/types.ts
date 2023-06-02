export type Signature = {
  v: number;
  s: string;
  r: string;
};

export type LedgerOptions = {
  openTimeout?: number;
  connectionTimeout?: number;
  path: string;
};
