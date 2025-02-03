import { DeploymentParameters } from "@nomicfoundation/ignition-core";
import { readFile } from "fs-extra";
import { NomicLabsHardhatPluginError } from "hardhat/plugins";
import { parse as json5Parse } from "json5";

import { bigintReviver } from "./bigintReviver";

export async function readDeploymentParameters(
  filepath: string
): Promise<DeploymentParameters> {
  try {
    const rawFile = await readFile(filepath);

    return await json5Parse(rawFile.toString(), bigintReviver);
  } catch (e) {
    if (e instanceof NomicLabsHardhatPluginError) {
      throw e;
    }

    if (e instanceof Error) {
      throw new NomicLabsHardhatPluginError(
        "@nomicfoundation/hardhat-ignition",
        `Could not parse parameters from ${filepath}`,
        e
      );
    }

    throw e;
  }
}
