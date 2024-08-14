import type { NewTaskActionFunction } from "@ignored/hardhat-vnext-core/types/tasks";
import type { REPLServer } from "node:repl";

import path from "node:path";
import repl from "node:repl";

import { getCacheDir } from "@ignored/hardhat-vnext-core/global-dir";
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
  // Resolve the history path if it is not empty
  let historyPath: string | undefined;
  if (history !== "") {
    // TODO(#5599): Replace with hre.config.paths.cache once it is available
    const cacheDir = await getCacheDir();
    historyPath = path.isAbsolute(history)
      ? history
      : path.resolve(cacheDir, history);
  }

  // If noCompile is false, run the compile task first
  if (!noCompile) {
    // todo: run compile task
  }

  return new Promise<REPLServer>(async (resolve) => {
    // Start a new REPL server with the default options
    const replServer = repl.start(options);

    // Resolve the task action promise only when the REPL server exits
    replServer.on("exit", () => {
      resolve(replServer);
    });

    // Add the Hardhat Runtime Environment to the REPL context
    replServer.context.hre = hre;
    replServer.context.config = hre.config;
    replServer.context.tasks = hre.tasks;
    replServer.context.globalOptions = hre.globalOptions;
    replServer.context.hooks = hre.hooks;
    replServer.context.interruptions = hre.interruptions;

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
};

export default consoleAction;
