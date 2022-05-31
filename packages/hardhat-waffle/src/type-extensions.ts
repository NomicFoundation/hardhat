import type {
  createFixtureLoader,
  link,
  loadFixture,
  MockContract,
  MockProvider,
  solidity,
} from "ethereum-waffle";
import type { ContractJSON } from "ethereum-waffle/dist/esm/ContractJSON";
import type { Contract, providers, Signer } from "ethers";

import "hardhat/types/runtime";

declare module "hardhat/types/runtime" {
  interface HardhatRuntimeEnvironment {
    waffle: {
      provider: MockProvider;
      deployContract: (
        signer: Signer,
        contractJSON: ContractJSON,
        args?: any[],
        overrideOptions?: providers.TransactionRequest
      ) => Promise<Contract>;
      solidity: typeof solidity;
      link: typeof link;
      deployMockContract: (signer: Signer, abi: any[]) => Promise<MockContract>;
      createFixtureLoader: typeof createFixtureLoader;
      loadFixture: typeof loadFixture;
    };
  }
}
