import type { HardhatPlugin } from "@ignored/hardhat-vnext/types/plugins";

import { emptyTask, task } from "@ignored/hardhat-vnext/config";
import { ArgumentType } from "@ignored/hardhat-vnext/types/arguments";

import { PLUGIN_ID } from "./internal/constants.js";

import "./type-extensions.js";

const hardhatIgnitionPlugin: HardhatPlugin = {
  id: PLUGIN_ID,
  npmPackage: "@ignored/hardhat-vnext-ignition",
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
        type: ArgumentType.FILE,
        description:
          "A relative path to a JSON file to use for the module parameters",
        defaultValue: "", // TODO: HH3 check this comes through correctly
      })
      .addOption({
        name: "deploymentId",
        type: ArgumentType.STRING,
        description: "Set the id of the deployment",
        defaultValue: "", // TODO: HH3 check this comes through correctly
      })
      .addOption({
        name: "defaultSender",
        type: ArgumentType.STRING,
        description: "Set the default sender for the deployment",
        defaultValue: "", // TODO: HH3 check this comes through correctly
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
    task(
      ["ignition", "visualize"],
      "Not implemented yet - to be available soon",
    )
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
  ],
};

export default hardhatIgnitionPlugin;
