export type Signature = {
  v: number;
  s: string;
  r: string;
};

export interface LedgerOptions {
  path: string;
  openTimeout?: number;
  connectionTimeout?: number;
}
