import {
  TASK_COMPILE,
  TASK_COMPILE_GET_COMPILER_INPUT,
  TASK_FLATTEN_GET_FLATTENED_SOURCE,
} from "@nomiclabs/buidler/builtin-tasks/task-names";
import { task } from "@nomiclabs/buidler/config";
import { BuidlerPluginError, readArtifact } from "@nomiclabs/buidler/plugins";

import AbiEncoder from "./AbiEncoder";
import { getDefaultEtherscanConfig } from "./config";
import {
  getVerificationStatus,
  verifyContract,
} from "./etherscan/EtherscanService";
import { toRequest } from "./etherscan/EtherscanVerifyContractRequest";
import { getLongVersion } from "./solc/SolcVersions";
import { EtherscanConfig } from "./types";
import { Deployments } from "./types";


task("verify-contract", "Verifies contract on etherscan")
  .addParam("contractName", "Name of the deployed contract")
  .addOptionalParam("deployments", "File path for smart contracts deployments")
  .addOptionalParam(
    "libraries",
    'Stringified JSON object in format of {library1: "0x2956356cd2a2bf3202f771f50d3d14a367b48071"}'
  )
  .setAction(
    async (
      taskArgs: {
        contractName: string;
        deployments: string;
        libraries: string;
        source: string;
      },
      { config, run }
    ) => {
      const etherscan: EtherscanConfig = getDefaultEtherscanConfig(config);
      let deployments: Deployments = {
        address: "",
        args: []
      };
      if (etherscan.apiKey === undefined || etherscan.apiKey.trim() === "") {
        throw new BuidlerPluginError(
          "Please provide etherscan api token via buidler.config.js (etherscan.apiKey)"
        );
      }

      if (taskArgs.deployments) {
        deployments = JSON.parse(taskArgs.deployments);
      } else {
        throw new Error("Please provide deployments location")
      }

      const index: number = taskArgs.contractName.indexOf(":");
      let etherscanContractName: string;
      let contractName: string;
      if (index !== -1) {
        etherscanContractName = taskArgs.contractName;
        contractName = taskArgs.contractName.substring(index + 1);
      } else {
        etherscanContractName = `contracts/${taskArgs.contractName}.sol:${taskArgs.contractName}`;
        contractName = taskArgs.contractName;
      }

      await run(TASK_COMPILE);
      const abi = (await readArtifact(config.paths.artifacts, contractName))
        .abi;
      config.solc.fullVersion = await getLongVersion(config.solc.version);

      const source = JSON.stringify(await run(TASK_COMPILE_GET_COMPILER_INPUT));

      const request = toRequest({
        apiKey: etherscan.apiKey,
        contractAddress: deployments.address,
        sourceCode: source,
        contractName: `${etherscanContractName}`,
        compilerVersion: config.solc.fullVersion,
        // optimizationsUsed: config.solc.optimizer.enabled,
        // runs: config.solc.optimizer.runs,
        constructorArguments: AbiEncoder.encodeConstructor(
          abi,
          deployments.args
        ),
        libraries: taskArgs.libraries,
      });

      const response = await verifyContract(etherscan.url, request);

      console.log(
        `Successfully submitted contract at ${deployments.address} for verification on etherscan. Waiting for verification result...`
      );

      await getVerificationStatus(etherscan.url, response.message);

      console.log("Successfully verified contract on etherscan");
    }
  );
