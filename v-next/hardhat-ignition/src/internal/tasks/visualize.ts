import type { HardhatRuntimeEnvironment } from "hardhat/types/hre";
import type { NewTaskActionFunction } from "hardhat/types/tasks";

import path from "node:path";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import {
  batches,
  IgnitionModuleSerializer,
} from "@nomicfoundation/ignition-core";

import { loadModule } from "../utils/load-module.js";
import { open } from "../utils/open.js";
import { writeVisualization } from "../visualization/write-visualization.js";

interface TaskVisualizeArguments {
  modulePath: string;
  noOpen: boolean;
}

const visualizeTask: NewTaskActionFunction<TaskVisualizeArguments> = async (
  { noOpen, modulePath }: { noOpen: boolean; modulePath: string },
  hre: HardhatRuntimeEnvironment,
) => {
  await hre.tasks.getTask("compile").run({ quiet: true });

  const userModule = await loadModule(hre.config.paths.ignition, modulePath);

  if (userModule === undefined) {
    throw new HardhatError(
      HardhatError.ERRORS.IGNITION.INTERNAL.NO_MODULES_FOUND,
    );
  }

  try {
    const serializedIgnitionModule =
      IgnitionModuleSerializer.serialize(userModule);

    const batchInfo = batches(userModule);

    await writeVisualization(
      { module: serializedIgnitionModule, batches: batchInfo },
      {
        cacheDir: hre.config.paths.cache,
      },
    );
  } catch (e) {
    if (e instanceof Error) {
      throw new HardhatError(
        HardhatError.ERRORS.IGNITION.INTERNAL.INTERNAL_ERROR,
        e,
      );
    }

    throw e;
  }

  if (!noOpen) {
    const indexFile = path.join(
      hre.config.paths.cache,
      "visualization",
      "index.html",
    );

    console.log(`Deployment visualization written to ${indexFile}`);

    open(indexFile);
  }
};

export default visualizeTask;
