export type DerivationFunction = (index: number) => string;

export interface LedgerOptions {
  accounts: string[];
  derivationFunction: DerivationFunction | undefined;
}

export interface Signature {
  v: number;
  s: string;
  r: string;
}

export type Paths = Record<string, string>; // { address: 0x-string }
