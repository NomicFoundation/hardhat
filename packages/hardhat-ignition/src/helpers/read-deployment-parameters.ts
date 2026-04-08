import type { DeploymentParameters } from "@nomicfoundation/ignition-core";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import { readUtf8File } from "@nomicfoundation/hardhat-utils/fs";
import json5 from "json5";

import { bigintReviver } from "../internal/utils/bigintReviver.js";

export async function readDeploymentParameters(
  filepath: string,
): Promise<DeploymentParameters> {
  try {
    const rawFile = await readUtf8File(filepath);

    return await json5.parse(rawFile.toString(), bigintReviver);
  } catch (e) {
    if (HardhatError.isHardhatError(e)) {
      throw e;
    }

    if (e instanceof Error) {
      throw new HardhatError(
        HardhatError.ERRORS.IGNITION.INTERNAL.FAILED_TO_PARSE_DEPLOYMENT_PARAMETERS,
        {
          filepath,
        },
        e,
      );
    }

    throw e;
  }
}
