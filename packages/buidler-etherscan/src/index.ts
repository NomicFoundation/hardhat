import { TASK_FLATTEN_GET_FLATTENED_SOURCE } from "@nomiclabs/buidler/builtin-tasks/task-names";
import { extendEnvironment, task } from "@nomiclabs/buidler/config";
import { BuidlerPluginError, lazyObject } from "@nomiclabs/buidler/plugins";

import AbiEncoder from "./AbiEncoder";
import ContractCompiler from "./ContractCompiler";
import EtherscanService from "./etherscan/EtherscanService";
import EtherscanVerifyContractRequest from "./etherscan/EtherscanVerifyContractRequest";
import SolcVersions from "./solc/SolcVersions";

export class EtherscanBuidlerEnvironment {
  constructor(
    public readonly url: string = "https://api.etherscan.io/api",
    public readonly token: string = ""
  ) {}
}

declare module "@nomiclabs/buidler/types" {
  export interface BuidlerRuntimeEnvironment {
    etherscan: EtherscanBuidlerEnvironment;
  }

  export interface ResolvedBuidlerConfig {
    etherscan: {
      url?: string;
      token?: string;
    };
  }

  export interface SolcConfig {
    fullVersion: string;
  }
}

extendEnvironment(env => {
  env.etherscan = lazyObject(
    () =>
      new EtherscanBuidlerEnvironment(
        env.config.etherscan.url,
        env.config.etherscan.token
      )
  );
});

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
      { etherscan, config, run }
    ) => {
      if (!etherscan.token || !etherscan.token.trim()) {
        throw new BuidlerPluginError(
          "Please provide etherscan api token via buidler.config.js (etherscan.token)"
        );
      }
      let source = "";
      if (taskArgs.source) {
        source = taskArgs.source;
      } else {
        source = await run(TASK_FLATTEN_GET_FLATTENED_SOURCE);
      }
      const abi = await new ContractCompiler(run).getAbi(
        source,
        taskArgs.contractName
      );
      config.solc.fullVersion = await SolcVersions.toLong(config.solc.version);
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
