import { TASK_FLATTEN_GET_FLATTENED_SOURCE } from "@nomiclabs/buidler/builtin-tasks/task-names";
import { task } from "@nomiclabs/buidler/config";
import { BuidlerPluginError, lazyObject } from "@nomiclabs/buidler/plugins";

import AbiEncoder from "./AbiEncoder";
import ContractCompiler from "./ContractCompiler";
import EtherscanService from "./etherscan/EtherscanService";
import EtherscanVerifyContractRequest from "./etherscan/EtherscanVerifyContractRequest";
import { getLongVersion } from "./solc/SolcVersions";
import { EtherscanConfig } from "./types";
import { ResolvedBuidlerConfig } from "@nomiclabs/buidler/types";

export function getDefaultEtherscanConfig(
  config: ResolvedBuidlerConfig
): EtherscanConfig {
  const url = "https://api.etherscan.io/api";
  const apiKey = "";

  return { url, apiKey, ...config.etherscan };
}
// function getDefaultEtherscanConfig(
//   url = "https://api.etherscan.io/api",
//   apiKey = ""
// ): EtherscanConfig {
//   return { url, apiKey };
// }

task("verify-contract", "Verifies contract on etherscan")
  .addParam("contractName", "Name of the deployed contract")
  .addParam("address", "Deployed address of smart contract")
  .addOptionalParam(
    "libraries",
    'Stringified JSON object in format of {library1: "0x2956356cd2a2bf3202f771f50d3d14a367b48071"}'
  )
  .addOptionalParam("source", "Contract source")
  .addOptionalVariadicPositionalParam(
    "constructorArguments",
    "arguments for contract constructor"
  )
  .setAction(
    async (
      taskArgs: {
        contractName: string;
        address: string;
        libraries: string;
        source: string;
        constructorArguments: string[];
      },
      { config, run }
    ) => {
      const etherscan: EtherscanConfig = getDefaultEtherscanConfig(config);

      if (etherscan.apiKey.trim() === "") {
        throw new BuidlerPluginError(
          "Please provide etherscan api token via buidler.config.js (etherscan.apiKey)"
        );
      }

      const source =
        taskArgs.source !== ""
          ? taskArgs.source
          : await run(TASK_FLATTEN_GET_FLATTENED_SOURCE);

      const abi = await new ContractCompiler(run).getAbi(
        source,
        taskArgs.contractName
      );

      config.solc.fullVersion = await getLongVersion(config.solc.version);

      const request = new EtherscanVerifyContractRequest(
        etherscan,
        config.solc,
        taskArgs.contractName,
        taskArgs.address,
        taskArgs.libraries,
        source,
        AbiEncoder.encodeConstructor(abi, taskArgs.constructorArguments)
      );
      const etherscanService = new EtherscanService(etherscan.url);
      const response = await etherscanService.verifyContract(request);
      console.log(
        "Successfully submitted contract for verification on etherscan. Waiting for verification result..."
      );
      await etherscanService.getVerificationStatus(response.message);
      console.log("Successfully verified contract on etherscan");
    }
  );
