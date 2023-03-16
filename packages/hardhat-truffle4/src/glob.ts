import { join } from "path";

export async function getSolidityFiles(directory: string): Promise<string[]> {
  try {
    const { getAllFilesMatching } = await import(
      "hardhat/internal/util/fs-utils"
    );

    if (getAllFilesMatching === undefined) {
      // we don't want to catch errors from this function
      // eslint-disable-next-line @typescript-eslint/return-await
      return getSolidityFilesUsingGlob(directory);
    }

    return await getAllFilesMatching(directory, (f) => f.endsWith(".sol"));
  } catch (e: any) {
    if (e.code === "MODULE_NOT_FOUND") {
      return getSolidityFilesUsingGlob(directory);
    }

    throw e;
  }
}

async function getSolidityFilesUsingGlob(directory: string): Promise<string[]> {
  const { glob } = await import("hardhat/internal/util/glob");

  return glob(join(directory, "**", "*.sol"));
}
