import "hardhat/types/runtime";

import type {
  HardhatViemPublicClient,
  HardhatViemTestClient,
  HardhatViemWalletClients,
} from "./types";

declare module "hardhat/types/runtime" {
  interface HardhatRuntimeEnvironment {
    viem: {
      getPublicClient(): Promise<HardhatViemPublicClient>;
      getWalletClients(): Promise<HardhatViemWalletClients>;
      getTestClient(): Promise<HardhatViemTestClient>;
    };
  }
}
