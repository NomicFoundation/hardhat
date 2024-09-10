import type { NewTaskActionFunction } from "../../../types/tasks.js";

import { pathToFileURL } from "node:url";

import { HardhatError } from "@ignored/hardhat-vnext-errors";
import { ensureError } from "@ignored/hardhat-vnext-utils/error";
import { exists } from "@ignored/hardhat-vnext-utils/fs";
import { resolveFromRoot } from "@ignored/hardhat-vnext-utils/path";

interface RunActionArguments {
  script: string;
  noCompile: boolean;
}

const runScriptWithHardhat: NewTaskActionFunction<RunActionArguments> = async (
  { script, noCompile },
  _hre,
) => {
  const normalizedPath = resolveFromRoot(process.cwd(), script);

  if (!(await exists(normalizedPath))) {
    throw new HardhatError(
      HardhatError.ERRORS.BUILTIN_TASKS.RUN_FILE_NOT_FOUND,
      { script },
    );
  }

  if (!noCompile) {
    // TODO(#5600): run compile task
  }

  try {
    await import(pathToFileURL(normalizedPath).href);
  } catch (error) {
    ensureError(error);

    if (HardhatError.isHardhatError(error)) {
      throw error;
    }

    throw new HardhatError(
      HardhatError.ERRORS.BUILTIN_TASKS.RUN_SCRIPT_ERROR,
      {
        script,
        error: error.message,
      },
      error,
    );
  }
};

export default runScriptWithHardhat;
