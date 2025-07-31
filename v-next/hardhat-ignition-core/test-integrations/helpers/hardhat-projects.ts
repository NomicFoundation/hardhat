import path from "node:path";

import { cpSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { remove } from "@nomicfoundation/hardhat-utils/fs";
import { createHre } from "./create-hre.js";

export function useHardhatProject(fixtureProjectName: string): void {
  const basePath = path.join(
    process.cwd(),
    "test-integrations",
    "fixture-projects",
  );
  const tmpProjectPath = path.join("tmp", randomUUID());

  let prevWorkingDir: string;

  // todo: whenever these tests are migrated to node:test,
  // we should use `useEphemeralFixtureProject` from hardhat-test-utils here instead
  before(async function () {
    cpSync(
      path.join(basePath, fixtureProjectName),
      path.join(basePath, tmpProjectPath),
      {
        recursive: true,
        force: true,
      },
    );

    prevWorkingDir = process.cwd();
    process.chdir(path.join(basePath, tmpProjectPath));

    const hre = await createHre();

    await hre.tasks.getTask("compile").run({ quiet: true });
  });

  after(async () => {
    process.chdir(prevWorkingDir);
    await remove(path.join(basePath, tmpProjectPath));
  });
}
