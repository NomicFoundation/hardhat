import "@nomiclabs/buidler/types";

declare module "@nomiclabs/buidler/types" {
  interface HardhatRuntimeEnvironment {
    Web3: any;
    web3: any;
  }
}
