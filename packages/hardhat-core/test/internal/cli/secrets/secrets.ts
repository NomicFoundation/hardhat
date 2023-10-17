import fs from "fs-extra";
import * as os from "os";
import sinon from "sinon";
import { assert, expect } from "chai";
import chalk from "chalk";
import { HardhatContext } from "../../../../src/internal/context";
import { SecretsManager } from "../../../../src/internal/core/secrets/secrets-manager";
import { handleSecrets } from "../../../../src/internal/cli/secrets";
import { useFixtureProject } from "../../../helpers/project";

describe("secrets", () => {
  const TMP_FILE_PATH = `${os.tmpdir()}/test-secrets.json`;
  let ctx: HardhatContext;
  let spyFunctionConsoleLog: any;
  let spyFunctionConsoleWarn: any;
  let stubUserPrompt: any;

  before(() => {
    ctx = HardhatContext.createHardhatContext();

    // Stub functions
    const sandbox = sinon.createSandbox();

    spyFunctionConsoleLog = sandbox.stub(console, "log");
    spyFunctionConsoleWarn = sandbox.stub(console, "warn");

    const enquirer = require("enquirer");
    stubUserPrompt = sandbox.stub(enquirer.prototype, "prompt");
  });

  beforeEach(() => {
    fs.removeSync(TMP_FILE_PATH);
    ctx.secretManager = new SecretsManager(TMP_FILE_PATH);

    ctx.secretManager.set("key1", "val1");
    ctx.secretManager.set("key2", "val2");
  });

  afterEach(() => {
    spyFunctionConsoleLog.reset();
    spyFunctionConsoleWarn.reset();
  });

  describe("handleSecrets", () => {
    describe("set", () => {
      it("should set a new value when both key and value are passed", async () => {
        const code = await handleSecrets([
          "secrets",
          "set",
          "newKey",
          "newVal",
        ]);

        expect(ctx.secretManager.get("newKey")).equals("newVal");
        assert(
          spyFunctionConsoleWarn.calledWith(
            `Secret stored at the following path: ${TMP_FILE_PATH}`
          )
        );
        expect(code).equals(0);
      });

      it("should set a new value when only the key is passed (user cli prompt expected)", async () => {
        // Mock the return value of the prompt
        stubUserPrompt.resolves({ secret: "secretFromCli" });

        const code = await handleSecrets(["secrets", "set", "newKey"]);

        expect(ctx.secretManager.get("newKey")).equals("secretFromCli");
        assert(
          spyFunctionConsoleWarn.calledWith(
            `Secret stored at the following path: ${TMP_FILE_PATH}`
          )
        );
        expect(code).equals(0);
      });

      it("should throw an error because the cli user prompt for the value is not valid", async () => {
        // Mock the return value of the prompt
        // Add spaces and tabs to be sure they are stripped during the value's check
        stubUserPrompt.resolves({ secret: "  " });

        await expect(
          handleSecrets(["secrets", "set", "newKey"])
        ).to.be.rejectedWith(
          "HH1204: Invalid value. The value cannot be an empty string"
        );

        expect(ctx.secretManager.get("newKey")).equals(undefined);
      });

      it("should throw an error when the key is not valid", async () => {
        await expect(
          handleSecrets(["secrets", "set", "0invalidKey", "newVal"])
        ).to.be.rejectedWith(
          "HH1203: Invalid key '0invalidKey'. Keys can only have alphanumeric characters and underscores, and they cannot start with a number."
        );

        expect(ctx.secretManager.get("0invalidKey")).equals(undefined);
      });
    });

    describe("get", () => {
      it("should get the value associated to the key", async () => {
        const code = await handleSecrets(["secrets", "get", "key1"]);

        assert(spyFunctionConsoleLog.calledWith("val1"));
        expect(code).equals(0);
      });

      it("should not get any value because the key is not defined", async () => {
        const code = await handleSecrets(["secrets", "get", "nonExistingKey"]);

        assert(
          spyFunctionConsoleWarn.calledWith(
            chalk.yellow(
              `There is no secret associated to the key 'nonExistingKey'`
            )
          )
        );
        expect(code).equals(1);
      });
    });

    describe("list", () => {
      it("should list all the keys", async () => {
        const code = await handleSecrets(["secrets", "list"]);

        expect(spyFunctionConsoleLog.callCount).to.equal(2);
        assert(spyFunctionConsoleLog.firstCall.calledWith("key1"));
        assert(spyFunctionConsoleLog.secondCall.calledWith("key2"));
        assert(
          spyFunctionConsoleWarn.calledWith(
            `\nThe secrets are stored at the following path: ${TMP_FILE_PATH}`
          )
        );
        expect(code).equals(0);
      });

      it("should not list any key because they are not defined", async () => {
        ctx.secretManager.delete("key1");
        ctx.secretManager.delete("key2");

        const code = await handleSecrets(["secrets", "list"]);

        assert(
          spyFunctionConsoleWarn.calledWith(
            chalk.yellow(`There are no secrets in the secret manager`)
          )
        );
        expect(code).equals(0);
      });
    });

    describe("delete", () => {
      it("should successfully delete a key and its value", async () => {
        const code = await handleSecrets(["secrets", "delete", "key1"]);

        assert(ctx.secretManager.get("key1") === undefined);
        assert(
          spyFunctionConsoleWarn.calledWith(
            `The secret was deleted at the following path: ${TMP_FILE_PATH}`
          )
        );
        expect(code).equals(0);
      });

      it("should show a warning because the key to delete cannot be found", async () => {
        const code = await handleSecrets([
          "secrets",
          "delete",
          "nonExistingKey",
        ]);
        assert(
          spyFunctionConsoleWarn.calledWith(
            chalk.yellow(
              `There is no secret associated to the key 'nonExistingKey'`
            )
          )
        );
        expect(code).equals(1);
      });
    });

    describe("path", () => {
      it("should show the path where the key-value pairs are stored", async () => {
        const code = await handleSecrets(["secrets", "path"]);

        assert(spyFunctionConsoleLog.calledWith(TMP_FILE_PATH));
        expect(code).equals(0);
      });
    });

    describe("setup", () => {
      describe("all key-value pairs are set", () => {
        useFixtureProject("secrets/secrets-setup-filled");

        it("should say that alle the key-value pairs are set", async () => {
          const code = await handleSecrets(["secrets", "setup"]);

          assert(
            spyFunctionConsoleLog.calledWith(
              chalk.green("There are no secrets to setup")
            )
          );
          expect(code).equals(0);
        });
      });

      describe("there are key-value pairs to fill", () => {
        useFixtureProject("secrets/secrets-setup-to-fill");

        it("should show the key-value pairs that need to be filled", async () => {
          const code = await handleSecrets(["secrets", "setup"]);

          // required keys
          assert(
            spyFunctionConsoleLog.firstCall.calledWith(
              chalk.red(
                "The following required secrets are needed:\nnpx hardhat secrets set REQUIRED_KEY1\nnpx hardhat secrets set REQUIRED_KEY2\nnpx hardhat secrets set KEY3"
              )
            )
          );
          assert(spyFunctionConsoleLog.secondCall.calledWith("\n"));

          // optional keys
          assert(
            spyFunctionConsoleLog.thirdCall.calledWith(
              chalk.yellow(
                "The following optional secrets can be provided:\nnpx hardhat secrets set OPTIONAL_KEY_1\nnpx hardhat secrets set OPTIONAL_KEY_2"
              )
            )
          );

          expect(code).equals(0);
        });
      });

      describe("simulate setup errors when loading hardhat.config.ts", () => {
        describe("the error should be ignored", () => {
          useFixtureProject("secrets/secrets-setup-error-to-ignore");

          it("should ignore the error", async () => {
            await handleSecrets(["secrets", "setup"]);
          });
        });

        describe("the error should stop the execution", () => {
          useFixtureProject("secrets/secrets-setup-error-to-throw");

          it("should throw the error", async () => {
            await expect(
              handleSecrets(["secrets", "setup"])
            ).to.be.rejectedWith(
              "Simulate error to throw during secrets setup"
            );
          });
        });
      });
    });

    describe("default", () => {
      it("should throw an error if the action does not exist", async () => {
        await expect(
          handleSecrets(["secrets", "nonExistingAction"])
        ).to.be.rejectedWith(
          "HH315: Unrecognized task 'nonExistingAction' under scope 'secrets'"
        );
      });
    });
  });
});
