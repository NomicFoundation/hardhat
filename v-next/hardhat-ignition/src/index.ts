import type { HardhatPlugin } from "hardhat/types/plugins";

import { emptyTask, task } from "hardhat/config";
import { ArgumentType } from "hardhat/types/arguments";

import { PLUGIN_ID } from "./internal/constants.js";

import "./type-extensions.js";

const hardhatIgnitionPlugin: HardhatPlugin = {
  id: PLUGIN_ID,
  npmPackage: "@nomicfoundation/hardhat-ignition",
  hookHandlers: {
    config: import.meta.resolve("./internal/hook-handlers/config.js"),
  },
  tasks: [
    emptyTask(
      "ignition",
      "Deploy your smart contracts using Hardhat Ignition",
    ).build(),
    task(["ignition", "deploy"], "Deploy a module to the specified network")
      .addPositionalArgument({
        name: "modulePath",
        type: ArgumentType.STRING,
        description: "The path to the module file to deploy",
      })
      .addOption({
        name: "parameters",
        type: ArgumentType.FILE_WITHOUT_DEFAULT,
        description:
          "A relative path to a JSON file to use for the module parameters",
        defaultValue: undefined,
      })
      .addOption({
        name: "deploymentId",
        type: ArgumentType.STRING_WITHOUT_DEFAULT,
        description: "Set the id of the deployment",
        defaultValue: undefined,
      })
      .addOption({
        name: "defaultSender",
        type: ArgumentType.STRING_WITHOUT_DEFAULT,
        description: "Set the default sender for the deployment",
        defaultValue: undefined,
      })
      .addOption({
        name: "strategy",
        type: ArgumentType.STRING,
        description: "Set the deployment strategy to use",
        defaultValue: "basic",
      })
      .addFlag({
        name: "reset",
        description: "Wipes the existing deployment state before deploying",
      })
      .addFlag({
        name: "verify",
        description: "Verify the deployment on Etherscan",
      })
      .addFlag({
        name: "writeLocalhostDeployment",
        description:
          "Write deployment information to disk when deploying to the in-memory network",
      })
      .setAction(import.meta.resolve("./internal/tasks/deploy.js"))
      .build(),
    task(["ignition", "status"], "Show the current status of a deployment")
      .addPositionalArgument({
        name: "deploymentId",
        type: ArgumentType.STRING,
        description: "The id of the deployment to show",
      })
      .setAction(import.meta.resolve("./internal/tasks/status.js"))
      .build(),
    task(["ignition", "deployments"], "List all deployment IDs")
      .setAction(import.meta.resolve("./internal/tasks/deployments.js"))
      .build(),
    task(
      ["ignition", "transactions"],
      "Show all transactions for a given deployment",
    )
      .addPositionalArgument({
        name: "deploymentId",
        type: ArgumentType.STRING,
        description: "The id of the deployment to show transactions for",
      })
      .setAction(import.meta.resolve("./internal/tasks/transactions.js"))
      .build(),
    task(["ignition", "wipe"], "Reset a deployment's future to allow rerunning")
      .addPositionalArgument({
        name: "deploymentId",
        type: ArgumentType.STRING,
        description: "The id of the deployment with the future to wipe",
      })
      .addPositionalArgument({
        name: "futureId",
        type: ArgumentType.STRING,
        description: "The id of the future to wipe",
      })
      .setAction(import.meta.resolve("./internal/tasks/wipe.js"))
      .build(),
    task(["ignition", "visualize"], "Visualize a module as an HTML report")
      .addPositionalArgument({
        name: "modulePath",
        type: ArgumentType.FILE,
        description: "The path to the module file to visualize",
      })
      .addFlag({
        name: "noOpen",
        description: "Disables opening report in browser",
      })
      .setAction(import.meta.resolve("./internal/tasks/visualize.js"))
      .build(),

    task(["ignition", "verify"], "Not implemented yet - to be available soon")
      .addPositionalArgument({
        name: "deploymentId",
        type: ArgumentType.STRING,
        description: "The id of the deployment to verify",
      })
      .addFlag({
        name: "includeUnrelatedContracts",
        description: "Include all compiled contracts in the verification",
      })
      .setAction(import.meta.resolve("./internal/tasks/verify.js"))
      .build(),
    task(
      ["ignition", "track-tx"],
      "Track a transaction that is missing from a given deployment. Only use if a Hardhat Ignition error message suggests to do so.",
    )
      .addPositionalArgument({
        name: "txHash",
        type: ArgumentType.STRING,
        description: "The hash of the transaction to track",
      })
      .addPositionalArgument({
        name: "deploymentId",
        type: ArgumentType.STRING,
        description: "The id of the deployment to add the tx to",
      })
      .setAction(import.meta.resolve("./internal/tasks/track-tx.js"))
      .build(),
    task(["ignition", "migrate"], "Migrate artifacts to the new format")
      .addPositionalArgument({
        name: "deploymentId",
        type: ArgumentType.STRING,
        description: "The id of the deployment to migrate",
      })
      .setAction(import.meta.resolve("./internal/tasks/migrate.js"))
      .build(),
  ],
};

export default hardhatIgnitionPlugin;
