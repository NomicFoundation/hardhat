export interface Artifact {
  contractName: string;
  bytecode: string;
  abi: any[];
  linkReferences: Record<
    string,
    Record<string, Array<{ length: number; start: number }>>
  >;
}

export interface Contract {
  name: string;
  address: string;
  abi: any[];
}

export interface DeployedContract extends Contract {
  bytecode: string;
}

export interface Tx {
  hash: string;
}
