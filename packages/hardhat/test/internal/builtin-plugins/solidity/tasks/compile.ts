import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { overrideTask } from "../../../../../src/config.js";
import { createHardhatRuntimeEnvironment } from "../../../../../src/internal/hre-initialization.js";

describe("compile task - alias of build", () => {
  it("invokes a plugin override of build when compile is run", async () => {
    const { buildArgs, buildOverride } = resolveBuildOverridePlugin();

    const hre = await createHardhatRuntimeEnvironment({
      tasks: [buildOverride],
    });

    await hre.tasks.getTask("compile").run({});

    assert.equal(buildArgs.length, 1);
  });

  it("forwards arguments from compile to the build task", async () => {
    const { buildArgs: expectedBuildArgs, buildOverride } =
      resolveBuildOverridePlugin();

    const hre = await createHardhatRuntimeEnvironment({
      tasks: [buildOverride],
    });

    const buildArgs = {
      force: true,
      quiet: true,
      noTests: true,
      noContracts: true,
      defaultBuildProfile: "production",
      files: ["contracts/Foo.sol"],
    };

    await hre.tasks.getTask("compile").run(buildArgs);

    assert.equal(expectedBuildArgs.length, 1);
    const passedBuildArgs = expectedBuildArgs[0];

    assert.equal(passedBuildArgs.force, true);
    assert.equal(passedBuildArgs.quiet, true);
    assert.equal(passedBuildArgs.noTests, true);
    assert.equal(passedBuildArgs.noContracts, true);
    assert.equal(passedBuildArgs.defaultBuildProfile, "production");
    assert.deepEqual(passedBuildArgs.files, ["contracts/Foo.sol"]);
  });
});

function resolveBuildOverridePlugin() {
  const buildArgs: any[] = [];

  const buildOverride = overrideTask("build")
    .setAction(async () => {
      return {
        default: (args: any) => {
          buildArgs.push(args);

          return { contractRootPaths: [], testRootPaths: [] };
        },
      };
    })
    .build();

  return { buildArgs, buildOverride };
}
