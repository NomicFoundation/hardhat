import chalk from "chalk";
import { subtask } from "hardhat/config";
import { Sourcify } from "../sourcify";
import { TASK_COMPILE } from "hardhat/builtin-tasks/task-names";

import {
  BuildInfoNotFoundError,
  ContractNotFoundError,
  ContractVerificationFailedError,
  VerificationAPIUnexpectedMessageError,
} from "../errors";

import {
  TASK_VERIFY_SOURCIFY,
  TASK_VERIFY_SOURCIFY_ATTEMPT_VERIFICATION,
  TASK_VERIFY_SOURCIFY_DISABLED_WARNING,
} from "../task-names";

interface VerificationResponse {
  success: boolean;
  message: string;
}

interface VerificationArgs {
  address: string;
  constructorArgs: string[];
  contractFQN?: string;
}

interface VerificationInterfaceVerifyParams {
  address: string;
  files?: {
    [index: string]: string;
  };
  chosenContract?: number;
}

interface VerificationInterface {
  isVerified(address: string): Promise<Boolean>;
  verify(params: VerificationInterfaceVerifyParams): Promise<any>;
  getVerificationStatus(guid: string): Promise<any>;
  getContractUrl(address: string, status?: string): string;
}

interface AttemptVerificationArgs {
  address: string;
  verificationInterface: VerificationInterface;
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
  .addFlag("listNetworks")
  .addParam("contractFQN")
  .setAction(
    async (
      { address, contractFQN }: VerificationArgs,
      { config, network, run, artifacts }
    ) => {
      if (!network.config.chainId) {
        console.log("Missing chainId");
        return;
      }

      if (!contractFQN) {
        console.log("Missing contract fully qualified name");
        return;
      }

      let artifactExists;
      try {
        artifactExists = await artifacts.artifactExists(contractFQN);
      } catch (error) {
        artifactExists = false;
      }

      if (!artifactExists) {
        throw new ContractNotFoundError(contractFQN);
      }

      const sourcify = new Sourcify(network.config.chainId);

      const status = await sourcify.isVerified(address);
      if (status !== false) {
        const contractURL = sourcify.getContractUrl(address, status);
        console.log(`The contract ${address} has already been verified.
${contractURL}`);
        return;
      }

      // Make sure that contract artifacts are up-to-date
      await run(TASK_COMPILE, { quiet: true });

      // First, try to verify the contract using the minimal input
      const {
        success: minimalInputVerificationSuccess,
        message: verificationMessage,
      }: VerificationResponse = await run(
        TASK_VERIFY_SOURCIFY_ATTEMPT_VERIFICATION,
        {
          address,
          verificationInterface: sourcify,
          contractFQN,
        }
      );

      if (minimalInputVerificationSuccess) {
        return;
      }

      throw new ContractVerificationFailedError(verificationMessage, []);
    }
  );

subtask(TASK_VERIFY_SOURCIFY_ATTEMPT_VERIFICATION)
  .addParam("address")
  .addParam("contractFQN")
  .setAction(
    async (
      { address, verificationInterface, contractFQN }: AttemptVerificationArgs,
      { artifacts }
    ): Promise<VerificationResponse> => {
      const buildInfo = await artifacts.getBuildInfo(contractFQN);
      if (buildInfo === undefined) {
        throw new BuildInfoNotFoundError(contractFQN);
      }

      const artifact = await artifacts.readArtifact(contractFQN);
      const chosenContract = Object.keys(buildInfo.output.contracts).findIndex(
        (source) => source === artifact.sourceName
      );

      const response = await verificationInterface.verify({
        address,
        files: {
          hardhatOutputBuffer: JSON.stringify(buildInfo),
        },
        chosenContract,
      });

      if (!(response.isFailure() || response.isSuccess())) {
        // Reaching this point shouldn't be possible unless the API is behaving in a new way.
        throw new VerificationAPIUnexpectedMessageError(response.message);
      }

      if (response.isSuccess()) {
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
