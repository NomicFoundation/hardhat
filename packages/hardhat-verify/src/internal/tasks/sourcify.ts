import chalk from "chalk";
import { subtask, types } from "hardhat/config";
import { Sourcify } from "../sourcify";
import { TASK_COMPILE } from "hardhat/builtin-tasks/task-names";

import {
  BuildInfoNotFoundError,
  ContractNotFoundError,
  ContractVerificationFailedError,
  InvalidContractNameError,
  NonUniqueContractNameError,
  VerificationAPIUnexpectedMessageError,
} from "../errors";

import {
  TASK_VERIFY_SOURCIFY,
  TASK_VERIFY_SOURCIFY_ATTEMPT_VERIFICATION,
  TASK_VERIFY_SOURCIFY_DISABLED_WARNING,
} from "../task-names";
import { isFullyQualifiedName } from "hardhat/src/utils/contract-names";
import { Artifact } from "hardhat/src/types";

interface VerificationResponse {
  success: boolean;
  message: string;
}

interface VerificationArgs {
  address: string;
  constructorArgs: string[];
  contract?: string;
}

interface AttemptVerificationArgs {
  address: string;
  verificationInterface: Sourcify;
  contractFQN: string;
}

/**
 * Main Sourcify verification subtask.
 *
 * Verifies a contract in Sourcify by coordinating various subtasks related
 * to contract verification.
 */
subtask(TASK_VERIFY_SOURCIFY)
  .addParam("address")
  .addOptionalParam("contract")
  .setAction(
    async (
      { address, contract }: VerificationArgs,
      { config, network, run, artifacts }
    ) => {
      if (!contract) {
        console.log(
          "In order to verify on Sourcify you must provide a contract fully qualified name"
        );
        return;
      }

      const chainConfig = await Sourcify.getCurrentChainConfig(
        network.name,
        network.provider,
        config.sourcify.customChains || []
      );

      if (!chainConfig.chainId) {
        console.log("Missing chainId");
        return;
      }

      if (contract !== undefined && !isFullyQualifiedName(contract)) {
        throw new InvalidContractNameError(contract || "");
      }

      const artifactExists = await artifacts.artifactExists(contract);

      if (!artifactExists) {
        throw new ContractNotFoundError(contract);
      }

      const sourcify = new Sourcify(chainConfig.chainId);

      const status = await sourcify.isVerified(address);
      if (status !== false) {
        const contractURL = sourcify.getContractUrl(address, status);
        console.log(`The contract ${address} has already been verified.
${contractURL}`);
        return;
      }

      const {
        success: verificationSuccess,
        message: verificationMessage,
      }: VerificationResponse = await run(
        TASK_VERIFY_SOURCIFY_ATTEMPT_VERIFICATION,
        {
          address,
          verificationInterface: sourcify,
          contractFQN: contract,
        }
      );
      if (verificationSuccess) {
        return;
      }

      throw new ContractVerificationFailedError(verificationMessage, []);
    }
  );

subtask(TASK_VERIFY_SOURCIFY_ATTEMPT_VERIFICATION)
  .addParam("address")
  .addParam("contractFQN")
  .addParam("verificationInterface", undefined, undefined, types.any)
  .setAction(
    async (
      { address, verificationInterface, contractFQN }: AttemptVerificationArgs,
      { artifacts }
    ): Promise<VerificationResponse> => {
      const buildInfo = await artifacts.getBuildInfo(contractFQN);
      if (buildInfo === undefined) {
        throw new BuildInfoNotFoundError(contractFQN);
      }

      let artifact: Artifact;
      try {
        artifact = await artifacts.readArtifact(contractFQN);
      } catch (e) {
        throw new NonUniqueContractNameError();
      }

      const chosenContract = Object.keys(buildInfo.output.contracts).findIndex(
        (source) => source === artifact.sourceName
      );

      if (chosenContract === -1) {
        throw new ContractNotFoundError(artifact.sourceName);
      }

      const response = await verificationInterface.verify(
        address,
        {
          hardhatOutputBuffer: JSON.stringify(buildInfo),
        },
        chosenContract
      );

      if (response.isOk()) {
        const contractURL = verificationInterface.getContractUrl(
          address,
          response.getStatus()
        );
        console.log(`Successfully verified contract ${
          contractFQN.split(":")[1]
        } on Sourcify.
${contractURL}`);
      }

      return {
        success: response.isSuccess(),
        message: "Contract successfuly verified on Sourcify",
      };
    }
  );

subtask(TASK_VERIFY_SOURCIFY_DISABLED_WARNING, async () => {
  console.warn(
    chalk.yellow(
      `WARNING: Skipping Sourcify verification: Sourcify is disabled. To enable it, add this entry to your config:

sourcify: {
  enabled: true
}

Learn more at https://...`
    )
  );
});
