import {
  StoredDeployment,
  StoredDeploymentSerializer,
} from "@ignored/ignition-core";
import fs from "fs-extra";
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

  const templateDirExists = await fs.pathExists(templateDir);

  if (!templateDirExists) {
    console.warn(`Unable to find template directory: ${templateDir}`);
    process.exit(1);
  }

  const planDir = path.join(cacheDir, "plan");

  await fs.ensureDir(planDir);

  const indexHtml = await fs.readFile(path.join(templateDir, "index.html"));
  const updatedHtml = indexHtml
    .toString()
    .replace('{"unloaded":true}', JSON.stringify(serializedStoredDeployment));

  await fs.writeFile(path.join(planDir, "index.html"), updatedHtml);
}
