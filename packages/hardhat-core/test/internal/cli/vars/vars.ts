import "mocha";
import fs from "fs-extra";
import * as os from "os";
import sinon, { SinonSandbox } from "sinon";
import { assert, expect } from "chai";
import chalk from "chalk";
import enquirer from "enquirer";
import { HardhatContext } from "../../../../src/internal/context";
import { handleVars } from "../../../../src/internal/cli/vars";
import { resetHardhatContext } from "../../../../src/internal/reset";
import * as globalDir from "../../../../src/internal/util/global-dir";
import { useFixtureProject } from "../../../helpers/project";

describe("vars", function () {
  describe("handleVars", () => {
    const TMP_FILE_PATH = `${os.tmpdir()}/test-vars.json`;
    let ctx: HardhatContext;
    let sandbox: SinonSandbox;
    let spyConsoleLog: any;
    let spyConsoleWarn: any;
    let stubGetVarsFilePath: any;

    before(function () {
      // Stub functions
      sandbox = sinon.createSandbox();

      spyConsoleLog = sandbox.stub(console, "log");
      spyConsoleWarn = sandbox.stub(console, "warn");

      stubGetVarsFilePath = sandbox.stub(globalDir, "getVarsFilePath");
      stubGetVarsFilePath.returns(TMP_FILE_PATH);
    });

    after(function () {
      spyConsoleLog.restore();
      spyConsoleWarn.restore();
      stubGetVarsFilePath.restore();
    });

    afterEach(function () {
      spyConsoleLog.reset();
      spyConsoleWarn.reset();
    });

    beforeEach(function () {
      // Force the reload of the scopes otherwise they will only be loaded once and then the tests will fail
      delete require
        .cache[require.resolve("../../../../src/builtin-tasks/vars.ts")];

      fs.removeSync(TMP_FILE_PATH);

      ctx = HardhatContext.createHardhatContext();

      ctx.varsManager.set("key1", "val1");
      ctx.varsManager.set("key2", "val2");
    });

    afterEach(function () {
      resetHardhatContext();
    });

    describe("set", () => {
      it("should set a new value when both key and value are passed", async () => {
        const code = await handleVars(["vars", "set", "newKey", "newVal"]);

        expect(ctx.varsManager.get("newKey")).equals("newVal");
        assert(
          spyConsoleWarn.calledWith(
            `Key-value pair stored at the following path: ${TMP_FILE_PATH}`
          )
        );
        expect(code).equals(0);
      });

      describe("cli user prompt", function () {
        let stubUserPrompt: any;

        before(() => {
          stubUserPrompt = sandbox.stub(enquirer.prototype, "prompt");
        });

        after(() => {
          stubUserPrompt.restore();
        });

        afterEach(() => {
          stubUserPrompt.reset();
        });

        it("should set a new value when only the key is passed (user cli prompt expected)", async () => {
          stubUserPrompt.resolves({ value: "valueFromCli" });

          const code = await handleVars(["vars", "set", "newKey"]);

          expect(ctx.varsManager.get("newKey")).equals("valueFromCli");
          assert(
            spyConsoleWarn.calledWith(
              `Key-value pair stored at the following path: ${TMP_FILE_PATH}`
            )
          );
          expect(code).equals(0);
        });

        it("should throw an error because the cli user prompt for the value is not valid", async () => {
          // Add spaces and tabs to be sure they are stripped during the value's check
          stubUserPrompt.resolves({ value: "  " });

          await expect(
            handleVars(["vars", "set", "newKey"])
          ).to.be.rejectedWith(
            "HH1204: Invalid value. The value cannot be an empty string"
          );
          expect(ctx.varsManager.get("newKey")).equals(undefined);
        });
      });

      it("should throw an error when the key is not valid", async () => {
        await expect(
          handleVars(["vars", "set", "0invalidKey", "newVal"])
        ).to.be.rejectedWith(
          "HH1203: Invalid key '0invalidKey'. Keys can only have alphanumeric characters and underscores, and they cannot start with a number."
        );
        expect(ctx.varsManager.get("0invalidKey")).equals(undefined);
      });
    });

    describe("get", () => {
      it("should get the value associated to the key", async () => {
        const code = await handleVars(["vars", "get", "key1"]);

        assert(spyConsoleLog.calledWith("val1"));
        expect(code).equals(0);
      });

      it("should not get any value because the key is not defined", async () => {
        const code = await handleVars(["vars", "get", "nonExistingKey"]);

        assert(
          spyConsoleWarn.calledWith(
            chalk.yellow(
              `There is no value associated to the key 'nonExistingKey'`
            )
          )
        );
        expect(code).equals(1);
      });
    });

    describe("list", () => {
      it("should list all the keys", async () => {
        const code = await handleVars(["vars", "list"]);
        expect(spyConsoleLog.callCount).to.equal(2);
        assert(spyConsoleLog.firstCall.calledWith("key1"));
        assert(spyConsoleLog.secondCall.calledWith("key2"));
        assert(
          spyConsoleWarn.calledWith(
            `\nAll the key-value pairs are stored at the following path: ${TMP_FILE_PATH}`
          )
        );
        expect(code).equals(0);
      });

      it("should not list any key because they are not defined", async () => {
        ctx.varsManager.delete("key1");
        ctx.varsManager.delete("key2");
        const code = await handleVars(["vars", "list"]);
        assert(
          spyConsoleWarn.calledWith(
            chalk.yellow(`There are no key-value pairs stored`)
          )
        );
        expect(code).equals(0);
      });
    });

    describe("delete", () => {
      it("should successfully delete a key and its value", async () => {
        const code = await handleVars(["vars", "delete", "key1"]);
        assert(ctx.varsManager.get("key1") === undefined);
        assert(
          spyConsoleWarn.calledWith(
            `The key was deleted at the following path: ${TMP_FILE_PATH}`
          )
        );
        expect(code).equals(0);
      });

      it("should show a warning because the key to delete cannot be found", async () => {
        const code = await handleVars(["vars", "delete", "nonExistingKey"]);
        assert(
          spyConsoleWarn.calledWith(
            chalk.yellow(
              `There is no value associated to the key 'nonExistingKey'`
            )
          )
        );
        expect(code).equals(1);
      });
    });

    describe("path", () => {
      it("should show the path where the key-value pairs are stored", async () => {
        const code = await handleVars(["vars", "path"]);
        assert(spyConsoleLog.calledWith(TMP_FILE_PATH));
        expect(code).equals(0);
      });
    });

    describe("default", () => {
      it("should throw an error if the action does not exist", async () => {
        await expect(
          handleVars(["vars", "nonExistingAction"])
        ).to.be.rejectedWith(
          "HH315: Unrecognized task 'nonExistingAction' under scope 'vars'"
        );
      });
    });

    describe("setup", () => {
      describe("all key-value pairs are set", () => {
        useFixtureProject("vars/setup-filled");

        it("should say that alle the key-value pairs are set", async function () {
          const code = await handleVars(["vars", "setup"]);

          assert(
            spyConsoleLog.calledWith(
              chalk.green("There are no key-value pairs to setup")
            )
          );
          expect(code).equals(0);
        });
      });

      describe("there are key-value pairs to fill", () => {
        useFixtureProject("vars/setup-to-fill");

        it("should show the key-value pairs that need to be filled", async () => {
          const code = await handleVars(["vars", "setup"]);

          // required keys
          assert(
            spyConsoleLog.firstCall.calledWith(
              chalk.red(
                "The following required vars are needed:\nnpx hardhat vars set REQUIRED_KEY1\nnpx hardhat vars set REQUIRED_KEY2\nnpx hardhat vars set KEY3"
              )
            )
          );
          assert(spyConsoleLog.secondCall.calledWith("\n"));

          // optional keys
          assert(
            spyConsoleLog.thirdCall.calledWith(
              chalk.yellow(
                "The following optional vars can be provided:\nnpx hardhat vars set OPTIONAL_KEY_1\nnpx hardhat vars set OPTIONAL_KEY_2"
              )
            )
          );
          expect(code).equals(0);
        });
      });

      describe("simulate setup errors when loading hardhat.config.ts", () => {
        describe("the error should be ignored", () => {
          useFixtureProject("vars/setup-error-to-ignore");

          it("should ignore the error", async () => {
            await handleVars(["vars", "setup"]);
          });
        });

        describe("the error should stop the execution", () => {
          useFixtureProject("vars/setup-error-to-throw");

          it("should throw the error", async () => {
            const spyConsoleError = sandbox.stub(console, "error");

            await expect(handleVars(["vars", "setup"])).to.be.rejectedWith(
              "Simulate error to throw during vars setup"
            );

            assert(
              spyConsoleError.calledWith(
                chalk.red(
                  `There is an error in your '${chalk.italic(
                    "hardhat.config.ts"
                  )}' file. Please double check it.\n`
                )
              )
            );

            spyConsoleError.restore();
          });
        });
      });
    });
  });
});
