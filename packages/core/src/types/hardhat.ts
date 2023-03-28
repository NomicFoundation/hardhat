/**
 * The key data for interacting with an Ethereum smart contract on-chain.
 *
 * @alpha
 */
export interface Artifact {
  contractName: string;
  bytecode: string;
  abi: any[];
  linkReferences: Record<
    string,
    Record<string, Array<{ length: number; start: number }>>
  >;
}
