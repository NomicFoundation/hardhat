import "@nomiclabs/buidler/types";

declare module "@nomiclabs/buidler/types" {
  interface BuidlerRuntimeEnvironment {
    Web3: any;
    web3: any;
  }
}
