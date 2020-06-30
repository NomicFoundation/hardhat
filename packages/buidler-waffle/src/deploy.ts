import type { BuidlerRuntimeEnvironment } from "@nomiclabs/buidler/types";
import type { Contract, providers, Signer } from "ethers";
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

export async function buidlerDeployContract(
  bre: BuidlerRuntimeEnvironment,
  signer: Signer,
  contractJSON: any,
  args: any[] = [],
  overrideOptions: providers.TransactionRequest = {}
): Promise<Contract> {
  const { deployContract } = require("ethereum-waffle/dist/cjs/deployContract");

  if (
    overrideOptions.gasLimit === undefined &&
    typeof bre.network.config.gas === "number"
  ) {
    overrideOptions.gasLimit = bre.network.config.gas;
  }

  return deployContract(signer, contractJSON, args, overrideOptions);
}
