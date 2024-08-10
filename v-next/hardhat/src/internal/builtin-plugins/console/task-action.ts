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
  // We accept ReplOptions as an argument to allow tests overriding the IO streams
  options?: repl.ReplOptions;
}

const consoleAction: NewTaskActionFunction<ConsoleActionArguments> = async (
  { commands, history, options },
  _hre,
) => {
  // Resolve the history path if it is not empty
  let historyPath: string | undefined;
  if (history !== "") {
    const globalCacheDir = await getCacheDir();
    historyPath = path.isAbsolute(history)
      ? history
      : path.resolve(globalCacheDir, history);
  }

  return new Promise<REPLServer>((resolve) => {
    // Start a new REPL server with the default options
    const replServer = repl.start(options);

    // Resolve the task action promise only when the REPL server exits
    replServer.on("exit", () => {
      resolve(replServer);
    });

    // Set up the REPL history file if the historyPath has been set
    if (historyPath !== undefined) {
      replServer.setupHistory(historyPath, (err: Error | null) => {
        // Fail silently if the history file cannot be set up
        if (err !== null) {
          log(`Failed to setup REPL history: ${err.message}`);
        }
      });
    }

    // Execute each command in the REPL server
    for (const command of commands) {
      replServer.write(`${command}\n`);
    }
  });
};

export default consoleAction;
