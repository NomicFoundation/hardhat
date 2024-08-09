import type { NewTaskActionFunction } from "@ignored/hardhat-vnext-core/types/tasks";
import type { REPLServer } from "node:repl";

import path from "node:path";
import repl from "node:repl";

import { getCacheDir } from "@ignored/hardhat-vnext-core/global-dir";
import debug from "debug";

const log = debug("hardhat:core:tasks:console");

interface ConsoleActionArguments {
  commands: string[];
}

const consoleAction: NewTaskActionFunction<ConsoleActionArguments> = async (
  { commands },
  _hre,
) => {
  const globalCacheDir = await getCacheDir();

  return new Promise<REPLServer>((resolve) => {
    // Start a new REPL server with the default options
    const replServer = repl.start();

    // Set up the REPL history file in the global cache directory
    const historyPath = path.join(globalCacheDir, "console-history.txt");
    replServer.setupHistory(historyPath, (err: Error | null) => {
      if (err !== null) {
        log(`Failed to setup REPL history: ${err.message}`);
      }
    });

    // Execute each command in the REPL server
    for (const command of commands) {
      replServer.write(`${command}\n`);
    }

    // Resolve the task action promise when the REPL server exits
    replServer.on("exit", () => {
      resolve(replServer);
    });
  });
};

export default consoleAction;
