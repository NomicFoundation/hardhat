import path from "path";
import fs from "fs";

import { TASK_COMPILE, TASK_CLEAN } from "hardhat/builtin-tasks/task-names";
import { resetHardhatContext } from "hardhat/plugins-testing";

const snapshotPartialPaths = [
  "artifacts.d.ts",
  path.join("contracts", "A.sol", "A.d.ts"),
  path.join("contracts", "A.sol", "B.d.ts"),
  path.join("contracts", "A.sol", "artifacts.d.ts"),
  path.join("contracts", "C.sol", "B.d.ts"),
  path.join("contracts", "C.sol", "C.d.ts"),
  path.join("contracts", "C.sol", "artifacts.d.ts"),
];

const originalCwd = process.cwd();

async function updateSnapshots() {
  process.chdir(path.join(__dirname, "fixture-projects", "type-generation"));
  process.env.HARDHAT_NETWORK = "hardhat";

  const hre = require("hardhat");
  await hre.run(TASK_COMPILE, { quiet: true });

  snapshotPartialPaths.forEach((partialPath) => {
    const snapshotPath = path.join(process.cwd(), "snapshots", partialPath);
    const generatedFilePath = path.join(
      process.cwd(),
      "artifacts",
      partialPath
    );

    fs.copyFileSync(generatedFilePath, snapshotPath);
  });

  await hre.run(TASK_CLEAN);

  process.chdir(path.resolve(`${__dirname}/..`));
  resetHardhatContext();
  delete process.env.HARDHAT_NETWORK;

  console.log("Snapshots updated!");
}

updateSnapshots()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    process.chdir(originalCwd);
  });
