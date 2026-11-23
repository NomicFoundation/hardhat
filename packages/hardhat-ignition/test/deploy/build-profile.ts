import assert from "node:assert/strict";
import path from "node:path";
import { describe, it } from "node:test";
import { pathToFileURL } from "node:url";

import { useEphemeralFixtureProject } from "@nomicfoundation/hardhat-test-utils";
import { overrideTask } from "hardhat/config";
import { createHardhatRuntimeEnvironment } from "hardhat/hre";

import hardhatIgnitionPlugin from "../../src/index.js";

describe("build profile", function () {
  useEphemeralFixtureProject("minimal");

  it("should pass the right default build profile to the compile task", async function () {
    let defaultBuildProfile: string | undefined;

    const projectPath = process.cwd();

    const configPath = path.join(projectPath, "hardhat.config.js");
    const { default: userConfig } = await import(
      pathToFileURL(configPath).href
    );

    const hre = await createHardhatRuntimeEnvironment(
      {
        ...userConfig,
        plugins: [hardhatIgnitionPlugin],
        tasks: [
          overrideTask("build")
            .setAction(async () => ({
              default: async (args, _hre, runSuper) => {
                defaultBuildProfile = args.defaultBuildProfile;

                return await runSuper(args);
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
