import type { UiState } from "../../../src/internal/ui/types.js";

import path from "node:path";

import { assert } from "chai";
import chalk from "chalk";

import { calculateDeployingModulePanel } from "../../../src/internal/ui/helpers/calculate-deploying-module-panel.js";
import { UiStateDeploymentStatus } from "../../../src/internal/ui/types.js";

import { testFormat } from "./test-format.js";

describe("ui - calculate starting message display", () => {
  const exampleState: UiState = {
    status: UiStateDeploymentStatus.UNSTARTED,
    chainId: 31337,
    moduleName: "ExampleModule",
    deploymentDir: "/users/example",
    batches: [],
    currentBatch: 0,
    result: null,
    warnings: [],
    isResumed: null,
    maxFeeBumps: 0,
    disableFeeBumping: false,
    gasBumps: {},
    strategy: "basic",
  };

  it("should display the deploying module message", () => {
    const expectedText = testFormat(`
    Hardhat Ignition 🚀

    ${chalk.bold(`Deploying [ ExampleModule ]`)}
    `);

    const actualText = calculateDeployingModulePanel(exampleState);

    assert.equal(actualText, expectedText);
  });

  it("should include the strategy if it is something other than basic", () => {
    const expectedText = testFormat(`
    Hardhat Ignition 🚀

    ${chalk.bold(`Deploying [ ExampleModule ] with strategy create2`)}
    `);

    const actualText = calculateDeployingModulePanel({
      ...exampleState,
      strategy: "create2",
    });

    assert.equal(actualText, expectedText);
  });

  it("should display reconciliation warnings", () => {
    const expectedText = testFormat(`
    Hardhat Ignition 🚀

    ${chalk.bold(`Deploying [ ExampleModule ]`)}

    ${chalk.yellow(
      "Warning - previously executed futures are not in the module:",
    )}
    ${chalk.yellow(" - MyModule#Contract1")}
    ${chalk.yellow(" - MyModule#Contract1.call1")}
    ${chalk.yellow(" - MyModule#Contract2")}
    `);

    const actualText = calculateDeployingModulePanel({
      ...exampleState,
      warnings: [
        "MyModule#Contract1",
        "MyModule#Contract1.call1",
        "MyModule#Contract2",
      ],
    });

    assert.equal(actualText, expectedText);
  });

  it("should display a message when the deployment is being resumed and the path is not in the CWD", () => {
    const expectedText = testFormat(`
    Hardhat Ignition 🚀

    ${chalk.bold(`Resuming existing deployment from /users/example`)}

    ${chalk.bold(`Deploying [ ExampleModule ]`)}
    `);

    const actualText = calculateDeployingModulePanel({
      ...exampleState,
      isResumed: true,
    });

    assert.equal(actualText, expectedText);
  });

  it("should display a message when the deployment is being resumed and the path is not in the CWD", () => {
    const expectedText = testFormat(`
    Hardhat Ignition 🚀

    ${chalk.bold(
      `Resuming existing deployment from .${path.sep}ignition${path.sep}deployments${path.sep}foo`,
    )}

    ${chalk.bold(`Deploying [ ExampleModule ]`)}
    `);

    const actualText = calculateDeployingModulePanel({
      ...exampleState,
      isResumed: true,
      deploymentDir: `${process.cwd()}/ignition/deployments/foo`,
    });

    assert.equal(actualText, expectedText);
  });
});
