import path from "node:path";

const main = async (projectToBuild: string) => {
  console.log("Running compile on the test fixture project - ", projectToBuild);

  const fixtureProjectDir = path.join(
    __dirname,
    "../test/fixture-projects",
    projectToBuild
  );

  process.chdir(fixtureProjectDir);

  const hre = require("hardhat");

  await hre.run("compile", { quiet: true });
};

const project = process.argv[2];

void main(project).catch((error) => {
  console.error(error);
  process.exit(1);
});
