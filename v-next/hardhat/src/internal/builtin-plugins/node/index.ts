import type { HardhatPlugin } from "../../../types/plugins.js";

import { ArgumentType } from "../../../types/arguments.js";
import { task } from "../../core/config.js";

const hardhatPlugin: HardhatPlugin = {
  id: "builtin:node",
  tasks: [
    task("node", "Starts a JSON-RPC server on top of Hardhat Network")
      .addOption({
        name: "hostname",
        description:
          "The host to which to bind to for new connections (Defaults to 127.0.0.1 running locally, and 0.0.0.0 in Docker)",
        defaultValue: "",
      })
      .addOption({
        name: "port",
        description: "The port on which to listen for new connections",
        type: ArgumentType.INT,
        defaultValue: 8545,
      })
      .addOption({
        name: "chainType",
        description:
          "The chain type to connect to. If not specified, the default chain type will be used.",
        defaultValue: "",
      })
      .addOption({
        name: "chainId",
        description:
          "The chain id to connect to. If not specified, the default chain id will be used.",
        type: ArgumentType.INT,
        defaultValue: -1,
      })
      .addOption({
        name: "fork",
        description: "The URL of the JSON-RPC server to fork from",
        defaultValue: "",
      })
      .addOption({
        name: "forkBlockNumber",
        description: "The block number to fork from",
        type: ArgumentType.INT,
        defaultValue: -1,
      })
      .setAction(import.meta.resolve("./task-action.js"))
      .build(),
  ],
  dependencies: [
    async () => {
      const { default: networkManagerBuiltinPlugin } = await import(
        "../network-manager/index.js"
      );
      return networkManagerBuiltinPlugin;
    },
  ],
};

export default hardhatPlugin;
