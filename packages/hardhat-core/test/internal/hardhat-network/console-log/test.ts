import { assert } from "chai";
import path from "path";
import { Artifacts } from "../../../../src/internal/artifacts";
import { useEnvironment } from "../../../helpers/environment";
import { useFixtureProject } from "../../../helpers/project";
import { TASK_COMPILE } from "../../../../src/builtin-tasks/task-names";

const ARTIFACTS_FOLDER_PATH = path.join(
  __dirname,
  "..",
  "..",
  "..",
  "fixture-projects",
  "console-log",
  "artifacts",
  "contracts",
  "Test.sol"
);

describe("Solidity console.log should print numbers without losing precision, occurrences of %d and %i should be correctly replaced with %s", function () {
  // Set up the test environment
  useFixtureProject("console-log");
  useEnvironment();

  it("should print all the numbers without losing precision", async function () {
    await this.env.run(TASK_COMPILE, { quiet: true });

    // Retrieve the artifact of the solidity file compiled in the previous command
    const artifacts = new Artifacts(ARTIFACTS_FOLDER_PATH);
    const artifact = artifacts.readArtifactSync("Test");

    // Deploy contract and get receipt
    const [deployer] = await this.env.network.provider.send("eth_accounts");
    const tx = await this.env.network.provider.send("eth_sendTransaction", [
      { from: deployer, data: artifact.bytecode },
    ]);
    const receipt = await this.env.network.provider.send(
      "eth_getTransactionReceipt",
      [tx]
    );

    // Modify console.log to store the messages that are gonna be printed when executing the smart contract function
    const originalConsoleLog = console.log;
    const capturedLogs: string[] = [];
    console.log = (s: string) => {
      capturedLogs.push(s);
    };

    // Call the contract function
    await this.env.network.provider.send("eth_sendTransaction", [
      { from: deployer, to: receipt.contractAddress, data: "0xf8a8fd6d" },
    ]);

    // Restore the original console.log
    console.log = originalConsoleLog;

    // Process the captured logs as needed
    assert.equal("123456789123456789123456789", capturedLogs[0]);
    assert.equal("123456789123456789123456789", capturedLogs[1]);
    assert.equal("121314", capturedLogs[2]);
    assert.equal("1 %i 1", capturedLogs[3]);
    // When % are in even number it means that they are escaped so %d and %i are not transformed into %s.
    // See util.format docs for more info.
    assert.equal("1 %d %2 %%d %%3 %%%d", capturedLogs[4]);
    assert.equal("1 %i %2 %%i %%3 %%%i", capturedLogs[5]);
    assert.equal("1 %s %2 %%s %%3 %%%s", capturedLogs[6]);
    assert.equal("%s", capturedLogs[7]);
    assert.equal("%%d", capturedLogs[8]);
    assert.equal("%s", capturedLogs[9]);
    assert.equal("%s %s %s %%d", capturedLogs[10]);
    assert.equal("1", capturedLogs[11]);
  });
});
