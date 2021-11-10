export interface Artifact {
  bytecode: string;
  abi: any[];
}

export interface Contract {
  name: string;
  address: string;
  abi: any[];
  bytecode: string;
}

export interface Tx {
  hash: string;
}
