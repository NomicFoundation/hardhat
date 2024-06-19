import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { HardhatError } from "@nomicfoundation/hardhat-errors";

import { ParameterType } from "../../src/config.js";
import { buildGlobalParameterDefinition } from "../../src/internal/global-parameters.js";
import { RESERVED_PARAMETER_NAMES } from "../../src/internal/parameters.js";

describe("Global Parameters", () => {
  describe.todo("buildGlobalParameterMap", () => {
    // TODO: Implement tests.
  });

  describe("buildGlobalParameterDefinition", () => {
    it("should build a global parameter definition", () => {
      const options = {
        name: "foo",
        description: "Foo description",
        parameterType: ParameterType.BOOLEAN,
        defaultValue: true,
      };
      const globalParameter = buildGlobalParameterDefinition(options);

      assert.deepEqual(globalParameter, options);
    });

    it("should build a global parameter definition with a default type of STRING", () => {
      const options = {
        name: "foo",
        description: "Foo description",
        defaultValue: "bar",
      };
      const globalParameter = buildGlobalParameterDefinition(options);

      assert.deepEqual(globalParameter, {
        ...options,
        parameterType: ParameterType.STRING,
      });
    });

    it("should throw if the parameter name is not valid", () => {
      assert.throws(
        () =>
          buildGlobalParameterDefinition({
            name: "foo bar",
            description: "Foo description",
            defaultValue: "bar",
          }),
        new HardhatError(HardhatError.ERRORS.ARGUMENTS.INVALID_NAME, {
          name: "foo bar",
        }),
      );
    });

    it("should throw if the parameter name is reserved", () => {
      RESERVED_PARAMETER_NAMES.forEach((name) => {
        assert.throws(
          () =>
            buildGlobalParameterDefinition({
              name,
              description: "Foo description",
              defaultValue: "bar",
            }),
          new HardhatError(HardhatError.ERRORS.ARGUMENTS.RESERVED_NAME, {
            name,
          }),
        );
      });
    });

    it("should throw if the default value does not match the type", () => {
      assert.throws(
        () =>
          buildGlobalParameterDefinition({
            name: "foo",
            description: "Foo description",
            parameterType: ParameterType.BOOLEAN,
            /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions --
            Intentionally testing an invalid type */
            defaultValue: "bar" as any,
          }),
        new HardhatError(HardhatError.ERRORS.ARGUMENTS.INVALID_VALUE_FOR_TYPE, {
          value: "bar",
          name: "defaultValue",
          type: ParameterType.BOOLEAN,
        }),
      );
    });
  });

  describe.todo("resolveGlobalArguments", () => {
    // TODO: Implement tests.
  });
});
