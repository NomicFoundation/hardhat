import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";

import { HardhatError } from "@ignored/hardhat-vnext-errors";

import { globalOption, ArgumentType } from "../../src/config.js";
import { RESERVED_ARGUMENT_NAMES } from "../../src/internal/arguments.js";
import {
  buildGlobalOptionDefinitions,
  buildGlobalOptionDefinition,
  resolveGlobalOptions,
} from "../../src/internal/global-options.js";
import { createTestEnvManager } from "../utils.js";

describe("Global Options", () => {
  before(() => {
    // Make sure we have some reserved names
    RESERVED_ARGUMENT_NAMES.add("testName1");
    RESERVED_ARGUMENT_NAMES.add("testName2");
    RESERVED_ARGUMENT_NAMES.add("testName3");
  });

  after(() => {
    // Delete the test reserved names
    RESERVED_ARGUMENT_NAMES.delete("testName1");
    RESERVED_ARGUMENT_NAMES.delete("testName2");
    RESERVED_ARGUMENT_NAMES.delete("testName3");
  });

  describe("buildGlobalOptionDefinitions", () => {
    it("should build an empty map of global options if no plugins are provided", () => {
      const globalOptionDefinitions = buildGlobalOptionDefinitions([]);

      assert.deepEqual(globalOptionDefinitions, new Map());
    });

    it("should build an empty map of global options if there are no global options defined by plugins", () => {
      const globalOptionDefinitions = buildGlobalOptionDefinitions([
        {
          id: "plugin1",
        },
      ]);

      assert.deepEqual(globalOptionDefinitions, new Map());
    });

    it("should build a map of global options", () => {
      const globalOptionDefinition = globalOption({
        name: "param1",
        description: "param1 description",
        type: ArgumentType.BOOLEAN,
        defaultValue: true,
      });
      const globalOptionDefinitions = buildGlobalOptionDefinitions([
        {
          id: "plugin1",
          globalOptions: [globalOptionDefinition],
        },
      ]);

      assert.ok(
        globalOptionDefinitions.has("param1"),
        "Expected 'param1' to be defined in the global option map",
      );
      assert.deepEqual(
        globalOptionDefinitions.get("param1")?.option,
        globalOptionDefinition,
      );
      assert.deepEqual(
        globalOptionDefinitions.get("param1")?.pluginId,
        "plugin1",
      );
    });

    it("should throw if a global option is already defined by another plugin", () => {
      const globalOptionDefinition = globalOption({
        name: "param1",
        description: "param1 description",
        type: ArgumentType.BOOLEAN,
        defaultValue: true,
      });
      const globalOptionDefinition2 = globalOption({
        name: "param1",
        description: "param1 description 2",
        type: ArgumentType.BOOLEAN,
        defaultValue: false,
      });

      assert.throws(
        () =>
          buildGlobalOptionDefinitions([
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
          buildGlobalOptionDefinitions([
            {
              id: "plugin1",
              globalOptions: [
                globalOption({
                  name: "foo bar",
                  description: "Foo description",
                  type: ArgumentType.STRING,
                  defaultValue: "bar",
                }),
              ],
            },
          ]),
        new HardhatError(HardhatError.ERRORS.ARGUMENTS.INVALID_NAME, {
          name: "foo bar",
        }),
      );
    });

    it("should throw if an option name is reserved", () => {
      RESERVED_ARGUMENT_NAMES.forEach((name) => {
        assert.throws(
          () =>
            buildGlobalOptionDefinitions([
              {
                id: "plugin1",
                globalOptions: [
                  globalOption({
                    name,
                    description: "Foo description",
                    type: ArgumentType.STRING,
                    defaultValue: "bar",
                  }),
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
          buildGlobalOptionDefinitions([
            {
              id: "plugin1",
              globalOptions: [
                globalOption({
                  name: "foo",
                  description: "Foo description",
                  type: ArgumentType.BOOLEAN,
                  /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions --
                  Intentionally testing an invalid type */
                  defaultValue: "bar" as any,
                }),
              ],
            },
          ]),
        new HardhatError(HardhatError.ERRORS.ARGUMENTS.INVALID_VALUE_FOR_TYPE, {
          value: "bar",
          name: "defaultValue",
          type: ArgumentType.BOOLEAN,
        }),
      );
    });
  });

  describe("buildGlobalOptionDefinition", () => {
    it("should build a global option definition", () => {
      const options = {
        name: "foo",
        description: "Foo description",
        type: ArgumentType.BOOLEAN,
        defaultValue: true,
      };
      const globalOptionDefinition = buildGlobalOptionDefinition(options);

      assert.deepEqual(globalOptionDefinition, options);
    });

    it("should build a global option definition with a default type of STRING", () => {
      const options = {
        name: "foo",
        description: "Foo description",
        defaultValue: "bar",
      };
      const globalOptionDefinition = buildGlobalOptionDefinition(options);

      assert.deepEqual(globalOptionDefinition, {
        ...options,
        type: ArgumentType.STRING,
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
      RESERVED_ARGUMENT_NAMES.forEach((name) => {
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
            type: ArgumentType.BOOLEAN,
            /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions --
            Intentionally testing an invalid type */
            defaultValue: "bar" as any,
          }),
        new HardhatError(HardhatError.ERRORS.ARGUMENTS.INVALID_VALUE_FOR_TYPE, {
          value: "bar",
          name: "defaultValue",
          type: ArgumentType.BOOLEAN,
        }),
      );
    });
  });

  describe("resolveGlobalOptions", () => {
    const { setEnvVar } = createTestEnvManager();

    it("should resolve to the default values when no options are provided", () => {
      const globalOptionDefinitions = buildGlobalOptionDefinitions([
        {
          id: "plugin1",
          globalOptions: [
            buildGlobalOptionDefinition({
              name: "param1",
              description: "param1 description",
              type: ArgumentType.BOOLEAN,
              defaultValue: true,
            }),
            buildGlobalOptionDefinition({
              name: "param2",
              description: "param2 description",
              defaultValue: "default",
            }),
          ],
        },
      ]);

      const globalOptions = resolveGlobalOptions({}, globalOptionDefinitions);

      assert.deepEqual(globalOptions, {
        param1: true,
        param2: "default",
      });
    });

    it("should resolve to the user provided options and env variables", () => {
      const globalOptionDefinitions = buildGlobalOptionDefinitions([
        {
          id: "plugin1",
          globalOptions: [
            buildGlobalOptionDefinition({
              name: "param1",
              description: "param1 description",
              type: ArgumentType.BOOLEAN,
              defaultValue: true,
            }),
            buildGlobalOptionDefinition({
              name: "param2",
              description: "param2 description",
              defaultValue: "default",
            }),
            buildGlobalOptionDefinition({
              name: "param3",
              description: "param3 description",
              type: ArgumentType.BIGINT,
              defaultValue: 0n,
            }),
          ],
        },
      ]);

      setEnvVar("HARDHAT_PARAM3", "5n");

      const globalOptions = resolveGlobalOptions(
        {
          param1: false,
          param2: "user",
        },
        globalOptionDefinitions,
      );

      assert.deepEqual(globalOptions, {
        param1: false,
        param2: "user",
        param3: 5n,
      });
    });

    it("should resolve to the user provided options over the environment variables", () => {
      const globalOptionDefinitions = buildGlobalOptionDefinitions([
        {
          id: "plugin1",
          globalOptions: [
            buildGlobalOptionDefinition({
              name: "param1",
              description: "param1 description",
              type: ArgumentType.BOOLEAN,
              defaultValue: true,
            }),
            buildGlobalOptionDefinition({
              name: "param2",
              description: "param2 description",
              defaultValue: "default",
            }),
          ],
        },
      ]);

      setEnvVar("HARDHAT_PARAM2", "env");

      const globalOptions = resolveGlobalOptions(
        {
          param1: false,
          param2: "user",
        },
        globalOptionDefinitions,
      );

      assert.deepEqual(globalOptions, {
        param1: false,
        param2: "user",
      });
    });

    it("should ignore options that are not defined in the global option map", () => {
      const globalOptionDefinitions = buildGlobalOptionDefinitions([
        {
          id: "plugin1",
          globalOptions: [
            buildGlobalOptionDefinition({
              name: "param1",
              description: "param1 description",
              type: ArgumentType.BOOLEAN,
              defaultValue: true,
            }),
          ],
        },
      ]);

      setEnvVar("HARDHAT_PARAM3", "env");

      const globalOptions = resolveGlobalOptions(
        {
          param1: false,
          param2: "user",
        },
        globalOptionDefinitions,
      );

      assert.deepEqual(globalOptions, {
        param1: false,
      });
    });

    it("should throw if the environment variable is not valid", () => {
      const globalOptionDefinitions = buildGlobalOptionDefinitions([
        {
          id: "plugin1",
          globalOptions: [
            buildGlobalOptionDefinition({
              name: "param1",
              description: "param1 description",
              type: ArgumentType.BOOLEAN,
              defaultValue: true,
            }),
          ],
        },
      ]);

      setEnvVar("HARDHAT_PARAM1", "not a boolean");

      assert.throws(
        () => resolveGlobalOptions({}, globalOptionDefinitions),
        new HardhatError(HardhatError.ERRORS.ARGUMENTS.INVALID_VALUE_FOR_TYPE, {
          value: "not a boolean",
          name: "param1",
          type: ArgumentType.BOOLEAN,
        }),
      );
    });
  });
});
