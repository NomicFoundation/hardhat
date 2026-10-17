import type {
  CommandExit,
  CommandHandle,
  WatchOutput,
} from "./watch-session.js";
import type { HardhatRuntimeEnvironment } from "../../../types/hre.js";
import type { Result } from "../../../types/utils.js";

import { spawn } from "node:child_process";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { styleText } from "node:util";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import { createDebug } from "@nomicfoundation/hardhat-utils/debug";
import { exists } from "@nomicfoundation/hardhat-utils/fs";

import { successfulResult } from "../../../utils/result.js";

import { hasWatchFlag, removeWatchArguments } from "./child-arguments.js";
import { watchFiles } from "./file-watcher.js";
import { TestFileSelection } from "./test-file-selection.js";
import { WatchSession } from "./watch-session.js";

const log = createDebug("hardhat:core:tasks:watch");

export type WatchedTask = "build" | "test" | "test solidity";

/**
 * How long a run has to exit after it is asked to stop, before it is killed.
 * Foundry's `--watch` uses the same value.
 */
const STOP_TIMEOUT_MS = 5000;

export interface WatchModeOptions {
  hre: HardhatRuntimeEnvironment;

  /**
   * The task that is watched.
   */
  task: WatchedTask;

  watchDelay: number;
  noRestart: boolean;

  /**
   * Whether each rerun is limited to the test file that changed. Only used by
   * the `test` task.
   */
  selectTestFiles: boolean;

  /**
   * The command line arguments, without the node executable and the script.
   * Defaults to `process.argv.slice(2)`.
   */
  rawArguments?: string[];
}

/**
 * Runs the task once, then again each time one of its source or test files
 * changes, until the user quits.
 */
export async function runWatchMode(
  options: WatchModeOptions,
): Promise<Result<void, void>> {
  const rawArguments = options.rawArguments ?? process.argv.slice(2);

  if (!hasWatchFlag(rawArguments)) {
    throw new HardhatError(
      HardhatError.ERRORS.CORE.BUILTIN_TASKS.WATCH_MODE_REQUIRES_CLI,
      { task: options.task },
    );
  }

  const { hre } = options;
  const root = hre.config.paths.root;
  const watchedPaths = await getWatchedPaths(hre, options.task);
  const keyboard = process.stdin.isTTY === true;

  const session = new WatchSession({
    baseArguments: removeWatchArguments(rawArguments),
    spawn: spawnHardhat,
    noRestart: options.noRestart,
    testFileSelection:
      options.task === "build"
        ? undefined
        : new TestFileSelection(options.selectTestFiles),
    isTestFile: async (absolutePath) =>
      await isTestFile(
        hre,
        absolutePath,
        options.task === "test solidity" ? "solidity" : undefined,
      ),
    output: createTerminalOutput({
      root,
      watchedPaths,
      task: options.task,
      keyboard,
    }),
    stopTimeoutMs: STOP_TIMEOUT_MS,
    now: () => performance.now(),
    onBusyChange: (busy) => setKeyboardListening(!busy),
  });

  const watcher = watchFiles({
    paths: watchedPaths,
    ignoredDirectories: [hre.config.paths.artifacts, hre.config.paths.cache],
    delayMs: options.watchDelay,
    onChanges: (changes) => {
      log("Changes", changes);
      void session.handleChanges(changes);
    },
  });

  let quitRequests = 0;
  let resolveQuit: () => void = () => {};
  const quitting = new Promise<void>((resolve) => {
    resolveQuit = resolve;
  });

  const quit = () => {
    quitRequests++;

    if (quitRequests === 1) {
      if (session.isBusy) {
        console.error(
          styleText(
            "dim",
            `Waiting up to ${STOP_TIMEOUT_MS / 1000}s for the command to exit. Press Ctrl+C again to exit now.`,
          ),
        );
      }

      void session.stop().then(resolveQuit);
    } else {
      void session.stop(true).then(resolveQuit);
    }
  };

  const onKey = (data: Buffer) => {
    const key = data.toString();

    if (key === "a") {
      void session.rerunAll();
    } else if (key === "q" || key === "\u0003" || key === "\u0004") {
      quit();
    }
  };

  // While a run is in progress it owns the terminal input, so that its
  // prompts work. In between runs, watch mode reads single key presses.
  function setKeyboardListening(listening: boolean) {
    if (!keyboard) {
      return;
    }

    if (listening) {
      process.stdin.setRawMode(true);
      process.stdin.on("data", onKey);
      process.stdin.resume();
    } else {
      process.stdin.off("data", onKey);
      process.stdin.setRawMode(false);
      process.stdin.pause();
    }
  }

  process.on("SIGINT", quit);
  process.on("SIGTERM", quit);

  try {
    await session.start();
    await quitting;
  } finally {
    process.off("SIGINT", quit);
    process.off("SIGTERM", quit);
    setKeyboardListening(false);
    await watcher.close();
  }

  return successfulResult();
}

/**
 * Returns the paths that the task depends on: the project's sources, its tests
 * (only the Solidity tests for `build` and `test solidity`), and the config
 * file.
 */
export async function getWatchedPaths(
  hre: HardhatRuntimeEnvironment,
  task: WatchedTask,
): Promise<string[]> {
  const candidates = new Set<string>();

  addPaths(candidates, hre.config.paths.sources);

  if (task === "test") {
    addPaths(candidates, hre.config.paths.tests);
  } else {
    candidates.add(hre.config.paths.tests.solidity);
  }

  if (hre.config.paths.config !== undefined) {
    candidates.add(hre.config.paths.config);
  }

  const watchedPaths: string[] = [];
  for (const candidate of candidates) {
    if (await exists(candidate)) {
      watchedPaths.push(candidate);
    }
  }

  return watchedPaths;
}

/**
 * Adds every path of a paths config object, whose values are absolute paths or
 * arrays of absolute paths. Plugins can add their own entries to these objects.
 */
function addPaths(target: Set<string>, pathsConfig: object): void {
  for (const value of Object.values(pathsConfig)) {
    if (typeof value === "string") {
      target.add(value);
    } else if (Array.isArray(value)) {
      for (const item of value) {
        if (typeof item === "string") {
          target.add(item);
        }
      }
    }
  }
}

/**
 * Returns whether the file is one of the project's test files.
 *
 * The `test#registerFileForTestRunner` hook only says which runner would run a
 * file passed to `hardhat test`, and some runners accept any file (the Node.js
 * runner takes every non-Solidity file outside the other runners' directories,
 * like the config file). So a file only counts as a test if a runner takes it
 * and it is inside one of the test directories, or it is a Solidity test,
 * which can also live among the sources (`*.t.sol`).
 *
 * @param onlyRunner When set, only files of this runner count as tests, as
 * when watching `test solidity`.
 */
export async function isTestFile(
  hre: HardhatRuntimeEnvironment,
  absolutePath: string,
  onlyRunner?: string,
): Promise<boolean> {
  const runner = await hre.hooks.runHandlerChain(
    "test",
    "registerFileForTestRunner",
    [absolutePath],
    async (_absolutePath) => undefined,
  );

  if (runner === undefined) {
    return false;
  }

  if (onlyRunner !== undefined && runner !== onlyRunner) {
    return false;
  }

  if (runner === "solidity") {
    return true;
  }

  const testDirectories = new Set<string>();
  addPaths(testDirectories, hre.config.paths.tests);

  return [...testDirectories].some(
    (directory) =>
      absolutePath === directory ||
      absolutePath.startsWith(directory + path.sep),
  );
}

/**
 * Starts the same `hardhat` command line in a new process, with the same node
 * options, sharing this terminal.
 */
function spawnHardhat(args: string[]): CommandHandle {
  const child = spawn(
    process.execPath,
    [...process.execArgv, process.argv[1], ...args],
    { stdio: "inherit" },
  );

  const exited = new Promise<CommandExit>((resolve) => {
    child.once("exit", (code, signal) => resolve({ code, signal }));
    child.once("error", (error) => {
      log("Failed to start the command", error);
      resolve({ code: 1, signal: null });
    });
  });

  return {
    exited,
    kill: (signal) => {
      child.kill(signal);
    },
  };
}

function createTerminalOutput({
  root,
  watchedPaths,
  task,
  keyboard,
}: {
  root: string;
  watchedPaths: string[];
  task: WatchedTask;
  keyboard: boolean;
}): WatchOutput {
  const relative = (absolutePath: string) => {
    const relativePath = path.relative(root, absolutePath);
    return relativePath === "" ? "." : relativePath;
  };

  return {
    clearScreen: () => {
      console.clear();
    },

    runStarted: (changedFiles, selectedTestFiles) => {
      if (changedFiles.length === 1) {
        console.log(styleText("dim", `Changed: ${relative(changedFiles[0])}`));
      } else if (changedFiles.length > 1) {
        console.log(
          styleText(
            "dim",
            `Changed ${changedFiles.length} files: ${changedFiles.map(relative).join(", ")}`,
          ),
        );
      }

      if (selectedTestFiles.length > 0) {
        console.log(
          styleText(
            "dim",
            `Running only ${selectedTestFiles.map(relative).join(", ")}${keyboard ? '. Press "a" to run all tests.' : ""}`,
          ),
        );
      }
    },

    runFinished: (exit, durationMs) => {
      const lasted = `lasted ${(durationMs / 1000).toFixed(2)}s`;

      let message: string;
      let color: "green" | "red" | "magenta";
      if (exit.code === 0) {
        message = `Command was successful, ${lasted}`;
        color = "green";
      } else if (exit.signal !== null) {
        message = `Command was stopped by ${exit.signal}, ${lasted}`;
        color = "magenta";
      } else {
        message = `Command exited with code ${exit.code ?? 1}, ${lasted}`;
        color = "red";
      }

      console.error(styleText(color, `[${message}]`));

      const what =
        task === "build" ? "sources and config" : "sources, tests, and config";
      const keys = keyboard
        ? 'Press "a" to rerun everything, "q" to quit.'
        : "Press Ctrl+C to quit.";
      console.error(
        styleText(
          "dim",
          `Watching ${watchedPaths.length} ${watchedPaths.length === 1 ? "path" : "paths"} (${what}) for changes. ${keys}`,
        ),
      );
    },
  };
}
