import { assert } from "chai";
import { unlink, writeFile, writeJson } from "fs-extra";
import sinon from "sinon";

import { useEnvironment } from "./helpers";

export async function expectErrorAsync(
  f: () => Promise<any>,
  errorMessage?: string
) {
  try {
    await f();
  } catch (err: any) {
    assert.equal(err.message, errorMessage);
  }
}

describe("Solhint plugin", function () {
  const SOLHINT_CONFIG_FILENAME = ".solhint.json";

  describe("Project with solhint config", function () {
    useEnvironment("hardhat-project");

    it("should define solhint task", function () {
      assert.isDefined(this.env.tasks["hardhat-solhint:run-solhint"]);
      assert.isDefined(this.env.tasks.check);
    });

    it("return a report", async function () {
      const reports = await this.env.run("hardhat-solhint:run-solhint");
      assert.equal(reports.length, 1);
      assert.isTrue(
        // This test is a little sloppy, but the actual number doesn't matter
        // and it was failing very often when solhint released new versions
        reports[0].reports.length >= 5
      );
    });

    it("should run the check task without throwing an error", async function () {
      const consoleLogStub = sinon.stub(console, "log");
      await this.env.run("check");
      assert.isTrue(consoleLogStub.calledOnce);
      consoleLogStub.restore();
    });
  });

  describe("Project with .solhintignore file", function () {
    useEnvironment("solhintignore-project");

    it("should not return a report for the ignored files", async function () {
      const reports = await this.env.run("hardhat-solhint:run-solhint");
      // Greeter.sol is not ignored, Solhint should return a report
      assert.isTrue(
        reports.some((report: any) =>
          report.file.includes("contracts/Greeter.sol")
        )
      );
      // Greeter2.sol is ignored in the .solhintignore file, Solhint should not return a report
      assert.isFalse(
        reports.some((report: any) =>
          report.file.includes("contracts/Greeter2.sol")
        )
      );
      // Greeter3.sol is ignored in the .solhint.json file, Solhint should not return a report
      assert.isFalse(
        reports.some((report: any) =>
          report.file.includes("contracts/Greeter2.sol")
        )
      );
    });
  });

  describe("Project with no solhint config", function () {
    useEnvironment("no-config-project");

    it("return a report", async function () {
      const reports = await this.env.run("hardhat-solhint:run-solhint");
      assert.equal(reports.length, 1);
      assert.equal(reports[0].reports[0].ruleId, "max-line-length");
    });
  });

  describe("Project with invalid solhint configs", function () {
    useEnvironment("invalid-config-project");

    it("should throw when using invalid extensions", async function () {
      const invalidExtensionConfig = {
        extends: "invalid",
      };
      await writeJson(SOLHINT_CONFIG_FILENAME, invalidExtensionConfig);

      await expectErrorAsync(
        () => this.env.run("hardhat-solhint:run-solhint"),
        "An error occurred when processing your solhint config."
      );
    });

    it("should throw when using invalid rules", async function () {
      const invalidRuleConfig = {
        rules: {
          "invalid-rule": false,
        },
      };
      await writeJson(SOLHINT_CONFIG_FILENAME, invalidRuleConfig);

      await expectErrorAsync(
        () => this.env.run("hardhat-solhint:run-solhint"),
        "An error occurred when processing your solhint config."
      );
    });

    it("should throw when using a non parsable config", async function () {
      const invalidConfig = "asd";
      await writeFile(SOLHINT_CONFIG_FILENAME, invalidConfig);
      await expectErrorAsync(
        () => this.env.run("hardhat-solhint:run-solhint"),
        "An error occurred when loading your solhint config."
      );
    });

    after(async () => {
      await unlink(SOLHINT_CONFIG_FILENAME);
    });
  });
});
