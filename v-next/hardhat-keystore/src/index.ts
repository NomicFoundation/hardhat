import type { HardhatPlugin } from "hardhat/types/plugins";

import "./internal/type-extensions.js";

import { emptyTask, task } from "hardhat/config";
import { ArgumentType } from "hardhat/types/arguments";

import { PLUGIN_ID } from "./internal/constants.js";

const hardhatKeystorePlugin: HardhatPlugin = {
  id: PLUGIN_ID,
  hookHandlers: {
    config: () => import("./internal/hook-handlers/config.js"),
    configurationVariables: () =>
      import("./internal/hook-handlers/configuration-variables.js"),
  },
  tasks: [
    emptyTask("keystore", "Store keys in an encrypted storage").build(),

    task(
      ["keystore", "set"],
      "Set a new value in the keystore associated with the specified key",
    )
      .addPositionalArgument({
        name: "key",
        type: ArgumentType.STRING,
        description: "Specify the key to set in the keystore",
      })
      .addFlag({
        name: "force",
        description: "Force overwrite if the key already exists.",
      })
      .addFlag({
        name: "dev",
        description:
          "Use the development keystore instead of the production one",
      })
      .setAction(() => import("./internal/tasks/set.js"))
      .build(),

    task(["keystore", "get"], "Get a value given a key")
      .addFlag({
        name: "dev",
        description:
          "Use the development keystore instead of the production one",
      })
      .addPositionalArgument({
        name: "key",
        type: ArgumentType.STRING,
        description: "Specify the key to retrieve the value for",
      })
      .setAction(() => import("./internal/tasks/get.js"))
      .build(),

    task(["keystore", "list"], "List all keys in the keystore")
      .addFlag({
        name: "dev",
        description:
          "Use the development keystore instead of the production one",
      })
      .setAction(() => import("./internal/tasks/list.js"))
      .build(),

    task(["keystore", "delete"], "Delete a key from the keystore")
      .addFlag({
        name: "dev",
        description:
          "Use the development keystore instead of the production one",
      })
      .addPositionalArgument({
        name: "key",
        type: ArgumentType.STRING,
        description: "Specify the key to delete from the keystore",
      })
      .addFlag({
        name: "force",
        description:
          "Force to not throw an error if the key does not exist during deletion.",
      })
      .setAction(() => import("./internal/tasks/delete.js"))
      .build(),

    task(["keystore", "rename"], "Rename a key in the keystore")
      .addFlag({
        name: "dev",
        description:
          "Use the development keystore instead of the production one",
      })
      .addPositionalArgument({
        name: "oldKey",
        type: ArgumentType.STRING,
        description: "Specify the current key name to rename",
      })
      .addPositionalArgument({
        name: "newKey",
        type: ArgumentType.STRING,
        description: "Specify the new key name",
      })
      .addFlag({
        name: "force",
        description: "Force overwrite if the new key already exists.",
      })
      .setAction(() => import("./internal/tasks/rename.js"))
      .build(),

    task(["keystore", "path"], "Display the path where the keystore is stored")
      .addFlag({
        name: "dev",
        description:
          "Use the development keystore instead of the production one",
      })
      .setAction(() => import("./internal/tasks/path.js"))
      .build(),

    task(
      ["keystore", "change-password"],
      "Change the password for the keystore",
    )
      .addFlag({
        name: "dev",
        description:
          "Use the development keystore instead of the production one",
      })
      .setAction(() => import("./internal/tasks/change-password.js"))
      .build(),
  ],
  npmPackage: "@nomicfoundation/hardhat-keystore",
};

export default hardhatKeystorePlugin;
