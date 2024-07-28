import type { NewTaskActionFunction } from "@ignored/hardhat-vnext-core/types/tasks";

import { isAbsolute, resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { HardhatError } from "@ignored/hardhat-vnext-errors";
import { exists } from "@ignored/hardhat-vnext-utils/fs";

interface RunActionArguments {
  script: string;
  noCompile: boolean;
}

const runScriptWithHardhat: NewTaskActionFunction<RunActionArguments> = async (
  { script, noCompile },
  _hre,
) => {
  const normalizedPath = isAbsolute(script)
    ? script
    : resolve(process.cwd(), script);

  if (!(await exists(normalizedPath))) {
    throw new HardhatError(
      HardhatError.ERRORS.BUILTIN_TASKS.RUN_FILE_NOT_FOUND,
      { script },
    );
  }

  if (!noCompile) {
    // todo: run compile task
  }

  try {
    await import(pathToFileURL(normalizedPath).href);
  } catch (error) {
    if (error instanceof Error) {
      throw new HardhatError(
        HardhatError.ERRORS.BUILTIN_TASKS.RUN_SCRIPT_ERROR,
        {
          script,
          error: error.message,
        },
        error,
      );
    }

    throw error;
  }
};

export default runScriptWithHardhat;
