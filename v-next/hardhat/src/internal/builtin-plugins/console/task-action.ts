import type { HardhatHooks } from "../../../types/hooks.js";
import type { NewTaskActionFunction } from "../../../types/tasks.js";
import type { REPLServer } from "node:repl";

import repl from "node:repl";

import { resolveFromRoot } from "@nomicfoundation/hardhat-utils/path";
import chalk from "chalk";
import debug from "debug";

const log = debug("hardhat:core:tasks:console");

interface ConsoleActionArguments {
  commands: string[];
  history: string;
  noCompile: boolean;
  // We accept ReplOptions as an argument to allow tests overriding the IO streams
  options?: repl.ReplOptions;
}

const consoleAction: NewTaskActionFunction<ConsoleActionArguments> = async (
  { commands, history, noCompile, options },
  hre,
) => {
  const handlers: Partial<HardhatHooks["userInterruptions"]> = {
    requestSecretInput: async () => {
      console.error(
        chalk.red("Secrets are not yet supported in the console task"),
      );
      process.exit(1);
    },
  };

  hre.hooks.registerHandlers("userInterruptions", handlers);

  try {
    // Resolve the history path if it is not empty
    let historyPath: string | undefined;
    if (history !== "") {
      const cacheDir = hre.config.paths.cache;
      historyPath = resolveFromRoot(cacheDir, history);
    }

    if (!noCompile) {
      await hre.tasks.getTask("compile").run({ quiet: true });
    }

    return await new Promise<REPLServer>(async (resolve) => {
      // Start a new REPL server with the default options
      const replServer = repl.start(options);

      // Resolve the task action promise only when the REPL server exits
      replServer.on("exit", () => {
        // Prevent the REPL from queueing one last async prompt after `.exit`
        replServer.displayPrompt = () => {};
        resolve(replServer);
      });

      // Add the Hardhat Runtime Environment to the REPL context
      replServer.context.hre = hre;
      replServer.context.config = hre.config;
      replServer.context.tasks = hre.tasks;
      replServer.context.globalOptions = hre.globalOptions;
      replServer.context.hooks = hre.hooks;
      replServer.context.interruptions = hre.interruptions;

      // NOTE: This is a small architectural violation, as the network manager
      // comes from a builtin plugin, and plugins can't add their own exports
      // here. We may consider adding a hook for this in the future.
      replServer.context.network = hre.network;

      // Set up the REPL history file if the historyPath has been set
      if (historyPath !== undefined) {
        await new Promise<void>((resolveSetupHistory) => {
          replServer.setupHistory(historyPath, (err: Error | null) => {
            // Fail silently if the history file cannot be set up
            if (err !== null) {
              log("Failed to setup REPL history", err);
            }
            resolveSetupHistory();
          });
        });
      }

      // Execute each command in the REPL server
      for (const command of commands) {
        replServer.write(`${command}\n`);
      }
    });
  } finally {
    hre.hooks.unregisterHandlers("userInterruptions", handlers);
  }
};

export default consoleAction;
