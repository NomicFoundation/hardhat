import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { assert } from "chai";
import { overrideTask } from "hardhat/config";
import { createHardhatRuntimeEnvironment } from "hardhat/hre";

import hardhatIgnitionPlugin from "../../src/index.js";

describe("deploy - build invocation", function () {
  function buildArgCaptor() {
    const buildArgs: any[] = [];
    const buildOverride = overrideTask("build")
      .setAction(async () => ({
        default: async (args: any, _hre, runSuper) => {
          buildArgs.push(args);
          return await runSuper(args);
        },
      }))
      .build();
    return { buildArgs, buildOverride };
  }

  function getProjectConfig() {
    const projectPath = path.join(
      path.dirname(fileURLToPath(import.meta.url)),
      "../fixture-projects",
      "minimal",
    );

    const configPath = path.join(projectPath, "hardhat.config.js");

    return { projectPath, configPath };
  }

  it("should call build without noTests when splitTestsCompilation is false", async function () {
    const { buildArgs, buildOverride } = buildArgCaptor();
    const { projectPath, configPath } = getProjectConfig();

    const { default: userConfig } = await import(
      pathToFileURL(configPath).href
    );

    const hre = await createHardhatRuntimeEnvironment(
      {
        ...userConfig,
        plugins: [hardhatIgnitionPlugin],
        tasks: [buildOverride],
      },
      { config: configPath },
      projectPath,
    );

    await hre.tasks.getTask(["ignition", "deploy"]).run({
      modulePath: path.join(projectPath, "ignition", "modules", "MyModule.js"),
    });

    assert.equal(buildArgs.length, 1);
    assert.equal(buildArgs[0].noTests, false);
    assert.equal(buildArgs[0].defaultBuildProfile, "production");
    assert.equal(buildArgs[0].quiet, true);
  });

  it("should call build with noTests when splitTestsCompilation is true", async function () {
    const { buildArgs, buildOverride } = buildArgCaptor();
    const { projectPath, configPath } = getProjectConfig();

    const { default: userConfig } = await import(
      pathToFileURL(configPath).href
    );

    const hre = await createHardhatRuntimeEnvironment(
      {
        ...userConfig,
        solidity: {
          ...userConfig.solidity,
          splitTestsCompilation: true,
        },
        plugins: [hardhatIgnitionPlugin],
        tasks: [buildOverride],
      },
      { config: configPath },
      projectPath,
    );

    await hre.tasks.getTask(["ignition", "deploy"]).run({
      modulePath: path.join(projectPath, "ignition", "modules", "MyModule.js"),
    });

    assert.equal(buildArgs.length, 1);
    assert.equal(buildArgs[0].noTests, true);
    assert.equal(buildArgs[0].defaultBuildProfile, "production");
    assert.equal(buildArgs[0].quiet, true);
  });
});
