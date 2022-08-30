import { join } from "path";

export async function getFilesWithExtension(
  directory: string,
  extension: string
): Promise<string[]> {
  try {
    const { getAllFilesMatching } = await import(
      "hardhat/internal/util/fs-utils"
    );

    return await getAllFilesMatching(directory, (f) =>
      f.endsWith(`.${extension}`)
    );
  } catch (e: any) {
    if (e.code === "MODULE_NOT_FOUND") {
      const { glob } = await import("hardhat/internal/util/glob");

      return glob(join(directory, "**", `*.${extension}`));
    }

    throw e;
  }
}
