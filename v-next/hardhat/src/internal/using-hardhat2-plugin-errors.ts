import { fileURLToPath } from "node:url";

import { CustomError } from "@nomicfoundation/hardhat-utils/error";
import { shortenPath } from "@nomicfoundation/hardhat-utils/path";
import chalk from "chalk";

export class UsingHardhat2PluginError extends CustomError {
  public readonly callerRelativePath: string | undefined;
  constructor() {
    const callerPath = getCallerRelativePath();

    let message: string;
    if (callerPath !== undefined) {
      message = `You are trying to use a Hardhat 2 plugin in a Hardhat 3 project.

This file is part of a Hardhat 2 plugin calling an API that was removed in Hardhat 3: ${chalk.bold(callerPath)}

Please read https://hardhat.org/migrate-from-hardhat2 to learn how to migrate your project to Hardhat 3.
`;
    } else {
      message = `You are trying to use a Hardhat 2 plugin in a Hardhat 3 project.
      
Check the stack trace below to identify which plugin is causing this.

Please read https://hardhat.org/migrate-from-hardhat2 to learn how to migrate your project to Hardhat 3.
`;
    }

    super(message);
    this.callerRelativePath = callerPath;
  }
}

export function getCallerRelativePath(depth: number = 5): string | undefined {
  try {
    const stack = new Error().stack;
    if (stack === undefined) {
      return undefined;
    }

    // Default depth=5 assumes: 0=message, 1=getCallerRelativePath, 2=Hardhat2PluginError constructor, 3=throwHardhat2PluginError, 4=deprecated fn, 5=actual caller
    const lines = stack.split("\n");
    const callerLine = lines[depth];
    if (callerLine === undefined) {
      return undefined;
    }

    const regex = new RegExp(
      [
        "^", // Matches the beginning of the line
        "at ", // Matches the string "at "
        "(?:", // Opens a non-capturing group
        ".+?", // Lazily matches the context
        " \\(", // Matches the string " ("
        ")?", // Closes the non-capturing group and makes it optional
        "(?:", // Opens a non-capturing group
        "([^\\(].*?)", // Lazily captures the location as 1 or more characters not starting with "("
        "(?:", // Opens a non-capturing group
        ":", // Matches the string ":"
        "\\d+", // Matches the line number
        ")?", // Closes the non-capturing group and makes it optional
        "(?:", // Opens a non-capturing group
        ":", // Matches the string ":"
        "\\d+", // Matches the column number
        ")?", // Closes the non-capturing group and makes it optional
        ")", // Closes the non-capturing group
        "\\)?", // Optionally matches the string ")"
        "$", // Matches the end of the line
      ].join(""),
    );

    const match = callerLine.trim().match(regex);
    if (match === null || match[1] === undefined) {
      return undefined;
    }

    let filePath = match[1];

    // Handle file:// URLs from ESM stack traces
    if (filePath.startsWith("file://")) {
      filePath = fileURLToPath(filePath);
    }

    return shortenPath(filePath);
  } catch {
    return undefined;
  }
}

export function throwUsingHardhat2PluginError(): never {
  /* eslint-disable-next-line no-restricted-syntax -- Intentionally throwing a
    custom error here so that we always print the stack trace */
  throw new UsingHardhat2PluginError();
}
