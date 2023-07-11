import { assert } from "chai";
import { useEnvironment } from "../../helpers/environment";
import { useFixtureProject } from "../../helpers/project";
import { TASK_COMPILE } from "../../../src/builtin-tasks/task-names";

describe("Solidity console.log should print numbers without losing precision, occurrences of %d and %i should be correctly replaced with %s", function () {
  const n1 = "11111111111111111111111111111111";
  const n2 = "22222222222222222222222222222222";
  const n3 = "33333333333333333333333333333333";

  // Set up the test environment
  useFixtureProject("console-log");
  useEnvironment();

  it("should print all the numbers without losing precision", async function () {
    await this.env.run(TASK_COMPILE, { quiet: true });

    // Retrieve the artifact of the solidity file compiled in the previous command
    const artifact = this.env.artifacts.readArtifactSync("Test");

    // Deploy contract and get receipt
    const [deployer] = await this.env.network.provider.send("eth_accounts");
    const tx = await this.env.network.provider.send("eth_sendTransaction", [
      {
        from: deployer,
        data: artifact.bytecode,
      },
    ]);
    const receipt = await this.env.network.provider.send(
      "eth_getTransactionReceipt",
      [tx]
    );

    // Modify console.log to store the messages that are gonna be printed when executing the smart contract function
    const originalConsoleLog = console.log;
    const capturedLogs: any[] = [];
    console.log = (v: any) => {
      capturedLogs.push(v);
    };

    // Call the contract function
    await this.env.network.provider.send("eth_sendTransaction", [
      {
        from: deployer,
        to: receipt.contractAddress,
        data: "0xf8a8fd6d", // selector of 'test()'
      },
    ]);

    // Restore the original console.log
    console.log = originalConsoleLog;

    // Process the captured logs as needed
    assert.strictEqual("123456789123456789123456789", capturedLogs[0]);
    assert.strictEqual("123456789123456789123456789", capturedLogs[1]);
    assert.strictEqual(`${n1}${n2}${n3}`, capturedLogs[2]);
    assert.strictEqual(`${n1} %i ${n1}`, capturedLogs[3]);
    // When % are in even number it means that they are escaped so %d and %i are not transformed into %s.
    // See util.format docs for more info.
    assert.strictEqual(`${n1} %d %2 %%d %%${n3} %%%d`, capturedLogs[4]);
    assert.strictEqual(`${n1} %i %2 %%i %%${n3} %%%i`, capturedLogs[5]);
    assert.strictEqual(`${n1} %s %2 %%s %%${n3} %%%s`, capturedLogs[6]);
    assert.strictEqual("%s", capturedLogs[7]);
    assert.strictEqual("%%d", capturedLogs[8]);
    assert.strictEqual("%s", capturedLogs[9]);
    assert.strictEqual("%s %s %s %%d", capturedLogs[10]);
    assert.strictEqual(
      "1111111111111111114444444444444444444455555555555555555555",
      capturedLogs[11]
    );
    assert.strictEqual("1", capturedLogs[12]);
    assert.strictEqual("12", capturedLogs[13]);
    assert.strictEqual("13", capturedLogs[14]);

    assert.strictEqual(capturedLogs.length, 15);
  });
});
