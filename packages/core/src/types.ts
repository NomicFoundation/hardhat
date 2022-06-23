export interface Artifact {
  bytecode: string;
  abi: any[];
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
