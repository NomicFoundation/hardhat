import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { HardhatError } from "@nomicfoundation/hardhat-errors";

import { ParameterType } from "../../src/config.js";
import {
  buildGlobalParametersMap,
  buildGlobalParameterDefinition,
} from "../../src/internal/global-parameters.js";
import { RESERVED_PARAMETER_NAMES } from "../../src/internal/parameters.js";

describe("Global Parameters", () => {
  describe("buildGlobalParametersMap", () => {
    it("should build an empty map of global parameters if no plugins are provided", () => {
      const globalParametersMap = buildGlobalParametersMap([]);

      assert.deepEqual(globalParametersMap, new Map());
    });

    it("should build an empty map of global parameters if there are no global parameters defined by plugins", () => {
      const globalParametersMap = buildGlobalParametersMap([
        {
          id: "plugin1",
        },
      ]);

      assert.deepEqual(globalParametersMap, new Map());
    });

    it("should build a map of global parameters", () => {
      const globalParameterDefinition = {
        name: "param1",
        description: "param1 description",
        parameterType: ParameterType.BOOLEAN,
        defaultValue: true,
      };
      const globalParametersMap = buildGlobalParametersMap([
        {
          id: "plugin1",
          globalParameters: [globalParameterDefinition],
        },
      ]);

      assert.ok(
        globalParametersMap.has("param1"),
        "Expected 'param1' to be defined in the global parameters map",
      );
      assert.deepEqual(
        globalParametersMap.get("param1")?.param,
        globalParameterDefinition,
      );
      assert.deepEqual(globalParametersMap.get("param1")?.pluginId, "plugin1");
    });

    it("should throw if a global parameter is already defined by another plugin", () => {
      const globalParameterDefinition = {
        name: "param1",
        description: "param1 description",
        parameterType: ParameterType.BOOLEAN,
        defaultValue: true,
      };
      const globalParameterDefinition2 = {
        name: "param1",
        description: "param1 description 2",
        parameterType: ParameterType.BOOLEAN,
        defaultValue: false,
      };

      assert.throws(
        () =>
          buildGlobalParametersMap([
            {
              id: "plugin1",
              globalParameters: [globalParameterDefinition],
            },
            {
              id: "plugin2",
              globalParameters: [globalParameterDefinition2],
            },
          ]),
        new HardhatError(
          HardhatError.ERRORS.GENERAL.GLOBAL_PARAMETER_ALREADY_DEFINED,
          {
            plugin: "plugin2",
            globalParameter: "param1",
            definedByPlugin: "plugin1",
          },
        ),
      );
    });

    it("should throw if a parameter name is not valid", () => {
      assert.throws(
        () =>
          buildGlobalParametersMap([
            {
              id: "plugin1",
              globalParameters: [
                {
                  name: "foo bar",
                  description: "Foo description",
                  parameterType: ParameterType.STRING,
                  defaultValue: "bar",
                },
              ],
            },
          ]),
        new HardhatError(HardhatError.ERRORS.ARGUMENTS.INVALID_NAME, {
          name: "foo bar",
        }),
      );
    });

    it("should throw if a parameter name is reserved", () => {
      RESERVED_PARAMETER_NAMES.forEach((name) => {
        assert.throws(
          () =>
            buildGlobalParametersMap([
              {
                id: "plugin1",
                globalParameters: [
                  {
                    name,
                    description: "Foo description",
                    parameterType: ParameterType.STRING,
                    defaultValue: "bar",
                  },
                ],
              },
            ]),
          new HardhatError(HardhatError.ERRORS.ARGUMENTS.RESERVED_NAME, {
            name,
          }),
        );
      });
    });

    it("should throw if a parameter default value does not match the type", () => {
      assert.throws(
        () =>
          buildGlobalParametersMap([
            {
              id: "plugin1",
              globalParameters: [
                {
                  name: "foo",
                  description: "Foo description",
                  parameterType: ParameterType.BOOLEAN,
                  /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions --
                  Intentionally testing an invalid type */
                  defaultValue: "bar" as any,
                },
              ],
            },
          ]),
        new HardhatError(HardhatError.ERRORS.ARGUMENTS.INVALID_VALUE_FOR_TYPE, {
          value: "bar",
          name: "defaultValue",
          type: ParameterType.BOOLEAN,
        }),
      );
    });
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
