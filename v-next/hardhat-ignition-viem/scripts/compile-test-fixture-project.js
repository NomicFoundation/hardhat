import { createHardhatRuntimeEnvironment } from "@ignored/hardhat-vnext/hre";
import path, { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const main = async (projectToBuild) => {
  console.log("Running compile on the test fixture project - ", projectToBuild);

  const fixtureProjectDir = path.join(
    dirname(fileURLToPath(import.meta.url)),
    "../test/fixture-projects",
    projectToBuild,
  );

  process.chdir(fixtureProjectDir);

  const hre = await createHardhatRuntimeEnvironment({});

  await hre.tasks.getTask("compile").run({ quiet: true });
};

const project = process.argv[2];

void main(project).catch((error) => {
  console.error(error);
  process.exit(1);
});
