export interface HardhatViemMatchers {
  balancesHaveChanged: (
    fn: GenericFunction,
    changes: Array<{
      address: `0x${string}`; // TODO: create a type?
      amount: bigint;
    }>,
  ) => Promise<void>;
}

export type GenericFunction = () => Promise<void>;
