export type TruffleContract = any;
export type TruffleContractInstance = any;
export interface Linker {
  link: (Contract: TruffleContract, library: TruffleContractInstance) => void;
}
