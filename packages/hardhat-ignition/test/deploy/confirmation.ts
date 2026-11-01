import type { UserInterruptionHooks } from "hardhat/types/hooks";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import {
  assertRejectsWithHardhatError,
  createEnvChanges,
} from "@nomicfoundation/hardhat-test-utils";
import { assert } from "chai";

import { useEphemeralIgnitionProject } from "../test-helpers/use-ignition-project.js";

const DEPLOY_QUESTION = "Confirm deploy to network default (1337)?";

describe("deploy confirmation", function () {
  this.timeout(60000);

  // The fixture's default network uses the chain id 1337, so deploying to it
  // asks for confirmation
  useEphemeralIgnitionProject("default-with-new-chain-id");

  // NOTE: This package runs its tests with mocha, so it uses `createEnvChanges`
  // and restores from mocha's own hook, instead of `createTestEnvManager`, which
  // registers a `node:test` one.
  const envChanges = createEnvChanges();

  let questions: Array<{ interruptor: string; inputDescription: string }>;

  beforeEach(function () {
    envChanges.unsetEnvVar("HARDHAT_IGNITION_CONFIRM_DEPLOYMENT");
    envChanges.unsetEnvVar("HARDHAT_IGNITION_CONFIRM_RESET");
    questions = [];
  });

  afterEach(function () {
    envChanges.restoreEnvVars();
    process.exitCode = undefined;
  });

  function answerWith(this: Mocha.Context, answer: () => string): void {
    const handlers: Partial<UserInterruptionHooks> = {
      requestInput: async (_context, interruptor, inputDescription) => {
        questions.push({ interruptor, inputDescription });
        return answer();
      },
    };

    this.hre.hooks.registerHandlers("userInterruptions", handlers);
  }

  async function deploy(this: Mocha.Context) {
    return await this.hre.tasks.getTask(["ignition", "deploy"]).run({
      modulePath: "./ignition/modules/LockModule.js",
    });
  }

  it("should deploy when the confirmation is answered with yes", async function () {
    answerWith.call(this, () => "y");

    const result = await deploy.call(this);

    assert.isNotNull(result);
    assert.deepEqual(questions, [
      {
        interruptor: "hardhat-ignition",
        inputDescription: `${DEPLOY_QUESTION} (y/N)`,
      },
    ]);
  });

  it("should cancel the deployment when the confirmation is answered with no", async function () {
    answerWith.call(this, () => "n");

    const result = await deploy.call(this);

    assert.isNull(result);
    assert.equal(process.exitCode, 1);
  });

  it("should cancel the deployment when the confirmation gets an empty answer", async function () {
    answerWith.call(this, () => "");

    const result = await deploy.call(this);

    assert.isNull(result);
    assert.equal(process.exitCode, 1);
  });

  it("should fail with an error naming the env var when the confirmation is closed without an answer", async function () {
    answerWith.call(this, () => {
      throw new HardhatError(
        HardhatError.ERRORS.CORE.GENERAL.PROMPT_CLOSED_BEFORE_ANSWER,
        { interruptor: "hardhat-ignition" },
      );
    });

    await assertRejectsWithHardhatError(
      deploy.call(this),
      HardhatError.ERRORS.IGNITION.DEPLOY.CONFIRMATION_NOT_ANSWERED,
      {
        question: DEPLOY_QUESTION,
        envVarName: "HARDHAT_IGNITION_CONFIRM_DEPLOYMENT",
      },
    );
  });

  it("should not ask for confirmation when HARDHAT_IGNITION_CONFIRM_DEPLOYMENT is set", async function () {
    envChanges.setEnvVar("HARDHAT_IGNITION_CONFIRM_DEPLOYMENT", "true");
    answerWith.call(this, () => "n");

    const result = await deploy.call(this);

    assert.isNotNull(result);
    assert.deepEqual(questions, []);
  });
});
