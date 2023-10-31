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

describe("vars", () => {
  describe("handleVars", () => {
    const TMP_FILE_PATH = `${os.tmpdir()}/test-vars.json`;
    let ctx: HardhatContext;
    let sandbox: SinonSandbox;
    let spyConsoleLog: any;
    let spyConsoleWarn: any;
    let stubGetVarsFilePath: any;

    before(() => {
      // Stub functions
      sandbox = sinon.createSandbox();

      spyConsoleLog = sandbox.stub(console, "log");
      spyConsoleWarn = sandbox.stub(console, "warn");

      stubGetVarsFilePath = sandbox.stub(globalDir, "getVarsFilePath");
      stubGetVarsFilePath.returns(TMP_FILE_PATH);
    });

    after(() => {
      spyConsoleLog.restore();
      spyConsoleWarn.restore();
      stubGetVarsFilePath.restore();
    });

    afterEach(() => {
      spyConsoleLog.reset();
      spyConsoleWarn.reset();
    });

    beforeEach(() => {
      fs.removeSync(TMP_FILE_PATH);

      ctx = HardhatContext.createHardhatContext();

      ctx.varsManager.set("key1", "val1");
      ctx.varsManager.set("key2", "val2");
      ctx.varsManager.set("key3", "val3");
      ctx.varsManager.set("key4", "val4");
      ctx.varsManager.set("key5", "val5");
    });

    afterEach(() => {
      resetHardhatContext();
    });

    describe("set", () => {
      it("should set a new value when both key and value are passed", async () => {
        const code = await handleVars(
          ["vars", "set", "newKey", "newVal"],
          undefined
        );

        expect(ctx.varsManager.get("newKey")).equals("newVal");
        assert(
          spyConsoleWarn.calledWith(
            `The configuration variable has been stored in ${TMP_FILE_PATH}`
          )
        );
        expect(code).equals(0);
      });

      describe("cli user prompt", () => {
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

          const code = await handleVars(["vars", "set", "newKey"], undefined);

          expect(ctx.varsManager.get("newKey")).equals("valueFromCli");
          assert(
            spyConsoleWarn.calledWith(
              `The configuration variable has been stored in ${TMP_FILE_PATH}`
            )
          );
          expect(code).equals(0);
        });

        it("should throw an error because the cli user prompt for the value is not valid", async () => {
          // Add spaces and tabs to be sure they are stripped during the value's check
          stubUserPrompt.resolves({ value: "  " });

          await expect(
            handleVars(["vars", "set", "newKey"], undefined)
          ).to.be.rejectedWith(
            "HH1203: A configuration variable cannot have an empty value."
          );
          expect(ctx.varsManager.get("newKey")).equals(undefined);
        });
      });

      it("should throw an error when the key is not valid", async () => {
        await expect(
          handleVars(["vars", "set", "0invalidKey", "newVal"], undefined)
        ).to.be.rejectedWith(
          "HH1202: Invalid name for a configuration variable: '0invalidKey'. Configuration variables can only have alphanumeric characters and underscores, and they cannot start with a number."
        );
        expect(ctx.varsManager.get("0invalidKey")).equals(undefined);
      });
    });

    describe("get", () => {
      it("should get the value associated to the key", async () => {
        const code = await handleVars(["vars", "get", "key1"], undefined);

        assert(spyConsoleLog.calledWith("val1"));
        expect(code).equals(0);
      });

      it("should not get any value because the key is not defined", async () => {
        const code = await handleVars(
          ["vars", "get", "nonExistingKey"],
          undefined
        );

        assert(
          spyConsoleWarn.calledWith(
            chalk.yellow(
              `The configuration variable 'nonExistingKey' is not set in ${TMP_FILE_PATH}`
            )
          )
        );
        expect(code).equals(1);
      });
    });

    describe("list", () => {
      it("should list all the keys", async () => {
        const code = await handleVars(["vars", "list"], undefined);

        expect(spyConsoleLog.callCount).to.equal(5);
        assert(spyConsoleLog.getCall(0).calledWith("key1"));
        assert(spyConsoleLog.getCall(1).calledWith("key2"));
        assert(spyConsoleLog.getCall(2).calledWith("key3"));
        assert(spyConsoleLog.getCall(3).calledWith("key4"));
        assert(spyConsoleLog.getCall(4).calledWith("key5"));
        assert(
          spyConsoleWarn.calledWith(
            `\nAll configuration variables are stored in ${TMP_FILE_PATH}`
          )
        );
        expect(code).equals(0);
      });

      it("should not list any key because they are not defined", async () => {
        ctx.varsManager.delete("key1");
        ctx.varsManager.delete("key2");
        ctx.varsManager.delete("key3");
        ctx.varsManager.delete("key4");
        ctx.varsManager.delete("key5");

        const code = await handleVars(["vars", "list"], undefined);

        assert(
          spyConsoleWarn.calledWith(
            chalk.yellow(
              `There are no configuration variables stored in ${TMP_FILE_PATH}`
            )
          )
        );
        expect(code).equals(0);
      });
    });

    describe("delete", () => {
      it("should successfully delete a key and its value", async () => {
        const code = await handleVars(["vars", "delete", "key1"], undefined);
        assert(ctx.varsManager.get("key1") === undefined);
        assert(
          spyConsoleWarn.calledWith(
            `The configuration variable was deleted from ${TMP_FILE_PATH}`
          )
        );
        expect(code).equals(0);
      });

      it("should show a warning because the key to delete cannot be found", async () => {
        const code = await handleVars(
          ["vars", "delete", "nonExistingKey"],
          undefined
        );
        assert(
          spyConsoleWarn.calledWith(
            chalk.yellow(
              `There is no configuration variable 'nonExistingKey' to delete from ${TMP_FILE_PATH}`
            )
          )
        );
        expect(code).equals(1);
      });
    });

    describe("path", () => {
      it("should show the path where the key-value pairs are stored", async () => {
        const code = await handleVars(["vars", "path"], undefined);
        assert(spyConsoleLog.calledWith(TMP_FILE_PATH));
        expect(code).equals(0);
      });
    });

    describe("parsing errors", () => {
      it("should throw an error if the command is not 'vars'", async () => {
        await expect(
          handleVars(["nonExisting", "list"], undefined)
        ).to.be.rejectedWith("HH303: Unrecognized task 'nonExisting'");
      });

      it("should throw an error if the vars action does not exist", async () => {
        await expect(
          handleVars(["vars", "nonExistingAction"], undefined)
        ).to.be.rejectedWith(
          "HH315: Unrecognized task 'nonExistingAction' under scope 'vars'"
        );
      });
    });

    describe("setup", () => {
      describe("all key-value pairs are set", () => {
        useFixtureProject("vars/setup-filled");

        it("should say that alle the key-value pairs are set", async () => {
          const code = await handleVars(["vars", "setup"], undefined);

          assert(
            spyConsoleLog
              .getCall(0)
              .calledWith(chalk.green("There are no key-value pairs to setup"))
          );

          assert(
            spyConsoleLog
              .getCall(1)
              .calledWith(`\n${chalk.green("<already set variables>")}`)
          );

          assert(spyConsoleLog.getCall(2).calledWith("<mandatory>"));
          assert(spyConsoleLog.getCall(3).calledWith("key1"));
          assert(spyConsoleLog.getCall(4).calledWith("<optional>"));
          assert(spyConsoleLog.getCall(5).calledWith("key2"));

          expect(code).equals(0);
        });
      });

      describe("there are key-value pairs to fill", () => {
        const ENV_VAR_PREFIX = "HARDHAT_VAR_";
        const KEY1 = "KEY_ENV_1";
        const KEY2 = "KEY_ENV_2";

        beforeEach(() => {
          process.env[`${ENV_VAR_PREFIX}${KEY1}`] = "val1";
          process.env[`${ENV_VAR_PREFIX}${KEY2}`] = "val2";
        });

        afterEach(() => {
          delete process.env[`${ENV_VAR_PREFIX}${KEY1}`];
          delete process.env[`${ENV_VAR_PREFIX}${KEY2}`];
        });

        useFixtureProject("vars/setup-to-fill");

        it("should show the configuration variables that need to be filled, including env variables", async () => {
          const code = await handleVars(["vars", "setup"], undefined);

          assert(
            spyConsoleLog
              .getCall(0)
              .calledWith("The following key-value pairs need to be setup:")
          );

          // required keys
          assert(
            spyConsoleLog
              .getCall(1)
              .calledWith(chalk.red("<mandatory variables>"))
          );

          assert(
            spyConsoleLog
              .getCall(2)
              .calledWith(
                chalk.red(
                  "npx hardhat vars set nonExistingKey3\nnpx hardhat vars set nonExistingKey5\nnpx hardhat vars set KEY_ENV_1"
                )
              )
          );

          // optional keys
          assert(
            spyConsoleLog
              .getCall(3)
              .calledWith(chalk.yellow("<optional variables>"))
          );

          assert(
            spyConsoleLog
              .getCall(4)
              .calledWith(
                chalk.yellow(
                  "npx hardhat vars set nonExistingKey1\nnpx hardhat vars set nonExistingKey4\nnpx hardhat vars set KEY_ENV_2\nnpx hardhat vars set nonExistingKey2"
                )
              )
          );

          // show already set variables
          assert(
            spyConsoleLog
              .getCall(5)
              .calledWith(`\n${chalk.green("<already set variables>")}`)
          );

          // mandatory variables
          assert(spyConsoleLog.getCall(6).calledWith("<mandatory>"));
          assert(spyConsoleLog.getCall(7).calledWith("key3\nkey5"));

          // optional variables
          assert(spyConsoleLog.getCall(8).calledWith("<optional>"));
          assert(spyConsoleLog.getCall(9).calledWith("key1\nkey4\nkey2"));

          // env variables
          assert(
            spyConsoleLog
              .getCall(10)
              .calledWith("<environment variables with values>")
          );

          assert(
            spyConsoleLog
              .getCall(11)
              .calledWith(`${ENV_VAR_PREFIX}${KEY1}\n${ENV_VAR_PREFIX}${KEY2}`)
          );

          expect(code).equals(0);
        });
      });

      describe("simulate setup errors when loading hardhat.config.ts", () => {
        describe("the error should stop the execution", () => {
          useFixtureProject("vars/setup-error-to-throw");

          it("should throw the error", async () => {
            const spyConsoleError = sandbox.stub(console, "error");

            await expect(
              handleVars(["vars", "setup"], undefined)
            ).to.be.rejectedWith("Simulate error to throw during vars setup");

            assert(
              spyConsoleError.calledWith(
                chalk.red(
                  "There is an error in your Hardhat configuration file. Please double check it.\n"
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
