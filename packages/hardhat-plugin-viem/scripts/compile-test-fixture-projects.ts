import fs from "node:fs";
import path from "node:path";

const main = async () => {
  console.log("Running compile on the test fixture projects...");

  const fixtureProjectNames = fs
    .readdirSync(path.join(__dirname, "../test/fixture-projects"), {
      withFileTypes: true,
    })
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => dirent.name);

  for (const fixtureProjectName of fixtureProjectNames) {
    const fixtureProjectDir = path.join(
      __dirname,
      "../test/fixture-projects",
      fixtureProjectName
    );

    if (fs.existsSync(path.join(fixtureProjectDir, "./artifacts"))) {
      return;
    }

    process.chdir(fixtureProjectDir);

    const hre = require("hardhat");

    await hre.run("compile");
  }
};

void main();
