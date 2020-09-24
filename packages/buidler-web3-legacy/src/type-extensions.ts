import "@nomiclabs/buidler/types";

declare module "@nomiclabs/buidler/types" {
  export interface HardhatRuntimeEnvironment {
    Web3: any;
    web3: any;
    pweb3: any;
  }
}
