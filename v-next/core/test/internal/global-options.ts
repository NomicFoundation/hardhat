import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { HardhatError } from "@nomicfoundation/hardhat-errors";

import { ParameterType } from "../../src/config.js";
import {
  buildGlobalOptionsMap,
  buildGlobalOptionDefinition,
} from "../../src/internal/global-options.js";
import { RESERVED_PARAMETER_NAMES } from "../../src/internal/parameters.js";

describe("Global Options", () => {
  describe("buildGlobalOptionsMap", () => {
    it("should build an empty map of global options if no plugins are provided", () => {
      const globalOptionsMap = buildGlobalOptionsMap([]);

      assert.deepEqual(globalOptionsMap, new Map());
    });

    it("should build an empty map of global options if there are no global options defined by plugins", () => {
      const globalOptionsMap = buildGlobalOptionsMap([
        {
          id: "plugin1",
        },
      ]);

      assert.deepEqual(globalOptionsMap, new Map());
    });

    it("should build a map of global options", () => {
      const globalOptionDefinition = {
        name: "param1",
        description: "param1 description",
        parameterType: ParameterType.BOOLEAN,
        defaultValue: true,
      };
      const globalOptionsMap = buildGlobalOptionsMap([
        {
          id: "plugin1",
          globalOptions: [globalOptionDefinition],
        },
      ]);

      assert.ok(
        globalOptionsMap.has("param1"),
        "Expected 'param1' to be defined in the global options map",
      );
      assert.deepEqual(
        globalOptionsMap.get("param1")?.option,
        globalOptionDefinition,
      );
      assert.deepEqual(globalOptionsMap.get("param1")?.pluginId, "plugin1");
    });

    it("should throw if a global option is already defined by another plugin", () => {
      const globalOptionDefinition = {
        name: "param1",
        description: "param1 description",
        parameterType: ParameterType.BOOLEAN,
        defaultValue: true,
      };
      const globalOptionDefinition2 = {
        name: "param1",
        description: "param1 description 2",
        parameterType: ParameterType.BOOLEAN,
        defaultValue: false,
      };

      assert.throws(
        () =>
          buildGlobalOptionsMap([
            {
              id: "plugin1",
              globalOptions: [globalOptionDefinition],
            },
            {
              id: "plugin2",
              globalOptions: [globalOptionDefinition2],
            },
          ]),
        new HardhatError(
          HardhatError.ERRORS.GENERAL.GLOBAL_OPTION_ALREADY_DEFINED,
          {
            plugin: "plugin2",
            globalOption: "param1",
            definedByPlugin: "plugin1",
          },
        ),
      );
    });

    it("should throw if an option name is not valid", () => {
      assert.throws(
        () =>
          buildGlobalOptionsMap([
            {
              id: "plugin1",
              globalOptions: [
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

    it("should throw if an option name is reserved", () => {
      RESERVED_PARAMETER_NAMES.forEach((name) => {
        assert.throws(
          () =>
            buildGlobalOptionsMap([
              {
                id: "plugin1",
                globalOptions: [
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

    it("should throw if an options default value does not match the type", () => {
      assert.throws(
        () =>
          buildGlobalOptionsMap([
            {
              id: "plugin1",
              globalOptions: [
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

  describe("buildGlobalOptionDefinition", () => {
    it("should build a global option definition", () => {
      const options = {
        name: "foo",
        description: "Foo description",
        parameterType: ParameterType.BOOLEAN,
        defaultValue: true,
      };
      const globalOption = buildGlobalOptionDefinition(options);

      assert.deepEqual(globalOption, options);
    });

    it("should build a global option definition with a default type of STRING", () => {
      const options = {
        name: "foo",
        description: "Foo description",
        defaultValue: "bar",
      };
      const globalOption = buildGlobalOptionDefinition(options);

      assert.deepEqual(globalOption, {
        ...options,
        parameterType: ParameterType.STRING,
      });
    });

    it("should throw if the option name is not valid", () => {
      assert.throws(
        () =>
          buildGlobalOptionDefinition({
            name: "foo bar",
            description: "Foo description",
            defaultValue: "bar",
          }),
        new HardhatError(HardhatError.ERRORS.ARGUMENTS.INVALID_NAME, {
          name: "foo bar",
        }),
      );
    });

    it("should throw if the option name is reserved", () => {
      RESERVED_PARAMETER_NAMES.forEach((name) => {
        assert.throws(
          () =>
            buildGlobalOptionDefinition({
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
          buildGlobalOptionDefinition({
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

  describe.todo("resolveGlobalOptions", () => {
    // TODO: Implement tests.
  });
});
