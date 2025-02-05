import type { DeploymentParameters } from "@ignored/hardhat-vnext-ignition-core";

import { HardhatError } from "@ignored/hardhat-vnext-errors";
import { readFile } from "fs-extra";
import { parse as json5Parse } from "json5";

import { bigintReviver } from "./bigintReviver.js";

export async function readDeploymentParameters(
  filepath: string
): Promise<DeploymentParameters> {
  try {
    const rawFile = await readFile(filepath);

    return await json5Parse(rawFile.toString(), bigintReviver);
  } catch (e) {
    if (HardhatError.isHardhatError(e)) {
      throw e;
    }

    if (e instanceof Error) {
      throw new HardhatError(
        HardhatError.ERRORS.IGNITION.FAILED_TO_PARSE_DEPLOYMENT_PARAMETERS,
        {
          filepath,
        },
        e
      );
    }

    throw e;
  }
}
