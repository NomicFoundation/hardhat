export interface Artifact {
  bytecode: string;
  abi: any[];
}

export interface Contract {
  name: string;
  address: string;
  abi: any[];
}
