import type { HardhatRuntimeEnvironment } from "@ignored/hardhat-vnext/types/hre";
import type { NewTaskActionFunction } from "@ignored/hardhat-vnext/types/tasks";

import chalk from "chalk";

interface TaskVerifyArguments {
  deploymentId: string;
  includeUnrelatedContracts: boolean;
}

const verifyTask: NewTaskActionFunction<TaskVerifyArguments> = async (
  _args,
  _hre: HardhatRuntimeEnvironment,
) => {
  console.log(
    chalk.yellow(
      "This task will be implemented soon. Check back soon for more updates.",
    ),
  );

  return;

  // const { getVerificationInformation } = await import(
  //   "@ignored/hardhat-vnext-ignition-core"
  // );
  // const deploymentDir = path.join(
  //   hre.config.paths.ignition,
  //   "deployments",
  //   deploymentId,
  // );
  // if (
  //   hre.config.etherscan === undefined ||
  //   hre.config.etherscan.apiKey === undefined ||
  //   hre.config.etherscan.apiKey === ""
  // ) {
  //   throw new NomicLabsHardhatPluginError(
  //     "@nomicfoundation/hardhat-ignition",
  //     "No etherscan API key configured",
  //   );
  // }
  // try {
  //   for await (const [chainConfig, contractInfo] of getVerificationInformation(
  //     deploymentDir,
  //     hre.config.etherscan.customChains,
  //     includeUnrelatedContracts,
  //   )) {
  //     if (chainConfig === null) {
  //       console.log(
  //         `Could not resolve contract artifacts for contract "${contractInfo}". Skipping verification.`,
  //       );
  //       console.log("");
  //       continue;
  //     }
  //     const apiKeyAndUrls = getApiKeyAndUrls(
  //       hre.config.etherscan.apiKey,
  //       chainConfig,
  //     );
  //     const instance = new Etherscan(...apiKeyAndUrls);
  //     console.log(
  //       `Verifying contract "${contractInfo.name}" for network ${chainConfig.network}...`,
  //     );
  //     const result = await verifyEtherscanContract(instance, contractInfo);
  //     if (result.type === "success") {
  //       console.log(
  //         `Successfully verified contract "${contractInfo.name}" for network ${chainConfig.network}:\n  - ${result.contractURL}`,
  //       );
  //       console.log("");
  //     } else {
  //       if (/already verified/gi.test(result.reason.message)) {
  //         const contractURL = instance.getContractUrl(contractInfo.address);
  //         console.log(
  //           `Contract ${contractInfo.name} already verified on network ${chainConfig.network}:\n  - ${contractURL}`,
  //         );
  //         console.log("");
  //         continue;
  //       } else {
  //         if (!includeUnrelatedContracts) {
  //           throw new NomicLabsHardhatPluginError(
  //             "hardhat-ignition",
  //             `Verification failed. Please run \`hardhat ignition verify ${deploymentId} --include-unrelated-contracts\` to attempt verifying all contracts.`,
  //           );
  //         } else {
  //           throw new NomicLabsHardhatPluginError(
  //             "hardhat-ignition",
  //             result.reason.message,
  //           );
  //         }
  //       }
  //     }
  //   }
  // } catch (e) {
  //   if (e instanceof IgnitionError && shouldBeHardhatPluginError(e)) {
  //     throw new NomicLabsHardhatPluginError("hardhat-ignition", e.message, e);
  //   }
  //   throw e;
  // }
};

export default verifyTask;
