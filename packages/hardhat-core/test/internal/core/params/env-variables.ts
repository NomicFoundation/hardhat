import { assert } from "chai";

import { ERRORS } from "../../../../src/internal/core/errors-list";
import {
  getEnvHardhatArguments,
  getEnvVariablesMap,
  paramNameToEnvVariable,
} from "../../../../src/internal/core/params/env-variables";
import { HARDHAT_PARAM_DEFINITIONS } from "../../../../src/internal/core/params/hardhat-params";
import { expectHardhatError } from "../../../helpers/errors";

// This is testing an internal function, which may seem weird, but its behaviour
// is 100% user facing.
describe("paramNameToEnvVariable", () => {
  it("should convert camelCase to UPPER_CASE and prepend HARDHAT_", () => {
    assert.strictEqual(paramNameToEnvVariable("a"), "HARDHAT_A");
    assert.strictEqual(paramNameToEnvVariable("B"), "HARDHAT_B");
    assert.strictEqual(paramNameToEnvVariable("AC"), "HARDHAT_A_C");
    assert.strictEqual(paramNameToEnvVariable("aC"), "HARDHAT_A_C");
    assert.strictEqual(
      paramNameToEnvVariable("camelCaseRight"),
      "HARDHAT_CAMEL_CASE_RIGHT"
    );
    assert.strictEqual(
      paramNameToEnvVariable("somethingAB"),
      "HARDHAT_SOMETHING_A_B"
    );
  });
});

describe("Env vars arguments parsing", () => {
  it("Should use the default values if arguments are not defined", () => {
    const args = getEnvHardhatArguments(HARDHAT_PARAM_DEFINITIONS, {
      IRRELEVANT_ENV_VAR: "123",
    });
    assert.strictEqual(args.help, HARDHAT_PARAM_DEFINITIONS.help.defaultValue);
    assert.strictEqual(args.network, HARDHAT_PARAM_DEFINITIONS.network.defaultValue);
    assert.strictEqual(args.emoji, HARDHAT_PARAM_DEFINITIONS.emoji.defaultValue);
    assert.strictEqual(
      args.showStackTraces,
      HARDHAT_PARAM_DEFINITIONS.showStackTraces.defaultValue
    );
    assert.strictEqual(args.version, HARDHAT_PARAM_DEFINITIONS.version.defaultValue);
  });

  it("Should accept values", () => {
    const args = getEnvHardhatArguments(HARDHAT_PARAM_DEFINITIONS, {
      IRRELEVANT_ENV_VAR: "123",
      HARDHAT_NETWORK: "asd",
      HARDHAT_SHOW_STACK_TRACES: "true",
      HARDHAT_EMOJI: "true",
      HARDHAT_VERSION: "true",
      HARDHAT_HELP: "true",
    });

    assert.strictEqual(args.network, "asd");

    // These are not really useful, but we test them anyway
    assert.strictEqual(args.showStackTraces, true);
    assert.strictEqual(args.emoji, true);
    assert.strictEqual(args.version, true);
    assert.strictEqual(args.help, true);
  });

  it("should throw if an invalid value is passed", () => {
    expectHardhatError(
      () =>
        getEnvHardhatArguments(HARDHAT_PARAM_DEFINITIONS, {
          HARDHAT_HELP: "123",
        }),
      ERRORS.ARGUMENTS.INVALID_ENV_VAR_VALUE
    );
  });
});

describe("getEnvVariablesMap", () => {
  it("Should return the right map", () => {
    assert.deepEqual(
      getEnvVariablesMap({
        network: "asd",
        emoji: false,
        help: true,
        showStackTraces: true,
        version: false,
        verbose: true,
        config: undefined, // config is optional
      }),
      {
        HARDHAT_NETWORK: "asd",
        HARDHAT_EMOJI: "false",
        HARDHAT_HELP: "true",
        HARDHAT_SHOW_STACK_TRACES: "true",
        HARDHAT_VERSION: "false",
        HARDHAT_VERBOSE: "true",
      }
    );
  });
});
