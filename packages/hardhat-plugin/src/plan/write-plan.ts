import {
  StoredDeployment,
  StoredDeploymentSerializer,
} from "@ignored/ignition-core";
import { ensureDir, pathExists, readFile, writeFile } from "fs-extra";
import path from "path";

export async function writePlan(
  storedDeployment: StoredDeployment,
  { cacheDir }: { cacheDir: string }
) {
  const serializedStoredDeployment =
    StoredDeploymentSerializer.serialize(storedDeployment);

  const templateDir = path.join(
    require.resolve("@ignored/ignition-ui/package.json"),
    "../dist"
  );

  const templateDirExists = await pathExists(templateDir);

  if (!templateDirExists) {
    console.warn(`Unable to find template directory: ${templateDir}`);
    process.exit(1);
  }

  const planDir = path.join(cacheDir, "plan");

  await ensureDir(planDir);

  const indexHtml = await readFile(path.join(templateDir, "index.html"));
  const updatedHtml = indexHtml
    .toString()
    .replace('{"unloaded":true}', JSON.stringify(serializedStoredDeployment));

  await writeFile(path.join(planDir, "index.html"), updatedHtml);
}
