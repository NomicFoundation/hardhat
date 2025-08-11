import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { assert } from "chai";
import { overrideTask } from "hardhat/config";
import { createHardhatRuntimeEnvironment } from "hardhat/hre";

import hardhatIgnitionPlugin from "../../src/index.js";

describe("build profile", function () {
  it("should pass the right default build profile to the compile task", async function () {
    let defaultBuildProfile: string | undefined;

    const projectPath = path.join(
      path.dirname(fileURLToPath(import.meta.url)),
      "../fixture-projects",
      "minimal",
    );

    const configPath = path.join(projectPath, "hardhat.config.js");
    const { default: userConfig } = await import(
      pathToFileURL(configPath).href
    );

    const hre = await createHardhatRuntimeEnvironment(
      {
        ...userConfig,
        plugins: [hardhatIgnitionPlugin],
        tasks: [
          overrideTask("compile")
            .setAction(async () => ({
              default: async (args, _hre, runSuper) => {
                defaultBuildProfile = args.defaultBuildProfile;

                return runSuper(args);
              },
            }))
            .build(),
        ],
      },
      { config: configPath },
      projectPath,
    );

    await hre.tasks.getTask(["ignition", "deploy"]).run({
      modulePath: path.join(projectPath, "ignition", "modules", "MyModule.js"),
    });

    assert.equal(defaultBuildProfile, "production");
  });
});
