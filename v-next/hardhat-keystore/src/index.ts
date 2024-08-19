import type { HardhatPlugin } from "@ignored/hardhat-vnext-core/types/plugins";

import { ArgumentType, task } from "@ignored/hardhat-vnext-core/config";

import "./type-extensions.js";
import { get, list, remove, set } from "./methods.js";

export const PLUGIN_ID = "hardhat-keystore";

const hardhatKeystorePlugin: HardhatPlugin = {
  id: PLUGIN_ID,
  // hookHandlers: {
  //   userInterruptions: import.meta.resolve(
  //     "./hook-handlers/user-interruptions.js",
  //   ),
  //   // config: import.meta.resolve("./hookHandlers/config.js"),
  //   // configurationVariables: import.meta.resolve(
  //   //   "./hookHandlers/configurationVariables.js"
  //   // ),
  // },
  tasks: [
    task("keystore", "Store your keys in a secure way")
      .setAction(async (_, _hre) => {})
      .build(),

    task(
      ["keystore", "set"],
      "Sets a new value in the keystore associated with the specified key",
    )
      .addPositionalArgument({
        name: "key",
        type: ArgumentType.STRING,
        description: "Specifies the key to set in the keystore",
      })
      .addFlag({
        name: "force",
        description: "Forces overwrite if the key already exists.",
      })
      .setAction(async ({ key, force }) => {
        // await set(key, hre);
        await set(key, force);
      })
      .build(),

    task(["keystore", "get"], "Get a value given a key")
      .addPositionalArgument({
        name: "key",
        type: ArgumentType.STRING,
        description: "Specifies the key to retrieve the value for",
      })
      .setAction(async ({ key }) => {
        await get(key);
      })
      .build(),

    task(["keystore", "list"], "List all keys in the keystore")
      .setAction(async () => {
        await list();
      })
      .build(),

    task(["keystore", "delete"], "Delete a key from the keystore")
      .addPositionalArgument({
        name: "key",
        type: ArgumentType.STRING,
        description: "Specifies the key to delete from the keystore",
      })
      .setAction(async ({ key }) => {
        await remove(key);
      })
      .build(),
  ],
};

export default hardhatKeystorePlugin;
