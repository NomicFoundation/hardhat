/**
 * An compilation artifact representing a smart contract.
 *
 * @alpha
 */
export interface ArtifactOld {
  contractName: string;
  bytecode: string;
  abi: any[];
  linkReferences: Record<
    string,
    Record<string, Array<{ length: number; start: number }>>
  >;
}
