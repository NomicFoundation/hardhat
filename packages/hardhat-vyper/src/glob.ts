import { join } from "path";

export async function getFilesWithExtension(
  directory: string,
  extension: string
): Promise<string[]> {
  try {
    const { getAllFilesMatching } = await import(
      "hardhat/internal/util/fs-utils"
    );

    if (getAllFilesMatching === undefined) {
      // we don't want to catch errors from this function
      // eslint-disable-next-line @typescript-eslint/return-await
      return getFilesWithExtensionUsingGlob(directory, extension);
    }

    return await getAllFilesMatching(directory, (f) =>
      f.endsWith(`.${extension}`)
    );
  } catch (e: any) {
    if (e.code === "MODULE_NOT_FOUND") {
      return getFilesWithExtensionUsingGlob(directory, extension);
    }

    throw e;
  }
}

async function getFilesWithExtensionUsingGlob(
  directory: string,
  extension: string
): Promise<string[]> {
  const { glob } = await import("hardhat/internal/util/glob");

  return glob(join(directory, "**", `*.${extension}`));
}
