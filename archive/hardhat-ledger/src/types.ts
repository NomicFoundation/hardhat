import Eth from "@ledgerhq/hw-app-eth";

export interface EthWrapper {
  getAddress: Eth["getAddress"];
  signPersonalMessage: Eth["signPersonalMessage"];
  signEIP712Message: Eth["signEIP712Message"];
  signEIP712HashedMessage: Eth["signEIP712HashedMessage"];
  signTransaction: Eth["signTransaction"];
}

export interface Signature {
  v: number;
  s: string;
  r: string;
}

export interface LedgerOptions {
  openTimeout?: number;
  connectionTimeout?: number;
  accounts: string[];
  derivationFunction?: (index: number) => string;
}

export type Paths = Record<string, string>; // { address: path }
