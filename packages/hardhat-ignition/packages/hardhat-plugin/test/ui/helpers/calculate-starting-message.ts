import { assert } from "chai";
import chalk from "chalk";

import { calculateStartingMessage } from "../../../src/ui/helpers/calculate-starting-message";

describe("ui - calculate starting message display", () => {
  it("should display the starting message", () => {
    const expectedText = `Hardhat Ignition starting for [ MyModule ]...`;

    const actualText = calculateStartingMessage({
      moduleName: "MyModule",
      deploymentDir: "/users/example",
    });

    assert.equal(actualText, expectedText);
  });

  it("should display the warning for an ephemeral network", () => {
    const warningMessage = `You are running Hardhat Ignition against an in-process instance of Hardhat Network.
This will execute the deployment, but the results will be lost.
You can use --network <network-name> to deploy to a different network.`;

    const expectedText = `${chalk.yellow(
      chalk.bold(warningMessage)
    )}\n\nHardhat Ignition starting for [ MyModule ]...`;

    const actualText = calculateStartingMessage({
      moduleName: "MyModule",
      deploymentDir: undefined,
    });

    assert.equal(actualText, expectedText);
  });
});
