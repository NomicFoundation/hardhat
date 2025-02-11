import type { SerializedIgnitionModule } from "@ignored/hardhat-vnext-ignition-core";

import path from "node:path";

import { HardhatError } from "@ignored/hardhat-vnext-errors";
import {
  ensureDir,
  exists,
  readUtf8File,
  writeUtf8File,
} from "@ignored/hardhat-vnext-utils/fs";

export async function writeVisualization(
  visualizationPayload: {
    module: SerializedIgnitionModule;
    batches: string[][];
  },
  { cacheDir }: { cacheDir: string },
): Promise<void> {
  const templateDir = path.join(
    require.resolve("@nomicfoundation/ignition-ui/package.json"),
    "../dist",
  );

  const templateDirExists = await exists(templateDir);

  if (!templateDirExists) {
    throw new HardhatError(
      HardhatError.ERRORS.IGNITION.VISUALIZATION_TEMPLATE_DIR_NOT_FOUND,
      {
        templateDir,
      },
    );
  }

  const visualizationDir = path.join(cacheDir, "visualization");

  await ensureDir(visualizationDir);

  const indexHtml = await readUtf8File(path.join(templateDir, "index.html"));
  const updatedHtml = indexHtml
    .toString()
    .replace('{ "unloaded": true }', JSON.stringify(visualizationPayload));

  await writeUtf8File(path.join(visualizationDir, "index.html"), updatedHtml);
}
