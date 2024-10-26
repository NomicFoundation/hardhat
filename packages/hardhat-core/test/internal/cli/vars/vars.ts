import type Sinon from "sinon";

import "mocha";
import fs from "fs-extra";
import * as os from "os";
import sinon, { SinonSandbox } from "sinon";
import { assert, expect } from "chai";
import picocolors from "picocolors";
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
    let spyConsoleLog: Sinon.SinonStub;
    let spyConsoleWarn: Sinon.SinonStub;
    let stubGetVarsFilePath: Sinon.SinonStub;

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
        expect(code).equals(0);

        if (process.stdout.isTTY) {
          assert(
            spyConsoleWarn.calledWith(
              `The configuration variable has been stored in ${TMP_FILE_PATH}`
            )
          );
        }
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
          expect(code).equals(0);

          if (process.stdout.isTTY) {
            assert(
              spyConsoleWarn.calledWith(
                `The configuration variable has been stored in ${TMP_FILE_PATH}`
              )
            );
          }
        });

        it("should throw an error because the cli user prompt for the value is not valid", async () => {
          stubUserPrompt.resolves({ value: "" });

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
            picocolors.yellow(
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

        expect(code).equals(0);

        if (process.stdout.isTTY) {
          assert(
            spyConsoleWarn.calledWith(
              `\nAll configuration variables are stored in ${TMP_FILE_PATH}`
            )
          );
        }
      });

      it("should not list any key because they are not defined", async () => {
        ctx.varsManager.delete("key1");
        ctx.varsManager.delete("key2");
        ctx.varsManager.delete("key3");
        ctx.varsManager.delete("key4");
        ctx.varsManager.delete("key5");

        const code = await handleVars(["vars", "list"], undefined);

        expect(code).equals(0);

        if (process.stdout.isTTY) {
          assert(
            spyConsoleWarn.calledWith(
              picocolors.yellow(
                `There are no configuration variables stored in ${TMP_FILE_PATH}`
              )
            )
          );
        }
      });
    });

    describe("delete", () => {
      it("should successfully delete a key and its value", async () => {
        const code = await handleVars(["vars", "delete", "key1"], undefined);

        assert(ctx.varsManager.get("key1") === undefined);

        expect(code).equals(0);

        if (process.stdout.isTTY) {
          assert(
            spyConsoleWarn.calledWith(
              `The configuration variable was deleted from ${TMP_FILE_PATH}`
            )
          );
        }
      });

      it("should show a warning because the key to delete cannot be found", async () => {
        const code = await handleVars(
          ["vars", "delete", "nonExistingKey"],
          undefined
        );
        assert(
          spyConsoleWarn.calledWith(
            picocolors.yellow(
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

          const consoleLogCalls = spyConsoleLog.getCalls();

          assert.include(
            consoleLogCalls[0].args[0],
            "There are no configuration variables that need to be set for this project"
          );
          assert.include(
            consoleLogCalls[2].args[0],
            "Configuration variables already set:"
          );
          assert.include(consoleLogCalls[4].args[0], "Mandatory:");
          assert.include(consoleLogCalls[5].args[0], "key1");

          assert.include(consoleLogCalls[7].args[0], "Optional:");
          assert.include(consoleLogCalls[8].args[0], "key2");

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

          const consoleLogCalls = spyConsoleLog.getCalls();

          assert.include(
            consoleLogCalls[0].args[0],
            "The following configuration variables need to be set:"
          );

          assert.include(
            consoleLogCalls[1].args[0],
            "npx hardhat vars set nonExistingKey3\n  npx hardhat vars set nonExistingKey5\n  npx hardhat vars set KEY_ENV_1"
          );

          // optional keys
          assert.include(
            consoleLogCalls[3].args[0],
            "The following configuration variables are optional:"
          );
          assert.include(
            consoleLogCalls[4].args[0],
            "npx hardhat vars set nonExistingKey1\n  npx hardhat vars set nonExistingKey4\n  npx hardhat vars set KEY_ENV_2\n  npx hardhat vars set nonExistingKey2"
          );

          // show already set variables
          assert.include(
            consoleLogCalls[6].args[0],
            "Configuration variables already set:"
          );

          // mandatory variables
          assert.include(consoleLogCalls[8].args[0], "Mandatory:");
          assert.include(consoleLogCalls[9].args[0], "key3\n    key5");

          // optional variables
          assert.include(consoleLogCalls[11].args[0], "Optional:");
          assert.include(
            consoleLogCalls[12].args[0],
            "key1\n    key4\n    key2"
          );

          // env variables
          assert.include(
            consoleLogCalls[14].args[0],
            "Set via environment variables:"
          );
          assert.include(
            consoleLogCalls[15].args[0],
            `${ENV_VAR_PREFIX}${KEY1}\n    ${ENV_VAR_PREFIX}${KEY2}`
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
                picocolors.red(
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
