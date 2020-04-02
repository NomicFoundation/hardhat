import {
  TASK_COMPILE,
  TASK_COMPILE_GET_COMPILER_INPUT
} from "@nomiclabs/buidler/builtin-tasks/task-names";
import { task } from "@nomiclabs/buidler/config";
import { getArtifactFromContractOutput } from "@nomiclabs/buidler/internal/artifacts";
import { BuidlerPluginError } from "@nomiclabs/buidler/plugins";
import { Artifact } from "@nomiclabs/buidler/types";

import AbiEncoder from "./AbiEncoder";
import { getDefaultEtherscanConfig } from "./config";
import {
  EtherscanGetResponse,
  getCode,
  getVerificationStatus,
  verifyContract
} from "./etherscan/EtherscanService";
import { toRequest } from "./etherscan/EtherscanVerifyContractRequest";
import { getLongVersion } from "./solc/SolcVersions";
import { EtherscanConfig } from "./types";

task("verify-contract", "Verifies contract on etherscan")
  .addParam("address", "Deployed address of smart contract")
  .addOptionalParam(
    "libraries",
    'Stringified JSON object in format of {library1: "0x2956356cd2a2bf3202f771f50d3d14a367b48071"}'
  )
  .addOptionalVariadicPositionalParam(
    "constructorArguments",
    "arguments for contract constructor",
    []
  )
  .setAction(
    async (
      taskArgs: {
        address: string;
        libraries: string;
        source: string;
        constructorArguments: string[];
      },
      { config, run }
    ) => {
      const etherscan: EtherscanConfig = getDefaultEtherscanConfig(config);

      if (etherscan.apiKey === undefined || etherscan.apiKey.trim() === "") {
        throw new BuidlerPluginError(
          "Please provide etherscan api token via buidler.config.js (etherscan.apiKey)"
        );
      }

      if (etherscan.url === undefined || etherscan.url.trim() === "") {
        throw new BuidlerPluginError(
          "Please provide etherscan url token via buidler.config.js (etherscan.url)"
        );
      }

      // Get the contract bytecode deployed on chain
      console.log(
        `Getting deployed bytecode at ${taskArgs.address} from etherscan...`
      );

      const rsp: EtherscanGetResponse = await getCode(
        etherscan.url,
        etherscan.apiKey,
        taskArgs.address
      );
      const deployedBytecode = rsp.result;

      console.log(
        `Successfully got deployed bytecode at ${
          taskArgs.address
        } from etherscan: size is ${
          Buffer.from(deployedBytecode.substring(2), "hex").length
        } bytes`
      );

      // Find the contract artifact by verifying deployed bytecode vs local bytecode
      let artifactFileName: string | null = null;
      let artifact: Artifact | null = null;
      const compilerOutput = await run(TASK_COMPILE);
      const fileEntries = Object.entries<any>(compilerOutput.contracts);
      for (const [fileName, contracts] of fileEntries) {
        const contractEntries = Object.entries<any>(contracts);
        for (const [contractName, contractOutput] of contractEntries) {
          const evmDeployedBytecode =
            contractOutput.evm && contractOutput.evm.deployedBytecode;
          const localBytecode = `0x${evmDeployedBytecode.object}`;

          if (localBytecode === deployedBytecode) {
            artifactFileName = fileName;
            artifact = getArtifactFromContractOutput(
              contractName,
              contractOutput
            );
          }
        }
      }

      if (artifact === null) {
        throw new BuidlerPluginError(
          `Deployed bytecode does not match any local bytecode for contract at ${taskArgs.address}`
        );
      }

      const etherscanContractName = `${artifactFileName}:${artifact.contractName}`;

      const { abi } = artifact;
      config.solc.fullVersion = await getLongVersion(config.solc.version);

      const source = JSON.stringify(await run(TASK_COMPILE_GET_COMPILER_INPUT));

      const request = toRequest({
        apiKey: etherscan.apiKey,
        contractAddress: taskArgs.address,
        sourceCode: source,
        contractName: `${etherscanContractName}`,
        compilerVersion: config.solc.fullVersion,
        constructorArguments: AbiEncoder.encodeConstructor(
          abi,
          taskArgs.constructorArguments
        ),
        libraries: taskArgs.libraries
      });

      console.log(
        `Submitting contract ${etherscanContractName} for verification on etherscan...`
      );

      const response = await verifyContract(etherscan.url, request);

      console.log(
        `Successfully submitted contract at ${taskArgs.address} for verification on etherscan. Waiting for verification result...`
      );

      await getVerificationStatus(
        etherscan.url,
        etherscan.apiKey,
        response.message
      );

      console.log("Successfully verified contract on etherscan");
    }
  );
