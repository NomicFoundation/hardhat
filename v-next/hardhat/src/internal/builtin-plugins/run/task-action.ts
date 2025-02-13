import type { NewTaskActionFunction } from "../../../types/tasks.js";

import { pathToFileURL } from "node:url";

import { HardhatError } from "@ignored/hardhat-vnext-errors";
import { exists } from "@ignored/hardhat-vnext-utils/fs";
import { resolveFromRoot } from "@ignored/hardhat-vnext-utils/path";

interface RunActionArguments {
  script: string;
  noCompile: boolean;
}

const runScriptWithHardhat: NewTaskActionFunction<RunActionArguments> = async (
  { script, noCompile },
  hre,
) => {
  const normalizedPath = resolveFromRoot(process.cwd(), script);

  if (!(await exists(normalizedPath))) {
    throw new HardhatError(
      HardhatError.ERRORS.BUILTIN_TASKS.RUN_FILE_NOT_FOUND,
      { script },
    );
  }

  if (!noCompile) {
    await hre.tasks.getTask("compile").run({});
    console.log();
  }

  await import(pathToFileURL(normalizedPath).href);
};

export default runScriptWithHardhat;
