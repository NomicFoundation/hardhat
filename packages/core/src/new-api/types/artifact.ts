/**
 * An compilation artifact representing a smart contract.
 *
 * @beta
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
