export interface HardhatViemMatchers {
  expect: (fn: any) => Prefix;
}

// This is the alternative not using `expect`:
export interface HardhatViemMatchers2 {
  balanceShouldChange: (
    fn: GenericFunction,
    address: string,
    amount: bigint,
  ) => Promise<void>;
}
export interface Prefix {
  to: Matchers;
}

export interface Matchers {
  changeEtherBalance: (address: string, amount: bigint) => Promise<void>;
}

export type GenericFunction = (...args: any[]) => any;
