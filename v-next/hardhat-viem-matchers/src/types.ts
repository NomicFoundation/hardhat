import type { ChainType, DefaultChainType } from "hardhat/types/network";

export interface HardhatViemMatchers<
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- TODO
  ChainTypeT extends ChainType | string = DefaultChainType,
> {
  expect: (fn: any) => Prefix;
}

export interface Prefix {
  to: Matchers;
}

export interface Matchers {
  changeEtherBalance: (address: string, amount: bigint) => Promise<void>;
}

export type GenericFunction = (...args: any[]) => any;
