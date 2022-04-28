import type { Contract, providers, Signer } from "ethers";
import type { HardhatRuntimeEnvironment } from "hardhat/types";

import path from "path";

export function getDeployMockContract() {
  const wafflePath = require.resolve("ethereum-waffle");
  const waffleMockContractPath = path.dirname(
    require.resolve("@ethereum-waffle/mock-contract", {
      paths: [wafflePath],
    })
  );
  const waffleMockContract = require(waffleMockContractPath);
  return waffleMockContract.deployMockContract;
}

export async function hardhatDeployContract(
  hre: HardhatRuntimeEnvironment,
  signer: Signer,
  contractJSON: any,
  args: any[] = [],
  overrideOptions: providers.TransactionRequest = {}
): Promise<Contract> {
  const { deployContract } = require("ethereum-waffle/dist/cjs/deployContract");

  if (
    overrideOptions.gasLimit === undefined &&
    typeof hre.network.config.gas === "number"
  ) {
    overrideOptions.gasLimit = hre.network.config.gas;
  }

  return deployContract(signer, contractJSON, args, overrideOptions);
}
