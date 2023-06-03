import Eth from "@ledgerhq/hw-app-eth";

export interface EthWrapper {
  getAddress: Eth["getAddress"];
  signPersonalMessage: Eth["signPersonalMessage"];
  signEIP712Message: Eth["signEIP712Message"];
  signEIP712HashedMessage: Eth["signEIP712HashedMessage"];
  signTransaction: Eth["signTransaction"];
}

export type Signature = {
  v: number;
  s: string;
  r: string;
};

export type LedgerOptions = {
  openTimeout?: number;
  connectionTimeout?: number;
  accounts: string[];
};
